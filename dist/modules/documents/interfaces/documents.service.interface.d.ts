import { FAQ, ChatSession, ChatMessage, DocumentProcessingJob, FAQCreateRequest, FAQUpdateRequest, FAQSearchQuery, FAQSearchResult, ChatSessionCreateRequest, ChatSearchQuery, DocumentAnalysisResult } from './documents.interface';
export interface IDocumentsService {
    createFAQ(request: FAQCreateRequest, createdBy?: string): Promise<FAQ>;
    getFAQ(faqId: string): Promise<FAQ>;
    searchFAQs(query: FAQSearchQuery): Promise<FAQSearchResult>;
    updateFAQ(faqId: string, updates: FAQUpdateRequest, userId?: string): Promise<FAQ>;
    deleteFAQ(faqId: string, userId?: string): Promise<void>;
    publishFAQ(faqId: string, userId?: string): Promise<FAQ>;
    unpublishFAQ(faqId: string, userId?: string): Promise<FAQ>;
    viewFAQ(faqId: string): Promise<FAQ>;
    markFAQHelpful(faqId: string, userId: string): Promise<void>;
    markFAQNotHelpful(faqId: string, userId: string): Promise<void>;
    generateFAQFromChat(chatMessageIds: string[]): Promise<FAQ>;
    generateFAQFromDocument(documentId: string, userId: string): Promise<FAQ>;
    improveFAQContent(faqId: string): Promise<FAQ>;
    createChatSession(userId: string, request: ChatSessionCreateRequest): Promise<ChatSession>;
    getChatSession(sessionId: string, userId: string): Promise<ChatSession>;
    getUserChatSessions(userId: string, limit?: number, offset?: number): Promise<ChatSession[]>;
    searchChatSessions(query: ChatSearchQuery): Promise<ChatSession[]>;
    archiveChatSession(sessionId: string, userId: string): Promise<void>;
    deleteChatSession(sessionId: string, userId: string): Promise<void>;
    sendMessage(sessionId: string, userId: string, content: string): Promise<ChatMessage>;
    getChatMessages(sessionId: string, userId: string, limit?: number, offset?: number): Promise<ChatMessage[]>;
    generateAIResponse(sessionId: string, userMessage: string, userId: string): Promise<ChatMessage>;
    enableContextForSession(sessionId: string, userId: string): Promise<void>;
    disableContextForSession(sessionId: string, userId: string): Promise<void>;
    getRelevantContext(query: string, userId: string): Promise<{
        documents: string[];
        faqs: string[];
        notes: string[];
    }>;
    processDocument(documentId: string, jobType: 'text_extraction' | 'vectorization' | 'ai_analysis'): Promise<DocumentProcessingJob>;
    getProcessingStatus(jobId: string): Promise<DocumentProcessingJob>;
    analyzeDocument(documentId: string): Promise<DocumentAnalysisResult>;
    searchContent(query: string, userId?: string): Promise<{
        faqs: FAQ[];
        chatMessages: ChatMessage[];
        relevanceScore: number;
    }>;
    getSimilarContent(contentId: string, contentType: 'faq' | 'chat'): Promise<{
        faqs: FAQ[];
        chatMessages: ChatMessage[];
    }>;
    getFAQAnalytics(): Promise<{
        totalViews: number;
        helpfulRatio: number;
        topCategories: {
            category: string;
            count: number;
        }[];
        popularFAQs: FAQ[];
    }>;
    getChatAnalytics(userId?: string): Promise<{
        totalSessions: number;
        averageSessionLength: number;
        mostActiveHours: number[];
        topTopics: string[];
    }>;
    deleteUserContent(userId: string): Promise<void>;
    moderateFAQ(faqId: string, action: 'approve' | 'reject', moderatorId: string): Promise<FAQ>;
    getFAQsByCreator(creatorId: string): Promise<FAQ[]>;
}
//# sourceMappingURL=documents.service.interface.d.ts.map