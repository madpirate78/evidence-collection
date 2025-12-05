// schemas/form-validation-schema.ts - Generic, config-driven validation
import { z } from "zod";
import type { SurveyConfig, QuestionConfig } from "@/config/surveyQuestions";

/**
 * Create Zod schema for individual field based on config properties
 */
function createFieldSchema(config: QuestionConfig): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (config.type) {
    case "text":
    case "textarea":
      schema = z.string();
      if (config.minLength) {
        schema = (schema as z.ZodString).min(
          config.minLength,
          `Minimum ${config.minLength} characters required`
        );
      }
      if (config.maxLength) {
        schema = (schema as z.ZodString).max(
          config.maxLength,
          `Maximum ${config.maxLength} characters allowed`
        );
      }
      break;

    case "number":
      schema = z.number();
      if (config.min !== undefined) {
        schema = (schema as z.ZodNumber).min(
          config.min,
          `Minimum value is ${config.min}`
        );
      }
      if (config.max !== undefined) {
        schema = (schema as z.ZodNumber).max(
          config.max,
          `Maximum value is ${config.max}`
        );
      }
      break;

    case "radio":
    case "select":
      if (config.options && config.options.length > 0) {
        const validValues = config.options.map((opt) => opt.value) as [
          string,
          ...string[],
        ];
        schema = z.enum(validValues);
      } else {
        schema = z.string();
      }
      break;

    case "checkbox":
      if (config.options && config.options.length > 0) {
        const validValues = config.options.map((opt) => opt.value);
        schema = z.array(z.enum(validValues as [string, ...string[]]));
        if (config.required) {
          schema = (schema as z.ZodArray<any>).min(
            1,
            "Please select at least one option"
          );
        }
      } else {
        schema = z.array(z.string());
      }
      break;

    default:
      schema = z.string();
  }

  // Handle required/optional
  if (!config.required) {
    schema = schema.optional();
  }

  return schema;
}

/**
 * Generate server-safe Zod schemas from config properties
 */
function generateServerSafeSchema(
  surveyConfig: SurveyConfig
): z.ZodObject<any> {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  Object.values(surveyConfig.sections).forEach((section) => {
    Object.values(section.questions).forEach((question) => {
      // Handle multi-number: create schemas for individual inputs, not parent
      if (question.type === "multi-number" && question.numberInputs) {
        question.numberInputs.forEach((input) => {
          if (input.id) {
            let schema: z.ZodNumber = z.number();

            if (input.min !== undefined) {
              schema = schema.min(input.min);
            }

            if (input.max !== undefined) {
              schema = schema.max(input.max);
            }

            schemaFields[input.id] = input.required
              ? schema
              : schema.optional();
          }
        });

        return;
      }

      // For all other question types
      if (question.id) {
        schemaFields[question.id] = createFieldSchema(question);
      }

      // Handle follow-up questions
      if (question.followUp && question.followUp.id) {
        schemaFields[question.followUp.id] = createFieldSchema(
          question.followUp
        );
      }
    });
  });

  // Always include a consent_given field in the schema
  schemaFields["consent_given"] = z.boolean();

  return z.object(schemaFields);
}

function serverSafeSanitize(value: any, config: QuestionConfig): any {
  if (value === null || value === undefined) return value;

  let sanitized = value;

  // Basic string sanitization using config properties
  if (typeof sanitized === "string") {
    sanitized = sanitized.trim();

    // Apply maxLength from config
    if (config.maxLength) {
      sanitized = sanitized.slice(0, config.maxLength);
    }

    // Server-safe XSS protection
    sanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "");
  }

  // Type-specific sanitization using config.type
  switch (config.type) {
    case "number":
      const num =
        typeof sanitized === "string"
          ? parseFloat(sanitized)
          : Number(sanitized);
      return isNaN(num)
        ? 0
        : Math.max(config.min || 0, Math.min(config.max || 999999, num));

    case "radio":
    case "select":
      const allowedValues = config.options?.map((opt) => opt.value) || [];
      return allowedValues.includes(sanitized) ? sanitized : null;

    case "checkbox":
      // FIXED: Handle checkbox values correctly
      if (Array.isArray(sanitized)) {
        // Already an array - filter valid values
        const allowedValues = config.options?.map((opt) => opt.value) || [];
        return sanitized.filter((v) => allowedValues.includes(v));
      } else if (sanitized === true || sanitized === "true") {
        // Single true value - this shouldn't happen for multi-select checkboxes
        // but handle it gracefully
        return [];
      } else if (
        sanitized === false ||
        sanitized === "false" ||
        sanitized === ""
      ) {
        // No selections - return empty array (this is the key fix)
        return [];
      } else if (typeof sanitized === "string") {
        // Single string value - convert to array and validate
        const allowedValues = config.options?.map((opt) => opt.value) || [];
        return allowedValues.includes(sanitized) ? [sanitized] : [];
      } else {
        // Fallback for any other type
        return [];
      }

    default:
      return sanitized;
  }
}

/**
 * NEW FUNCTION: Basic sanitization for unknown fields
 */
function basicSanitize(value: any): any {
  if (typeof value === "string") {
    return value.trim().slice(0, 10000);
  }
  return value;
}
/**
 * Generate a dynamic Zod schema from any survey configuration
 */
export function generateFormSchema(surveyConfig: SurveyConfig) {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  // Extract validation rules from config
  Object.values(surveyConfig.sections).forEach((section) => {
    Object.values(section.questions).forEach((question) => {
      if (question.validation && question.id) {
        schemaFields[question.id] = question.validation;
      }

      // Add follow-up question validation
      if (
        question.followUp &&
        question.followUp.validation &&
        question.followUp.id
      ) {
        schemaFields[question.followUp.id] = question.followUp.validation;
      }

      // Handle multi-number inputs
      if (question.type === "multi-number" && question.numberInputs) {
        question.numberInputs.forEach((input) => {
          if (input.id) {
            let schema: z.ZodNumber = z.number();

            if (input.min !== undefined) {
              schema = schema.min(input.min);
            }

            if (input.max !== undefined) {
              schema = schema.max(input.max);
            }

            schemaFields[input.id] = schema.optional();
          }
        });
      }
    });
  });

  return z.object(schemaFields);
}

/**
 * Enhanced validation that uses the survey config's own validation logic
 */
export function validateFormWithConfig<T = Record<string, any>>(
  data: any,
  surveyConfig: SurveyConfig
): {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
  warnings?: Array<{ type: string; questionId?: string; resources?: any }>;
} {
  try {
    // Create server-safe Zod schema from config properties
    const schema = generateServerSafeSchema(surveyConfig);

    // Validate with Zod (server-safe version)
    let validatedData;
    try {
      validatedData = schema.parse(data);
    } catch (zodError) {
      if (zodError instanceof z.ZodError) {
        console.error("❌ Zod validation errors:", zodError.errors);
        const fieldErrors: Record<string, string> = {};

        zodError.errors.forEach((err) => {
          const fieldPath = err.path[0];
          if (fieldPath !== undefined) {
            const field = fieldPath.toString();
            fieldErrors[field] = err.message;
            console.error(`  ❌ ${field}: ${err.message}`);
          } else {
            // Handle errors without a specific field path
            fieldErrors._general = err.message;
            console.error(`  ❌ General error: ${err.message}`);
          }
        });

        return {
          success: false,
          errors: fieldErrors,
        };
      }
      throw zodError; // Re-throw if not a Zod error
    }

    const warnings: Array<{
      type: string;
      questionId?: string;
      resources?: any;
    }> = [];

    // Crisis detection using config properties
    try {
      const gatewayValue = data[surveyConfig.conditionalLogic.gatewayField];

      // Server-safe way to get applicable questions from config structure
      const applicableQuestions: Record<string, any> = {};
      if (gatewayValue) {
        Object.values(surveyConfig.sections).forEach((section) => {
          Object.values(section.questions).forEach((question) => {
            // Check if question applies to this gateway value
            if (
              !question.appliesTo ||
              question.appliesTo.includes(gatewayValue)
            ) {
              applicableQuestions[question.id] = question;

              // Also add follow-up questions
              if (question.followUp) {
                applicableQuestions[question.followUp.id] = question.followUp;
              }
            }
          });
        });
      }

      // Server-safe crisis detection
      Object.entries(applicableQuestions).forEach(
        ([questionId, questionConfig]) => {
          const value = data[questionId];

          if (
            typeof value === "string" &&
            questionConfig.triggersCrisisProtocol
          ) {
            const crisisKeywords = [
              "suicide",
              "self-harm",
              "ending it all",
              "kill myself",
            ];
            const hasKeywords = crisisKeywords.some((keyword) =>
              value.toLowerCase().includes(keyword.toLowerCase())
            );

            if (hasKeywords) {
              warnings.push({
                type: "crisis_response",
                questionId,
                resources: questionConfig.crisisResources,
              });
            }
          }
        }
      );
    } catch (crisisError) {
      console.error("❌ Error in crisis detection:", crisisError);
      // Don't fail validation for crisis detection errors, just log them
    }

    return {
      success: true,
      data: validatedData as T,
      warnings,
    };
  } catch (error) {
    console.error("💥 Validation function error:", error);
    console.error(
      "💥 Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );

    // Return more detailed error information
    return {
      success: false,
      errors: {
        _general:
          error instanceof Error ? error.message : "Unknown validation error",
        _details:
          error instanceof Error
            ? error.stack || "No stack trace available"
            : "No details available",
      },
    };
  }
}

/**
 * Get applicable questions for any survey type
 */
export function getApplicableQuestions(
  gatewayValue: string | null,
  formData: Record<string, any>,
  surveyConfig: SurveyConfig
): Record<string, QuestionConfig> {
  return surveyConfig.conditionalLogic.getApplicableQuestions(gatewayValue);
}

/**
 * Sanitize form data using config-defined sanitization
 */
export function sanitizeFormData(
  formData: FormData,
  surveyConfig: SurveyConfig
): Record<string, any> {
  const sanitizedData: Record<string, any> = {};

  // Get all question configs AND identify multi-number parent fields from config
  const allQuestions: Record<string, QuestionConfig> = {};
  const multiNumberParentFields = new Set<string>();

  Object.values(surveyConfig.sections).forEach((section) => {
    Object.values(section.questions).forEach((question) => {
      // For multi-number questions, mark the parent as skippable
      if (question.type === "multi-number") {
        multiNumberParentFields.add(question.id);

        // Add the individual inputs to allQuestions
        if (question.numberInputs) {
          question.numberInputs.forEach((input) => {
            if (input.id) {
              allQuestions[input.id] = {
                id: input.id,
                type: "number",
                question: input.label,
                required: input.required,
                min: input.min,
                max: input.max,
                dbColumn: input.dbColumn,
              } as QuestionConfig;
            }
          });
        }
      } else {
        // For all other question types, add normally
        allQuestions[question.id] = question;
      }

      // Handle follow-up questions (this is where children_impacts and cms_response come from)
      if (question.followUp) {
        allQuestions[question.followUp.id] = question.followUp;
      }
    });
  });

  // IMPROVED: Collect checkbox values properly from FormData
  const checkboxCollector: Record<string, string[]> = {};

  for (const [key, value] of formData.entries()) {
    if (key === "csrf_token") {
      sanitizedData[key] = value;
      continue;
    }

    // Skip multi-number parent fields (determined from config)
    if (multiNumberParentFields.has(key)) {
      continue;
    }

    const questionConfig = allQuestions[key];

    if (questionConfig?.type === "checkbox") {
      // Collect all checkbox values for this field
      if (!checkboxCollector[key]) {
        checkboxCollector[key] = [];
      }
      if (value && value !== "false") {
        checkboxCollector[key].push(value.toString());
      }
    } else {
      // Use server-safe sanitization for non-checkbox fields
      if (questionConfig) {
        sanitizedData[key] = serverSafeSanitize(value, questionConfig);
      } else {
        sanitizedData[key] = basicSanitize(value);
      }
    }
  }

  // Process collected checkbox values
  Object.entries(checkboxCollector).forEach(([key, values]) => {
    const questionConfig = allQuestions[key];
    if (questionConfig) {
      sanitizedData[key] = serverSafeSanitize(values, questionConfig);
    }
  });

  // Ensure all checkbox fields exist as arrays (even if empty)
  Object.values(allQuestions).forEach((config) => {
    if (config.type === "checkbox" && !(config.id in sanitizedData)) {
      sanitizedData[config.id] = [];
    }
  });

  // CRITICAL FIX: Handle consent_given boolean conversion
  if ("consent_given" in sanitizedData) {
    const consentValue = sanitizedData.consent_given;
    sanitizedData.consent_given =
      consentValue === "true" || consentValue === true || consentValue === "on";
  }

  return sanitizedData;
}

/**
 * Transform form data for database using config
 */
export function transformFormDataForDatabase(
  data: Record<string, any>,
  surveyConfig: SurveyConfig
) {
  // Server-safe calculation instead of calling config function
  const totalChildren =
    (data.children_covered || 1) +
    (data.additional_children || 0) +
    (data.aged_out_children || 0);

  // Server-safe evidence data building instead of calling config function
  const evidenceData: Record<string, any> = {};

  // Basic evidence data extraction based on known structure
  Object.entries(data).forEach(([key, value]) => {
    // Skip main table columns (these are extracted separately)
    if (
      [
        "parent_type",
        "children_covered",
        "additional_children",
        "aged_out_children",
        "impact_statement",
        "consent_given",
        "csrf_token",
      ].includes(key)
    ) {
      return;
    }

    // Include all other form data in evidence_data
    evidenceData[key] = value;
  });

  return {
    submission_type: surveyConfig.submissionType, // Use property, not function
    parent_type: data[surveyConfig.conditionalLogic.gatewayField],
    children_affected: totalChildren,
    children_covered: data.children_covered || 1,
    additional_children: data.additional_children || 0,
    aged_out_children: data.aged_out_children || 0,
    impact_statement: data.impact_statement,
    consent_given: data.consent_given === true,
    user_id: null,
    email: "",
    full_name: "",
    evidence_data: evidenceData,
  };
}

/**
 * Check rate limits using config-defined settings
 */
export function checkFormRateLimit(
  identifier: string,
  surveyConfig: SurveyConfig
): { allowed: boolean; retryAfter?: number } {
  // This would use your existing rate limiting logic with config values
  const now = Date.now();
  const window = surveyConfig.security.rateLimitWindow;
  const maxSubmissions = surveyConfig.security.maxSubmissions;

  // Implementation would go here using your existing rate limit storage
  // For now, returning a placeholder
  return { allowed: true };
}

/**
 * Type-safe form data interface generator
 */
export type FormDataType<T extends SurveyConfig> = {
  [K in keyof T["sections"][keyof T["sections"]]["questions"]]: any;
} & {
  consent_given: boolean;
  csrf_token?: string;
};

/**
 * Universal form submission validator
 */
export async function validateFormSubmission(
  formData: FormData,
  surveyConfig: SurveyConfig,
  csrfToken?: string
) {
  try {
    // Convert FormData to object
    const rawData: Record<string, any> = {};
    for (const [key, value] of formData.entries()) {
      rawData[key] = value;
    }

    // 1. CSRF validation
    if (surveyConfig.security.enableCSRFProtection) {
      const submittedToken = rawData.csrf_token;
      if (!submittedToken) {
        return {
          success: false,
          error: "CSRF token required",
          code: "CSRF_MISSING",
        };
      }
    }

    // 2. Rate limiting
    const rateLimitCheck = checkFormRateLimit("anonymous", surveyConfig);
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        error: `Too many submissions. Try again in ${rateLimitCheck.retryAfter} seconds.`,
        code: "RATE_LIMITED",
      };
    }

    // 3. Sanitize form data

    const sanitizedData = sanitizeFormData(formData, surveyConfig);

    // 4. Validate using config properties

    const validation = validateFormWithConfig(sanitizedData, surveyConfig);

    if (!validation.success) {
      return {
        success: false,
        error: "Validation failed",
        errors: validation.errors || { _general: "Unknown validation error" },
        code: "VALIDATION_ERROR",
      };
    }

    // 5. Transform for database
    const dbData = transformFormDataForDatabase(validation.data!, surveyConfig);

    return {
      success: true,
      data: dbData,
      warnings: validation.warnings,
    };
  } catch (error) {
    console.error("💥 Validation function error:", error);
    console.error("💥 Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
    });

    return {
      success: false,
      error: "Internal validation error",
      errors: {
        _general: error instanceof Error ? error.message : "Unknown error",
      },
      code: "INTERNAL_ERROR",
    };
  }
}
