export declare enum SearchType {
    SEMANTIC = "semantic",
    HYBRID = "hybrid",
    KEYWORD = "keyword",
    FUZZY = "fuzzy"
}
export interface ChatConfiguration {
    id: string;
    name: string;
    config: {
        maxIterations: number;
        systemPrompt: string;
        vectorSearch: {
            maxQueries: number;
            limit: number;
            scoreThreshold: number;
            useQueryExpansion: boolean;
            searchType: SearchType;
            hybridAlpha?: number;
            diversityThreshold?: number;
        };
        processingSteps: ProcessingStep[];
        contextSynthesis: {
            enabled: boolean;
            maxLength: number;
        };
        qualityChecks: {
            enabled: boolean;
            minResponseLength: number;
            checkForHallucination: boolean;
        };
    };
}
export interface ProcessingStep {
    name: string;
    enabled: boolean;
    prompt: string;
}
export declare class ChatConfigurationService {
    private activeConfig;
    private lastConfigLoad;
    private configCacheTimeout;
    private qdrantService;
    constructor();
    getActiveConfiguration(): Promise<ChatConfiguration>;
    generateConfiguredResponse(query: string, userId: string, previousMessages?: any[], userPreferences?: any, contextSettings?: any): Promise<{
        response: string;
        contextUsed: string;
        searchQueries: string[];
        processingSteps: any[];
        configurationUsed: string;
    }>;
    private getDefaultConfiguration;
    private isStepEnabled;
    private getStep;
    setAsDefault(configId: string): Promise<void>;
    getActiveConfigurationId(): Promise<string | null>;
    private removeDuplicates;
    clearCache(): void;
}
declare const _default: ChatConfigurationService;
export default _default;
//# sourceMappingURL=chatConfigurationService.d.ts.map