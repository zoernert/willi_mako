"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizController = void 0;
const quiz_service_1 = require("../../../modules/quiz/quiz.service");
const gamification_service_1 = require("../../../modules/quiz/gamification.service");
const response_1 = require("../../../utils/response");
class QuizController {
    constructor() {
        this.quizService = new quiz_service_1.QuizService();
        this.gamificationService = new gamification_service_1.GamificationService();
        this.createQuiz = async (req, res, next) => {
            try {
                const quiz = await this.quizService.createQuiz(req.body);
                response_1.ResponseUtils.success(res, quiz, 'Quiz created successfully', 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.getQuiz = async (req, res, next) => {
            try {
                const quiz = await this.quizService.getQuizById(req.params.quizId);
                response_1.ResponseUtils.success(res, quiz);
            }
            catch (error) {
                next(error);
            }
        };
        this.submitAnswer = async (req, res, next) => {
            try {
                const userId = req.user.id;
                const { attemptId, answers } = req.body;
                const result = await this.quizService.submitQuizAnswers(attemptId, userId, answers);
                response_1.ResponseUtils.success(res, result);
            }
            catch (error) {
                next(error);
            }
        };
        this.getQuizResults = async (req, res, next) => {
            try {
                const userId = req.user.id;
                const results = await this.quizService.getQuizResult(req.params.attemptId, userId);
                response_1.ResponseUtils.success(res, results);
            }
            catch (error) {
                next(error);
            }
        };
        this.getQuizzes = async (req, res, next) => {
            try {
                const userId = req.user.id;
                const quizzes = await this.quizService.getUserQuizzes(userId);
                const quizzesArray = Array.isArray(quizzes) ? quizzes : [];
                response_1.ResponseUtils.success(res, quizzesArray);
            }
            catch (error) {
                next(error);
            }
        };
        this.getSuggestions = async (req, res, next) => {
            try {
                const userId = req.user.id;
                const suggestions = await this.quizService.getQuizSuggestions(userId);
                const suggestionsArray = Array.isArray(suggestions) ? suggestions : [];
                response_1.ResponseUtils.success(res, suggestionsArray);
            }
            catch (error) {
                next(error);
            }
        };
        this.getUserStats = async (req, res, next) => {
            try {
                const userId = req.user.id;
                const stats = await this.quizService.getUserStats(userId);
                response_1.ResponseUtils.success(res, stats);
            }
            catch (error) {
                next(error);
            }
        };
        this.generateQuiz = async (req, res, next) => {
            try {
                const userId = req.user.id;
                const { topicArea, difficulty, questionCount } = req.body;
                const quiz = await this.quizService.generateQuizFromTopic(topicArea, difficulty, questionCount, userId);
                response_1.ResponseUtils.success(res, { quiz }, 'Quiz generated successfully', 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.generateQuizFromChats = async (req, res, next) => {
            try {
                const userId = req.user.id;
                const { questionCount } = req.body;
                const quiz = await this.quizService.generateQuizFromChats(userId, questionCount);
                response_1.ResponseUtils.success(res, { quiz }, 'Quiz generated from chats successfully', 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.startQuiz = async (req, res, next) => {
            try {
                const userId = req.user.id;
                const { quizId } = req.params;
                const attempt = await this.quizService.startQuizAttempt(userId, quizId);
                response_1.ResponseUtils.success(res, attempt);
            }
            catch (error) {
                next(error);
            }
        };
        this.submitQuiz = async (req, res, next) => {
            try {
                const userId = req.user.id;
                const { quizId } = req.params;
                const { attemptId, answers } = req.body;
                const result = await this.quizService.submitQuizAnswers(attemptId, userId, answers);
                response_1.ResponseUtils.success(res, result);
            }
            catch (error) {
                next(error);
            }
        };
        this.getLeaderboard = async (req, res, next) => {
            try {
                const leaderboard = await this.gamificationService.getLeaderboard();
                const leaderboardArray = Array.isArray(leaderboard) ? leaderboard : [];
                response_1.ResponseUtils.success(res, leaderboardArray);
            }
            catch (error) {
                next(error);
            }
        };
        this.getAdminQuizzes = async (req, res, next) => {
            try {
                const quizzes = await this.quizService.getAllQuizzesForAdmin();
                const quizzesArray = Array.isArray(quizzes) ? quizzes : [];
                response_1.ResponseUtils.success(res, quizzesArray);
            }
            catch (error) {
                next(error);
            }
        };
        this.getAdminQuizQuestions = async (req, res, next) => {
            try {
                const { quizId } = req.params;
                const questions = await this.quizService.getQuizQuestionsForAdmin(quizId);
                const questionsArray = Array.isArray(questions) ? questions : [];
                response_1.ResponseUtils.success(res, questionsArray);
            }
            catch (error) {
                next(error);
            }
        };
        this.updateAdminQuiz = async (req, res, next) => {
            try {
                const { quizId } = req.params;
                const quizData = req.body;
                const updatedQuiz = await this.quizService.updateQuizAsAdmin(quizId, quizData);
                response_1.ResponseUtils.success(res, updatedQuiz);
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteAdminQuiz = async (req, res, next) => {
            try {
                const { quizId } = req.params;
                await this.quizService.deleteQuizAsAdmin(quizId);
                response_1.ResponseUtils.success(res, null, 'Quiz deleted successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.updateAdminQuizQuestion = async (req, res, next) => {
            try {
                const { questionId } = req.params;
                const questionData = req.body;
                const updatedQuestion = await this.quizService.updateQuizQuestionAsAdmin(questionId, questionData);
                response_1.ResponseUtils.success(res, updatedQuestion);
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteAdminQuizQuestion = async (req, res, next) => {
            try {
                const { questionId } = req.params;
                await this.quizService.deleteQuizQuestionAsAdmin(questionId);
                response_1.ResponseUtils.success(res, null, 'Question deleted successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.createIntelligentQuiz = async (req, res, next) => {
            try {
                const userId = req.user.id;
                const { topic, numQuestions, difficulty } = req.body;
                const quiz = await this.quizService.generateIntelligentQuiz(topic, numQuestions, difficulty, userId);
                response_1.ResponseUtils.success(res, quiz, 'Intelligent quiz created successfully', 201);
            }
            catch (error) {
                next(error);
            }
        };
    }
}
exports.QuizController = QuizController;
//# sourceMappingURL=quiz.controller.js.map