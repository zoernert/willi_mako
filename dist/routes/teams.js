"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamRoutes = void 0;
const express_1 = require("express");
const teamService_1 = require("../services/teamService");
const gamification_service_1 = require("../modules/quiz/gamification.service");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
exports.teamRoutes = router;
const teamService = new teamService_1.TeamService();
const gamificationService = new gamification_service_1.GamificationService();
// ===== PUBLIC INVITATION ROUTES (No Auth Required) =====
// GET /api/teams/invitations/:token - Get invitation details
router.get('/invitations/:token', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { token } = req.params;
    const invitation = await teamService.getInvitationByToken(token);
    if (!invitation) {
        throw new errorHandler_1.AppError('Invalid or expired invitation', 404);
    }
    res.json({
        success: true,
        data: invitation
    });
}));
// POST /api/teams/invitations/:token/accept - Accept invitation (for new users without login)
router.post('/invitations/:token/accept', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { token } = req.params;
    const result = await teamService.acceptInvitationWithLogin(token);
    res.json({
        success: true,
        data: result,
        message: result.isNewUser
            ? 'Willkommen! Ihr Account wurde aktiviert und Sie wurden dem Team hinzugefügt.'
            : 'Einladung erfolgreich angenommen'
    });
}));
// POST /api/teams/invitations/:token/accept-authenticated - Accept invitation (for existing logged-in users)
router.post('/invitations/:token/accept-authenticated', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { token } = req.params;
    const userId = req.user.id;
    const result = await teamService.acceptInvitationWithLogin(token, userId);
    res.json({
        success: true,
        data: result,
        message: 'Einladung erfolgreich angenommen'
    });
}));
// POST /api/teams/invitations/:token/decline - Decline invitation
router.post('/invitations/:token/decline', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { token } = req.params;
    await teamService.declineInvitation(token);
    res.json({
        success: true,
        message: 'Invitation declined successfully'
    });
}));
// ===== AUTHENTICATED ROUTES =====
// Apply authentication to all remaining routes
router.use(auth_1.authenticateToken);
// GET /api/teams - Get current user's teams  
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const teams = await teamService.getUserTeams(userId);
    res.json({
        success: true,
        data: teams
    });
}));
// GET /api/teams/browse - Browse all teams
router.get('/browse', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;
    const teams = await teamService.getAllTeams(parseInt(limit), parseInt(offset));
    res.json({
        success: true,
        data: teams,
        pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: teams.length
        }
    });
}));
// POST /api/teams - Create new team
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { name, description } = req.body;
    const userId = req.user.id;
    if (!name || name.trim().length === 0) {
        throw new errorHandler_1.AppError('Team name is required', 400);
    }
    // Check if user is already in a team
    const userInTeam = await teamService.isUserInTeam(userId);
    if (userInTeam) {
        throw new errorHandler_1.AppError('User is already in a team', 400);
    }
    const team = await teamService.createTeam(name.trim(), (description === null || description === void 0 ? void 0 : description.trim()) || '', userId);
    res.status(201).json({
        success: true,
        data: team,
        message: 'Team created successfully'
    });
}));
// GET /api/teams/my-team - Get current user's team
router.get('/my-team', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const team = await teamService.getTeamByUserId(userId);
    if (!team) {
        return res.json({
            success: true,
            data: null,
            message: 'User is not in any team'
        });
    }
    // Get team members
    const members = await teamService.getTeamMembers(team.id);
    return res.json({
        success: true,
        data: Object.assign(Object.assign({}, team), { members })
    });
}));
// POST /api/teams/:teamId/join-request - Create join request
router.post('/:teamId/join-request', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { teamId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;
    const joinRequest = await teamService.createJoinRequest(teamId, userId, message);
    res.status(201).json({
        success: true,
        data: joinRequest,
        message: 'Join request sent successfully'
    });
}));
// GET /api/teams/join-requests - Get user's join requests
router.get('/join-requests', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const joinRequests = await teamService.getUserJoinRequests(userId);
    res.json({
        success: true,
        data: joinRequests
    });
}));
// DELETE /api/teams/join-requests/:requestId - Withdraw join request
router.delete('/join-requests/:requestId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { requestId } = req.params;
    const userId = req.user.id;
    await teamService.withdrawJoinRequest(requestId, userId);
    res.json({
        success: true,
        message: 'Join request withdrawn successfully'
    });
}));
// DELETE /api/teams/leave - Leave current team
router.delete('/leave', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    await teamService.leaveTeam(userId);
    res.json({
        success: true,
        message: 'Left team successfully'
    });
}));
// GET /api/teams/leaderboard - Get team leaderboard
router.get('/leaderboard', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { limit = 10 } = req.query;
    const teamId = await teamService.getUserTeamId(userId);
    if (!teamId) {
        throw new errorHandler_1.AppError('User is not in any team', 404);
    }
    const leaderboard = await gamificationService.getTeamLeaderboard(teamId, parseInt(limit));
    res.json({
        success: true,
        data: leaderboard
    });
}));
// GET /api/teams/:teamId/leaderboard - Get specific team leaderboard
router.get('/:teamId/leaderboard', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { teamId } = req.params;
    const { limit = 10 } = req.query;
    const leaderboard = await gamificationService.getTeamLeaderboard(teamId, parseInt(limit));
    res.json({
        success: true,
        data: leaderboard
    });
}));
// ===== ADMIN ROUTES =====
// Middleware to check team admin permissions
const checkTeamAdmin = (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const { teamId } = req.params;
    const userId = req.user.id;
    if (!teamId) {
        throw new errorHandler_1.AppError('Team ID is required', 400);
    }
    const isAdmin = await teamService.isTeamAdmin(userId, teamId);
    if (!isAdmin) {
        throw new errorHandler_1.AppError('Only team admins can perform this action', 403);
    }
    next();
});
// POST /api/teams/:teamId/invite - Invite user to team with email (Admin only)
router.post('/:teamId/invite', checkTeamAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { teamId } = req.params;
    const { email, role = 'member', message } = req.body;
    const userId = req.user.id;
    if (!email || !email.includes('@')) {
        throw new errorHandler_1.AppError('Gültige E-Mail-Adresse ist erforderlich', 400);
    }
    if (role && !['member', 'admin'].includes(role)) {
        throw new errorHandler_1.AppError('Rolle muss "member" oder "admin" sein', 400);
    }
    const result = await teamService.inviteUserWithEmail(teamId, email.trim().toLowerCase(), userId, role, message);
    res.status(201).json({
        success: true,
        data: result.invitation,
        isNewUser: result.isNewUser,
        message: result.isNewUser
            ? 'Neuer Account erstellt und Einladung per E-Mail gesendet'
            : 'Einladung per E-Mail gesendet'
    });
}));
// GET /api/teams/:teamId/invitations - Get team invitations (Admin only)
router.get('/:teamId/invitations', checkTeamAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { teamId } = req.params;
    const userId = req.user.id;
    const invitations = await teamService.getTeamInvitations(teamId, userId);
    res.json({
        success: true,
        data: invitations
    });
}));
// DELETE /api/teams/invitations/:invitationId - Revoke invitation (Admin only)
router.delete('/invitations/:invitationId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { invitationId } = req.params;
    const userId = req.user.id;
    await teamService.revokeInvitation(invitationId, userId);
    res.json({
        success: true,
        message: 'Invitation revoked successfully'
    });
}));
// GET /api/teams/:teamId/join-requests - Get team's join requests (Admin only)
router.get('/:teamId/join-requests', checkTeamAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { teamId } = req.params;
    const userId = req.user.id;
    const joinRequests = await teamService.getTeamJoinRequests(teamId, userId);
    res.json({
        success: true,
        data: joinRequests
    });
}));
// POST /api/teams/join-requests/:requestId/approve - Approve join request (Admin only)
router.post('/join-requests/:requestId/approve', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { requestId } = req.params;
    const userId = req.user.id;
    await teamService.approveJoinRequest(requestId, userId);
    res.json({
        success: true,
        message: 'Join request approved successfully'
    });
}));
// POST /api/teams/join-requests/:requestId/reject - Reject join request (Admin only)
router.post('/join-requests/:requestId/reject', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { requestId } = req.params;
    const userId = req.user.id;
    await teamService.rejectJoinRequest(requestId, userId);
    res.json({
        success: true,
        message: 'Join request rejected successfully'
    });
}));
// Middleware to check team membership (any member can access)
const checkTeamMembership = (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const { teamId } = req.params;
    const userId = req.user.id;
    if (!teamId) {
        throw new errorHandler_1.AppError('Team ID is required', 400);
    }
    // Check if user is a member of this team
    const client = await database_1.default.connect();
    try {
        const result = await client.query('SELECT 1 FROM team_members WHERE user_id = $1 AND team_id = $2', [userId, teamId]);
        if (result.rows.length === 0) {
            throw new errorHandler_1.AppError('You are not a member of this team', 403);
        }
    }
    finally {
        client.release();
    }
    next();
});
// GET /api/teams/:teamId/members - Get team members (Team members only)
router.get('/:teamId/members', auth_1.authenticateToken, checkTeamMembership, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { teamId } = req.params;
    const members = await teamService.getTeamMembers(teamId);
    res.json({
        success: true,
        data: members
    });
}));
// DELETE /api/teams/:teamId/members/:memberId - Remove team member (Admin only)
router.delete('/:teamId/members/:memberId', checkTeamAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { teamId, memberId } = req.params;
    const userId = req.user.id;
    await teamService.removeTeamMember(teamId, memberId, userId);
    res.json({
        success: true,
        message: 'Team member removed successfully'
    });
}));
// POST /api/teams/:teamId/members/:memberId/promote - Promote to admin (Admin only)
router.post('/:teamId/members/:memberId/promote', checkTeamAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { teamId, memberId } = req.params;
    const userId = req.user.id;
    await teamService.promoteToAdmin(teamId, memberId, userId);
    res.json({
        success: true,
        message: 'Member promoted to admin successfully'
    });
}));
// POST /api/teams/:teamId/members/:memberId/demote - Demote from admin (Admin only)
router.post('/:teamId/members/:memberId/demote', checkTeamAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { teamId, memberId } = req.params;
    const userId = req.user.id;
    await teamService.demoteFromAdmin(teamId, memberId, userId);
    res.json({
        success: true,
        message: 'Admin demoted to member successfully'
    });
}));
// GET /api/teams/all - List all teams (for browsing)
router.get('/all', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;
    const teams = await teamService.getAllTeams(parseInt(limit), parseInt(offset));
    res.json({
        success: true,
        data: teams,
        pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: teams.length
        }
    });
}));
//# sourceMappingURL=teams.js.map