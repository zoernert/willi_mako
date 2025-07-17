-- Admin Panel Database Migration
-- This script adds missing columns and functions for the admin panel

-- Add missing columns to users table if they don't exist
DO $$
BEGIN
    -- Add full_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'full_name') THEN
        ALTER TABLE users ADD COLUMN full_name VARCHAR(255);
        -- Copy name to full_name for existing records
        UPDATE users SET full_name = name WHERE full_name IS NULL;
    END IF;
    
    -- Add company column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'company') THEN
        ALTER TABLE users ADD COLUMN company VARCHAR(255);
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Add missing columns to documents table if they don't exist
DO $$
BEGIN
    -- Add title column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'title') THEN
        ALTER TABLE documents ADD COLUMN title VARCHAR(500);
        -- Set default title for existing records
        UPDATE documents SET title = COALESCE(original_name, filename, 'Dokument ohne Titel') WHERE title IS NULL;
    END IF;
    
    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'description') THEN
        ALTER TABLE documents ADD COLUMN description TEXT;
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'is_active') THEN
        ALTER TABLE documents ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Add uploaded_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'uploaded_by') THEN
        ALTER TABLE documents ADD COLUMN uploaded_by UUID REFERENCES users(id) ON DELETE CASCADE;
        -- Set uploaded_by to user_id for existing records
        UPDATE documents SET uploaded_by = user_id WHERE uploaded_by IS NULL;
    END IF;
    
    -- Add updated_at column if it doesn't exist (check if it already exists from previous run)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'updated_at') THEN
        ALTER TABLE documents ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create additional indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_is_active ON documents(is_active);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC);

-- Update existing users to ensure full_name is populated
UPDATE users SET full_name = name WHERE full_name IS NULL OR full_name = '';

-- Update existing documents to ensure title is populated
UPDATE documents SET title = COALESCE(original_name, filename, 'Dokument ohne Titel') WHERE title IS NULL OR title = '';

-- Add some sample data if tables are empty (for testing)
DO $$
BEGIN
    -- Add admin user if no users exist
    IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin') THEN
        INSERT INTO users (email, password_hash, name, full_name, company, role) VALUES 
        ('admin@willimako.com', '$2a$12$yKLbo5Go3FOIcsKvFZNoCu2c6WgHmNyHqRK4MByrAYT45QgwFDwli', 'Admin', 'Administrator', 'Willi Mako', 'admin')
        ON CONFLICT (email) DO NOTHING;
    END IF;
END $$;

-- Refresh statistics
ANALYZE users;
ANALYZE documents;
ANALYZE chats;
ANALYZE messages;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Admin Panel Migration completed successfully!';
    RAISE NOTICE 'Added columns: users.full_name, users.company, documents.title, documents.description, documents.is_active, documents.uploaded_by';
    RAISE NOTICE 'Created triggers for updated_at columns';
    RAISE NOTICE 'Added performance indexes';
END $$;
