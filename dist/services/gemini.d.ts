export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: Date;
}
export declare class GeminiService {
    private models;
    private currentModelIndex;
    private codeLookupService;
    private modelUsageCount;
    constructor();
    private getRpmLimit;
    private getNextAvailableModel;
    private resetUsageCounters;
    generateResponse(messages: ChatMessage[], context?: string, userPreferences?: any, isEnhancedQuery?: boolean, contextMode?: 'workspace-only' | 'standard' | 'system-only'): Promise<string>;
    private handleFunctionCall;
    private buildSystemPrompt;
    generateEmbedding(text: string): Promise<number[]>;
    private textToVector;
    summarizeText(text: string, maxLength?: number): Promise<string>;
    extractKeywords(text: string): Promise<string[]>;
    generateChatTitle(userMessage: string, assistantResponse: string): Promise<string>;
    private generateFallbackTitle;
    generateFAQContent(messages: any[]): Promise<{
        title: string;
        description: string;
        context: string;
        answer: string;
        additionalInfo: string;
        tags: string[];
    }>;
    enhanceFAQWithContext(faqData: {
        title: string;
        description: string;
        context: string;
        answer: string;
        additionalInfo: string;
        tags: string[];
    }, searchContext: string): Promise<{
        title: string;
        description: string;
        context: string;
        answer: string;
        additionalInfo: string;
        tags: string[];
    }>;
    generateMultipleChoiceQuestion(content: string, difficulty: 'easy' | 'medium' | 'hard', topicArea: string): Promise<{
        question: string;
        options: string[];
        correctIndex: number;
        explanation: string;
    }>;
    generateQuizQuestions(sourceContent: string[], questionCount: number, difficulty: 'easy' | 'medium' | 'hard', topicArea: string): Promise<{
        question: string;
        options: string[];
        correctIndex: number;
        explanation: string;
    }[]>;
    evaluateAnswerWithExplanation(question: string, userAnswer: string, correctAnswer: string): Promise<{
        isCorrect: boolean;
        explanation: string;
        improvementTips: string[];
    }>;
    generateText(prompt: string): Promise<string>;
    private generateWithRetry;
    private sleep;
    generateTagsForNote(content: string): Promise<string[]>;
    generateTagsForDocument(content: string, title: string): Promise<string[]>;
    generateResponseWithUserContext(messages: ChatMessage[], publicContext: string, userDocuments: string[], userNotes: string[], userPreferences?: any, contextMode?: 'workspace-only' | 'standard' | 'system-only'): Promise<string>;
    suggestRelatedContent(userId: string, query: string): Promise<any[]>;
    generateHypotheticalAnswer(query: string): Promise<string>;
    generateSearchQueries(query: string): Promise<string[]>;
    synthesizeContext(query: string, searchResults: any[]): Promise<string>;
    synthesizeContextWithChunkTypes(query: string, searchResults: any[]): Promise<string>;
    reRankResults(originalQuery: string, searchResults: any[], topK?: number): Promise<any[]>;
    generateResponseWithSources(query: string, context: string, contextSources?: any[], previousMessages?: any[], userPreferences?: any): Promise<{
        response: string;
        sources: any[];
    }>;
    logModelUsage(): void;
}
declare const _default: GeminiService;
export default _default;
//# sourceMappingURL=gemini.d.ts.map