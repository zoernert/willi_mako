-- Migration: Add source_thread_id to faqs table for community integration
-- CR-COMMUNITY-HUB-001 - Meilenstein 2
-- Autor: AI Assistant
-- Datum: 2025-08-09

-- Add optional link from FAQ back to community thread
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS source_thread_id UUID REFERENCES community_threads(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_faqs_source_thread ON faqs(source_thread_id);

-- Add source field for tracking FAQ origin (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'faqs' AND column_name = 'source') THEN
        ALTER TABLE faqs ADD COLUMN source VARCHAR(50) DEFAULT 'manual';
    END IF;
END $$;

-- Update existing FAQs to have manual source if null
UPDATE faqs SET source = 'manual' WHERE source IS NULL;

-- Add constraint for source values
ALTER TABLE faqs DROP CONSTRAINT IF EXISTS check_source;
ALTER TABLE faqs ADD CONSTRAINT check_source 
    CHECK (source IN ('manual', 'community', 'import', 'system'));

-- Add comments for documentation
COMMENT ON COLUMN faqs.source_thread_id IS 'Reference to community thread if FAQ was created from community collaboration';
COMMENT ON COLUMN faqs.source IS 'Origin of the FAQ: manual, community, import, system';
