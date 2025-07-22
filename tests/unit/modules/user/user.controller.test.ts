import { Request, Response, NextFunction } from 'express';
import { UserController } from '../../../../src/presentation/http/controllers/user.controller';
import { UserService } from '../../../../src/modules/user/user.service';
import { User, UserPreferences, UserProfile } from '../../../../src/modules/user/user.interface';
import { ResponseUtils } from '../../../../src/utils/response';

// Mock the user service and response utils
jest.mock('../../../../src/modules/user/user.service');
jest.mock('../../../../src/utils/response');

const MockedUserService = UserService as jest.MockedClass<typeof UserService>;
const mockResponseUtils = ResponseUtils as jest.Mocked<typeof ResponseUtils>;

// Extend Request interface for testing
interface RequestWithUser extends Request {
  user?: User;
}

describe('UserController', () => {
  let userController: UserController;
  let mockRequest: Partial<RequestWithUser>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockUserService: jest.Mocked<UserService>;

  beforeEach(() => {
    // Create a mock instance of UserService
    mockUserService = {
      getUserById: jest.fn(),
      getUserProfile: jest.fn(),
      updateUser: jest.fn(),
      getUserPreferences: jest.fn(),
      updateUserPreferences: jest.fn(),
      updateUserProfile: jest.fn(),
      updateUserProfileWithInsights: jest.fn(),
    } as any;

    // Mock the UserService constructor to return our mock
    (MockedUserService as any).mockImplementation(() => mockUserService);

    userController = new UserController();
    
    const mockUser: User = {
      id: 'test-user-123',
      email: 'test@example.com',
      full_name: 'John Doe',
      company: 'Test Corp',
      role: 'user',
      created_at: new Date().toISOString()
    };

    mockRequest = {
      user: mockUser,
      body: {},
      params: {},
      query: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn()
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should return user profile successfully', async () => {
      const mockProfile: UserProfile = {
        expertise_level: 'intermediate' as const,
        communication_style: 'professional' as const,
        preferred_terminology: ['technical'],
        knowledge_areas: ['ai', 'machine-learning'],
        company_type: 'tech',
        experience_topics: ['javascript', 'typescript'],
        learning_progress: {
          completed_topics: ['basics'],
          current_focus: 'advanced-concepts'
        },
        interaction_patterns: {
          question_types: ['how-to', 'best-practices'],
          response_preferences: ['detailed', 'examples']
        },
        last_updated: new Date().toISOString()
      };

      mockUserService.getUserProfile.mockResolvedValue(mockProfile);

      await userController.getUserProfile(
        mockRequest as RequestWithUser,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.getUserProfile).toHaveBeenCalledWith('test-user-123');
      expect(ResponseUtils.success).toHaveBeenCalledWith(mockResponse, mockProfile);
    });

    it('should handle error when profile not found', async () => {
      const error = new Error('Profile not found');
      mockUserService.getUserProfile.mockRejectedValue(error);

      await userController.getUserProfile(
        mockRequest as RequestWithUser,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        name: 'Jane Doe',
        company: 'New Corp'
      };

      mockRequest.body = updateData;

      const updatedUser: User = {
        id: 'test-user-123',
        email: 'test@example.com',
        full_name: 'Jane Doe',
        company: 'New Corp',
        role: 'user',
        created_at: new Date().toISOString()
      };

      mockUserService.updateUser.mockResolvedValue(updatedUser);

      await userController.updateUserProfile(
        mockRequest as RequestWithUser,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.updateUser).toHaveBeenCalledWith(
        'test-user-123',
        'Jane Doe',
        'New Corp'
      );
      expect(ResponseUtils.success).toHaveBeenCalledWith(mockResponse, updatedUser);
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      mockUserService.updateUser.mockRejectedValue(error);

      await userController.updateUserProfile(
        mockRequest as RequestWithUser,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getUserPreferences', () => {
    it('should return user preferences successfully', async () => {
      const mockPreferences = {
        companies_of_interest: ['tech-corp'],
        preferred_topics: ['ai'],
        notification_settings: {
          email_notifications: true
        }
      };

      mockUserService.getUserPreferences.mockResolvedValue(mockPreferences);

      await userController.getUserPreferences(
        mockRequest as RequestWithUser,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.getUserPreferences).toHaveBeenCalledWith('test-user-123');
      expect(ResponseUtils.success).toHaveBeenCalledWith(mockResponse, mockPreferences);
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences successfully', async () => {
      const preferencesData = {
        companies_of_interest: ['tech-corp', 'startup-inc'],
        preferred_topics: ['ai', 'blockchain'],
        notification_settings: {
          email_notifications: true,
          push_notifications: false
        }
      };

      mockRequest.body = preferencesData;
      mockUserService.updateUserPreferences.mockResolvedValue(preferencesData);

      await userController.updateUserPreferences(
        mockRequest as RequestWithUser,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.updateUserPreferences).toHaveBeenCalledWith(
        'test-user-123',
        preferencesData
      );
      expect(ResponseUtils.success).toHaveBeenCalledWith(mockResponse, preferencesData);
    });

    it('should handle preference update errors', async () => {
      const error = new Error('Preferences update failed');
      mockUserService.updateUserPreferences.mockRejectedValue(error);

      await userController.updateUserPreferences(
        mockRequest as RequestWithUser,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
