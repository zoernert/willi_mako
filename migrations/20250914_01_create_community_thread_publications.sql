-- Migration: Create community_thread_publications table
-- CR-COMMUNITY-HUB-001 - Public Read-Only Snapshots
-- Autor: AI Assistant
-- Datum: 2025-09-14

CREATE TABLE IF NOT EXISTS community_thread_publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES community_threads(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT DEFAULT '' NOT NULL,
    published_content JSONB NOT NULL,
    source_thread_updated_at TIMESTAMPTZ NOT NULL,
    published_by_user_id UUID NOT NULL REFERENCES users(id),
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_public BOOLEAN NOT NULL DEFAULT TRUE
);

-- Ensure quick lookups and uniqueness of public path
CREATE UNIQUE INDEX IF NOT EXISTS ux_community_thread_publications_slug ON community_thread_publications(slug);
CREATE INDEX IF NOT EXISTS idx_community_thread_publications_thread ON community_thread_publications(thread_id);
CREATE INDEX IF NOT EXISTS idx_community_thread_publications_published_at ON community_thread_publications(published_at DESC);

COMMENT ON TABLE community_thread_publications IS 'Published read-only snapshots of community threads for public display';
COMMENT ON COLUMN community_thread_publications.published_content IS 'Frozen, curated JSON payload rendered publicly';
