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
