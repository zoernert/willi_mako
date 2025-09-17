export interface ReasoningStep {
    step: string;
    description: string;
    timestamp: number;
    duration?: number;
    qdrantQueries?: string[];
    qdrantResults?: number;
    result?: any;
    error?: string;
}
export interface ContextAnalysis {
    semanticClusters?: any[];
    topicsIdentified: string[];
    informationGaps: string[];
    contextQuality: number;
}
export interface QAAnalysis {
    needsMoreContext: boolean;
    answerable: boolean;
    confidence: number;
    missingInfo: string[];
    mainIntent?: string;
    complexityLevel?: 'easy' | 'medium' | 'hard';
    marketCommunicationRelevance?: number;
    semanticConcepts?: string[];
    domainKeywords?: string[];
}
export interface PipelineDecision {
    useIterativeRefinement: boolean;
    maxIterations: number;
    confidenceThreshold: number;
    reason: string;
}
export interface ReasoningResult {
    response: string;
    reasoningSteps: ReasoningStep[];
    finalQuality: number;
    iterationsUsed: number;
    contextAnalysis: ContextAnalysis;
    qaAnalysis: QAAnalysis;
    pipelineDecisions: PipelineDecision;
    apiCallsUsed: number;
    hybridSearchUsed?: boolean;
    hybridSearchAlpha?: number;
}
declare class AdvancedReasoningService {
    private qdrantService;
    private maxApiCalls;
    constructor();
    generateReasonedResponse(query: string, previousMessages: any[], userPreferences?: any, contextSettings?: any): Promise<ReasoningResult>;
    private generateDirectResponse;
    private generateRefinedResponse;
    private generateOptimalSearchQueries;
    private performParallelSearch;
    private analyzeContext;
    private performQAAnalysis;
    private performIterativeRefinement;
    private rerankResultsLLM;
    private assessResponseQuality;
}
declare const _default: AdvancedReasoningService;
export default _default;
//# sourceMappingURL=advancedReasoningService.d.ts.map