export interface Team {
    id: string;
    name: string;
    description?: string;
    created_by: string;
    owner_id: string;
    member_count: number;
    created_at: Date;
    updated_at: Date;
}
export interface TeamMember {
    id: string;
    team_id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    role: 'member' | 'admin' | 'owner';
    joined_at: Date;
}
export interface TeamInvitation {
    id: string;
    team_id: string;
    team_name: string;
    invited_by: string;
    invited_by_name: string;
    invited_email: string;
    invited_user_id?: string;
    invitation_token: string;
    message?: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    expires_at: Date;
    created_at: Date;
    responded_at?: Date;
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
export declare class TeamService {
    /**
     * Create a new team
     */
    createTeam(name: string, description: string, createdBy: string): Promise<Team>;
    /**
     * Get teams for a specific user
     */
    getUserTeams(userId: string): Promise<Team[]>;
    /**
     * Get team by user ID
     */
    getTeamByUserId(userId: string): Promise<Team | null>;
    /**
     * Get all teams (for browsing)
     */
    getAllTeams(limit?: number, offset?: number): Promise<Team[]>;
    /**
     * Get team members
     */
    getTeamMembers(teamId: string): Promise<TeamMember[]>;
    /**
     * Leave team
     */
    leaveTeam(userId: string): Promise<void>;
    /**
     * Invite user to team (Admin only)
     */
    inviteUserToTeam(teamId: string, invitedEmail: string, invitedBy: string, message?: string): Promise<TeamInvitation>;
    /**
     * Invite user to team with automatic account creation and email sending
     */
    inviteUserWithEmail(teamId: string, invitedEmail: string, invitedBy: string, role?: 'member' | 'admin', message?: string): Promise<{
        invitation: TeamInvitation;
        isNewUser: boolean;
    }>;
    /**
     * Create join request
     */
    createJoinRequest(teamId: string, userId: string, message?: string): Promise<TeamJoinRequest>;
    /**
     * Approve join request (Admin only)
     */
    approveJoinRequest(requestId: string, respondingUserId: string): Promise<void>;
    /**
     * Reject join request (Admin only)
     */
    rejectJoinRequest(requestId: string, respondingUserId: string): Promise<void>;
    /**
     * Accept invitation
     */
    acceptInvitation(invitationToken: string, userId: string): Promise<void>;
    /**
     * Remove team member (Admin only)
     */
    removeTeamMember(teamId: string, memberUserId: string, requestingUserId: string): Promise<void>;
    /**
     * Get team join requests (Admin only)
     */
    getTeamJoinRequests(teamId: string, requestingUserId: string): Promise<TeamJoinRequest[]>;
    /**
     * Get user's join requests
     */
    getUserJoinRequests(userId: string): Promise<TeamJoinRequest[]>;
    /**
     * Withdraw join request
     */
    withdrawJoinRequest(requestId: string, userId: string): Promise<void>;
    /**
     * Get team invitations (Admin only)
     */
    getTeamInvitations(teamId: string, requestingUserId: string): Promise<TeamInvitation[]>;
    /**
     * Revoke invitation (Admin only)
     */
    revokeInvitation(invitationId: string, requestingUserId: string): Promise<void>;
    /**
     * Promote member to admin (Admin only)
     */
    promoteToAdmin(teamId: string, memberUserId: string, requestingUserId: string): Promise<void>;
    /**
     * Demote admin to member (Admin only)
     */
    demoteFromAdmin(teamId: string, memberUserId: string, requestingUserId: string): Promise<void>;
    /**
     * Decline invitation
     */
    declineInvitation(invitationToken: string): Promise<void>;
    /**
     * Get user invitations by email
     */
    getUserInvitations(userEmail: string): Promise<TeamInvitation[]>;
    /**
     * Accept invitation with automatic login for new users
     */
    acceptInvitationWithLogin(invitationToken: string, userIdForExisting?: string): Promise<{
        success: boolean;
        user: any;
        token?: string;
        isNewUser: boolean;
    }>;
    /**
     * Check if user is in any team
     */
    isUserInTeam(userId: string): Promise<boolean>;
    /**
     * Get user's team ID
     */
    getUserTeamId(userId: string): Promise<string | null>;
    /**
     * Get team member IDs
     */
    getTeamMemberIds(teamId: string): Promise<string[]>;
    /**
     * Check if user is team admin
     */
    isTeamAdmin(userId: string, teamId: string): Promise<boolean>;
    /**
     * Get invitation by token
     */
    getInvitationByToken(token: string): Promise<TeamInvitation | null>;
    /**
     * Check if user has access to team (is member, admin, or owner)
     */
    hasTeamAccess(userId: string, teamId: string): Promise<boolean>;
    /**
     * Check if user has admin access to team (is admin or owner)
     */
    hasTeamAdminAccess(userId: string, teamId: string): Promise<boolean>;
}
//# sourceMappingURL=teamService.d.ts.map