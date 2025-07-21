-- Workspace Schema Migration
-- Migration: 001_workspace_schema.sql
-- Date: 2025-07-18
-- Description: Adds workspace functionality tables for user documents, notes, and settings

-- Erweiterte user_documents Tabelle für persönliche Dokumente
CREATE TABLE IF NOT EXISTS user_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    file_path VARCHAR(500),
    file_size INTEGER,
    mime_type VARCHAR(100),
    original_name VARCHAR(255) NOT NULL,
    is_processed BOOLEAN DEFAULT false,
    is_ai_context_enabled BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    CONSTRAINT user_documents_user_id_idx UNIQUE (user_id, id)
);

-- Notizen-Tabelle für kontextbezogene Notizen
CREATE TABLE IF NOT EXISTS user_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500),
    content TEXT NOT NULL,
    source_type VARCHAR(50), -- 'chat', 'faq', 'document', 'manual'
    source_id UUID, -- Chat-ID, FAQ-ID, Document-ID
    source_context TEXT, -- Original text wo die Notiz erstellt wurde
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_source_type CHECK (source_type IN ('chat', 'faq', 'document', 'manual'))
);

-- Workspace-Einstellungen pro Benutzer
CREATE TABLE IF NOT EXISTS user_workspace_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    ai_context_enabled BOOLEAN DEFAULT false,
    auto_tag_enabled BOOLEAN DEFAULT true,
    storage_used_mb INTEGER DEFAULT 0,
    storage_limit_mb INTEGER DEFAULT 500,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document chunks table for vector storage references
CREATE TABLE IF NOT EXISTS user_document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES user_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    vector_id VARCHAR(255), -- Reference to vector in Qdrant
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure proper ordering
    CONSTRAINT unique_document_chunk UNIQUE (document_id, chunk_index)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_created_at ON user_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_documents_is_processed ON user_documents(is_processed);
CREATE INDEX IF NOT EXISTS idx_user_documents_ai_context ON user_documents(is_ai_context_enabled);
CREATE INDEX IF NOT EXISTS idx_user_documents_tags ON user_documents USING gin(tags);

CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_created_at ON user_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notes_source_type ON user_notes(source_type);
CREATE INDEX IF NOT EXISTS idx_user_notes_source_id ON user_notes(source_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_tags ON user_notes USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_user_notes_content_search ON user_notes USING gin(to_tsvector('english', content));

CREATE INDEX IF NOT EXISTS idx_user_workspace_settings_user_id ON user_workspace_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_user_document_chunks_document_id ON user_document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_user_document_chunks_vector_id ON user_document_chunks(vector_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_documents_updated_at 
    BEFORE UPDATE ON user_documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notes_updated_at 
    BEFORE UPDATE ON user_notes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_workspace_settings_updated_at 
    BEFORE UPDATE ON user_workspace_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update storage usage
CREATE OR REPLACE FUNCTION update_storage_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE user_workspace_settings 
        SET storage_used_mb = storage_used_mb - (OLD.file_size / 1024 / 1024)
        WHERE user_id = OLD.user_id;
        RETURN OLD;
    END IF;
    
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_workspace_settings (user_id, storage_used_mb)
        VALUES (NEW.user_id, NEW.file_size / 1024 / 1024)
        ON CONFLICT (user_id) 
        DO UPDATE SET storage_used_mb = user_workspace_settings.storage_used_mb + (NEW.file_size / 1024 / 1024);
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_storage_usage_trigger
    AFTER INSERT OR DELETE ON user_documents
    FOR EACH ROW EXECUTE FUNCTION update_storage_usage();

-- Initial data: Create default workspace settings for existing users
INSERT INTO user_workspace_settings (user_id, ai_context_enabled, auto_tag_enabled, storage_used_mb, storage_limit_mb)
SELECT id, false, true, 0, 500
FROM users
WHERE id NOT IN (SELECT user_id FROM user_workspace_settings WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;
