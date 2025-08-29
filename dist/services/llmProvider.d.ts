export type ContextMode = 'workspace-only' | 'standard' | 'system-only';
export interface LLMInterface {
    generateResponse(messages: {
        role: 'user' | 'assistant';
        content: string;
        timestamp?: Date;
    }[], context?: string, userPreferences?: any, isEnhancedQuery?: boolean, contextMode?: ContextMode): Promise<string>;
    generateText(prompt: string): Promise<string>;
    generateSearchQueries(query: string): Promise<string[]>;
    synthesizeContext(query: string, searchResults: any[]): Promise<string>;
    synthesizeContextWithChunkTypes(query: string, searchResults: any[]): Promise<string>;
    generateResponseWithUserContext(messages: {
        role: 'user' | 'assistant';
        content: string;
        timestamp?: Date;
    }[], publicContext: string, userDocuments: string[], userNotes: string[], userPreferences?: any, contextMode?: ContextMode): Promise<string>;
    generateChatTitle(userMessage: string, assistantResponse: string): Promise<string>;
    generateStructuredOutput(prompt: string, userPreferences?: any): Promise<any>;
    generateTagsForNote(content: string): Promise<string[]>;
    generateTagsForDocument(content: string, title: string): Promise<string[]>;
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
    getLastUsedModel(): string | null;
}
declare const llm: LLMInterface;
export declare function getActiveLLMProvider(): 'gemini' | 'mistral';
export declare function getActiveLLMModel(): string | null;
export declare function getActiveLLMInfo(): {
    provider: 'gemini' | 'mistral';
    model: string | null;
};
export default llm;
//# sourceMappingURL=llmProvider.d.ts.map