// Define TypeScript types for database tables
export interface Submission {
  id: number;
  created_at: string;
  user_id: string;
  full_name: string;
  email: string;
  case_number?: string;
  case_start_date?: string;
  issue_category: string;
  description: string;
  impact_statement?: string;
  consent_given: string;
  paying_or_receiving: string;
  gender: string;
  children_affected: number;
  has_equal_care: string;
  facing_enforcement: string;
  has_fictitious_arrears: string;
  shared_care_nights: number;
  child_benefit_holder: string;
  monthly_payment_demanded: number;
  fictitious_arrears_amount: number;
  actual_arrears_amount: number;
  regulation_50_attempted: string;
  regulation_50_outcome: string;
  impact_severity: number;
  child_told_less_money: string;
  child_lost_bedroom: string;
  child_anxiety_money: string;
  school_attendance_before: number;
  school_attendance_after: number;
  child_impact_statement?: string;
}

// Define Supabase database schema
export type Database = {
  public: {
    Tables: {
      evidence_submissions: {
        Row: Submission;
        Insert: Omit<Submission, "id" | "created_at">;
        //Update: Partial<Omit<Submission, "id" | "created_at">>;
      };
      // Add other tables as needed
    };
  };
};
