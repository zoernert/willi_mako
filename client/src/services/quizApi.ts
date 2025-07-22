import apiClient from './apiClient';
import { API_ENDPOINTS } from './apiEndpoints';
import { 
  Quiz, 
  QuizResult, 
  QuizQuestion, 
  UserAnswer, 
  UserQuizAttempt, 
  QuizSuggestion, 
  LeaderboardEntry,
  UserStats,
  QuizGenerateRequest,
  QuizGenerateFromChatsRequest
} from '../types/quiz';


export const quizApi = {
  // Public Quiz Endpoints
  getQuizzes: (): Promise<Quiz[]> => {
    return apiClient.get(API_ENDPOINTS.quiz.list);
  },
  getSuggestions: (): Promise<QuizSuggestion[]> => {
    return apiClient.get(API_ENDPOINTS.quiz.suggestions);
  },
  getUserStats: (): Promise<UserStats> => {
    return apiClient.get(API_ENDPOINTS.quiz.stats);
  },
  generateQuiz: (data: QuizGenerateRequest): Promise<{ quiz: Quiz }> => {
    return apiClient.post(API_ENDPOINTS.quiz.generate, data);
  },
  generateQuizFromChats: (data: QuizGenerateFromChatsRequest): Promise<{ quiz: Quiz }> => {
    return apiClient.post(API_ENDPOINTS.quiz.generateFromChats, data);
  },
  getQuiz: (quizId: string): Promise<Quiz> => {
    return apiClient.get(API_ENDPOINTS.quiz.detail(quizId));
  },
  startQuiz: (quizId: string): Promise<UserQuizAttempt> => {
    return apiClient.post(API_ENDPOINTS.quiz.start(quizId));
  },
  submitQuiz: (quizId: string, attemptId: string, answers: UserAnswer[]): Promise<QuizResult> => {
    return apiClient.post(API_ENDPOINTS.quiz.submit(quizId), { attemptId, answers });
  },
  getQuizResults: (attemptId: string): Promise<QuizResult> => {
    return apiClient.get(API_ENDPOINTS.quiz.results(attemptId));
  },
  getLeaderboard: (): Promise<LeaderboardEntry[]> => {
    return apiClient.get(API_ENDPOINTS.quiz.leaderboard);
  },

  // Admin Quiz Endpoints
  getAdminQuizzes: (): Promise<Quiz[]> => {
    return apiClient.get(API_ENDPOINTS.admin.quizzes);
  },
  getAdminQuizQuestions: (quizId: string): Promise<QuizQuestion[]> => {
    return apiClient.get(API_ENDPOINTS.admin.questions(quizId));
  },
  updateAdminQuiz: (quizId: string, quizData: Partial<Quiz>): Promise<Quiz> => {
    return apiClient.put(API_ENDPOINTS.admin.quiz(quizId), quizData);
  },
  deleteAdminQuiz: (quizId: string): Promise<void> => {
    return apiClient.delete(API_ENDPOINTS.admin.quiz(quizId));
  },
  updateAdminQuizQuestion: (questionId: string, questionData: Partial<QuizQuestion>): Promise<QuizQuestion> => {
    return apiClient.put(API_ENDPOINTS.admin.question(questionId), questionData);
  },
  deleteAdminQuizQuestion: (questionId: string): Promise<void> => {
    return apiClient.delete(API_ENDPOINTS.admin.question(questionId));
  },
  createIntelligentQuiz: (topic: string, numQuestions: number, difficulty: string): Promise<Quiz> => {
    return apiClient.post(API_ENDPOINTS.admin.createIntelligent, { topic, numQuestions, difficulty });
  }
};
