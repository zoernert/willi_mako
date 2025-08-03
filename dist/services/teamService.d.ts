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
    createTeam(name: string, description: string, createdBy: string): Promise<Team>;
    getUserTeams(userId: string): Promise<Team[]>;
    getTeamByUserId(userId: string): Promise<Team | null>;
    getAllTeams(limit?: number, offset?: number): Promise<Team[]>;
    getTeamMembers(teamId: string): Promise<TeamMember[]>;
    leaveTeam(userId: string): Promise<void>;
    inviteUserToTeam(teamId: string, invitedEmail: string, invitedBy: string, message?: string): Promise<TeamInvitation>;
    inviteUserWithEmail(teamId: string, invitedEmail: string, invitedBy: string, role?: 'member' | 'admin', message?: string): Promise<{
        invitation: TeamInvitation;
        isNewUser: boolean;
    }>;
    createJoinRequest(teamId: string, userId: string, message?: string): Promise<TeamJoinRequest>;
    approveJoinRequest(requestId: string, respondingUserId: string): Promise<void>;
    rejectJoinRequest(requestId: string, respondingUserId: string): Promise<void>;
    acceptInvitation(invitationToken: string, userId: string): Promise<void>;
    removeTeamMember(teamId: string, memberUserId: string, requestingUserId: string): Promise<void>;
    getTeamJoinRequests(teamId: string, requestingUserId: string): Promise<TeamJoinRequest[]>;
    getUserJoinRequests(userId: string): Promise<TeamJoinRequest[]>;
    withdrawJoinRequest(requestId: string, userId: string): Promise<void>;
    getTeamInvitations(teamId: string, requestingUserId: string): Promise<TeamInvitation[]>;
    revokeInvitation(invitationId: string, requestingUserId: string): Promise<void>;
    promoteToAdmin(teamId: string, memberUserId: string, requestingUserId: string): Promise<void>;
    demoteFromAdmin(teamId: string, memberUserId: string, requestingUserId: string): Promise<void>;
    declineInvitation(invitationToken: string): Promise<void>;
    getUserInvitations(userEmail: string): Promise<TeamInvitation[]>;
    acceptInvitationWithLogin(invitationToken: string, userIdForExisting?: string): Promise<{
        success: boolean;
        user: any;
        token?: string;
        isNewUser: boolean;
    }>;
    isUserInTeam(userId: string): Promise<boolean>;
    getUserTeamId(userId: string): Promise<string | null>;
    getTeamMemberIds(teamId: string): Promise<string[]>;
    isTeamAdmin(userId: string, teamId: string): Promise<boolean>;
    getInvitationByToken(token: string): Promise<TeamInvitation | null>;
}
//# sourceMappingURL=teamService.d.ts.map