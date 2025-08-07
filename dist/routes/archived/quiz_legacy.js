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
// This function can be removed if the router is directly exported
// and initialized in the main server file.
function createQuizRoutes() {
    // Get available quizzes
    router.get('/quizzes', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 10;
        const quizzes = await quiz_service_1.quizService.getAvailableQuizzes(userId, limit);
        return response_1.ResponseUtils.success(res, quizzes, 'Quizzes retrieved successfully');
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
    // Start quiz attempt
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
    // Submit quiz answers
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
    // Get leaderboard
    router.get('/leaderboard', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const topic = req.query.topic;
        const limit = parseInt(req.query.limit) || 10;
        const leaderboard = await gamificationService.getLeaderboard(topic, limit);
        return response_1.ResponseUtils.success(res, leaderboard);
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
exports.quizRouter = quizRouter;
//# sourceMappingURL=quiz_legacy.js.map