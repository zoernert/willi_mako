-- Migration: Add iteration tracking fields to chat_test_sessions
-- Date: 2025-01-27
-- Description: Adds fields for detailed iteration tracking and confidence scoring

-- Add new columns for iteration support
ALTER TABLE chat_test_sessions 
ADD COLUMN iterations JSONB,
ADD COLUMN iteration_count INTEGER DEFAULT 1,
ADD COLUMN final_confidence DECIMAL(3,2) DEFAULT 0.80;

-- Add index for performance on iteration queries
CREATE INDEX idx_chat_test_sessions_iterations ON chat_test_sessions USING GIN (iterations);
CREATE INDEX idx_chat_test_sessions_iteration_count ON chat_test_sessions (iteration_count);
CREATE INDEX idx_chat_test_sessions_final_confidence ON chat_test_sessions (final_confidence);

-- Add constraint to ensure final_confidence is between 0 and 1
ALTER TABLE chat_test_sessions 
ADD CONSTRAINT chk_final_confidence CHECK (final_confidence >= 0.0 AND final_confidence <= 1.0);

-- Comment on new columns
COMMENT ON COLUMN chat_test_sessions.iterations IS 'Detailed iteration tracking with per-step results and QDrant vector search details';
COMMENT ON COLUMN chat_test_sessions.iteration_count IS 'Number of iterations performed during test execution';
COMMENT ON COLUMN chat_test_sessions.final_confidence IS 'Final confidence score (0-1) after all iterations completed';

-- Update existing rows to have default values
UPDATE chat_test_sessions 
SET iteration_count = 1, final_confidence = 0.80 
WHERE iteration_count IS NULL OR final_confidence IS NULL;
