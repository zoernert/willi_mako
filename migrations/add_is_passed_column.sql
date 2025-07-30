-- Add is_passed column to user_quiz_attempts
-- Created: 2025-07-30
-- Adds missing is_passed column for quiz results

-- Add is_passed column to user_quiz_attempts
ALTER TABLE user_quiz_attempts 
ADD COLUMN IF NOT EXISTS is_passed BOOLEAN DEFAULT false;

-- Update is_passed based on existing percentage data (typically 50% or more is passing)
UPDATE user_quiz_attempts 
SET is_passed = (percentage >= 50.0)
WHERE percentage IS NOT NULL AND is_passed = false;

-- Create trigger to automatically set is_passed when percentage is updated
CREATE OR REPLACE FUNCTION set_is_passed()
RETURNS TRIGGER AS $$
BEGIN
    -- If percentage is being set, calculate is_passed (50% threshold)
    IF NEW.percentage IS NOT NULL THEN
        NEW.is_passed = (NEW.percentage >= 50.0);
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_quiz_attempts
DROP TRIGGER IF EXISTS set_is_passed_trigger ON user_quiz_attempts;
CREATE TRIGGER set_is_passed_trigger 
    BEFORE INSERT OR UPDATE ON user_quiz_attempts 
    FOR EACH ROW 
    EXECUTE FUNCTION set_is_passed();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_is_passed ON user_quiz_attempts(is_passed);

-- Add comment to document the column
COMMENT ON COLUMN user_quiz_attempts.is_passed IS 'Whether the quiz attempt was passed (typically >= 50% score)';
