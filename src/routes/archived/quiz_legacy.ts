import express, { Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { quizService } from '../modules/quiz/quiz.service';
import { GamificationService } from '../modules/quiz/gamification.service';
import { ResponseUtils } from '../utils/response';
import { ValidationUtils } from '../utils/validation';
import { UserAnswer } from '../modules/quiz/quiz.interface';

const router = express.Router();
const gamificationService = new GamificationService();

// This function can be removed if the router is directly exported
// and initialized in the main server file.
export default function createQuizRoutes() {

  // Get available quizzes
  router.get('/quizzes', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;
    const quizzes = await quizService.getAvailableQuizzes(userId, limit);
    return ResponseUtils.success(res, quizzes, 'Quizzes retrieved successfully');
  }));

  // NOTE: The generation routes are complex and will be refactored in a separate task.
  // For now, they are commented out to focus on the core quiz functionality.
  /*
  // Generate quiz from FAQs
  router.post('/quizzes/generate', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
      // ... implementation to be refactored
  }));

  // Generate quiz from user's chats
  router.post('/quizzes/generate-from-chats', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
      // ... implementation to be refactored
  }));
  */

  // Get quiz details
  router.get('/quizzes/:id', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const quizId = req.params.id;
    const validation = ValidationUtils.validateUUID(quizId);
    if (!validation.isValid) {
        return ResponseUtils.validationError(res, validation.errors);
    }

    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      return ResponseUtils.notFound(res, 'Quiz');
    }
    return ResponseUtils.success(res, quiz);
  }));

  // Start quiz attempt
  router.post('/quizzes/:id/start', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const quizId = req.params.id;

    const validation = ValidationUtils.validateUUID(quizId);
    if (!validation.isValid) {
        return ResponseUtils.validationError(res, validation.errors);
    }

    const attempt = await quizService.startQuizAttempt(userId, quizId);
    return ResponseUtils.success(res, attempt, 'Quiz attempt started');
  }));

  // Submit quiz answers
  router.post('/quizzes/submit', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { attemptId, answers } = req.body;

    const validation = ValidationUtils.combine(
        ValidationUtils.required(attemptId, 'attemptId'),
        ValidationUtils.validateUUID(attemptId),
        ValidationUtils.required(answers, 'answers')
    );
    if (!validation.isValid) {
        return ResponseUtils.validationError(res, validation.errors);
    }

    const result = await quizService.submitQuizAnswers(attemptId, userId, answers as UserAnswer[]);
    return ResponseUtils.success(res, result, 'Quiz submitted successfully');
  }));

  // Get leaderboard
  router.get('/leaderboard', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const topic = req.query.topic as string | undefined;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const leaderboard = await gamificationService.getLeaderboard(topic, limit);
    return ResponseUtils.success(res, leaderboard);
  }));

  // NOTE: Admin routes will be refactored into a separate admin module.
  // They are commented out for now.
  /*
  // Admin routes
  router.get('/admin/all-quizzes', ...);
  router.put('/admin/quizzes/:id', ...);
  router.delete('/admin/quizzes/:id', ...);
  // ... etc
  */

  return router;
}

// For direct use in app.ts
const quizRouter = createQuizRoutes();
export { quizRouter };
