-- Migration für CR-WMAKO-001: Optimierung bilateraler Klärfall-Workflows
-- Erstellt: 15. August 2025

-- 1. Team E-Mail-Konfiguration erweitern
ALTER TABLE teams ADD COLUMN IF NOT EXISTS outbound_email_address VARCHAR(255);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS imap_config JSONB;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS email_processing_enabled BOOLEAN DEFAULT false;

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_teams_email_processing ON teams(email_processing_enabled) WHERE email_processing_enabled = true;

-- 2. Bilateral Clarifications für neue Features erweitern
ALTER TABLE bilateral_clarifications ADD COLUMN IF NOT EXISTS clarification_type VARCHAR(50) DEFAULT 'SINGLE';
ALTER TABLE bilateral_clarifications ADD COLUMN IF NOT EXISTS bulk_items JSONB;
ALTER TABLE bilateral_clarifications ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT false;
ALTER TABLE bilateral_clarifications ADD COLUMN IF NOT EXISTS source_email_id VARCHAR(255);
ALTER TABLE bilateral_clarifications ADD COLUMN IF NOT EXISTS extracted_data JSONB;

-- Indices für neue Felder
CREATE INDEX IF NOT EXISTS idx_clarifications_type ON bilateral_clarifications(clarification_type);
CREATE INDEX IF NOT EXISTS idx_clarifications_auto_created ON bilateral_clarifications(auto_created);
CREATE INDEX IF NOT EXISTS idx_clarifications_source_email ON bilateral_clarifications(source_email_id);

-- 3. Neue Tabelle für E-Mail-Verarbeitung
CREATE TABLE IF NOT EXISTS email_processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id),
    email_uid VARCHAR(255) NOT NULL,
    email_subject TEXT,
    email_from VARCHAR(255),
    email_body TEXT,
    email_date TIMESTAMP,
    processing_status VARCHAR(50) DEFAULT 'PENDING',
    processing_attempts INTEGER DEFAULT 0,
    created_clarification_id UUID REFERENCES bilateral_clarifications(id),
    extracted_references JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    
    UNIQUE(team_id, email_uid)
);

-- Indices für E-Mail-Queue
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_processing_queue(processing_status);
CREATE INDEX IF NOT EXISTS idx_email_queue_team ON email_processing_queue(team_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON email_processing_queue(created_at);

-- 4. Tabelle für LLM-Datenextraktion Cache
CREATE TABLE IF NOT EXISTS llm_extraction_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_hash VARCHAR(64) NOT NULL UNIQUE,
    content_type VARCHAR(50) NOT NULL,
    extracted_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2),
    extraction_model VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- Index für Cache-Lookup
CREATE INDEX IF NOT EXISTS idx_llm_cache_hash ON llm_extraction_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_llm_cache_expires ON llm_extraction_cache(expires_at);

-- 5. Erweiterte Team-Aktivitäten für automatische Prozesse
INSERT INTO clarification_activity_types (type, description) VALUES 
('AUTO_CREATED', 'Automatisch aus E-Mail erstellt'),
('DATA_EXTRACTED', 'Daten automatisch extrahiert'),
('BULK_PROCESSED', 'Als Teil einer Sammelbearbeitung verarbeitet')
ON CONFLICT (type) DO NOTHING;

-- 6. Team-Konfiguration für E-Mail-Verarbeitung
CREATE TABLE IF NOT EXISTS team_email_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) UNIQUE,
    imap_host VARCHAR(255),
    imap_port INTEGER DEFAULT 993,
    imap_username VARCHAR(255),
    imap_password_encrypted TEXT,
    imap_use_ssl BOOLEAN DEFAULT true,
    imap_folder VARCHAR(100) DEFAULT 'INBOX',
    outbound_email_address VARCHAR(255),
    smtp_host VARCHAR(255),
    smtp_port INTEGER DEFAULT 587,
    smtp_username VARCHAR(255),
    smtp_password_encrypted TEXT,
    smtp_use_tls BOOLEAN DEFAULT true,
    auto_processing_enabled BOOLEAN DEFAULT false,
    processing_rules JSONB,
    last_processed_uid VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_team_email_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_team_email_configs_updated_at
    BEFORE UPDATE ON team_email_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_team_email_configs_updated_at();

-- 7. Sammelklärung-Unterobjekte
CREATE TABLE IF NOT EXISTS bulk_clarification_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clarification_id UUID NOT NULL REFERENCES bilateral_clarifications(id),
    item_type VARCHAR(50) NOT NULL, -- 'MALO_ID', 'DAR_NUMBER', 'CONTRACT_NUMBER'
    item_value VARCHAR(255) NOT NULL,
    item_status VARCHAR(50) DEFAULT 'OPEN',
    assigned_to UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices für Bulk-Items
CREATE INDEX IF NOT EXISTS idx_bulk_items_clarification ON bulk_clarification_items(clarification_id);
CREATE INDEX IF NOT EXISTS idx_bulk_items_status ON bulk_clarification_items(item_status);
CREATE INDEX IF NOT EXISTS idx_bulk_items_type ON bulk_clarification_items(item_type);

-- Trigger für updated_at
CREATE TRIGGER trigger_bulk_items_updated_at
    BEFORE UPDATE ON bulk_clarification_items
    FOR EACH ROW
    EXECUTE FUNCTION update_team_email_configs_updated_at();

-- 8. Erweiterte Berechtigungen für neue Features
INSERT INTO role_permissions (role, permission, resource) VALUES 
('admin', 'manage', 'team_email_config'),
('team_lead', 'configure', 'team_email_config'),
('team_lead', 'view', 'team_email_config'),
('user', 'create', 'bulk_clarification'),
('user', 'manage', 'bulk_clarification_items')
ON CONFLICT (role, permission, resource) DO NOTHING;

-- 9. Beispiel-Konfiguration für Teams (optional)
-- Uncomment für Demo-Daten
/*
INSERT INTO team_email_configs (team_id, outbound_email_address, auto_processing_enabled, processing_rules) 
SELECT 
    id,
    CONCAT('klarfall-', LOWER(REPLACE(name, ' ', '-')), '@marktkommunikation.de'),
    false,
    '{"keywords": ["DAR", "MaLo", "Vertrag"], "min_confidence": 0.7}'::jsonb
FROM teams 
WHERE NOT EXISTS (SELECT 1 FROM team_email_configs WHERE team_id = teams.id);
*/

-- 10. Cleanup-Job für alte Cache-Einträge (Funktion)
CREATE OR REPLACE FUNCTION cleanup_llm_extraction_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM llm_extraction_cache 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 11. Constraints und Validierungen
ALTER TABLE bilateral_clarifications ADD CONSTRAINT check_clarification_type 
    CHECK (clarification_type IN ('SINGLE', 'BULK', 'AUTO_INTERNAL'));

ALTER TABLE email_processing_queue ADD CONSTRAINT check_processing_status 
    CHECK (processing_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED'));

ALTER TABLE bulk_clarification_items ADD CONSTRAINT check_item_type 
    CHECK (item_type IN ('MALO_ID', 'DAR_NUMBER', 'CONTRACT_NUMBER', 'MELO_ID'));

ALTER TABLE bulk_clarification_items ADD CONSTRAINT check_item_status 
    CHECK (item_status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'FAILED', 'SKIPPED'));

-- 12. Views für bessere Datenabfrage
CREATE OR REPLACE VIEW v_team_email_status AS
SELECT 
    t.id as team_id,
    t.name as team_name,
    tec.outbound_email_address,
    tec.auto_processing_enabled,
    tec.imap_host IS NOT NULL as imap_configured,
    tec.last_processed_uid,
    COUNT(epq.id) as pending_emails,
    tec.updated_at as config_updated_at
FROM teams t
LEFT JOIN team_email_configs tec ON t.id = tec.team_id
LEFT JOIN email_processing_queue epq ON t.id = epq.team_id AND epq.processing_status = 'PENDING'
GROUP BY t.id, t.name, tec.outbound_email_address, tec.auto_processing_enabled, 
         tec.imap_host, tec.last_processed_uid, tec.updated_at;

CREATE OR REPLACE VIEW v_bulk_clarification_summary AS
SELECT 
    bc.id as clarification_id,
    bc.title,
    bc.status as main_status,
    COUNT(bci.id) as total_items,
    COUNT(CASE WHEN bci.item_status = 'RESOLVED' THEN 1 END) as resolved_items,
    COUNT(CASE WHEN bci.item_status = 'FAILED' THEN 1 END) as failed_items,
    COUNT(CASE WHEN bci.item_status = 'OPEN' THEN 1 END) as open_items,
    bc.created_at
FROM bilateral_clarifications bc
LEFT JOIN bulk_clarification_items bci ON bc.id = bci.clarification_id
WHERE bc.clarification_type = 'BULK'
GROUP BY bc.id, bc.title, bc.status, bc.created_at;

-- 13. Kommentare für Dokumentation
COMMENT ON TABLE team_email_configs IS 'E-Mail-Konfiguration pro Team für automatische Verarbeitung';
COMMENT ON TABLE email_processing_queue IS 'Queue für die Verarbeitung eingehender E-Mails';
COMMENT ON TABLE llm_extraction_cache IS 'Cache für LLM-Datenextraktion zur Performance-Optimierung';
COMMENT ON TABLE bulk_clarification_items IS 'Einzelne Elemente in Sammelklärungen';

COMMENT ON COLUMN bilateral_clarifications.clarification_type IS 'SINGLE, BULK oder AUTO_INTERNAL';
COMMENT ON COLUMN bilateral_clarifications.auto_created IS 'True wenn automatisch aus E-Mail erstellt';
COMMENT ON COLUMN bilateral_clarifications.extracted_data IS 'Aus E-Mails extrahierte strukturierte Daten';

-- Migration erfolgreich abgeschlossen
SELECT 'Migration CR-WMAKO-001 erfolgreich ausgeführt' as status;
