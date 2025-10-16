import { GenerateToolScriptRequest, GenerateToolScriptResponse, ToolJob } from '../../domain/api-v2/tooling.types';
interface NodeScriptJobInput {
    userId: string;
    sessionId: string;
    source: string;
    timeoutMs?: number;
    metadata?: Record<string, unknown>;
}
interface GenerateToolScriptInternalInput extends GenerateToolScriptRequest {
    userId: string;
}
export declare class ToolingService {
    private readonly jobs;
    createNodeScriptJob(input: NodeScriptJobInput): Promise<ToolJob>;
    getJobForUser(jobId: string, userId: string): Promise<ToolJob>;
    listJobsForSession(sessionId: string, userId: string): Promise<ToolJob[]>;
    generateDeterministicScript(input: GenerateToolScriptInternalInput): Promise<GenerateToolScriptResponse>;
    private normalizeGenerateScriptInput;
    private normalizeConstraints;
    private normalizeInputSchema;
    private normalizeRequiredText;
    private normalizeOptionalText;
    private cloneDefaultInputSchema;
    private normalizeReferences;
    private normalizeTestCases;
    private normalizeAssertions;
    private cloneTestCaseInput;
    private collectContextSnippets;
    private extractPayloadSnippet;
    private extractPayloadTitle;
    private truncateText;
    private executeTestCases;
    private evaluateAssertion;
    private runScriptInSandbox;
    private createSandbox;
    private createRestrictedProcess;
    private createRestrictedRequire;
    private stringifyResult;
    private buildScriptPrompt;
    private isRecoverableValidationError;
    private extractCandidateCodeForFeedback;
    private serializeInputSchemaForPrompt;
    private stringifyExample;
    private formatConstraintsForPrompt;
    private normalizeScriptCandidate;
    private normalizeArtifacts;
    private extractCodeBlock;
    private validateGeneratedScript;
    private sanitizeDependencies;
    private ensureNotesLimit;
    private safeParseJson;
    private raiseValidationError;
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