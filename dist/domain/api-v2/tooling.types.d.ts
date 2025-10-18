export type ToolJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type ToolJobType = 'run-node-script' | 'generate-script';
export interface ToolJobSourceInfo {
    language: 'node';
    hash: string;
    bytes: number;
    preview: string;
    lineCount: number;
}
export interface ToolJobResult {
    completedAt?: string;
    durationMs?: number;
    stdout?: string;
    stderr?: string;
    error?: string;
}
export interface ToolJobDiagnostics {
    executionEnabled: boolean;
    notes: string[];
}
export interface ToolJobBase {
    id: string;
    type: ToolJobType;
    sessionId: string;
    status: ToolJobStatus;
    createdAt: string;
    updatedAt: string;
}
export interface RunNodeScriptJob extends ToolJobBase {
    type: 'run-node-script';
    timeoutMs: number;
    metadata: Record<string, unknown> | null;
    source: ToolJobSourceInfo;
    result: ToolJobResult | null;
    warnings: string[];
    diagnostics: ToolJobDiagnostics;
}
export type GenerateScriptJobStage = 'queued' | 'collecting-context' | 'prompting' | 'repairing' | 'validating' | 'testing' | 'completed';
export interface GenerateScriptJobProgress {
    stage: GenerateScriptJobStage;
    message?: string;
    attempt?: number;
}
export interface GenerateScriptJobError {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
}
export interface GenerateScriptJob extends ToolJobBase {
    type: 'generate-script';
    progress: GenerateScriptJobProgress;
    attempts: number;
    warnings: string[];
    result?: GenerateToolScriptResponse;
    error?: GenerateScriptJobError;
}
export type ToolJob = RunNodeScriptJob | GenerateScriptJob;
export interface RunNodeScriptJobOptions {
    timeoutMs?: number;
    metadata?: Record<string, unknown>;
}
export interface RunNodeScriptJobRequest extends RunNodeScriptJobOptions {
    sessionId: string;
    source: string;
}
export interface RunNodeScriptJobResponse {
    sessionId: string;
    job: ToolJob;
}
export interface GetToolJobResponse {
    job: ToolJob;
}
export interface GenerateToolScriptJobResponse {
    sessionId: string;
    job: GenerateScriptJob;
}
export interface ToolScriptInputSchemaProperty {
    type: string;
    description?: string;
    example?: unknown;
}
export interface ToolScriptInputSchema {
    type: 'object';
    description?: string;
    properties: Record<string, ToolScriptInputSchemaProperty>;
    required?: string[];
}
export interface ToolScriptConstraints {
    deterministic?: boolean;
    allowNetwork?: boolean;
    allowFilesystem?: boolean;
    maxRuntimeMs?: number;
}
export interface GenerateToolScriptRequest {
    sessionId: string;
    instructions: string;
    inputSchema?: ToolScriptInputSchema;
    expectedOutputDescription?: string;
    additionalContext?: string;
    constraints?: ToolScriptConstraints;
    referenceDocuments?: ToolScriptReference[];
    testCases?: ToolScriptTestCase[];
    attachments?: ToolScriptAttachment[];
}
export interface ToolScriptValidationReport {
    syntaxValid: boolean;
    deterministic: boolean;
    forbiddenApis: string[];
    warnings: string[];
}
export interface ToolScriptArtifact {
    id: string;
    title?: string;
    order: number;
    description?: string;
    code: string;
}
export interface ToolScriptDescriptor {
    code: string;
    language: 'javascript';
    entrypoint: string;
    description: string;
    runtime: 'node18';
    deterministic: boolean;
    dependencies: string[];
    source: ToolJobSourceInfo;
    validation: ToolScriptValidationReport;
    notes: string[];
    artifacts?: ToolScriptArtifact[];
}
export interface GenerateToolScriptResponse {
    sessionId: string;
    script: ToolScriptDescriptor;
    inputSchema?: ToolScriptInputSchema;
    expectedOutputDescription?: string;
    contextSnippets?: ToolScriptContextSnippet[];
    testResults?: ToolScriptTestResultSummary;
}
export interface ToolScriptReference {
    id?: string;
    title?: string;
    snippet: string;
    weight?: number;
    useForPrompt?: boolean;
}
export interface ToolScriptAttachment {
    id?: string;
    filename: string;
    content: string;
    mimeType?: string;
    description?: string;
    weight?: number;
}
export interface ToolScriptContextSnippet {
    id?: string;
    title?: string;
    source?: string;
    score?: number;
    snippet: string;
    origin: 'retrieval' | 'reference';
}
export interface ToolScriptTestAssertion {
    type: 'contains' | 'equals' | 'regex';
    value: string;
}
export interface ToolScriptTestCase {
    name?: string;
    description?: string;
    input: Record<string, unknown> | string | number | boolean | null;
    assertions?: ToolScriptTestAssertion[];
}
export interface ToolScriptTestResult {
    passed: boolean;
    name?: string;
    description?: string;
    outputPreview?: string;
    error?: string;
    failedAssertion?: ToolScriptTestAssertion;
}
export interface ToolScriptTestResultSummary {
    passed: boolean;
    results: ToolScriptTestResult[];
}
//# sourceMappingURL=tooling.types.d.ts.map