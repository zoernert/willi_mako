"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamService = void 0;
const database_1 = __importDefault(require("../config/database"));
const uuid_1 = require("uuid");
const errors_1 = require("../utils/errors");
const crypto_1 = __importDefault(require("crypto"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const emailService_1 = require("./emailService");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class TeamService {
    /**
     * Create a new team
     */
    async createTeam(name, description, createdBy) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Create team
            const teamResult = await client.query(`INSERT INTO teams (name, description, created_by, owner_id) 
         VALUES ($1, $2, $3, $3) 
         RETURNING *`, [name, description, createdBy]);
            const team = teamResult.rows[0];
            // Add creator as owner
            await client.query(`INSERT INTO team_members (team_id, user_id, role) 
         VALUES ($1, $2, 'owner')`, [team.id, createdBy]);
            await client.query('COMMIT');
            return Object.assign(Object.assign({}, team), { member_count: 1 });
        }
        catch (error) {
            await client.query('ROLLBACK');
            if (error.code === '23505') { // Unique violation
                throw new errors_1.AppError('Team name already exists', 400);
            }
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get teams for a specific user
     */
    async getUserTeams(userId) {
        const team = await this.getTeamByUserId(userId);
        return team ? [team] : [];
    }
    /**
     * Get team by user ID
     */
    async getTeamByUserId(userId) {
        const client = await database_1.default.connect();
        try {
            const result = await client.query(`SELECT t.*, COUNT(tm.user_id) as member_count
         FROM teams t
         JOIN team_members tm ON t.id = tm.team_id
         WHERE t.id = (
           SELECT team_id FROM team_members WHERE user_id = $1
         )
         GROUP BY t.id`, [userId]);
            return result.rows[0] || null;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get all teams (for browsing)
     */
    async getAllTeams(limit = 50, offset = 0) {
        const client = await database_1.default.connect();
        try {
            const result = await client.query(`SELECT t.*, u.full_name as creator_name, COUNT(tm.user_id) as member_count
         FROM teams t
         LEFT JOIN users u ON t.created_by = u.id
         LEFT JOIN team_members tm ON t.id = tm.team_id
         GROUP BY t.id, u.full_name
         ORDER BY t.created_at DESC
         LIMIT $1 OFFSET $2`, [limit, offset]);
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get team members
     */
    async getTeamMembers(teamId) {
        const client = await database_1.default.connect();
        try {
            const result = await client.query(`SELECT tm.*, u.full_name as user_name, u.email as user_email
         FROM team_members tm
         JOIN users u ON tm.user_id = u.id
         WHERE tm.team_id = $1
         ORDER BY tm.role DESC, tm.joined_at ASC`, [teamId]);
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    /**
     * Leave team
     */
    async leaveTeam(userId) {
        const client = await database_1.default.connect();
        try {
            const result = await client.query('DELETE FROM team_members WHERE user_id = $1 RETURNING team_id', [userId]);
            if (result.rows.length === 0) {
                throw new errors_1.AppError('User is not in any team', 404);
            }
        }
        finally {
            client.release();
        }
    }
    /**
     * Invite user to team (Admin only)
     */
    async inviteUserToTeam(teamId, invitedEmail, invitedBy, message) {
        var _a;
        const client = await database_1.default.connect();
        try {
            // Check if user is team admin
            const isAdmin = await this.isTeamAdmin(invitedBy, teamId);
            if (!isAdmin) {
                throw new errors_1.AppError('Only team admins can invite users', 403);
            }
            // Check if user is already in a team
            const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [invitedEmail]);
            if (existingUser.rows.length > 0) {
                const userInTeam = await client.query('SELECT 1 FROM team_members WHERE user_id = $1', [existingUser.rows[0].id]);
                if (userInTeam.rows.length > 0) {
                    throw new errors_1.AppError('User is already in a team', 400);
                }
            }
            // Generate invitation token
            const invitationToken = crypto_1.default.randomBytes(32).toString('hex');
            const result = await client.query(`INSERT INTO team_invitations 
         (team_id, invited_by, invited_email, invited_user_id, invitation_token, message)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`, [
                teamId,
                invitedBy,
                invitedEmail,
                ((_a = existingUser.rows[0]) === null || _a === void 0 ? void 0 : _a.id) || null,
                invitationToken,
                message
            ]);
            // Get additional info for response
            const invitationWithDetails = await client.query(`SELECT ti.*, t.name as team_name, u.full_name as invited_by_name
         FROM team_invitations ti
         JOIN teams t ON ti.team_id = t.id
         JOIN users u ON ti.invited_by = u.id
         WHERE ti.id = $1`, [result.rows[0].id]);
            return invitationWithDetails.rows[0];
        }
        finally {
            client.release();
        }
    }
    /**
     * Invite user to team with automatic account creation and email sending
     */
    async inviteUserWithEmail(teamId, invitedEmail, invitedBy, role = 'member', message) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Check if user is team admin
            const isAdmin = await this.isTeamAdmin(invitedBy, teamId);
            if (!isAdmin) {
                throw new errors_1.AppError('Nur Team-Administratoren können Benutzer einladen', 403);
            }
            // Get team details for email
            const teamResult = await client.query('SELECT * FROM teams WHERE id = $1', [teamId]);
            if (teamResult.rows.length === 0) {
                throw new errors_1.AppError('Team nicht gefunden', 404);
            }
            const team = teamResult.rows[0];
            // Get inviter details
            const inviterResult = await client.query('SELECT full_name, name FROM users WHERE id = $1', [invitedBy]);
            const inviter = inviterResult.rows[0];
            const inviterName = (inviter === null || inviter === void 0 ? void 0 : inviter.full_name) || (inviter === null || inviter === void 0 ? void 0 : inviter.name) || 'Unbekannt';
            // Check if user already exists
            let existingUser = await client.query('SELECT id FROM users WHERE email = $1', [invitedEmail]);
            let userId = null;
            let isNewUser = false;
            if (existingUser.rows.length === 0) {
                // Create new user account
                isNewUser = true;
                const tempPassword = crypto_1.default.randomBytes(16).toString('hex');
                const hashedPassword = await bcrypt_1.default.hash(tempPassword, 10);
                // Extract name from email
                const emailName = invitedEmail.split('@')[0];
                const displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
                const newUserResult = await client.query(`INSERT INTO users (id, email, password_hash, name, full_name, role, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING id`, [(0, uuid_1.v4)(), invitedEmail, hashedPassword, displayName, displayName]);
                userId = newUserResult.rows[0].id;
            }
            else {
                userId = existingUser.rows[0].id;
                // Check if existing user is already in a team
                const userInTeam = await client.query('SELECT 1 FROM team_members WHERE user_id = $1', [userId]);
                if (userInTeam.rows.length > 0) {
                    throw new errors_1.AppError('Benutzer ist bereits in einem Team', 400);
                }
            }
            // Generate invitation token
            const invitationToken = crypto_1.default.randomBytes(32).toString('hex');
            // Create invitation
            const invitationResult = await client.query(`INSERT INTO team_invitations 
         (team_id, invited_by, invited_email, invited_user_id, invitation_token, message, role, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP + INTERVAL '7 days')
         RETURNING *`, [teamId, invitedBy, invitedEmail, userId, invitationToken, message, role]);
            const invitation = invitationResult.rows[0];
            // Send invitation email
            const baseUrl = 'https://stromhaltig.de';
            const invitationUrl = `${baseUrl}/invitation/${invitationToken}`;
            await emailService_1.emailService.sendTeamInvitation(invitedEmail, {
                invitedBy: inviterName,
                teamName: team.name,
                teamDescription: team.description,
                invitationToken,
                invitationUrl,
                isNewUser
            });
            await client.query('COMMIT');
            // Return invitation with team details
            const fullInvitation = Object.assign(Object.assign({}, invitation), { team_name: team.name, invited_by_name: inviterName });
            return {
                invitation: fullInvitation,
                isNewUser
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Create join request
     */
    async createJoinRequest(teamId, userId, message) {
        const client = await database_1.default.connect();
        try {
            // Check if user is already in a team
            const userInTeam = await this.isUserInTeam(userId);
            if (userInTeam) {
                throw new errors_1.AppError('User is already in a team', 400);
            }
            const result = await client.query(`INSERT INTO team_join_requests (team_id, user_id, message)
         VALUES ($1, $2, $3)
         RETURNING *`, [teamId, userId, message]);
            // Get additional info for response
            const requestWithDetails = await client.query(`SELECT tjr.*, t.name as team_name, u.full_name as user_name, u.email as user_email
         FROM team_join_requests tjr
         JOIN teams t ON tjr.team_id = t.id
         JOIN users u ON tjr.user_id = u.id
         WHERE tjr.id = $1`, [result.rows[0].id]);
            return requestWithDetails.rows[0];
        }
        catch (error) {
            if (error.code === '23505') { // Unique violation
                throw new errors_1.AppError('Join request already exists for this team', 400);
            }
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Approve join request (Admin only)
     */
    async approveJoinRequest(requestId, respondingUserId) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get request details and verify admin permissions
            const requestResult = await client.query(`SELECT tjr.*, t.name as team_name
         FROM team_join_requests tjr
         JOIN teams t ON tjr.team_id = t.id
         WHERE tjr.id = $1 AND tjr.status = 'pending'`, [requestId]);
            if (requestResult.rows.length === 0) {
                throw new errors_1.AppError('Join request not found or already processed', 404);
            }
            const request = requestResult.rows[0];
            // Check if responding user is team admin
            const isAdmin = await this.isTeamAdmin(respondingUserId, request.team_id);
            if (!isAdmin) {
                throw new errors_1.AppError('Only team admins can approve join requests', 403);
            }
            // Add user to team
            await client.query(`INSERT INTO team_members (team_id, user_id, role)
         VALUES ($1, $2, 'member')`, [request.team_id, request.user_id]);
            // Update request status
            await client.query(`UPDATE team_join_requests 
         SET status = 'approved', responded_at = CURRENT_TIMESTAMP, responded_by = $1
         WHERE id = $2`, [respondingUserId, requestId]);
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Reject join request (Admin only)
     */
    async rejectJoinRequest(requestId, respondingUserId) {
        const client = await database_1.default.connect();
        try {
            // Get request details and verify admin permissions
            const requestResult = await client.query(`SELECT tjr.team_id
         FROM team_join_requests tjr
         WHERE tjr.id = $1 AND tjr.status = 'pending'`, [requestId]);
            if (requestResult.rows.length === 0) {
                throw new errors_1.AppError('Join request not found or already processed', 404);
            }
            const request = requestResult.rows[0];
            // Check if responding user is team admin
            const isAdmin = await this.isTeamAdmin(respondingUserId, request.team_id);
            if (!isAdmin) {
                throw new errors_1.AppError('Only team admins can reject join requests', 403);
            }
            // Update request status
            await client.query(`UPDATE team_join_requests 
         SET status = 'rejected', responded_at = CURRENT_TIMESTAMP, responded_by = $1
         WHERE id = $2`, [respondingUserId, requestId]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Accept invitation
     */
    async acceptInvitation(invitationToken, userId) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get invitation details
            const invitationResult = await client.query(`SELECT * FROM team_invitations 
         WHERE invitation_token = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP`, [invitationToken]);
            if (invitationResult.rows.length === 0) {
                throw new errors_1.AppError('Invalid or expired invitation', 404);
            }
            const invitation = invitationResult.rows[0];
            // Check if user is already in a team
            const userInTeam = await this.isUserInTeam(userId);
            if (userInTeam) {
                throw new errors_1.AppError('User is already in a team', 400);
            }
            // Add user to team
            await client.query(`INSERT INTO team_members (team_id, user_id, role)
         VALUES ($1, $2, 'member')`, [invitation.team_id, userId]);
            // Update invitation status
            await client.query(`UPDATE team_invitations 
         SET status = 'accepted', responded_at = CURRENT_TIMESTAMP, invited_user_id = $1
         WHERE id = $2`, [userId, invitation.id]);
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Remove team member (Admin only)
     */
    async removeTeamMember(teamId, memberUserId, requestingUserId) {
        const client = await database_1.default.connect();
        try {
            // Check if requesting user is team admin
            const isAdmin = await this.isTeamAdmin(requestingUserId, teamId);
            if (!isAdmin) {
                throw new errors_1.AppError('Only team admins can remove members', 403);
            }
            // Cannot remove self
            if (memberUserId === requestingUserId) {
                throw new errors_1.AppError('Cannot remove yourself from team. Use leave team instead.', 400);
            }
            const result = await client.query('DELETE FROM team_members WHERE team_id = $1 AND user_id = $2', [teamId, memberUserId]);
            if (result.rowCount === 0) {
                throw new errors_1.AppError('Member not found in team', 404);
            }
        }
        finally {
            client.release();
        }
    }
    /**
     * Get team join requests (Admin only)
     */
    async getTeamJoinRequests(teamId, requestingUserId) {
        const client = await database_1.default.connect();
        try {
            // Check if requesting user is team admin
            const isAdmin = await this.isTeamAdmin(requestingUserId, teamId);
            if (!isAdmin) {
                throw new errors_1.AppError('Only team admins can view join requests', 403);
            }
            const result = await client.query(`SELECT tjr.*, t.name as team_name, u.full_name as user_name, u.email as user_email,
                responder.full_name as responded_by_name
         FROM team_join_requests tjr
         JOIN teams t ON tjr.team_id = t.id
         JOIN users u ON tjr.user_id = u.id
         LEFT JOIN users responder ON tjr.responded_by = responder.id
         WHERE tjr.team_id = $1
         ORDER BY tjr.created_at DESC`, [teamId]);
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get user's join requests
     */
    async getUserJoinRequests(userId) {
        const client = await database_1.default.connect();
        try {
            const result = await client.query(`SELECT tjr.*, t.name as team_name, u.full_name as user_name, u.email as user_email
         FROM team_join_requests tjr
         JOIN teams t ON tjr.team_id = t.id
         JOIN users u ON tjr.user_id = u.id
         WHERE tjr.user_id = $1
         ORDER BY tjr.created_at DESC`, [userId]);
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    /**
     * Withdraw join request
     */
    async withdrawJoinRequest(requestId, userId) {
        const client = await database_1.default.connect();
        try {
            const result = await client.query(`UPDATE team_join_requests 
         SET status = 'withdrawn'
         WHERE id = $1 AND user_id = $2 AND status = 'pending'`, [requestId, userId]);
            if (result.rowCount === 0) {
                throw new errors_1.AppError('Join request not found or cannot be withdrawn', 404);
            }
        }
        finally {
            client.release();
        }
    }
    /**
     * Get team invitations (Admin only)
     */
    async getTeamInvitations(teamId, requestingUserId) {
        const client = await database_1.default.connect();
        try {
            // Check if requesting user is team admin
            const isAdmin = await this.isTeamAdmin(requestingUserId, teamId);
            if (!isAdmin) {
                throw new errors_1.AppError('Only team admins can view invitations', 403);
            }
            const result = await client.query(`SELECT ti.*, t.name as team_name, u.full_name as invited_by_name,
                invited_user.full_name as invited_user_name
         FROM team_invitations ti
         JOIN teams t ON ti.team_id = t.id
         JOIN users u ON ti.invited_by = u.id
         LEFT JOIN users invited_user ON ti.invited_user_id = invited_user.id
         WHERE ti.team_id = $1
         ORDER BY ti.created_at DESC`, [teamId]);
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    /**
     * Revoke invitation (Admin only)
     */
    async revokeInvitation(invitationId, requestingUserId) {
        const client = await database_1.default.connect();
        try {
            // Get invitation details to check team admin permissions
            const invitationResult = await client.query('SELECT team_id FROM team_invitations WHERE id = $1 AND status = $2', [invitationId, 'pending']);
            if (invitationResult.rows.length === 0) {
                throw new errors_1.AppError('Invitation not found or already processed', 404);
            }
            const teamId = invitationResult.rows[0].team_id;
            // Check if requesting user is team admin
            const isAdmin = await this.isTeamAdmin(requestingUserId, teamId);
            if (!isAdmin) {
                throw new errors_1.AppError('Only team admins can revoke invitations', 403);
            }
            // Update invitation status
            await client.query(`UPDATE team_invitations 
         SET status = 'expired', responded_at = CURRENT_TIMESTAMP
         WHERE id = $1`, [invitationId]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Promote member to admin (Admin only)
     */
    async promoteToAdmin(teamId, memberUserId, requestingUserId) {
        const client = await database_1.default.connect();
        try {
            // Check if requesting user is team admin
            const isAdmin = await this.isTeamAdmin(requestingUserId, teamId);
            if (!isAdmin) {
                throw new errors_1.AppError('Only team admins can promote members', 403);
            }
            // Cannot promote self
            if (memberUserId === requestingUserId) {
                throw new errors_1.AppError('Cannot promote yourself', 400);
            }
            const result = await client.query(`UPDATE team_members 
         SET role = 'admin'
         WHERE team_id = $1 AND user_id = $2 AND role = 'member'`, [teamId, memberUserId]);
            if (result.rowCount === 0) {
                throw new errors_1.AppError('Member not found in team or already an admin', 404);
            }
        }
        finally {
            client.release();
        }
    }
    /**
     * Demote admin to member (Admin only)
     */
    async demoteFromAdmin(teamId, memberUserId, requestingUserId) {
        const client = await database_1.default.connect();
        try {
            // Check if requesting user is team admin
            const isAdmin = await this.isTeamAdmin(requestingUserId, teamId);
            if (!isAdmin) {
                throw new errors_1.AppError('Only team admins can demote members', 403);
            }
            // Cannot demote self
            if (memberUserId === requestingUserId) {
                throw new errors_1.AppError('Cannot demote yourself', 400);
            }
            // Check if there will be at least one admin left
            const adminCountResult = await client.query('SELECT COUNT(*) as admin_count FROM team_members WHERE team_id = $1 AND role = $2', [teamId, 'admin']);
            const adminCount = parseInt(adminCountResult.rows[0].admin_count);
            if (adminCount <= 1) {
                throw new errors_1.AppError('Cannot demote the last admin. Promote another member first.', 400);
            }
            const result = await client.query(`UPDATE team_members 
         SET role = 'member'
         WHERE team_id = $1 AND user_id = $2 AND role = 'admin'`, [teamId, memberUserId]);
            if (result.rowCount === 0) {
                throw new errors_1.AppError('Admin not found in team or already a member', 404);
            }
        }
        finally {
            client.release();
        }
    }
    /**
     * Decline invitation
     */
    async declineInvitation(invitationToken) {
        const client = await database_1.default.connect();
        try {
            const result = await client.query(`UPDATE team_invitations 
         SET status = 'declined', responded_at = CURRENT_TIMESTAMP
         WHERE invitation_token = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP`, [invitationToken]);
            if (result.rowCount === 0) {
                throw new errors_1.AppError('Invalid or expired invitation', 404);
            }
        }
        finally {
            client.release();
        }
    }
    /**
     * Get user invitations by email
     */
    async getUserInvitations(userEmail) {
        const client = await database_1.default.connect();
        try {
            const result = await client.query(`SELECT ti.*, t.name as team_name, u.full_name as invited_by_name
         FROM team_invitations ti
         JOIN teams t ON ti.team_id = t.id
         JOIN users u ON ti.invited_by = u.id
         WHERE ti.invited_email = $1
         ORDER BY ti.created_at DESC`, [userEmail]);
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    /**
     * Accept invitation with automatic login for new users
     */
    async acceptInvitationWithLogin(invitationToken, userIdForExisting) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get invitation details
            const invitationResult = await client.query(`SELECT ti.*, t.name as team_name, u.full_name as invited_by_name
         FROM team_invitations ti
         JOIN teams t ON ti.team_id = t.id
         JOIN users u ON ti.invited_by = u.id
         WHERE ti.invitation_token = $1 AND ti.status = 'pending' AND ti.expires_at > CURRENT_TIMESTAMP`, [invitationToken]);
            if (invitationResult.rows.length === 0) {
                throw new errors_1.AppError('Einladung ist ungültig oder abgelaufen', 404);
            }
            const invitation = invitationResult.rows[0];
            let userId = invitation.invited_user_id;
            let isNewUser = false;
            let authToken = null;
            // If this is for an existing user, verify they are logged in
            if (userIdForExisting) {
                if (userId !== userIdForExisting) {
                    throw new errors_1.AppError('Diese Einladung ist nicht für Ihren Account bestimmt', 403);
                }
            }
            else if (!userId) {
                throw new errors_1.AppError('Fehler: Benutzer-ID nicht gefunden', 400);
            }
            // Get user details
            const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
            if (userResult.rows.length === 0) {
                throw new errors_1.AppError('Benutzer nicht gefunden', 404);
            }
            const user = userResult.rows[0];
            // Check if user is already in a team
            const userInTeam = await this.isUserInTeam(userId);
            if (userInTeam) {
                throw new errors_1.AppError('Benutzer ist bereits in einem Team', 400);
            }
            // Add user to team with the invited role
            await client.query(`INSERT INTO team_members (team_id, user_id, role)
         VALUES ($1, $2, $3)`, [invitation.team_id, userId, invitation.role || 'member']);
            // Update invitation status
            await client.query(`UPDATE team_invitations 
         SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
         WHERE id = $1`, [invitation.id]);
            // Generate auth token if this is a new user accepting without being logged in
            if (!userIdForExisting) {
                const secret = process.env.JWT_SECRET || 'fallback-secret';
                authToken = jsonwebtoken_1.default.sign({
                    id: user.id,
                    email: user.email,
                    role: user.role
                }, secret, { expiresIn: '24h' });
                isNewUser = true;
            }
            await client.query('COMMIT');
            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    full_name: user.full_name,
                    role: user.role
                },
                token: authToken || undefined,
                isNewUser
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    // Helper methods
    /**
     * Check if user is in any team
     */
    async isUserInTeam(userId) {
        const client = await database_1.default.connect();
        try {
            const result = await client.query('SELECT 1 FROM team_members WHERE user_id = $1', [userId]);
            return result.rows.length > 0;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get user's team ID
     */
    async getUserTeamId(userId) {
        var _a;
        const client = await database_1.default.connect();
        try {
            const result = await client.query('SELECT team_id FROM team_members WHERE user_id = $1', [userId]);
            return ((_a = result.rows[0]) === null || _a === void 0 ? void 0 : _a.team_id) || null;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get team member IDs
     */
    async getTeamMemberIds(teamId) {
        const client = await database_1.default.connect();
        try {
            const result = await client.query('SELECT user_id FROM team_members WHERE team_id = $1', [teamId]);
            return result.rows.map(row => row.user_id);
        }
        finally {
            client.release();
        }
    }
    /**
     * Check if user is team admin
     */
    async isTeamAdmin(userId, teamId) {
        const client = await database_1.default.connect();
        try {
            const result = await client.query('SELECT 1 FROM team_members WHERE user_id = $1 AND team_id = $2 AND role IN ($3, $4)', [userId, teamId, 'admin', 'owner']);
            return result.rows.length > 0;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get invitation by token
     */
    async getInvitationByToken(token) {
        const client = await database_1.default.connect();
        try {
            const result = await client.query(`SELECT ti.*, t.name as team_name, u.full_name as invited_by_name
         FROM team_invitations ti
         JOIN teams t ON ti.team_id = t.id
         JOIN users u ON ti.invited_by = u.id
         WHERE ti.invitation_token = $1`, [token]);
            return result.rows[0] || null;
        }
        finally {
            client.release();
        }
    }
}
exports.TeamService = TeamService;
//# sourceMappingURL=teamService.js.map