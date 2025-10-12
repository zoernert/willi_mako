import { SessionEnvelope } from '../../domain/api-v2/session.types';
import { ClarificationAnalyzeOptions, ClarificationAnalysisResult } from '../../domain/api-v2/clarification.types';
export declare class ClarificationService {
    analyze(session: SessionEnvelope, query: string, options?: ClarificationAnalyzeOptions): Promise<ClarificationAnalysisResult>;
}
export declare const clarificationService: ClarificationService;
//# sourceMappingURL=clarification.service.d.ts.map