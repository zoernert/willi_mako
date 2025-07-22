/**
 * API Endpoints Konfiguration - Zentralisierte URL-Verwaltung
 */

export const API_ENDPOINTS = {
  // User
  user: {
    profile: '/v2/user/profile',
    preferences: '/v2/user/preferences',
  },

  // Quiz
  quiz: {
    list: '/v2/quiz',
    suggestions: '/v2/quiz/suggestions',
    stats: '/v2/quiz/stats',
    generate: '/v2/quiz/generate',
    generateFromChats: '/v2/quiz/generate-from-chats',
    detail: (quizId: string) => `/v2/quiz/${quizId}`,
    start: (quizId: string) => `/v2/quiz/${quizId}/start`,
    submit: (quizId: string) => `/v2/quiz/${quizId}/submit`,
    results: (attemptId: string) => `/v2/quiz/results/${attemptId}`,
    leaderboard: '/v2/quiz/leaderboard',
  },

  // Admin Quiz Management
  admin: {
    quizzes: '/admin/quizzes',
    quiz: (quizId: string) => `/admin/quizzes/${quizId}`,
    questions: (quizId: string) => `/admin/quizzes/${quizId}/questions`,
    question: (questionId: string) => `/admin/quizzes/questions/${questionId}`,
    createIntelligent: '/admin/quizzes/create-intelligent',
  },

  // Documents
  documents: {
    list: '/documents',
    upload: '/documents/upload',
    uploadMultiple: '/documents/upload-multiple',
    detail: (documentId: string) => `/documents/${documentId}`,
    update: (documentId: string) => `/documents/${documentId}`,
    preview: (documentId: string) => `/documents/${documentId}/preview`,
    download: (documentId: string) => `/documents/${documentId}/download`,
    delete: (documentId: string) => `/documents/${documentId}`,
    reprocess: (documentId: string) => `/documents/${documentId}/reprocess`,
  },

  // Workspace
  workspace: {
    settings: '/workspace/settings',
    search: '/workspace/search',
    context: '/workspace/context',
  },

  // Notes
  notes: {
    list: '/notes',
    create: '/notes',
    update: (noteId: string) => `/notes/${noteId}`,
    delete: (noteId: string) => `/notes/${noteId}`,
    search: '/notes/search',
    tags: '/notes/tags',
  },

  // Auth
  auth: {
    login: '/auth/login',
    register: '/auth/register',
  },
} as const;

// Helper function to build URLs with query parameters
export const buildUrl = (endpoint: string, params?: Record<string, string | number>): string => {
  if (!params) return endpoint;
  
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.append(key, value.toString());
  });
  
  return `${endpoint}?${searchParams.toString()}`;
};

// Type-safe endpoint access
export type ApiEndpoints = typeof API_ENDPOINTS;
