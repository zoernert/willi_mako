import { CorrectionDetectionResult } from './types';
type ConversationTurn = {
    role: 'user' | 'assistant' | 'system';
    content: string;
};
export interface CorrectionDetectorInput {
    conversation: ConversationTurn[];
}
export declare class CorrectionDetector {
    private readonly minConfidence;
    constructor(minConfidence?: number);
    /**
     * Uses the LLM to decide whether the latest user turn corrects the assistant.
     */
    detect(input: CorrectionDetectorInput): Promise<CorrectionDetectionResult | null>;
    private normalize;
    private normalizeSeverity;
}
export declare const correctionDetector: CorrectionDetector;
export {};
//# sourceMappingURL=correctionDetector.d.ts.map