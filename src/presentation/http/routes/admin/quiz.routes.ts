import { Router } from 'express';
import { QuizController } from '../../controllers/quiz.controller';
import { authenticateToken, requireAdmin } from '../../../../middleware/auth';

const router = Router();
const quizController = new QuizController();

// Middleware to protect all admin quiz routes
router.use(authenticateToken, requireAdmin);

// Route to get all quizzes for the admin view
router.get('/', quizController.getAdminQuizzes);

// Route to get all questions for a specific quiz
router.get('/:quizId/questions', quizController.getAdminQuizQuestions);

// Route to update a quiz
router.put('/:quizId', quizController.updateAdminQuiz);

// Route to delete a quiz
router.delete('/:quizId', quizController.deleteAdminQuiz);

// Route to update a single quiz question
router.put('/questions/:questionId', quizController.updateAdminQuizQuestion);

// Route to delete a single quiz question
router.delete('/questions/:questionId', quizController.deleteAdminQuizQuestion);

// Route for the intelligent quiz creator
router.post('/create-intelligent', quizController.createIntelligentQuiz);


export default router;
