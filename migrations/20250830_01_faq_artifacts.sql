-- Create table to store FAQ generation artifacts (outline, sections, etc.)
CREATE TABLE IF NOT EXISTS faq_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_id UUID NOT NULL REFERENCES faqs(id) ON DELETE CASCADE,
  artifacts JSONB NOT NULL DEFAULT '{}'::jsonb,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by faq
CREATE INDEX IF NOT EXISTS idx_faq_artifacts_faq_id ON faq_artifacts(faq_id);

-- Simple trigger to keep updated_at fresh
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_faq_artifacts_updated_at'
  ) THEN
    CREATE OR REPLACE FUNCTION set_faq_artifacts_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at := NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_faq_artifacts_updated_at
    BEFORE UPDATE ON faq_artifacts
    FOR EACH ROW
    EXECUTE PROCEDURE set_faq_artifacts_updated_at();
  END IF;
END$$;
