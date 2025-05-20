EXECUTE FUNCTION update_submission_attachment_count();

-- Create storage bucket for PDF documents if it doesn't exist
-- Note: This needs to be done via the Supabase dashboard or API
-- The following is pseudo-SQL as a reminder

-- CREATE BUCKET IF NOT EXISTS evidence_documents;

-- Update your RLS (Row Level Security) policies
-- These policies ensure users can only access their own files

-- File uploads policy
CREATE POLICY "Users can view their own file uploads"
ON file_uploads
FOR SELECT
USING (
  submission_id IN (
    SELECT id FROM evidence_submissions WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own file uploads"
ON file_uploads
FOR INSERT
WITH CHECK (
  submission_id IN (
    SELECT id FROM evidence_submissions WHERE user_id = auth.uid()
  )
);

-- File content policy
CREATE POLICY "Users can view their own file content"
ON file_content
FOR SELECT
USING (
  submission_id IN (
    SELECT id FROM evidence_submissions WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own file content"
ON file_content
FOR UPDATE
USING (
  submission_id IN (
    SELECT id FROM evidence_submissions WHERE user_id = auth.uid()
  )
);

-- Enable RLS on the tables
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_content ENABLE ROW LEVEL SECURITY;

-- Create a trigger function to sync redaction status to the main submission
CREATE OR REPLACE FUNCTION update_submission_redaction_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_redacted = TRUE THEN
    UPDATE evidence_submissions
    SET is_redacted = TRUE
    WHERE id = NEW.submission_id AND is_redacted = FALSE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain redaction status
CREATE TRIGGER after_file_content_update
AFTER UPDATE OF is_redacted ON file_content
FOR EACH ROW
WHEN (NEW.is_redacted = TRUE)
EXECUTE FUNCTION update_submission_redaction_status();