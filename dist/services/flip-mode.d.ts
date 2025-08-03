export interface ClarificationResult {
    needsClarification: boolean;
    ambiguityScore: number;
    detectedTopics: string[];
    suggestedQuestions: ClarificationQuestion[];
    reasoning: string;
    sessionId?: string;
}
export interface ClarificationQuestion {
    id: string;
    question: string;
    category: 'scope' | 'context' | 'detail_level' | 'stakeholder' | 'energy_type';
    options?: string[];
    priority: number;
}
export interface FlipSession {
    id: string;
    userId: string;
    originalQuery: string;
    clarificationResult: ClarificationResult;
    responses: ClarificationResponse[];
    startedAt: Date;
    status: 'awaiting_clarification' | 'completed' | 'expired';
}
export interface ClarificationResponse {
    questionId: string;
    answer: string;
}
export declare class FlipModeService {
    private readonly AMBIGUITY_THRESHOLD;
    private readonly energyTerms;
    private readonly contextKeywords;
    private readonly genericTerms;
    private activeSessions;
    analyzeClarificationNeed(query: string, userId: string): Promise<ClarificationResult>;
    private analyzeTopicBreadth;
    private analyzeSpecificity;
    private analyzeContextClarity;
    private analyzeStakeholderAmbiguity;
    private analyzeEnergyTypeAmbiguity;
    private calculateAmbiguityScore;
    private extractTopics;
    private generateClarificationQuestions;
    private explainReasoning;
    private generateSessionId;
    saveClarificationResponses(userId: string, responses: ClarificationResponse[]): Promise<void>;
    buildEnhancedQuery(originalQuery: string, userId: string, liveResponses?: ClarificationResponse[]): Promise<string>;
    recordClarificationResponse(sessionId: string, questionId: string, answer: string): Promise<FlipSession | null>;
    getSession(sessionId: string): Promise<FlipSession | null>;
    completeSession(sessionId: string): Promise<void>;
}
declare const _default: FlipModeService;
export default _default;
//# sourceMappingURL=flip-mode.d.ts.map