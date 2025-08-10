// Community API Service for Frontend
// CR-COMMUNITY-HUB-001
// Autor: AI Assistant
// Datum: 2025-08-10

import {
  CommunityThread,
  CommunityInitiative,
  CommunityComment,
  CreateThreadRequest,
  UpdateDocumentRequest,
  CreateInitiativeRequest,
  UpdateInitiativeRequest,
  UpdateInitiativeStatusRequest,
  CreateCommentRequest,
  UpdateThreadStatusRequest,
  ApiResponse,
  ThreadListResponse,
  InitiativeListResponse,
  CommunitySearchRequest,
  CommunitySearchResult,
  ChatEscalationRequest
} from '../types/community';

const API_BASE = '/api';

// Helper function for API calls
const apiCall = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

// Thread API
export const threadApi = {
  // Get all threads
  getThreads: async (params?: {
    page?: number;
    limit?: number;
    status?: string[];
    tags?: string[];
  }): Promise<ApiResponse<ThreadListResponse>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) params.status.forEach(s => searchParams.append('status', s));
    if (params?.tags) params.tags.forEach(t => searchParams.append('tags', t));

    return apiCall(`/community/threads?${searchParams}`);
  },

  // Get specific thread
  getThread: async (threadId: string): Promise<ApiResponse<CommunityThread>> => {
    return apiCall(`/community/threads/${threadId}`);
  },

  // Create new thread
  createThread: async (data: CreateThreadRequest): Promise<ApiResponse<CommunityThread>> => {
    return apiCall(`/community/threads`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update thread document
  updateDocument: async (
    threadId: string,
    data: UpdateDocumentRequest
  ): Promise<ApiResponse<{ thread: CommunityThread; changed: string[] }>> => {
    return apiCall(`/community/threads/${threadId}/document`, {
      method: 'PATCH',
      body: JSON.stringify(data.operations),
      headers: data.version ? { 'If-Version': data.version } : {},
    });
  },

  // Update thread status
  updateStatus: async (
    threadId: string,
    data: UpdateThreadStatusRequest
  ): Promise<ApiResponse<{ status: string }>> => {
    return apiCall(`/community/threads/${threadId}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Create thread from chat escalation
  createFromChat: async (data: ChatEscalationRequest): Promise<ApiResponse<CommunityThread>> => {
    return apiCall(`/community/threads/from-chat`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Comments API
export const commentApi = {
  // Get comments for thread
  getComments: async (threadId: string): Promise<ApiResponse<CommunityComment[]>> => {
    return apiCall(`/community/threads/${threadId}/comments`);
  },

  // Create comment
  createComment: async (
    threadId: string,
    data: CreateCommentRequest
  ): Promise<ApiResponse<CommunityComment>> => {
    return apiCall(`/community/threads/${threadId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Initiative API
export const initiativeApi = {
  // Get all initiatives
  getInitiatives: async (params?: {
    page?: number;
    limit?: number;
    status?: string[];
  }): Promise<ApiResponse<InitiativeListResponse>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) params.status.forEach(s => searchParams.append('status', s));

    return apiCall(`/community/initiatives?${searchParams}`);
  },

  // Get specific initiative
  getInitiative: async (initiativeId: string): Promise<ApiResponse<CommunityInitiative>> => {
    return apiCall(`/community/initiatives/${initiativeId}`);
  },

  // Get initiatives for thread
  getThreadInitiatives: async (threadId: string): Promise<ApiResponse<CommunityInitiative>> => {
    return apiCall(`/community/threads/${threadId}/initiatives`);
  },

  // Create initiative
  createInitiative: async (
    threadId: string,
    data: CreateInitiativeRequest
  ): Promise<ApiResponse<CommunityInitiative>> => {
    return apiCall(`/community/threads/${threadId}/initiatives`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update initiative
  updateInitiative: async (
    initiativeId: string,
    data: UpdateInitiativeRequest
  ): Promise<ApiResponse<CommunityInitiative>> => {
    return apiCall(`/community/initiatives/${initiativeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Update initiative status
  updateStatus: async (
    initiativeId: string,
    data: UpdateInitiativeStatusRequest
  ): Promise<ApiResponse<{ status: string; updated_at: string }>> => {
    return apiCall(`/community/initiatives/${initiativeId}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete initiative (draft only)
  deleteInitiative: async (initiativeId: string): Promise<ApiResponse<{ message: string }>> => {
    return apiCall(`/community/initiatives/${initiativeId}`, {
      method: 'DELETE',
    });
  },
};

// Search API
export const searchApi = {
  // Search threads
  searchThreads: async (data: CommunitySearchRequest): Promise<ApiResponse<CommunitySearchResult>> => {
    return apiCall(`/community/search`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Admin API
export const adminApi = {
  // Create FAQ from thread
  createFaqFromThread: async (threadId: string): Promise<ApiResponse<any>> => {
    return apiCall(`/admin/community/create-faq-from-thread`, {
      method: 'POST',
      body: JSON.stringify({ threadId }),
    });
  },
};

// Combined community service
export const communityService = {
  thread: threadApi,
  comment: commentApi,
  initiative: initiativeApi,
  search: searchApi,
  admin: adminApi,
};

export default communityService;
