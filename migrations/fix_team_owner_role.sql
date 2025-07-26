-- Update team_members role constraint to include 'owner'
-- Date: 2025-07-26

-- Drop the existing constraint
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_role_check;

-- Add the new constraint with 'owner' included
ALTER TABLE team_members ADD CONSTRAINT team_members_role_check 
    CHECK (role IN ('member', 'admin', 'owner'));

-- Update the teams table to include owner_id reference
ALTER TABLE teams ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Set owner_id to created_by for existing teams
UPDATE teams SET owner_id = created_by WHERE owner_id IS NULL;
