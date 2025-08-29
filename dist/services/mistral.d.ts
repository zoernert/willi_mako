export declare class MistralService {
    private client;
    constructor();
    private chat;
    generateResponse(messages: {
        role: 'user' | 'assistant';
        content: string;
    }[], context?: string, userPreferences?: any, isEnhancedQuery?: boolean, contextMode?: 'workspace-only' | 'standard' | 'system-only'): Promise<string>;
    generateText(prompt: string): Promise<string>;
    generateSearchQueries(query: string): Promise<string[]>;
    synthesizeContext(query: string, searchResults: any[]): Promise<string>;
    synthesizeContextWithChunkTypes(query: string, searchResults: any[]): Promise<string>;
    generateResponseWithUserContext(messages: {
        role: 'user' | 'assistant';
        content: string;
    }[], publicContext: string, userDocuments: string[], userNotes: string[], userPreferences?: any, contextMode?: 'workspace-only' | 'standard' | 'system-only'): Promise<string>;
    generateChatTitle(userMessage: string, assistantResponse: string): Promise<string>;
    generateStructuredOutput(prompt: string, _userPreferences?: any): Promise<any>;
    generateTagsForNote(content: string): Promise<string[]>;
    generateTagsForDocument(content: string, title: string): Promise<string[]>;
    generateMultipleChoiceQuestion(content: string, difficulty: 'easy' | 'medium' | 'hard', topicArea: string): Promise<{
        question: string;
        options: string[];
        correctIndex: number;
        explanation: string;
    }>;
    generateQuizQuestions(sourceContent: string[], questionCount: number, difficulty: 'easy' | 'medium' | 'hard', topicArea: string): Promise<any[]>;
    evaluateAnswerWithExplanation(question: string, userAnswer: string, correctAnswer: string): Promise<{
        isCorrect: boolean;
        explanation: any;
        improvementTips: any;
    }>;
    generateHypotheticalAnswer(query: string): Promise<string>;
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
    private buildSystemPrompt;
}
declare const _default: MistralService;
export default _default;
//# sourceMappingURL=mistral.d.ts.map