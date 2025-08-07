"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createQuizRoutes;
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const quizService_1 = require("../services/quizService");
const gamification_1 = require("../services/gamification");
const gemini_1 = require("../services/gemini");
const router = express_1.default.Router();
function createQuizRoutes(db) {
    const geminiService = new gemini_1.GeminiService();
    const gamificationService = new gamification_1.GamificationService(db);
    const quizService = new quizService_1.QuizService(db, geminiService, gamificationService);
    // Get available quizzes
    router.get('/quizzes', auth_1.authenticateToken, async (req, res) => {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const limit = parseInt(req.query.limit) || 10;
            const quizzes = await quizService.getAvailableQuizzes(userId, limit);
            return res.json(quizzes);
        }
        catch (error) {
            console.error('Error fetching quizzes:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
    // Generate quiz from FAQs
    router.post('/quizzes/generate', auth_1.authenticateToken, async (req, res) => {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const { topicArea, difficulty = 'medium', questionCount = 5 } = req.body;
            // Generate questions
            const questions = await quizService.generateQuestionsFromFAQs(topicArea, difficulty, questionCount);
            if (questions.length === 0) {
                return res.status(404).json({ error: 'No questions could be generated for this topic' });
            }
            // Create quiz
            const quiz = await quizService.createQuiz({
                title: `${topicArea || 'Allgemein'} Quiz - ${difficulty}`,
                description: `Automatisch generiertes Quiz für ${topicArea || 'Allgemein'}`,
                difficulty_level: difficulty,
                topic_area: topicArea,
                time_limit_minutes: 10,
                question_count: questions.length,
                is_active: true,
                created_by: userId
            });
            // Save questions
            await quizService.saveQuizQuestions(quiz.id, questions);
            return res.json({ quiz, questions: questions.length });
        }
        catch (error) {
            console.error('Error generating quiz:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
    // Get quiz details
    router.get('/quizzes/:id', auth_1.authenticateToken, async (req, res) => {
        try {
            const quizId = req.params.id;
            const quiz = await quizService.getQuizById(quizId);
            if (!quiz) {
                return res.status(404).json({ error: 'Quiz not found' });
            }
            return res.json(quiz);
        }
        catch (error) {
            console.error('Error fetching quiz:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
    // Start quiz attempt
    router.post('/quizzes/:id/start', auth_1.authenticateToken, async (req, res) => {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const quizId = req.params.id;
            const attempt = await quizService.startQuizAttempt(userId, quizId);
            return res.json(attempt);
        }
        catch (error) {
            console.error('Error starting quiz:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
    // Submit quiz answers
    router.post('/quizzes/:id/submit', auth_1.authenticateToken, async (req, res) => {
        try {
            const { attemptId, answers } = req.body;
            if (!attemptId || !answers || !Array.isArray(answers)) {
                return res.status(400).json({ error: 'Invalid request data' });
            }
            const result = await quizService.submitQuizAnswers(attemptId, answers);
            return res.json(result);
        }
        catch (error) {
            console.error('Error submitting quiz:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
    // Get quiz suggestions
    router.get('/suggestions', auth_1.authenticateToken, async (req, res) => {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const limit = parseInt(req.query.limit) || 3;
            const suggestions = await quizService.getPersonalizedQuizSuggestions(userId, limit);
            return res.json(suggestions);
        }
        catch (error) {
            console.error('Error fetching quiz suggestions:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
    // Get user quiz statistics
    router.get('/stats', auth_1.authenticateToken, async (req, res) => {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const stats = await quizService.getUserQuizStats(userId);
            return res.json(stats);
        }
        catch (error) {
            console.error('Error fetching quiz stats:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
    // Get leaderboard
    router.get('/leaderboard', auth_1.authenticateToken, async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const timeframe = req.query.timeframe || 'all';
            const leaderboard = await gamificationService.getLeaderboard(limit, timeframe);
            return res.json(leaderboard);
        }
        catch (error) {
            console.error('Error fetching leaderboard:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
    // Get user points
    router.get('/points', auth_1.authenticateToken, async (req, res) => {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const points = await gamificationService.getUserPoints(userId);
            return res.json(points);
        }
        catch (error) {
            console.error('Error fetching user points:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
    // Get user expertise
    router.get('/expertise', auth_1.authenticateToken, async (req, res) => {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const expertise = await gamificationService.getUserExpertise(userId);
            return res.json(expertise);
        }
        catch (error) {
            console.error('Error fetching user expertise:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
    return router;
}
//# sourceMappingURL=quiz_fixed.js.map