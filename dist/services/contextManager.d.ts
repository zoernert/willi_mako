export interface UserContext {
    userDocuments: string[];
    userNotes: string[];
    suggestedDocuments: any[];
    relatedNotes: any[];
    contextSummary: string;
}
export interface ContextDecision {
    useUserContext: boolean;
    includeDocuments: boolean;
    includeNotes: boolean;
    reason: string;
}
export interface ContextSettings {
    useWorkspaceOnly: boolean;
    workspacePriority: 'high' | 'medium' | 'low' | 'disabled';
    includeUserDocuments: boolean;
    includeUserNotes: boolean;
    includeSystemKnowledge: boolean;
    includeM2CRoles: boolean;
}
export declare class ContextManager {
    private workspaceService;
    private notesService;
    constructor();
    /**
     * Determine optimal context for a chat query with custom context settings
     */
    determineOptimalContext(query: string, userId: string, chatHistory?: any[], contextSettings?: ContextSettings): Promise<{
        publicContext: string[];
        userContext: UserContext;
        contextDecision: ContextDecision;
    }>;
    /**
     * Analyze if the query would benefit from user context
     */
    private analyzeQueryForUserContext;
    /**
     * Use AI to analyze if query would benefit from personal context
     */
    private aiAnalyzeContextRelevance;
    /**
     * Gather relevant user context based on query
     */
    private gatherUserContext;
    /**
     * Generate a summary of the context being used
     */
    private generateContextSummary;
    /**
     * Get user's workspace context settings
     */
    getUserContextSettings(userId: string): Promise<{
        aiContextEnabled: boolean;
        autoTagEnabled: boolean;
        contextPreferences: any;
    }>;
}
declare const _default: ContextManager;
export default _default;
//# sourceMappingURL=contextManager.d.ts.map