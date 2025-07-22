import { Router } from 'express';
import { QuizController } from '../controllers/quiz.controller';
import { authenticateToken } from '../../../middleware/auth';

const router = Router();
const quizController = new QuizController();

// Quiz management
router.get('/', authenticateToken, quizController.getQuizzes);
router.post('/', authenticateToken, quizController.createQuiz);
router.get('/suggestions', authenticateToken, quizController.getSuggestions);
router.get('/stats', authenticateToken, quizController.getUserStats);
router.get('/leaderboard', authenticateToken, quizController.getLeaderboard);
router.post('/generate', authenticateToken, quizController.generateQuiz);
router.post('/generate-from-chats', authenticateToken, quizController.generateQuizFromChats);

// Quiz operations
router.get('/:quizId', authenticateToken, quizController.getQuiz);
router.post('/:quizId/start', authenticateToken, quizController.startQuiz);
router.post('/:quizId/submit', authenticateToken, quizController.submitQuiz);
router.get('/results/:attemptId', authenticateToken, quizController.getQuizResults);

export default router;
