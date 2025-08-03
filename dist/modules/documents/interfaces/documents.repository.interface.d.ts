import { FAQ, ChatSession, ChatMessage, DocumentProcessingJob, FAQCreateRequest, FAQUpdateRequest, FAQSearchQuery, FAQSearchResult, ChatSessionCreateRequest, ChatMessageCreateRequest, ChatSearchQuery, DocumentProcessingRequest } from './documents.interface';
export interface IDocumentsRepository {
    createFAQ(request: FAQCreateRequest & {
        created_by?: string;
    }): Promise<FAQ>;
    getFAQById(faqId: string): Promise<FAQ | null>;
    searchFAQs(query: FAQSearchQuery): Promise<FAQSearchResult>;
    updateFAQ(faqId: string, updates: FAQUpdateRequest): Promise<FAQ | null>;
    deleteFAQ(faqId: string): Promise<boolean>;
    incrementFAQView(faqId: string): Promise<boolean>;
    updateFAQHelpfulness(faqId: string, isHelpful: boolean): Promise<boolean>;
    createChatSession(userId: string, request: ChatSessionCreateRequest): Promise<ChatSession>;
    getChatSessionById(sessionId: string): Promise<ChatSession | null>;
    getChatSessionsByUser(userId: string, limit?: number, offset?: number): Promise<ChatSession[]>;
    searchChatSessions(query: ChatSearchQuery): Promise<ChatSession[]>;
    updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession | null>;
    deleteChatSession(sessionId: string): Promise<boolean>;
    updateLastActivity(sessionId: string): Promise<boolean>;
    createChatMessage(sessionId: string, request: ChatMessageCreateRequest): Promise<ChatMessage>;
    getChatMessageById(messageId: string): Promise<ChatMessage | null>;
    getChatMessagesBySession(sessionId: string, limit?: number, offset?: number): Promise<ChatMessage[]>;
    deleteChatMessage(messageId: string): Promise<boolean>;
    deleteChatMessages(sessionId: string): Promise<boolean>;
    createProcessingJob(request: DocumentProcessingRequest): Promise<DocumentProcessingJob>;
    getProcessingJobById(jobId: string): Promise<DocumentProcessingJob | null>;
    getProcessingJobsByDocument(documentId: string): Promise<DocumentProcessingJob[]>;
    updateProcessingJob(jobId: string, updates: Partial<DocumentProcessingJob>): Promise<DocumentProcessingJob | null>;
    searchContent(query: string, userId?: string): Promise<{
        faqs: FAQ[];
        chatMessages: ChatMessage[];
        relevanceScore: number;
    }>;
    deleteUserChatData(userId: string): Promise<boolean>;
    getFAQStatistics(): Promise<{
        totalFAQs: number;
        publishedFAQs: number;
        averageViews: number;
        topCategories: {
            category: string;
            count: number;
        }[];
    }>;
    getChatStatistics(userId?: string): Promise<{
        totalSessions: number;
        totalMessages: number;
        averageMessagesPerSession: number;
        activeSessions: number;
    }>;
}
//# sourceMappingURL=documents.repository.interface.d.ts.map