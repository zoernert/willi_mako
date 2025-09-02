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

// Normalize backend quiz payloads (AI-generated or admin endpoints) to match frontend types
const toStringOption = (opt: any): string => {
  if (typeof opt === 'string') return opt;
  if (typeof opt === 'number') return String(opt);
  if (opt && typeof opt === 'object') {
    if ('text' in opt) return String((opt as any).text);
    if ('label' in opt) return String((opt as any).label);
    try { return JSON.stringify(opt); } catch { return String(opt); }
  }
  return '';
};

const ensureString = (v: any): string => {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (v && typeof v === 'object') {
    if ('text' in v) return String((v as any).text);
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  return v == null ? '' : String(v);
};

const normalizeQuestion = (q: any): QuizQuestion => {
  const optionsRaw = Array.isArray(q.answer_options) ? q.answer_options : [];
  const normalizedOptions = optionsRaw.map(toStringOption);

  // Normalize correct_answers: can be strings, indices, or objects
  let normalizedCorrect: string[] = [];
  const rawCorrect = Array.isArray(q.correct_answers) ? q.correct_answers : [];
  normalizedCorrect = rawCorrect.map((c: any) => {
    if (typeof c === 'number') return normalizedOptions[c] ?? String(c);
    if (typeof c === 'string') return c;
    if (c && typeof c === 'object') {
      if ('index' in c) {
        const idx = (c as any).index as number;
        return normalizedOptions[idx] ?? '';
      }
      if ('text' in c) return String((c as any).text);
    }
    try { return JSON.stringify(c); } catch { return String(c); }
  }).filter(Boolean);

  const questionTextRaw = q.question_text ?? q.text ?? '';
  const questionText = ensureString(questionTextRaw);
  const explanation = ensureString(q.explanation ?? '');

  return {
    id: q.id,
    quiz_id: q.quiz_id,
    question_text: questionText,
    question_type: q.question_type ?? 'multiple-choice',
    answer_options: normalizedOptions,
    correct_answers: normalizedCorrect,
    explanation,
    difficulty_level: q.difficulty_level ?? q.difficulty ?? 'medium',
    points: q.points ?? 1,
    topic: q.topic,
  } as QuizQuestion;
};

const normalizeQuiz = (quiz: any): Quiz => {
  const questions = Array.isArray(quiz.questions) ? quiz.questions.map(normalizeQuestion) : quiz.questions;
  return {
    id: quiz.id,
    title: ensureString(quiz.title ?? quiz.name ?? 'Quiz'),
    description: ensureString(quiz.description ?? ''),
    difficulty_level: quiz.difficulty_level ?? quiz.difficulty ?? 'medium',
    topic_area: ensureString(quiz.topic_area ?? quiz.topic ?? ''),
    time_limit_minutes: quiz.time_limit_minutes ?? quiz.timeLimit ?? 10,
    question_count: quiz.question_count ?? questions?.length ?? 0,
    is_active: quiz.is_active ?? false,
    created_by: ensureString(quiz.created_by ?? ''),
    created_at: quiz.created_at ?? new Date().toISOString(),
    updated_at: quiz.updated_at ?? new Date().toISOString(),
    questions,
    attempt_count: quiz.attempt_count,
    best_score: quiz.best_score,
  } as Quiz;
};

const LONG_AI_TIMEOUT = 180000; // 3 minutes

export const quizApi = {
  // Public Quiz Endpoints
  getQuizzes: async (): Promise<Quiz[]> => {
    const list = await apiClient.get<any[]>(API_ENDPOINTS.quiz.list);
    return Array.isArray(list) ? list.map(normalizeQuiz) : [];
  },
  getSuggestions: (): Promise<QuizSuggestion[]> => {
    return apiClient.get(API_ENDPOINTS.quiz.suggestions);
  },
  getUserStats: (): Promise<UserStats> => {
    return apiClient.get(API_ENDPOINTS.quiz.stats);
  },
  generateQuiz: async (data: QuizGenerateRequest): Promise<{ quiz: Quiz }> => {
    const response = await apiClient.postWithTimeout<{ quiz: any }>(API_ENDPOINTS.quiz.generate, data, LONG_AI_TIMEOUT);
    return { quiz: normalizeQuiz(response.quiz) };
  },
  generateQuizFromChats: async (data: QuizGenerateFromChatsRequest): Promise<{ quiz: Quiz }> => {
    const response = await apiClient.postWithTimeout<{ quiz: any }>(API_ENDPOINTS.quiz.generateFromChats, data, LONG_AI_TIMEOUT);
    return { quiz: normalizeQuiz(response.quiz) };
  },
  getQuiz: async (quizId: string): Promise<Quiz> => {
    const q = await apiClient.get<any>(API_ENDPOINTS.quiz.detail(quizId));
    return normalizeQuiz(q);
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
  getAdminQuizzes: async (): Promise<Quiz[]> => {
    const list = await apiClient.get<any[]>(API_ENDPOINTS.admin.quizzes);
    return Array.isArray(list) ? list.map(normalizeQuiz) : [];
  },
  getAdminQuizQuestions: async (quizId: string): Promise<QuizQuestion[]> => {
    const list = await apiClient.get<any[]>(API_ENDPOINTS.admin.questions(quizId));
    return Array.isArray(list) ? list.map(normalizeQuestion) : [];
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
  createIntelligentQuiz: async (topic: string, numQuestions: number, difficulty: string): Promise<Quiz> => {
    const response = await apiClient.postWithTimeout<any>(API_ENDPOINTS.admin.createIntelligent, { topic, numQuestions, difficulty }, LONG_AI_TIMEOUT);
    // Some backends return { quiz }, others return the quiz directly
    const rawQuiz = response?.quiz ?? response;
    return normalizeQuiz(rawQuiz);
  }
};
