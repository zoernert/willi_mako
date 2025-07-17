-- Migration to add user profiling feature
-- This script adds the user_profile field to the users table

-- Add user_profile column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_profile JSONB DEFAULT '{}';

-- Add index for user_profile field for better performance
CREATE INDEX IF NOT EXISTS idx_users_user_profile ON users USING GIN(user_profile);

-- Update the trigger to include user_profile in the updated_at trigger
-- (already exists, no change needed)

-- Example structure for user_profile JSON field:
-- {
--   "expertise_level": "beginner|intermediate|advanced",
--   "communication_style": "formal|casual|technical",
--   "preferred_terminology": ["Begriff1", "Begriff2"],
--   "knowledge_areas": ["Marktkommunikation", "Bilanzierung", "Regulierung"],
--   "company_type": "Stadtwerke|Netzbetreiber|Energieversorger",
--   "experience_topics": ["Topic1", "Topic2"],
--   "learning_progress": {
--     "completed_topics": ["Topic1"],
--     "current_focus": "Topic2"
--   },
--   "interaction_patterns": {
--     "question_types": ["detailed", "overview", "practical"],
--     "response_preferences": ["examples", "step-by-step", "theory"]
--   },
--   "last_updated": "2025-01-17T10:00:00Z"
-- }

-- Add comment to the column
COMMENT ON COLUMN users.user_profile IS 'JSON field containing learned user preferences, expertise level, communication style, and knowledge areas';

-- Update the example users with basic profile information
UPDATE users 
SET user_profile = '{
  "expertise_level": "intermediate",
  "communication_style": "professional",
  "preferred_terminology": [],
  "knowledge_areas": [],
  "company_type": "",
  "experience_topics": [],
  "learning_progress": {
    "completed_topics": [],
    "current_focus": ""
  },
  "interaction_patterns": {
    "question_types": [],
    "response_preferences": []
  },
  "last_updated": "' || NOW()::text || '"
}'
WHERE user_profile = '{}' OR user_profile IS NULL;

-- Analyze the updated table
ANALYZE users;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'User profile feature successfully added to database!';
    RAISE NOTICE 'Added user_profile JSONB column to users table';
    RAISE NOTICE 'Added GIN index for better JSON queries';
    RAISE NOTICE 'Updated existing users with default profile structure';
END
$$;
