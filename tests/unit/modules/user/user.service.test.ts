import { UserService } from '../../../../src/modules/user/user.service';
import { DatabaseHelper } from '../../../../src/utils/database';
import { User, UserPreferences, UserProfile } from '../../../../src/modules/user/user.interface';
import { AppError } from '../../../../src/utils/errors';
import geminiService from '../../../../src/services/gemini';

// Mock dependencies
jest.mock('../../../../src/utils/database');
jest.mock('../../../../src/services/gemini');

const mockUser: User = {
  id: '1',
  email: 'test@test.com',
  full_name: 'Test User',
  company: 'Test Inc.',
  role: 'user',
  created_at: new Date().toISOString(),
};

const mockPreferences: UserPreferences = {
    companies_of_interest: [],
    preferred_topics: [],
    notification_settings: {},
};

const mockProfile: UserProfile = {
    expertise_level: 'beginner',
    communication_style: 'casual',
    preferred_terminology: [],
    knowledge_areas: [],
    company_type: '',
    experience_topics: [],
    learning_progress: {
      completed_topics: [],
      current_focus: '',
    },
    interaction_patterns: {
      question_types: [],
      response_preferences: [],
    },
    last_updated: new Date().toISOString(),
};


describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should return a user when found', async () => {
      (DatabaseHelper.executeQuerySingle as jest.Mock).mockResolvedValue(mockUser);

      const user = await userService.getUserById('1');

      expect(user).toEqual(mockUser);
      expect(DatabaseHelper.executeQuerySingle).toHaveBeenCalledWith(
        'SELECT id, email, full_name, company, created_at, user_profile FROM users WHERE id = $1',
        ['1']
      );
    });

    it('should throw an AppError if user not found', async () => {
      (DatabaseHelper.executeQuerySingle as jest.Mock).mockResolvedValue(null);

      await expect(userService.getUserById('1')).rejects.toThrow(new AppError('User not found', 404));
    });
  });

  describe('updateUser', () => {
    it('should update and return the user', async () => {
      const updatedUser = { ...mockUser, full_name: 'Updated Name' };
      (DatabaseHelper.executeQuerySingle as jest.Mock).mockResolvedValue(updatedUser);

      const user = await userService.updateUser('1', 'Updated Name', 'Test Inc.');

      expect(user).toEqual(updatedUser);
      expect(DatabaseHelper.executeQuerySingle).toHaveBeenCalledWith(
        'UPDATE users SET full_name = $1, company = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, email, full_name, company, created_at',
        ['Updated Name', 'Test Inc.', '1']
      );
    });

    it('should throw an AppError if user to update is not found', async () => {
      (DatabaseHelper.executeQuerySingle as jest.Mock).mockResolvedValue(null);

      await expect(userService.updateUser('1', 'Updated Name', 'Test Inc.')).rejects.toThrow(new AppError('User not found', 404));
    });
  });

  describe('getUserPreferences', () => {
    it('should return preferences when found', async () => {
        (DatabaseHelper.executeQuerySingle as jest.Mock).mockResolvedValue(mockPreferences);
        const prefs = await userService.getUserPreferences('1');
        expect(prefs).toEqual(mockPreferences);
    });

    it('should create and return default preferences if not found', async () => {
        (DatabaseHelper.executeQuerySingle as jest.Mock).mockResolvedValue(null);
        (DatabaseHelper.executeQuery as jest.Mock).mockResolvedValue(undefined);
        const prefs = await userService.getUserPreferences('1');
        expect(prefs).toEqual({
            companies_of_interest: [],
            preferred_topics: [],
            notification_settings: {}
        });
        expect(DatabaseHelper.executeQuery).toHaveBeenCalledWith(
            'INSERT INTO user_preferences (user_id) VALUES ($1)',
            ['1']
        );
    });
  });

  describe('updateUserPreferences', () => {
      it('should update and return preferences', async () => {
          const newPrefs = { preferred_topics: ['testing'] };
          const updatedPrefs = { ...mockPreferences, preferred_topics: ['testing'] };
          
          // Mock get and then update
          (DatabaseHelper.executeQuerySingle as jest.Mock)
            .mockResolvedValueOnce(mockPreferences) // for getUserPreferences
            .mockResolvedValueOnce(updatedPrefs); // for the UPDATE query

          const prefs = await userService.updateUserPreferences('1', newPrefs);
          expect(prefs).toEqual(updatedPrefs);
      });
  });

  describe('getUserProfile', () => {
      it('should return a user profile when found', async () => {
          (DatabaseHelper.executeQuerySingle as jest.Mock).mockResolvedValue({ user_profile: mockProfile });
          const profile = await userService.getUserProfile('1');
          expect(profile).toEqual(mockProfile);
      });

      it('should return a default profile if no profile is set', async () => {
        (DatabaseHelper.executeQuerySingle as jest.Mock).mockResolvedValue({ user_profile: null });
        const profile = await userService.getUserProfile('1');
        expect(profile.expertise_level).toEqual('beginner');
      });
  });

  describe('updateUserProfileWithInsights', () => {
      it('should call gemini, merge and save the profile', async () => {
          const insights = { knowledge_areas: ['testing'] };
          (DatabaseHelper.executeQuerySingle as jest.Mock).mockResolvedValue({ user_profile: mockProfile });
          (geminiService.generateText as jest.Mock).mockResolvedValue(JSON.stringify(insights));
          (DatabaseHelper.executeQuery as jest.Mock).mockResolvedValue(undefined);

          await userService.updateUserProfileWithInsights('1', 'user message', 'ai response');

          expect(geminiService.generateText).toHaveBeenCalled();
          expect(DatabaseHelper.executeQuery).toHaveBeenCalledWith(
              'UPDATE users SET user_profile = $1 WHERE id = $2',
              [expect.any(Object), '1']
          );
          const savedProfile = (DatabaseHelper.executeQuery as jest.Mock).mock.calls[0][1][0];
          expect(savedProfile.knowledge_areas).toContain('testing');
      });
  });
});
