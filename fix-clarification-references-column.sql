-- Fix for clarification_references table missing reference_id column
-- Created: August 20, 2025

-- Check if the table exists but doesn't have the reference_id column
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clarification_references'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'clarification_references' 
        AND column_name = 'reference_id'
    ) THEN
        -- Add the missing column
        ALTER TABLE clarification_references 
        ADD COLUMN reference_id VARCHAR(255);
        
        -- Make it NOT NULL for new rows but allow existing rows to have NULL
        -- We'll need to update any existing rows separately
        
        -- Create the indices that should exist
        CREATE INDEX IF NOT EXISTS idx_clarification_references_reference_type 
            ON clarification_references(reference_type);
        CREATE INDEX IF NOT EXISTS idx_clarification_references_reference_id 
            ON clarification_references(reference_id);
    END IF;
END
$$;

-- If the table doesn't exist at all, create it properly
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

-- Make sure all needed indices exist
CREATE INDEX IF NOT EXISTS idx_clarification_references_clarification_id 
    ON clarification_references(clarification_id);
CREATE INDEX IF NOT EXISTS idx_clarification_references_reference_type 
    ON clarification_references(reference_type);
CREATE INDEX IF NOT EXISTS idx_clarification_references_reference_id 
    ON clarification_references(reference_id);
