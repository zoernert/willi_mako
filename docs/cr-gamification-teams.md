# Change Request: Gamification - Teams und Wissensaustausch

## Beschreibung
Diese Funktion erweitert das bestehende Gamification-System um eine Team-Komponente. Benutzer können Teams beitreten oder neue gründen. Inhalte im "Mein Workspace" eines Benutzers werden automatisch mit allen Mitgliedern seines Teams geteilt. Wenn ein von einem Benutzer hochgeladenes Dokument zur Generierung einer KI-Antwort verwendet wird, erhält dieser Benutzer einen Punkt. Für jedes Team gibt es eine Bestenliste, die den aktuellen Punktestand der Mitglieder anzeigt. Die Punkte verfallen automatisch nach 30 Tagen, um die kontinuierliche Aktualität der Wissensbasis zu fördern.

## Business Value
- **Fördert Kollaboration:** Schafft einen Anreiz für Sachbearbeiter in der Marktkommunikation, Wissen und relevante Dokumente proaktiv mit Kollegen zu teilen.
- **Steigert Engagement:** Die Gamification durch Punkte und Bestenlisten motiviert die Mitarbeiter, sich aktiv am Wissensmanagement zu beteiligen.
- **Verbessert Wissensqualität:** Das System belohnt das Teilen von nützlichen, aktuellen Informationen und verbessert so die Qualität der gesamten Wissensdatenbank.
- **Effizienzsteigerung:** Der automatische Wissensaustausch im Team reduziert redundante Arbeit und beschleunigt die Einarbeitung neuer Kollegen.

## User Stories
### Story 1
**Als** Sachbearbeiter
**möchte ich** einem bestehenden Team beitreten oder ein neues Team gründen
**damit** ich mit meinen direkten Kollegen zusammenarbeiten und Wissen teilen kann.

**Akzeptanzkriterien:**
- [ ] Es gibt eine Benutzeroberfläche zur Anzeige, Erstellung und zum Beitritt von Teams.
- [ ] Ein Benutzer kann immer nur Mitglied eines Teams sein.
- [ ] Der Ersteller eines Teams wird automatisch zum Team-Admin.

### Story 1a (Neu)
**Als** Team-Admin
**möchte ich** kontrollieren können, wer meinem Team beitritt
**damit** ich sicherstellen kann, dass nur relevante Kollegen Zugang zur Wissensbasis haben.

**Akzeptanzkriterien:**
- [ ] Ich kann andere Benutzer per E-Mail-Adresse zu meinem Team einladen.
- [ ] Ich kann Beitrittsanfragen von anderen Benutzern annehmen oder ablehnen.
- [ ] Ich kann Team-Mitglieder aus dem Team entfernen (außer mich selbst).
- [ ] Ich kann andere Mitglieder zu Team-Admins befördern.

### Story 1b (Neu)
**Als** Sachbearbeiter ohne Team
**möchte ich** eine Beitrittsanfrage an ein bestehendes Team senden
**damit** ich um Aufnahme in ein relevantes Team bitten kann.

**Akzeptanzkriterien:**
- [ ] Ich kann eine Beitrittsanfrage mit persönlicher Nachricht an Team-Admins senden.
- [ ] Ich erhalte eine Benachrichtigung über die Entscheidung (Annahme/Ablehnung).
- [ ] Ich kann meine ausstehenden Beitrittsanfragen einsehen und zurückziehen.

### Story 2
**Als** Teammitglied
**möchte ich**, dass meine Inhalte aus "Mein Workspace" (hochgeladene Dokumente, Notizen) automatisch für mein Team sichtbar sind
**damit** wir auf eine gemeinsame Wissensbasis zugreifen können, ohne Dokumente manuell teilen zu müssen.

**Akzeptanzkriterien:**
- [ ] Inhalte im Workspace eines Nutzers sind für alle Mitglieder desselben Teams zugänglich.
- [ ] Die Suche in "Mein Workspace" berücksichtigt sowohl eigene als auch die Dokumente der Teamkollegen.
- [ ] Es ist klar ersichtlich, von welchem Teammitglied ein Dokument ursprünglich hochgeladen wurde.

### Story 3
**Als** Sachbearbeiter
**möchte ich** Punkte erhalten, wenn ein von mir hochgeladenes Dokument von der KI zur Beantwortung einer Anfrage genutzt wird
**damit** mein Beitrag zur Wissensbasis anerkannt und belohnt wird.

**Akzeptanzkriterien:**
- [ ] Wenn ein Dokument für eine KI-Antwort verwendet wird, wird der ursprüngliche Uploader identifiziert.
- [ ] Der Uploader erhält automatisch einen Punkt.
- [ ] Das System verhindert die mehrfache Punktevergabe für dieselbe Anfrage.

### Story 4
**Als** Teammitglied
**möchte ich** eine Bestenliste für mein Team sehen
**damit** ich den aktuellen Punktestand von mir und meinen Kollegen einsehen und unseren gemeinsamen Erfolg verfolgen kann.

**Akzeptanzkriterien:**
- [ ] Es gibt eine neue Ansicht für die Team-Bestenliste.
- [ ] Die Liste zeigt alle Teammitglieder und ihre aktuellen Punktzahlen an.
- [ ] Die Punkte in der Bestenliste verfallen nach 30 Tagen und werden automatisch aktualisiert.

## Requirements
### Funktionale Anforderungen
- [ ] **Team-Management:** Backend-Logik und API-Endpunkte zum Erstellen, Abrufen, Beitreten und Verlassen von Teams.
- [ ] **Team-Verwaltung:** Team-Admins können Einladungen versenden, Beitrittsanfragen verwalten und Mitglieder administrieren.
- [ ] **Einladungssystem:** Benutzer können per E-Mail-Adresse zu Teams eingeladen werden.
- [ ] **Beitrittsanfragen:** Benutzer können Beitrittsanfragen mit Nachrichten an Team-Admins senden.
- [ ] **Benachrichtigungssystem:** Automatische Benachrichtigungen für Einladungen, Beitrittsanfragen und Entscheidungen.
- [ ] **Workspace-Erweiterung:** Der `WorkspaceService` muss so erweitert werden, dass er Dokumente und Notizen auf Team-Ebene aggregiert.
- [ ] **Punktevergabe:** Ein Mechanismus muss implementiert werden, der die Nutzung von Dokumenten in KI-Antworten nachverfolgt und dem Uploader Punkte gutschreibt.
- [ ] **Punkteverfall:** Ein täglicher Job (z.B. Cronjob) muss implementiert werden, der Punkte löscht, die älter als 30 Tage sind.
- [ ] **Team-Bestenliste:** Ein neuer API-Endpunkt, der die Bestenliste für das Team eines Benutzers basierend auf den gültigen Punkten berechnet und zurückgibt.
- [ ] **Frontend-Komponenten:** Neue UI-Elemente für die Teamverwaltung und die Anzeige der Bestenliste.

### Nicht-funktionale Anforderungen
- [ ] **Performance:** Die Abfrage der Bestenliste und des Team-Workspaces muss performant sein und darf das System nicht verlangsamen.
- [ ] **Sicherheit:** Ein Benutzer darf nur auf Workspace-Inhalte und Bestenlisten seines eigenen Teams zugreifen.
- [ ] **Datenintegrität:** Die Punktevergabe und der Verfall müssen transaktionssicher und zuverlässig sein.

## Detaillierter Implementierungsplan

### Phase 1: Datenbank-Schema und Migrations (1-2 Arbeitstage)

#### 1.1 Neue Migration erstellen: `team_gamification_schema.sql`

```sql
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
```

**Akzeptanzkriterien:**
- [ ] Migration läuft erfolgreich auf bestehender Datenbank
- [ ] Bestehende Daten bleiben intakt
- [ ] Neue Indizes verbessern Query-Performance
- [ ] Constraints verhindern Dateninkonsistenzen

#### 1.2 Migration Deploy Script erweitern

```bash
# In deploy.sh oder separates Migrations-Script
psql $DATABASE_URL -f migrations/team_gamification_schema.sql
```

### Phase 2: Backend Services Implementation (3-4 Arbeitstage)

#### 2.1 TeamService Implementation (`src/services/teamService.ts`)

```typescript
import { DatabaseHelper } from '../utils/database';
import { AppError } from '../utils/errors';

export interface Team {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  member_count: number;
  created_at: Date;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: 'member' | 'admin';
  joined_at: Date;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  team_name: string;
  invited_by: string;
  invited_by_name: string;
  invited_email: string;
  invitation_token: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expires_at: Date;
  created_at: Date;
}

export interface TeamJoinRequest {
  id: string;
  team_id: string;
  team_name: string;
  user_id: string;
  user_name: string;
  user_email: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  created_at: Date;
  responded_at?: Date;
  responded_by?: string;
}

export class TeamService {
  // Team CRUD Operations
  async createTeam(name: string, description: string, createdBy: string): Promise<Team>
  async getTeamByUserId(userId: string): Promise<Team | null>
  async getAllTeams(limit?: number, offset?: number): Promise<Team[]>
  async joinTeam(userId: string, teamId: string): Promise<void>
  async leaveTeam(userId: string): Promise<void>
  async getTeamMembers(teamId: string): Promise<TeamMember[]>
  async deleteTeam(teamId: string, requestingUserId: string): Promise<void>
  
  // Team Administration (Admin-only)
  async inviteUserToTeam(teamId: string, invitedEmail: string, invitedBy: string, message?: string): Promise<TeamInvitation>
  async removeTeamMember(teamId: string, memberUserId: string, requestingUserId: string): Promise<void>
  async promoteToAdmin(teamId: string, memberUserId: string, requestingUserId: string): Promise<void>
  async demoteFromAdmin(teamId: string, memberUserId: string, requestingUserId: string): Promise<void>
  
  // Join Requests
  async createJoinRequest(teamId: string, userId: string, message?: string): Promise<TeamJoinRequest>
  async approveJoinRequest(requestId: string, respondingUserId: string): Promise<void>
  async rejectJoinRequest(requestId: string, respondingUserId: string): Promise<void>
  async withdrawJoinRequest(requestId: string, userId: string): Promise<void>
  async getTeamJoinRequests(teamId: string, requestingUserId: string): Promise<TeamJoinRequest[]>
  async getUserJoinRequests(userId: string): Promise<TeamJoinRequest[]>
  
  // Invitations
  async acceptInvitation(invitationToken: string, userId: string): Promise<void>
  async declineInvitation(invitationToken: string): Promise<void>
  async getInvitationByToken(token: string): Promise<TeamInvitation | null>
  async getUserInvitations(userEmail: string): Promise<TeamInvitation[]>
  async getTeamInvitations(teamId: string, requestingUserId: string): Promise<TeamInvitation[]>
  async revokeInvitation(invitationId: string, requestingUserId: string): Promise<void>
  
  // Team-related helper methods
  async isUserInTeam(userId: string): Promise<boolean>
  async getUserTeamId(userId: string): Promise<string | null>
  async getTeamMemberIds(teamId: string): Promise<string[]>
  async isTeamAdmin(userId: string, teamId: string): Promise<boolean>
  async canUserManageTeam(userId: string, teamId: string): Promise<boolean>
}
```

**Implementierungsdetails:**
- [ ] Vollständige CRUD-Operationen für Teams
- [ ] Team-Admin-Funktionen für Einladungen und Mitgliederverwaltung
- [ ] Beitrittsanfragen-System mit Approval-Workflow
- [ ] Einladungssystem mit E-Mail-Benachrichtigungen
- [ ] Validierung: Ein User kann nur in einem Team sein
- [ ] Berechtigungsprüfungen für Admin-Funktionen
- [ ] Fehlerbehandlung für Team-Konflikte
- [ ] Transaktionale Operationen für Konsistenz

#### 2.2 WorkspaceService Erweiterung

```typescript
// Erweiterung der bestehenden WorkspaceService Klasse
export class WorkspaceService {
  // ...existing code...
  
  /**
   * Get workspace documents including team members' documents
   */
  async getTeamWorkspaceDocuments(userId: string): Promise<UserDocument[]> {
    const teamMemberIds = await this.getTeamMemberIds(userId);
    // Query documents from all team members
    // Mark documents with original uploader information
  }
  
  /**
   * Search workspace content across team documents
   */
  async searchTeamWorkspaceContent(
    userId: string, 
    query: string, 
    filters?: SearchFilters
  ): Promise<SearchResult[]> {
    const teamMemberIds = await this.getTeamMemberIds(userId);
    // Extend existing search to include team documents
  }
  
  private async getTeamMemberIds(userId: string): Promise<string[]> {
    // Get user's team and return all member IDs
  }
}
```

**Implementierungsdetails:**
- [ ] Erweitert bestehende Workspace-Funktionen um Team-Funktionalität
- [ ] Backwards-compatible mit Single-User Workspace
- [ ] Performance-optimierte Queries für Team-Dokumente
- [ ] Klare Kennzeichnung des ursprünglichen Uploaders

#### 2.3 GamificationService Erweiterung

```typescript
// Erweiterung der bestehenden GamificationService Klasse
export class GamificationService {
  // ...existing code...
  
  /**
   * Award points when a document is used in AI response
   */
  async awardDocumentUsagePoints(
    documentId: string, 
    chatId: string
  ): Promise<void> {
    // Find document uploader
    // Check if points already awarded for this usage
    // Award 1 point to uploader
    // Record in document_usage_points table
  }
  
  /**
   * Get team leaderboard with valid (non-expired) points
   */
  async getTeamLeaderboard(teamId: string, limit: number = 10): Promise<LeaderboardEntry[]> {
    // Query user_points with expires_at > CURRENT_TIMESTAMP
    // Filter by team members
    // Aggregate points per user
    // Order by total points descending
  }
  
  /**
   * Clean up expired points (for cron job)
   */
  async cleanupExpiredPoints(): Promise<number> {
    // DELETE FROM user_points WHERE expires_at < CURRENT_TIMESTAMP
    // Return number of deleted records
  }
  
  /**
   * Get user's current valid points
   */
  async getUserValidPoints(userId: string): Promise<number> {
    // SUM points where expires_at > CURRENT_TIMESTAMP
  }
}
```

**Implementierungsdetails:**
- [ ] Integration mit bestehender Punktevergabe-Logik
- [ ] Automatische Punktevergabe bei Dokumentennutzung
- [ ] Team-basierte Bestenliste
- [ ] Expired Points Cleanup Job

#### 2.4 Team Routes Implementation (`src/routes/teams.ts`)

```typescript
import { Router } from 'express';
import { TeamService } from '../services/teamService';
import { GamificationService } from '../modules/quiz/gamification.service';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const teamService = new TeamService();
const gamificationService = new GamificationService();

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/teams - List all teams
router.get('/', asyncHandler(async (req, res) => {
  // Implementation
}));

// POST /api/teams - Create new team
router.post('/', asyncHandler(async (req, res) => {
  // Implementation with validation
}));

// GET /api/teams/my-team - Get current user's team
router.get('/my-team', asyncHandler(async (req, res) => {
  // Implementation
}));

// POST /api/teams/:teamId/join-request - Create join request
router.post('/:teamId/join-request', asyncHandler(async (req, res) => {
  // Implementation for creating join requests
}));

// GET /api/teams/join-requests - Get user's join requests
router.get('/join-requests', asyncHandler(async (req, res) => {
  // Implementation for getting user's own join requests
}));

// DELETE /api/teams/join-requests/:requestId - Withdraw join request
router.delete('/join-requests/:requestId', asyncHandler(async (req, res) => {
  // Implementation for withdrawing join request
}));

// DELETE /api/teams/leave - Leave current team
router.delete('/leave', asyncHandler(async (req, res) => {
  // Implementation
}));

// GET /api/teams/leaderboard - Get team leaderboard
router.get('/leaderboard', asyncHandler(async (req, res) => {
  // Implementation using GamificationService.getTeamLeaderboard
}));

// ===== ADMIN ROUTES =====
// POST /api/teams/:teamId/invite - Invite user to team (Admin only)
router.post('/:teamId/invite', asyncHandler(async (req, res) => {
  // Implementation with admin permission check
}));

// GET /api/teams/:teamId/invitations - Get team invitations (Admin only)
router.get('/:teamId/invitations', asyncHandler(async (req, res) => {
  // Implementation with admin permission check
}));

// DELETE /api/teams/invitations/:invitationId - Revoke invitation (Admin only)
router.delete('/invitations/:invitationId', asyncHandler(async (req, res) => {
  // Implementation with admin permission check
}));

// GET /api/teams/:teamId/join-requests - Get team's join requests (Admin only)
router.get('/:teamId/join-requests', asyncHandler(async (req, res) => {
  // Implementation with admin permission check
}));

// POST /api/teams/join-requests/:requestId/approve - Approve join request (Admin only)
router.post('/join-requests/:requestId/approve', asyncHandler(async (req, res) => {
  // Implementation with admin permission check
}));

// POST /api/teams/join-requests/:requestId/reject - Reject join request (Admin only)
router.post('/join-requests/:requestId/reject', asyncHandler(async (req, res) => {
  // Implementation with admin permission check
}));

// DELETE /api/teams/:teamId/members/:userId - Remove team member (Admin only)
router.delete('/:teamId/members/:userId', asyncHandler(async (req, res) => {
  // Implementation with admin permission check
}));

// POST /api/teams/:teamId/members/:userId/promote - Promote to admin (Admin only)
router.post('/:teamId/members/:userId/promote', asyncHandler(async (req, res) => {
  // Implementation with admin permission check
}));

// POST /api/teams/:teamId/members/:userId/demote - Demote from admin (Admin only)
router.post('/:teamId/members/:userId/demote', asyncHandler(async (req, res) => {
  // Implementation with admin permission check
}));

// ===== INVITATION ACCEPTANCE ROUTES (Public) =====
// GET /api/teams/invitations/:token - Get invitation details
router.get('/invitations/:token', asyncHandler(async (req, res) => {
  // Implementation for public invitation viewing
}));

// POST /api/teams/invitations/:token/accept - Accept invitation
router.post('/invitations/:token/accept', asyncHandler(async (req, res) => {
  // Implementation for accepting invitations
}));

// POST /api/teams/invitations/:token/decline - Decline invitation
router.post('/invitations/:token/decline', asyncHandler(async (req, res) => {
  // Implementation for declining invitations
}));

export { router as teamRoutes };
```

**API Endpoints Übersicht:**
- [ ] `GET /api/teams` - Liste aller Teams
- [ ] `POST /api/teams` - Neues Team erstellen
- [ ] `GET /api/teams/my-team` - Aktuelles Team des Users
- [ ] `POST /api/teams/:teamId/join-request` - Beitrittsanfrage senden
- [ ] `GET /api/teams/join-requests` - Eigene Beitrittsanfragen abrufen
- [ ] `DELETE /api/teams/join-requests/:requestId` - Beitrittsanfrage zurückziehen
- [ ] `DELETE /api/teams/leave` - Team verlassen
- [ ] `GET /api/teams/leaderboard` - Team-Bestenliste
- [ ] **Admin-Endpoints:**
  - [ ] `POST /api/teams/:teamId/invite` - Benutzer einladen
  - [ ] `GET /api/teams/:teamId/invitations` - Team-Einladungen verwalten
  - [ ] `DELETE /api/teams/invitations/:invitationId` - Einladung widerrufen
  - [ ] `GET /api/teams/:teamId/join-requests` - Beitrittsanfragen des Teams
  - [ ] `POST /api/teams/join-requests/:requestId/approve` - Beitrittsanfrage genehmigen
  - [ ] `POST /api/teams/join-requests/:requestId/reject` - Beitrittsanfrage ablehnen
  - [ ] `DELETE /api/teams/:teamId/members/:userId` - Mitglied entfernen
  - [ ] `POST /api/teams/:teamId/members/:userId/promote` - Zum Admin befördern
  - [ ] `POST /api/teams/:teamId/members/:userId/demote` - Admin-Rechte entziehen
- [ ] **Einladungs-Endpoints (Public):**
  - [ ] `GET /api/teams/invitations/:token` - Einladungsdetails abrufen
  - [ ] `POST /api/teams/invitations/:token/accept` - Einladung annehmen
  - [ ] `POST /api/teams/invitations/:token/decline` - Einladung ablehnen

#### 2.5 Notification Service für Team-Events

```typescript
// src/services/notificationService.ts
export class NotificationService {
  /**
   * Send team invitation email
   */
  async sendTeamInvitationEmail(
    invitation: TeamInvitation,
    teamName: string,
    inviterName: string
  ): Promise<void> {
    // Send email with invitation link
    // Include team information and personal message
  }
  
  /**
   * Notify team admins about new join request
   */
  async notifyTeamAdminsAboutJoinRequest(
    joinRequest: TeamJoinRequest,
    teamId: string
  ): Promise<void> {
    // Send notification to all team admins
    // Include requester information and message
  }
  
  /**
   * Notify user about join request decision
   */
  async notifyJoinRequestDecision(
    joinRequest: TeamJoinRequest,
    decision: 'approved' | 'rejected'
  ): Promise<void> {
    // Send email to user about decision
  }
  
  /**
   * Send welcome message to new team member
   */
  async sendTeamWelcomeMessage(
    userId: string,
    teamName: string
  ): Promise<void> {
    // Send welcome email with team information
  }
}
```

#### 2.6 Integration in Chat Service für Punktevergabe

```typescript
// Erweiterung in src/routes/chat.ts oder entsprechendem Service
// Bei jeder AI-Antwort, die Dokumente verwendet:

async function handleChatResponse(chatId: string, query: string, userId: string) {
  // ...existing chat logic...
  
  // Nach der AI-Antwort-Generierung:
  const usedDocuments = await this.getDocumentsUsedInResponse(response);
  
  for (const documentId of usedDocuments) {
    await gamificationService.awardDocumentUsagePoints(documentId, chatId);
  }
  
  // ...rest of response handling...
}
```

**Implementierungsdetails:**
- [ ] Integration mit bestehender Chat-Response-Logik
- [ ] Tracking der verwendeten Dokumente in AI-Antworten
- [ ] Automatische Punktevergabe ohne User-Intervention
- [ ] Vermeidung von Doppelvergaben durch unique constraints

#### 2.7 Cron Job für Expired Points Cleanup

```typescript
// src/scripts/cleanup-expired-points.ts
import { GamificationService } from '../modules/quiz/gamification.service';

async function cleanupExpiredPoints() {
  const gamificationService = new GamificationService();
  const deletedCount = await gamificationService.cleanupExpiredPoints();
  console.log(`Cleaned up ${deletedCount} expired points`);
}

if (require.main === module) {
  cleanupExpiredPoints()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error cleaning up expired points:', error);
      process.exit(1);
    });
}
```

**Cron Job Setup:**
```bash
# Täglich um 2:00 Uhr ausführen
0 2 * * * /usr/bin/node /path/to/cleanup-expired-points.js >> /var/log/points-cleanup.log 2>&1
```

### Phase 3: Frontend Implementation (4-5 Arbeitstage)

#### 3.1 Team Management Page (`client/src/pages/Teams.tsx`)

```typescript
import React, { useState, useEffect } from 'react';
import { TeamService } from '../services/TeamService';
import { CreateTeamModal } from '../components/teams/CreateTeamModal';
import { TeamList } from '../components/teams/TeamList';
import { MyTeam } from '../components/teams/MyTeam';

export const Teams: React.FC = () => {
  // State management for teams, current user team, loading states
  // Implementation with create, join, leave functionality
};
```

**Komponenten-Struktur:**
- [ ] `CreateTeamModal.tsx` - Modal für Team-Erstellung
- [ ] `TeamList.tsx` - Liste verfügbarer Teams mit Join-Request-Button
- [ ] `MyTeam.tsx` - Aktuelles Team mit Mitgliedern und Admin-Funktionen
- [ ] `TeamAdminPanel.tsx` - Admin-Interface für Team-Verwaltung
- [ ] `InviteMemberModal.tsx` - Modal für Mitglieder-Einladung
- [ ] `JoinRequestModal.tsx` - Modal für Beitrittsanfragen
- [ ] `PendingInvitations.tsx` - Liste der eigenen ausstehenden Einladungen
- [ ] `PendingJoinRequests.tsx` - Liste der eigenen Beitrittsanfragen
- [ ] `TeamJoinRequests.tsx` - Admin-Ansicht für eingehende Beitrittsanfragen
- [ ] `TeamInvitations.tsx` - Admin-Ansicht für gesendete Einladungen

#### 3.2 Team Leaderboard Component (`client/src/components/teams/TeamLeaderboard.tsx`)

```typescript
import React, { useState, useEffect } from 'react';
import { GamificationService } from '../services/GamificationService';

interface LeaderboardEntry {
  user_id: string;
  user_name: string;
  total_points: number;
  rank: number;
}

export const TeamLeaderboard: React.FC = () => {
  // Implementation with real-time leaderboard updates
  // Visual indicators for point changes
  // User's own position highlighting
};
```

**Features:**
- [ ] Real-time Punktestand-Updates
- [ ] Hervorhebung der eigenen Position
- [ ] Animationen für Rang-Änderungen
- [ ] Responsive Design für mobile Geräte

#### 3.3 Workspace Enhancement für Team-Dokumente

```typescript
// Erweiterung der bestehenden Workspace-Komponenten
// client/src/pages/Workspace.tsx

export const Workspace: React.FC = () => {
  // Existing workspace logic
  
  // Add team documents section
  // Show document author for team documents
  // Filter options: "My Documents" / "Team Documents" / "All"
};
```

**Erweiterte Features:**
- [ ] Filter für eigene vs. Team-Dokumente
- [ ] Autor-Kennzeichnung bei Team-Dokumenten
- [ ] Team-weite Suchfunktion
- [ ] Collaboration-Indikatoren

#### 3.5 Invitation Landing Page

```typescript
// client/src/pages/TeamInvitation.tsx
export const TeamInvitation: React.FC = () => {
  // URL parameter: /team-invitation/:token
  // Shows invitation details and accept/decline options
  // Handles user authentication/registration flow
};
```

**Features:**
- [ ] Öffentliche Einladungsseite (auch für nicht-registrierte User)
- [ ] Automatische Registrierung bei Einladungsannahme
- [ ] Einladungsdetails und Team-Informationen
- [ ] Accept/Decline Buttons mit Bestätigung

```typescript
// client/src/services/TeamService.ts
export class TeamService {
  private baseUrl = '/api/teams';
  
  // Basic team operations
  async getAllTeams(): Promise<Team[]>
  async createTeam(name: string, description: string): Promise<Team>
  async getMyTeam(): Promise<Team | null>
  async leaveTeam(): Promise<void>
  async getTeamLeaderboard(): Promise<LeaderboardEntry[]>
  
  // Join requests
  async createJoinRequest(teamId: string, message?: string): Promise<TeamJoinRequest>
  async getMyJoinRequests(): Promise<TeamJoinRequest[]>
  async withdrawJoinRequest(requestId: string): Promise<void>
  
  // Admin functions
  async inviteUser(teamId: string, email: string, message?: string): Promise<TeamInvitation>
  async getTeamInvitations(teamId: string): Promise<TeamInvitation[]>
  async revokeInvitation(invitationId: string): Promise<void>
  async getTeamJoinRequests(teamId: string): Promise<TeamJoinRequest[]>
  async approveJoinRequest(requestId: string): Promise<void>
  async rejectJoinRequest(requestId: string): Promise<void>
  async removeTeamMember(teamId: string, userId: string): Promise<void>
  async promoteToAdmin(teamId: string, userId: string): Promise<void>
  async demoteFromAdmin(teamId: string, userId: string): Promise<void>
  
  // Invitation handling
  async getInvitationDetails(token: string): Promise<TeamInvitation>
  async acceptInvitation(token: string): Promise<void>
  async declineInvitation(token: string): Promise<void>
  async getMyInvitations(): Promise<TeamInvitation[]>
}

// client/src/services/GamificationService.ts
export class GamificationService {
  private baseUrl = '/api/gamification';
  
  async getTeamLeaderboard(): Promise<LeaderboardEntry[]>
  async getUserPoints(): Promise<number>
  async getPointsHistory(): Promise<PointsHistoryEntry[]>
}

// client/src/services/NotificationService.ts
export class NotificationService {
  private baseUrl = '/api/notifications';
  
  async getUnreadNotifications(): Promise<Notification[]>
  async markAsRead(notificationId: string): Promise<void>
  async getTeamNotifications(): Promise<Notification[]>
}
```

### Phase 4: Integration und Testing (2-3 Arbeitstage)

#### 4.1 Integration Points

**Server-Side Integration:**
- [ ] Team routes in main server (`src/server.ts`)
- [ ] Database connection testing
- [ ] Migration execution verification
- [ ] API endpoint testing

**Frontend Integration:**
- [ ] Navigation menu erweitern (Teams-Link)
- [ ] User context um Team-Information erweitern
- [ ] Notification system für Team-Events integrieren
- [ ] Leaderboard in Dashboard integrieren
- [ ] Workspace-Ansicht um Team-Funktionalität erweitern
- [ ] Invitation landing page routing
- [ ] Team-spezifische Benachrichtigungen

#### 4.2 Testing Strategy

**Backend Tests:**
```typescript
// tests/unit/services/teamService.test.ts
describe('TeamService', () => {
  // Unit tests for all TeamService methods
  // Mock database interactions
  // Test error scenarios
});

// tests/integration/teams.test.ts
describe('Teams API', () => {
  // Integration tests for team endpoints
  // Database transaction testing
  // Authentication testing
});
```

**Frontend Tests:**
```typescript
// client/src/components/teams/__tests__/TeamLeaderboard.test.tsx
describe('TeamLeaderboard', () => {
  // Component rendering tests
  // User interaction tests
  // Data loading tests
});
```

**End-to-End Tests:**
```typescript
// tests/e2e/team-workflow.spec.ts
describe('Team Workflow', () => {
  // Complete user journey: create team, invite member, approve join request, upload document, earn points
  // Multi-user scenarios with admin/member roles
  // Invitation acceptance and join request workflows
  // Points expiry scenarios
  // Permission testing (admin vs. member actions)
});
```

### Phase 5: Deployment und Monitoring (1 Arbeitstag)

#### 5.1 Deployment Checklist

**Database:**
- [ ] Backup vor Migration
- [ ] Migration auf Staging-Umgebung testen
- [ ] Production Migration durchführen
- [ ] Datenintegrität verifizieren

**Backend:**
- [ ] Environment variables für Team-Features setzen
- [ ] Cron Job für Points Cleanup einrichten
- [ ] API endpoints testen
- [ ] Performance monitoring einrichten

**Frontend:**
- [ ] Build und Deploy des erweiterten Frontends
- [ ] Feature flags für schrittweises Rollout
- [ ] E-Mail-Templates für Einladungen und Benachrichtigungen
- [ ] Browser-Kompatibilität testen
- [ ] Mobile Responsiveness verifizieren
- [ ] Invitation link routing konfigurieren

#### 5.2 Monitoring und Metrics

**Key Performance Indicators:**
- [ ] Team-Erstellungsrate
- [ ] Team-Beitrittsrate (via Einladung vs. Anfrage)
- [ ] Einladungsannahmerate
- [ ] Beitrittsanfragen-Genehmigungsrate
- [ ] Durchschnittliche Team-Größe
- [ ] Dokumenten-Sharing-Rate innerhalb Teams
- [ ] Punktevergabe-Häufigkeit
- [ ] User Engagement mit Leaderboard
- [ ] Admin-Aktivitätsrate (Einladungen, Genehmigungen)

**Technical Metrics:**
- [ ] API Response Times für Team-Endpoints
- [ ] Database Query Performance für Team-Queries
- [ ] E-Mail-Delivery Success Rate für Einladungen
- [ ] Points Cleanup Job Success Rate
- [ ] Storage Usage pro Team
- [ ] Invitation token expiry cleanup job performance

### Rollback-Plan

**Wenn Issues auftreten:**

1. **Database Rollback:**
```sql
-- Rollback Migration
DROP TABLE IF EXISTS team_join_requests;
DROP TABLE IF EXISTS team_invitations;
DROP TABLE IF EXISTS document_usage_points;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS teams;
ALTER TABLE user_points DROP COLUMN IF EXISTS expires_at;
ALTER TABLE user_documents DROP COLUMN IF EXISTS uploaded_by_user_id;
```

2. **Code Rollback:**
- Feature flags deaktivieren
- Previous deployment restore
- DNS fallback wenn nötig

3. **Data Recovery:**
- Database backup restore
- User data verification
- Points reconciliation wenn möglich

### Erfolgskriterien

**Funktionale Kriterien:**
- [ ] User können Teams erstellen und werden automatisch zu Admins
- [ ] Team-Admins können Benutzer per E-Mail einladen
- [ ] Benutzer können Beitrittsanfragen mit Nachrichten senden
- [ ] Team-Admins können Beitrittsanfragen genehmigen/ablehnen
- [ ] Team-Dokumente sind für alle Mitglieder sichtbar
- [ ] Punktevergabe funktioniert bei Dokumentennutzung
- [ ] Team-Leaderboard zeigt korrekte, aktuelle Punkte
- [ ] Punkte verfallen automatisch nach 30 Tagen
- [ ] Einladungen haben 7-Tage Ablaufzeit
- [ ] User können nur in einem Team gleichzeitig sein

**Performance Kriterien:**
- [ ] Team-Workspace lädt in < 2 Sekunden
- [ ] Leaderboard-Updates in < 1 Sekunde
- [ ] Such-Performance verschlechtert sich nicht > 20%
- [ ] Points Cleanup Job läuft in < 30 Sekunden

**User Experience Kriterien:**
- [ ] Intuitive Team-Erstellung und -Navigation
- [ ] Klare Visualisierung von Team vs. eigenen Dokumenten
- [ ] Motivierende Leaderboard-Darstellung
- [ ] Mobile-friendly Interface

**Security & Data Integrity:**
- [ ] User können nur eigene Teams verlassen
- [ ] Nur Team-Admins können Einladungen versenden und Anfragen bearbeiten
- [ ] Punktevergabe kann nicht manipuliert werden
- [ ] Team-Dokumente sind nur für Mitglieder sichtbar
- [ ] Einladungs-Token sind sicher und eindeutig
- [ ] Keine SQL-Injection oder XSS Vulnerabilities
- [ ] Berechtigungsprüfungen für alle Admin-Funktionen

---

## Implementation Timeline

**Woche 1:**
- Mo-Di: Phase 1 (Database Schema mit Einladungen/Anfragen)
- Mi-Fr: Phase 2.1-2.3 (Core Backend Services mit Admin-Funktionen)

**Woche 2:**
- Mo-Mi: Phase 2.4-2.7 (Routes, Notifications & Integration)
- Do-Fr: Phase 3.1-3.2 (Frontend Core Components)

**Woche 3:**
- Mo-Mi: Phase 3.3-3.6 (Frontend Integration mit Admin-Features)
- Do-Fr: Phase 4 (Testing & Integration)

**Woche 4:**
- Mo: Phase 5 (Deployment mit E-Mail-Konfiguration)
- Di-Fr: Bug fixes, permission testing, monitoring setup

**Geschätzte Gesamtzeit: 18-22 Arbeitstage** (erweitert um Team-Management-Features)
