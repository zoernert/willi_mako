-- Migration: Create community_threads table
-- CR-COMMUNITY-HUB-001 - Meilenstein 1
-- Autor: AI Assistant
-- Datum: 2025-08-09

CREATE TABLE IF NOT EXISTS community_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    document_content JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'discussing',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_threads_status ON community_threads(status);
CREATE INDEX IF NOT EXISTS idx_community_threads_created_at ON community_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_threads_tags_gin ON community_threads USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_community_threads_created_by ON community_threads(created_by_user_id);

-- Add constraints for status values
ALTER TABLE community_threads ADD CONSTRAINT check_status 
    CHECK (status IN ('discussing', 'review', 'final'));

-- Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_community_threads_updated_at 
    BEFORE UPDATE ON community_threads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE community_threads IS 'Community collaboration threads with living documents';
COMMENT ON COLUMN community_threads.document_content IS 'JSONB structure containing problem, context, solutions, etc.';
COMMENT ON COLUMN community_threads.status IS 'Current status: discussing, review, final';
COMMENT ON COLUMN community_threads.tags IS 'Array of tags for categorization (e.g., UTILMD, INVOIC)';
