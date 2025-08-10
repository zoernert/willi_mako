-- Migration: Create community_initiatives table
-- Meilenstein 3: Externe Initiativen (Community Initiatives)
-- Datum: 2025-08-09

CREATE TABLE IF NOT EXISTS community_initiatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES community_threads(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    draft_content TEXT NOT NULL, -- LLM-generierter Entwurf
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'refining', 'submitted')),
    target_audience TEXT, -- z.B. "BDEW", "Regulierungsbehörde", "Standardisierungsgremium"
    submission_details JSONB DEFAULT '{}'::jsonb, -- Metadaten zu Einreichung, Kontaktdaten etc.
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ NULL
);

-- Indexe für Performance
CREATE INDEX IF NOT EXISTS idx_community_initiatives_thread_id ON community_initiatives(thread_id);
CREATE INDEX IF NOT EXISTS idx_community_initiatives_status ON community_initiatives(status);
CREATE INDEX IF NOT EXISTS idx_community_initiatives_created_at ON community_initiatives(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_initiatives_created_by ON community_initiatives(created_by_user_id);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_community_initiatives_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_community_initiatives_updated_at
    BEFORE UPDATE ON community_initiatives
    FOR EACH ROW
    EXECUTE FUNCTION update_community_initiatives_updated_at();

-- Audit-Tabelle für Initiative-Änderungen (optional)
CREATE TABLE IF NOT EXISTS community_initiative_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiative_id UUID NOT NULL REFERENCES community_initiatives(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'status_changed', 'submitted'
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_initiative_audit_initiative_id ON community_initiative_audit(initiative_id);
CREATE INDEX IF NOT EXISTS idx_community_initiative_audit_created_at ON community_initiative_audit(created_at DESC);
