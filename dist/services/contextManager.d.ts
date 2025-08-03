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
}
export declare class ContextManager {
    private workspaceService;
    private notesService;
    constructor();
    determineOptimalContext(query: string, userId: string, chatHistory?: any[], contextSettings?: ContextSettings): Promise<{
        publicContext: string[];
        userContext: UserContext;
        contextDecision: ContextDecision;
    }>;
    private analyzeQueryForUserContext;
    private aiAnalyzeContextRelevance;
    private gatherUserContext;
    private generateContextSummary;
    getUserContextSettings(userId: string): Promise<{
        aiContextEnabled: boolean;
        autoTagEnabled: boolean;
        contextPreferences: any;
    }>;
}
declare const _default: ContextManager;
export default _default;
//# sourceMappingURL=contextManager.d.ts.map