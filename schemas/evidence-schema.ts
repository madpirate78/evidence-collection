// schemas/evidence.schema.ts
import { z } from "zod";

// Base validation rules
const requiredString = (message: string) => z.string().min(1, message);
const optionalString = z.string().optional();
const positiveNumber = z.number().min(0, "Must be 0 or greater");
const percentage = z
  .number()
  .min(0, "Must be 0 or greater")
  .max(100, "Cannot exceed 100%");

// Base schema without refinements (for use with .pick())
export const evidenceSchemaBase = z.object({
  // Basic Information
  full_name: requiredString("Full name is required").min(
    2,
    "Name must be at least 2 characters"
  ),
  case_number: optionalString,
  case_start_date: optionalString,

  // Quick Assessment
  paying_or_receiving: z.enum(["paying", "receiving"], {
    errorMap: () => ({
      message: "Please select whether you pay or receive maintenance",
    }),
  }),
  gender: z.enum(["male", "female", "other", ""]).optional(),
  children_affected: z
    .number()
    .min(1, "At least 1 child must be affected")
    .max(20, "Maximum 20 children allowed"),

  // Situation Check
  has_equal_care: z.boolean(),
  facing_enforcement: z.boolean(),
  has_fictitious_arrears: z.boolean(),

  // Financial Details
  shared_care_nights: z
    .number()
    .min(0, "Cannot be negative")
    .max(7, "Cannot exceed 7 nights per week")
    .multipleOf(0.5, "Must be in increments of 0.5"),
  child_benefit_holder: z
    .enum(["myself", "other_parent", "unknown", ""], {
      errorMap: () => ({
        message: "Please specify who receives child benefit",
      }),
    })
    .optional(),
  monthly_payment_demanded: positiveNumber.max(
    50000,
    "Amount seems unusually high - please verify"
  ),
  fictitious_arrears_amount: positiveNumber.max(
    500000,
    "Amount seems unusually high - please verify"
  ),
  actual_arrears_amount: positiveNumber.optional(),

  // Regulation 50
  regulation_50_attempted: z.boolean(),
  regulation_50_outcome: z
    .enum(["approved", "rejected", "ignored", "pending", ""])
    .optional(),

  // Child Impact
  impact_severity: z
    .number()
    .min(1, "Impact severity must be at least 1")
    .max(10, "Impact severity cannot exceed 10"),
  child_told_less_money: z.boolean(),
  child_lost_bedroom: z.boolean(),
  child_anxiety_money: z.boolean(),
  school_attendance_before: percentage,
  school_attendance_after: percentage,

  // Written Statements
  description: requiredString("Please describe your situation").min(
    10,
    "Description must be at least 10 characters"
  ),
  child_impact_statement: optionalString,
  impact_statement: optionalString,

  // Consent
  consent_given: z.boolean().refine((val) => val === true, {
    message: "You must provide consent to submit evidence",
  }),

  // Additional fields that might be present
  email: z.string().email("Invalid email address").optional(),
  user_id: z.string().optional(),
  submission_type: z.string().optional(),
  issue_category: z.string().optional(),
});

// Schema for partial validation (useful for drafts)
export const evidenceDraftSchema = evidenceSchemaBase.partial();

// Evidence form schema with comprehensive validation
export const evidenceSchema = evidenceSchemaBase.refine(
  (data) => {
    // Custom validation: If regulation 50 attempted, outcome should be specified
    if (data.regulation_50_attempted && !data.regulation_50_outcome) {
      return false;
    }
    return true;
  },
  {
    message: "Please specify the outcome of your Regulation 50 application",
    path: ["regulation_50_outcome"],
  }
);

// Infer the TypeScript type from the schema
export type EvidenceFormData = z.infer<typeof evidenceSchema>;

// Schema for partial validation (useful for step-by-step forms)
export const evidenceStepSchemas = {
  step1: evidenceSchemaBase.pick({
    full_name: true,
    case_number: true,
    paying_or_receiving: true,
    gender: true,
    children_affected: true,
  }),

  step2: evidenceSchemaBase.pick({
    has_equal_care: true,
    facing_enforcement: true,
    has_fictitious_arrears: true,
  }),

  step3: evidenceSchemaBase.pick({
    shared_care_nights: true,
    child_benefit_holder: true,
    monthly_payment_demanded: true,
    fictitious_arrears_amount: true,
    actual_arrears_amount: true,
  }),

  step4: evidenceSchemaBase.pick({
    regulation_50_attempted: true,
    regulation_50_outcome: true,
  }),

  step5: evidenceSchemaBase.pick({
    impact_severity: true,
    child_told_less_money: true,
    child_lost_bedroom: true,
    child_anxiety_money: true,
    school_attendance_before: true,
    school_attendance_after: true,
  }),

  step6: evidenceSchemaBase.pick({
    description: true,
    child_impact_statement: true,
    impact_statement: true,
  }),

  step7: evidenceSchemaBase.pick({
    consent_given: true,
  }),
};

// Export step types
export type EvidenceStep1Data = z.infer<typeof evidenceStepSchemas.step1>;
export type EvidenceStep2Data = z.infer<typeof evidenceStepSchemas.step2>;
export type EvidenceStep3Data = z.infer<typeof evidenceStepSchemas.step3>;
export type EvidenceStep4Data = z.infer<typeof evidenceStepSchemas.step4>;
export type EvidenceStep5Data = z.infer<typeof evidenceStepSchemas.step5>;
export type EvidenceStep6Data = z.infer<typeof evidenceStepSchemas.step6>;
export type EvidenceStep7Data = z.infer<typeof evidenceStepSchemas.step7>;

// Validation helper function
export function validateEvidenceStep(
  step: number,
  data: Partial<EvidenceFormData>
) {
  const stepKey = `step${step}` as keyof typeof evidenceStepSchemas;
  const schema = evidenceStepSchemas[stepKey];

  if (!schema) {
    throw new Error(`Invalid step: ${step}`);
  }

  return schema.safeParse(data);
}

// Transform form data for database insertion
export function transformEvidenceForDatabase(data: EvidenceFormData) {
  return {
    ...data,
    case_start_date: data.case_start_date || null, // Only this needs null conversion
    submission_type: "evidence_v2",
    issue_category:
      data.paying_or_receiving === "paying"
        ? "Financial Discrimination"
        : "Other",
  };
}
