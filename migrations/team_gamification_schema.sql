-- Team-Gamification Schema Migration
-- Date: 2025-07-24
-- Description: Adds team functionality and extends gamification system

-- Teams Tabelle
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team-Mitgliedschaften (Ein User kann nur in einem Team sein)
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE, -- UNIQUE verhindert mehrfache Mitgliedschaften
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'admin'))
);

-- Team-Einladungen
CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES users(id) ON DELETE CASCADE,
    invited_email VARCHAR(255) NOT NULL,
    invited_user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL wenn User noch nicht registriert
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP
);

-- Team-Beitrittsanfragen
CREATE TABLE IF NOT EXISTS team_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    responded_by UUID REFERENCES users(id),
    UNIQUE(team_id, user_id) -- Ein User kann nur eine aktive Anfrage pro Team haben
);

-- Erweiterung der user_points Tabelle um Ablaufzeit
ALTER TABLE user_points ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Setze expires_at für bestehende Punkte
UPDATE user_points SET expires_at = earned_at + INTERVAL '30 days' WHERE expires_at IS NULL;

-- Erweiterung der user_documents Tabelle um uploaded_by_user_id falls nicht vorhanden
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS uploaded_by_user_id UUID REFERENCES users(id);

-- Setze uploaded_by_user_id = user_id für bestehende Dokumente
UPDATE user_documents SET uploaded_by_user_id = user_id WHERE uploaded_by_user_id IS NULL;

-- Document Usage Tracking für Punktevergabe
CREATE TABLE IF NOT EXISTS document_usage_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES user_documents(id) ON DELETE CASCADE,
    uploader_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    used_in_chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    points_awarded INTEGER DEFAULT 1,
    awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, used_in_chat_id) -- Verhindert mehrfache Punktevergabe für dieselbe Nutzung
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_team_id ON team_join_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_user_id ON team_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_status ON team_join_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_points_expires_at ON user_points(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_points_user_id_valid ON user_points(user_id) WHERE expires_at > CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_document_usage_points_uploader ON document_usage_points(uploader_user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_uploaded_by ON user_documents(uploaded_by_user_id);

-- Trigger für updated_at bei teams
CREATE TRIGGER update_teams_updated_at 
    BEFORE UPDATE ON teams 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Bereinigung abgelaufener Einladungen (optional, für Cron Job)
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE team_invitations 
    SET status = 'expired' 
    WHERE status = 'pending' AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Abschlussmeldung
DO $$
BEGIN
    RAISE NOTICE 'Team-Gamification Schema erfolgreich erstellt!';
    RAISE NOTICE 'Neue Tabellen: teams, team_members, team_invitations, team_join_requests, document_usage_points';
    RAISE NOTICE 'Erweiterte Tabellen: user_points (expires_at), user_documents (uploaded_by_user_id)';
    RAISE NOTICE 'Performance-Indizes und Trigger konfiguriert';
END
$$;
