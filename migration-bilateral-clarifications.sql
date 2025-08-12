-- PostgreSQL Schema Extension für Bilaterale Klärfälle
-- Migration: bilateral_clarifications
-- Erstellt: 12. August 2025
-- Beschreibung: Implementierung der Datenbank-Struktur für bilaterale Klärfälle

-- Haupttabelle für bilaterale Klärfälle
CREATE TABLE bilateral_clarifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    market_partner_code VARCHAR(20) NOT NULL,
    market_partner_name VARCHAR(255),
    case_type VARCHAR(50) NOT NULL CHECK (case_type IN ('B2B', 'GENERAL', 'TECHNICAL', 'BILLING')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')) DEFAULT 'OPEN',
    priority VARCHAR(20) CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'MEDIUM',
    created_by UUID NOT NULL, -- REFERENCES users(id) - assuming users table exists
    assigned_to UUID, -- REFERENCES users(id)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    resolution_date TIMESTAMP,
    resolution_notes TEXT,
    tags TEXT[] DEFAULT '{}',
    shared_with_team BOOLEAN DEFAULT FALSE,
    team_id UUID, -- REFERENCES teams(id) - assuming teams table exists
    external_case_id VARCHAR(100),
    source_system VARCHAR(50) DEFAULT 'MANUAL',
    
    -- Audit fields
    version INTEGER DEFAULT 1,
    last_modified_by UUID,
    archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP
);

-- Tabelle für Anhänge/Attachments
CREATE TABLE clarification_attachments (
    id SERIAL PRIMARY KEY,
    clarification_id INTEGER NOT NULL REFERENCES bilateral_clarifications(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by UUID NOT NULL, -- REFERENCES users(id)
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Kategorisierung für bessere Organisation
    attachment_type VARCHAR(50) DEFAULT 'DOCUMENT' CHECK (attachment_type IN ('DOCUMENT', 'EDIFACT', 'EMAIL', 'IMAGE', 'OTHER')),
    attachment_category VARCHAR(50) DEFAULT 'GENERAL' CHECK (attachment_category IN ('GENERAL', 'URSPRUNG', 'FEHLER', 'KORREKTUR', 'KOMMUNIKATION')),
    
    -- Metadaten
    description TEXT,
    is_sensitive BOOLEAN DEFAULT FALSE,
    
    -- Audit
    archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP
);

-- Tabelle für Notizen
CREATE TABLE clarification_notes (
    id SERIAL PRIMARY KEY,
    clarification_id INTEGER NOT NULL REFERENCES bilateral_clarifications(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'USER' CHECK (note_type IN ('USER', 'SYSTEM', 'AI_SUGGESTION', 'STATUS_CHANGE', 'COMMUNICATION')),
    created_by UUID NOT NULL, -- REFERENCES users(id)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_internal BOOLEAN DEFAULT FALSE,
    
    -- Verknüpfungen
    linked_attachment_id INTEGER REFERENCES clarification_attachments(id),
    linked_email_id INTEGER, -- Forward reference to clarification_emails
    
    -- Metadaten
    tags TEXT[] DEFAULT '{}',
    is_pinned BOOLEAN DEFAULT FALSE,
    
    -- Audit
    archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP
);

-- Tabelle für Team-Kommentare
CREATE TABLE clarification_team_comments (
    id SERIAL PRIMARY KEY,
    clarification_id INTEGER NOT NULL REFERENCES bilateral_clarifications(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID NOT NULL, -- REFERENCES users(id)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parent_comment_id INTEGER REFERENCES clarification_team_comments(id),
    
    -- Team-Funktionalität
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID, -- REFERENCES users(id)
    resolved_at TIMESTAMP,
    
    -- Mentions und Reactions
    mentioned_users UUID[] DEFAULT '{}',
    reactions JSONB DEFAULT '{}', -- Format: {"emoji": [user_ids]}
    
    -- Audit
    archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP
);

-- Tabelle für Email-Records
CREATE TABLE clarification_emails (
    id SERIAL PRIMARY KEY,
    clarification_id INTEGER NOT NULL REFERENCES bilateral_clarifications(id) ON DELETE CASCADE,
    
    -- Email-Metadaten
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('INCOMING', 'OUTGOING')),
    subject VARCHAR(500),
    from_address VARCHAR(255),
    to_addresses TEXT[] DEFAULT '{}',
    cc_addresses TEXT[] DEFAULT '{}',
    bcc_addresses TEXT[] DEFAULT '{}',
    message_id VARCHAR(255), -- RFC Message-ID
    in_reply_to VARCHAR(255), -- RFC In-Reply-To
    
    -- Content
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text' CHECK (content_type IN ('text', 'html', 'mixed')),
    
    -- Parsing
    parsed_headers JSONB DEFAULT '{}',
    attachment_count INTEGER DEFAULT 0,
    
    -- Verarbeitung
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    added_by UUID NOT NULL, -- REFERENCES users(id)
    source VARCHAR(50) DEFAULT 'MANUAL_PASTE' CHECK (source IN ('MANUAL_PASTE', 'FORWARD', 'IMPORT', 'API')),
    
    -- Kategorisierung
    email_type VARCHAR(50) DEFAULT 'OTHER' CHECK (email_type IN ('CLARIFICATION_REQUEST', 'RESPONSE', 'ESCALATION', 'NOTIFICATION', 'INTERNAL', 'OTHER')),
    
    -- Metadaten
    is_important BOOLEAN DEFAULT FALSE,
    
    -- Audit
    archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP
);

-- Tabelle für Team-Aktivitäten (für besseres Audit Trail)
CREATE TABLE clarification_team_activities (
    id SERIAL PRIMARY KEY,
    clarification_id INTEGER NOT NULL REFERENCES bilateral_clarifications(id) ON DELETE CASCADE,
    team_id UUID NOT NULL, -- REFERENCES teams(id)
    user_id UUID NOT NULL, -- REFERENCES users(id)
    
    -- Activity-Details
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('SHARED', 'UNSHARED', 'COMMENTED', 'VIEWED', 'HELPED', 'STATUS_CHANGED', 'ASSIGNED')),
    description TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadaten
    metadata JSONB DEFAULT '{}', -- Flexible JSON for activity-specific data
    
    -- Audit
    archived BOOLEAN DEFAULT FALSE
);

-- Indizes für Performance-Optimierung
CREATE INDEX idx_bilateral_clarifications_status ON bilateral_clarifications(status);
CREATE INDEX idx_bilateral_clarifications_created_by ON bilateral_clarifications(created_by);
CREATE INDEX idx_bilateral_clarifications_assigned_to ON bilateral_clarifications(assigned_to);
CREATE INDEX idx_bilateral_clarifications_market_partner ON bilateral_clarifications(market_partner_code);
CREATE INDEX idx_bilateral_clarifications_team_shared ON bilateral_clarifications(shared_with_team, team_id);
CREATE INDEX idx_bilateral_clarifications_created_at ON bilateral_clarifications(created_at DESC);
CREATE INDEX idx_bilateral_clarifications_due_date ON bilateral_clarifications(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_bilateral_clarifications_priority_status ON bilateral_clarifications(priority, status);

CREATE INDEX idx_clarification_attachments_clarification_id ON clarification_attachments(clarification_id);
CREATE INDEX idx_clarification_attachments_uploaded_by ON clarification_attachments(uploaded_by);
CREATE INDEX idx_clarification_attachments_type ON clarification_attachments(attachment_type);

CREATE INDEX idx_clarification_notes_clarification_id ON clarification_notes(clarification_id);
CREATE INDEX idx_clarification_notes_created_by ON clarification_notes(created_by);
CREATE INDEX idx_clarification_notes_created_at ON clarification_notes(created_at DESC);
CREATE INDEX idx_clarification_notes_type ON clarification_notes(note_type);

CREATE INDEX idx_clarification_team_comments_clarification_id ON clarification_team_comments(clarification_id);
CREATE INDEX idx_clarification_team_comments_created_by ON clarification_team_comments(created_by);
CREATE INDEX idx_clarification_team_comments_parent ON clarification_team_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

CREATE INDEX idx_clarification_emails_clarification_id ON clarification_emails(clarification_id);
CREATE INDEX idx_clarification_emails_direction ON clarification_emails(direction);
CREATE INDEX idx_clarification_emails_added_at ON clarification_emails(added_at DESC);

CREATE INDEX idx_clarification_team_activities_clarification_id ON clarification_team_activities(clarification_id);
CREATE INDEX idx_clarification_team_activities_team_id ON clarification_team_activities(team_id);
CREATE INDEX idx_clarification_team_activities_user_id ON clarification_team_activities(user_id);
CREATE INDEX idx_clarification_team_activities_timestamp ON clarification_team_activities(timestamp DESC);

-- Trigger für automatische Aktualisierung von updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bilateral_clarifications_updated_at BEFORE UPDATE
    ON bilateral_clarifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clarification_notes_updated_at BEFORE UPDATE
    ON clarification_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clarification_team_comments_updated_at BEFORE UPDATE
    ON clarification_team_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Beispiel-Daten für Entwicklung (optional)
-- INSERT INTO bilateral_clarifications (title, description, market_partner_code, market_partner_name, case_type, created_by, team_id) 
-- VALUES ('Test Klärfall', 'Beispiel-Beschreibung für einen Klärfall', 'MP001', 'Musterfirma GmbH', 'B2B', 'user-uuid-here', 'team-uuid-here');

-- Validierungs-Query für die Migration
-- SELECT table_name, column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name LIKE 'clarification%' OR table_name = 'bilateral_clarifications'
-- ORDER BY table_name, ordinal_position;
