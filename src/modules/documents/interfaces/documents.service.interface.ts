/**
 * Documents Service Interface
 * Definiert die Business-Logic-Operationen für Dokumenten-Management
 */

import {
  FAQ,
  ChatSession,
  ChatMessage,
  DocumentProcessingJob,
  FAQCreateRequest,
  FAQUpdateRequest,
  FAQSearchQuery,
  FAQSearchResult,
  ChatSessionCreateRequest,
  ChatMessageCreateRequest,
  ChatSearchQuery,
  DocumentAnalysisResult
} from './documents.interface';

export interface IDocumentsService {
  // FAQ Management
  createFAQ(request: FAQCreateRequest, createdBy?: string): Promise<FAQ>;
  getFAQ(faqId: string): Promise<FAQ>;
  searchFAQs(query: FAQSearchQuery): Promise<FAQSearchResult>;
  updateFAQ(faqId: string, updates: FAQUpdateRequest, userId?: string): Promise<FAQ>;
  deleteFAQ(faqId: string, userId?: string): Promise<void>;
  publishFAQ(faqId: string, userId?: string): Promise<FAQ>;
  unpublishFAQ(faqId: string, userId?: string): Promise<FAQ>;
  
  // FAQ Interactions
  viewFAQ(faqId: string): Promise<FAQ>;
  markFAQHelpful(faqId: string, userId: string): Promise<void>;
  markFAQNotHelpful(faqId: string, userId: string): Promise<void>;
  
  // AI-Powered FAQ Generation
  generateFAQFromChat(chatMessageIds: string[]): Promise<FAQ>;
  generateFAQFromDocument(documentId: string, userId: string): Promise<FAQ>;
  improveFAQContent(faqId: string): Promise<FAQ>;
  
  // Chat Management
  createChatSession(userId: string, request: ChatSessionCreateRequest): Promise<ChatSession>;
  getChatSession(sessionId: string, userId: string): Promise<ChatSession>;
  getUserChatSessions(userId: string, limit?: number, offset?: number): Promise<ChatSession[]>;
  searchChatSessions(query: ChatSearchQuery): Promise<ChatSession[]>;
  archiveChatSession(sessionId: string, userId: string): Promise<void>;
  deleteChatSession(sessionId: string, userId: string): Promise<void>;
  
  // Chat Messaging
  sendMessage(sessionId: string, userId: string, content: string): Promise<ChatMessage>;
  getChatMessages(sessionId: string, userId: string, limit?: number, offset?: number): Promise<ChatMessage[]>;
  generateAIResponse(sessionId: string, userMessage: string, userId: string): Promise<ChatMessage>;
  
  // Context-Aware Chat
  enableContextForSession(sessionId: string, userId: string): Promise<void>;
  disableContextForSession(sessionId: string, userId: string): Promise<void>;
  getRelevantContext(query: string, userId: string): Promise<{
    documents: string[];
    faqs: string[];
    notes: string[];
  }>;
  
  // Document Processing
  processDocument(documentId: string, jobType: 'text_extraction' | 'vectorization' | 'ai_analysis'): Promise<DocumentProcessingJob>;
  getProcessingStatus(jobId: string): Promise<DocumentProcessingJob>;
  analyzeDocument(documentId: string): Promise<DocumentAnalysisResult>;
  
  // Content Search & Discovery
  searchContent(query: string, userId?: string): Promise<{
    faqs: FAQ[];
    chatMessages: ChatMessage[];
    relevanceScore: number;
  }>;
  
  getSimilarContent(contentId: string, contentType: 'faq' | 'chat'): Promise<{
    faqs: FAQ[];
    chatMessages: ChatMessage[];
  }>;
  
  // Content Analytics
  getFAQAnalytics(): Promise<{
    totalViews: number;
    helpfulRatio: number;
    topCategories: { category: string; count: number }[];
    popularFAQs: FAQ[];
  }>;
  
  getChatAnalytics(userId?: string): Promise<{
    totalSessions: number;
    averageSessionLength: number;
    mostActiveHours: number[];
    topTopics: string[];
  }>;
  
  // Cleanup Operations
  deleteUserContent(userId: string): Promise<void>;
  
  // Admin Operations
  moderateFAQ(faqId: string, action: 'approve' | 'reject', moderatorId: string): Promise<FAQ>;
  getFAQsByCreator(creatorId: string): Promise<FAQ[]>;
}
