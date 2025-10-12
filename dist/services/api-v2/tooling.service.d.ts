import { ToolJob } from '../../domain/api-v2/tooling.types';
interface NodeScriptJobInput {
    userId: string;
    sessionId: string;
    source: string;
    timeoutMs?: number;
    metadata?: Record<string, unknown>;
}
export declare class ToolingService {
    private readonly jobs;
    createNodeScriptJob(input: NodeScriptJobInput): Promise<ToolJob>;
    getJobForUser(jobId: string, userId: string): Promise<ToolJob>;
    listJobsForSession(sessionId: string, userId: string): Promise<ToolJob[]>;
    private assertValidSource;
    private sanitizeMetadata;
    private normalizeTimeout;
    private buildSourceInfo;
    private buildInitialResult;
    private toPublicJob;
}
export declare const toolingService: ToolingService;
export {};
//# sourceMappingURL=tooling.service.d.ts.map