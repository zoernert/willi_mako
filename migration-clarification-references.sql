-- Migration für bilaterale Klärungen: Zusätzliche Tabellen für Referenzen und erweiterte Daten
-- Erstellt: 19. August 2025

-- Tabelle für Referenzen von Klärfällen zu anderen Entitäten (z.B. Chats, Nachrichten)
CREATE TABLE IF NOT EXISTS clarification_references (
    id SERIAL PRIMARY KEY,
    clarification_id INTEGER NOT NULL,
    reference_type VARCHAR(50) NOT NULL,  -- 'CHAT', 'MESSAGE_ANALYZER', etc.
    reference_id VARCHAR(255) NOT NULL,   -- Chat-ID, Message-ID, etc.
    reference_data JSONB,                 -- Details zur Referenz
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_clarification 
        FOREIGN KEY(clarification_id) 
        REFERENCES bilateral_clarifications(id)
        ON DELETE CASCADE
);

-- Index für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_clarification_references_clarification_id 
    ON clarification_references(clarification_id);
CREATE INDEX IF NOT EXISTS idx_clarification_references_reference_type 
    ON clarification_references(reference_type);
CREATE INDEX IF NOT EXISTS idx_clarification_references_reference_id 
    ON clarification_references(reference_id);

-- Tabelle für zusätzliche Daten zu Klärfällen (z.B. Marktpartner, DAR)
CREATE TABLE IF NOT EXISTS clarification_additional_data (
    id SERIAL PRIMARY KEY,
    clarification_id INTEGER NOT NULL,
    data_type VARCHAR(50) NOT NULL,       -- 'MARKET_PARTNER', 'DATA_EXCHANGE_REFERENCE', 'SELECTED_ROLE', 'SELECTED_CONTACT'
    data JSONB NOT NULL,                  -- Die eigentlichen Daten
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_clarification_data
        FOREIGN KEY(clarification_id) 
        REFERENCES bilateral_clarifications(id)
        ON DELETE CASCADE
);

-- Index für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_clarification_additional_data_clarification_id 
    ON clarification_additional_data(clarification_id);
CREATE INDEX IF NOT EXISTS idx_clarification_additional_data_data_type 
    ON clarification_additional_data(data_type);

-- Ergänzung: Stellen Sie sicher, dass die Haupttabelle das korrekte JSONB-Format für tags verwendet
ALTER TABLE bilateral_clarifications 
    ALTER COLUMN tags TYPE JSONB USING tags::jsonb;
