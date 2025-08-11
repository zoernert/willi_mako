export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: Date;
}
export declare class GeminiService {
    private model;
    constructor();
    generateResponse(messages: ChatMessage[], context?: string, userPreferences?: any, isEnhancedQuery?: boolean): Promise<string>;
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
}
declare const _default: GeminiService;
export default _default;
//# sourceMappingURL=gemini.d.ts.map