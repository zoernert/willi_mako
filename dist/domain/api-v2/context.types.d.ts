import { SessionContextSettings } from './session.types';
export interface ContextResolveOptions {
    messages?: Array<{
        role: string;
        content: string;
    }>;
    contextSettingsOverride?: SessionContextSettings;
}
export interface ContextResolutionResult {
    contextSettingsUsed: SessionContextSettings | undefined;
    decision: {
        useUserContext: boolean;
        includeDocuments: boolean;
        includeNotes: boolean;
        reason: string;
    };
    publicContext: string[];
    userContext: {
        userDocuments: string[];
        userNotes: string[];
        suggestedDocuments: any[];
        relatedNotes: any[];
        contextSummary: string;
    };
}
//# sourceMappingURL=context.types.d.ts.map