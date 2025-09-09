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
    private lastUsedModelName;
    constructor();
    /**
     * Get the last used Gemini model name (for diagnostics/metrics)
     */
    getLastUsedModel(): string | null;
    /**
     * Asynchronously initializes models using the googleAIKeyManager for efficient key usage
     * @param modelNames Array of model names to initialize
     */
    private initializeModels;
    /**
     * Fallback initialization method using direct API key if key manager fails
     */
    private initializeFallbackModels;
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
    generateText(prompt: string, userPreferences?: any): Promise<string>;
    private generateWithRetry;
    private sleep;
    /**
     * Generate tags for note content using AI
     */
    generateTagsForNote(content: string): Promise<string[]>;
    /**
     * Generate tags for document content using AI
     */
    generateTagsForDocument(content: string, title: string): Promise<string[]>;
    /**
     * Generate response with user context (documents and notes)
     */
    generateResponseWithUserContext(messages: ChatMessage[], publicContext: string, userDocuments: string[], userNotes: string[], userPreferences?: any, contextMode?: 'workspace-only' | 'standard' | 'system-only'): Promise<string>;
    /**
     * Suggest related content based on query
     */
    suggestRelatedContent(userId: string, query: string): Promise<any[]>;
    /**
     * Generate embedding for text (for vector search)
     */
    /**
     * Generiert eine hypothetische Antwort für HyDE (Hypothetical Document Embeddings)
     */
    generateHypotheticalAnswer(query: string): Promise<string>;
    generateSearchQueries(query: string, userPreferences?: any): Promise<string[]>;
    synthesizeContext(query: string, searchResults: any[], userPreferences?: any): Promise<string>;
    /**
     * Erweiterte Kontext-Synthese mit chunk_type-bewusster Verarbeitung
     */
    synthesizeContextWithChunkTypes(query: string, searchResults: any[], userPreferences?: any): Promise<string>;
    /**
     * Re-Ranking von Suchergebnissen basierend auf semantischer Ähnlichkeit
     * (Vereinfachte Implementierung ohne externes Cross-Encoder Modell)
     */
    reRankResults(originalQuery: string, searchResults: any[], topK?: number): Promise<any[]>;
    /**
     * Generiert finale Antwort mit transparenten Quellenangaben
     */
    generateResponseWithSources(query: string, context: string, contextSources?: any[], previousMessages?: any[], userPreferences?: any): Promise<{
        response: string;
        sources: any[];
    }>;
    /**
     * Generiert eine strukturierte Ausgabe (JSON) auf Basis eines Prompts
     * @param prompt Der Prompt für die KI
     * @param userPreferences Nutzerpräferenzen
     * @returns Ein strukturiertes Objekt
     */
    generateStructuredOutput(prompt: string, userPreferences?: any): Promise<any>;
    logModelUsage(): void;
    /**
     * Wählt das Modell mit der geringsten Nutzung aus
     */
    private getNextModelWithLowestUsage;
    private getQuotaAwareModel;
    /**
     * Ensures models are initialized before use
     * @returns Promise that resolves when models are ready
     */
    private ensureModelsInitialized;
}
declare const _default: GeminiService;
export default _default;
//# sourceMappingURL=gemini.d.ts.map