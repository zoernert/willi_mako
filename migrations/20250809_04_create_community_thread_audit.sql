-- Migration: Create community_thread_audit table for tracking changes
-- CR-COMMUNITY-HUB-001 - Security & Audit
-- Autor: AI Assistant
-- Datum: 2025-08-09

CREATE TABLE IF NOT EXISTS community_thread_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES community_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    ops_json JSONB NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance and audit queries
CREATE INDEX IF NOT EXISTS idx_community_thread_audit_thread ON community_thread_audit(thread_id);
CREATE INDEX IF NOT EXISTS idx_community_thread_audit_user ON community_thread_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_community_thread_audit_created_at ON community_thread_audit(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE community_thread_audit IS 'Audit log for all changes to community threads';
COMMENT ON COLUMN community_thread_audit.ops_json IS 'JSON patch operations that were applied';
COMMENT ON COLUMN community_thread_audit.ip_address IS 'IP address of the user making the change';
COMMENT ON COLUMN community_thread_audit.user_agent IS 'User agent string for forensic analysis';
