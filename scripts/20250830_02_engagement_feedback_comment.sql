-- Add comment field to engagement_feedback to capture free-text replies
BEGIN;
ALTER TABLE engagement_feedback
  ADD COLUMN IF NOT EXISTS comment TEXT NULL;
COMMIT;
