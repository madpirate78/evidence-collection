// app/statement-portal/page.tsx - Complete config-driven survey form
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CSRFTokenInput, useCSRFToken } from "@/components/csrf-token";
import {
  ACTIVE_SURVEY_CONFIG,
  type SurveyConfig,
  type QuestionConfig,
} from "@/config/surveyQuestions";
import {
  validateFormWithConfig,
} from "@/schemas/form-validation-schema";
import { submitEvidenceAction } from "@/app/actions";

// Helper function to check if form is complete
function isFormComplete(
  formData: ConfigFormData,
  config: SurveyConfig
): boolean {
  // Check consent
  if (!formData.consent_given) return false;

  // Get applicable questions based on conditional value
  const conditionalValue = config.conditionalLogic.getApplicableValue(formData);
  if (!conditionalValue) return false;

  const applicableQuestions =
    config.conditionalLogic.getApplicableQuestions(conditionalValue);

  // Check all required fields
  for (const question of Object.values(applicableQuestions)) {
    if (question.required) {
      const value = formData[question.id];
      // Check for empty values
      if (value === undefined || value === null || value === "") {
        return false;
      }
      // Check for empty arrays (checkbox fields)
      if (Array.isArray(value) && value.length === 0 && question.required) {
        return false;
      }
    }
  }

  return true;
}

// Helper function to get validation errors (unused but kept for future use)
function _getFormValidationErrors(
  formData: ConfigFormData,
  config: SurveyConfig
): Record<string, string> {
  const errors: Record<string, string> = {};

  const conditionalValue = config.conditionalLogic.getApplicableValue(formData);
  const applicableQuestions = conditionalValue
    ? config.conditionalLogic.getApplicableQuestions(conditionalValue)
    : {};

  Object.values(applicableQuestions).forEach((question) => {
    if (question.required && !formData[question.id]) {
      errors[question.id] = "This field is required";
    }
  });

  if (!formData.consent_given) {
    errors.consent_given = "Consent is required";
  }

  return errors;
}

// Option type for select/radio/checkbox fields
interface QuestionOption {
  value: string;
  label: string;
}

// Number input type for multi-number fields
interface NumberInput {
  id: string;
  label: string;
  min?: number;
  max?: number;
  default?: number;
  required?: boolean;
  dbColumn?: string;
}

// Dynamic form data type based on active config
type FormFieldValue = string | number | boolean | string[] | Record<string, number> | undefined;
type ConfigFormData = Partial<Record<string, FormFieldValue>> & {
  csrf_token?: string;
  consent_given: boolean;
};

// Get initial form data from config
function getInitialFormData(config: SurveyConfig): ConfigFormData {
  const initialData: ConfigFormData = {
    consent_given: false,
  };

  // Set defaults from config
  Object.values(config.sections).forEach((section) => {
    Object.values(section.questions).forEach((question) => {
      if (question.default !== undefined) {
        initialData[question.id] = question.default;
      }

      // Handle multi-number inputs
      if (question.type === "multi-number" && question.numberInputs) {
        const multiData: Record<string, number> = {};
        question.numberInputs.forEach((input) => {
          const inputDefault = input.default || 0;
          multiData[input.id] = inputDefault;
          // Also set individual fields
          if (input.dbColumn) {
            initialData[input.dbColumn] = inputDefault;
          }
          initialData[input.id] = inputDefault;
        });
        initialData[question.id] = multiData;
      }

      // Set defaults for follow-up questions
      if (question.followUp && question.followUp.default !== undefined) {
        initialData[question.followUp.id] = question.followUp.default;
      }
    });
  });

  return initialData;
}

// Enhanced Question Component that renders based on config
interface QuestionComponentProps {
  config: QuestionConfig;
  value: FormFieldValue;
  onChange: (value: FormFieldValue) => void;
  error?: string;
  conditionalValue?: string | null;
  allData?: Record<string, FormFieldValue>;
  questionNumber?: number;
  updateField?: (field: string, value: FormFieldValue) => void;
}

const QuestionComponent = ({
  config,
  value,
  onChange,
  error,
  conditionalValue,
  allData: _allData,
  questionNumber,
  updateField,
}: QuestionComponentProps) => {
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleChange = async (newValue: FormFieldValue) => {
    setValidationError(null);

    // Don't apply sanitization during typing - just validate
    const valueToValidate = newValue;

    // Client-side validation (but not sanitization)
    if (config.validation) {
      try {
        config.validation.parse(valueToValidate);
      } catch (zodError: unknown) {
        const zodErr = zodError as { errors?: Array<{ message?: string }> };
        setValidationError(zodErr.errors?.[0]?.message || "Invalid input");
      }
    }

    onChange(valueToValidate);
  };

  const getBaseClassName = () => {
    let className =
      "w-full p-3 border rounded-lg focus:ring-2 focus:ring-wtf-orange transition-colors";
    if (error || validationError) {
      className += " border-red-500 ring-red-500";
    } else {
      className += " border-slate-300 hover:border-slate-400";
    }
    if (config.sensitiveData) {
      className += " bg-yellow-50";
    }
    return className;
  };

  // Filter options based on conditional value (e.g., parent type)
  const getFilteredOptions = () => {
    if (!config.options) return [];

    // If question has custom filter function, use it
    if (config.filterOptions) {
      return config.filterOptions(config.options, conditionalValue);
    }

    // Otherwise show all options (default behavior)
    return config.options;
  };

  const renderQuestion = () => {
    const filteredOptions = getFilteredOptions();

    // Don't render if no applicable options
    if (config.options && filteredOptions.length === 0) {
      return null;
    }

    switch (config.type) {
      case "radio":
        return (
          <div className="space-y-2">
            {filteredOptions.map((option: QuestionOption) => (
              <label
                key={option.value}
                className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
              >
                <input
                  type="radio"
                  name={config.id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => handleChange(e.target.value)}
                  className="w-4 h-4 text-wtf-orange mt-1 flex-shrink-0"
                />
                <span className="text-sm leading-relaxed">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case "select":
        return (
          <select
            name={config.id}
            value={String(value ?? "")}
            onChange={(e) => handleChange(e.target.value)}
            className={getBaseClassName()}
          >
            <option value="">Please select...</option>
            {filteredOptions.map((option: QuestionOption) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case "textarea":
        return (
          <div>
            <textarea
              name={config.id}
              value={String(value ?? "")}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={config.placeholder}
              maxLength={config.maxLength || 1000}
              rows={4}
              className={getBaseClassName()}
              autoComplete={config.sensitiveData ? "off" : undefined}
              spellCheck={!config.sensitiveData}
            />
            {config.maxLength && (
              <div className="flex justify-between items-center mt-2 text-xs">
                <span className="text-slate-500">
                  {String(value ?? "").length}/{config.maxLength} characters
                </span>
                {config.required && String(value ?? "").length < 20 && (
                  <span className="text-amber-600">
                    Minimum 20 characters required
                  </span>
                )}
              </div>
            )}
          </div>
        );

      case "number":
        return (
          <input
            type="number"
            name={config.id}
            min={config.min}
            max={config.max}
            value={typeof value === "number" ? value : ""}
            onChange={(e) => handleChange(parseInt(e.target.value) || 0)}
            className={getBaseClassName()}
          />
        );

      case "currency":
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">
              £
            </span>
            <input
              type="number"
              name={config.id}
              step="0.01"
              min="0"
              max="999999.99"
              value={typeof value === "number" ? value : ""}
              onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
              className={`${getBaseClassName()} pl-8`}
              autoComplete={config.sensitiveData ? "off" : undefined}
            />
          </div>
        );

      case "checkbox":
        const currentArray = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {filteredOptions.map((option: QuestionOption) => (
              <label
                key={option.value}
                className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  name={config.id}
                  value={option.value}
                  checked={currentArray.includes(option.value)}
                  onChange={(e) => {
                    const newArray = e.target.checked
                      ? [...currentArray, option.value]
                      : currentArray.filter(
                          (item: string) => item !== option.value
                        );
                    handleChange(newArray);
                  }}
                  className="w-4 h-4 text-wtf-orange rounded mt-1 flex-shrink-0"
                />
                <span className="text-sm leading-relaxed">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case "multi-number":
        if (!config.numberInputs) return null;

        const currentValues = (typeof value === "object" && value !== null && !Array.isArray(value) ? value : {}) as Record<string, number>;

        const handleNumberInputChange = (
          inputId: string,
          inputValue: number
        ) => {
          const newValues = {
            ...currentValues,
            [inputId]: inputValue,
          };
          onChange(newValues);

          // Also update individual fields in parent form data
          if (config.numberInputs && updateField) {
            const input = config.numberInputs.find((i) => i.id === inputId);
            if (input && input.dbColumn) {
              // Update the parent form's field directly
              updateField(input.dbColumn, inputValue);
            }
          }
        };

        return (
          <div className="space-y-3">
            {config.numberInputs.map((input: NumberInput) => (
              <label
                key={input.id}
                className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <input
                  type="number"
                  name={input.id}
                  min={input.min}
                  max={input.max}
                  value={
                    currentValues[input.id] !== undefined
                      ? currentValues[input.id]
                      : input.default || 0
                  }
                  onChange={(e) =>
                    handleNumberInputChange(
                      input.id,
                      parseInt(e.target.value) || input.default || 0
                    )
                  }
                  className="w-20 p-2 border border-slate-300 rounded text-center font-semibold text-wtf-orange focus:ring-2 focus:ring-wtf-orange focus:border-wtf-orange"
                  required={input.required}
                />
                <span className="text-sm font-medium flex-1">
                  {input.label}
                </span>
              </label>
            ))}

            <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-wtf-orange flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Total affected:{" "}
                {config.numberInputs.reduce(
                  (total: number, input: NumberInput) =>
                    total +
                    (currentValues[input.id] !== undefined
                      ? currentValues[input.id]
                      : input.default || 0),
                  0
                )}{" "}
                children
              </p>
            </div>
          </div>
        );

      default:
        return (
          <input
            type="text"
            name={config.id}
            value={String(value ?? "")}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={config.placeholder}
            className={getBaseClassName()}
            autoComplete={config.sensitiveData ? "off" : undefined}
          />
        );
    }
  };

  // Don't render if not applicable to current conditional value
  if (
    config.appliesTo &&
    conditionalValue &&
    !config.appliesTo.includes(conditionalValue)
  ) {
    return null;
  }

  const renderedQuestion = renderQuestion();
  if (!renderedQuestion) return null;

  return (
    <div className="border-b border-slate-200 pb-8 last:border-b-0">
      <h3 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2">
        {questionNumber && (
          <span className="flex-shrink-0 w-7 h-7 bg-orange-100 text-wtf-orange rounded-full flex items-center justify-center text-sm font-bold">
            {questionNumber}
          </span>
        )}
        <span className="flex-1">
          {config.question}
          {config.required && (
            <span className="text-red-500 text-sm ml-1">*</span>
          )}
        </span>
        {config.sensitiveData && (
          <span className="flex-shrink-0 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
            Sensitive
          </span>
        )}
      </h3>

      {renderedQuestion}

      {(error || validationError) && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm flex items-start gap-2">
            <svg
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error || validationError}
          </p>
        </div>
      )}

      {config.triggersCrisisProtocol &&
        config.triggersCrisisProtocol(value) &&
        config.crisisResources && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-amber-800 font-medium mb-2">
                  Support Resources Available:
                </p>
                <div className="text-sm text-amber-700 space-y-1">
                  {Object.entries(config.crisisResources).map(
                    ([key, resource]) => (
                      <p key={key}>
                        <strong className="capitalize">{key}:</strong>{" "}
                        {resource}
                      </p>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

// Follow-up Question Component
const FollowUpQuestion = ({
  parentConfig: _parentConfig,
  followUpConfig,
  parentValue,
  value,
  onChange,
  error,
  conditionalValue,
  allData,
  questionNumber,
  updateField,
}: {
  parentConfig: QuestionConfig;
  followUpConfig: QuestionConfig;
  parentValue: FormFieldValue;
  value: FormFieldValue;
  onChange: (value: FormFieldValue) => void;
  error?: string;
  conditionalValue?: string | null;
  allData?: Record<string, FormFieldValue>;
  questionNumber?: number;
  updateField?: (field: string, value: FormFieldValue) => void;
}) => {
  // Check if follow-up should be shown
  if (!parentValue) return null;

  if (
    followUpConfig.appliesTo &&
    conditionalValue &&
    !followUpConfig.appliesTo.includes(conditionalValue)
  ) {
    return null;
  }

  if (followUpConfig.showIf && !followUpConfig.showIf(parentValue, allData)) {
    return null;
  }

  return (
    <div className="ml-8 mt-6 p-6 bg-slate-50 rounded-xl border border-slate-200">
      <div className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">
        Follow-up question:
      </div>
      <QuestionComponent
        config={followUpConfig}
        value={value}
        onChange={onChange}
        error={error}
        conditionalValue={conditionalValue}
        allData={allData}
        questionNumber={questionNumber}
        updateField={updateField}
      />
    </div>
  );
};

export default function ConfigDrivenSurveyForm() {
  const router = useRouter();
  const config = ACTIVE_SURVEY_CONFIG;

  const { token: csrfToken, isReady: csrfReady } = useCSRFToken();

  const [pageLoadTime] = useState(Date.now());

  const [formData, setFormData] = useState<ConfigFormData>(() =>
    getInitialFormData(config)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [securityWarnings, setSecurityWarnings] = useState<Array<{ type: string; message: string; resources?: Record<string, string> }>>([]);

  const conditionalValue = config.conditionalLogic.getApplicableValue(formData);

  // Auto-save to localStorage
  useEffect(() => {
    const savedData = localStorage.getItem(`${config.surveyId}_draft`);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData((prev) => ({
          ...getInitialFormData(config),
          ...prev,
          ...parsed,
        }));
      } catch (e) {
        console.error("Failed to load saved data");
      }
    }
  }, [config.surveyId]);

  useEffect(() => {
    localStorage.setItem(`${config.surveyId}_draft`, JSON.stringify(formData));
  }, [formData, config.surveyId]);

  const updateField = (questionId: string, value: FormFieldValue) => {
    setFormData((prev) => ({ ...prev, [questionId]: value }));

    // Clear error when user updates field
    if (errors[questionId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setSecurityWarnings([]);

    try {
      // Calculate remaining time
      const timeOnPage = Date.now() - pageLoadTime;
      const minTimeRequired = 5000; // 5 seconds
      if (timeOnPage < minTimeRequired) {
        const secondsToWait = Math.ceil((minTimeRequired - timeOnPage) / 1000);
        setSubmitError(
          `Please review your responses before submitting. You can submit in ${secondsToWait} second${secondsToWait > 1 ? "s" : ""}.`
        );
        setIsSubmitting(false);
        return;
      }

      // Check required fields
      const requiredFields = Object.values(applicableQuestions)
        .filter((q) => q.required)
        .map((q) => q.id);

      const missingFields = requiredFields.filter(
        (field) => !formData[field] || formData[field] === ""
      );

      if (missingFields.length > 0 || !formData.consent_given) {
        const newErrors: Record<string, string> = {};
        missingFields.forEach((field) => {
          newErrors[field] = "This field is required";
        });
        if (!formData.consent_given) {
          newErrors.consent_given = "Please provide consent to submit";
        }
        setErrors(newErrors);
        setSubmitError("Please complete all required fields.");
        return;
      }

      // Validate with config (same as before)
      const validation = validateFormWithConfig(formData, config);
      if (!validation.success) {
        setErrors(validation.errors || {});
        setSubmitError("Please correct the errors before submitting.");
        return;
      }

      // Create FormData (same as before)
      const submissionData = new FormData();
      submissionData.append("csrf_token", csrfToken);

      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== "csrf_token") {
          if (Array.isArray(value)) {
            value.forEach((item) =>
              submissionData.append(key, item.toString())
            );
          } else if (typeof value === "object" && value !== null) {
            Object.entries(value).forEach(([subKey, subValue]) => {
              if (subValue !== undefined && subValue !== null) {
                submissionData.append(subKey, subValue.toString());
              }
            });
          } else if (typeof value === "boolean") {
            submissionData.append(key, value.toString());
          } else {
            submissionData.append(key, value.toString());
          }
        }
      });

      // Use server action to submit the evidence
      const result = await submitEvidenceAction(submissionData, config);

      // Better error checking
      if (!result) {
        console.error("❌ No result received from server");
        throw new Error("No response received from server");
      }

      if (result.success === false || result.error) {
        console.error("❌ Submission failed:", result);
        throw new Error(result.error || "Submission failed");
      }

      // If we get here, assume success (server validation passed)
      if (result.success !== true) {
        console.warn(
          "⚠️ Unexpected result format, but server validation passed:",
          result
        );
        // Continue as if successful since server-side validation passed
      }

      // Handle success (same as before)
      if ("warnings" in result && result.warnings) {
        setSecurityWarnings(result.warnings);
      }

      localStorage.removeItem(`${config.surveyId}_draft`);
      router.push("/statement-portal/success");
    } catch (error) {
      console.error("Submission error:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get applicable questions for current conditional value
  const getApplicableQuestions = () => {
    if (!conditionalValue) {
      // Show only gateway question and basic info
      const gatewaySection = Object.values(config.sections)[0];
      const gatewayQuestion = Object.values(gatewaySection.questions).find(
        (q) => q.id === config.conditionalLogic.gatewayField
      );
      return gatewayQuestion ? { [gatewayQuestion.id]: gatewayQuestion } : {};
    }

    return config.conditionalLogic.getApplicableQuestions(conditionalValue);
  };

  const applicableQuestions = getApplicableQuestions();
  const questionEntries = Object.entries(applicableQuestions);
  const requiredFields = questionEntries
    .filter(([_, config]) => config.required)
    .map(([key, _]) => key);
  requiredFields.push("consent_given");
  const completedRequiredFields = requiredFields.filter((fieldId) => {
    const value = formData[fieldId];

    if (fieldId === "consent_given") {
      return value === true;
    }

    // Check if field has a meaningful value
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;

    return true;
  }).length;

  const totalRequiredFields = requiredFields.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3 text-slate-800">
            {config.title}
          </h1>
          <p className="text-lg text-slate-600 mb-6 max-w-2xl mx-auto">
            {config.description}
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <span className="bg-orange-100 text-wtf-orange px-4 py-2 rounded-full font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Completely anonymous
            </span>
            <span className="bg-orange-100 text-wtf-orange px-4 py-2 rounded-full font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              5-8 minutes
            </span>
            <span className="bg-orange-100 text-wtf-orange px-4 py-2 rounded-full font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
              </svg>
              Auto-saves progress
            </span>
          </div>
        </div>

        {/* Progress Indicator */}
        {conditionalValue && (
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-slate-600 mb-3">
              <span className="font-medium">Form Progress</span>
              <span>
                {completedRequiredFields}/{totalRequiredFields} completed
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-wtf-orange to-wtf-orange/80 h-3 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.max(5, Math.min(95, (completedRequiredFields / totalRequiredFields) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Security Warnings */}
        {securityWarnings.length > 0 && (
          <div className="mb-8 space-y-4">
            {securityWarnings.map((warning, index) => (
              <div
                key={index}
                className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <svg
                    className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-amber-800 font-medium mb-2">
                      {warning.message}
                    </p>
                    {warning.resources && (
                      <div className="text-sm text-amber-700">
                        <p className="font-medium mb-2">Support available:</p>
                        <ul className="space-y-1">
                          {Object.entries(warning.resources).map(
                            ([key, value]) => (
                              <li key={key} className="flex items-start gap-2">
                                <span className="font-medium capitalize">
                                  {key}:
                                </span>
                                <span>{value as string}</span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-10">
              <CSRFTokenInput />

              {/* Render applicable questions */}
              {questionEntries.map(([questionKey, questionConfig], index) => {
                const questionNumber = index + 1;

                return (
                  <div key={questionConfig.id}>
                    <QuestionComponent
                      config={questionConfig}
                      value={formData[questionConfig.id]}
                      onChange={(value) =>
                        updateField(questionConfig.id, value)
                      }
                      error={errors[questionConfig.id]}
                      conditionalValue={conditionalValue}
                      allData={formData}
                      questionNumber={questionNumber}
                      updateField={updateField}
                    />

                    {/* Follow-up questions */}
                    {questionConfig.followUp && (
                      <FollowUpQuestion
                        parentConfig={questionConfig}
                        followUpConfig={questionConfig.followUp}
                        parentValue={formData[questionConfig.id]}
                        value={formData[questionConfig.followUp.id]}
                        onChange={(value) =>
                          updateField(questionConfig.followUp!.id, value)
                        }
                        error={errors[questionConfig.followUp.id]}
                        conditionalValue={conditionalValue}
                        allData={formData}
                        questionNumber={questionNumber}
                      />
                    )}
                  </div>
                );
              })}

              {/* Consent Section */}
              {conditionalValue && (
                <div className="pt-8 border-t border-slate-200">
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-6 border border-blue-200">
                    <label className="flex items-start gap-4 cursor-pointer">
                      <input
                        type="checkbox"
                        name="consent_given"
                        checked={formData.consent_given || false}
                        onChange={(e) =>
                          updateField("consent_given", e.target.checked)
                        }
                        className="w-5 h-5 text-wtf-orange rounded mt-1 flex-shrink-0"
                        required
                      />
                      <div className="text-sm">
                        <div className="font-semibold mb-3 text-wtf-dark text-base">
                          I consent to anonymous use of this data
                        </div>
                        <div className="text-slate-700 leading-relaxed mb-3">
                          My response will be used for anonymous research on
                          child maintenance policy experiences. This submission
                          is completely anonymous and cannot be traced back to
                          me.
                        </div>
                        <div className="text-xs text-wtf-orange bg-orange-100 rounded-lg p-2">
                          <strong>Data usage:</strong> Statistical analysis,
                          academic research, policy studies
                        </div>
                      </div>
                    </label>
                    {errors.consent_given && (
                      <p className="text-red-600 text-sm mt-3 ml-9 bg-red-50 p-2 rounded border border-red-200">
                        {errors.consent_given}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              {conditionalValue && (
                <div className="flex justify-center pt-8">
                  <button
                    type="submit"
                    disabled={
                      !isFormComplete(formData, config) ||
                      isSubmitting ||
                      !csrfReady
                    }
                    className="px-10 py-4 bg-gradient-to-r from-wtf-orange to-wtf-orange/80 text-white rounded-xl font-semibold text-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-3 shadow-lg"
                  >
                    {isSubmitting && (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {!csrfReady
                      ? "Loading Security Token..."
                      : isSubmitting
                        ? "Submitting Evidence..."
                        : "Submit Anonymous Evidence"}
                  </button>
                </div>
              )}

              {/* Submission Requirements */}
              {conditionalValue && !isFormComplete(formData, config) && (
                <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-slate-200">
                  <p className="text-sm text-wtf-orange text-center flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Complete all required fields and provide consent to submit
                    your evidence
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Error Display */}
        {submitError && (
          <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <svg
                className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-red-800 font-semibold text-lg">
                  Submission Error
                </p>
                <p className="text-red-700 mt-1">{submitError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-3 text-sm text-slate-500 bg-white rounded-full px-6 py-3 shadow-sm border border-slate-200">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">
              Your data is encrypted and completely anonymous
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}