import { TeamService } from '../../../src/services/teamService';
import pool from '../../../src/config/database';

// Mock the database pool
jest.mock('../../../src/config/database', () => ({
  connect: jest.fn(),
  query: jest.fn(),
}));

describe('TeamService', () => {
  let teamService: TeamService;
  let mockClient: any;

  beforeEach(() => {
    teamService = new TeamService();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTeam', () => {
    it('should create a team successfully', async () => {
      const mockTeam = {
        id: 'team-id-1',
        name: 'Test Team',
        description: 'A test team',
        created_by: 'user-id-1',
        member_count: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockTeam] }) // INSERT team
        .mockResolvedValueOnce({ rows: [] }) // INSERT team member
        .mockResolvedValueOnce({ rows: [{ ...mockTeam, member_count: 1 }] }); // SELECT with member count

      const result = await teamService.createTeam('Test Team', 'A test team', 'user-id-1');

      expect(result).toEqual(expect.objectContaining({
        name: 'Test Team',
        description: 'A test team',
        created_by: 'user-id-1',
      }));
      expect(mockClient.query).toHaveBeenCalledTimes(3);
    });

    it('should throw error for duplicate team name', async () => {
      mockClient.query.mockRejectedValueOnce({
        code: '23505', // Unique violation
      });

      await expect(
        teamService.createTeam('Duplicate Team', 'Description', 'user-id-1')
      ).rejects.toThrow('Team name already exists');
    });
  });

  describe('isUserInTeam', () => {
    it('should return true if user is in a team', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ team_id: 'team-id-1' }] });

      const result = await teamService.isUserInTeam('user-id-1');

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT 1 FROM team_members WHERE user_id = $1',
        ['user-id-1']
      );
    });

    it('should return false if user is not in a team', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await teamService.isUserInTeam('user-id-1');

      expect(result).toBe(false);
    });
  });

  describe('isTeamAdmin', () => {
    it('should return true if user is team admin', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

      const result = await teamService.isTeamAdmin('user-id-1', 'team-id-1');

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT 1 FROM team_members WHERE user_id = $1 AND team_id = $2 AND role = $3',
        ['user-id-1', 'team-id-1', 'admin']
      );
    });

    it('should return false if user is not team admin', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await teamService.isTeamAdmin('user-id-1', 'team-id-1');

      expect(result).toBe(false);
    });
  });

  describe('createJoinRequest', () => {
    it('should create a join request successfully', async () => {
      const mockJoinRequest = {
        id: 'request-id-1',
        team_id: 'team-id-1',
        user_id: 'user-id-1',
        message: 'Please let me join',
        status: 'pending',
      };

      // Mock isUserInTeam to return false
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // isUserInTeam check
        .mockResolvedValueOnce({ rows: [mockJoinRequest] }) // INSERT join request
        .mockResolvedValueOnce({ rows: [{ ...mockJoinRequest, team_name: 'Test Team', user_name: 'John Doe', user_email: 'john@example.com' }] }); // SELECT with details

      const result = await teamService.createJoinRequest('team-id-1', 'user-id-1', 'Please let me join');

      expect(result).toEqual(expect.objectContaining({
        team_id: 'team-id-1',
        user_id: 'user-id-1',
        message: 'Please let me join',
        status: 'pending',
      }));
      expect(mockClient.query).toHaveBeenCalledTimes(3);
    });

    it('should throw error if user is already in a team', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ team_id: 'existing-team' }] }); // isUserInTeam returns true

      await expect(
        teamService.createJoinRequest('team-id-1', 'user-id-1', 'Please let me join')
      ).rejects.toThrow('User is already in a team');
    });
  });
});
