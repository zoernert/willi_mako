import apiClient from './apiClient';
import { API_ENDPOINTS } from './apiEndpoints';

// Types based on the backend implementation
export interface User {
  id: string;
  name: string;
  email: string;
  full_name?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  member_count?: number;
  owner?: User;
}

export interface TeamMember {
  user_id: string;
  team_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  user?: User;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: 'admin' | 'member';
  created_by: string;
  created_at: string;
  expires_at: string;
  team?: Team;
  creator?: User;
}

export interface JoinRequest {
  id: string;
  team_id: string;
  user_id: string;
  message?: string;
  created_at: string;
  user?: User;
  team?: Team;
}

export interface LeaderboardEntry {
  user_id: string;
  user?: User;
  total_points: number;
  document_points: number;
  quiz_points: number;
  rank: number;
}

export interface TeamAnalytics {
  member_count: number;
  documents_shared: number;
  total_points: number;
  quiz_attempts: number;
  active_members_last_30_days: number;
}

// Team Service
export class TeamService {
  // Team CRUD
  static async getTeams(): Promise<Team[]> {
    return apiClient.get<Team[]>(API_ENDPOINTS.teams.list);
  }

  static async getTeam(teamId: string): Promise<Team> {
    return apiClient.get<Team>(API_ENDPOINTS.teams.detail(teamId));
  }

  static async createTeam(data: { name: string; description?: string }): Promise<Team> {
    return apiClient.post<Team>(API_ENDPOINTS.teams.create, data);
  }

  static async updateTeam(teamId: string, data: { name?: string; description?: string }): Promise<Team> {
    return apiClient.put<Team>(API_ENDPOINTS.teams.update(teamId), data);
  }

  static async deleteTeam(teamId: string): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.teams.delete(teamId));
  }

  static async leaveTeam(): Promise<void> {
    return apiClient.delete<void>('/teams/leave');
  }

  // Team Members
  static async getMembers(teamId: string): Promise<TeamMember[]> {
    return apiClient.get<TeamMember[]>(API_ENDPOINTS.teams.members(teamId));
  }

  static async addMember(teamId: string, data: { user_id: string; role?: 'admin' | 'member' }): Promise<TeamMember> {
    return apiClient.post<TeamMember>(API_ENDPOINTS.teams.addMember(teamId), data);
  }

  static async removeMember(teamId: string, userId: string): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.teams.removeMember(teamId, userId));
  }

  static async updateMemberRole(teamId: string, userId: string, role: 'admin' | 'member'): Promise<TeamMember> {
    return apiClient.put<TeamMember>(API_ENDPOINTS.teams.updateRole(teamId, userId), { role });
  }

  // Invitations
  static async createInvitation(teamId: string, data: { email: string; role?: 'admin' | 'member'; message?: string }): Promise<{ invitation: TeamInvitation; isNewUser: boolean }> {
    return apiClient.post<{ invitation: TeamInvitation; isNewUser: boolean }>(API_ENDPOINTS.teams.invitations.create(teamId), data);
  }

  static async getInvitations(teamId: string): Promise<TeamInvitation[]> {
    return apiClient.get<TeamInvitation[]>(API_ENDPOINTS.teams.invitations.list(teamId));
  }

  static async revokeInvitation(teamId: string, invitationId: string): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.teams.invitations.revoke(teamId, invitationId));
  }

  static async getInvitationInfo(token: string): Promise<TeamInvitation> {
    return apiClient.get<TeamInvitation>(API_ENDPOINTS.teams.invitations.info(token));
  }

  static async acceptInvitation(token: string): Promise<{ token?: string; user?: User; isNewUser: boolean }> {
    return apiClient.post<{ token?: string; user?: User; isNewUser: boolean }>(API_ENDPOINTS.teams.invitations.accept(token));
  }

  static async acceptInvitationAuthenticated(token: string): Promise<{ team: Team; user: User }> {
    return apiClient.post<{ team: Team; user: User }>(API_ENDPOINTS.teams.invitations.acceptAuthenticated(token));
  }

  static async declineInvitation(token: string): Promise<void> {
    return apiClient.post<void>(API_ENDPOINTS.teams.invitations.decline(token));
  }

  // Join Requests
  static async createJoinRequest(teamId: string, message?: string): Promise<JoinRequest> {
    return apiClient.post<JoinRequest>(API_ENDPOINTS.teams.joinRequests.create(teamId), { message });
  }

  static async getJoinRequests(teamId: string): Promise<JoinRequest[]> {
    return apiClient.get<JoinRequest[]>(API_ENDPOINTS.teams.joinRequests.list(teamId));
  }

  static async approveJoinRequest(teamId: string, requestId: string): Promise<void> {
    return apiClient.post<void>(API_ENDPOINTS.teams.joinRequests.approve(teamId, requestId));
  }

  static async rejectJoinRequest(teamId: string, requestId: string): Promise<void> {
    return apiClient.post<void>(API_ENDPOINTS.teams.joinRequests.reject(teamId, requestId));
  }

  // Leaderboard
  static async getLeaderboard(teamId: string): Promise<LeaderboardEntry[]> {
    return apiClient.get<LeaderboardEntry[]>(API_ENDPOINTS.teams.leaderboard(teamId));
  }

  // Admin functions
  static async transferOwnership(teamId: string, newOwnerId: string): Promise<void> {
    return apiClient.post<void>(API_ENDPOINTS.teams.admin.transferOwnership(teamId), { new_owner_id: newOwnerId });
  }

  static async getAnalytics(teamId: string): Promise<TeamAnalytics> {
    return apiClient.get<TeamAnalytics>(API_ENDPOINTS.teams.admin.analytics(teamId));
  }
}

export default TeamService;
