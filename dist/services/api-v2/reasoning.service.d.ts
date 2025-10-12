import { SessionEnvelope } from '../../domain/api-v2/session.types';
import { ReasoningRequestInput, ReasoningResponse } from '../../domain/api-v2/reasoning.types';
export declare class ReasoningService {
    generate(session: SessionEnvelope, input: ReasoningRequestInput): Promise<ReasoningResponse>;
}
export declare const reasoningService: ReasoningService;
//# sourceMappingURL=reasoning.service.d.ts.map