-- Skript zur Korrektur der Tabellen für bilaterale Klarfälle
-- Erstellt am 19. August 2025

-- 1. Zuerst entfernen wir die alte Funktion, falls sie existiert
DROP FUNCTION IF EXISTS process_tags(text);

-- Dann erstellen wir die Hilfsfunktion für die korrekte Verarbeitung von Tags
CREATE OR REPLACE FUNCTION process_tags(tags_input TEXT)
RETURNS JSONB AS $$
BEGIN
    IF tags_input IS NULL OR tags_input = '' OR tags_input = '[]' THEN
        RETURN '[]'::jsonb;
    END IF;
    BEGIN
        RETURN tags_input::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RETURN ('["' || tags_input || '"]')::jsonb;
    END;
END;
$$ LANGUAGE plpgsql;

-- 2. Stelle sicher, dass die clarification_references-Tabelle existiert
CREATE TABLE IF NOT EXISTS clarification_references (
    id SERIAL PRIMARY KEY,
    clarification_id INTEGER NOT NULL REFERENCES bilateral_clarifications(id) ON DELETE CASCADE,
    reference_type VARCHAR(50) NOT NULL, -- 'CHAT', 'MESSAGE_ANALYZER', 'EMAIL', etc.
    reference_id VARCHAR(255) NOT NULL,  -- External identifier (chatId, messageId, etc.)
    reference_data JSONB,                -- Additional context data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Füge JSONB-Spalten für die Marktpartner-Daten hinzu, falls sie noch nicht existieren
-- Diese Spalten nehmen die Daten aus dem Frontend-Formular auf
DO $$
BEGIN
    -- Überprüfe ob market_partner_data als JSONB existiert
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bilateral_clarifications' 
        AND column_name = 'market_partner_data' 
        AND data_type = 'jsonb'
    ) THEN
        -- Wenn nicht, erstelle oder ändere die Spalte
        BEGIN
            ALTER TABLE bilateral_clarifications 
            ADD COLUMN market_partner_data JSONB;
        EXCEPTION 
            WHEN duplicate_column THEN 
                ALTER TABLE bilateral_clarifications 
                ALTER COLUMN market_partner_data TYPE JSONB USING 
                    CASE WHEN market_partner_data IS NULL THEN NULL
                         ELSE market_partner_data::jsonb
                    END;
        END;
    END IF;

    -- Wiederhole für selected_role
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bilateral_clarifications' 
        AND column_name = 'selected_role' 
        AND data_type = 'jsonb'
    ) THEN
        BEGIN
            ALTER TABLE bilateral_clarifications 
            ADD COLUMN selected_role JSONB;
        EXCEPTION 
            WHEN duplicate_column THEN 
                ALTER TABLE bilateral_clarifications 
                ALTER COLUMN selected_role TYPE JSONB USING 
                    CASE WHEN selected_role IS NULL THEN NULL
                         ELSE selected_role::jsonb
                    END;
        END;
    END IF;

    -- Wiederhole für selected_contact
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bilateral_clarifications' 
        AND column_name = 'selected_contact' 
        AND data_type = 'jsonb'
    ) THEN
        BEGIN
            ALTER TABLE bilateral_clarifications 
            ADD COLUMN selected_contact JSONB;
        EXCEPTION 
            WHEN duplicate_column THEN 
                ALTER TABLE bilateral_clarifications 
                ALTER COLUMN selected_contact TYPE JSONB USING 
                    CASE WHEN selected_contact IS NULL THEN NULL
                         ELSE selected_contact::jsonb
                    END;
        END;
    END IF;

    -- Wiederhole für data_exchange_reference
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bilateral_clarifications' 
        AND column_name = 'data_exchange_reference' 
        AND data_type = 'jsonb'
    ) THEN
        BEGIN
            ALTER TABLE bilateral_clarifications 
            ADD COLUMN data_exchange_reference JSONB;
        EXCEPTION 
            WHEN duplicate_column THEN 
                ALTER TABLE bilateral_clarifications 
                ALTER COLUMN data_exchange_reference TYPE JSONB USING 
                    CASE WHEN data_exchange_reference IS NULL THEN NULL
                         ELSE data_exchange_reference::jsonb
                    END;
        END;
    END IF;
END $$;

-- 4. Stelle sicher, dass die Tags-Spalte korrekt ist
DO $$
BEGIN
    -- Überprüfe und konvertiere die tags-Spalte zu JSONB wenn sie als Text[] existiert
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bilateral_clarifications' 
        AND column_name = 'tags' 
        AND data_type = 'ARRAY'
    ) THEN
        -- Erstelle eine temporäre Spalte für die Konvertierung
        ALTER TABLE bilateral_clarifications ADD COLUMN tags_jsonb JSONB DEFAULT '[]'::jsonb;
        
        -- Aktualisiere die neue Spalte basierend auf der alten
        UPDATE bilateral_clarifications 
        SET tags_jsonb = COALESCE(
            (SELECT jsonb_agg(t) FROM unnest(tags) AS t), 
            '[]'::jsonb
        );
        
        -- Entferne die alte Spalte und benenne die neue um
        ALTER TABLE bilateral_clarifications DROP COLUMN tags;
        ALTER TABLE bilateral_clarifications RENAME COLUMN tags_jsonb TO tags;
    END IF;

    -- Wenn tags nicht existiert, erstelle es als JSONB
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bilateral_clarifications' 
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE bilateral_clarifications ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 5. Stelle sicher, dass internal_status korrekt ist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bilateral_clarifications' 
        AND column_name = 'internal_status'
    ) THEN
        ALTER TABLE bilateral_clarifications ADD COLUMN internal_status VARCHAR(50) DEFAULT 'DRAFT';
    END IF;
END $$;
