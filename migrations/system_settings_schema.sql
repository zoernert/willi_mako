-- System Settings Schema
-- Description: Adds system-wide configuration settings table for admin controls
-- Author: System
-- Date: 2025-01-25

BEGIN;

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    value_type VARCHAR(50) DEFAULT 'string' CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    category VARCHAR(100) DEFAULT 'general',
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON system_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_system_settings_updated_at();

-- Insert default SMTP settings
INSERT INTO system_settings (key, value, value_type, description, category) VALUES
('smtp.host', '', 'string', 'SMTP Server Host', 'email'),
('smtp.port', '587', 'number', 'SMTP Server Port', 'email'),
('smtp.secure', 'false', 'boolean', 'Use TLS/SSL for SMTP', 'email'),
('smtp.user', '', 'string', 'SMTP Authentication Username', 'email'),
('smtp.password', '', 'string', 'SMTP Authentication Password', 'email'),
('smtp.from_email', 'noreply@willi-mako.com', 'string', 'Default sender email address', 'email'),
('smtp.from_name', 'Willi Mako', 'string', 'Default sender name', 'email'),
('email.notifications_enabled', 'true', 'boolean', 'Enable email notifications system-wide', 'email'),

-- System configuration
('system.name', 'Willi Mako', 'string', 'System name displayed in UI', 'general'),
('system.description', 'Intelligentes FAQ-System mit KI-Unterstützung', 'string', 'System description', 'general'),
('system.frontend_url', 'https://stromhaltig.de', 'string', 'Frontend base URL for links in emails', 'general'),

-- File upload settings  
('upload.max_file_size_mb', '50', 'number', 'Maximum file size for uploads in MB', 'upload'),
('upload.allowed_types', '["pdf","doc","docx","txt","md"]', 'json', 'Allowed file types for upload', 'upload'),

-- Security settings
('security.enable_registration', 'true', 'boolean', 'Allow new user registration', 'security'),
('security.enable_guest_access', 'false', 'boolean', 'Allow guest access without login', 'security'),
('security.jwt_expiry_hours', '24', 'number', 'JWT token expiry time in hours', 'security'),

-- Team settings
('teams.max_members_per_team', '50', 'number', 'Maximum members allowed per team', 'teams'),
('teams.invitation_expiry_days', '7', 'number', 'Team invitation expiry time in days', 'teams'),
('teams.auto_create_accounts', 'true', 'boolean', 'Auto-create accounts for team invitations', 'teams')

ON CONFLICT (key) DO NOTHING;

COMMIT;
