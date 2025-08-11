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
}
declare class AdvancedReasoningService {
    private qdrantService;
    private maxApiCalls;
    constructor();
    generateReasonedResponse(query: string, previousMessages: any[], userPreferences?: any, contextSettings?: any): Promise<ReasoningResult>;
    private generateDirectResponse;
    private generateOptimalSearchQueries;
    private performParallelSearch;
    private analyzeContext;
    private performQAAnalysis;
    private performIterativeRefinement;
    private assessResponseQuality;
}
declare const _default: AdvancedReasoningService;
export default _default;
//# sourceMappingURL=advancedReasoningService.d.ts.map