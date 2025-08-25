import apiClient from './apiClient';
import { API_ENDPOINTS } from './apiEndpoints';

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
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

export const chatApi = {
  // Get all user's chats
  getChats: (): Promise<ChatSession[]> => {
    return apiClient.get(API_ENDPOINTS.chat.list);
  },

  // Search user's chats
  searchChats: (query: string): Promise<ChatSearchResult[]> => {
    console.log('API-Anfrage: Suche nach', query);
    return apiClient.get(`${API_ENDPOINTS.chat.search}?q=${encodeURIComponent(query)}`)
      .then((response: any) => {
        console.log('API-Antwort Suche:', response);
        // Fix: Ergebnisse können entweder direkt in response sein oder in response.data.data
        if (response && Array.isArray(response)) {
          return response;
        } else if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        } else if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
        return [];
      });
  },

  // Get specific chat with messages
  getChat: (chatId: string): Promise<ChatWithMessages> => {
    return apiClient.get(API_ENDPOINTS.chat.detail(chatId));
  },

  // Create new chat
  createChat: (title?: string): Promise<ChatSession> => {
    return apiClient.post(API_ENDPOINTS.chat.create, { title: title || 'Neuer Chat' });
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
  updateChatTitle: (chatId: string, title: string): Promise<ChatSession> => {
    return apiClient.put(API_ENDPOINTS.chat.update(chatId), { title });
  },

  // Delete chat
  deleteChat: (chatId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(API_ENDPOINTS.chat.delete(chatId));
  }
};
