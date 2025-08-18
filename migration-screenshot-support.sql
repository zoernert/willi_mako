-- Migration: Add screenshot support to messages table
-- Date: 2025-08-18
-- Description: Extends the messages table to support screenshot attachments and analysis

-- Add screenshot support columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS has_screenshot BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS screenshot_analysis JSONB;

-- Create index for screenshot queries
CREATE INDEX IF NOT EXISTS idx_messages_has_screenshot ON messages(has_screenshot) WHERE has_screenshot = TRUE;
CREATE INDEX IF NOT EXISTS idx_messages_metadata ON messages USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_messages_screenshot_analysis ON messages USING GIN(screenshot_analysis);

-- Create uploads directory structure table for file management
CREATE TABLE IF NOT EXISTS file_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    upload_type TEXT NOT NULL DEFAULT 'screenshot',
    analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'completed', 'failed')),
    analysis_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for file_uploads
CREATE INDEX IF NOT EXISTS idx_file_uploads_chat_id ON file_uploads(chat_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_message_id ON file_uploads(message_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_upload_type ON file_uploads(upload_type);
CREATE INDEX IF NOT EXISTS idx_file_uploads_analysis_status ON file_uploads(analysis_status);
CREATE INDEX IF NOT EXISTS idx_file_uploads_created_at ON file_uploads(created_at);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_file_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_file_uploads_updated_at
    BEFORE UPDATE ON file_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_file_uploads_updated_at();

-- Add screenshot analysis configuration table
CREATE TABLE IF NOT EXISTS screenshot_analysis_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.7,
    schleupen_cs30_patterns JSONB,
    error_detection_patterns JSONB,
    ui_element_patterns JSONB,
    analysis_prompts JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default analysis configuration
INSERT INTO screenshot_analysis_config (name, description, confidence_threshold, schleupen_cs30_patterns, error_detection_patterns, ui_element_patterns, analysis_prompts)
VALUES (
    'default_analysis',
    'Default screenshot analysis configuration for Willi-Mako',
    0.7,
    '{"window_titles": ["Schleupen", "CS.30", "CS 30", "CS3.0"], "ui_elements": ["Stammdaten", "Vertragspartner", "Marktkommunikation", "BDEW"], "colors": ["#0066cc", "#003366"]}',
    '{"error_keywords": ["Fehler", "Error", "Exception", "Warnung", "Warning", "Kann nicht", "Cannot", "Failed", "Fehlgeschlagen"], "dialog_patterns": ["OK", "Abbrechen", "Cancel", "Retry", "Wiederholen"]}',
    '{"buttons": ["Speichern", "Save", "Löschen", "Delete", "Bearbeiten", "Edit"], "menus": ["Datei", "File", "Bearbeiten", "Edit", "Ansicht", "View"], "forms": ["Eingabe", "Input", "Auswahl", "Selection"]}',
    '{"main_prompt": "Analyze this screenshot systematically...", "schleupen_prompt": "This appears to be Schleupen CS 3.0 software...", "error_prompt": "Focus on identifying any error messages or problems..."}'
) ON CONFLICT (name) DO NOTHING;

-- Add user preferences for screenshot analysis
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS screenshot_analysis_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS auto_detect_schleupen BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS screenshot_confidence_threshold DECIMAL(3,2) DEFAULT 0.6;

-- Create view for messages with screenshot information
CREATE OR REPLACE VIEW messages_with_screenshots AS
SELECT 
    m.*,
    fu.filename as screenshot_filename,
    fu.file_path as screenshot_path,
    fu.file_size as screenshot_size,
    fu.analysis_result as detailed_analysis,
    fu.analysis_status
FROM messages m
LEFT JOIN file_uploads fu ON m.id = fu.message_id AND fu.upload_type = 'screenshot';

-- Update any existing messages to ensure metadata column is properly structured
UPDATE messages 
SET metadata = '{}'::jsonb 
WHERE metadata IS NULL;

-- Add comment for documentation
COMMENT ON TABLE file_uploads IS 'Stores information about uploaded files including screenshots and their analysis results';
COMMENT ON TABLE screenshot_analysis_config IS 'Configuration settings for screenshot analysis AI models and detection patterns';
COMMENT ON COLUMN messages.metadata IS 'JSON metadata including screenshot URLs and analysis results';
COMMENT ON COLUMN messages.has_screenshot IS 'Quick flag to identify messages with screenshots';
COMMENT ON COLUMN messages.screenshot_url IS 'Direct URL to screenshot file for quick access';
COMMENT ON COLUMN messages.screenshot_analysis IS 'Cached analysis results from AI vision processing';

-- Grant necessary permissions (adjust roles as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON file_uploads TO willi_mako_app;
-- GRANT SELECT, INSERT, UPDATE ON screenshot_analysis_config TO willi_mako_app;
-- GRANT SELECT ON messages_with_screenshots TO willi_mako_app;
