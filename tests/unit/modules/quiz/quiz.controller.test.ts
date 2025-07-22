import { Request, Response, NextFunction } from 'express';
import { QuizController } from '../../../../src/presentation/http/controllers/quiz.controller';
import { QuizService } from '../../../../src/modules/quiz/quiz.service';
import { GamificationService } from '../../../../src/modules/quiz/gamification.service';
import { User } from '../../../../src/modules/user/user.interface';
import { Quiz, QuizResult } from '../../../../src/modules/quiz/quiz.interface';
import { ResponseUtils } from '../../../../src/utils/response';

// Mock dependencies
jest.mock('../../../../src/modules/quiz/quiz.service');
jest.mock('../../../../src/modules/quiz/gamification.service');
jest.mock('../../../../src/utils/response');

const mockQuizService = QuizService as jest.MockedClass<typeof QuizService>;
const mockGamificationService = GamificationService as jest.MockedClass<typeof GamificationService>;

// Extend Request interface for testing
interface RequestWithUser extends Request {
  user?: User;
}

describe('QuizController', () => {
  let quizController: QuizController;
  let mockQuizServiceInstance: jest.Mocked<QuizService>;
  let mockGamificationServiceInstance: jest.Mocked<GamificationService>;
  let mockRequest: Partial<RequestWithUser>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Create mock service instances
    mockQuizServiceInstance = {
      createQuiz: jest.fn(),
      getQuizById: jest.fn(),
      getUserQuizzes: jest.fn(),
      updateQuiz: jest.fn(),
      deleteQuiz: jest.fn(),
      generateQuizFromTopic: jest.fn(),
      generateQuizFromChats: jest.fn(),
      submitQuizAnswers: jest.fn(),
      getQuizResult: jest.fn(),
      getUserStats: jest.fn(),
      getQuizSuggestions: jest.fn(),
    } as any;

    mockGamificationServiceInstance = {
      getLeaderboard: jest.fn(),
      updateUserLevel: jest.fn(),
      checkAchievements: jest.fn(),
    } as any;

    // Mock constructors
    mockQuizService.mockImplementation(() => mockQuizServiceInstance);
    mockGamificationService.mockImplementation(() => mockGamificationServiceInstance);

    quizController = new QuizController();
    
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

  describe('createQuiz', () => {
    it('should create a quiz successfully', async () => {
      const quizData = {
        title: 'Test Quiz',
        description: 'A test quiz',
        difficulty_level: 'medium' as const,
        topic_area: 'programming',
        time_limit_minutes: 30,
        question_count: 5
      };

      const createdQuiz: Quiz = {
        id: 'quiz-123',
        ...quizData,
        is_active: true,
        created_by: 'test-user-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockRequest.body = quizData;
      mockQuizServiceInstance.createQuiz.mockResolvedValue(createdQuiz);

      await quizController.createQuiz(
        mockRequest as RequestWithUser,
        mockResponse as Response,
        mockNext
      );

      expect(mockQuizServiceInstance.createQuiz).toHaveBeenCalledWith(quizData);
      expect(ResponseUtils.success).toHaveBeenCalledWith(
        mockResponse,
        createdQuiz,
        'Quiz created successfully',
        201
      );
    });

    it('should handle quiz creation errors', async () => {
      const error = new Error('Quiz creation failed');
      mockQuizServiceInstance.createQuiz.mockRejectedValue(error);

      await quizController.createQuiz(
        mockRequest as RequestWithUser,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getQuiz', () => {
    it('should return a quiz successfully', async () => {
      const quizId = 'quiz-123';
      const quiz: Quiz = {
        id: quizId,
        title: 'Test Quiz',
        description: 'A test quiz',
        difficulty_level: 'medium',
        topic_area: 'programming',
        time_limit_minutes: 30,
        question_count: 5,
        is_active: true,
        created_by: 'test-user-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        questions: []
      };

      mockRequest.params = { quizId };
      mockQuizServiceInstance.getQuizById.mockResolvedValue(quiz);

      await quizController.getQuiz(
        mockRequest as RequestWithUser,
        mockResponse as Response,
        mockNext
      );

      expect(mockQuizServiceInstance.getQuizById).toHaveBeenCalledWith(quizId);
      expect(ResponseUtils.success).toHaveBeenCalledWith(mockResponse, quiz);
    });

    it('should handle quiz not found', async () => {
      const error = new Error('Quiz not found');
      mockQuizServiceInstance.getQuizById.mockRejectedValue(error);

      await quizController.getQuiz(
        mockRequest as RequestWithUser,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('generateQuiz', () => {
    it('should generate quiz from topic successfully', async () => {
      const requestData = {
        topicArea: 'TypeScript',
        difficulty: 'medium',
        questionCount: 3
      };

      const generatedQuiz: Quiz = {
        id: 'quiz-456',
        title: 'TypeScript Quiz',
        description: 'Generated quiz about TypeScript',
        difficulty_level: 'medium',
        topic_area: 'TypeScript',
        time_limit_minutes: 30,
        question_count: 3,
        is_active: true,
        created_by: 'test-user-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockRequest.body = requestData;
      mockQuizServiceInstance.generateQuizFromTopic.mockResolvedValue(generatedQuiz);

      await quizController.generateQuiz(
        mockRequest as RequestWithUser,
        mockResponse as Response,
        mockNext
      );

      expect(mockQuizServiceInstance.generateQuizFromTopic).toHaveBeenCalledWith(
        requestData.topicArea,
        requestData.difficulty,
        requestData.questionCount,
        'test-user-123'
      );
      expect(ResponseUtils.success).toHaveBeenCalledWith(
        mockResponse,
        { quiz: generatedQuiz },
        'Quiz generated successfully',
        201
      );
    });
  });

  describe('submitAnswer', () => {
    it('should submit quiz answers successfully', async () => {
      const attemptId = 'attempt-123';
      const answers = [
        { question_id: 'q1', answer: ['option1'] },
        { question_id: 'q2', answer: ['option2'] }
      ];

      const submitData = {
        attemptId,
        answers
      };

      const result: QuizResult = {
        attempt: {
          id: attemptId,
          quiz_id: 'quiz-123',
          user_id: 'test-user-123',
          score: 85,
          percentage: 85,
          is_passed: true,
          completed_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          time_taken_seconds: 300
        },
        correct_answers: 4,
        total_questions: 5,
        feedback: []
      };

      mockRequest.body = submitData;
      mockQuizServiceInstance.submitQuizAnswers.mockResolvedValue(result);

      await quizController.submitAnswer(
        mockRequest as RequestWithUser,
        mockResponse as Response,
        mockNext
      );

      expect(mockQuizServiceInstance.submitQuizAnswers).toHaveBeenCalledWith(
        attemptId,
        'test-user-123',
        answers
      );
      expect(ResponseUtils.success).toHaveBeenCalledWith(mockResponse, result);
    });
  });

  describe('getQuizzes', () => {
    it('should return user quizzes successfully', async () => {
      const userQuizzes: Quiz[] = [
        {
          id: 'quiz-1',
          title: 'Quiz 1',
          description: 'Programming quiz',
          topic_area: 'programming',
          difficulty_level: 'easy' as const,
          time_limit_minutes: 30,
          question_count: 5,
          is_active: true,
          created_by: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'quiz-2',
          title: 'Quiz 2',
          description: 'Science quiz',
          topic_area: 'science',
          difficulty_level: 'medium' as const,
          time_limit_minutes: 45,
          question_count: 10,
          is_active: true,
          created_by: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      mockQuizServiceInstance.getUserQuizzes.mockResolvedValue(userQuizzes);

      await quizController.getQuizzes(
        mockRequest as RequestWithUser,
        mockResponse as Response,
        mockNext
      );

      expect(mockQuizServiceInstance.getUserQuizzes).toHaveBeenCalledWith('test-user-123');
      expect(ResponseUtils.success).toHaveBeenCalledWith(mockResponse, userQuizzes);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics successfully', async () => {
      const userStats = {
        user_id: 'test-user-123',
        total_quizzes_taken: 25,
        total_score: 1850,
        average_score: 74.0,
        highest_score: 95,
        total_time_spent: 7200
      };

      mockQuizServiceInstance.getUserStats.mockResolvedValue(userStats);

      await quizController.getUserStats(
        mockRequest as RequestWithUser,
        mockResponse as Response,
        mockNext
      );

      expect(mockQuizServiceInstance.getUserStats).toHaveBeenCalledWith('test-user-123');
      expect(ResponseUtils.success).toHaveBeenCalledWith(mockResponse, userStats);
    });
  });

  describe('generateQuizFromChats', () => {
    it('should generate quiz from chats successfully', async () => {
      const requestData = {
        questionCount: 5
      };

      const generatedQuiz: Quiz = {
        id: 'quiz-789',
        title: 'Chat-based Quiz',
        description: 'Generated from your chat history',
        difficulty_level: 'medium',
        topic_area: 'chat-history',
        time_limit_minutes: 25,
        question_count: 5,
        is_active: true,
        created_by: 'test-user-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockRequest.body = requestData;
      mockQuizServiceInstance.generateQuizFromChats.mockResolvedValue(generatedQuiz);

      await quizController.generateQuizFromChats(
        mockRequest as RequestWithUser,
        mockResponse as Response,
        mockNext
      );

      expect(mockQuizServiceInstance.generateQuizFromChats).toHaveBeenCalledWith(
        'test-user-123',
        requestData.questionCount
      );
      expect(ResponseUtils.success).toHaveBeenCalledWith(
        mockResponse,
        { quiz: generatedQuiz },
        'Quiz generated from chats successfully',
        201
      );
    });
  });
});
