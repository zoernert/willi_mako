interface MermaidDiagram {
    id: string;
    title: string;
    content: string;
    mermaidCode: string;
    score: number;
}
interface ProcessSearchResult {
    diagrams: MermaidDiagram[];
    textualExplanation: string;
    processSteps: string[];
}
interface ConversationMessage {
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}
export declare class ProcessService {
    /**
     * Searches for Mermaid diagrams in the Qdrant collection based on a natural language query
     */
    static searchProcesses(request: {
        query: string;
        conversationHistory: ConversationMessage[];
    }): Promise<ProcessSearchResult>;
    /**
     * Searches for processes with automatic Mermaid code improvement
     */
    static searchProcessesWithImprovement(request: {
        query: string;
        conversationHistory: ConversationMessage[];
    }): Promise<ProcessSearchResult>;
    /**
     * Improves Mermaid code quality using LLM before rendering
     * Fixes syntax errors, improves readability, and ensures compatibility
     */
    static improveMermaidCode(originalCode: string, context?: string): Promise<string>;
    /**
     * Builds a contextual query by incorporating conversation history
     */
    private static buildContextualQuery;
    /**
     * Generates a comprehensive explanation of the found processes using AI
     */
    private static generateProcessExplanation;
    /**
     * Extracts key process steps from the found diagrams
     */
    private static extractProcessSteps;
    /**
     * Health check for the service
     */
    static checkHealth(): Promise<{
        status: string;
        timestamp: string;
    }>;
    /**
     * Validates Mermaid code syntax
     */
    static validateMermaidCode(code: string): {
        isValid: boolean;
        errors: string[];
    };
}
export default ProcessService;
export type { MermaidDiagram, ProcessSearchResult, ConversationMessage };
//# sourceMappingURL=processService_new.d.ts.map