"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.quizRouter = void 0;
exports.default = createQuizRoutes;
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const quiz_service_1 = require("../modules/quiz/quiz.service");
const gamification_service_1 = require("../modules/quiz/gamification.service");
const response_1 = require("../utils/response");
const validation_1 = require("../utils/validation");
const router = express_1.default.Router();
const gamificationService = new gamification_service_1.GamificationService();
function createQuizRoutes() {
    router.get('/quizzes', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 10;
        const quizzes = await quiz_service_1.quizService.getAvailableQuizzes(userId, limit);
        return response_1.ResponseUtils.success(res, quizzes, 'Quizzes retrieved successfully');
    }));
    router.get('/quizzes/:id', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const quizId = req.params.id;
        const validation = validation_1.ValidationUtils.validateUUID(quizId);
        if (!validation.isValid) {
            return response_1.ResponseUtils.validationError(res, validation.errors);
        }
        const quiz = await quiz_service_1.quizService.getQuizById(quizId);
        if (!quiz) {
            return response_1.ResponseUtils.notFound(res, 'Quiz');
        }
        return response_1.ResponseUtils.success(res, quiz);
    }));
    router.post('/quizzes/:id/start', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const userId = req.user.id;
        const quizId = req.params.id;
        const validation = validation_1.ValidationUtils.validateUUID(quizId);
        if (!validation.isValid) {
            return response_1.ResponseUtils.validationError(res, validation.errors);
        }
        const attempt = await quiz_service_1.quizService.startQuizAttempt(userId, quizId);
        return response_1.ResponseUtils.success(res, attempt, 'Quiz attempt started');
    }));
    router.post('/quizzes/submit', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const userId = req.user.id;
        const { attemptId, answers } = req.body;
        const validation = validation_1.ValidationUtils.combine(validation_1.ValidationUtils.required(attemptId, 'attemptId'), validation_1.ValidationUtils.validateUUID(attemptId), validation_1.ValidationUtils.required(answers, 'answers'));
        if (!validation.isValid) {
            return response_1.ResponseUtils.validationError(res, validation.errors);
        }
        const result = await quiz_service_1.quizService.submitQuizAnswers(attemptId, userId, answers);
        return response_1.ResponseUtils.success(res, result, 'Quiz submitted successfully');
    }));
    router.get('/leaderboard', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const topic = req.query.topic;
        const limit = parseInt(req.query.limit) || 10;
        const leaderboard = await gamificationService.getLeaderboard(topic, limit);
        return response_1.ResponseUtils.success(res, leaderboard);
    }));
    return router;
}
const quizRouter = createQuizRoutes();
exports.quizRouter = quizRouter;
//# sourceMappingURL=quiz.js.map