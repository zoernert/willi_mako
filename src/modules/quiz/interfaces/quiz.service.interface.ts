/**
 * Quiz Service Interface
 * Definiert die Business-Logic-Operationen für Quiz-Funktionalität
 */

import {
  Quiz,
  QuizQuestion,
  UserQuizAttempt,
  QuizLeaderboard,
  QuizCreateRequest,
  QuestionCreateRequest,
  QuizSearchQuery,
  QuizSearchResult,
  QuizSubmissionRequest,
  QuizStatistics
} from './quiz.interface';

export interface IQuizService {
  // Quiz Management
  createQuiz(request: QuizCreateRequest, createdBy?: string): Promise<Quiz>;
  getQuiz(quizId: string): Promise<Quiz>;
  getQuizWithQuestions(quizId: string): Promise<Quiz>;
  searchQuizzes(query: QuizSearchQuery): Promise<QuizSearchResult>;
  updateQuiz(quizId: string, updates: Partial<Quiz>, userId?: string): Promise<Quiz>;
  deleteQuiz(quizId: string, userId?: string): Promise<void>;
  
  // Question Management
  addQuestion(quizId: string, request: QuestionCreateRequest, userId?: string): Promise<QuizQuestion>;
  updateQuestion(questionId: string, updates: Partial<QuizQuestion>, userId?: string): Promise<QuizQuestion>;
  deleteQuestion(questionId: string, userId?: string): Promise<void>;
  
  // Quiz Taking
  startQuizAttempt(userId: string, quizId: string): Promise<UserQuizAttempt>;
  submitQuizAttempt(submission: QuizSubmissionRequest): Promise<UserQuizAttempt>;
  getQuizAttempt(attemptId: string, userId: string): Promise<UserQuizAttempt>;
  getUserQuizAttempts(userId: string, limit?: number, offset?: number): Promise<UserQuizAttempt[]>;
  
  // AI-Powered Quiz Generation
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
  
  // Gamification & Leaderboards
  getQuizLeaderboard(quizId: string, limit?: number): Promise<QuizLeaderboard[]>;
  getGlobalLeaderboard(limit?: number): Promise<QuizLeaderboard[]>;
  getUserRanking(userId: string, quizId?: string): Promise<{ rank: number; total: number }>;
  
  // Statistics & Analytics
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
  
  // Admin Functions
  getCreatedQuizzes(userId: string): Promise<Quiz[]>;
  activateQuiz(quizId: string, userId: string): Promise<void>;
  deactivateQuiz(quizId: string, userId: string): Promise<void>;
  
  // Validation
  validateQuizSubmission(submission: QuizSubmissionRequest): Promise<boolean>;
  canUserTakeQuiz(userId: string, quizId: string): Promise<boolean>;
  
  // Cleanup
  deleteUserQuizData(userId: string): Promise<void>;
}
