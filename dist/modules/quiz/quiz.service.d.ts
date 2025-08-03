import { Quiz, QuizQuestion, UserQuizAttempt, UserAnswer, QuizResult, QuizSuggestion } from './quiz.interface';
export declare class QuizService {
    private geminiService;
    private gamificationService;
    private qdrantService;
    constructor();
    createQuiz(quizData: Omit<Quiz, 'id' | 'created_at' | 'updated_at'>): Promise<Quiz>;
    getQuizById(id: string, includeInactive?: boolean): Promise<Quiz | null>;
    getAvailableQuizzes(userId: string, limit?: number): Promise<Quiz[]>;
    saveQuizQuestions(quizId: string, questions: QuizQuestion[]): Promise<void>;
    startQuizAttempt(userId: string, quizId: string): Promise<UserQuizAttempt>;
    submitQuizAnswers(attemptId: string, userId: string, answers: UserAnswer[]): Promise<QuizResult>;
    getQuizResult(attemptId: string, userId: string): Promise<QuizResult>;
    private checkAnswer;
    getAllQuizzesForAdmin(): Promise<Quiz[]>;
    getQuizQuestionsForAdmin(quizId: string): Promise<QuizQuestion[]>;
    updateQuizAsAdmin(quizId: string, quizData: Partial<Quiz>): Promise<Quiz>;
    deleteQuizAsAdmin(quizId: string): Promise<void>;
    updateQuizQuestionAsAdmin(questionId: string, questionData: Partial<QuizQuestion>): Promise<QuizQuestion>;
    deleteQuizQuestionAsAdmin(questionId: string): Promise<void>;
    generateIntelligentQuiz(topic: string, numQuestions: number, difficulty: 'easy' | 'medium' | 'hard', userId: string): Promise<Quiz>;
    getUserQuizzes(userId: string): Promise<Quiz[]>;
    getQuizSuggestions(userId: string): Promise<QuizSuggestion[]>;
    getUserStats(userId: string): Promise<any>;
    generateQuizFromTopic(topicArea: string, difficulty: 'easy' | 'medium' | 'hard', questionCount: number, userId: string): Promise<Quiz>;
    generateQuizFromChats(userId: string, questionCount: number): Promise<Quiz>;
}
export declare const quizService: QuizService;
//# sourceMappingURL=quiz.service.d.ts.map