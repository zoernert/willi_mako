-- Migration: Add iteration tracking fields to chat_test_sessions table
-- Description: Adds fields for detailed iteration tracking and QDrant vector search results

ALTER TABLE chat_test_sessions 
ADD COLUMN IF NOT EXISTS iterations JSONB,
ADD COLUMN IF NOT EXISTS iteration_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS final_confidence DECIMAL(3,2) DEFAULT 0.80;

-- Update existing records to have default values
UPDATE chat_test_sessions 
SET 
    iterations = '[]'::jsonb,
    iteration_count = 1,
    final_confidence = 0.80
WHERE iterations IS NULL;

-- Add index for better performance on iteration queries
CREATE INDEX IF NOT EXISTS idx_chat_test_sessions_iteration_count ON chat_test_sessions (iteration_count);
CREATE INDEX IF NOT EXISTS idx_chat_test_sessions_final_confidence ON chat_test_sessions (final_confidence);

-- Comment on new columns
COMMENT ON COLUMN chat_test_sessions.iterations IS 'Detailed JSON data for each processing iteration including QDrant vector search results';
COMMENT ON COLUMN chat_test_sessions.iteration_count IS 'Total number of iterations performed during test execution';
COMMENT ON COLUMN chat_test_sessions.final_confidence IS 'Final confidence score of the generated response (0.00-1.00)';
