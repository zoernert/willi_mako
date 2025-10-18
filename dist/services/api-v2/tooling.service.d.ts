import { GenerateToolScriptRequest, GenerateToolScriptRepairRequest, GenerateToolScriptResponse, GenerateScriptJob, ToolJob } from '../../domain/api-v2/tooling.types';
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
interface GenerateToolScriptRepairInternalInput extends GenerateToolScriptRepairRequest {
    userId: string;
}
interface GenerateScriptJobOptions {
    continuedFromJobId?: string;
    initialProgressMessage?: string;
    initialWarnings?: string[];
}
export declare class ToolingService {
    private readonly jobs;
    private readonly generateScriptQueue;
    private generateScriptWorkerActive;
    createNodeScriptJob(input: NodeScriptJobInput): Promise<ToolJob>;
    getJobForUser(jobId: string, userId: string): Promise<ToolJob>;
    listJobsForSession(sessionId: string, userId: string): Promise<ToolJob[]>;
    enqueueGenerateScriptJob(input: GenerateToolScriptInternalInput, options?: GenerateScriptJobOptions): Promise<GenerateScriptJob>;
    resumeGenerateScriptJob(input: GenerateToolScriptRepairInternalInput): Promise<GenerateScriptJob>;
    generateDeterministicScript(input: GenerateToolScriptInternalInput): Promise<GenerateToolScriptResponse>;
    private startGenerateScriptWorker;
    private processGenerateScriptQueue;
    private handleGenerateScriptJob;
    private executeGenerateScript;
    private updateGenerateJobProgress;
    private buildGenerateScriptError;
    private normalizeGenerateScriptInput;
    private normalizeConstraints;
    private normalizeInputSchema;
    private normalizeRequiredText;
    private normalizeOptionalText;
    private cloneDefaultInputSchema;
    private normalizeReferences;
    private normalizeAttachments;
    private transformAttachmentsToReferences;
    private formatAttachmentChunkForPrompt;
    private isLikelyEdifactAttachment;
    private insertEdifactSegmentBreaks;
    private mergeReferences;
    private splitAttachmentIntoChunks;
    private sanitizeAttachmentWeight;
    private normalizeTestCases;
    private normalizeAssertions;
    private cloneTestCaseInput;
    private collectContextSnippets;
    private collectPseudocodeSnippets;
    private inferEdifactMessageTypes;
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
    private extractRunFunctionSnippet;
    private extractRunFunctionBody;
    private findMatchingBrace;
    private serializeInputSchemaForPrompt;
    private stringifyExample;
    private formatConstraintsForPrompt;
    private normalizeScriptCandidate;
    private normalizeArtifacts;
    private extractCodeBlock;
    private validateGeneratedScript;
    private runFunctionHasReturn;
    private hasReturnWrapperMarker;
    private ensureRunReturnWrapper;
    private isRateLimitError;
    private getRateLimitBackoffDelay;
    private delay;
    private appendJobWarning;
    private computeRepairChainDepth;
    private composeRepairInstructions;
    private composeRepairAdditionalContext;
    private mergeRepairAttachments;
    private mergeRepairReferences;
    private normalizeAttachmentForRepair;
    private buildAttachmentDedupKey;
    private buildReferenceDedupKey;
    private buildAutomaticRepairHint;
    private buildRepairWarnings;
    private resolveEdifactMessageHints;
    private addMessageTypeEvidence;
    private collectMessageTypesFromText;
    private collectMessageTypesFromPayload;
    private isPayloadMessageTypeMismatch;
    private isMessageTypeMismatch;
    private sanitizeDependencies;
    private sanitizeValidationContext;
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