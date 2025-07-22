import { Router } from 'express';
import { QuizController } from '../../controllers/quiz.controller';
import { authenticateToken, requireAdmin } from '../../../../middleware/auth';

const router = Router();
const quizController = new QuizController();

router.post('/', authenticateToken, requireAdmin, quizController.createIntelligentQuiz);

export default router;
