import { createHash, randomUUID } from 'crypto';
import { Buffer } from 'buffer';
import { Script } from 'node:vm';

import { AppError } from '../../middleware/errorHandler';
import {
  GenerateToolScriptRequest,
  GenerateToolScriptRepairRequest,
  GenerateToolScriptResponse,
  GenerateScriptJob,
  GenerateScriptJobError,
  GenerateScriptJobStage,
  RunNodeScriptJob,
  ToolJob,
  ToolJobDiagnostics,
  ToolJobResult,
  ToolJobSourceInfo,
  ToolScriptArtifact,
  ToolScriptAttachment,
  ToolScriptConstraints,
  ToolScriptContextSnippet,
  ToolScriptDescriptor,
  ToolScriptInputSchema,
  ToolScriptReference,
  ToolScriptTestCase,
  ToolScriptTestAssertion,
  ToolScriptTestResult,
  ToolScriptTestResultSummary,
  ToolScriptValidationReport
} from '../../domain/api-v2/tooling.types';
import llm from '../llmProvider';
import { retrievalService } from './retrieval.service';

interface NodeScriptJobInput {
  userId: string;
  sessionId: string;
  source: string;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

interface RunNodeScriptJobRecord extends RunNodeScriptJob {
  userId: string;
}

interface GenerateScriptJobRecord extends GenerateScriptJob {
  userId: string;
  normalizedInput: NormalizedGenerateScriptInput;
}

type ToolJobRecord = RunNodeScriptJobRecord | GenerateScriptJobRecord;

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

interface NormalizedToolScriptConstraints {
  deterministic: boolean;
  allowNetwork: boolean;
  allowFilesystem: boolean;
  maxRuntimeMs: number;
}

interface NormalizedToolScriptReference {
  id?: string;
  title?: string;
  snippet: string;
  weight: number;
  useForPrompt: boolean;
}

interface NormalizedToolScriptAttachment {
  id?: string;
  filename: string;
  displayName: string;
  content: string;
  mimeType?: string;
  description?: string;
  weight: number;
}

interface NormalizedGenerateScriptInput extends GenerateToolScriptInternalInput {
  instructions: string;
  additionalContext?: string;
  expectedOutputDescription?: string;
  inputSchema?: ToolScriptInputSchema;
  constraints: NormalizedToolScriptConstraints;
  referenceDocuments: NormalizedToolScriptReference[];
  testCases: ToolScriptTestCase[];
  attachments: NormalizedToolScriptAttachment[];
  detectedMessageTypes: string[];
  primaryMessageType?: string;
}

interface ScriptRepairFeedback {
  attempt: number;
  validationErrorMessage: string;
  validationErrorCode?: string;
  validationContext?: Record<string, unknown>;
  previousCode?: string;
  runSnippet?: string;
}

const DEFAULT_TIMEOUT_MS = 5000;
const MIN_TIMEOUT_MS = 500;
const MAX_TIMEOUT_MS = 60000;
const SOURCE_PREVIEW_LENGTH = 240;
const MAX_INSTRUCTIONS_LENGTH = 1600;
const MAX_CONTEXT_LENGTH = 2000;
const MAX_EXPECTED_OUTPUT_LENGTH = 1200;
const MAX_NOTES = 6;
const MAX_REFERENCE_COUNT = 8;
const MAX_REFERENCE_SNIPPET_LENGTH = 2000;
const MAX_TEST_CASES = 3;
const MAX_ASSERTIONS_PER_TEST = 4;
const MAX_ASSERTION_VALUE_LENGTH = 240;
const MAX_CONTEXT_SNIPPETS = 6;
const MAX_RETRIEVAL_SNIPPET_LENGTH = 1500;
const MAX_GENERATION_ATTEMPTS = 3;
const MAX_REPAIR_INSTRUCTIONS_LENGTH = 600;
const MAX_REPAIR_CHAIN_LENGTH = 5;
const AUTO_RETURN_WRAPPER_MARKER = '__AUTO_RUN_RETURN_WRAPPER__';
const LLM_RATE_LIMIT_RETRY_LIMIT = 3;
const LLM_RATE_LIMIT_BACKOFF_STEPS_MS = [1500, 3000, 6000];
const MAX_JOB_WARNINGS = 6;
const MAX_RATE_LIMIT_RECOVERY_ATTEMPTS = 2;
const RATE_LIMIT_RECOVERY_DELAY_MS = 10000;
const MAX_ATTACHMENT_COUNT = 4;
const ONE_MEBIBYTE = 1024 * 1024;
const MAX_ATTACHMENT_CONTENT_LENGTH = ONE_MEBIBYTE; // 1 MiB pro Attachment
const MAX_ATTACHMENT_TOTAL_LENGTH = MAX_ATTACHMENT_CONTENT_LENGTH * MAX_ATTACHMENT_COUNT; // 4 MiB gesamt
const MAX_ATTACHMENT_CHUNK_LENGTH = 1800;
const MIN_ATTACHMENT_CHUNK_LENGTH = 600;
const ATTACHMENT_WEIGHT_DEFAULT = 5;
const MAX_ATTACHMENT_CHUNKS_PER_ATTACHMENT = 3;
const ATTACHMENT_REFERENCE_WEIGHT_BOOST = 40;
const ATTACHMENT_MESSAGE_HINT_SCAN_LENGTH = 8000;
const MESSAGE_TYPE_PRIMARY_THRESHOLD = 4;
const MESSAGE_TYPE_MAX_RESULTS = 3;
const EDIFACT_MESSAGE_TYPES = [
  'MSCONS',
  'UTILMD',
  'INVOIC',
  'ORDERS',
  'REMADV',
  'APERAK',
  'ORDCHG',
  'PRICAT',
  'IFTSTA',
  'IFCSUM',
  'IFTMIN',
  'DELFOR',
  'DESADV',
  'CONTRL',
  'QUOTES',
  'INVRPT',
  'PARTIN'
];

const EDIFACT_BGM_HINTS: Record<string, string> = {
  'BGM+Z06': 'MSCONS',
  'BGM+Z08': 'UTILMD',
  'BGM+380': 'INVOIC'
};

const DEFAULT_INPUT_SCHEMA_TEMPLATE: ToolScriptInputSchema = {
  type: 'object',
  description: 'Standard-Eingabe für deterministische Tools. Der Aufruf erfolgt über `await run(input)`.',
  properties: {
    payload: {
      type: 'string',
      description: 'Primärer Nachrichtentext oder Dokumentinhalt (z. B. EDIFACT, CSV, JSON).'
    },
    options: {
      type: 'object',
      description: 'Optionale Einstellungen oder Parameter für das Tool.'
    },
    format: {
      type: 'string',
      description: 'Optionaler Hinweis zum Eingabeformat, z. B. "mscons", "utilmd" oder "csv".'
    }
  },
  required: ['payload']
};

export class ToolingService {
  private readonly jobs = new Map<string, ToolJobRecord>();
  private readonly generateScriptQueue: GenerateScriptJobRecord[] = [];
  private generateScriptWorkerActive = false;

  public async createNodeScriptJob(input: NodeScriptJobInput): Promise<ToolJob> {
    this.assertValidSource(input.source);

    const sanitizedMetadata = this.sanitizeMetadata(input.metadata);
    const timeoutMs = this.normalizeTimeout(input.timeoutMs);
    const diagnostics: ToolJobDiagnostics = {
      executionEnabled: false,
      notes: [
        'Sandbox-Ausführung ist aktuell deaktiviert. Job wird vorgemerkt und muss manuell reviewed werden.'
      ]
    };

    const record: RunNodeScriptJobRecord = {
      id: randomUUID(),
      type: 'run-node-script',
      sessionId: input.sessionId,
      status: 'queued',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeoutMs,
      metadata: sanitizedMetadata,
      source: this.buildSourceInfo(input.source),
      result: this.buildInitialResult(),
      warnings: [
        'Die Ausführung findet noch nicht automatisch statt. Bitte prüfen Sie den Job manuell.',
        'Quellcode wird mit verkürztem Preview und Hash gespeichert, um Missbrauch zu vermeiden.'
      ],
      diagnostics,
      userId: input.userId
    };

    this.jobs.set(record.id, record);

    return this.toPublicJob(record);
  }

  public async getJobForUser(jobId: string, userId: string): Promise<ToolJob> {
    const record = this.jobs.get(jobId);

    if (!record || record.userId !== userId) {
      throw new AppError('Tool-Job wurde nicht gefunden', 404);
    }

    return this.toPublicJob(record);
  }

  public async listJobsForSession(sessionId: string, userId: string): Promise<ToolJob[]> {
    const jobs: ToolJob[] = [];

    for (const record of this.jobs.values()) {
      if (record.sessionId === sessionId && record.userId === userId) {
        jobs.push(this.toPublicJob(record));
      }
    }

    return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async enqueueGenerateScriptJob(
    input: GenerateToolScriptInternalInput,
    options: GenerateScriptJobOptions = {}
  ): Promise<GenerateScriptJob> {
    const normalized = this.normalizeGenerateScriptInput(input);
    const now = new Date().toISOString();

    const initialWarnings = Array.isArray(options.initialWarnings)
      ? Array.from(
          new Set(
            options.initialWarnings
              .filter((warning): warning is string => typeof warning === 'string')
              .map((warning) => warning.trim())
              .filter(Boolean)
          )
        ).slice(-MAX_JOB_WARNINGS)
      : [];

    const record: GenerateScriptJobRecord = {
      id: randomUUID(),
      type: 'generate-script',
      sessionId: normalized.sessionId,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
      progress: {
        stage: 'queued',
        message: options.initialProgressMessage ?? 'Job wurde eingereiht'
      },
      attempts: 0,
      warnings: initialWarnings,
      userId: normalized.userId,
      normalizedInput: normalized,
      continuedFromJobId: options.continuedFromJobId
    };

    this.jobs.set(record.id, record);
    this.generateScriptQueue.push(record);
    this.startGenerateScriptWorker();

    return this.toPublicJob(record) as GenerateScriptJob;
  }

  public async resumeGenerateScriptJob(input: GenerateToolScriptRepairInternalInput): Promise<GenerateScriptJob> {
    if (!input || typeof input !== 'object') {
      throw new AppError('Ungültige Parameter für Reparaturanfrage', 400);
    }

    const jobId = typeof input.jobId === 'string' ? input.jobId.trim() : '';
    if (!jobId) {
      throw new AppError('jobId ist erforderlich', 400);
    }

    const record = this.jobs.get(jobId);

    if (!record || record.type !== 'generate-script' || record.userId !== input.userId) {
      throw new AppError('Tool-Job wurde nicht gefunden', 404);
    }

    if (record.sessionId !== input.sessionId) {
      throw new AppError('Session passt nicht zum Job', 400);
    }

    if (record.status !== 'failed') {
      throw new AppError('Nur fehlgeschlagene Skript-Jobs können fortgesetzt werden', 409);
    }

    const repairChainDepth = this.computeRepairChainDepth(record);
    if (repairChainDepth >= MAX_REPAIR_CHAIN_LENGTH) {
      const error = new AppError('Maximale Anzahl an Reparaturversuchen erreicht', 429);
      (error as any).context = {
        code: 'repair_limit_reached',
        attempts: repairChainDepth
      };
      throw error;
    }

    const baseInput = record.normalizedInput;

    const sanitizedRepairInstructions = this.normalizeOptionalText(
      input.repairInstructions,
      'repairInstructions',
      MAX_REPAIR_INSTRUCTIONS_LENGTH
    );
    const sanitizedRepairContext = this.normalizeOptionalText(
      input.additionalContext,
      'additionalContext',
      MAX_CONTEXT_LENGTH
    );

    const mergedInstructions = this.composeRepairInstructions(baseInput.instructions, record, sanitizedRepairInstructions);
    const mergedAdditionalContext = this.composeRepairAdditionalContext(baseInput.additionalContext, sanitizedRepairContext);
    const mergedReferences = this.mergeRepairReferences(baseInput.referenceDocuments, input.referenceDocuments);
    const mergedAttachments = this.mergeRepairAttachments(baseInput.attachments, input.attachments);
    const mergedTestCases = Array.isArray(input.testCases) ? input.testCases : baseInput.testCases;

    const resumedJob = await this.enqueueGenerateScriptJob(
      {
        userId: input.userId,
        sessionId: baseInput.sessionId,
        instructions: mergedInstructions,
        inputSchema: baseInput.inputSchema,
        expectedOutputDescription: baseInput.expectedOutputDescription,
        additionalContext: mergedAdditionalContext,
        constraints: baseInput.constraints,
        referenceDocuments: mergedReferences,
        testCases: mergedTestCases,
        attachments: mergedAttachments
      },
      {
        continuedFromJobId: record.id,
        initialProgressMessage: 'Reparaturversuch wird neu gestartet',
        initialWarnings: this.buildRepairWarnings(record)
      }
    );

    this.appendJobWarning(record, `Folgeauftrag ${resumedJob.id} zur Reparatur wurde erstellt.`);

    return resumedJob;
  }

  public async generateDeterministicScript(input: GenerateToolScriptInternalInput): Promise<GenerateToolScriptResponse> {
    const normalized = this.normalizeGenerateScriptInput(input);
    const nowIso = new Date().toISOString();

    const job: GenerateScriptJobRecord = {
      id: randomUUID(),
      type: 'generate-script',
      sessionId: normalized.sessionId,
      status: 'running',
      createdAt: nowIso,
      updatedAt: nowIso,
      progress: {
        stage: 'prompting',
        attempt: 1
      },
      attempts: 0,
      warnings: [],
      userId: normalized.userId,
      normalizedInput: normalized
    };

    return this.executeGenerateScript(job);
  }

  private startGenerateScriptWorker(): void {
    if (this.generateScriptWorkerActive) {
      return;
    }

    this.generateScriptWorkerActive = true;
    setImmediate(() => {
      this.processGenerateScriptQueue().catch((error) => {
        console.error('Generate-script worker terminated unexpectedly:', error);
        this.generateScriptWorkerActive = false;
      });
    });
  }

  private async processGenerateScriptQueue(): Promise<void> {
    while (this.generateScriptQueue.length > 0) {
      const job = this.generateScriptQueue.shift();
      if (!job) {
        continue;
      }

      try {
        await this.handleGenerateScriptJob(job);
      } catch (error) {
        console.error('Generate-script job failed:', error);
      }
    }

    this.generateScriptWorkerActive = false;
  }

  private async handleGenerateScriptJob(job: GenerateScriptJobRecord): Promise<void> {
    job.status = 'running';
    job.updatedAt = new Date().toISOString();

    try {
      const response = await this.executeGenerateScript(job);
      job.result = response;

      const warnings = new Set<string>(job.warnings ?? []);
      const validationWarnings = response.script.validation.warnings ?? [];

      if (validationWarnings.length) {
        validationWarnings.forEach((warning) => warnings.add(warning));
        job.result.script.validation.warnings = Array.from(new Set(validationWarnings));
      }

      if (!response.script.validation.deterministic) {
        warnings.add('Skript verletzt deterministische Vorgaben.');
      }
      if (response.testResults && !response.testResults.passed) {
        warnings.add('Mindestens ein automatischer Test ist fehlgeschlagen.');
      }

      job.warnings = Array.from(warnings).slice(-MAX_JOB_WARNINGS);
      job.status = 'succeeded';
      this.updateGenerateJobProgress(job, 'completed', 'Skript erfolgreich generiert', job.attempts || undefined);
    } catch (error) {
      job.error = this.buildGenerateScriptError(error);
      job.status = 'failed';
      job.warnings = job.warnings ?? [];
      this.updateGenerateJobProgress(job, 'completed', 'Skriptgenerierung fehlgeschlagen', job.attempts || undefined);
    } finally {
      job.updatedAt = new Date().toISOString();

      if (!job.result && job.status === 'failed' && !job.error) {
        job.error = { message: 'Skript konnte nicht generiert werden' };
      }
    }
  }

  private async executeGenerateScript(job: GenerateScriptJobRecord): Promise<GenerateToolScriptResponse> {
    const normalized = job.normalizedInput;

    this.updateGenerateJobProgress(job, 'collecting-context', 'Kontext wird gesammelt', job.attempts || undefined);
    const contextSnippets = await this.collectContextSnippets(normalized);

    let descriptor: ToolScriptDescriptor | null = null;
    let validationError: AppError | null = null;
    let lastCandidateCode: string | undefined;
    let lastRunSnippet: string | undefined;
    let attempts = 0;
  let rateLimitRecoveryAttempts = 0;

    for (attempts = 1; attempts <= MAX_GENERATION_ATTEMPTS; attempts++) {
      job.attempts = attempts;

      if (attempts === 1) {
        this.updateGenerateJobProgress(job, 'prompting', 'LLM wird aufgerufen', attempts);
      } else {
        this.updateGenerateJobProgress(
          job,
          'repairing',
          'Vorheriger Versuch schlug fehl – erneuter Prompt mit Feedback',
          attempts
        );
      }

      const validationContext = (validationError as any)?.context;

      const feedback = validationError
        ? {
            attempt: attempts,
            validationErrorMessage: validationError.message,
            validationErrorCode: validationContext?.code || (validationError as any)?.code,
            validationContext: validationContext ? this.sanitizeValidationContext(validationContext) : undefined,
            previousCode: lastCandidateCode ? this.truncateText(lastCandidateCode, 4000) : undefined,
            runSnippet: lastRunSnippet
          }
        : undefined;

      const prompt = this.buildScriptPrompt(normalized, contextSnippets, feedback);

      let rawCandidate: any;
      let lastRateLimitError: any = null;

      for (let rateAttempt = 0; rateAttempt < LLM_RATE_LIMIT_RETRY_LIMIT; rateAttempt++) {
        try {
          rawCandidate = await llm.generateStructuredOutput(prompt, {
            user_id: normalized.userId,
            session_id: normalized.sessionId,
            persona: 'tooling-script-generator',
            attempt: attempts
          });
          lastRateLimitError = null;
          break;
        } catch (error: any) {
          if (this.isRateLimitError(error)) {
            lastRateLimitError = error;
            const backoffMs = this.getRateLimitBackoffDelay(rateAttempt);
            const stageForRetry = attempts === 1 ? 'prompting' : 'repairing';
            this.appendJobWarning(job, `LLM Rate-Limit erreicht – automatischer Retry in ${Math.ceil(backoffMs / 1000)}s.`);
            this.updateGenerateJobProgress(
              job,
              stageForRetry,
              `LLM Rate-Limit – neuer Versuch in ${Math.ceil(backoffMs / 1000)}s`,
              attempts
            );
            await this.delay(backoffMs);
            continue;
          }

          const appError = new AppError('Skript konnte nicht generiert werden', 502);
          (appError as any).context = {
            code: 'llm_generation_failed',
            attempt: attempts,
            details: error?.message || String(error || 'unbekannter Fehler')
          };
          throw appError;
        }
      }

      if (rawCandidate === undefined) {
        rateLimitRecoveryAttempts += 1;

        if (rateLimitRecoveryAttempts > MAX_RATE_LIMIT_RECOVERY_ATTEMPTS) {
          const message = 'Rate-Limit erreicht. Bitte warte einen Moment und versuche es erneut.';
          const appError = new AppError(message, 429);
          (appError as any).context = {
            code: 'RATE_LIMITED',
            attempt: attempts,
            retryAfterMs: this.getRateLimitBackoffDelay(LLM_RATE_LIMIT_RETRY_LIMIT - 1),
            details: lastRateLimitError?.message || undefined
          };
          throw appError;
        }

        const additionalDelay = this.getRateLimitBackoffDelay(LLM_RATE_LIMIT_RETRY_LIMIT - 1) + RATE_LIMIT_RECOVERY_DELAY_MS;
        const stageForRetry = attempts === 1 ? 'prompting' : 'repairing';
        this.appendJobWarning(
          job,
          `LLM Rate-Limit – zusätzlicher Wartezyklus ${rateLimitRecoveryAttempts}/${MAX_RATE_LIMIT_RECOVERY_ATTEMPTS}. Neuer Versuch in ${Math.ceil(additionalDelay / 1000)}s.`
        );
        this.updateGenerateJobProgress(
          job,
          stageForRetry,
          `LLM Rate-Limit – erneuter Versuch in ${Math.ceil(additionalDelay / 1000)}s`,
          attempts
        );
        await this.delay(additionalDelay);
        attempts -= 1;
        continue;
      }

      try {
        rateLimitRecoveryAttempts = 0;
        descriptor = this.normalizeScriptCandidate(rawCandidate, normalized);
        validationError = null;
        break;
      } catch (error) {
        if (this.isRecoverableValidationError(error)) {
          validationError = error as AppError;
          lastCandidateCode = this.extractCandidateCodeForFeedback(rawCandidate);
          lastRunSnippet = lastCandidateCode
            ? this.extractRunFunctionSnippet(lastCandidateCode, 'run')
            : undefined;
          continue;
        }
        throw error;
      }
    }

    if (!descriptor) {
      const fallbackError = validationError ?? new AppError('Skript konnte nicht generiert werden', 502);
      if (!(fallbackError as any).context) {
        (fallbackError as any).context = {};
      }
      (fallbackError as any).context = {
        ...(fallbackError as any).context,
        code: ((fallbackError as any).context?.code as string | undefined) ?? 'script_generation_failed',
        attempts
      };
      throw fallbackError;
    }

    job.attempts = attempts;

    this.updateGenerateJobProgress(job, 'validating', 'Skript wird validiert', attempts);

    const hasTests = normalized.testCases.length > 0;
    if (hasTests) {
      this.updateGenerateJobProgress(job, 'testing', 'Automatische Tests werden ausgeführt', attempts);
    }

    const testResults = await this.executeTestCases(descriptor, normalized);

    if (hasTests) {
      this.updateGenerateJobProgress(job, 'testing', 'Tests abgeschlossen', attempts);
    }

    if (attempts > 1) {
      descriptor.notes = this.ensureNotesLimit([
        ...(descriptor.notes || []),
        `Automatische Korrektur nach ${attempts} Versuchen abgeschlossen.`
      ]);
    }

    const response: GenerateToolScriptResponse = {
      sessionId: normalized.sessionId,
      script: descriptor,
      inputSchema: normalized.inputSchema,
      expectedOutputDescription: normalized.expectedOutputDescription
    };

    if (contextSnippets.length) {
      response.contextSnippets = contextSnippets;
    }

    if (testResults) {
      response.testResults = testResults;
    }

    return response;
  }

  private updateGenerateJobProgress(
    job: GenerateScriptJobRecord,
    stage: GenerateScriptJobStage,
    message?: string,
    attempt?: number
  ): void {
    job.progress = {
      stage,
      ...(message ? { message } : {}),
      ...(attempt ? { attempt } : {})
    };
    job.updatedAt = new Date().toISOString();
  }

  private buildGenerateScriptError(error: unknown): GenerateScriptJobError {
    if (error instanceof AppError) {
      const context = (error as any).context;
      return {
        message: error.message,
        code: context?.code,
        details: context && typeof context === 'object' ? { ...context } : undefined
      };
    }

    if (error instanceof Error) {
      return { message: error.message };
    }

    return { message: String(error ?? 'Unbekannter Fehler') };
  }

  private normalizeGenerateScriptInput(input: GenerateToolScriptInternalInput): NormalizedGenerateScriptInput {
    if (!input || typeof input !== 'object') {
      this.raiseValidationError('Ungültige Parameter für Skriptgenerierung', 'invalid_payload');
    }

    if (!input.sessionId || typeof input.sessionId !== 'string' || !input.sessionId.trim()) {
      this.raiseValidationError('sessionId ist erforderlich', 'missing_session');
    }

    const instructions = this.normalizeRequiredText(input.instructions, 'instructions', MAX_INSTRUCTIONS_LENGTH);
    const additionalContext = this.normalizeOptionalText(input.additionalContext, 'additionalContext', MAX_CONTEXT_LENGTH);
    const expectedOutputDescription = this.normalizeOptionalText(
      input.expectedOutputDescription,
      'expectedOutputDescription',
      MAX_EXPECTED_OUTPUT_LENGTH
    );

    const schemaSource = input.inputSchema ? input.inputSchema : this.cloneDefaultInputSchema();
    const inputSchema = this.normalizeInputSchema(schemaSource);
    const constraints = this.normalizeConstraints(input.constraints);
    const attachments = this.normalizeAttachments(input.attachments);
    const baseReferences = this.normalizeReferences(input.referenceDocuments);
    const attachmentReferences = this.transformAttachmentsToReferences(attachments, MAX_REFERENCE_COUNT);
    const referenceDocuments = this.mergeReferences(attachmentReferences, baseReferences);
    const testCases = this.normalizeTestCases(input.testCases);
    const { detectedTypes, primaryType } = this.resolveEdifactMessageHints({
      instructions,
      additionalContext,
      expectedOutputDescription,
      attachments,
      referenceDocuments
    });

    return {
      ...input,
      instructions,
      additionalContext,
      expectedOutputDescription,
      inputSchema,
      constraints,
      referenceDocuments,
      testCases,
      attachments,
      detectedMessageTypes: detectedTypes,
      primaryMessageType: primaryType
    };
  }

  private normalizeConstraints(constraints?: ToolScriptConstraints): NormalizedToolScriptConstraints {
    const normalized: NormalizedToolScriptConstraints = {
      deterministic: constraints?.deterministic !== false,
      allowNetwork: constraints?.allowNetwork === true,
      allowFilesystem: constraints?.allowFilesystem === true,
      maxRuntimeMs: this.normalizeTimeout(constraints?.maxRuntimeMs)
    };

    return normalized;
  }

  private normalizeInputSchema(schema: ToolScriptInputSchema): ToolScriptInputSchema {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
      this.raiseValidationError('inputSchema muss ein Objekt sein', 'invalid_input_schema');
    }

    if (schema.type !== 'object') {
      this.raiseValidationError('inputSchema unterstützt nur den Typ "object"', 'unsupported_input_schema');
    }

    if (!schema.properties || typeof schema.properties !== 'object' || Array.isArray(schema.properties)) {
      this.raiseValidationError('inputSchema.properties muss ein Objekt sein', 'invalid_input_properties');
    }

    const normalizedProps: Record<string, { type: string; description?: string; example?: unknown }> = {};

    for (const [key, value] of Object.entries(schema.properties)) {
      if (typeof key !== 'string' || !key.trim()) {
        this.raiseValidationError('inputSchema enthält ungültige Property-Namen', 'invalid_property_name');
      }

      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        this.raiseValidationError(`inputSchema Property "${key}" ist ungültig`, 'invalid_property_value', { property: key });
      }

      const type = typeof (value as any).type === 'string' && (value as any).type.trim() ? (value as any).type.trim() : 'string';
      const description = typeof (value as any).description === 'string' && (value as any).description.trim()
        ? (value as any).description.trim()
        : undefined;
      const example = (value as any).example;

      normalizedProps[key.trim()] = {
        type,
        ...(description ? { description } : {}),
        ...(example !== undefined ? { example } : {})
      };
    }

    const required = Array.isArray(schema.required)
      ? Array.from(new Set(schema.required.filter((key) => typeof key === 'string' && normalizedProps[key])))
      : undefined;

    const description = typeof schema.description === 'string' && schema.description.trim()
      ? schema.description.trim().slice(0, MAX_INSTRUCTIONS_LENGTH)
      : undefined;

    return {
      type: 'object',
      ...(description ? { description } : {}),
      properties: normalizedProps,
      ...(required && required.length ? { required } : {})
    };
  }

  private normalizeRequiredText(value: unknown, field: string, maxLength: number): string {
    if (typeof value !== 'string' || !value.trim()) {
      this.raiseValidationError(`${field} ist erforderlich`, `missing_${field}`);
    }

    const trimmed = value.trim();

    if (trimmed.length > maxLength) {
      this.raiseValidationError(
        `${field} überschreitet das Limit von ${maxLength} Zeichen`,
        `too_long_${field}`,
        { maxLength, length: trimmed.length }
      );
    }

    return trimmed;
  }

  private normalizeOptionalText(value: unknown, field: string, maxLength: number): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (typeof value !== 'string') {
      this.raiseValidationError(`${field} muss ein String sein`, `invalid_${field}`);
    }

    const trimmed = value.trim();

    if (!trimmed) {
      return undefined;
    }

    if (trimmed.length > maxLength) {
      this.raiseValidationError(
        `${field} überschreitet das Limit von ${maxLength} Zeichen`,
        `too_long_${field}`,
        { maxLength, length: trimmed.length }
      );
    }

    return trimmed;
  }

  private cloneDefaultInputSchema(): ToolScriptInputSchema {
    return JSON.parse(JSON.stringify(DEFAULT_INPUT_SCHEMA_TEMPLATE));
  }

  private normalizeReferences(references?: ToolScriptReference[]): NormalizedToolScriptReference[] {
    if (!Array.isArray(references) || references.length === 0) {
      return [];
    }

    const sanitized: NormalizedToolScriptReference[] = [];
    for (const reference of references) {
      if (!reference || typeof reference !== 'object') {
        continue;
      }

      const snippet = typeof reference.snippet === 'string' ? reference.snippet.trim() : '';
      if (!snippet) {
        continue;
      }

      sanitized.push({
        id: typeof reference.id === 'string' && reference.id.trim() ? reference.id.trim() : undefined,
        title: typeof reference.title === 'string' && reference.title.trim() ? reference.title.trim().slice(0, 160) : undefined,
        snippet: this.truncateText(snippet, MAX_REFERENCE_SNIPPET_LENGTH),
        weight: typeof reference.weight === 'number' && Number.isFinite(reference.weight) ? reference.weight : 1,
        useForPrompt: reference.useForPrompt !== false
      });

      if (sanitized.length >= MAX_REFERENCE_COUNT) {
        break;
      }
    }

    return sanitized.sort((a, b) => b.weight - a.weight);
  }

  private normalizeAttachments(attachments?: ToolScriptAttachment[]): NormalizedToolScriptAttachment[] {
    if (attachments === undefined || attachments === null) {
      return [];
    }

    if (!Array.isArray(attachments)) {
      this.raiseValidationError('attachments muss ein Array sein', 'invalid_attachments_type');
    }

    if (!attachments.length) {
      return [];
    }

    if (attachments.length > MAX_ATTACHMENT_COUNT) {
      this.raiseValidationError(
        `Es sind maximal ${MAX_ATTACHMENT_COUNT} Attachments erlaubt`,
        'too_many_attachments',
        { maxCount: MAX_ATTACHMENT_COUNT }
      );
    }

    const normalized: NormalizedToolScriptAttachment[] = [];
    let totalLength = 0;

    attachments.forEach((attachment, index) => {
      if (!attachment || typeof attachment !== 'object' || Array.isArray(attachment)) {
        this.raiseValidationError('attachments enthält ungültige Einträge', 'invalid_attachment_item', { index });
      }

      const filenameRaw = (attachment as any).filename;
      if (typeof filenameRaw !== 'string' || !filenameRaw.trim()) {
        this.raiseValidationError('attachments.filename ist erforderlich', 'missing_attachment_filename', { index });
      }
      const filename = filenameRaw.trim().slice(0, 160);

      const contentRaw = (attachment as any).content;
      if (typeof contentRaw !== 'string' || !contentRaw.trim()) {
        this.raiseValidationError('attachments.content muss Text enthalten', 'missing_attachment_content', { index });
      }

      if (contentRaw.length > MAX_ATTACHMENT_CONTENT_LENGTH) {
        this.raiseValidationError(
          `Attachment überschreitet ${MAX_ATTACHMENT_CONTENT_LENGTH} Zeichen (~${(
            MAX_ATTACHMENT_CONTENT_LENGTH /
            (1024 * 1024)
          ).toFixed(0)} MB)`,
          'attachment_too_large',
          { index, maxLength: MAX_ATTACHMENT_CONTENT_LENGTH, length: contentRaw.length }
        );
      }

      totalLength += contentRaw.length;
      if (totalLength > MAX_ATTACHMENT_TOTAL_LENGTH) {
        this.raiseValidationError(
          `Gesamtgröße der Attachments überschreitet ${MAX_ATTACHMENT_TOTAL_LENGTH} Zeichen (~${(
            MAX_ATTACHMENT_TOTAL_LENGTH /
            (1024 * 1024)
          ).toFixed(0)} MB)`,
          'attachments_total_too_large',
          { maxLength: MAX_ATTACHMENT_TOTAL_LENGTH }
        );
      }

      const mimeTypeRaw = (attachment as any).mimeType;
      let mimeType: string | undefined;
      if (mimeTypeRaw !== undefined) {
        if (typeof mimeTypeRaw !== 'string' || !mimeTypeRaw.trim()) {
          this.raiseValidationError('attachments.mimeType muss ein String sein', 'invalid_attachment_mime', { index });
        }
        mimeType = mimeTypeRaw.trim().slice(0, 120);
      }

      const description = this.normalizeOptionalText((attachment as any).description, `attachments[${index}].description`, 240);
      const weight = this.sanitizeAttachmentWeight((attachment as any).weight);
      const idValue = (attachment as any).id;
      const id = typeof idValue === 'string' && idValue.trim() ? idValue.trim().slice(0, 120) : undefined;

      const displayName = description || filename;

      normalized.push({
        id,
        filename,
        displayName,
        content: contentRaw,
        mimeType,
        description: description || undefined,
        weight
      });
    });

    return normalized;
  }

  private transformAttachmentsToReferences(
    attachments: NormalizedToolScriptAttachment[],
    maxSlots: number
  ): NormalizedToolScriptReference[] {
    if (!attachments.length || maxSlots <= 0) {
      return [];
    }

    const references: NormalizedToolScriptReference[] = [];

    for (const attachment of attachments) {
      if (references.length >= maxSlots) {
        break;
      }

      const availableChunks = Math.max(1, Math.min(maxSlots - references.length, MAX_ATTACHMENT_CHUNKS_PER_ATTACHMENT));
      const chunks = this.splitAttachmentIntoChunks(attachment.content, availableChunks);
      const totalChunks = chunks.length;

      for (let index = 0; index < totalChunks && references.length < maxSlots; index++) {
        const chunk = chunks[index];
        const formattedChunk = this.formatAttachmentChunkForPrompt(chunk, attachment);
        const chunkLabel = totalChunks > 1 ? ` (Teil ${index + 1}/${totalChunks})` : '';

        const headerLines: string[] = [
          `Attachment: ${attachment.displayName}${chunkLabel}`
        ];

        if (attachment.mimeType) {
          headerLines.push(`Content-Type: ${attachment.mimeType}`);
        }

        if (attachment.description && attachment.description !== attachment.displayName) {
          headerLines.push(`Beschreibung: ${attachment.description}`);
        }

  const body = `${headerLines.join('\n')}\n\n${formattedChunk}`.trim();
        const snippet = this.truncateText(body, MAX_REFERENCE_SNIPPET_LENGTH);

        const chunkIdSeed = `${attachment.filename}:${attachment.id ?? ''}:${index}`;
        const chunkId = createHash('sha1').update(chunkIdSeed).digest('hex');

        const boostedWeight = Math.max(attachment.weight, ATTACHMENT_REFERENCE_WEIGHT_BOOST);

        references.push({
          id: `${attachment.id ?? attachment.filename}#${chunkId}`.slice(0, 160),
          title: attachment.displayName.slice(0, 160),
          snippet,
          weight: boostedWeight,
          useForPrompt: true
        });
      }
    }

    return references;
  }

  private formatAttachmentChunkForPrompt(
    content: string,
    attachment: NormalizedToolScriptAttachment
  ): string {
    const trimmed = content.trim();
    if (!trimmed) {
      return trimmed;
    }

    if (!this.isLikelyEdifactAttachment(trimmed, attachment)) {
      return trimmed;
    }

    const withBreaks = this.insertEdifactSegmentBreaks(trimmed);
    return withBreaks.replace(/\n{3,}/g, '\n\n').trim();
  }

  private isLikelyEdifactAttachment(
    content: string,
    attachment: NormalizedToolScriptAttachment
  ): boolean {
    const filename = attachment.filename.toLowerCase();
    const mimeType = attachment.mimeType?.toLowerCase() ?? '';

    if (filename.endsWith('.edi') || filename.endsWith('.edifact')) {
      return true;
    }

    if (mimeType.includes('edifact')) {
      return true;
    }

    if (/UNH\+/.test(content) && /UNT\+/.test(content)) {
      return true;
    }

    return false;
  }

  private insertEdifactSegmentBreaks(content: string): string {
    let result = '';

    for (let index = 0; index < content.length; index++) {
      const char = content[index];
      result += char;

      if (char === "'" && content[index - 1] !== '?') {
        const nextChar = content[index + 1];
        if (nextChar !== '\n' && nextChar !== '\r') {
          result += '\n';
        }
      }
    }

    return result;
  }

  private mergeReferences(
    attachmentRefs: NormalizedToolScriptReference[],
    referenceDocs: NormalizedToolScriptReference[]
  ): NormalizedToolScriptReference[] {
    const merged: NormalizedToolScriptReference[] = [];
    const seen = new Set<string>();

    const add = (ref: NormalizedToolScriptReference) => {
      if (!ref || !ref.snippet?.trim()) {
        return;
      }

      const key = `${ref.title ?? ''}|${ref.snippet}`.toLowerCase();
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      merged.push(ref);
    };

    attachmentRefs.forEach(add);
    referenceDocs.forEach(add);

    merged.sort((a, b) => b.weight - a.weight);
    return merged.slice(0, MAX_REFERENCE_COUNT);
  }

  private splitAttachmentIntoChunks(content: string, maxChunks: number): string[] {
    if (!content) {
      return [];
    }

    const normalized = content.replace(/\r\n/g, '\n').trimEnd();
    const effectiveMaxChunks = Math.max(1, Math.min(maxChunks, MAX_ATTACHMENT_CHUNKS_PER_ATTACHMENT));
    const targetChunkLength = Math.max(
      MIN_ATTACHMENT_CHUNK_LENGTH,
      Math.min(MAX_ATTACHMENT_CHUNK_LENGTH, MAX_REFERENCE_SNIPPET_LENGTH - 100)
    );

    const chunks: string[] = [];
    let buffer = '';

    const pushBuffer = () => {
      if (buffer) {
        chunks.push(buffer.trimEnd());
        buffer = '';
      }
    };

    const lines = normalized.split('\n');
    for (const line of lines) {
      const candidate = buffer ? `${buffer}\n${line}` : line;
      if (candidate.length > targetChunkLength && buffer) {
        pushBuffer();
      }

      if (candidate.length > targetChunkLength) {
        let start = 0;
        while (start < candidate.length && chunks.length < effectiveMaxChunks) {
          const end = Math.min(candidate.length, start + targetChunkLength);
          chunks.push(candidate.slice(start, end));
          start = end;
        }
        buffer = '';
      } else {
        buffer = candidate;
      }

      if (chunks.length >= effectiveMaxChunks) {
        break;
      }
    }

    if (chunks.length < effectiveMaxChunks && buffer) {
      pushBuffer();
    }

    if (!chunks.length) {
      return [normalized.slice(0, targetChunkLength)];
    }

    return chunks.slice(0, effectiveMaxChunks);
  }

  private sanitizeAttachmentWeight(weight: unknown): number {
    if (typeof weight !== 'number' || !Number.isFinite(weight)) {
      return ATTACHMENT_WEIGHT_DEFAULT;
    }

    const clamped = Math.max(1, Math.min(10, Math.trunc(weight)));
    return clamped;
  }

  private normalizeTestCases(testCases?: ToolScriptTestCase[]): ToolScriptTestCase[] {
    if (!Array.isArray(testCases) || testCases.length === 0) {
      return [];
    }

    const sanitized: ToolScriptTestCase[] = [];

    for (const testCase of testCases) {
      if (!testCase || typeof testCase !== 'object') {
        continue;
      }

      const assertions = this.normalizeAssertions(testCase.assertions);
      const inputValue = this.cloneTestCaseInput(testCase.input);

      sanitized.push({
        name: typeof testCase.name === 'string' && testCase.name.trim() ? testCase.name.trim().slice(0, 120) : undefined,
        description: typeof testCase.description === 'string' && testCase.description.trim() ? testCase.description.trim().slice(0, 240) : undefined,
        input: inputValue,
        ...(assertions.length ? { assertions } : {})
      });

      if (sanitized.length >= MAX_TEST_CASES) {
        break;
      }
    }

    return sanitized;
  }

  private normalizeAssertions(assertions?: ToolScriptTestAssertion[]): ToolScriptTestAssertion[] {
    if (!Array.isArray(assertions) || assertions.length === 0) {
      return [];
    }

    const supported: ToolScriptTestAssertion['type'][] = ['contains', 'equals', 'regex'];
    const sanitized: ToolScriptTestAssertion[] = [];

    for (const assertion of assertions) {
      if (!assertion || typeof assertion !== 'object') {
        continue;
      }

      if (!supported.includes(assertion.type)) {
        continue;
      }

      const value = typeof assertion.value === 'string' ? assertion.value.trim() : '';
      if (!value) {
        continue;
      }

      sanitized.push({
        type: assertion.type,
        value: value.slice(0, MAX_ASSERTION_VALUE_LENGTH)
      });

      if (sanitized.length >= MAX_ASSERTIONS_PER_TEST) {
        break;
      }
    }

    return sanitized;
  }

  private cloneTestCaseInput(input: ToolScriptTestCase['input']): ToolScriptTestCase['input'] {
    if (input === null || input === undefined) {
      return {};
    }

    if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
      return input;
    }

    if (typeof input === 'object') {
      try {
        return JSON.parse(JSON.stringify(input));
      } catch (_error) {
        this.raiseValidationError('testCases.input muss JSON-serialisierbar sein', 'invalid_test_case_input');
      }
    }

    this.raiseValidationError('testCases.input enthält einen nicht unterstützten Typ', 'invalid_test_case_input_type');
  }

  private async collectContextSnippets(input: NormalizedGenerateScriptInput): Promise<ToolScriptContextSnippet[]> {
    const snippets: ToolScriptContextSnippet[] = [];
    const seen = new Set<string>();
    const expectedTypes = Array.isArray(input.detectedMessageTypes) ? input.detectedMessageTypes : [];

    for (const reference of input.referenceDocuments) {
      if (!reference.useForPrompt) {
        continue;
      }

      const key = reference.snippet.trim().toLowerCase();
      if (seen.has(key)) {
        continue;
      }

      snippets.push({
        id: reference.id,
        title: reference.title,
        snippet: reference.snippet,
        origin: 'reference',
        score: reference.weight
      });
      seen.add(key);

      if (snippets.length >= MAX_CONTEXT_SNIPPETS) {
        return snippets;
      }
    }

    await this.collectPseudocodeSnippets(input, snippets, seen);

    if (snippets.length >= MAX_CONTEXT_SNIPPETS) {
      return snippets.slice(0, MAX_CONTEXT_SNIPPETS);
    }

    const queryParts = [input.instructions, input.additionalContext, input.expectedOutputDescription]
      .filter(Boolean)
      .join('\n\n');

    if (!queryParts.trim()) {
      return snippets;
    }

    try {
      const retrieval = await retrievalService.semanticSearch(queryParts, {
        limit: MAX_CONTEXT_SNIPPETS * 2,
        outlineScoping: true,
        excludeVisual: true
      });

      for (const result of retrieval.results) {
        if (snippets.length >= MAX_CONTEXT_SNIPPETS) {
          break;
        }

        const snippetText = this.extractPayloadSnippet(result.payload, result.highlight);
        if (!snippetText) {
          continue;
        }

        if (this.isPayloadMessageTypeMismatch(result.payload, expectedTypes)) {
          continue;
        }

        if (this.isMessageTypeMismatch(snippetText, expectedTypes)) {
          continue;
        }

        const key = snippetText.trim().toLowerCase();
        if (seen.has(key)) {
          continue;
        }

        const score = typeof result.score === 'number'
          ? result.score
          : typeof result.metadata?.mergedScore === 'number'
            ? result.metadata.mergedScore
            : undefined;

        snippets.push({
          id: result.id,
          title: this.extractPayloadTitle(result.payload),
          snippet: this.truncateText(snippetText, MAX_RETRIEVAL_SNIPPET_LENGTH),
          origin: 'retrieval',
          score,
          source: result.payload?.message_format || result.payload?.content_type || undefined
        });
        seen.add(key);
      }
    } catch (error) {
      console.warn('Context retrieval for generate-script failed:', error);
    }

    return snippets.slice(0, MAX_CONTEXT_SNIPPETS);
  }

  private async collectPseudocodeSnippets(
    input: NormalizedGenerateScriptInput,
    snippets: ToolScriptContextSnippet[],
    seen: Set<string>
  ): Promise<void> {
    if (snippets.length >= MAX_CONTEXT_SNIPPETS) {
      return;
    }

    const messageTypes = this.inferEdifactMessageTypes(input);
    if (!messageTypes.length) {
      return;
    }

    const limitPerQuery = Math.max(8, MAX_CONTEXT_SNIPPETS * 3);

    for (const messageType of messageTypes) {
      if (snippets.length >= MAX_CONTEXT_SNIPPETS) {
        break;
      }

      try {
        const response = await retrievalService.semanticSearch(`${messageType} EDIFACT Pseudocode`, {
          limit: limitPerQuery,
          outlineScoping: false,
          excludeVisual: false
        });

        for (const item of response.results) {
          if (snippets.length >= MAX_CONTEXT_SNIPPETS) {
            break;
          }

          const payload = item.payload ?? {};
          const chunkType = typeof payload.chunk_type === 'string' ? payload.chunk_type.toLowerCase() : '';
          if (chunkType !== 'pseudocode_raw') {
            continue;
          }

          const source = typeof payload.source === 'string' ? payload.source : undefined;
          if (source && !source.toUpperCase().includes(messageType)) {
            continue;
          }

          const pseudocode = typeof payload.content === 'string' ? payload.content.trim() : undefined;
          const summary = typeof payload.summary_text === 'string' ? payload.summary_text.trim() : undefined;

          if (!pseudocode && !summary) {
            continue;
          }

          const page = typeof payload.page === 'number'
            ? payload.page
            : typeof payload.page_number === 'number'
              ? payload.page_number
              : undefined;
          const originalDocId = typeof payload.original_doc_id === 'string' ? payload.original_doc_id : undefined;

          const sections: string[] = [];
          if (summary) {
            const pageInfo = page !== undefined ? ` (Seite ${page})` : '';
            sections.push(`Kurzfassung${pageInfo}: ${summary}`);
          }
          if (pseudocode) {
            sections.push(`Pseudocode (bitte in Node.js überführen):\n${this.truncateText(pseudocode, 600)}`);
          }

          const snippetText = sections.join('\n\n');
          if (!snippetText.trim()) {
            continue;
          }

          if (this.isMessageTypeMismatch(snippetText, input.detectedMessageTypes ?? [])) {
            continue;
          }

          const dedupeKey = `${messageType}|${source ?? ''}|${originalDocId ?? ''}|${snippetText.slice(0, 160)}`.toLowerCase();
          if (seen.has(dedupeKey)) {
            continue;
          }

          seen.add(dedupeKey);

          const titleParts = [`Pseudocode ${messageType}`];
          if (source) {
            titleParts.push(source);
          }
          if (originalDocId && (!source || !source.includes(originalDocId))) {
            titleParts.push(originalDocId);
          }

          snippets.push({
            id: originalDocId ?? item.id,
            title: titleParts.join(' – '),
            source,
            score: item.score ?? undefined,
            snippet: snippetText,
            origin: 'retrieval'
          });
        }
      } catch (error) {
        console.warn(`Pseudocode retrieval failed for ${messageType}:`, error);
      }
    }
  }

  private inferEdifactMessageTypes(input: NormalizedGenerateScriptInput): string[] {
    if (input.detectedMessageTypes && input.detectedMessageTypes.length) {
      return input.detectedMessageTypes;
    }

    const fallbacks = new Set<string>();

    const addFromText = (text?: string) => {
      const matches = this.collectMessageTypesFromText(text);
      matches.forEach((match) => fallbacks.add(match));
    };

    addFromText(input.instructions);
    addFromText(input.additionalContext);
    addFromText(input.expectedOutputDescription);

    if (input.inputSchema?.description) {
      addFromText(input.inputSchema.description);
    }

    if (input.inputSchema?.properties) {
      for (const value of Object.values(input.inputSchema.properties)) {
        if (!value) {
          continue;
        }

        addFromText(value.description);
        if (typeof value.example === 'string') {
          addFromText(value.example);
        }
      }
    }

    for (const reference of input.referenceDocuments) {
      addFromText(reference.title);
      addFromText(reference.snippet);
    }

    return Array.from(fallbacks).slice(0, MESSAGE_TYPE_MAX_RESULTS);
  }

  private extractPayloadSnippet(payload: any, highlight?: string | null): string | null {
    const candidates = [
      highlight,
      payload?.contextual_content,
      payload?.text,
      payload?.content,
      payload?.snippet
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    return null;
  }

  private extractPayloadTitle(payload: any): string | undefined {
    const candidates = [payload?.document_name, payload?.title, payload?.source, payload?.message_format];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim().slice(0, 160);
      }
    }

    return undefined;
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
  }

  private async executeTestCases(
    descriptor: ToolScriptDescriptor,
    input: NormalizedGenerateScriptInput
  ): Promise<ToolScriptTestResultSummary | undefined> {
    if (!input.testCases.length) {
      return undefined;
    }

    const results: ToolScriptTestResult[] = [];
    let allPassed = true;

    for (const testCase of input.testCases) {
      try {
        const { result, logs } = await this.runScriptInSandbox(descriptor.code, testCase.input, input.constraints);
        const outputString = this.stringifyResult(result);

        let passed = true;
        let failedAssertion: ToolScriptTestAssertion | undefined;
        let errorMessage: string | undefined;

        if (testCase.assertions && testCase.assertions.length > 0) {
          for (const assertion of testCase.assertions) {
            if (!this.evaluateAssertion(outputString, assertion)) {
              passed = false;
              failedAssertion = assertion;
              errorMessage = `Assertion vom Typ "${assertion.type}" fehlgeschlagen.`;
              break;
            }
          }
        } else {
          if (!outputString || !outputString.trim()) {
            passed = false;
            errorMessage = 'Das Skript hat keinen verwertbaren Output zurückgegeben.';
          }
        }

        const testResult: ToolScriptTestResult = {
          passed,
          name: testCase.name,
          description: testCase.description,
          outputPreview: this.truncateText(outputString, 240)
        };

        if (!passed) {
          testResult.error = errorMessage;
          testResult.failedAssertion = failedAssertion;
          allPassed = false;
        }

        if (logs.length) {
          testResult.outputPreview = `${testResult.outputPreview || ''}\nLog-Auszüge:\n${this.truncateText(logs.join('\n'), 240)}`.trim();
        }

        results.push(testResult);
      } catch (error: any) {
        allPassed = false;
        results.push({
          passed: false,
          name: testCase.name,
          description: testCase.description,
          error: error?.message || String(error || 'Unbekannter Fehler bei Tests')
        });
      }
    }

    return {
      passed: allPassed,
      results
    };
  }

  private evaluateAssertion(output: string, assertion: ToolScriptTestAssertion): boolean {
    switch (assertion.type) {
      case 'contains':
        return output.includes(assertion.value);
      case 'equals':
        return output === assertion.value;
      case 'regex':
        try {
          const regex = new RegExp(assertion.value, 'm');
          return regex.test(output);
        } catch (_error) {
          return false;
        }
      default:
        return false;
    }
  }

  private async runScriptInSandbox(
    code: string,
    input: ToolScriptTestCase['input'],
    constraints: NormalizedToolScriptConstraints
  ): Promise<{ result: unknown; logs: string[] }> {
    const { sandbox, logs } = this.createSandbox(constraints);
    const scriptSource = `${code}\n;module.exports = module.exports || exports;`;
    const script = new Script(scriptSource, { filename: 'tool-script.js' });
    script.runInNewContext(sandbox, { timeout: constraints.maxRuntimeMs });

    const exported = sandbox.module?.exports ?? sandbox.exports;
    const runFn = typeof exported === 'function' ? exported : exported?.run;

    if (typeof runFn !== 'function') {
      throw new Error('Das Skript exportiert keine Funktion `run` oder liefert kein ausführbares Modul.');
    }

    const invocationResult = runFn(input ?? {});
    const result = invocationResult instanceof Promise ? await invocationResult : invocationResult;

    return { result, logs };
  }

  private createSandbox(constraints: NormalizedToolScriptConstraints): { sandbox: any; logs: string[] } {
    const logs: string[] = [];
    const capture = (level: string) => (...args: any[]) => {
      const message = args.map((value) => this.stringifyResult(value)).join(' ');
      logs.push(`[${level}] ${message}`.trim());
    };

    const sandboxConsole = {
      log: capture('log'),
      warn: capture('warn'),
      error: capture('error'),
      info: capture('info')
    };

    const sandboxProcess = this.createRestrictedProcess();
    const sandboxRequire = this.createRestrictedRequire(constraints);

    const sandbox: any = {
      module: { exports: {} },
      exports: {},
      console: sandboxConsole,
      require: sandboxRequire,
      process: sandboxProcess,
      Buffer,
      TextEncoder,
      TextDecoder,
      setTimeout: undefined,
      setInterval: undefined,
      clearTimeout: undefined,
      clearInterval: undefined,
      setImmediate: undefined,
      clearImmediate: undefined
    };

    sandbox.global = sandbox;
    return { sandbox, logs };
  }

  private createRestrictedProcess(): any {
    const restricted = {
      env: {},
      argv: [],
      cwd: () => '/',
      exit: () => {
        throw new Error('process.exit() ist deaktiviert.');
      },
      stdout: undefined,
      stderr: undefined,
      nextTick: process.nextTick.bind(process)
    };

    return Object.freeze(restricted);
  }

  private createRestrictedRequire(constraints: NormalizedToolScriptConstraints) {
    const allowedFactories = new Map<string, () => unknown>([
      ['path', () => require('path')],
      ['url', () => require('url')],
      ['util', () => require('util')]
    ]);

    if (constraints.allowFilesystem) {
      allowedFactories.set('fs', () => require('fs'));
      allowedFactories.set('fs/promises', () => require('fs/promises'));
    }

    if (constraints.allowNetwork) {
      allowedFactories.set('http', () => require('http'));
      allowedFactories.set('https', () => require('https'));
    }

    return (moduleName: string) => {
      if (typeof moduleName !== 'string' || !moduleName.trim()) {
        throw new Error('require() erwartet einen Modulnamen als String.');
      }

      const normalized = moduleName.trim();

      if (normalized.startsWith('.') || normalized.includes('..')) {
        throw new Error(`Relative Importe wie "${normalized}" sind nicht erlaubt.`);
      }

      const factory = allowedFactories.get(normalized);
      if (!factory) {
        throw new Error(`Modul "${normalized}" ist in der Sandbox nicht erlaubt.`);
      }

      return factory();
    };
  }

  private stringifyResult(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch (_error) {
      return String(value);
    }
  }

  private buildScriptPrompt(
    input: NormalizedGenerateScriptInput,
    contextSnippets: ToolScriptContextSnippet[],
    feedback?: ScriptRepairFeedback
  ): string {
    const parts: string[] = [];

    parts.push(
      'Du bist ein strenger Code-Generator für deterministische Node.js-Tools. '
      + 'Erzeuge ausschließlich CommonJS-Module mit `async function run(input)` und `module.exports = { run };`'
    );
    parts.push(
      'Rolle & Kontext:\n'
      + '- Du bist Softwareentwickler für die EDIFACT-Marktkommunikation im deutschsprachigen Energiemarkt.\n'
      + '- Nutze Fachwissen zu Formaten wie MSCONS, UTILMD, INVOIC, ORDERS, um feldgenaue Umsetzungen zu liefern.\n'
      + '- Behalte deterministische Verarbeitung und reproduzierbare Ergebnisse ohne Hidden-State im Blick.'
    );

    parts.push(
      'EDIFACT-Grundlagen, die strikt einzuhalten sind:\n'
      + '- Einfache Datenelemente enthalten genau einen Wert; zusammengesetzte Datenelemente (Composites) trennen ihre Komponenten mit `:`.\n'
      + '- Segmente bestehen aus Datenelementen, getrennt durch `+`, beginnen mit einem dreistelligen Segmentcode (z.\u202fB. `UNH`, `BGM`, `DTM`) und enden mit einem einzelnen Apostroph (`\'`).\n'
      + '- Jede Segmentinstanz bildet eine eigene Zeile ohne zusätzliche Zeilenumbrüche innerhalb des Segments.\n'
      + '- Segmentgruppen bilden wiederholbare Strukturen; Reihenfolge und Wiederholbarkeit müssen gewahrt bleiben (z.\u202fB. Kopf-, Positions-, Summensegmente).\n'
      + '- Eine Nachricht beginnt mit `UNH` und endet mit `UNT`; stelle sicher, dass zwischen diesen Segmenten sämtliche Pflichtsegmente laut Formatbeschreibung vorhanden sind.'
    );

    if (input.primaryMessageType) {
      parts.push(
        `Fokus: ${input.primaryMessageType}. Nutze ausschließlich Segmente und Geschäftsregeln dieses Nachrichtentyps. Vermeide Ausflüge in andere Formate (z.\u202fB. UTILMD, ORDERS) und stütze dich primär auf die bereitgestellten Attachments.`
      );
    }

    parts.push(
      'Erfahrungen aus jüngsten Fehlersuchen:\n'
      + '- MSCONS-Lastgänge liefern Intervallwerte über `QTY+187` mit unmittelbar folgenden `DTM+163` (Beginn) und `DTM+164` (Ende); erzeuge daraus deterministische Zeitstempel, z.\u202fB. ISO-Intervalle `start/end`.\n'
      + '- OBIS-Kennzahlen stehen häufig in `PIA+5`-Segmenten; entferne Freistellzeichen `?` korrekt und kombiniere die ersten beiden Komponenten (z.\u202fB. `1-1` + `1.29.0` \u2192 `1-1:1.29.0`).\n'
      + '- Verlasse dich nicht allein auf `RFF+AEV`; nutze `PIA`, `LIN` und Kontextsegmente als Fallback für Register-IDs.\n'
      + '- Das EDIFACT-Freistellzeichen `?` schützt `+`, `:`, `\'` und `?`; splitte nur auf echte Trennzeichen, sonst verlierst du Nutzdaten.\n'
      + '- `run` muss immer mit `return` antworten; vermeide Side-Effects und liefere strukturierte Fehlermeldungen statt Konsolen-Logs.'
    );

    parts.push(
      'Nutzung bereitgestellter Pseudocode-Snippets:\n'
      + '- Verwende Pseudocode aus den Kontext-Snippets als maßgebliche Quelle und überführe ihn schrittweise in ausführbaren Node.js-Code.\n'
      + '- Prüfe Felder wie `source`, `summary_text`, `page` und `original_doc_id`, um Aufbau und Segment-Reihenfolge korrekt zu übernehmen.\n'
      + '- Übernimm Bedingungen, Schleifen und Segmentgruppen exakt; passe nur an, wenn die Aufgabe explizit Abweichungen verlangt.\n'
      + '- Ergänze deterministische Hilfsfunktionen statt neuer Logik, wenn der Pseudocode bereits sämtliche Fachregeln abdeckt.\n'
      + '- Konvertiere jeden Pseudocode-Schritt in getesteten Node.js-Quellcode und liefere niemals nur Pseudocode oder Platzhalter.'
    );

    parts.push(`Aufgabe:\n${input.instructions}`);

    if (input.additionalContext) {
      parts.push(`Zusätzlicher Kontext:\n${input.additionalContext}`);
    }

    if (contextSnippets.length) {
      const lines = contextSnippets.map((snippet, index) => {
        const title = snippet.title ? ` (${snippet.title})` : '';
        const origin = snippet.origin === 'reference' ? 'Referenz' : 'Recherche';
        return `Quelle ${index + 1} – ${origin}${title}:
${snippet.snippet}`;
      });
      parts.push(`Relevante Hintergrundinformationen:\n${lines.join('\n\n')}`);
    }

    const schemaText = this.serializeInputSchemaForPrompt(input.inputSchema);
    if (schemaText) {
      parts.push(`Eingabe-Schema:\n${schemaText}`);
    }

    if (input.expectedOutputDescription) {
      parts.push(`Erwartetes Output-Verhalten:\n${input.expectedOutputDescription}`);
    }

    parts.push(
      'Zwänge und Sicherheitsregeln:\n'
      + this.formatConstraintsForPrompt(input.constraints)
      + '\n- Keine Zufallsfunktionen (Math.random, crypto.randomUUID, Date.now, setTimeout, setInterval).'
      + '\n- Kein Zugriff auf Netzwerk (http, https, fetch) oder Dateisystem (fs) ohne explizite Freigabe.'
      + '\n- Kein Aufruf von process.exit, child_process, worker_threads oder Shell-Kommandos.'
      + '\n- Nutze nur synchronen Node.js-Standard ohne zusätzliche NPM-Pakete.'
      + '\n- Rückgabe muss über `return` innerhalb von `run` erfolgen und ausschließlich vom input abhängen.'
      + '\n- Erzeuge Text-Output mit expliziten Zeilenumbrüchen (\\n) und achte auf UTF-8 ohne Byte-Order-Mark.'
      + '\n- Bei CSV- oder Tabellen-Ausgaben: setze Kopfzeilen klar, nutze Trennzeichen aus der Aufgabenstellung (Standard: Semikolon) und maskiere Werte gemäß RFC 4180.'
      + '\n- Bewahre originalgetreue EDIFACT-Segmentierung (ein Segment = eine Zeile, Segmentabschluss \') ohne zusätzliche Leerzeilen oder Entfernen der Abschlusszeichen.'
    );

    parts.push(
      'Antwortformat: JSON ohne Markdown, ohne Kommentare. Felder: '
      + '{"code": string, "description": string, "entrypoint": "run", "runtime": "node18", "deterministic": true, '
      + '"dependencies": string[], "warnings": string[], "notes": string[]}. '
      + '"dependencies": string[], "warnings": string[], "notes": string[], "artifacts"?: Artifact[]}. '
      + 'Code als reiner String ohne ```-Blöcke.'
    );

    parts.push('Das Feld "code" MUSS den vollständigen CommonJS-Quelltext enthalten und darf nicht leer sein.');

    parts.push('Nutze deutschsprachige Beschreibungen für description/notes, halte sie knapp (max 240 Zeichen pro Eintrag).');

    parts.push(
      'Wenn der vollständige Code länger als ca. 3200 Zeichen wird, gib zusätzlich `artifacts` aus:\n'
      + '- `artifacts` ist ein Array von Objekten { id: string, title?: string, order: number, description?: string, code: string }.\n'
      + '- Teile den Code in logisch getrennte Module (z. B. Parser, Utilities, Export) und gib nur die Codesegmente aus.\n'
      + '- `code` im Hauptobjekt darf dann leer sein oder nur den orchestrierenden Export enthalten; der Server setzt die Segmente automatisch zusammen.'
    );

    if (feedback) {
      const feedbackLines = [
        `Vorheriger Versuch #${feedback.attempt - 1} schlug fehl.`,
        `Grund: ${feedback.validationErrorMessage}`
          + (feedback.validationErrorCode ? ` (Code: ${feedback.validationErrorCode})` : '') + '.',
        'Behebe diesen Fehler zwingend. Stelle sicher, dass `run` den Eingabeparameter nutzt und mit `return` antwortet.'
      ];

      const context = feedback.validationContext;
      if (context) {
        const contextViolations = Array.isArray(context['violations']) ? context['violations'] : undefined;
        const violations = contextViolations?.filter((item) => typeof item === 'string') as string[] | undefined;
        if (violations && violations.length) {
          feedbackLines.push('Folgende Verstöße wurden festgestellt – entferne sie vollständig und ersetze sie durch deterministische Alternativen:');
          feedbackLines.push(...violations.map((violation, index) => `  ${index + 1}. ${violation}`));
        }

        const contextForbidden = Array.isArray(context['forbiddenApis']) ? context['forbiddenApis'] : undefined;
        const forbiddenApis = contextForbidden?.filter((item) => typeof item === 'string') as string[] | undefined;
        if (forbiddenApis && forbiddenApis.length) {
          feedbackLines.push('Diese APIs sind verboten. Entferne sie und nutze stattdessen reine Input-basierte Logik:');
          feedbackLines.push(...forbiddenApis.map((api, index) => `  ${index + 1}. ${api}`));
        }

        const details = context['details'];
        if (typeof details === 'string' && details) {
          feedbackLines.push(`Hinweis: ${details}`);
        }

        const hint = context['hint'];
        if (typeof hint === 'string' && hint) {
          feedbackLines.push(`Zusätzlicher Hinweis: ${hint}`);
        }
      }

      if (feedback.previousCode) {
        feedbackLines.push('Vorheriger fehlerhafter Code (nur zur Analyse, bitte komplett neu schreiben):');
        feedbackLines.push(feedback.previousCode);
      }

      if (feedback.runSnippet) {
        feedbackLines.push('Ausschnitt der bisherigen `run`-Funktion (unvollständig):');
        feedbackLines.push(feedback.runSnippet);
        feedbackLines.push('Stelle sicher, dass diese Funktion am Ende mit einem `return`-Statement antwortet.');
      }

      parts.push(feedbackLines.join('\n'));
    }
    return parts.join('\n\n');
  }

  private isRecoverableValidationError(error: unknown): error is AppError {
    return error instanceof AppError && error.statusCode === 422;
  }

  private extractCandidateCodeForFeedback(candidate: any): string | undefined {
    if (!candidate) {
      return undefined;
    }

    if (typeof candidate === 'string') {
      const parsed = this.safeParseJson(candidate);
      if (parsed && typeof parsed === 'object') {
        return this.extractCandidateCodeForFeedback(parsed);
      }
      return candidate;
    }

    if (typeof candidate === 'object') {
      const payload = candidate as Record<string, unknown>;
      const codeRaw = typeof payload.code === 'string'
        ? (payload.code as string)
        : typeof payload.script === 'string'
          ? (payload.script as string)
          : undefined;

      if (typeof codeRaw === 'string') {
        return this.extractCodeBlock(codeRaw);
      }

      const artifacts = this.normalizeArtifacts(payload.artifacts);
      if (artifacts && artifacts.length) {
        return artifacts.map((artifact) => artifact.code).join('\n\n');
      }
    }

    return undefined;
  }

  private extractRunFunctionSnippet(code: string, entrypoint: string): string | undefined {
    if (!code) {
      return undefined;
    }

    const patterns = [
      new RegExp(`async\s+function\s+${entrypoint}\s*\([^)]*\)\s*{`, 'm'),
      new RegExp(`function\s+${entrypoint}\s*\([^)]*\)\s*{`, 'm'),
      new RegExp(`const\s+${entrypoint}\s*=\s*async\s*\([^)]*\)\s*=>\s*{`, 'm'),
      new RegExp(`let\s+${entrypoint}\s*=\s*async\s*\([^)]*\)\s*=>\s*{`, 'm'),
      new RegExp(`var\s+${entrypoint}\s*=\s*async\s*\([^)]*\)\s*=>\s*{`, 'm'),
      new RegExp(`exports\.${entrypoint}\s*=\s*async\s*\([^)]*\)\s*=>\s*{`, 'm'),
      new RegExp(`exports\.${entrypoint}\s*=\s*async\s*\([^)]*\)\s*{`, 'm')
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(code);
      if (match) {
        const startIndex = match.index;
        const braceIndex = code.indexOf('{', startIndex);
        if (braceIndex === -1) {
          continue;
        }

        const endIndex = this.findMatchingBrace(code, braceIndex);
        const sliceEnd = endIndex !== -1 ? endIndex + 1 : Math.min(code.length, braceIndex + 1200);
        const snippet = code.slice(startIndex, sliceEnd).trim();
        if (snippet) {
          return this.truncateText(snippet, 1200);
        }
      }
    }

    return this.truncateText(code.trim(), 1200);
  }

  private extractRunFunctionBody(code: string, entrypoint: string): string | undefined {
    if (typeof code !== 'string') {
      return undefined;
    }

    const patterns: RegExp[] = [
      new RegExp(`async\\s+function\\s+${entrypoint}\\s*\\([^)]*\\)\\s*{([\\s\\S]*?)}`),
      new RegExp(`${entrypoint}\\s*=\\s*async\\s*\\([^)]*\\)\\s*=>\\s*{([\\s\\S]*?)}`),
      new RegExp(`exports\\.${entrypoint}\\s*=\\s*async\\s*\\([^)]*\\)\\s*=>\\s*{([\\s\\S]*?)}`),
      new RegExp(`module\\.exports\\s*=\\s*async\\s*function\\s+${entrypoint}\\s*\\([^)]*\\)\\s*{([\\s\\S]*?)}`),
      new RegExp(`module\\.exports\\s*=\\s*{[\\s\\S]*?${entrypoint}\\s*:\\s*async\\s*\\([^)]*\\)\\s*=>\\s*{([\\s\\S]*?)}[\\s\\S]*?}`)
    ];

    for (const pattern of patterns) {
      const match = code.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  private findMatchingBrace(source: string, openIndex: number): number {
    let depth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inTemplate = false;
    let escaped = false;

    for (let i = openIndex; i < source.length; i++) {
      const char = source[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '`' && !inSingleQuote && !inDoubleQuote) {
        inTemplate = !inTemplate;
        continue;
      }

      if (inTemplate) {
        continue;
      }

      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        continue;
      }

      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }

      if (inSingleQuote || inDoubleQuote) {
        continue;
      }

      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }

    return -1;
  }

  private serializeInputSchemaForPrompt(schema?: ToolScriptInputSchema): string | undefined {
    if (!schema) {
      return undefined;
    }

    const lines: string[] = [];

    if (schema.description) {
      lines.push(`Beschreibung: ${schema.description}`);
    }

    lines.push('Eigenschaften:');

    for (const [key, value] of Object.entries(schema.properties)) {
      const description = value.description ? ` – ${value.description}` : '';
      const example = value.example !== undefined ? ` (Beispiel: ${this.stringifyExample(value.example)})` : '';
      lines.push(`- ${key}: ${value.type}${description}${example}`);
    }

    if (schema.required && schema.required.length) {
      lines.push(`Erforderlich: ${schema.required.join(', ')}`);
    } else {
      lines.push('Erforderlich: keine');
    }

    return lines.join('\n');
  }

  private stringifyExample(value: unknown): string {
    try {
      const serialized = JSON.stringify(value);
      return serialized.length > 80 ? `${serialized.slice(0, 77)}...` : serialized;
    } catch (_error) {
      return String(value);
    }
  }

  private formatConstraintsForPrompt(constraints: NormalizedToolScriptConstraints): string {
    return [
      `- Deterministisch: ${constraints.deterministic ? 'Ja' : 'Nein'}`,
      `- Netzwerkzugriff erlaubt: ${constraints.allowNetwork ? 'Ja' : 'Nein'}`,
      `- Dateisystemzugriff erlaubt: ${constraints.allowFilesystem ? 'Ja' : 'Nein'}`,
      `- Maximale Laufzeit (ms): ${constraints.maxRuntimeMs}`
    ].join('\n');
  }

  private normalizeScriptCandidate(candidate: any, input: NormalizedGenerateScriptInput): ToolScriptDescriptor {
    const payload = typeof candidate === 'string' ? this.safeParseJson(candidate) : candidate;

    if (!payload || typeof payload !== 'object') {
      this.raiseValidationError('Antwort konnte nicht als JSON interpretiert werden', 'invalid_llm_payload');
    }

    const artifacts = this.normalizeArtifacts((payload as any).artifacts);
    const codeRaw = typeof (payload as any).code === 'string' ? (payload as any).code : (payload as any).script;
    let code = typeof codeRaw === 'string' ? this.extractCodeBlock(codeRaw) : undefined;

    if (!code && artifacts?.length) {
      code = artifacts.map((artifact) => artifact.code).join('\n\n');
    }

    if (!code) {
      this.raiseValidationError('Antwort enthält keinen Code', 'missing_code');
    }

    this.assertValidSource(code);

    const description = typeof (payload as any).description === 'string' && (payload as any).description.trim()
      ? (payload as any).description.trim().slice(0, 280)
      : input.instructions.slice(0, 280);

    const entrypointRaw = typeof (payload as any).entrypoint === 'string' && (payload as any).entrypoint.trim()
      ? (payload as any).entrypoint.trim()
      : 'run';
    const entrypoint = entrypointRaw === 'run' ? 'run' : 'run';

    const dependencies = this.sanitizeDependencies((payload as any).dependencies);
    const candidateWarnings = this.ensureNotesLimit((payload as any).warnings);
    let notes = this.ensureNotesLimit((payload as any).notes);

    if (artifacts && artifacts.length) {
      notes = this.ensureNotesLimit([
        ...notes,
        `Skript wurde aus ${artifacts.length} Artefakt(en) zusammengesetzt.`
      ]);
    }

    const returnWrapper = this.ensureRunReturnWrapper(code, entrypoint);
    if (returnWrapper.wrapped) {
      code = returnWrapper.code;
      notes = this.ensureNotesLimit([
        ...notes,
        'Automatischer Wrapper ergänzt, damit run stets einen Rückgabewert liefert.'
      ]);
    }

    const validation = this.validateGeneratedScript(code, input.constraints, entrypoint);

    if (returnWrapper.wrapped) {
      validation.warnings.push('Return-Wrapper wurde automatisch ergänzt. Bitte ursprünglichen Code prüfen.');
    }

    validation.warnings = Array.from(new Set([...validation.warnings, ...candidateWarnings]));

    if (validation.forbiddenApis.length > 0) {
      const forbiddenNote = validation.forbiddenApis.length === 1
        ? `Skript verwendet potenziell unsichere API: ${validation.forbiddenApis[0]}.`
        : `Skript verwendet potenziell unsichere APIs: ${validation.forbiddenApis.join(', ')}.`;
      notes = this.ensureNotesLimit([...notes, forbiddenNote]);
    }

    return {
      code,
      language: 'javascript',
      entrypoint,
      description,
      runtime: 'node18',
      deterministic: validation.deterministic,
      dependencies,
      source: this.buildSourceInfo(code),
      validation,
      notes,
      ...(artifacts && artifacts.length ? { artifacts } : {})
    };
  }

  private normalizeArtifacts(raw: unknown): ToolScriptArtifact[] | undefined {
    if (!Array.isArray(raw) || raw.length === 0) {
      return undefined;
    }

    const artifacts: ToolScriptArtifact[] = [];
    const usedIds = new Set<string>();

    raw.forEach((item, index) => {
      if (item === null || item === undefined) {
        return;
      }

      const candidate = typeof item === 'string'
        ? { code: item }
        : typeof item === 'object'
          ? (item as Record<string, unknown>)
          : null;

      if (!candidate) {
        return;
      }

      const codeField = typeof candidate.code === 'string'
        ? candidate.code
        : typeof item === 'string'
          ? item
          : undefined;

      if (typeof codeField !== 'string' || !codeField.trim()) {
        return;
      }

      const code = this.extractCodeBlock(codeField);
      if (!code.trim()) {
        return;
      }

      const baseId = typeof candidate.id === 'string' && candidate.id.trim()
        ? candidate.id.trim()
        : `artifact-${index + 1}`;

      let normalizedId = baseId;
      let suffix = 1;
      while (usedIds.has(normalizedId)) {
        normalizedId = `${baseId}-${suffix++}`;
      }
      usedIds.add(normalizedId);

      const order =
        typeof candidate.order === 'number' && Number.isFinite(candidate.order)
          ? Math.trunc(candidate.order)
          : index + 1;

      const title = typeof candidate.title === 'string' && candidate.title.trim()
        ? candidate.title.trim().slice(0, 160)
        : undefined;

      const description = typeof candidate.description === 'string' && candidate.description.trim()
        ? candidate.description.trim().slice(0, 240)
        : undefined;

      const artifact: ToolScriptArtifact = {
        id: normalizedId,
        order,
        code
      };

      if (title) {
        artifact.title = title;
      }

      if (description) {
        artifact.description = description;
      }

      artifacts.push(artifact);
    });

    if (!artifacts.length) {
      return undefined;
    }

    return artifacts.sort((a, b) => a.order - b.order);
  }

  private extractCodeBlock(raw: string): string {
    const trimmed = raw.trim();

    const fencedMatch = trimmed.match(/^```(?:javascript|js)?\s*([\s\S]*?)```$/i);
    if (fencedMatch) {
      return fencedMatch[1].trim();
    }

    return trimmed;
  }

  private validateGeneratedScript(
    code: string,
    constraints: NormalizedToolScriptConstraints,
    entrypoint: string
  ): ToolScriptValidationReport {
    const validation: ToolScriptValidationReport = {
      syntaxValid: false,
      deterministic: true,
      forbiddenApis: [],
      warnings: []
    };

    if (!code || typeof code !== 'string' || !code.trim()) {
      this.raiseValidationError('Generierter Code ist leer', 'empty_code');
    }

    try {
      new Script(code, { filename: 'tool-script.js' });
      validation.syntaxValid = true;
    } catch (error: any) {
      this.raiseValidationError(
        'Generierter Code ist syntaktisch ungültig',
        'invalid_syntax',
        { details: error?.message || String(error) }
      );
    }

    const exportRegex = new RegExp(`module\\.exports\\s*=\\s*{[^}]*${entrypoint}`);
    const exportFallback = new RegExp(`exports\\.${entrypoint}\\s*=`);
    const directExport = new RegExp(`module\\.exports\\s*=\\s*${entrypoint}`);

    if (!exportRegex.test(code) && !exportFallback.test(code) && !directExport.test(code)) {
      this.raiseValidationError('Der Code exportiert keine Funktion run', 'missing_entrypoint');
    }

    const functionRegex = new RegExp(`async\\s+function\\s+${entrypoint}\\s*\\(`);
    const constRegex = new RegExp(`const\\s+${entrypoint}\\s*=\\s*async\\s*\\(`);
    const letRegex = new RegExp(`let\\s+${entrypoint}\\s*=\\s*async\\s*\\(`);
    const varRegex = new RegExp(`var\\s+${entrypoint}\\s*=\\s*async\\s*\\(`);
    const exportAsyncRegex = new RegExp(`exports\\.${entrypoint}\\s*=\\s*async\\s*\\(`);
    const moduleAsyncRegex = new RegExp(`module\\.exports\\s*=\\s*async\\s*\\(`);

    if (
      !functionRegex.test(code)
      && !constRegex.test(code)
      && !letRegex.test(code)
      && !varRegex.test(code)
      && !exportAsyncRegex.test(code)
      && !moduleAsyncRegex.test(code)
    ) {
      this.raiseValidationError('run muss als async Funktion definiert sein', 'missing_async_run');
    }

    const inputSignatureRegexes = [
      new RegExp(`async\\s+function\\s+${entrypoint}\\s*\\(\\s*input`),
      new RegExp(`const\\s+${entrypoint}\\s*=\\s*async\\s*\\(\\s*input`),
      new RegExp(`let\\s+${entrypoint}\\s*=\\s*async\\s*\\(\\s*input`),
      new RegExp(`var\\s+${entrypoint}\\s*=\\s*async\\s*\\(\\s*input`),
      new RegExp(`exports\\.${entrypoint}\\s*=\\s*async\\s*\\(\\s*input`),
      new RegExp(`module\\.exports\\s*=\\s*async\\s*\\(\\s*input`)
    ];

    const hasInputParameter = inputSignatureRegexes.some((regex) => regex.test(code));
    if (!hasInputParameter) {
      this.raiseValidationError('Die Funktion run muss den Parameter `input` verwenden.', 'missing_input_parameter');
    }

    const runBody = this.extractRunFunctionBody(code, entrypoint);
    const hasReturnWrapper = this.hasReturnWrapperMarker(code);
    const runReturnsValue = typeof runBody === 'string'
      ? new RegExp(String.raw`\breturn\b`).test(runBody)
      : false;

    if (!runReturnsValue && !hasReturnWrapper) {
      this.raiseValidationError('Die Funktion run muss eine Antwort mit `return` liefern.', 'missing_return_statement');
    }

    if (runBody && !new RegExp(String.raw`\binput\b`).test(runBody)) {
      validation.warnings.push('Die Funktion run nutzt den Eingabe-Parameter `input` nicht.');
    }

    const deterministicViolations: string[] = [];
    if (constraints.deterministic) {
      const deterministicChecks: Array<{ pattern: RegExp; label: string }> = [
        { pattern: /Math\.random\s*\(/g, label: 'Math.random()' },
        { pattern: /crypto\.randomUUID\s*\(/gi, label: 'crypto.randomUUID()' },
        { pattern: /crypto\.randomBytes\s*\(/gi, label: 'crypto.randomBytes()' },
        { pattern: /Date\.now\s*\(/g, label: 'Date.now()' },
        { pattern: /new\s+Date\s*\(\s*\)/g, label: 'new Date() ohne Argumente' },
        { pattern: /setTimeout\s*\(/g, label: 'setTimeout()' },
        { pattern: /setInterval\s*\(/g, label: 'setInterval()' }
      ];

      for (const check of deterministicChecks) {
        if (check.pattern.test(code)) {
          deterministicViolations.push(check.label);
        }
      }

      if (deterministicViolations.length > 0) {
        this.raiseValidationError(
          'Der Code verletzt die deterministischen Vorgaben',
          'non_deterministic_code',
          { violations: deterministicViolations }
        );
      }
    }

    const forbiddenModules: Array<{ pattern: RegExp; label: string; gatedBy?: 'filesystem' | 'network' }> = [
      { pattern: /require\(['"]child_process['"]\)/g, label: 'child_process' },
      { pattern: /require\(['"]worker_threads['"]\)/g, label: 'worker_threads' },
      { pattern: /require\(['"]cluster['"]\)/g, label: 'cluster' },
      { pattern: /require\(['"]fs['"]\)/g, label: 'fs', gatedBy: 'filesystem' },
      { pattern: /require\(['"]fs\/promises['"]\)/g, label: 'fs/promises', gatedBy: 'filesystem' },
      { pattern: /require\(['"]http['"]\)/g, label: 'http', gatedBy: 'network' },
      { pattern: /require\(['"]https['"]\)/g, label: 'https', gatedBy: 'network' },
      { pattern: /require\(['"]net['"]\)/g, label: 'net', gatedBy: 'network' },
      { pattern: /require\(['"]dns['"]\)/g, label: 'dns', gatedBy: 'network' }
    ];

    for (const check of forbiddenModules) {
      if (!constraints.allowFilesystem && check.gatedBy === 'filesystem') {
        if (check.pattern.test(code)) {
          validation.forbiddenApis.push(check.label);
        }
      } else if (!constraints.allowNetwork && check.gatedBy === 'network') {
        if (check.pattern.test(code)) {
          validation.forbiddenApis.push(check.label);
        }
      } else if (!check.gatedBy && check.pattern.test(code)) {
        validation.forbiddenApis.push(check.label);
      }
    }

    const forbiddenGlobals: Array<{ pattern: RegExp; label: string }> = [
      { pattern: /process\.exit\s*\(/g, label: 'process.exit()' },
      { pattern: /process\.kill\s*\(/g, label: 'process.kill()' },
      { pattern: /process\.argv/gi, label: 'process.argv' },
      { pattern: /process\.stdin/gi, label: 'process.stdin' },
      { pattern: /process\.stdout/gi, label: 'process.stdout' }
    ];

    for (const check of forbiddenGlobals) {
      if (check.pattern.test(code)) {
        validation.forbiddenApis.push(check.label);
      }
    }

    if (validation.forbiddenApis.length > 0) {
      const uniqueForbidden = Array.from(new Set(validation.forbiddenApis));
      validation.forbiddenApis = uniqueForbidden;
      validation.warnings.push(
        uniqueForbidden.length === 1
          ? `Skript verwendet potenziell unsichere API: ${uniqueForbidden[0]}`
          : `Skript verwendet potenziell unsichere APIs: ${uniqueForbidden.join(', ')}`
      );
    }

    validation.deterministic = constraints.deterministic;

    const warningPatterns: Array<{ pattern: RegExp; message: string }> = [
      {
        pattern: /console\.(log|warn|error|info)\s*\(/g,
        message: 'Skript verwendet console.* – gib Ergebnisse per `return` zurück und reduziere Logging.'
      }
    ];

    for (const warning of warningPatterns) {
      if (warning.pattern.test(code)) {
        validation.warnings.push(warning.message);
      }
    }

    validation.warnings = Array.from(new Set(validation.warnings));

    return validation;
  }
  private runFunctionHasReturn(code: string, entrypoint: string): boolean {
    const body = this.extractRunFunctionBody(code, entrypoint);
    return typeof body === 'string' ? new RegExp(String.raw`\breturn\b`).test(body) : false;
  }

  private hasReturnWrapperMarker(code: string): boolean {
    return typeof code === 'string' && code.includes(AUTO_RETURN_WRAPPER_MARKER);
  }

  private ensureRunReturnWrapper(
    code: string,
    entrypoint: string
  ): { code: string; wrapped: boolean; wrapperSnippet?: string } {
    if (!code || !code.trim()) {
      return { code, wrapped: false };
    }

    if (this.runFunctionHasReturn(code, entrypoint) || this.hasReturnWrapperMarker(code)) {
      return { code, wrapped: false };
    }

    const wrapperLines = [
      `// ${AUTO_RETURN_WRAPPER_MARKER}`,
      "if (typeof module !== 'undefined' && module.exports) {",
      '  const __exports = module.exports;',
      '  let __originalRun = null;',
      "  if (typeof __exports === 'function') {",
      '    __originalRun = __exports;',
      `  } else if (__exports && typeof __exports.${entrypoint} === 'function') {`,
      `    __originalRun = __exports.${entrypoint};`,
      '  }',
      "  if (!__originalRun && typeof exports !== 'undefined' && exports && typeof exports === 'object') {",
      `    if (typeof exports.${entrypoint} === 'function') {`,
      `      __originalRun = exports.${entrypoint};`,
      '    }',
      '  }',
      `  if (!__originalRun && typeof ${entrypoint} === 'function') {`,
      `    __originalRun = ${entrypoint};`,
      '  }',
      "  if (typeof __originalRun === 'function') {",
      `    const __wrapRun = async function ${entrypoint}(input) {`,
      '      const __result = await __originalRun(input);',
      "      return __result === undefined ? '' : __result;",
      '    };',
      "    if (typeof __exports === 'function') {",
      '      module.exports = __wrapRun;',
      "    } else if (__exports && typeof __exports === 'object') {",
      `      module.exports.${entrypoint} = __wrapRun;`,
      '    } else {',
      `      module.exports = { ${entrypoint}: __wrapRun };`,
      '    }',
      "    if (typeof exports !== 'undefined' && exports) {",
      `      exports.${entrypoint} = typeof module.exports === 'function' ? module.exports : module.exports.${entrypoint};`,
      '    }',
      '  }',
      '}'
    ];

    const wrapperSnippet = wrapperLines.join('\n');
    const augmentedCode = `${code}\n\n${wrapperSnippet}\n`;

    return {
      code: augmentedCode,
      wrapped: true,
      wrapperSnippet
    };
  }

  private isRateLimitError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const candidate = error as Record<string, unknown>;
    const context = candidate.context as Record<string, unknown> | undefined;
    const codeCandidate = (context?.code || candidate.code);
    if (typeof codeCandidate === 'string' && codeCandidate.toUpperCase() === 'RATE_LIMITED') {
      return true;
    }

    const statusCandidate = candidate.statusCode ?? candidate.status ?? (candidate.response as any)?.status;
    if (statusCandidate === 429) {
      return true;
    }

    const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : '';
    if (!message) {
      return false;
    }

    return message.includes('rate limit') || message.includes('too many requests') || message.includes('quota');
  }

  private getRateLimitBackoffDelay(rateAttempt: number): number {
    const index = Math.min(rateAttempt, LLM_RATE_LIMIT_BACKOFF_STEPS_MS.length - 1);
    return LLM_RATE_LIMIT_BACKOFF_STEPS_MS[index];
  }

  private async delay(ms: number): Promise<void> {
    if (!Number.isFinite(ms) || ms <= 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private appendJobWarning(job: GenerateScriptJobRecord, warning: string): void {
    if (!warning || typeof warning !== 'string') {
      return;
    }

    const normalized = warning.trim();
    if (!normalized) {
      return;
    }

    if (!Array.isArray(job.warnings)) {
      job.warnings = [];
    }

    if (job.warnings.includes(normalized)) {
      return;
    }

    job.warnings.push(normalized);
    if (job.warnings.length > MAX_JOB_WARNINGS) {
      job.warnings = job.warnings.slice(job.warnings.length - MAX_JOB_WARNINGS);
    }

    job.updatedAt = new Date().toISOString();
  }

  private computeRepairChainDepth(job: GenerateScriptJobRecord): number {
    let depth = 1;
    let current: GenerateScriptJobRecord | undefined = job;
    const visited = new Set<string>([job.id]);

    while (current?.continuedFromJobId) {
      if (visited.has(current.continuedFromJobId)) {
        break;
      }

      const parentRecord = this.jobs.get(current.continuedFromJobId);
      if (!parentRecord || parentRecord.type !== 'generate-script') {
        break;
      }

      visited.add(parentRecord.id);
      depth += 1;
      current = parentRecord;
    }

    return depth;
  }

  private composeRepairInstructions(
    baseInstructions: string,
    job: GenerateScriptJobRecord,
    repairInstructions?: string
  ): string {
    const hints: string[] = [];
    const automaticHint = this.buildAutomaticRepairHint(job);

    if (automaticHint) {
      hints.push(automaticHint);
    }

    if (repairInstructions) {
      hints.push(repairInstructions);
    }

    if (!hints.length) {
      return baseInstructions;
    }

    const hintLines = hints.map((hint, index) => `${index + 1}. ${hint}`);
    const merged = `${baseInstructions.trim()}

---
Korrekturhinweise:
${hintLines.join('\n')}`;

    return merged.length > MAX_INSTRUCTIONS_LENGTH ? this.truncateText(merged, MAX_INSTRUCTIONS_LENGTH) : merged;
  }

  private composeRepairAdditionalContext(
    baseContext?: string,
    repairContext?: string
  ): string | undefined {
    const parts: string[] = [];

    if (typeof baseContext === 'string' && baseContext.trim()) {
      parts.push(baseContext.trim());
    }

    if (typeof repairContext === 'string' && repairContext.trim()) {
      parts.push(`Reparaturhinweis:\n${repairContext.trim()}`);
    }

    if (!parts.length) {
      return undefined;
    }

    const merged = parts.join('\n\n');
    return merged.length > MAX_CONTEXT_LENGTH ? this.truncateText(merged, MAX_CONTEXT_LENGTH) : merged;
  }

  private mergeRepairAttachments(
    base: NormalizedToolScriptAttachment[],
    overrides?: ToolScriptAttachment[]
  ): ToolScriptAttachment[] {
    const merged: ToolScriptAttachment[] = [];
    const seen = new Set<string>();

    const add = (candidate?: NormalizedToolScriptAttachment | ToolScriptAttachment | null) => {
      if (!candidate) {
        return;
      }

      const normalized = this.normalizeAttachmentForRepair(candidate);
      if (!normalized.filename || !normalized.content) {
        return;
      }

      const key = this.buildAttachmentDedupKey(normalized.filename, normalized.content);
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      merged.push(normalized);
    };

    base.forEach((attachment) => add(attachment));

    if (Array.isArray(overrides)) {
      overrides.forEach((attachment) => {
        if (attachment && typeof attachment === 'object') {
          add(attachment);
        }
      });
    }

    return merged;
  }

  private mergeRepairReferences(
    base: NormalizedToolScriptReference[],
    overrides?: ToolScriptReference[]
  ): ToolScriptReference[] {
    const merged: ToolScriptReference[] = [];
    const seen = new Set<string>();

    const addNormalized = (reference: NormalizedToolScriptReference) => {
      if (!reference?.snippet) {
        return;
      }

      const snippet = reference.snippet.trim();
      if (!snippet) {
        return;
      }

      const key = this.buildReferenceDedupKey(snippet);
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      merged.push({
        id: reference.id,
        title: reference.title,
        snippet,
        weight: reference.weight,
        useForPrompt: reference.useForPrompt
      });
    };

    const addRaw = (reference: ToolScriptReference) => {
      if (!reference || typeof reference !== 'object') {
        return;
      }

      const snippetRaw = typeof reference.snippet === 'string' ? reference.snippet.trim() : '';
      if (!snippetRaw) {
        return;
      }

      const key = this.buildReferenceDedupKey(snippetRaw);
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      merged.push({
        id: reference.id,
        title: reference.title,
        snippet: snippetRaw,
        weight: reference.weight,
        useForPrompt: reference.useForPrompt
      });
    };

    base.forEach(addNormalized);

    if (Array.isArray(overrides)) {
      overrides.forEach((reference) => addRaw(reference));
    }

    return merged;
  }

  private normalizeAttachmentForRepair(
    attachment: NormalizedToolScriptAttachment | ToolScriptAttachment
  ): ToolScriptAttachment {
    const normalized: ToolScriptAttachment = {
      filename: attachment.filename,
      content: attachment.content,
      ...(attachment.description ? { description: attachment.description } : {}),
      ...(attachment.mimeType ? { mimeType: attachment.mimeType } : {})
    };

    if (attachment.id) {
      normalized.id = attachment.id;
    }

    if (typeof (attachment as any).weight === 'number' && Number.isFinite((attachment as any).weight)) {
      normalized.weight = (attachment as any).weight as number;
    }

    return normalized;
  }

  private buildAttachmentDedupKey(filename: string, content: string): string {
    const normalizedName = (filename ?? '').trim().toLowerCase();
    const hash = createHash('sha256').update(content || '', 'utf8').digest('hex');
    return `${normalizedName}::${hash}`;
  }

  private buildReferenceDedupKey(snippet: string): string {
    return createHash('sha256').update(snippet, 'utf8').digest('hex');
  }

  private buildAutomaticRepairHint(job: GenerateScriptJobRecord): string | undefined {
    const parts: string[] = [];

    if (job.error?.message) {
      parts.push(`Vorheriger Versuch scheiterte mit: ${job.error.message}.`);
    }

    const code = job.error?.code;
    const messageType = job.normalizedInput?.primaryMessageType;

    switch (code) {
      case 'missing_code':
        parts.push(
          'Gib zwingend ein JSON-Objekt mit dem Feld "code" zurück. Dieses Feld muss den vollständigen CommonJS-Quelltext mit `async function run(input)` und `module.exports = { run };` enthalten. '
          + 'Vermeide Markdown, Kommentare oder verkürzte Platzhalter.'
        );
        if (messageType) {
          parts.push(
            `Nutze die bereitgestellten ${messageType}-Segmente (z. B. UNH/BGM/DTM/QTY) aus den Attachments und bilde deren Struktur vollständig im Parser ab.`
          );
        }
        break;
      case 'invalid_llm_payload':
        parts.push('Stelle sicher, dass die Antwort gültiges JSON im vereinbarten Schema ist – keine Markdown-Hülle, keine losen Strings.');
        break;
      case 'invalid_artifacts':
        parts.push('Wenn du `artifacts` nutzt, fülle jedes Objekt mit { id, order, code } und optional title/description.');
        break;
      case 'script_generation_failed':
        parts.push('Erzeuge ein lauffähiges Node.js-Tool und beachte alle deterministischen Vorgaben.');
        if (messageType) {
          parts.push(`Stelle sicher, dass die ${messageType}-Kernsegmente (z. B. PIA, QTY, DTM) korrekt interpretiert werden.`);
        }
        break;
      default:
        break;
    }

    if (!parts.length) {
      return undefined;
    }

    return parts.join(' ');
  }

  private buildRepairWarnings(job: GenerateScriptJobRecord): string[] {
    const warnings: string[] = [];
    const codeFragment = job.error?.code ? ` (${job.error.code})` : '';
    warnings.push(`Fortsetzung von Job ${job.id}${codeFragment}`);

    if (job.error?.message) {
      warnings.push(`Letzter Fehler: ${this.truncateText(job.error.message, 160)}`);
    }

    return warnings.slice(-MAX_JOB_WARNINGS);
  }

  private resolveEdifactMessageHints(params: {
    instructions: string;
    additionalContext?: string;
    expectedOutputDescription?: string;
    attachments: NormalizedToolScriptAttachment[];
    referenceDocuments: NormalizedToolScriptReference[];
  }): { detectedTypes: string[]; primaryType?: string } {
    const scores = new Map<string, number>();

    this.addMessageTypeEvidence(scores, params.instructions, 4);
    this.addMessageTypeEvidence(scores, params.additionalContext, 3);
    this.addMessageTypeEvidence(scores, params.expectedOutputDescription, 2);

    for (const attachment of params.attachments) {
      if (!attachment || !attachment.content) {
        continue;
      }

      this.addMessageTypeEvidence(scores, attachment.filename, 2);
      this.addMessageTypeEvidence(scores, attachment.description, 2);

      const sample = attachment.content.slice(0, ATTACHMENT_MESSAGE_HINT_SCAN_LENGTH);
      this.addMessageTypeEvidence(scores, sample, 6);
    }

    for (const reference of params.referenceDocuments) {
      this.addMessageTypeEvidence(scores, reference.title, 1.5);
      this.addMessageTypeEvidence(scores, reference.snippet, 1.5);
    }

    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type)
      .slice(0, MESSAGE_TYPE_MAX_RESULTS);

    const primaryCandidate = sorted.length ? sorted[0] : undefined;
    const primaryScore = primaryCandidate ? scores.get(primaryCandidate) ?? 0 : 0;
    const primaryType = primaryScore >= MESSAGE_TYPE_PRIMARY_THRESHOLD ? primaryCandidate : undefined;

    return {
      detectedTypes: sorted,
      primaryType
    };
  }

  private addMessageTypeEvidence(scores: Map<string, number>, text: string | undefined, weight: number): void {
    if (!text || typeof text !== 'string') {
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const upper = trimmed.toUpperCase();

    for (const type of EDIFACT_MESSAGE_TYPES) {
      if (upper.includes(type)) {
        scores.set(type, (scores.get(type) ?? 0) + weight);
      }
    }

    for (const [pattern, type] of Object.entries(EDIFACT_BGM_HINTS)) {
      if (upper.includes(pattern)) {
        scores.set(type, (scores.get(type) ?? 0) + weight + 0.5);
      }
    }
  }

  private collectMessageTypesFromText(text: string | undefined): string[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const upper = text.toUpperCase();
    const matches: string[] = [];

    for (const type of EDIFACT_MESSAGE_TYPES) {
      if (upper.includes(type)) {
        matches.push(type);
      }
    }

    for (const [pattern, mappedType] of Object.entries(EDIFACT_BGM_HINTS)) {
      if (upper.includes(pattern) && !matches.includes(mappedType)) {
        matches.push(mappedType);
      }
    }

    return matches;
  }

  private collectMessageTypesFromPayload(payload: any): string[] {
    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const fields = ['message_format', 'messageType', 'document_type', 'source', 'summary_text', 'title'];
    const distinct = new Set<string>();

    for (const field of fields) {
      const value = (payload as Record<string, unknown>)[field];
      if (typeof value === 'string') {
        const matches = this.collectMessageTypesFromText(value);
        matches.forEach((match) => distinct.add(match));
      }
    }

    return Array.from(distinct);
  }

  private isPayloadMessageTypeMismatch(payload: any, expectedTypes: string[]): boolean {
    if (!expectedTypes.length) {
      return false;
    }

    const payloadTypes = this.collectMessageTypesFromPayload(payload);
    if (!payloadTypes.length) {
      return false;
    }

    const expectedSet = new Set(expectedTypes);
    const hasExpected = payloadTypes.some((type) => expectedSet.has(type));
    if (hasExpected) {
      return false;
    }

    return payloadTypes.some((type) => !expectedSet.has(type));
  }

  private isMessageTypeMismatch(snippet: string, expectedTypes: string[]): boolean {
    if (!expectedTypes.length) {
      return false;
    }

    const upper = snippet.toUpperCase();
    const expectedSet = new Set(expectedTypes);
    let mentionsForeign = false;

    for (const type of EDIFACT_MESSAGE_TYPES) {
      if (!upper.includes(type)) {
        continue;
      }

      if (!expectedSet.has(type)) {
        mentionsForeign = true;
        break;
      }
    }

    if (!mentionsForeign) {
      return false;
    }

    for (const type of expectedTypes) {
      if (upper.includes(type)) {
        return false;
      }
    }

    return true;
  }

  private sanitizeDependencies(dependencies: any): string[] {
    if (!Array.isArray(dependencies)) {
      return [];
    }

    const sanitized = dependencies
      .filter((dep) => typeof dep === 'string')
      .map((dep) => dep.trim())
      .filter(Boolean);

    return Array.from(new Set(sanitized)).slice(0, 10);
  }

  private sanitizeValidationContext(context: unknown): Record<string, unknown> | undefined {
    if (!context || typeof context !== 'object') {
      return undefined;
    }

    const result: Record<string, unknown> = {};
    const ctx = context as Record<string, unknown>;

    if (Array.isArray(ctx.violations)) {
      const violations = ctx.violations
        .filter((item) => typeof item === 'string')
        .map((item) => (item as string).trim())
        .filter((item) => item.length > 0)
        .slice(0, 6);

      if (violations.length) {
        result.violations = violations;
      }
    }

    if (Array.isArray(ctx.forbiddenApis)) {
      const forbiddenApis = ctx.forbiddenApis
        .filter((item) => typeof item === 'string')
        .map((item) => (item as string).trim())
        .filter((item) => item.length > 0)
        .slice(0, 6);

      if (forbiddenApis.length) {
        result.forbiddenApis = forbiddenApis;
      }
    }

    if (typeof ctx.details === 'string' && ctx.details.trim()) {
      result.details = ctx.details.trim().slice(0, 400);
    }

    if (typeof ctx.hint === 'string' && ctx.hint.trim()) {
      result.hint = ctx.hint.trim().slice(0, 200);
    }

    if (typeof ctx.code === 'string' && ctx.code.trim()) {
      result.code = ctx.code.trim().slice(0, 80);
    }

    return Object.keys(result).length ? result : undefined;
  }

  private ensureNotesLimit(notes: any): string[] {
    if (!Array.isArray(notes)) {
      return [];
    }

    const sanitized = notes
      .filter((note) => typeof note === 'string')
      .map((note) => note.trim())
      .filter(Boolean);

    return sanitized.slice(0, MAX_NOTES);
  }

  private safeParseJson(value: string): any {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return null;
    }
  }

  private raiseValidationError(message: string, code: string, context?: Record<string, unknown>): never {
    const error = new AppError(message, 422);
    (error as any).context = {
      code,
      ...(context || {})
    };
    throw error;
  }

  private assertValidSource(source: string): void {
    if (typeof source !== 'string' || !source.trim()) {
      throw new AppError('source darf nicht leer sein', 400);
    }
  }

  private sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | null {
    if (!metadata) {
      return null;
    }

    if (typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new AppError('metadata muss ein Objekt sein', 400);
    }

    try {
      return JSON.parse(JSON.stringify(metadata));
    } catch (_error) {
      throw new AppError('metadata enthält nicht serialisierbare Werte', 400);
    }
  }

  private normalizeTimeout(timeoutMs?: number): number {
    if (typeof timeoutMs !== 'number' || Number.isNaN(timeoutMs)) {
      return DEFAULT_TIMEOUT_MS;
    }

    return Math.min(Math.max(Math.trunc(timeoutMs), MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
  }

  private buildSourceInfo(source: string): ToolJobSourceInfo {
    const hash = createHash('sha256').update(source, 'utf8').digest('hex');
    const preview = source.replace(/\s+/g, ' ').trim().slice(0, SOURCE_PREVIEW_LENGTH);
    const lineCount = source.split(/\r?\n/).length;

    return {
      language: 'node',
      hash,
      bytes: Buffer.byteLength(source, 'utf8'),
      preview,
      lineCount
    };
  }

  private buildInitialResult(): ToolJobResult | null {
    return null;
  }

  private toPublicJob(record: ToolJobRecord): ToolJob {
    if (record.type === 'generate-script') {
      const { userId: _userId, normalizedInput: _normalizedInput, ...rest } = record;
      return rest;
    }

    const { userId: _userId, ...rest } = record;
    return rest;
  }
}

export const toolingService = new ToolingService();
