-- 
-- This migration adds a table to store user preferences for the Flip Mode (clarification) feature.
-- This allows the system to remember a user's typical context and apply it automatically.
--

CREATE TABLE user_flip_mode_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Corresponds to the 'energy_type' question
    energy_type VARCHAR(255),

    -- Corresponds to the 'stakeholder_perspective' question
    stakeholder_perspective VARCHAR(255),

    -- Corresponds to the 'context_specificity' question
    context_specificity VARCHAR(255),

    -- Corresponds to the 'detail_level' question
    detail_level VARCHAR(255),

    -- Corresponds to the 'topic_focus' question
    topic_focus VARCHAR(255),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to automatically update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON user_flip_mode_preferences
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Add comments to explain the purpose of each column
COMMENT ON TABLE user_flip_mode_preferences IS 'Stores default answers for the Flip Mode clarification questions to personalize user experience.';
COMMENT ON COLUMN user_flip_mode_preferences.user_id IS 'Foreign key to the users table.';
COMMENT ON COLUMN user_flip_mode_preferences.energy_type IS 'Default answer for the energy type question (e.g., Strom, Gas).';
COMMENT ON COLUMN user_flip_mode_preferences.stakeholder_perspective IS 'Default answer for the stakeholder perspective question (e.g., Netzbetreiber).';
COMMENT ON COLUMN user_flip_mode_preferences.context_specificity IS 'Default answer for the application context question (e.g., Geschäftsprozesse).';
COMMENT ON COLUMN user_flip_mode_preferences.detail_level IS 'Default answer for the detail level question (e.g., Detaillierte Erklärung).';
COMMENT ON COLUMN user_flip_mode_preferences.topic_focus IS 'Default answer for the topic focus question (e.g., Prozesse und Abläufe).';

