/**
 * Quiz Repository Interface
 * Definiert die Datenzugriffs-Operationen für Quiz-Funktionalität
 */

import {
  Quiz,
  QuizQuestion,
  UserQuizAttempt,
  UserAnswer,
  QuizLeaderboard,
  QuizCreateRequest,
  QuestionCreateRequest,
  QuizSearchQuery,
  QuizSearchResult,
  QuizAttemptRequest,
  QuizSubmissionRequest,
  QuizStatistics
} from './quiz.interface';

export interface IQuizRepository {
  // Quiz CRUD Operations
  createQuiz(request: QuizCreateRequest & { created_by?: string }): Promise<Quiz>;
  getQuizById(quizId: string): Promise<Quiz | null>;
  getQuizWithQuestions(quizId: string): Promise<Quiz | null>;
  searchQuizzes(query: QuizSearchQuery): Promise<QuizSearchResult>;
  updateQuiz(quizId: string, updates: Partial<Quiz>): Promise<Quiz | null>;
  deleteQuiz(quizId: string): Promise<boolean>;
  
  // Question Operations
  createQuestion(quizId: string, request: QuestionCreateRequest): Promise<QuizQuestion>;
  getQuestionById(questionId: string): Promise<QuizQuestion | null>;
  getQuestionsByQuizId(quizId: string): Promise<QuizQuestion[]>;
  updateQuestion(questionId: string, updates: Partial<QuizQuestion>): Promise<QuizQuestion | null>;
  deleteQuestion(questionId: string): Promise<boolean>;
  
  // Quiz Attempt Operations
  createQuizAttempt(request: QuizAttemptRequest): Promise<UserQuizAttempt>;
  getQuizAttemptById(attemptId: string): Promise<UserQuizAttempt | null>;
  getQuizAttemptsByUser(userId: string, limit?: number, offset?: number): Promise<UserQuizAttempt[]>;
  getQuizAttemptsByQuiz(quizId: string, limit?: number, offset?: number): Promise<UserQuizAttempt[]>;
  updateQuizAttempt(attemptId: string, updates: Partial<UserQuizAttempt>): Promise<UserQuizAttempt | null>;
  completeQuizAttempt(attemptId: string, answers: UserAnswer[]): Promise<UserQuizAttempt | null>;
  
  // Leaderboard Operations
  getQuizLeaderboard(quizId: string, limit?: number): Promise<QuizLeaderboard[]>;
  getGlobalLeaderboard(limit?: number): Promise<QuizLeaderboard[]>;
  getUserLeaderboardEntry(userId: string, quizId: string): Promise<QuizLeaderboard | null>;
  updateLeaderboard(userId: string, quizId: string, attempt: UserQuizAttempt): Promise<QuizLeaderboard>;
  
  // Statistics Operations
  getQuizStatistics(quizId: string): Promise<QuizStatistics>;
  getUserQuizStatistics(userId: string): Promise<QuizStatistics>;
  
  // Bulk Operations
  deleteUserQuizData(userId: string): Promise<boolean>;
  
  // Admin Operations
  getQuizzesByCreator(creatorId: string): Promise<Quiz[]>;
  setQuizActive(quizId: string, isActive: boolean): Promise<boolean>;
}
