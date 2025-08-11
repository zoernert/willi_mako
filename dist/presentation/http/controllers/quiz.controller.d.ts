import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../middleware/auth';
export declare class QuizController {
    private quizService;
    private gamificationService;
    createQuiz: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getQuiz: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    submitAnswer: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    getQuizResults: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    getQuizzes: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    getSuggestions: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    getUserStats: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    generateQuiz: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    generateQuizFromChats: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    startQuiz: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    submitQuiz: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    getLeaderboard: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAdminQuizzes: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    getAdminQuizQuestions: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    updateAdminQuiz: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    deleteAdminQuiz: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    updateAdminQuizQuestion: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    deleteAdminQuizQuestion: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    createIntelligentQuiz: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=quiz.controller.d.ts.map