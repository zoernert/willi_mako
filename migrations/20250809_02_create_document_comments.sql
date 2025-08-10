-- Migration: Create document_comments table
-- CR-COMMUNITY-HUB-001 - Meilenstein 1
-- Autor: AI Assistant
-- Datum: 2025-08-09

CREATE TABLE IF NOT EXISTS document_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES community_threads(id) ON DELETE CASCADE,
    block_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_comments_thread ON document_comments(thread_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_block ON document_comments(block_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_created_at ON document_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_comments_user ON document_comments(created_by_user_id);

-- Add constraints
ALTER TABLE document_comments ADD CONSTRAINT check_content_not_empty 
    CHECK (LENGTH(TRIM(content)) > 0);

ALTER TABLE document_comments ADD CONSTRAINT check_block_id_not_empty 
    CHECK (LENGTH(TRIM(block_id)) > 0);

-- Add comments for documentation
COMMENT ON TABLE document_comments IS 'Comments on specific blocks/sections within community thread documents';
COMMENT ON COLUMN document_comments.block_id IS 'ID of the block/section in the JSONB document (e.g., problem_description, proposal_123)';
COMMENT ON COLUMN document_comments.content IS 'The comment text content';
