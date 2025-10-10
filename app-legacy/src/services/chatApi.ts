import apiClient from './apiClient';
import { API_ENDPOINTS } from './apiEndpoints';

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
  share_enabled?: boolean;
  shareEnabled?: boolean;
  share_enabled_at?: string | null;
  shareEnabledAt?: string | null;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  metadata?: any;
}

export interface ChatWithMessages {
  chat: ChatSession;
  messages: Message[];
}

export interface SendMessageResponse {
  userMessage: Message;
  assistantMessage: Message;
  updatedChatTitle?: string;
  type: 'normal' | 'clarification';
  cs30AdditionalResponse?: Message; // CR-CS30: Add CS30 additional response support
  hasCs30Additional?: boolean;      // CR-CS30: Indicator for CS30 additional response
}

export interface GenerateResponse {
  assistantMessage: Message;
  type: 'enhanced_response';
}

export interface ContextSettings {
  useWorkspaceOnly: boolean;
  workspacePriority: 'high' | 'medium' | 'low' | 'disabled';
  includeUserDocuments: boolean;
  includeUserNotes: boolean;
  includeSystemKnowledge: boolean;
  includeM2CRoles: boolean;
  useDetailedIntentAnalysis?: boolean; // Neue Option für tiefere Intent-Analyse
}

export interface SendMessageRequest {
  content: string;
  contextSettings?: ContextSettings;
}

export interface ChatSearchResult extends ChatSession {
  message_count: number;
  matching_snippets?: string;
}

export interface ChatShareSettings {
  share_enabled: boolean;
  shareEnabled?: boolean;
  share_enabled_at: string | null;
  shareEnabledAt?: string | null;
}

const normalizeShareFlag = (value: any): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return Boolean(value);
};

const normalizeShareMetadata = (chat: any): { shareEnabled: boolean; shareEnabledAt: string | null } => {
  const metadata = chat?.metadata || {};
  const shareEnabledRaw =
    chat?.share_enabled ?? chat?.shareEnabled ?? metadata.share_enabled ?? metadata.shareEnabled ?? false;

  const shareEnabled = normalizeShareFlag(shareEnabledRaw);

  const shareEnabledAtRaw =
    chat?.share_enabled_at ?? chat?.shareEnabledAt ?? metadata.share_enabled_at ?? metadata.shareEnabledAt ?? null;

  if (!shareEnabled) {
    return { shareEnabled: false, shareEnabledAt: null };
  }

  if (!shareEnabledAtRaw) {
    return { shareEnabled: true, shareEnabledAt: null };
  }

  if (typeof shareEnabledAtRaw === 'string') {
    return { shareEnabled: true, shareEnabledAt: shareEnabledAtRaw };
  }

  try {
    return { shareEnabled: true, shareEnabledAt: new Date(shareEnabledAtRaw).toISOString() };
  } catch {
    return { shareEnabled: true, shareEnabledAt: null };
  }
};

type ChatRow = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
};

const normalizeChatSession = <T extends ChatRow>(chat: T): ChatSession & T => {
  if (!chat) {
    return chat as ChatSession & T;
  }

  const { shareEnabled, shareEnabledAt } = normalizeShareMetadata(chat);

  return {
    ...chat,
    metadata: chat.metadata,
    share_enabled: shareEnabled,
    shareEnabled,
    share_enabled_at: shareEnabledAt,
    shareEnabledAt,
  } as ChatSession & T;
};

export const chatApi = {
  // Get all user's chats
  getChats: async (): Promise<ChatSession[]> => {
    const response = await apiClient.get<any[]>(API_ENDPOINTS.chat.list);
    if (!Array.isArray(response)) {
      return [];
    }
  return response.map((chat) => normalizeChatSession(chat as ChatRow));
  },

  // Search user's chats
  searchChats: (query: string): Promise<ChatSearchResult[]> => {
    console.log('API-Anfrage: Suche nach', query);
    return apiClient.get(`${API_ENDPOINTS.chat.search}?q=${encodeURIComponent(query)}`)
      .then((response: any) => {
        console.log('API-Antwort Suche:', response);
        // Fix: Ergebnisse können entweder direkt in response sein oder in response.data.data
        const rawResults = (() => {
          if (response && Array.isArray(response)) {
            return response;
          } else if (response && response.data && Array.isArray(response.data)) {
            return response.data;
          } else if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
            return response.data.data;
          }
          return [];
        })();

        return rawResults.map((result: any) => {
          const normalized = normalizeChatSession(result as ChatRow);
          return {
            ...normalized,
            message_count: result.message_count,
            matching_snippets: result.matching_snippets,
          };
        });
      });
  },

  // Get specific chat with messages
  getChat: async (chatId: string): Promise<ChatWithMessages> => {
    const response = await apiClient.get<ChatWithMessages>(API_ENDPOINTS.chat.detail(chatId));
    return {
      chat: normalizeChatSession(response.chat as ChatRow),
      messages: response.messages || [],
    };
  },

  // Create new chat
  createChat: async (title?: string): Promise<ChatSession> => {
    const chat = await apiClient.post<ChatSession>(API_ENDPOINTS.chat.create, { title: title || 'Neuer Chat' });
    return normalizeChatSession(chat as ChatRow);
  },

  // Send message in chat with extended timeout for complex queries
  sendMessage: (chatId: string, content: string, contextSettings?: ContextSettings): Promise<SendMessageResponse> => {
    return apiClient.postWithTimeout(API_ENDPOINTS.chat.sendMessage(chatId), { 
      content, 
      contextSettings 
    }, 180000); // 3 minutes timeout for complex chat queries
  },

  // Send clarification response
  sendClarification: (
    chatId: string, 
    originalQuery: string, 
    clarificationResponses: { questionId: string; answer: string }[]
  ): Promise<SendMessageResponse> => {
    return apiClient.post(API_ENDPOINTS.chat.clarification(chatId), {
      originalQuery,
      clarificationResponses
    });
  },

  // Generate response with clarification with extended timeout
  generateResponse: (
    chatId: string, 
    originalQuery: string, 
    clarificationResponses?: { questionId: string; answer: string }[]
  ): Promise<GenerateResponse> => {
    return apiClient.postWithTimeout(API_ENDPOINTS.chat.generate(chatId), {
      originalQuery,
      clarificationResponses: clarificationResponses || []
    }, 180000); // 3 minutes timeout for complex generations
  },

  // Send message with screenshot
  sendMessageWithScreenshot: (
    chatId: string, 
    content: string, 
    screenshot: File,
    analysis?: any,
    contextSettings?: ContextSettings
  ): Promise<SendMessageResponse> => {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('screenshot', screenshot);
    if (analysis) {
      formData.append('analysis', JSON.stringify(analysis));
    }
    if (contextSettings) {
      formData.append('contextSettings', JSON.stringify(contextSettings));
    }
    
    return apiClient.postMultipart(API_ENDPOINTS.chat.sendMessage(chatId), formData, {
      timeout: 180000 // 3 minutes timeout for screenshot processing
    });
  },

  // Analyze screenshot
  analyzeScreenshot: (screenshot: File): Promise<{ analysis: any }> => {
    const formData = new FormData();
    formData.append('screenshot', screenshot);
    
    return apiClient.postMultipart('/chat/analyze-screenshot', formData);
  },

  // Update chat title
  updateChatTitle: async (chatId: string, title: string): Promise<ChatSession> => {
    const updated = await apiClient.put<ChatSession>(API_ENDPOINTS.chat.update(chatId), { title });
    return normalizeChatSession(updated as ChatRow);
  },

  // Delete chat
  deleteChat: (chatId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(API_ENDPOINTS.chat.delete(chatId));
  },

  // Update share settings
  updateShareSettings: (chatId: string, enabled: boolean): Promise<ChatShareSettings> => {
    return apiClient.post(API_ENDPOINTS.chat.share(chatId), { enabled });
  },

  // Fetch public chat (no auth required)
  getPublicChat: async (chatId: string): Promise<ChatWithMessages> => {
    const response = await apiClient.get<ChatWithMessages>(API_ENDPOINTS.chat.publicDetail(chatId));
    return {
      chat: normalizeChatSession(response.chat as ChatRow),
      messages: response.messages || [],
    };
  }
};
