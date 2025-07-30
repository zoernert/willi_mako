import { Request, Response, NextFunction } from 'express';
import { QuizService } from '../../../modules/quiz/quiz.service';
import { GamificationService } from '../../../modules/quiz/gamification.service';
import { ResponseUtils } from '../../../utils/response';
import { User } from '../../../modules/user/user.interface';
import { AuthenticatedRequest } from '../../../middleware/auth';

export class QuizController {
    private quizService = new QuizService();
    private gamificationService = new GamificationService();

    public createQuiz = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const quiz = await this.quizService.createQuiz(req.body);
            ResponseUtils.success(res, quiz, 'Quiz created successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    public getQuiz = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const quiz = await this.quizService.getQuizById(req.params.quizId);
            ResponseUtils.success(res, quiz);
        } catch (error) {
            next(error);
        }
    };

    public submitAnswer = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.id;
            const { attemptId, answers } = req.body;
            const result = await this.quizService.submitQuizAnswers(attemptId, userId, answers);
            ResponseUtils.success(res, result);
        } catch (error) {
            next(error);
        }
    };

    public getQuizResults = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.id;
            const results = await this.quizService.getQuizResult(req.params.attemptId, userId);
            ResponseUtils.success(res, results);
        } catch (error) {
            next(error);
        }
    };

    public getQuizzes = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.id;
            const quizzes = await this.quizService.getUserQuizzes(userId);
            ResponseUtils.success(res, quizzes);
        } catch (error) {
            next(error);
        }
    };

    public getSuggestions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.id;
            const suggestions = await this.quizService.getQuizSuggestions(userId);
            ResponseUtils.success(res, suggestions);
        } catch (error) {
            next(error);
        }
    };

    public getUserStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.id;
            const stats = await this.quizService.getUserStats(userId);
            ResponseUtils.success(res, stats);
        } catch (error) {
            next(error);
        }
    };

    public generateQuiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.id;
            const { topicArea, difficulty, questionCount } = req.body;
            const quiz = await this.quizService.generateQuizFromTopic(topicArea, difficulty, questionCount, userId);
            ResponseUtils.success(res, { quiz }, 'Quiz generated successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    public generateQuizFromChats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.id;
            const { questionCount } = req.body;
            const quiz = await this.quizService.generateQuizFromChats(userId, questionCount);
            ResponseUtils.success(res, { quiz }, 'Quiz generated from chats successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    public startQuiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.id;
            const { quizId } = req.params;
            const attempt = await this.quizService.startQuizAttempt(userId, quizId);
            ResponseUtils.success(res, attempt);
        } catch (error) {
            next(error);
        }
    };

    public submitQuiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.id;
            const { quizId } = req.params;
            const { attemptId, answers } = req.body;
            const result = await this.quizService.submitQuizAnswers(attemptId, userId, answers);
            ResponseUtils.success(res, result);
        } catch (error) {
            next(error);
        }
    };

    public getLeaderboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const leaderboard = await this.gamificationService.getLeaderboard();
            ResponseUtils.success(res, leaderboard);
        } catch (error) {
            next(error);
        }
    };

    // Admin methods
    public getAdminQuizzes = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const quizzes = await this.quizService.getAllQuizzesForAdmin();
            ResponseUtils.success(res, quizzes);
        } catch (error) {
            next(error);
        }
    };

    public getAdminQuizQuestions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { quizId } = req.params;
            const questions = await this.quizService.getQuizQuestionsForAdmin(quizId);
            ResponseUtils.success(res, questions);
        } catch (error) {
            next(error);
        }
    };

    public updateAdminQuiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { quizId } = req.params;
            const quizData = req.body;
            const updatedQuiz = await this.quizService.updateQuizAsAdmin(quizId, quizData);
            ResponseUtils.success(res, updatedQuiz);
        } catch (error) {
            next(error);
        }
    };

    public deleteAdminQuiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { quizId } = req.params;
            await this.quizService.deleteQuizAsAdmin(quizId);
            ResponseUtils.success(res, null, 'Quiz deleted successfully');
        } catch (error) {
            next(error);
        }
    };

    public updateAdminQuizQuestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { questionId } = req.params;
            const questionData = req.body;
            const updatedQuestion = await this.quizService.updateQuizQuestionAsAdmin(questionId, questionData);
            ResponseUtils.success(res, updatedQuestion);
        } catch (error) {
            next(error);
        }
    };

    public deleteAdminQuizQuestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { questionId } = req.params;
            await this.quizService.deleteQuizQuestionAsAdmin(questionId);
            ResponseUtils.success(res, null, 'Question deleted successfully');
        } catch (error) {
            next(error);
        }
    };

    public createIntelligentQuiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.id;
            const { topic, numQuestions, difficulty } = req.body;
            const quiz = await this.quizService.generateIntelligentQuiz(topic, numQuestions, difficulty, userId);
            ResponseUtils.success(res, quiz, 'Intelligent quiz created successfully', 201);
        } catch (error) {
            next(error);
        }
    };
}
