"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quiz_controller_1 = require("../../controllers/quiz.controller");
const auth_1 = require("../../../../middleware/auth");
const router = (0, express_1.Router)();
const quizController = new quiz_controller_1.QuizController();
router.post('/', auth_1.authenticateToken, auth_1.requireAdmin, quizController.createIntelligentQuiz);
exports.default = router;
//# sourceMappingURL=create-intelligent.js.map