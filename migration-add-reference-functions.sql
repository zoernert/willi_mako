-- Migration für Hinzufügen der API-Endpunkte zum Verknüpfen von Chats und Notizen
-- Erstellt: 20. August 2025

-- Prüfen, ob die Spalte reference_id existiert, falls nicht, hinzufügen
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'clarification_references' AND column_name = 'reference_id') THEN
    ALTER TABLE clarification_references ADD COLUMN reference_id VARCHAR(255);
  END IF;
END $$;

-- Prüfen, ob die Spalte reference_data existiert, falls nicht, hinzufügen
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'clarification_references' AND column_name = 'reference_data') THEN
    ALTER TABLE clarification_references ADD COLUMN reference_data JSONB;
  END IF;
END $$;

-- Index für schnellere Abfragen, falls die Spalten neu erstellt wurden
CREATE INDEX IF NOT EXISTS idx_clarification_references_reference_id 
    ON clarification_references(reference_id);
