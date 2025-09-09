-- Migration: Add per-user Gemini API key storage and policy flag
-- Date: 2025-09-08

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gemini_api_key_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS gemini_key_status VARCHAR(16) DEFAULT 'unknown', -- 'unknown' | 'valid' | 'invalid'
  ADD COLUMN IF NOT EXISTS gemini_key_set_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS gemini_key_last_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS system_ai_key_access BOOLEAN DEFAULT TRUE;

-- Helpful index for admin listing/filtering
CREATE INDEX IF NOT EXISTS idx_users_gemini_key_status ON users(gemini_key_status);
