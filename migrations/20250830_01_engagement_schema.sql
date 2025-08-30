-- Engagement Emails and Feedback Schema
-- Date: 2025-08-30

BEGIN;

-- Ensure pgcrypto for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table to track engagement emails sent to users
CREATE TABLE IF NOT EXISTS engagement_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- e.g., 'layout_feedback', 'chat_feedback'
  chat_id UUID NULL REFERENCES chats(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  message_id TEXT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, type, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_emails_user ON engagement_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_emails_type ON engagement_emails(type);
CREATE INDEX IF NOT EXISTS idx_engagement_emails_chat ON engagement_emails(chat_id);

-- Table to capture feedback from email clicks
CREATE TABLE IF NOT EXISTS engagement_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'layout_feedback' or 'chat_feedback'
  chat_id UUID NULL REFERENCES chats(id) ON DELETE SET NULL,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  useful BOOLEAN NULL, -- optional for chat-specific feedback
  user_agent TEXT NULL,
  ip_address TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_feedback_user ON engagement_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_feedback_type ON engagement_feedback(type);
CREATE INDEX IF NOT EXISTS idx_engagement_feedback_chat ON engagement_feedback(chat_id);
CREATE INDEX IF NOT EXISTS idx_engagement_feedback_created ON engagement_feedback(created_at);

COMMIT;
