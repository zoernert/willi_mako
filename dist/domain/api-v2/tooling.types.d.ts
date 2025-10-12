export type ToolJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
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
export interface ToolJob {
    id: string;
    type: 'run-node-script';
    sessionId: string;
    status: ToolJobStatus;
    createdAt: string;
    updatedAt: string;
    timeoutMs: number;
    metadata: Record<string, unknown> | null;
    source: ToolJobSourceInfo;
    result: ToolJobResult | null;
    warnings: string[];
    diagnostics: ToolJobDiagnostics;
}
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
//# sourceMappingURL=tooling.types.d.ts.map