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
interface MermaidCodeImproveResult {
    improvedCode: string;
    improvements: string[];
    valid: boolean;
    confidence: number;
}
interface MermaidCodeImproveResult {
    improvedCode: string;
    improvements: string[];
    valid: boolean;
    confidence: number;
}
interface MermaidValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
}
export declare class ProcessService {
    /**
     * Searches for Mermaid diagrams in the Qdrant collection based on a natural language query
     */
    static searchProcesses(query: string, conversationHistory?: ConversationMessage[]): Promise<ProcessSearchResult>;
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
     * Optimizes an existing process description based on user feedback
     */
    static optimizeProcess(originalQuery: string, optimizationRequest: string, currentDiagrams: MermaidDiagram[]): Promise<ProcessSearchResult>;
    /**
     * Searches for related processes based on a specific diagram
     */
    static findRelatedProcesses(diagram: MermaidDiagram): Promise<MermaidDiagram[]>;
    /**
     * Improve Mermaid code using LLM
     */
    static improveMermaidCode(originalCode: string, title?: string, context?: string): Promise<MermaidCodeImproveResult>;
    /**
     * Validate Mermaid code and provide detailed feedback
     */
    static validateMermaidCode(code: string): Promise<MermaidValidationResult>;
}
export default ProcessService;
export type { MermaidDiagram, ProcessSearchResult, ConversationMessage, MermaidCodeImproveResult, MermaidValidationResult };
//# sourceMappingURL=processService_old.d.ts.map