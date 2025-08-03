import { Quiz, QuizQuestion, UserQuizAttempt, QuizLeaderboard, QuizCreateRequest, QuestionCreateRequest, QuizSearchQuery, QuizSearchResult, QuizSubmissionRequest, QuizStatistics } from './quiz.interface';
export interface IQuizService {
    createQuiz(request: QuizCreateRequest, createdBy?: string): Promise<Quiz>;
    getQuiz(quizId: string): Promise<Quiz>;
    getQuizWithQuestions(quizId: string): Promise<Quiz>;
    searchQuizzes(query: QuizSearchQuery): Promise<QuizSearchResult>;
    updateQuiz(quizId: string, updates: Partial<Quiz>, userId?: string): Promise<Quiz>;
    deleteQuiz(quizId: string, userId?: string): Promise<void>;
    addQuestion(quizId: string, request: QuestionCreateRequest, userId?: string): Promise<QuizQuestion>;
    updateQuestion(questionId: string, updates: Partial<QuizQuestion>, userId?: string): Promise<QuizQuestion>;
    deleteQuestion(questionId: string, userId?: string): Promise<void>;
    startQuizAttempt(userId: string, quizId: string): Promise<UserQuizAttempt>;
    submitQuizAttempt(submission: QuizSubmissionRequest): Promise<UserQuizAttempt>;
    getQuizAttempt(attemptId: string, userId: string): Promise<UserQuizAttempt>;
    getUserQuizAttempts(userId: string, limit?: number, offset?: number): Promise<UserQuizAttempt[]>;
    generateQuizFromFAQ(faqIds: string[], options?: {
        difficulty?: 'easy' | 'medium' | 'hard';
        questionCount?: number;
        timeLimit?: number;
    }): Promise<Quiz>;
    generateQuizFromChat(chatIds: string[], options?: {
        difficulty?: 'easy' | 'medium' | 'hard';
        questionCount?: number;
        timeLimit?: number;
    }): Promise<Quiz>;
    generateQuizFromDocuments(documentIds: string[], userId: string, options?: {
        difficulty?: 'easy' | 'medium' | 'hard';
        questionCount?: number;
        timeLimit?: number;
    }): Promise<Quiz>;
    getQuizLeaderboard(quizId: string, limit?: number): Promise<QuizLeaderboard[]>;
    getGlobalLeaderboard(limit?: number): Promise<QuizLeaderboard[]>;
    getUserRanking(userId: string, quizId?: string): Promise<{
        rank: number;
        total: number;
    }>;
    getQuizStatistics(quizId: string): Promise<QuizStatistics>;
    getUserQuizStatistics(userId: string): Promise<QuizStatistics>;
    getQuizPerformanceAnalysis(quizId: string): Promise<{
        averageScore: number;
        difficultyAnalysis: Record<string, number>;
        timeAnalysis: {
            averageTime: number;
            fastestTime: number;
            slowestTime: number;
        };
        questionAnalysis: {
            questionId: string;
            correctRate: number;
            averageTime: number;
        }[];
    }>;
    getCreatedQuizzes(userId: string): Promise<Quiz[]>;
    activateQuiz(quizId: string, userId: string): Promise<void>;
    deactivateQuiz(quizId: string, userId: string): Promise<void>;
    validateQuizSubmission(submission: QuizSubmissionRequest): Promise<boolean>;
    canUserTakeQuiz(userId: string, quizId: string): Promise<boolean>;
    deleteUserQuizData(userId: string): Promise<void>;
}
//# sourceMappingURL=quiz.service.interface.d.ts.map