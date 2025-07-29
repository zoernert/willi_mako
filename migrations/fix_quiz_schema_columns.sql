-- Fix Quiz Schema Columns Migration
-- Created: 2025-07-29
-- Fixes missing columns in quiz-related tables

-- Add completed_at column to user_quiz_attempts (keeping end_time for compatibility)
ALTER TABLE user_quiz_attempts 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Update completed_at with end_time value for existing records where quiz is completed
UPDATE user_quiz_attempts 
SET completed_at = end_time 
WHERE is_completed = true AND completed_at IS NULL AND end_time IS NOT NULL;

-- Add correct_answers JSONB column to quiz_questions (keeping correct_answer_index for compatibility)
ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS correct_answers JSONB;

-- Migrate existing correct_answer_index to correct_answers format
UPDATE quiz_questions 
SET correct_answers = JSONB_BUILD_ARRAY(correct_answer_index)
WHERE correct_answers IS NULL AND correct_answer_index IS NOT NULL;

-- Add topic column to quiz_questions (aliasing topic_area for backward compatibility)
ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS topic VARCHAR(100);

-- Update topic with topic_area value for existing records
UPDATE quiz_questions 
SET topic = (
    SELECT q.topic_area 
    FROM quizzes q 
    WHERE q.id = quiz_questions.quiz_id
) 
WHERE topic IS NULL;

-- Create trigger to automatically set completed_at when is_completed is set to true
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    -- If is_completed is being set to true and completed_at is null, set it to current time
    IF NEW.is_completed = true AND OLD.is_completed = false AND NEW.completed_at IS NULL THEN
        NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;
    
    -- If end_time is being set and completed_at is null, set completed_at to end_time
    IF NEW.end_time IS NOT NULL AND OLD.end_time IS NULL AND NEW.completed_at IS NULL THEN
        NEW.completed_at = NEW.end_time;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_quiz_attempts
DROP TRIGGER IF EXISTS set_completed_at_trigger ON user_quiz_attempts;
CREATE TRIGGER set_completed_at_trigger 
    BEFORE UPDATE ON user_quiz_attempts 
    FOR EACH ROW 
    EXECUTE FUNCTION set_completed_at();

-- Create trigger to automatically set topic from parent quiz when inserting quiz_questions
CREATE OR REPLACE FUNCTION set_question_topic()
RETURNS TRIGGER AS $$
BEGIN
    -- If topic is null, get it from the parent quiz
    IF NEW.topic IS NULL THEN
        SELECT topic_area INTO NEW.topic
        FROM quizzes 
        WHERE id = NEW.quiz_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for quiz_questions
DROP TRIGGER IF EXISTS set_question_topic_trigger ON quiz_questions;
CREATE TRIGGER set_question_topic_trigger 
    BEFORE INSERT ON quiz_questions 
    FOR EACH ROW 
    EXECUTE FUNCTION set_question_topic();

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_completed_at ON user_quiz_attempts(completed_at);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_topic ON quiz_questions(topic);

-- Add comments to document the columns
COMMENT ON COLUMN user_quiz_attempts.completed_at IS 'Timestamp when the quiz attempt was completed (auto-set when is_completed=true)';
COMMENT ON COLUMN quiz_questions.correct_answers IS 'JSONB array of correct answer indices, supports multiple correct answers';
COMMENT ON COLUMN quiz_questions.topic IS 'Topic area for the question (inherited from parent quiz)';
