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
  consent_given: boolean;
  is_redacted?: boolean;
}

// Define Supabase database schema
export type Database = {
  public: {
    Tables: {
      evidence_submissions: {
        Row: Submission;
        Insert: Omit<Submission, 'id' | 'created_at'>;
        Update: Partial<Omit<Submission, 'id' | 'created_at'>>;
      };
      // Add other tables as needed
    };
  };
};