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
}

export interface SendMessageRequest {
  content: string;
  contextSettings?: ContextSettings;
}

export const chatApi = {
  // Get all user's chats
  getChats: (): Promise<ChatSession[]> => {
    return apiClient.get(API_ENDPOINTS.chat.list);
  },

  // Get specific chat with messages
  getChat: (chatId: string): Promise<ChatWithMessages> => {
    return apiClient.get(API_ENDPOINTS.chat.detail(chatId));
  },

  // Create new chat
  createChat: (title?: string): Promise<ChatSession> => {
    return apiClient.post(API_ENDPOINTS.chat.create, { title: title || 'Neuer Chat' });
  },

  // Send message in chat
  sendMessage: (chatId: string, content: string, contextSettings?: ContextSettings): Promise<SendMessageResponse> => {
    return apiClient.post(API_ENDPOINTS.chat.sendMessage(chatId), { 
      content, 
      contextSettings 
    });
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

  // Generate response with clarification
  generateResponse: (
    chatId: string, 
    originalQuery: string, 
    clarificationResponses?: { questionId: string; answer: string }[]
  ): Promise<GenerateResponse> => {
    return apiClient.post(API_ENDPOINTS.chat.generate(chatId), {
      originalQuery,
      clarificationResponses: clarificationResponses || []
    });
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
