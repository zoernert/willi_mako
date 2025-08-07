interface MermaidDiagram {
    id: string;
    title: string;
    content: string;
    mermaidCode: string;
    score: number;
    structuredData?: {
        process_steps: Array<{
            id: string;
            label: string;
            shape?: string;
        }>;
        connections: Array<{
            from: string;
            to: string;
            label?: string;
        }>;
    };
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
     * Generates structured process data from diagram metadata using LLM
     * This is a fallback for cases where migration is incomplete or data is malformed
     */
    static generateStructuredDataFromMetadata(metadata: {
        id: string;
        title: string;
        content: string;
        mermaid_code?: string;
    }): Promise<{
        process_steps: Array<{
            id: string;
            label: string;
            shape?: string;
        }>;
        connections: Array<{
            from: string;
            to: string;
            label?: string;
        }>;
    }>;
    /**
     * Searches for Mermaid diagrams in the Qdrant collection based on a natural language query
     */
    static searchProcesses(request: {
        query: string;
        conversationHistory?: ConversationMessage[];
    }): Promise<ProcessSearchResult>;
    /**
     * Generates a Mermaid diagram string from structured process data.
     * @param processData - The structured data with nodes and connections.
     * @returns A string containing the full Mermaid diagram code.
     */
    static generateMermaidFromStructuredData(processData: {
        process_steps: Array<{
            id: string;
            label: string;
            shape?: string;
        }>;
        connections: Array<{
            from: string;
            to: string;
            label?: string;
        }>;
    }): string;
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
     * Optimizes an existing process description based on user feedback
     */
    static optimizeProcess(request: {
        originalQuery: string;
        optimizationRequest: string;
        currentDiagrams?: MermaidDiagram[];
    }): Promise<ProcessSearchResult>;
    /**
     * Searches for related processes based on a specific diagram
     */
    static findRelatedProcesses(diagram: MermaidDiagram): Promise<MermaidDiagram[]>;
}
export default ProcessService;
export type { MermaidDiagram, ProcessSearchResult, ConversationMessage };
//# sourceMappingURL=processService.d.ts.map