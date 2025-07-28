-- FAQ Linking Schema
-- Erweitert die FAQ-Tabelle um Verlinkungsfunktionalität

-- Tabelle für FAQ-Verlinkungen
CREATE TABLE IF NOT EXISTS faq_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_faq_id UUID NOT NULL REFERENCES faqs(id) ON DELETE CASCADE,
    target_faq_id UUID NOT NULL REFERENCES faqs(id) ON DELETE CASCADE,
    term TEXT NOT NULL, -- Der Begriff, der verlinkt werden soll
    display_text TEXT, -- Optionaler alternativer Anzeigetext
    is_automatic BOOLEAN DEFAULT true, -- Ob der Link automatisch erkannt wurde
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Verhindert doppelte Links
    CONSTRAINT unique_faq_link UNIQUE(source_faq_id, target_faq_id, term)
);

-- Index für bessere Performance
CREATE INDEX IF NOT EXISTS idx_faq_links_source ON faq_links(source_faq_id);
CREATE INDEX IF NOT EXISTS idx_faq_links_target ON faq_links(target_faq_id);
CREATE INDEX IF NOT EXISTS idx_faq_links_term ON faq_links(term);

-- Erweitere FAQ-Tabelle um is_public für Startseiten-Anzeige
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Index für öffentliche FAQs
CREATE INDEX IF NOT EXISTS idx_faqs_public ON faqs(is_public) WHERE is_public = true;

-- Funktion zum automatischen Update des updated_at Timestamps
CREATE OR REPLACE FUNCTION update_faq_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger für faq_links Tabelle
DROP TRIGGER IF EXISTS update_faq_links_updated_at ON faq_links;
CREATE TRIGGER update_faq_links_updated_at
    BEFORE UPDATE ON faq_links
    FOR EACH ROW
    EXECUTE FUNCTION update_faq_links_updated_at();
