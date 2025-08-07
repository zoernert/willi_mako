"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quiz_controller_1 = require("../../controllers/quiz.controller");
const auth_1 = require("../../../../middleware/auth");
const router = (0, express_1.Router)();
const quizController = new quiz_controller_1.QuizController();
// Middleware to protect all admin quiz routes
router.use(auth_1.authenticateToken, auth_1.requireAdmin);
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
exports.default = router;
//# sourceMappingURL=quiz.routes.js.map