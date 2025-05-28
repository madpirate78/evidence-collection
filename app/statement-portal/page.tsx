// app/statement-portal/page.tsx - Fixed save logic
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { CSRFToken } from "@/utils/security";
import { CSRFTokenInput } from "@/components/csrf-token";
import {
  evidenceSchema,
  evidenceDraftSchema,
  type EvidenceFormData,
  validateEvidenceStep,
} from "@/schemas/evidence-schema";

// Default form data
const INITIAL_FORM_DATA: EvidenceFormData = {
  // Basic info
  full_name: "",
  case_number: "",
  case_start_date: "",

  // Quick assessment
  paying_or_receiving: "paying",
  gender: "",
  children_affected: 1,

  // Situation check
  has_equal_care: false,
  facing_enforcement: false,
  has_fictitious_arrears: false,

  // Financial details
  shared_care_nights: 0,
  child_benefit_holder: "",
  monthly_payment_demanded: 0,
  fictitious_arrears_amount: 0,
  actual_arrears_amount: 0,

  // Regulation 50
  regulation_50_attempted: false,
  regulation_50_outcome: "",

  // Child impact
  impact_severity: 5,
  child_told_less_money: false,
  child_lost_bedroom: false,
  child_anxiety_money: false,
  school_attendance_before: 100,
  school_attendance_after: 100,

  // Written statements
  description: "",
  child_impact_statement: "",
  impact_statement: "",

  // Consent
  consent_given: false,
};

function StatementPortalContent() {
  const { user, loading: authLoading, initialised } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const hasRedirected = useRef(false);
  const isInitialLoad = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const supabase = createClient();

  // React Hook Form with Zod validation
  const form = useForm<EvidenceFormData>({
    resolver: zodResolver(evidenceSchema),
    defaultValues: INITIAL_FORM_DATA,
    mode: "onBlur",
    reValidateMode: "onBlur", // Changed to prevent re-validation on every change
  });

  const {
    handleSubmit,
    watch,
    formState: { errors, isValid },
    reset,
    trigger,
    getValues,
  } = form;

  // Handle auth redirect
  useEffect(() => {
    if (!initialised || hasRedirected.current) return;

    if (!user) {
      hasRedirected.current = true;
      router.push("/sign-in?redirectTo=/statement-portal");
    }
  }, [user, initialised, router]);

  // Load saved draft on mount
  useEffect(() => {
    if (!isInitialLoad.current) return;

    const savedDraft = localStorage.getItem("statementDraft");
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        const savedDate = localStorage.getItem("statementDraftSaved");

        // Merge saved draft with defaults
        const mergedData = {
          ...INITIAL_FORM_DATA,
          ...parsed,
        };

        // Validate with draft schema (allows partial data)
        const partialResult = evidenceDraftSchema.safeParse(mergedData);

        if (partialResult.success) {
          reset(mergedData);
          if (savedDate) {
            setLastSaved(new Date(savedDate));
          }
          console.log("Draft loaded successfully");
        } else {
          // Still try to load what we can
          const safeData = { ...INITIAL_FORM_DATA };

          // Copy over valid fields
          Object.keys(parsed).forEach((key) => {
            if (key in INITIAL_FORM_DATA) {
              (safeData as any)[key] = parsed[key];
            }
          });

          reset(safeData);
          console.log("Partial draft data recovered");
        }
      } catch (e) {
        console.error("Failed to parse saved draft:", e);
        localStorage.removeItem("statementDraft");
        localStorage.removeItem("statementDraftSaved");
      }
    }

    isInitialLoad.current = false;
  }, [reset]);

  // Save draft function - only saves to localStorage
  const saveDraft = useCallback(() => {
    const currentData = getValues();
    setSavingDraft(true);

    try {
      localStorage.setItem("statementDraft", JSON.stringify(currentData));
      localStorage.setItem("statementDraftSaved", new Date().toISOString());
      setLastSaved(new Date());

      // Clear saving indicator after a short delay
      setTimeout(() => setSavingDraft(false), 500);
    } catch (error) {
      console.error("Failed to save draft:", error);
      setSavingDraft(false);
    }
  }, [getValues]);

  // Manual save with debounce (for the Save button)
  const scheduleSave = useCallback(() => {
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule a new save in 2 seconds
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, 2000);
  }, [saveDraft]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Save immediately on unload
      const currentData = getValues();
      localStorage.setItem("statementDraft", JSON.stringify(currentData));
      localStorage.setItem("statementDraftSaved", new Date().toISOString());
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Clean up timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [getValues]);

  // Form submission handler
  const onSubmit = async (data: EvidenceFormData) => {
    if (!user) {
      setSubmitError("Session expired. Please sign in again.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const csrfToken = CSRFToken.get();
      if (!csrfToken) {
        throw new Error(
          "Security token missing. Please refresh the page and try again."
        );
      }

      // Submit to API - send raw form data, don't transform
      const response = await fetch("/api/submit-evidence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          ...data, // Send raw form data
          user_id: user.id,
          email: user.email || "",
          csrf_token: csrfToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `HTTP ${response.status}: Failed to submit evidence`
        );
      }

      // Clear draft and redirect
      localStorage.removeItem("statementDraft");
      localStorage.removeItem("statementDraftSaved");
      router.push("/statement-portal/success");
    } catch (error) {
      console.error("Submission error:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit evidence"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigation with validation
  const goToNextStep = async () => {
    // Save draft when changing steps
    saveDraft();

    // Get current step fields to validate
    const stepFieldsMap: Record<number, (keyof EvidenceFormData)[]> = {
      0: [
        "full_name",
        "paying_or_receiving",
        "gender",
        "children_affected",
        "case_number",
      ],
      1: ["has_equal_care", "facing_enforcement", "has_fictitious_arrears"],
      2: [
        "shared_care_nights",
        "child_benefit_holder",
        "monthly_payment_demanded",
        "fictitious_arrears_amount",
        "actual_arrears_amount",
      ],
      3: ["regulation_50_attempted", "regulation_50_outcome"],
      4: [
        "impact_severity",
        "child_told_less_money",
        "child_lost_bedroom",
        "child_anxiety_money",
        "school_attendance_before",
        "school_attendance_after",
      ],
      5: ["description", "child_impact_statement", "impact_statement"],
      6: ["consent_given"],
    };

    const currentStepFields = stepFieldsMap[step] || [];

    // Only validate current step fields
    const isStepValid = await trigger(currentStepFields);

    if (isStepValid && step < steps.length - 1) {
      setStep(step + 1);
      window.scrollTo(0, 0);
    }
  };

  const goToPreviousStep = () => {
    // Save draft when changing steps
    saveDraft();

    if (step > 0) {
      setStep(step - 1);
      window.scrollTo(0, 0);
    }
  };

  if (!initialised || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading evidence form...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Watch only specific fields needed for conditional rendering
  const paying_or_receiving = watch("paying_or_receiving");
  const regulation_50_attempted = watch("regulation_50_attempted");
  const monthly_payment_demanded = watch("monthly_payment_demanded");
  const fictitious_arrears_amount = watch("fictitious_arrears_amount");
  const school_attendance_before = watch("school_attendance_before");
  const school_attendance_after = watch("school_attendance_after");
  const impact_severity = watch("impact_severity");

  // Error display component
  const ErrorMessage = ({ error }: { error?: string }) => {
    if (!error) return null;
    return <p className="text-red-600 text-sm mt-1">{error}</p>;
  };

  // Input wrapper with error handling
  const FormField = ({
    label,
    children,
    error,
    required = false,
  }: {
    label: string;
    children: React.ReactNode;
    error?: string;
    required?: boolean;
  }) => (
    <div>
      <label className="block text-sm font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      <ErrorMessage error={error} />
    </div>
  );

  // Step definitions with validation
  const steps = [
    // Step 1: Quick Assessment
    {
      title: "Quick Assessment",
      component: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Your Full Name"
                error={errors.full_name?.message}
                required
              >
                <input
                  type="text"
                  {...form.register("full_name")}
                  className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 ${
                    errors.full_name ? "border-red-500" : ""
                  }`}
                  placeholder="Enter your full name"
                />
              </FormField>

              <FormField
                label="CMS Case Number (if known)"
                error={errors.case_number?.message}
              >
                <input
                  type="text"
                  {...form.register("case_number")}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. CS/123456/A"
                />
              </FormField>

              <FormField
                label="When did your case start?"
                error={errors.case_start_date?.message}
              >
                <input
                  type="date"
                  {...form.register("case_start_date")}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </FormField>
            </div>
          </div>

          <FormField
            label="Are you a paying or receiving parent?"
            error={errors.paying_or_receiving?.message}
            required
          >
            <div className="grid grid-cols-2 gap-4">
              <label
                className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                  paying_or_receiving === "paying"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  {...form.register("paying_or_receiving")}
                  value="paying"
                  className="sr-only"
                />
                <div className="font-medium">Paying Parent</div>
                <div className="text-sm text-gray-600">I pay maintenance</div>
              </label>
              <label
                className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                  paying_or_receiving === "receiving"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  {...form.register("paying_or_receiving")}
                  value="receiving"
                  className="sr-only"
                />
                <div className="font-medium">Receiving Parent</div>
                <div className="text-sm text-gray-600">
                  I receive maintenance
                </div>
              </label>
            </div>
          </FormField>

          <FormField label="Gender (optional)" error={errors.gender?.message}>
            <select
              {...form.register("gender")}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </FormField>

          <FormField
            label="How many children are affected?"
            error={errors.children_affected?.message}
            required
          >
            <input
              type="number"
              min="1"
              max="20"
              {...form.register("children_affected", { valueAsNumber: true })}
              className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 ${
                errors.children_affected ? "border-red-500" : ""
              }`}
            />
          </FormField>
        </div>
      ),
    },

    // Step 2: Situation Check
    {
      title: "Your Situation",
      component: (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold mb-3">Current Issues</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
              <input
                type="checkbox"
                {...form.register("has_equal_care")}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span>I have 50/50 shared care but still pay maintenance</span>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
              <input
                type="checkbox"
                {...form.register("facing_enforcement")}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span>
                I'm facing enforcement action (DEO, liability order, etc)
              </span>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
              <input
                type="checkbox"
                {...form.register("has_fictitious_arrears")}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span>CMS claims I owe arrears that don't exist</span>
            </label>
          </div>
        </div>
      ),
    },

    // Step 3: Financial Details
    {
      title: "Financial Details",
      component: (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold mb-3">
            Care and Payment Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Shared care nights per week"
              error={errors.shared_care_nights?.message}
            >
              <input
                type="number"
                min="0"
                max="7"
                step="0.5"
                {...form.register("shared_care_nights", {
                  valueAsNumber: true,
                })}
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 ${
                  errors.shared_care_nights ? "border-red-500" : ""
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                3.5+ nights qualifies for Regulation 50 protection
              </p>
            </FormField>

            <FormField
              label="Who receives child benefit?"
              error={errors.child_benefit_holder?.message}
            >
              <select
                {...form.register("child_benefit_holder")}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select...</option>
                <option value="myself">Myself</option>
                <option value="other_parent">Other parent</option>
                <option value="unknown">Don't know</option>
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Monthly payment demanded (£)"
              error={errors.monthly_payment_demanded?.message}
            >
              <input
                type="number"
                min="0"
                step="0.01"
                {...form.register("monthly_payment_demanded", {
                  valueAsNumber: true,
                })}
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 ${
                  errors.monthly_payment_demanded ? "border-red-500" : ""
                }`}
              />
            </FormField>

            <FormField
              label="Fictitious arrears claimed (£)"
              error={errors.fictitious_arrears_amount?.message}
            >
              <input
                type="number"
                min="0"
                step="0.01"
                {...form.register("fictitious_arrears_amount", {
                  valueAsNumber: true,
                })}
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 ${
                  errors.fictitious_arrears_amount ? "border-red-500" : ""
                }`}
              />
            </FormField>
          </div>

          <FormField
            label="Actual legitimate arrears (if any) (£)"
            error={errors.actual_arrears_amount?.message}
          >
            <input
              type="number"
              min="0"
              step="0.01"
              {...form.register("actual_arrears_amount", {
                valueAsNumber: true,
              })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </FormField>

          {/* Warning for high amounts */}
          {(monthly_payment_demanded > 10000 ||
            fictitious_arrears_amount > 100000) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                ⚠️ The amounts entered seem unusually high. Please double-check
                your figures.
              </p>
            </div>
          )}
        </div>
      ),
    },

    // Step 4: Regulation 50
    {
      title: "Regulation 50",
      component: (
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Regulation 50 Protection
            </h3>
            <p className="text-blue-800 text-sm">
              If you have shared care for 3.5+ nights per week, you may be
              protected from paying maintenance under Regulation 50.
            </p>
          </div>

          <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
            <input
              type="checkbox"
              {...form.register("regulation_50_attempted")}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <span>I have attempted to claim Regulation 50 protection</span>
          </label>

          {regulation_50_attempted && (
            <FormField
              label="What was the outcome?"
              error={errors.regulation_50_outcome?.message}
              required
            >
              <select
                {...form.register("regulation_50_outcome")}
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 ${
                  errors.regulation_50_outcome ? "border-red-500" : ""
                }`}
              >
                <option value="">Select outcome...</option>
                <option value="approved">Approved - protection granted</option>
                <option value="rejected">Rejected - unfairly denied</option>
                <option value="ignored">Ignored - no response</option>
                <option value="pending">Still pending</option>
              </select>
            </FormField>
          )}
        </div>
      ),
    },

    // Step 5: Child Impact
    {
      title: "Impact on Children",
      component: (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold mb-3">
            How are the children affected?
          </h3>

          <FormField
            label="Overall impact severity (1 = minimal, 10 = severe)"
            error={errors.impact_severity?.message}
            required
          >
            <div className="flex items-center gap-4">
              <span className="text-sm">1</span>
              <input
                type="range"
                min="1"
                max="10"
                {...form.register("impact_severity", { valueAsNumber: true })}
                className="flex-1"
              />
              <span className="text-sm">10</span>
              <span className="font-medium text-lg w-8">{impact_severity}</span>
            </div>
          </FormField>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
              <input
                type="checkbox"
                {...form.register("child_told_less_money")}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span>
                Child told they'll "get less money" if they see me more
              </span>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
              <input
                type="checkbox"
                {...form.register("child_lost_bedroom")}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span>Child lost their bedroom due to financial pressure</span>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
              <input
                type="checkbox"
                {...form.register("child_anxiety_money")}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span>Child shows anxiety about money/payments</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="School attendance before CMS (%)"
              error={errors.school_attendance_before?.message}
            >
              <input
                type="number"
                min="0"
                max="100"
                {...form.register("school_attendance_before", {
                  valueAsNumber: true,
                })}
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 ${
                  errors.school_attendance_before ? "border-red-500" : ""
                }`}
              />
            </FormField>
            <FormField
              label="School attendance after CMS (%)"
              error={errors.school_attendance_after?.message}
            >
              <input
                type="number"
                min="0"
                max="100"
                {...form.register("school_attendance_after", {
                  valueAsNumber: true,
                })}
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 ${
                  errors.school_attendance_after ? "border-red-500" : ""
                }`}
              />
            </FormField>
          </div>

          {/* Show improvement notice */}
          {school_attendance_after > school_attendance_before && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">
                ✓ It's positive to see school attendance has improved.
              </p>
            </div>
          )}
        </div>
      ),
    },

    // Step 6: Written Evidence
    {
      title: "Your Statement",
      component: (
        <div className="space-y-6">
          <FormField
            label="Describe your situation and the issues you've faced"
            error={errors.description?.message}
            required
          >
            <textarea
              {...form.register("description")}
              rows={6}
              className={`w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 ${
                errors.description ? "border-red-500" : ""
              }`}
              placeholder="Please describe the problems you've experienced with the CMS, including specific incidents, dates if known, and how this has affected you..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum 10 characters required
            </p>
          </FormField>

          <FormField
            label="How has this specifically impacted your children?"
            error={errors.child_impact_statement?.message}
          >
            <textarea
              {...form.register("child_impact_statement")}
              rows={4}
              className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the impact on your children - emotional, educational, housing, relationships..."
            />
          </FormField>

          <FormField
            label="Additional impact statement (optional)"
            error={errors.impact_statement?.message}
          >
            <textarea
              {...form.register("impact_statement")}
              rows={3}
              className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional information about the impact on your family..."
            />
          </FormField>
        </div>
      ),
    },

    // Step 7: Consent
    {
      title: "Consent & Submit",
      component: (
        <div className="space-y-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Ready to Submit
            </h3>
            <p className="text-green-800 text-sm">
              Your evidence will be used to support judicial review proceedings
              and help expose systemic discrimination in the CMS.
            </p>
          </div>

          <FormField label="" error={errors.consent_given?.message} required>
            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
              <input
                type="checkbox"
                {...form.register("consent_given")}
                className="w-5 h-5 text-blue-600 rounded mt-1"
              />
              <div className="text-sm">
                <div className="font-medium mb-1">I consent to:</div>
                <ul className="space-y-1 text-gray-700">
                  <li>
                    • My anonymised evidence being used in judicial review
                    proceedings
                  </li>
                  <li>
                    • Data being shared with legal representatives and
                    researchers
                  </li>
                  <li>• Information being included in reports to Parliament</li>
                  <li>
                    • Understanding I can withdraw consent and delete my data
                  </li>
                </ul>
              </div>
            </label>
          </FormField>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>Your privacy is protected:</strong> Personal details will
              be anonymised and you maintain full control over your data.
            </p>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-2">CMS Evidence Collection</h1>
      <p className="text-gray-600 mb-8">
        Your evidence matters. Help expose systemic discrimination.
      </p>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 flex-1 mx-1 rounded transition-all duration-300 ${
                idx <= step ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <p className="text-center text-sm text-gray-600">
          Step {step + 1} of {steps.length}: {currentStep.title}
        </p>
      </div>

      {/* Form with proper validation */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-lg shadow p-6 mb-6"
      >
        <CSRFTokenInput />
        {currentStep.component}
      </form>

      {/* Navigation */}
      <div className="flex justify-between gap-3">
        <button
          type="button"
          onClick={goToPreviousStep}
          disabled={step === 0}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 transition hover:bg-gray-300"
        >
          Previous
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={saveDraft}
            disabled={savingDraft}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
          >
            {savingDraft ? "Saving..." : "Save Draft"}
          </button>

          {step === steps.length - 1 ? (
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || !isValid}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition flex items-center gap-2"
            >
              {isSubmitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {isSubmitting ? "Submitting..." : "Submit Evidence"}
            </button>
          ) : (
            <button
              type="button"
              onClick={goToNextStep}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Next
            </button>
          )}
        </div>
      </div>

      {/* Save status indicator */}
      <div className="text-center text-sm text-gray-500 mt-4">
        {lastSaved ? (
          <span>
            Last saved:{" "}
            {lastSaved.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ) : (
          <span>No draft saved yet</span>
        )}
        <span className="block text-xs mt-1">
          Draft saves when you navigate steps or click "Save Draft"
        </span>
      </div>

      {/* Error display */}
      {submitError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-600">{submitError}</p>
          {submitError.includes("Security token") && (
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Refresh page to reload security token
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function StatementPortal() {
  return <StatementPortalContent />;
}
