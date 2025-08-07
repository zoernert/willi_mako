"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quiz_controller_1 = require("../controllers/quiz.controller");
const auth_1 = require("../../../middleware/auth");
const router = (0, express_1.Router)();
const quizController = new quiz_controller_1.QuizController();
// Quiz management
router.get('/', auth_1.authenticateToken, quizController.getQuizzes);
router.post('/', auth_1.authenticateToken, quizController.createQuiz);
router.get('/suggestions', auth_1.authenticateToken, quizController.getSuggestions);
router.get('/stats', auth_1.authenticateToken, quizController.getUserStats);
router.get('/leaderboard', auth_1.authenticateToken, quizController.getLeaderboard);
router.post('/generate', auth_1.authenticateToken, quizController.generateQuiz);
router.post('/generate-from-chats', auth_1.authenticateToken, quizController.generateQuizFromChats);
// Quiz operations
router.get('/:quizId', auth_1.authenticateToken, quizController.getQuiz);
router.post('/:quizId/start', auth_1.authenticateToken, quizController.startQuiz);
router.post('/:quizId/submit', auth_1.authenticateToken, quizController.submitQuiz);
router.get('/results/:attemptId', auth_1.authenticateToken, quizController.getQuizResults);
exports.default = router;
//# sourceMappingURL=quiz.routes.js.map