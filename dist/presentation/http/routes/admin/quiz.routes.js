"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quiz_controller_1 = require("../../controllers/quiz.controller");
const auth_1 = require("../../../../middleware/auth");
const router = (0, express_1.Router)();
const quizController = new quiz_controller_1.QuizController();
router.use(auth_1.authenticateToken, auth_1.requireAdmin);
router.get('/', quizController.getAdminQuizzes);
router.get('/:quizId/questions', quizController.getAdminQuizQuestions);
router.put('/:quizId', quizController.updateAdminQuiz);
router.delete('/:quizId', quizController.deleteAdminQuiz);
router.put('/questions/:questionId', quizController.updateAdminQuizQuestion);
router.delete('/questions/:questionId', quizController.deleteAdminQuizQuestion);
router.post('/create-intelligent', quizController.createIntelligentQuiz);
exports.default = router;
//# sourceMappingURL=quiz.routes.js.map