// config/surveyQuestions.ts - Enhanced config-driven approach
import { z } from "zod";

// ===================================================================
// CORE INTERFACES - Form-agnostic, reusable across any survey type
// ===================================================================

interface QuestionOption {
  value: string;
  label: string;
}

export interface QuestionConfig {
  id: string;
  type:
    | "radio"
    | "checkbox"
    | "textarea"
    | "number"
    | "currency"
    | "multi-number"
    | "select"
    | "text";
  question: string;
  options?: QuestionOption[];
  required?: boolean;
  dbColumn?: string;
  validation?: z.ZodSchema<any>; //ignored on server
  appliesTo?: string[]; // Generic - could be parent types, user roles, etc.
  filterOptions?: (
    options: QuestionOption[],
    conditionalValue: string | null | undefined
  ) => QuestionOption[];
  sensitiveData?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  sanitize?: (value: any) => any; //ignored on server
  triggersCrisisProtocol?: (value: any) => boolean;
  crisisResources?: Record<string, string>;
  followUp?: QuestionConfig;
  numberInputs?: Array<{
    id: string;
    label: string;
    min?: number;
    max?: number;
    default?: number;
    required?: boolean;
    dbColumn?: string;
  }>;
  showIf?: (parentValue: any, allData?: any) => boolean;
  default?: any;
  branches?: Record<string, string>;
}

interface SectionConfig {
  title: string;
  questions: Record<string, QuestionConfig>;
}

export interface SurveyConfig {
  // Survey metadata
  surveyId: string;
  title: string;
  description: string;
  version: string;
  submissionType: string; // For database storage

  // Form behavior configuration
  conditionalLogic: {
    gatewayField: string; // Field that determines branching (e.g., 'parent_type')
    getApplicableValue: (data: any) => string | null;
    getApplicableQuestions: (
      value: string | null
    ) => Record<string, QuestionConfig>;
    validateFormData: (data: any, context: any) => ValidationResult;
  };

  // Validation configuration
  validation: {
    validateFormData: (
      data: any,
      conditionalValue?: string
    ) => ValidationResult;
    sanitizeInput: (value: any, questionConfig: QuestionConfig) => any;
    transformForDatabase: (data: any) => any;
  };

  // Security configuration
  security: {
    rateLimitKey: string;
    rateLimitWindow: number;
    rateLimitMax: number;
    maxSubmissions: number;
    requiresCsrf: boolean;
    enableCrisisProtocol: boolean;
    enableCSRFProtection: boolean;
  };

  // Database configuration
  database: {
    tableName: string;
    mainColumns: string[];
    jsonbColumn: string;
  };

  // Data transformation configuration (ADD THIS)
  dataTransform: {
    getSubmissionType: () => string;
    calculateTotalChildren: (data: any) => number;
    buildEvidenceData: (data: any) => Record<string, any>;
  };

  // Form sections
  sections: Record<string, SectionConfig>;
}

interface ValidationResult {
  errors: Record<string, string>;
  warnings: Array<{ type: string; questionId?: string; resources?: any }>;
  isValid: boolean;
}

// ===================================================================
// CMS SURVEY CONFIGURATION - All CMS-specific logic in one place
// ===================================================================

export const CMS_SURVEY_CONFIG: SurveyConfig = {
  // Survey metadata
  surveyId: "cms_welfare_assessment",
  title: "CMS Policy Impact Survey",
  description:
    "Anonymous survey collecting data on child maintenance policy experiences",
  version: "v1.0",
  submissionType: "cms_scandal_v1",

  // CMS-specific conditional logic
  conditionalLogic: {
    gatewayField: "parent_type",
    getApplicableValue: (data: any) => data.parent_type,
    getApplicableQuestions: (parentType: string | null) => {
      if (!parentType) return {}; // Return empty if null
      const questions: Record<string, QuestionConfig> = {};

      Object.values(CMS_SURVEY_CONFIG.sections).forEach((section) => {
        Object.entries(section.questions).forEach(
          ([questionKey, questionConfig]) => {
            if (
              !questionConfig.appliesTo ||
              questionConfig.appliesTo.includes(parentType)
            ) {
              questions[questionConfig.id] = questionConfig;
            }
          }
        );
      });

      return questions;
    },
    validateFormData: (data: any, context: any): ValidationResult => {
      return CMS_SURVEY_CONFIG.validation.validateFormData(
        data,
        data.parent_type
      );
    },
  },

  // CMS-specific validation
  validation: {
    validateFormData: (data: any, parentType?: string): ValidationResult => {
      const errors: Record<string, string> = {};
      const warnings: Array<{
        type: string;
        questionId?: string;
        resources?: any;
      }> = [];

      if (!parentType && data.parent_type) {
        parentType = data.parent_type;
      }

      const applicableQuestions = parentType
        ? CMS_SURVEY_CONFIG.conditionalLogic.getApplicableQuestions(parentType)
        : {};

      Object.entries(applicableQuestions).forEach(
        ([questionId, questionConfig]) => {
          const value = data[questionId];

          try {
            if (questionConfig.validation) {
              questionConfig.validation.parse(value);
            }

            if (
              questionConfig.required &&
              (value === null || value === undefined || value === "")
            ) {
              errors[questionId] = "This field is required";
            }

            if (
              questionConfig.triggersCrisisProtocol &&
              questionConfig.triggersCrisisProtocol(value)
            ) {
              warnings.push({
                type: "crisis_response",
                questionId,
                resources: questionConfig.crisisResources,
              });
            }
          } catch (zodError: any) {
            errors[questionId] = zodError.errors[0]?.message || "Invalid input";
          }
        }
      );

      return {
        errors,
        warnings,
        isValid: Object.keys(errors).length === 0,
      };
    },

    sanitizeInput: (value: any, questionConfig: QuestionConfig): any => {
      if (value === null || value === undefined) return value;

      if (questionConfig.sanitize) {
        value = questionConfig.sanitize(value);
      }

      switch (questionConfig.type) {
        case "text":
        case "textarea":
          return typeof value === "string"
            ? value.trim().slice(0, questionConfig.maxLength || 10000)
            : "";

        case "number":
          const num = parseInt(value);
          return isNaN(num)
            ? 0
            : Math.max(
                questionConfig.min || 0,
                Math.min(questionConfig.max || 999999, num)
              );

        case "radio":
        case "select":
          const allowedValues =
            questionConfig.options?.map((opt) => opt.value) || [];
          return allowedValues.includes(value) ? value : null;

        case "checkbox":
          if (!Array.isArray(value)) return [];
          const allowedCheckboxValues =
            questionConfig.options?.map((opt) => opt.value) || [];
          return value.filter((v) => allowedCheckboxValues.includes(v));

        default:
          return value;
      }
    },

    transformForDatabase: (data: any) => {
      const totalChildren =
        (data.children_covered || 1) +
        (data.additional_children || 0) +
        (data.aged_out_children || 0);

      const evidenceData: Record<string, any> = {};

      Object.entries(data).forEach(([formField, value]) => {
        if (
          [
            "parent_type",
            "children_covered",
            "additional_children",
            "aged_out_children",
            "impact_statement",
            "consent_given",
          ].includes(formField)
        ) {
          return;
        }

        if (formField === "cms_response") {
          if (data.welfare_raised === "yes" && value) {
            evidenceData[formField] = value;
          }
          return;
        }

        evidenceData[formField] = value;
      });

      return {
        submission_type: CMS_SURVEY_CONFIG.submissionType,
        parent_type: data.parent_type,
        children_affected: totalChildren,
        children_covered: data.children_covered || 1,
        additional_children: data.additional_children || 0,
        aged_out_children: data.aged_out_children || 0,
        impact_statement: data.impact_statement,
        consent_given: data.consent_given || false,
        user_id: null,
        email: "",
        full_name: "",
        evidence_data: evidenceData,
      };
    },
  },

  // Security configuration
  security: {
    rateLimitKey: "cms_evidence_submission",
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 5,
    maxSubmissions: 5, // Add this for your schema
    requiresCsrf: true, // Add this for your schema
    enableCrisisProtocol: true,
    enableCSRFProtection: false,
  },

  // Database configuration
  database: {
    tableName: "evidence_submissions",
    mainColumns: [
      "parent_type",
      "children_affected",
      "children_covered",
      "additional_children",
      "impact_statement",
      "consent_given",
    ],
    jsonbColumn: "evidence_data",
  },

  // Data transformation configuration for your schema
  dataTransform: {
    getSubmissionType: () => "cms_scandal_v1",
    calculateTotalChildren: (data: any) => {
      return (
        (data.children_covered || 1) +
        (data.additional_children || 0) +
        (data.aged_out_children || 0)
      );
    },
    buildEvidenceData: (data: any) => {
      const evidenceData: Record<string, any> = {};

      Object.entries(data).forEach(([formField, value]) => {
        if (
          [
            "parent_type",
            "children_covered",
            "additional_children",
            "aged_out_children",
            "impact_statement",
            "consent_given",
          ].includes(formField)
        ) {
          return;
        }

        if (formField === "cms_response") {
          if (data.welfare_raised === "yes" && value) {
            evidenceData[formField] = value;
          }
          return;
        }

        evidenceData[formField] = value;
      });

      return evidenceData;
    },
  },

  // Form sections with questions
  sections: {
    coreQuestions: {
      title: "CMS Policy Impact Survey",
      questions: {
        // Q1: Parent Type (Gateway Question)
        parentType: {
          id: "parent_type",
          type: "radio",
          question: "Are you a paying or receiving parent?",
          options: [
            { value: "paying", label: "Paying Parent" },
            { value: "receiving", label: "Receiving Parent" },
          ],
          required: true,
          dbColumn: "parent_type",
        },

        // Q2: Children Numbers
        childrenAffected: {
          id: "children_affected",
          type: "multi-number",
          question: "How many children are affected?",
          numberInputs: [
            {
              id: "children_covered",
              label: "Children covered by CMS case (1-20)",
              min: 1,
              max: 20,
              default: 1,
              required: true,
              dbColumn: "children_covered",
            },
            {
              id: "additional_children",
              label: "Additional children in household affected (0-20)",
              min: 0,
              max: 20,
              default: 0,
              dbColumn: "additional_children",
            },
            {
              id: "aged_out_children",
              label:
                "Children who have 'aged out' or CMS won't consider (0-20)",
              min: 0,
              max: 20,
              default: 0,
              dbColumn: "aged_out_children",
            },
          ],
        },

        // Q3: Welfare Assessment
        welfareAssessment: {
          id: "welfare_assessment",
          type: "radio",
          question:
            "Has CMS considered how their calculations affect your children's overall wellbeing?",
          options: [
            {
              value: "yes_assessed",
              label: "Yes - They assessed my children's needs",
            },
            {
              value: "no_ignored",
              label: "No - They ignored or rejected welfare concerns",
            },
            {
              value: "never_asked",
              label: "No - They never asked about my children's wellbeing",
            },
            {
              value: "not_sure",
              label: "Not sure - I don't know how to raise this with CMS",
            },
          ],
          required: true,
          dbColumn: "welfare_assessment",
        },

        // Q4: Financial Impact - Branching based on parent type
        financialImpact: {
          id: "financial_impact",
          type: "radio",
          question:
            "How do CMS calculations affect your ability to provide for your children?",
          options: [
            // Paying parent options
            {
              value: "maintain_provision",
              label: "I can maintain good provision for my children",
            },
            {
              value: "reduced_1_200",
              label: "Reduced provision by £1-200 monthly",
            },
            {
              value: "reduced_200_500",
              label: "Reduced provision by £200-500 monthly",
            },
            {
              value: "reduced_500_plus",
              label: "Reduced provision by £500+ monthly",
            },
            {
              value: "cannot_provide",
              label: "Cannot adequately provide during my care time",
            },
            // Receiving parent options
            {
              value: "fully_covers",
              label: "Payments fully cover my children's needs",
            },
            { value: "short_1_200", label: "Short by £1-200 monthly" },
            { value: "short_200_500", label: "Short by £200-500 monthly" },
            { value: "short_500_plus", label: "Short by £500+ monthly" },
            {
              value: "not_reflect_costs",
              label: "Payments don't reflect children's real costs",
            },
          ],
          filterOptions: (options, conditionalValue) => {
            if (conditionalValue === "paying") {
              return options.filter(
                (opt) =>
                  opt.value.includes("maintain_provision") ||
                  opt.value.includes("reduced_") ||
                  opt.value.includes("cannot_provide")
              );
            } else if (conditionalValue === "receiving") {
              return options.filter(
                (opt) =>
                  opt.value.includes("fully_covers") ||
                  opt.value.includes("short_") ||
                  opt.value.includes("not_reflect_costs")
              );
            }
            return options;
          },
          required: true,
          dbColumn: "financial_impact",

          // Follow-up for work impact
          followUp: {
            id: "work_impact",
            type: "radio",
            question:
              "Has this financial pressure forced changes to your work?",
            options: [
              { value: "no_changes", label: "No changes to my work" },
              {
                value: "working_more",
                label: "Working more hours/jobs to meet demands",
              },
              {
                value: "working_less",
                label: "Working less due to stress/mental health",
              },
              { value: "informal_work", label: "Moved to informal/cash work" },
              { value: "cannot_work", label: "Can no longer work/on benefits" },
            ],
            required: false,
            appliesTo: ["paying"],
            dbColumn: "work_impact",
            validation: z
              .enum([
                "no_changes",
                "working_more",
                "working_less",
                "informal_work",
                "cannot_work",
              ])
              .optional(),
            showIf: (parentValue: string) =>
              Boolean(
                parentValue &&
                  parentValue !== "maintain_provision" &&
                  parentValue !== "fully_covers"
              ),
          },
        },

        // Q5: Mental Health Scale
        mentalHealthImpact: {
          id: "mental_health_scale",
          type: "radio",
          question:
            "Rate the impact of CMS on your mental health and wellbeing:",
          options: [
            { value: "no_impact", label: "No impact - I'm coping fine" },
            { value: "mild", label: "Mild impact - Some stress but managing" },
            {
              value: "moderate",
              label:
                "Moderate impact - Affecting my daily life and relationships",
            },
            {
              value: "severe",
              label: "Severe impact - Needed professional support/medication",
            },
            {
              value: "crisis",
              label: "Crisis impact - Suicidal thoughts or attempts",
            },
          ],
          required: true,
          dbColumn: "mental_health_scale",
          sensitiveData: true,
          triggersCrisisProtocol: (value: any) => value === "crisis",
          crisisResources: {
            immediate:
              "If you're having suicidal thoughts, please contact Samaritans: 116 123 (free, 24/7)",
            local: "Contact your GP or call NHS 111",
            emergency: "In immediate danger: call 999",
          },
        },

        // Q6: Children's Impact Severity
        childrenSeverity: {
          id: "children_severity",
          type: "radio",
          question:
            "How severely have your children been impacted by CMS calculations?",
          options: [
            {
              value: "no_impact",
              label: "No impact - Children's lives remain stable",
            },
            {
              value: "minor",
              label: "Minor impact - Notice constraints but cope well",
            },
            {
              value: "moderate",
              label: "Moderate impact - Reduced activities/opportunities",
            },
            {
              value: "severe",
              label:
                "Severe impact - Major lifestyle changes, emotional distress",
            },
            {
              value: "critical",
              label:
                "Critical impact - Lost bedroom, contact reduced, children in crisis",
            },
          ],
          required: true,
          dbColumn: "children_severity",

          followUp: {
            id: "children_impacts",
            type: "checkbox",
            question: "If impacted, which occurred? (Select all that apply)",
            options: [
              {
                value: "housing_inadequate",
                label: "Housing inadequate when children stay with me",
              },
              {
                value: "activities_reduced",
                label: "Children's activities/opportunities reduced",
              },
              {
                value: "contact_control",
                label: "Other parent uses maintenance to control contact",
              },
              {
                value: "anxiety_shown",
                label: "Children show anxiety about the situation",
              },
              {
                value: "loyalty_conflicts",
                label: "Children caught in loyalty conflicts over money",
              },
              {
                value: "relationships_strained",
                label:
                  "Children's relationships strained by financial tensions",
              },
            ],
            showIf: (parentValue: string) =>
              Boolean(parentValue && parentValue !== "no_impact"),
            required: false,
            dbColumn: "children_impacts",
            validation: z
              .array(
                z.enum([
                  "housing_inadequate",
                  "activities_reduced",
                  "contact_control",
                  "anxiety_shown",
                  "loyalty_conflicts",
                  "relationships_strained",
                ])
              )
              .optional(),
          },
        },

        // Q7: Welfare Concerns Raised
        welfareRaised: {
          id: "welfare_raised",
          type: "radio",
          question:
            "Have you tried to raise concerns about your children's welfare with CMS?",
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "not_sure_how", label: "Not sure how to" },
          ],
          required: true,
          dbColumn: "welfare_raised",

          followUp: {
            id: "cms_response",
            type: "checkbox",
            question: "If YES: What happened? (Select all that apply)",
            options: [
              {
                value: "assessed_adjusted",
                label: "They assessed and adjusted calculations",
              },
              {
                value: "told_irrelevant",
                label: "They said welfare isn't relevant to calculations",
              },
              {
                value: "cannot_change",
                label: "They said calculations cannot be changed",
              },
              {
                value: "couldnt_get_through",
                label: "I couldn't get through/gave up trying",
              },
              {
                value: "complaint_ignored",
                label: "My formal complaint was ignored/rejected",
              },
              {
                value: "ice_no_help",
                label: "ICE (Independent Case Examiner) wouldn't help",
              },
            ],
            showIf: (parentValue: string) => parentValue === "yes",
            required: false,
            dbColumn: "cms_response",
            validation: z
              .array(
                z.enum([
                  "assessed_adjusted",
                  "told_irrelevant",
                  "cannot_change",
                  "couldnt_get_through",
                  "complaint_ignored",
                  "ice_no_help",
                ])
              )
              .optional(),
          },
        },

        // Q8: Enforcement Impact - Branching
        enforcementImpact: {
          id: "enforcement_impact",
          type: "radio",
          question: "How has CMS enforcement affected your family's situation?",
          options: [
            // Paying parents
            {
              value: "no_enforcement",
              label: "No enforcement action - Not applicable to me",
            },
            {
              value: "minor",
              label: "Minor impact - Warning letters, additional stress",
            },
            {
              value: "moderate",
              label: "Moderate impact - Deductions started, budget stretched",
            },
            {
              value: "severe",
              label:
                "Severe impact - Bank/wages frozen, struggling to provide basics",
            },
            {
              value: "crisis",
              label:
                "Crisis impact - Lost job/housing threatened, children's stability at risk",
            },
            // Receiving parents
            {
              value: "not_applicable_rp",
              label: "No enforcement needed - Payments made regularly",
            },
            {
              value: "payments_collected",
              label: "Enforcement working - Now getting payments",
            },
            {
              value: "worried_too_harsh",
              label:
                "Worried enforcement is too harsh - Other parent genuinely struggling",
            },
            {
              value: "causing_conflict",
              label:
                "Enforcement causing more conflict - Making co-parenting harder",
            },
            {
              value: "no_enforcement_despite_nonpayment",
              label: "No enforcement despite non-payment - CMS won't help",
            },
            {
              value: "mixed_feelings",
              label:
                "Mixed feelings - Need the money but concerned about impact",
            },
          ],
          filterOptions: (options, conditionalValue) => {
            if (!conditionalValue) return options;
            if (conditionalValue === "paying") {
              return options.filter(
                (opt) =>
                  opt.value === "no_enforcement" ||
                  opt.value === "minor" ||
                  opt.value === "moderate" ||
                  opt.value === "severe" ||
                  opt.value === "crisis"
              );
            } else if (conditionalValue === "receiving") {
              return options.filter(
                (opt) =>
                  opt.value === "not_applicable_rp" ||
                  opt.value === "payments_collected" ||
                  opt.value === "worried_too_harsh" ||
                  opt.value === "causing_conflict" ||
                  opt.value === "no_enforcement_despite_nonpayment" ||
                  opt.value === "mixed_feelings"
              );
            }
            return options;
          },
          required: true,
          dbColumn: "enforcement_impact",
        },

        // Q9: Shared Care Recognition - Branching
        sharedCare: {
          id: "shared_care",
          type: "radio",
          question:
            "If you have shared care, how well does CMS recognise the arrangements?",
          options: [
            {
              value: "not_applicable",
              label: "Not applicable - No shared care",
            },
            // Change these values to US spelling:
            {
              value: "fully_recognized",
              label:
                "Fully recognised - Fair reduction for my care time and costs",
            },
            {
              value: "partially_recognized",
              label:
                "Partially recognised - Some reduction but ignores real costs",
            },
            {
              value: "barely_recognized",
              label: "Barely recognised - Treated as minimal contact parent",
            },
            {
              value: "not_recognized",
              label:
                "Not recognised - Treated as absent despite significant care",
            },
            // These stay the same:
            {
              value: "very_fair",
              label: "Very fair - Payments match actual arrangements",
            },
            {
              value: "somewhat_fair",
              label: "Somewhat fair - Close but not quite right",
            },
            {
              value: "unfair",
              label: "Unfair - Significant mismatch with reality",
            },
            {
              value: "very_unfair",
              label: "Very unfair - Completely ignores actual care patterns",
            },
          ],
          filterOptions: (options, conditionalValue) => {
            if (conditionalValue === "paying") {
              return options.filter(
                (opt) =>
                  opt.value === "not_applicable" ||
                  opt.value.includes("_recognized") // Now matches the values
              );
            } else if (conditionalValue === "receiving") {
              return options.filter(
                (opt) =>
                  opt.value === "not_applicable" || opt.value.includes("fair")
              );
            }
            return options;
          },
          required: true,
          dbColumn: "shared_care",
        },

        // Q10: Impact Statement (Free text)
        impactStatement: {
          id: "impact_statement",
          type: "textarea",
          question: "What's the biggest impact CMS has had on your children?",
          placeholder:
            "Examples: 'My daughter lost her bedroom' / 'Kids can't do sports anymore'",
          minLength: 20,
          maxLength: 1000,
          required: true,
          dbColumn: "impact_statement",
          sanitize: (value: any) => {
            if (!value) return value;
            return value
              .replace(
                /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                ""
              )
              .replace(/<[^>]*>/g, "")
              .replace(/javascript:/gi, "")
              .replace(/on\w+\s*=/gi, "")
              .trim();
          },
        },
      },
    },
  },
};

// ===================================================================
// EXPORTS
// ===================================================================

// Export the active configuration
export const ACTIVE_SURVEY_CONFIG = CMS_SURVEY_CONFIG;

// Export types
export type { ValidationResult };
