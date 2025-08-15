-- Migration: Add cs30 access column to users table
-- CR-CS30-INTEGRATION: Gesteuerter Zugriff auf die Wissensdatenbank 'cs30'
-- Date: 2025-08-15

-- Add the new column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_access_cs30 BOOLEAN DEFAULT FALSE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_cs30_access ON users(can_access_cs30) WHERE can_access_cs30 = TRUE;

-- Add comment to document the column purpose
COMMENT ON COLUMN users.can_access_cs30 IS 'Berechtigung für Zugriff auf Schleupen cs30 Wissensdatenbank';

-- Log successful migration
DO $$
BEGIN
    RAISE NOTICE 'Migration add_cs30_access_column completed successfully';
    RAISE NOTICE 'Added column: users.can_access_cs30 BOOLEAN DEFAULT FALSE';
    RAISE NOTICE 'Added index: idx_users_cs30_access';
END
$$;
