-- Enable Engagement Emails and set frontend URL in production
BEGIN;

-- Ensure system settings table exists and defaults are present (idempotent)
-- This will not overwrite existing keys due to ON CONFLICT DO NOTHING
-- But we still explicitly set the values we care about below

-- Make sure engagement tables exist (safe if already migrated)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create tables if not exist (no-op if they already exist)
CREATE TABLE IF NOT EXISTS engagement_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  chat_id UUID NULL REFERENCES chats(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  message_id TEXT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, type, chat_id)
);

CREATE TABLE IF NOT EXISTS engagement_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  chat_id UUID NULL REFERENCES chats(id) ON DELETE SET NULL,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  useful BOOLEAN NULL,
  user_agent TEXT NULL,
  ip_address TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_engagement_emails_user ON engagement_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_emails_type ON engagement_emails(type);
CREATE INDEX IF NOT EXISTS idx_engagement_emails_chat ON engagement_emails(chat_id);
CREATE INDEX IF NOT EXISTS idx_engagement_feedback_user ON engagement_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_feedback_type ON engagement_feedback(type);
CREATE INDEX IF NOT EXISTS idx_engagement_feedback_chat ON engagement_feedback(chat_id);
CREATE INDEX IF NOT EXISTS idx_engagement_feedback_created ON engagement_feedback(created_at);

-- Upsert settings we need in production
INSERT INTO system_settings (key, value, value_type, category, updated_by)
VALUES ('engagement.enabled', 'true', 'boolean', 'engagement', 'automation')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, value_type = EXCLUDED.value_type, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP;

INSERT INTO system_settings (key, value, value_type, category, updated_by)
VALUES ('system.frontend_url', 'https://stromhaltig.de', 'string', 'general', 'automation')
ON CONFLICT (key) DO NOTHING;

-- Ensure email notifications are enabled
INSERT INTO system_settings (key, value, value_type, category, updated_by)
VALUES ('email.notifications_enabled', 'true', 'boolean', 'email', 'automation')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, value_type = EXCLUDED.value_type, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP;

COMMIT;
