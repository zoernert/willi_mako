-- Fix correct_answers to use indices instead of text
-- Created: 2025-07-30
-- Converts correct_answers from answer text to answer indices

-- Function to find the index of an answer text in the answer_options array
CREATE OR REPLACE FUNCTION find_answer_index(answer_options JSONB, correct_answer TEXT)
RETURNS INTEGER AS $$
DECLARE
    i INTEGER;
    option TEXT;
BEGIN
    -- Loop through answer_options array to find the matching text
    FOR i IN 0..(jsonb_array_length(answer_options) - 1) LOOP
        option := answer_options->>i;
        -- Remove extra whitespace and normalize for comparison
        IF TRIM(option) = TRIM(correct_answer) THEN
            RETURN i;
        END IF;
    END LOOP;
    
    -- If no exact match found, return -1 or first option as fallback
    RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Update correct_answers to use indices
UPDATE quiz_questions 
SET correct_answers = (
    SELECT jsonb_agg(find_answer_index(answer_options, correct_text))
    FROM (
        SELECT jsonb_array_elements_text(correct_answers) as correct_text
    ) as correct_texts
)
WHERE correct_answers IS NOT NULL 
AND jsonb_typeof(correct_answers) = 'array'
AND jsonb_array_length(correct_answers) > 0;

-- Drop the helper function
DROP FUNCTION find_answer_index(JSONB, TEXT);

-- Verify the changes
SELECT 
    id,
    left(question_text, 50) as question_preview,
    correct_answers,
    jsonb_array_length(answer_options) as option_count
FROM quiz_questions 
WHERE correct_answers IS NOT NULL
LIMIT 5;
