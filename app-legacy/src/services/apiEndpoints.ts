/**
 * API Endpoints Konfiguration - Zentralisierte URL-Verwaltung
 */

export const API_ENDPOINTS = {
  // User
  user: {
    profile: '/v2/user/profile',
    preferences: '/v2/user/preferences',
    flipModePreferences: '/v2/user/flip-mode-preferences',
  },

  // Chat
  chat: {
    list: '/chat/chats',
    search: '/chat/chats/search',
    detail: (chatId: string) => `/chat/chats/${chatId}`,
    create: '/chat/chats',
    sendMessage: (chatId: string) => `/chat/chats/${chatId}/messages`,
    generate: (chatId: string) => `/chat/chats/${chatId}/generate`,
    clarification: (chatId: string) => `/chat/chats/${chatId}/clarification`,
    update: (chatId: string) => `/chat/chats/${chatId}`,
    delete: (chatId: string) => `/chat/chats/${chatId}`,
    share: (chatId: string) => `/chat/chats/${chatId}/share`,
    publicDetail: (chatId: string) => `/public/chat/${chatId}`,
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
    // Neue Endpunkte für Benutzerverwaltung
    users: '/admin/users',
    userDetails: (userId: string) => `/admin/users/${userId}/details`,
  },

  // Documents
  documents: {
    list: '/workspace/documents',
    upload: '/workspace/documents/upload',
    uploadMultiple: '/workspace/documents/upload-multiple',
    detail: (documentId: string) => `/workspace/documents/${documentId}`,
    update: (documentId: string) => `/workspace/documents/${documentId}`,
    preview: (documentId: string) => `/workspace/documents/${documentId}/preview`,
    download: (documentId: string) => `/workspace/documents/${documentId}/download`,
    delete: (documentId: string) => `/workspace/documents/${documentId}`,
    reprocess: (documentId: string) => `/workspace/documents/${documentId}/reprocess`,
    aiContext: (documentId: string) => `/workspace/documents/${documentId}/ai-context`,
  },

  // Workspace
  workspace: {
    settings: '/workspace/settings',
    dashboard: '/workspace/dashboard', 
    teamDashboard: '/workspace/team-dashboard',
    teamDocuments: '/workspace/team-documents',
    teamSearch: '/workspace/team-search',
    storage: '/workspace/storage',
    cleanup: '/workspace/cleanup',
    export: '/workspace/export',
    deleteData: '/workspace/data',
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

  // Processes
  processes: {
    search: '/processes/search',
    optimize: '/processes/optimize',
    related: '/processes/related',
    health: '/processes/health',
    improveMermaid: '/processes/improve-mermaid',
    validateMermaid: '/processes/validate-mermaid',
  },

  // Timeline
  timeline: {
    list: '/timelines',
    create: '/timelines',
    detail: (timelineId: string) => `/timelines/${timelineId}`,
    update: (timelineId: string) => `/timelines/${timelineId}`,
    delete: (timelineId: string) => `/timelines/${timelineId}`,
    activate: (timelineId: string) => `/timelines/${timelineId}/activate`,
    activities: (timelineId: string) => `/timelines/${timelineId}/activities`,
    stats: '/timeline/stats',
    
    // Activity Management
    activity: {
      capture: '/timeline-activity/capture',
      status: (activityId: string) => `/timeline-activity/${activityId}/status`,
      update: (activityId: string) => `/activities/${activityId}`,
      delete: (activityId: string) => `/activities/${activityId}`,
    },
    
    // Sharing (planned)
    sharing: {
      share: (timelineId: string) => `/timelines/${timelineId}/share`,
      shared: '/timelines/shared',
    }
  },

  // Teams
  teams: {
    list: '/teams',
    create: '/teams',
    myTeam: '/teams/my-team',
    detail: (teamId: string) => `/teams/${teamId}`,
    update: (teamId: string) => `/teams/${teamId}`,
    delete: (teamId: string) => `/teams/${teamId}`,
    leave: '/teams/leave',
    invite: (teamId: string) => `/teams/${teamId}/invite`,
    members: (teamId: string) => `/teams/${teamId}/members`,
    addMember: (teamId: string) => `/teams/${teamId}/members`,
    removeMember: (teamId: string, userId: string) => `/teams/${teamId}/members/${userId}`,
    updateRole: (teamId: string, userId: string) => `/teams/${teamId}/members/${userId}/role`,
    
    // Invitations
    invitations: {
      create: (teamId: string) => `/teams/${teamId}/invite`, // Updated to use new /invite endpoint
      list: (teamId: string) => `/teams/${teamId}/invitations`,
      accept: (token: string) => `/teams/invitations/${token}/accept`, // Updated path
      acceptAuthenticated: (token: string) => `/teams/invitations/${token}/accept-authenticated`, // New endpoint
      decline: (token: string) => `/teams/invitations/${token}/decline`, // Updated path
      revoke: (teamId: string, invitationId: string) => `/teams/${teamId}/invitations/${invitationId}`,
      info: (token: string) => `/teams/invitations/${token}`, // Updated path
    },

    // Join Requests
    joinRequests: {
      create: (teamId: string) => `/teams/${teamId}/join-requests`,
      list: (teamId: string) => `/teams/${teamId}/join-requests`,
      approve: (teamId: string, requestId: string) => `/teams/${teamId}/join-requests/${requestId}/approve`,
      reject: (teamId: string, requestId: string) => `/teams/${teamId}/join-requests/${requestId}/reject`,
    },

    // Leaderboard
    leaderboard: (teamId: string) => `/teams/${teamId}/leaderboard`,
    
    // Admin functions
    admin: {
      transferOwnership: (teamId: string) => `/teams/${teamId}/transfer-ownership`,
      analytics: (teamId: string) => `/teams/${teamId}/analytics`,
    }
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
