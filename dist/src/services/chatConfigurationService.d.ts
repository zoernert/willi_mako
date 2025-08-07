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
    /**
     * Get the active chat configuration
     */
    getActiveConfiguration(): Promise<ChatConfiguration>;
    /**
     * Generate response using the active configuration
     */
    generateConfiguredResponse(query: string, userId: string, previousMessages?: any[], userPreferences?: any, contextSettings?: any): Promise<{
        response: string;
        contextUsed: string;
        searchQueries: string[];
        processingSteps: any[];
        configurationUsed: string;
    }>;
    /**
     * Get the default configuration
     */
    private getDefaultConfiguration;
    /**
     * Check if a processing step is enabled
     */
    private isStepEnabled;
    /**
     * Get a processing step
     */
    private getStep;
    /**
     * Set a configuration as the default (active) configuration
     * Only one configuration can be active at a time
     */
    setAsDefault(configId: string): Promise<void>;
    /**
     * Get the currently active configuration ID
     */
    getActiveConfigurationId(): Promise<string | null>;
    /**
     * Remove duplicate results based on ID
     */
    private removeDuplicates;
    /**
     * Clear cache (useful for testing)
     */
    clearCache(): void;
}
declare const _default: ChatConfigurationService;
export default _default;
//# sourceMappingURL=chatConfigurationService.d.ts.map