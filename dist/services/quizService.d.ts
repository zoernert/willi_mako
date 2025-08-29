import { Pool } from 'pg';
import { Quiz, QuizQuestion, UserQuizAttempt, UserAnswer, QuizResult, QuizSuggestion } from '../types/quiz';
import { GamificationService } from './gamification';
export declare class QuizService {
    private db;
    private gamificationService;
    constructor(db: Pool, gamificationService: GamificationService);
    createQuiz(quiz: Omit<Quiz, 'id' | 'created_at' | 'updated_at'>): Promise<Quiz>;
    getQuizById(id: string): Promise<Quiz | null>;
    getAvailableQuizzes(userId: string, limit?: number): Promise<Quiz[]>;
    generateQuestionsFromFAQs(topicArea?: string, difficulty?: 'easy' | 'medium' | 'hard', count?: number): Promise<QuizQuestion[]>;
    generateQuestionsFromChats(userId: string, limit?: number): Promise<QuizQuestion[]>;
    saveQuizQuestions(quizId: string, questions: QuizQuestion[]): Promise<void>;
    startQuizAttempt(userId: string, quizId: string): Promise<UserQuizAttempt>;
    submitQuizAnswers(attemptId: string, answers: UserAnswer[]): Promise<QuizResult>;
    getPersonalizedQuizSuggestions(userId: string, limit?: number): Promise<QuizSuggestion[]>;
    private generateQuizForTopic;
    private getPointsForDifficulty;
    private delay;
    getUserQuizStats(userId: string): Promise<any>;
    getAllQuizzes(): Promise<Quiz[]>;
    updateQuiz(id: string, updates: Partial<Quiz>): Promise<Quiz>;
    deleteQuiz(id: string): Promise<void>;
    getQuizQuestions(quizId: string): Promise<QuizQuestion[]>;
    updateQuizQuestion(id: string, updates: Partial<QuizQuestion>): Promise<QuizQuestion>;
    deleteQuizQuestion(id: string): Promise<void>;
    addQuizQuestion(quizId: string, question: Omit<QuizQuestion, 'id' | 'quiz_id' | 'created_at'>): Promise<QuizQuestion>;
    private findRelevantFAQs;
    private extractKeywords;
    private validateFAQRelevance;
    private validateWithLLM;
    createIntelligentQuiz(title: string, description: string, difficulty: 'easy' | 'medium' | 'hard', questionCount: number, createdBy?: string): Promise<{
        quiz: Quiz;
        questions: QuizQuestion[];
    }>;
}
//# sourceMappingURL=quizService.d.ts.map