import { SessionEnvelope } from '../../domain/api-v2/session.types';
import { ContextResolveOptions, ContextResolutionResult } from '../../domain/api-v2/context.types';
export declare class ContextService {
    resolve(session: SessionEnvelope, query: string, options?: ContextResolveOptions): Promise<ContextResolutionResult>;
}
export declare const contextService: ContextService;
//# sourceMappingURL=context.service.d.ts.map