"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolingService = exports.ToolingService = void 0;
const crypto_1 = require("crypto");
const buffer_1 = require("buffer");
const node_vm_1 = require("node:vm");
const errorHandler_1 = require("../../middleware/errorHandler");
const llmProvider_1 = __importDefault(require("../llmProvider"));
const retrieval_service_1 = require("./retrieval.service");
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
const EDIFACT_BGM_HINTS = {
    'BGM+Z06': 'MSCONS',
    'BGM+Z08': 'UTILMD',
    'BGM+380': 'INVOIC'
};
const DEFAULT_INPUT_SCHEMA_TEMPLATE = {
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
class ToolingService {
    constructor() {
        this.jobs = new Map();
        this.generateScriptQueue = [];
        this.generateScriptWorkerActive = false;
    }
    async createNodeScriptJob(input) {
        this.assertValidSource(input.source);
        const sanitizedMetadata = this.sanitizeMetadata(input.metadata);
        const timeoutMs = this.normalizeTimeout(input.timeoutMs);
        const diagnostics = {
            executionEnabled: false,
            notes: [
                'Sandbox-Ausführung ist aktuell deaktiviert. Job wird vorgemerkt und muss manuell reviewed werden.'
            ]
        };
        const record = {
            id: (0, crypto_1.randomUUID)(),
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
    async getJobForUser(jobId, userId) {
        const record = this.jobs.get(jobId);
        if (!record || record.userId !== userId) {
            throw new errorHandler_1.AppError('Tool-Job wurde nicht gefunden', 404);
        }
        return this.toPublicJob(record);
    }
    async listJobsForSession(sessionId, userId) {
        const jobs = [];
        for (const record of this.jobs.values()) {
            if (record.sessionId === sessionId && record.userId === userId) {
                jobs.push(this.toPublicJob(record));
            }
        }
        return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    async enqueueGenerateScriptJob(input, options = {}) {
        var _a;
        const normalized = this.normalizeGenerateScriptInput(input);
        const now = new Date().toISOString();
        const initialWarnings = Array.isArray(options.initialWarnings)
            ? Array.from(new Set(options.initialWarnings
                .filter((warning) => typeof warning === 'string')
                .map((warning) => warning.trim())
                .filter(Boolean))).slice(-MAX_JOB_WARNINGS)
            : [];
        const record = {
            id: (0, crypto_1.randomUUID)(),
            type: 'generate-script',
            sessionId: normalized.sessionId,
            status: 'queued',
            createdAt: now,
            updatedAt: now,
            progress: {
                stage: 'queued',
                message: (_a = options.initialProgressMessage) !== null && _a !== void 0 ? _a : 'Job wurde eingereiht'
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
        return this.toPublicJob(record);
    }
    async resumeGenerateScriptJob(input) {
        if (!input || typeof input !== 'object') {
            throw new errorHandler_1.AppError('Ungültige Parameter für Reparaturanfrage', 400);
        }
        const jobId = typeof input.jobId === 'string' ? input.jobId.trim() : '';
        if (!jobId) {
            throw new errorHandler_1.AppError('jobId ist erforderlich', 400);
        }
        const record = this.jobs.get(jobId);
        if (!record || record.type !== 'generate-script' || record.userId !== input.userId) {
            throw new errorHandler_1.AppError('Tool-Job wurde nicht gefunden', 404);
        }
        if (record.sessionId !== input.sessionId) {
            throw new errorHandler_1.AppError('Session passt nicht zum Job', 400);
        }
        if (record.status !== 'failed') {
            throw new errorHandler_1.AppError('Nur fehlgeschlagene Skript-Jobs können fortgesetzt werden', 409);
        }
        const repairChainDepth = this.computeRepairChainDepth(record);
        if (repairChainDepth >= MAX_REPAIR_CHAIN_LENGTH) {
            const error = new errorHandler_1.AppError('Maximale Anzahl an Reparaturversuchen erreicht', 429);
            error.context = {
                code: 'repair_limit_reached',
                attempts: repairChainDepth
            };
            throw error;
        }
        const baseInput = record.normalizedInput;
        const sanitizedRepairInstructions = this.normalizeOptionalText(input.repairInstructions, 'repairInstructions', MAX_REPAIR_INSTRUCTIONS_LENGTH);
        const sanitizedRepairContext = this.normalizeOptionalText(input.additionalContext, 'additionalContext', MAX_CONTEXT_LENGTH);
        const mergedInstructions = this.composeRepairInstructions(baseInput.instructions, record, sanitizedRepairInstructions);
        const mergedAdditionalContext = this.composeRepairAdditionalContext(baseInput.additionalContext, sanitizedRepairContext);
        const mergedReferences = this.mergeRepairReferences(baseInput.referenceDocuments, input.referenceDocuments);
        const mergedAttachments = this.mergeRepairAttachments(baseInput.attachments, input.attachments);
        const mergedTestCases = Array.isArray(input.testCases) ? input.testCases : baseInput.testCases;
        const resumedJob = await this.enqueueGenerateScriptJob({
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
        }, {
            continuedFromJobId: record.id,
            initialProgressMessage: 'Reparaturversuch wird neu gestartet',
            initialWarnings: this.buildRepairWarnings(record)
        });
        this.appendJobWarning(record, `Folgeauftrag ${resumedJob.id} zur Reparatur wurde erstellt.`);
        return resumedJob;
    }
    async generateDeterministicScript(input) {
        const normalized = this.normalizeGenerateScriptInput(input);
        const nowIso = new Date().toISOString();
        const job = {
            id: (0, crypto_1.randomUUID)(),
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
    startGenerateScriptWorker() {
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
    async processGenerateScriptQueue() {
        while (this.generateScriptQueue.length > 0) {
            const job = this.generateScriptQueue.shift();
            if (!job) {
                continue;
            }
            try {
                await this.handleGenerateScriptJob(job);
            }
            catch (error) {
                console.error('Generate-script job failed:', error);
            }
        }
        this.generateScriptWorkerActive = false;
    }
    async handleGenerateScriptJob(job) {
        var _a, _b, _c;
        job.status = 'running';
        job.updatedAt = new Date().toISOString();
        try {
            const response = await this.executeGenerateScript(job);
            job.result = response;
            const warnings = new Set((_a = job.warnings) !== null && _a !== void 0 ? _a : []);
            const validationWarnings = (_b = response.script.validation.warnings) !== null && _b !== void 0 ? _b : [];
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
        }
        catch (error) {
            job.error = this.buildGenerateScriptError(error);
            job.status = 'failed';
            job.warnings = (_c = job.warnings) !== null && _c !== void 0 ? _c : [];
            this.updateGenerateJobProgress(job, 'completed', 'Skriptgenerierung fehlgeschlagen', job.attempts || undefined);
        }
        finally {
            job.updatedAt = new Date().toISOString();
            if (!job.result && job.status === 'failed' && !job.error) {
                job.error = { message: 'Skript konnte nicht generiert werden' };
            }
        }
    }
    async executeGenerateScript(job) {
        var _a, _b;
        const normalized = job.normalizedInput;
        this.updateGenerateJobProgress(job, 'collecting-context', 'Kontext wird gesammelt', job.attempts || undefined);
        const contextSnippets = await this.collectContextSnippets(normalized);
        let descriptor = null;
        let validationError = null;
        let lastCandidateCode;
        let lastRunSnippet;
        let attempts = 0;
        let rateLimitRecoveryAttempts = 0;
        for (attempts = 1; attempts <= MAX_GENERATION_ATTEMPTS; attempts++) {
            job.attempts = attempts;
            if (attempts === 1) {
                this.updateGenerateJobProgress(job, 'prompting', 'LLM wird aufgerufen', attempts);
            }
            else {
                this.updateGenerateJobProgress(job, 'repairing', 'Vorheriger Versuch schlug fehl – erneuter Prompt mit Feedback', attempts);
            }
            const validationContext = validationError === null || validationError === void 0 ? void 0 : validationError.context;
            const feedback = validationError
                ? {
                    attempt: attempts,
                    validationErrorMessage: validationError.message,
                    validationErrorCode: (validationContext === null || validationContext === void 0 ? void 0 : validationContext.code) || (validationError === null || validationError === void 0 ? void 0 : validationError.code),
                    validationContext: validationContext ? this.sanitizeValidationContext(validationContext) : undefined,
                    previousCode: lastCandidateCode ? this.truncateText(lastCandidateCode, 4000) : undefined,
                    runSnippet: lastRunSnippet
                }
                : undefined;
            const prompt = this.buildScriptPrompt(normalized, contextSnippets, feedback);
            let rawCandidate;
            let lastRateLimitError = null;
            for (let rateAttempt = 0; rateAttempt < LLM_RATE_LIMIT_RETRY_LIMIT; rateAttempt++) {
                try {
                    rawCandidate = await llmProvider_1.default.generateStructuredOutput(prompt, {
                        user_id: normalized.userId,
                        session_id: normalized.sessionId,
                        persona: 'tooling-script-generator',
                        attempt: attempts
                    });
                    lastRateLimitError = null;
                    break;
                }
                catch (error) {
                    if (this.isRateLimitError(error)) {
                        lastRateLimitError = error;
                        const backoffMs = this.getRateLimitBackoffDelay(rateAttempt);
                        const stageForRetry = attempts === 1 ? 'prompting' : 'repairing';
                        this.appendJobWarning(job, `LLM Rate-Limit erreicht – automatischer Retry in ${Math.ceil(backoffMs / 1000)}s.`);
                        this.updateGenerateJobProgress(job, stageForRetry, `LLM Rate-Limit – neuer Versuch in ${Math.ceil(backoffMs / 1000)}s`, attempts);
                        await this.delay(backoffMs);
                        continue;
                    }
                    const appError = new errorHandler_1.AppError('Skript konnte nicht generiert werden', 502);
                    appError.context = {
                        code: 'llm_generation_failed',
                        attempt: attempts,
                        details: (error === null || error === void 0 ? void 0 : error.message) || String(error || 'unbekannter Fehler')
                    };
                    throw appError;
                }
            }
            if (rawCandidate === undefined) {
                rateLimitRecoveryAttempts += 1;
                if (rateLimitRecoveryAttempts > MAX_RATE_LIMIT_RECOVERY_ATTEMPTS) {
                    const message = 'Rate-Limit erreicht. Bitte warte einen Moment und versuche es erneut.';
                    const appError = new errorHandler_1.AppError(message, 429);
                    appError.context = {
                        code: 'RATE_LIMITED',
                        attempt: attempts,
                        retryAfterMs: this.getRateLimitBackoffDelay(LLM_RATE_LIMIT_RETRY_LIMIT - 1),
                        details: (lastRateLimitError === null || lastRateLimitError === void 0 ? void 0 : lastRateLimitError.message) || undefined
                    };
                    throw appError;
                }
                const additionalDelay = this.getRateLimitBackoffDelay(LLM_RATE_LIMIT_RETRY_LIMIT - 1) + RATE_LIMIT_RECOVERY_DELAY_MS;
                const stageForRetry = attempts === 1 ? 'prompting' : 'repairing';
                this.appendJobWarning(job, `LLM Rate-Limit – zusätzlicher Wartezyklus ${rateLimitRecoveryAttempts}/${MAX_RATE_LIMIT_RECOVERY_ATTEMPTS}. Neuer Versuch in ${Math.ceil(additionalDelay / 1000)}s.`);
                this.updateGenerateJobProgress(job, stageForRetry, `LLM Rate-Limit – erneuter Versuch in ${Math.ceil(additionalDelay / 1000)}s`, attempts);
                await this.delay(additionalDelay);
                attempts -= 1;
                continue;
            }
            try {
                rateLimitRecoveryAttempts = 0;
                descriptor = this.normalizeScriptCandidate(rawCandidate, normalized);
                validationError = null;
                break;
            }
            catch (error) {
                if (this.isRecoverableValidationError(error)) {
                    validationError = error;
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
            const fallbackError = validationError !== null && validationError !== void 0 ? validationError : new errorHandler_1.AppError('Skript konnte nicht generiert werden', 502);
            if (!fallbackError.context) {
                fallbackError.context = {};
            }
            fallbackError.context = {
                ...fallbackError.context,
                code: (_b = (_a = fallbackError.context) === null || _a === void 0 ? void 0 : _a.code) !== null && _b !== void 0 ? _b : 'script_generation_failed',
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
        const response = {
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
    updateGenerateJobProgress(job, stage, message, attempt) {
        job.progress = {
            stage,
            ...(message ? { message } : {}),
            ...(attempt ? { attempt } : {})
        };
        job.updatedAt = new Date().toISOString();
    }
    buildGenerateScriptError(error) {
        if (error instanceof errorHandler_1.AppError) {
            const context = error.context;
            return {
                message: error.message,
                code: context === null || context === void 0 ? void 0 : context.code,
                details: context && typeof context === 'object' ? { ...context } : undefined
            };
        }
        if (error instanceof Error) {
            return { message: error.message };
        }
        return { message: String(error !== null && error !== void 0 ? error : 'Unbekannter Fehler') };
    }
    normalizeGenerateScriptInput(input) {
        if (!input || typeof input !== 'object') {
            this.raiseValidationError('Ungültige Parameter für Skriptgenerierung', 'invalid_payload');
        }
        if (!input.sessionId || typeof input.sessionId !== 'string' || !input.sessionId.trim()) {
            this.raiseValidationError('sessionId ist erforderlich', 'missing_session');
        }
        const instructions = this.normalizeRequiredText(input.instructions, 'instructions', MAX_INSTRUCTIONS_LENGTH);
        const additionalContext = this.normalizeOptionalText(input.additionalContext, 'additionalContext', MAX_CONTEXT_LENGTH);
        const expectedOutputDescription = this.normalizeOptionalText(input.expectedOutputDescription, 'expectedOutputDescription', MAX_EXPECTED_OUTPUT_LENGTH);
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
    normalizeConstraints(constraints) {
        const normalized = {
            deterministic: (constraints === null || constraints === void 0 ? void 0 : constraints.deterministic) !== false,
            allowNetwork: (constraints === null || constraints === void 0 ? void 0 : constraints.allowNetwork) === true,
            allowFilesystem: (constraints === null || constraints === void 0 ? void 0 : constraints.allowFilesystem) === true,
            maxRuntimeMs: this.normalizeTimeout(constraints === null || constraints === void 0 ? void 0 : constraints.maxRuntimeMs)
        };
        return normalized;
    }
    normalizeInputSchema(schema) {
        if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
            this.raiseValidationError('inputSchema muss ein Objekt sein', 'invalid_input_schema');
        }
        if (schema.type !== 'object') {
            this.raiseValidationError('inputSchema unterstützt nur den Typ "object"', 'unsupported_input_schema');
        }
        if (!schema.properties || typeof schema.properties !== 'object' || Array.isArray(schema.properties)) {
            this.raiseValidationError('inputSchema.properties muss ein Objekt sein', 'invalid_input_properties');
        }
        const normalizedProps = {};
        for (const [key, value] of Object.entries(schema.properties)) {
            if (typeof key !== 'string' || !key.trim()) {
                this.raiseValidationError('inputSchema enthält ungültige Property-Namen', 'invalid_property_name');
            }
            if (!value || typeof value !== 'object' || Array.isArray(value)) {
                this.raiseValidationError(`inputSchema Property "${key}" ist ungültig`, 'invalid_property_value', { property: key });
            }
            const type = typeof value.type === 'string' && value.type.trim() ? value.type.trim() : 'string';
            const description = typeof value.description === 'string' && value.description.trim()
                ? value.description.trim()
                : undefined;
            const example = value.example;
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
    normalizeRequiredText(value, field, maxLength) {
        if (typeof value !== 'string' || !value.trim()) {
            this.raiseValidationError(`${field} ist erforderlich`, `missing_${field}`);
        }
        const trimmed = value.trim();
        if (trimmed.length > maxLength) {
            this.raiseValidationError(`${field} überschreitet das Limit von ${maxLength} Zeichen`, `too_long_${field}`, { maxLength, length: trimmed.length });
        }
        return trimmed;
    }
    normalizeOptionalText(value, field, maxLength) {
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
            this.raiseValidationError(`${field} überschreitet das Limit von ${maxLength} Zeichen`, `too_long_${field}`, { maxLength, length: trimmed.length });
        }
        return trimmed;
    }
    cloneDefaultInputSchema() {
        return JSON.parse(JSON.stringify(DEFAULT_INPUT_SCHEMA_TEMPLATE));
    }
    normalizeReferences(references) {
        if (!Array.isArray(references) || references.length === 0) {
            return [];
        }
        const sanitized = [];
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
    normalizeAttachments(attachments) {
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
            this.raiseValidationError(`Es sind maximal ${MAX_ATTACHMENT_COUNT} Attachments erlaubt`, 'too_many_attachments', { maxCount: MAX_ATTACHMENT_COUNT });
        }
        const normalized = [];
        let totalLength = 0;
        attachments.forEach((attachment, index) => {
            if (!attachment || typeof attachment !== 'object' || Array.isArray(attachment)) {
                this.raiseValidationError('attachments enthält ungültige Einträge', 'invalid_attachment_item', { index });
            }
            const filenameRaw = attachment.filename;
            if (typeof filenameRaw !== 'string' || !filenameRaw.trim()) {
                this.raiseValidationError('attachments.filename ist erforderlich', 'missing_attachment_filename', { index });
            }
            const filename = filenameRaw.trim().slice(0, 160);
            const contentRaw = attachment.content;
            if (typeof contentRaw !== 'string' || !contentRaw.trim()) {
                this.raiseValidationError('attachments.content muss Text enthalten', 'missing_attachment_content', { index });
            }
            if (contentRaw.length > MAX_ATTACHMENT_CONTENT_LENGTH) {
                this.raiseValidationError(`Attachment überschreitet ${MAX_ATTACHMENT_CONTENT_LENGTH} Zeichen (~${(MAX_ATTACHMENT_CONTENT_LENGTH /
                    (1024 * 1024)).toFixed(0)} MB)`, 'attachment_too_large', { index, maxLength: MAX_ATTACHMENT_CONTENT_LENGTH, length: contentRaw.length });
            }
            totalLength += contentRaw.length;
            if (totalLength > MAX_ATTACHMENT_TOTAL_LENGTH) {
                this.raiseValidationError(`Gesamtgröße der Attachments überschreitet ${MAX_ATTACHMENT_TOTAL_LENGTH} Zeichen (~${(MAX_ATTACHMENT_TOTAL_LENGTH /
                    (1024 * 1024)).toFixed(0)} MB)`, 'attachments_total_too_large', { maxLength: MAX_ATTACHMENT_TOTAL_LENGTH });
            }
            const mimeTypeRaw = attachment.mimeType;
            let mimeType;
            if (mimeTypeRaw !== undefined) {
                if (typeof mimeTypeRaw !== 'string' || !mimeTypeRaw.trim()) {
                    this.raiseValidationError('attachments.mimeType muss ein String sein', 'invalid_attachment_mime', { index });
                }
                mimeType = mimeTypeRaw.trim().slice(0, 120);
            }
            const description = this.normalizeOptionalText(attachment.description, `attachments[${index}].description`, 240);
            const weight = this.sanitizeAttachmentWeight(attachment.weight);
            const idValue = attachment.id;
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
    transformAttachmentsToReferences(attachments, maxSlots) {
        var _a, _b;
        if (!attachments.length || maxSlots <= 0) {
            return [];
        }
        const references = [];
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
                const headerLines = [
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
                const chunkIdSeed = `${attachment.filename}:${(_a = attachment.id) !== null && _a !== void 0 ? _a : ''}:${index}`;
                const chunkId = (0, crypto_1.createHash)('sha1').update(chunkIdSeed).digest('hex');
                const boostedWeight = Math.max(attachment.weight, ATTACHMENT_REFERENCE_WEIGHT_BOOST);
                references.push({
                    id: `${(_b = attachment.id) !== null && _b !== void 0 ? _b : attachment.filename}#${chunkId}`.slice(0, 160),
                    title: attachment.displayName.slice(0, 160),
                    snippet,
                    weight: boostedWeight,
                    useForPrompt: true
                });
            }
        }
        return references;
    }
    formatAttachmentChunkForPrompt(content, attachment) {
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
    isLikelyEdifactAttachment(content, attachment) {
        var _a, _b;
        const filename = attachment.filename.toLowerCase();
        const mimeType = (_b = (_a = attachment.mimeType) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : '';
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
    insertEdifactSegmentBreaks(content) {
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
    mergeReferences(attachmentRefs, referenceDocs) {
        const merged = [];
        const seen = new Set();
        const add = (ref) => {
            var _a, _b;
            if (!ref || !((_a = ref.snippet) === null || _a === void 0 ? void 0 : _a.trim())) {
                return;
            }
            const key = `${(_b = ref.title) !== null && _b !== void 0 ? _b : ''}|${ref.snippet}`.toLowerCase();
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
    splitAttachmentIntoChunks(content, maxChunks) {
        if (!content) {
            return [];
        }
        const normalized = content.replace(/\r\n/g, '\n').trimEnd();
        const effectiveMaxChunks = Math.max(1, Math.min(maxChunks, MAX_ATTACHMENT_CHUNKS_PER_ATTACHMENT));
        const targetChunkLength = Math.max(MIN_ATTACHMENT_CHUNK_LENGTH, Math.min(MAX_ATTACHMENT_CHUNK_LENGTH, MAX_REFERENCE_SNIPPET_LENGTH - 100));
        const chunks = [];
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
            }
            else {
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
    sanitizeAttachmentWeight(weight) {
        if (typeof weight !== 'number' || !Number.isFinite(weight)) {
            return ATTACHMENT_WEIGHT_DEFAULT;
        }
        const clamped = Math.max(1, Math.min(10, Math.trunc(weight)));
        return clamped;
    }
    normalizeTestCases(testCases) {
        if (!Array.isArray(testCases) || testCases.length === 0) {
            return [];
        }
        const sanitized = [];
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
    normalizeAssertions(assertions) {
        if (!Array.isArray(assertions) || assertions.length === 0) {
            return [];
        }
        const supported = ['contains', 'equals', 'regex'];
        const sanitized = [];
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
    cloneTestCaseInput(input) {
        if (input === null || input === undefined) {
            return {};
        }
        if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
            return input;
        }
        if (typeof input === 'object') {
            try {
                return JSON.parse(JSON.stringify(input));
            }
            catch (_error) {
                this.raiseValidationError('testCases.input muss JSON-serialisierbar sein', 'invalid_test_case_input');
            }
        }
        this.raiseValidationError('testCases.input enthält einen nicht unterstützten Typ', 'invalid_test_case_input_type');
    }
    async collectContextSnippets(input) {
        var _a, _b, _c;
        const snippets = [];
        const seen = new Set();
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
            const retrieval = await retrieval_service_1.retrievalService.semanticSearch(queryParts, {
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
                    : typeof ((_a = result.metadata) === null || _a === void 0 ? void 0 : _a.mergedScore) === 'number'
                        ? result.metadata.mergedScore
                        : undefined;
                snippets.push({
                    id: result.id,
                    title: this.extractPayloadTitle(result.payload),
                    snippet: this.truncateText(snippetText, MAX_RETRIEVAL_SNIPPET_LENGTH),
                    origin: 'retrieval',
                    score,
                    source: ((_b = result.payload) === null || _b === void 0 ? void 0 : _b.message_format) || ((_c = result.payload) === null || _c === void 0 ? void 0 : _c.content_type) || undefined
                });
                seen.add(key);
            }
        }
        catch (error) {
            console.warn('Context retrieval for generate-script failed:', error);
        }
        return snippets.slice(0, MAX_CONTEXT_SNIPPETS);
    }
    async collectPseudocodeSnippets(input, snippets, seen) {
        var _a, _b, _c;
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
                const response = await retrieval_service_1.retrievalService.semanticSearch(`${messageType} EDIFACT Pseudocode`, {
                    limit: limitPerQuery,
                    outlineScoping: false,
                    excludeVisual: false
                });
                for (const item of response.results) {
                    if (snippets.length >= MAX_CONTEXT_SNIPPETS) {
                        break;
                    }
                    const payload = (_a = item.payload) !== null && _a !== void 0 ? _a : {};
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
                    const sections = [];
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
                    if (this.isMessageTypeMismatch(snippetText, (_b = input.detectedMessageTypes) !== null && _b !== void 0 ? _b : [])) {
                        continue;
                    }
                    const dedupeKey = `${messageType}|${source !== null && source !== void 0 ? source : ''}|${originalDocId !== null && originalDocId !== void 0 ? originalDocId : ''}|${snippetText.slice(0, 160)}`.toLowerCase();
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
                        id: originalDocId !== null && originalDocId !== void 0 ? originalDocId : item.id,
                        title: titleParts.join(' – '),
                        source,
                        score: (_c = item.score) !== null && _c !== void 0 ? _c : undefined,
                        snippet: snippetText,
                        origin: 'retrieval'
                    });
                }
            }
            catch (error) {
                console.warn(`Pseudocode retrieval failed for ${messageType}:`, error);
            }
        }
    }
    inferEdifactMessageTypes(input) {
        var _a, _b;
        if (input.detectedMessageTypes && input.detectedMessageTypes.length) {
            return input.detectedMessageTypes;
        }
        const fallbacks = new Set();
        const addFromText = (text) => {
            const matches = this.collectMessageTypesFromText(text);
            matches.forEach((match) => fallbacks.add(match));
        };
        addFromText(input.instructions);
        addFromText(input.additionalContext);
        addFromText(input.expectedOutputDescription);
        if ((_a = input.inputSchema) === null || _a === void 0 ? void 0 : _a.description) {
            addFromText(input.inputSchema.description);
        }
        if ((_b = input.inputSchema) === null || _b === void 0 ? void 0 : _b.properties) {
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
    extractPayloadSnippet(payload, highlight) {
        const candidates = [
            highlight,
            payload === null || payload === void 0 ? void 0 : payload.contextual_content,
            payload === null || payload === void 0 ? void 0 : payload.text,
            payload === null || payload === void 0 ? void 0 : payload.content,
            payload === null || payload === void 0 ? void 0 : payload.snippet
        ];
        for (const candidate of candidates) {
            if (typeof candidate === 'string' && candidate.trim()) {
                return candidate.trim();
            }
        }
        return null;
    }
    extractPayloadTitle(payload) {
        const candidates = [payload === null || payload === void 0 ? void 0 : payload.document_name, payload === null || payload === void 0 ? void 0 : payload.title, payload === null || payload === void 0 ? void 0 : payload.source, payload === null || payload === void 0 ? void 0 : payload.message_format];
        for (const candidate of candidates) {
            if (typeof candidate === 'string' && candidate.trim()) {
                return candidate.trim().slice(0, 160);
            }
        }
        return undefined;
    }
    truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
    }
    async executeTestCases(descriptor, input) {
        if (!input.testCases.length) {
            return undefined;
        }
        const results = [];
        let allPassed = true;
        for (const testCase of input.testCases) {
            try {
                const { result, logs } = await this.runScriptInSandbox(descriptor.code, testCase.input, input.constraints);
                const outputString = this.stringifyResult(result);
                let passed = true;
                let failedAssertion;
                let errorMessage;
                if (testCase.assertions && testCase.assertions.length > 0) {
                    for (const assertion of testCase.assertions) {
                        if (!this.evaluateAssertion(outputString, assertion)) {
                            passed = false;
                            failedAssertion = assertion;
                            errorMessage = `Assertion vom Typ "${assertion.type}" fehlgeschlagen.`;
                            break;
                        }
                    }
                }
                else {
                    if (!outputString || !outputString.trim()) {
                        passed = false;
                        errorMessage = 'Das Skript hat keinen verwertbaren Output zurückgegeben.';
                    }
                }
                const testResult = {
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
            }
            catch (error) {
                allPassed = false;
                results.push({
                    passed: false,
                    name: testCase.name,
                    description: testCase.description,
                    error: (error === null || error === void 0 ? void 0 : error.message) || String(error || 'Unbekannter Fehler bei Tests')
                });
            }
        }
        return {
            passed: allPassed,
            results
        };
    }
    evaluateAssertion(output, assertion) {
        switch (assertion.type) {
            case 'contains':
                return output.includes(assertion.value);
            case 'equals':
                return output === assertion.value;
            case 'regex':
                try {
                    const regex = new RegExp(assertion.value, 'm');
                    return regex.test(output);
                }
                catch (_error) {
                    return false;
                }
            default:
                return false;
        }
    }
    async runScriptInSandbox(code, input, constraints) {
        var _a, _b;
        const { sandbox, logs } = this.createSandbox(constraints);
        const scriptSource = `${code}\n;module.exports = module.exports || exports;`;
        const script = new node_vm_1.Script(scriptSource, { filename: 'tool-script.js' });
        script.runInNewContext(sandbox, { timeout: constraints.maxRuntimeMs });
        const exported = (_b = (_a = sandbox.module) === null || _a === void 0 ? void 0 : _a.exports) !== null && _b !== void 0 ? _b : sandbox.exports;
        const runFn = typeof exported === 'function' ? exported : exported === null || exported === void 0 ? void 0 : exported.run;
        if (typeof runFn !== 'function') {
            throw new Error('Das Skript exportiert keine Funktion `run` oder liefert kein ausführbares Modul.');
        }
        const invocationResult = runFn(input !== null && input !== void 0 ? input : {});
        const result = invocationResult instanceof Promise ? await invocationResult : invocationResult;
        return { result, logs };
    }
    createSandbox(constraints) {
        const logs = [];
        const capture = (level) => (...args) => {
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
        const sandbox = {
            module: { exports: {} },
            exports: {},
            console: sandboxConsole,
            require: sandboxRequire,
            process: sandboxProcess,
            Buffer: buffer_1.Buffer,
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
    createRestrictedProcess() {
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
    createRestrictedRequire(constraints) {
        const allowedFactories = new Map([
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
        return (moduleName) => {
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
    stringifyResult(value) {
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
        }
        catch (_error) {
            return String(value);
        }
    }
    buildScriptPrompt(input, contextSnippets, feedback) {
        const parts = [];
        parts.push('Du bist ein strenger Code-Generator für deterministische Node.js-Tools. '
            + 'Erzeuge ausschließlich CommonJS-Module mit `async function run(input)` und `module.exports = { run };`');
        parts.push('Rolle & Kontext:\n'
            + '- Du bist Softwareentwickler für die EDIFACT-Marktkommunikation im deutschsprachigen Energiemarkt.\n'
            + '- Nutze Fachwissen zu Formaten wie MSCONS, UTILMD, INVOIC, ORDERS, um feldgenaue Umsetzungen zu liefern.\n'
            + '- Behalte deterministische Verarbeitung und reproduzierbare Ergebnisse ohne Hidden-State im Blick.');
        parts.push('EDIFACT-Grundlagen, die strikt einzuhalten sind:\n'
            + '- Einfache Datenelemente enthalten genau einen Wert; zusammengesetzte Datenelemente (Composites) trennen ihre Komponenten mit `:`.\n'
            + '- Segmente bestehen aus Datenelementen, getrennt durch `+`, beginnen mit einem dreistelligen Segmentcode (z.\u202fB. `UNH`, `BGM`, `DTM`) und enden mit einem einzelnen Apostroph (`\'`).\n'
            + '- Jede Segmentinstanz bildet eine eigene Zeile ohne zusätzliche Zeilenumbrüche innerhalb des Segments.\n'
            + '- Segmentgruppen bilden wiederholbare Strukturen; Reihenfolge und Wiederholbarkeit müssen gewahrt bleiben (z.\u202fB. Kopf-, Positions-, Summensegmente).\n'
            + '- Eine Nachricht beginnt mit `UNH` und endet mit `UNT`; stelle sicher, dass zwischen diesen Segmenten sämtliche Pflichtsegmente laut Formatbeschreibung vorhanden sind.');
        if (input.primaryMessageType) {
            parts.push(`Fokus: ${input.primaryMessageType}. Nutze ausschließlich Segmente und Geschäftsregeln dieses Nachrichtentyps. Vermeide Ausflüge in andere Formate (z.\u202fB. UTILMD, ORDERS) und stütze dich primär auf die bereitgestellten Attachments.`);
        }
        parts.push('Erfahrungen aus jüngsten Fehlersuchen:\n'
            + '- MSCONS-Lastgänge liefern Intervallwerte über `QTY+187` mit unmittelbar folgenden `DTM+163` (Beginn) und `DTM+164` (Ende); erzeuge daraus deterministische Zeitstempel, z.\u202fB. ISO-Intervalle `start/end`.\n'
            + '- OBIS-Kennzahlen stehen häufig in `PIA+5`-Segmenten; entferne Freistellzeichen `?` korrekt und kombiniere die ersten beiden Komponenten (z.\u202fB. `1-1` + `1.29.0` \u2192 `1-1:1.29.0`).\n'
            + '- Verlasse dich nicht allein auf `RFF+AEV`; nutze `PIA`, `LIN` und Kontextsegmente als Fallback für Register-IDs.\n'
            + '- Das EDIFACT-Freistellzeichen `?` schützt `+`, `:`, `\'` und `?`; splitte nur auf echte Trennzeichen, sonst verlierst du Nutzdaten.\n'
            + '- `run` muss immer mit `return` antworten; vermeide Side-Effects und liefere strukturierte Fehlermeldungen statt Konsolen-Logs.');
        parts.push('Antwortformat-Verbote:\n'
            + '- Liefere niemals Klassifikations- oder QA-Objekte (z.\u202fB. Felder wie "answerable", "needsMoreContext", "confidence", "reason").\n'
            + '- Gib ausschließlich ausführbaren CommonJS-Code im Feld "code" zurück; wenn Informationen fehlen, arbeite mit Annahmen und beschreibe sie in den Notes.');
        parts.push('Nutzung bereitgestellter Pseudocode-Snippets:\n'
            + '- Verwende Pseudocode aus den Kontext-Snippets als maßgebliche Quelle und überführe ihn schrittweise in ausführbaren Node.js-Code.\n'
            + '- Prüfe Felder wie `source`, `summary_text`, `page` und `original_doc_id`, um Aufbau und Segment-Reihenfolge korrekt zu übernehmen.\n'
            + '- Übernimm Bedingungen, Schleifen und Segmentgruppen exakt; passe nur an, wenn die Aufgabe explizit Abweichungen verlangt.\n'
            + '- Ergänze deterministische Hilfsfunktionen statt neuer Logik, wenn der Pseudocode bereits sämtliche Fachregeln abdeckt.\n'
            + '- Konvertiere jeden Pseudocode-Schritt in getesteten Node.js-Quellcode und liefere niemals nur Pseudocode oder Platzhalter.');
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
        parts.push('Zwänge und Sicherheitsregeln:\n'
            + this.formatConstraintsForPrompt(input.constraints)
            + '\n- Keine Zufallsfunktionen (Math.random, crypto.randomUUID, Date.now, setTimeout, setInterval).'
            + '\n- Kein Zugriff auf Netzwerk (http, https, fetch) oder Dateisystem (fs) ohne explizite Freigabe.'
            + '\n- Kein Aufruf von process.exit, child_process, worker_threads oder Shell-Kommandos.'
            + '\n- Nutze nur synchronen Node.js-Standard ohne zusätzliche NPM-Pakete.'
            + '\n- Rückgabe muss über `return` innerhalb von `run` erfolgen und ausschließlich vom input abhängen.'
            + '\n- Erzeuge Text-Output mit expliziten Zeilenumbrüchen (\\n) und achte auf UTF-8 ohne Byte-Order-Mark.'
            + '\n- Bei CSV- oder Tabellen-Ausgaben: setze Kopfzeilen klar, nutze Trennzeichen aus der Aufgabenstellung (Standard: Semikolon) und maskiere Werte gemäß RFC 4180.'
            + '\n- Bewahre originalgetreue EDIFACT-Segmentierung (ein Segment = eine Zeile, Segmentabschluss \') ohne zusätzliche Leerzeilen oder Entfernen der Abschlusszeichen.');
        parts.push('Antwortformat: JSON ohne Markdown, ohne Kommentare. Felder: '
            + '{"code": string, "description": string, "entrypoint": "run", "runtime": "node18", "deterministic": true, '
            + '"dependencies": string[], "warnings": string[], "notes": string[]}. '
            + '"dependencies": string[], "warnings": string[], "notes": string[], "artifacts"?: Artifact[]}. '
            + 'Code als reiner String ohne ```-Blöcke.');
        parts.push('Das Feld "code" MUSS den vollständigen CommonJS-Quelltext enthalten und darf nicht leer sein.');
        parts.push('Nutze deutschsprachige Beschreibungen für description/notes, halte sie knapp (max 240 Zeichen pro Eintrag).');
        parts.push('Wenn der vollständige Code länger als ca. 3200 Zeichen wird, gib zusätzlich `artifacts` aus:\n'
            + '- `artifacts` ist ein Array von Objekten { id: string, title?: string, order: number, description?: string, code: string }.\n'
            + '- Teile den Code in logisch getrennte Module (z. B. Parser, Utilities, Export) und gib nur die Codesegmente aus.\n'
            + '- `code` im Hauptobjekt darf dann leer sein oder nur den orchestrierenden Export enthalten; der Server setzt die Segmente automatisch zusammen.');
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
                const violations = contextViolations === null || contextViolations === void 0 ? void 0 : contextViolations.filter((item) => typeof item === 'string');
                if (violations && violations.length) {
                    feedbackLines.push('Folgende Verstöße wurden festgestellt – entferne sie vollständig und ersetze sie durch deterministische Alternativen:');
                    feedbackLines.push(...violations.map((violation, index) => `  ${index + 1}. ${violation}`));
                }
                const contextForbidden = Array.isArray(context['forbiddenApis']) ? context['forbiddenApis'] : undefined;
                const forbiddenApis = contextForbidden === null || contextForbidden === void 0 ? void 0 : contextForbidden.filter((item) => typeof item === 'string');
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
            const candidateKeysRaw = context && Array.isArray(context['candidateKeys']) ? context['candidateKeys'] : undefined;
            const candidateKeys = candidateKeysRaw === null || candidateKeysRaw === void 0 ? void 0 : candidateKeysRaw.filter((value) => typeof value === 'string' && value.trim());
            if (candidateKeys && candidateKeys.length) {
                feedbackLines.push(`Deine letzte Antwort enthielt ein Klassifikationsobjekt (Schlüssel: ${candidateKeys.join(', ')}). Das ist verboten.`);
                feedbackLines.push('Gib stattdessen vollständigen Node.js-Code im Feld "code" zurück.');
            }
            const rawPreview = typeof (context === null || context === void 0 ? void 0 : context['rawPayloadPreview']) === 'string' ? context['rawPayloadPreview'] : undefined;
            if (rawPreview) {
                feedbackLines.push('Auszug aus der letzten Modellantwort (nur zur Diagnose):');
                feedbackLines.push(this.truncateText(rawPreview, 400));
            }
            parts.push(feedbackLines.join('\n'));
        }
        return parts.join('\n\n');
    }
    isRecoverableValidationError(error) {
        return error instanceof errorHandler_1.AppError && error.statusCode === 422;
    }
    extractCandidateCodeForFeedback(candidate) {
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
            const payload = candidate;
            const codeRaw = typeof payload.code === 'string'
                ? payload.code
                : typeof payload.script === 'string'
                    ? payload.script
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
    extractRunFunctionSnippet(code, entrypoint) {
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
    extractRunFunctionBody(code, entrypoint) {
        if (typeof code !== 'string') {
            return undefined;
        }
        const patterns = [
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
    findMatchingBrace(source, openIndex) {
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
            }
            else if (char === '}') {
                depth--;
                if (depth === 0) {
                    return i;
                }
            }
        }
        return -1;
    }
    serializeInputSchemaForPrompt(schema) {
        if (!schema) {
            return undefined;
        }
        const lines = [];
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
        }
        else {
            lines.push('Erforderlich: keine');
        }
        return lines.join('\n');
    }
    stringifyExample(value) {
        try {
            const serialized = JSON.stringify(value);
            return serialized.length > 80 ? `${serialized.slice(0, 77)}...` : serialized;
        }
        catch (_error) {
            return String(value);
        }
    }
    formatConstraintsForPrompt(constraints) {
        return [
            `- Deterministisch: ${constraints.deterministic ? 'Ja' : 'Nein'}`,
            `- Netzwerkzugriff erlaubt: ${constraints.allowNetwork ? 'Ja' : 'Nein'}`,
            `- Dateisystemzugriff erlaubt: ${constraints.allowFilesystem ? 'Ja' : 'Nein'}`,
            `- Maximale Laufzeit (ms): ${constraints.maxRuntimeMs}`
        ].join('\n');
    }
    normalizeScriptCandidate(candidate, input) {
        const payload = typeof candidate === 'string' ? this.safeParseJson(candidate) : candidate;
        if (!payload || typeof payload !== 'object') {
            this.raiseValidationError('Antwort konnte nicht als JSON interpretiert werden', 'invalid_llm_payload');
        }
        const scriptField = payload.script;
        const scriptObject = scriptField && typeof scriptField === 'object' ? scriptField : undefined;
        let codeRaw = typeof payload.code === 'string' ? payload.code : undefined;
        if (codeRaw === undefined) {
            if (typeof scriptField === 'string') {
                codeRaw = scriptField;
            }
            else if (scriptObject && typeof scriptObject.code === 'string') {
                codeRaw = scriptObject.code;
            }
        }
        let code = typeof codeRaw === 'string' ? this.extractCodeBlock(codeRaw) : undefined;
        const artifactCandidates = [];
        if (Array.isArray(scriptObject === null || scriptObject === void 0 ? void 0 : scriptObject.artifacts)) {
            artifactCandidates.push(...scriptObject.artifacts);
        }
        if (Array.isArray(payload.artifacts)) {
            artifactCandidates.push(...payload.artifacts);
        }
        const artifacts = artifactCandidates.length ? this.normalizeArtifacts(artifactCandidates) : this.normalizeArtifacts(payload.artifacts);
        if (!code && (artifacts === null || artifacts === void 0 ? void 0 : artifacts.length)) {
            code = artifacts.map((artifact) => artifact.code).join('\n\n');
        }
        if (!code) {
            const errorContext = {};
            if (artifacts && artifacts.length) {
                errorContext.artifactCount = artifacts.length;
                const artifactIds = artifacts
                    .map((artifact) => artifact.id)
                    .filter((id) => typeof id === 'string' && id.trim().length > 0)
                    .slice(0, 5);
                if (artifactIds.length) {
                    errorContext.artifactIds = artifactIds;
                }
            }
            if (payload && typeof payload === 'object') {
                errorContext.candidateKeys = Object.keys(payload).slice(0, 12);
                try {
                    errorContext.rawPayloadPreview = this.truncateText(JSON.stringify(payload), 800);
                }
                catch (_error) {
                    // ignore preview serialization errors
                }
            }
            this.raiseValidationError('Antwort enthält keinen Code', 'missing_code', errorContext);
        }
        this.assertValidSource(code);
        const rawDescription = typeof payload.description === 'string' && payload.description.trim()
            ? payload.description.trim()
            : typeof (scriptObject === null || scriptObject === void 0 ? void 0 : scriptObject.description) === 'string' && scriptObject.description.trim()
                ? scriptObject.description.trim()
                : undefined;
        const description = rawDescription ? rawDescription.slice(0, 280) : input.instructions.slice(0, 280);
        const entrypointRaw = typeof payload.entrypoint === 'string' && payload.entrypoint.trim()
            ? payload.entrypoint.trim()
            : typeof (scriptObject === null || scriptObject === void 0 ? void 0 : scriptObject.entrypoint) === 'string' && scriptObject.entrypoint.trim()
                ? scriptObject.entrypoint.trim()
                : 'run';
        const entrypoint = entrypointRaw === 'run' ? 'run' : 'run';
        const dependencyCandidates = [];
        if (Array.isArray(payload.dependencies)) {
            dependencyCandidates.push(...payload.dependencies);
        }
        if (Array.isArray(scriptObject === null || scriptObject === void 0 ? void 0 : scriptObject.dependencies)) {
            dependencyCandidates.push(...scriptObject.dependencies);
        }
        const dependencies = this.sanitizeDependencies(dependencyCandidates);
        const warningCandidates = [];
        if (Array.isArray(payload.warnings)) {
            warningCandidates.push(...payload.warnings);
        }
        if (Array.isArray(scriptObject === null || scriptObject === void 0 ? void 0 : scriptObject.warnings)) {
            warningCandidates.push(...scriptObject.warnings);
        }
        const candidateWarnings = this.ensureNotesLimit(warningCandidates);
        const noteCandidates = [];
        if (Array.isArray(payload.notes)) {
            noteCandidates.push(...payload.notes);
        }
        if (Array.isArray(scriptObject === null || scriptObject === void 0 ? void 0 : scriptObject.notes)) {
            noteCandidates.push(...scriptObject.notes);
        }
        let notes = this.ensureNotesLimit(noteCandidates);
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
    normalizeArtifacts(raw) {
        if (!Array.isArray(raw) || raw.length === 0) {
            return undefined;
        }
        const artifacts = [];
        const usedIds = new Set();
        raw.forEach((item, index) => {
            if (item === null || item === undefined) {
                return;
            }
            const candidate = typeof item === 'string'
                ? { code: item }
                : typeof item === 'object'
                    ? item
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
            const order = typeof candidate.order === 'number' && Number.isFinite(candidate.order)
                ? Math.trunc(candidate.order)
                : index + 1;
            const title = typeof candidate.title === 'string' && candidate.title.trim()
                ? candidate.title.trim().slice(0, 160)
                : undefined;
            const description = typeof candidate.description === 'string' && candidate.description.trim()
                ? candidate.description.trim().slice(0, 240)
                : undefined;
            const artifact = {
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
    extractCodeBlock(raw) {
        const trimmed = raw.trim();
        const fencedMatch = trimmed.match(/^```(?:javascript|js)?\s*([\s\S]*?)```$/i);
        if (fencedMatch) {
            return fencedMatch[1].trim();
        }
        return trimmed;
    }
    validateGeneratedScript(code, constraints, entrypoint) {
        const validation = {
            syntaxValid: false,
            deterministic: true,
            forbiddenApis: [],
            warnings: []
        };
        if (!code || typeof code !== 'string' || !code.trim()) {
            this.raiseValidationError('Generierter Code ist leer', 'empty_code');
        }
        try {
            new node_vm_1.Script(code, { filename: 'tool-script.js' });
            validation.syntaxValid = true;
        }
        catch (error) {
            this.raiseValidationError('Generierter Code ist syntaktisch ungültig', 'invalid_syntax', { details: (error === null || error === void 0 ? void 0 : error.message) || String(error) });
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
        if (!functionRegex.test(code)
            && !constRegex.test(code)
            && !letRegex.test(code)
            && !varRegex.test(code)
            && !exportAsyncRegex.test(code)
            && !moduleAsyncRegex.test(code)) {
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
            ? new RegExp(String.raw `\breturn\b`).test(runBody)
            : false;
        if (!runReturnsValue && !hasReturnWrapper) {
            this.raiseValidationError('Die Funktion run muss eine Antwort mit `return` liefern.', 'missing_return_statement');
        }
        if (runBody && !new RegExp(String.raw `\binput\b`).test(runBody)) {
            validation.warnings.push('Die Funktion run nutzt den Eingabe-Parameter `input` nicht.');
        }
        const deterministicViolations = [];
        if (constraints.deterministic) {
            const deterministicChecks = [
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
                this.raiseValidationError('Der Code verletzt die deterministischen Vorgaben', 'non_deterministic_code', { violations: deterministicViolations });
            }
        }
        const forbiddenModules = [
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
            }
            else if (!constraints.allowNetwork && check.gatedBy === 'network') {
                if (check.pattern.test(code)) {
                    validation.forbiddenApis.push(check.label);
                }
            }
            else if (!check.gatedBy && check.pattern.test(code)) {
                validation.forbiddenApis.push(check.label);
            }
        }
        const forbiddenGlobals = [
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
            validation.warnings.push(uniqueForbidden.length === 1
                ? `Skript verwendet potenziell unsichere API: ${uniqueForbidden[0]}`
                : `Skript verwendet potenziell unsichere APIs: ${uniqueForbidden.join(', ')}`);
        }
        validation.deterministic = constraints.deterministic;
        const warningPatterns = [
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
    runFunctionHasReturn(code, entrypoint) {
        const body = this.extractRunFunctionBody(code, entrypoint);
        return typeof body === 'string' ? new RegExp(String.raw `\breturn\b`).test(body) : false;
    }
    hasReturnWrapperMarker(code) {
        return typeof code === 'string' && code.includes(AUTO_RETURN_WRAPPER_MARKER);
    }
    ensureRunReturnWrapper(code, entrypoint) {
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
    isRateLimitError(error) {
        var _a, _b, _c;
        if (!error || typeof error !== 'object') {
            return false;
        }
        const candidate = error;
        const context = candidate.context;
        const codeCandidate = ((context === null || context === void 0 ? void 0 : context.code) || candidate.code);
        if (typeof codeCandidate === 'string' && codeCandidate.toUpperCase() === 'RATE_LIMITED') {
            return true;
        }
        const statusCandidate = (_b = (_a = candidate.statusCode) !== null && _a !== void 0 ? _a : candidate.status) !== null && _b !== void 0 ? _b : (_c = candidate.response) === null || _c === void 0 ? void 0 : _c.status;
        if (statusCandidate === 429) {
            return true;
        }
        const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : '';
        if (!message) {
            return false;
        }
        return message.includes('rate limit') || message.includes('too many requests') || message.includes('quota');
    }
    getRateLimitBackoffDelay(rateAttempt) {
        const index = Math.min(rateAttempt, LLM_RATE_LIMIT_BACKOFF_STEPS_MS.length - 1);
        return LLM_RATE_LIMIT_BACKOFF_STEPS_MS[index];
    }
    async delay(ms) {
        if (!Number.isFinite(ms) || ms <= 0) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, ms));
    }
    appendJobWarning(job, warning) {
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
    computeRepairChainDepth(job) {
        let depth = 1;
        let current = job;
        const visited = new Set([job.id]);
        while (current === null || current === void 0 ? void 0 : current.continuedFromJobId) {
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
    composeRepairInstructions(baseInstructions, job, repairInstructions) {
        const hints = [];
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
    composeRepairAdditionalContext(baseContext, repairContext) {
        const parts = [];
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
    mergeRepairAttachments(base, overrides) {
        const merged = [];
        const seen = new Set();
        const add = (candidate) => {
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
    mergeRepairReferences(base, overrides) {
        const merged = [];
        const seen = new Set();
        const addNormalized = (reference) => {
            if (!(reference === null || reference === void 0 ? void 0 : reference.snippet)) {
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
        const addRaw = (reference) => {
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
    normalizeAttachmentForRepair(attachment) {
        const normalized = {
            filename: attachment.filename,
            content: attachment.content,
            ...(attachment.description ? { description: attachment.description } : {}),
            ...(attachment.mimeType ? { mimeType: attachment.mimeType } : {})
        };
        if (attachment.id) {
            normalized.id = attachment.id;
        }
        if (typeof attachment.weight === 'number' && Number.isFinite(attachment.weight)) {
            normalized.weight = attachment.weight;
        }
        return normalized;
    }
    buildAttachmentDedupKey(filename, content) {
        const normalizedName = (filename !== null && filename !== void 0 ? filename : '').trim().toLowerCase();
        const hash = (0, crypto_1.createHash)('sha256').update(content || '', 'utf8').digest('hex');
        return `${normalizedName}::${hash}`;
    }
    buildReferenceDedupKey(snippet) {
        return (0, crypto_1.createHash)('sha256').update(snippet, 'utf8').digest('hex');
    }
    buildAutomaticRepairHint(job) {
        var _a, _b, _c;
        const parts = [];
        if ((_a = job.error) === null || _a === void 0 ? void 0 : _a.message) {
            parts.push(`Vorheriger Versuch scheiterte mit: ${job.error.message}.`);
        }
        const code = (_b = job.error) === null || _b === void 0 ? void 0 : _b.code;
        const messageType = (_c = job.normalizedInput) === null || _c === void 0 ? void 0 : _c.primaryMessageType;
        switch (code) {
            case 'missing_code':
                parts.push('Gib zwingend ein JSON-Objekt mit dem Feld "code" zurück. Dieses Feld muss den vollständigen CommonJS-Quelltext mit `async function run(input)` und `module.exports = { run };` enthalten. '
                    + 'Vermeide Markdown, Kommentare oder verkürzte Platzhalter.');
                if (messageType) {
                    parts.push(`Nutze die bereitgestellten ${messageType}-Segmente (z. B. UNH/BGM/DTM/QTY) aus den Attachments und bilde deren Struktur vollständig im Parser ab.`);
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
    buildRepairWarnings(job) {
        var _a, _b;
        const warnings = [];
        const codeFragment = ((_a = job.error) === null || _a === void 0 ? void 0 : _a.code) ? ` (${job.error.code})` : '';
        warnings.push(`Fortsetzung von Job ${job.id}${codeFragment}`);
        if ((_b = job.error) === null || _b === void 0 ? void 0 : _b.message) {
            warnings.push(`Letzter Fehler: ${this.truncateText(job.error.message, 160)}`);
        }
        return warnings.slice(-MAX_JOB_WARNINGS);
    }
    resolveEdifactMessageHints(params) {
        var _a;
        const scores = new Map();
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
        const primaryScore = primaryCandidate ? (_a = scores.get(primaryCandidate)) !== null && _a !== void 0 ? _a : 0 : 0;
        const primaryType = primaryScore >= MESSAGE_TYPE_PRIMARY_THRESHOLD ? primaryCandidate : undefined;
        return {
            detectedTypes: sorted,
            primaryType
        };
    }
    addMessageTypeEvidence(scores, text, weight) {
        var _a, _b;
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
                scores.set(type, ((_a = scores.get(type)) !== null && _a !== void 0 ? _a : 0) + weight);
            }
        }
        for (const [pattern, type] of Object.entries(EDIFACT_BGM_HINTS)) {
            if (upper.includes(pattern)) {
                scores.set(type, ((_b = scores.get(type)) !== null && _b !== void 0 ? _b : 0) + weight + 0.5);
            }
        }
    }
    collectMessageTypesFromText(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }
        const upper = text.toUpperCase();
        const matches = [];
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
    collectMessageTypesFromPayload(payload) {
        if (!payload || typeof payload !== 'object') {
            return [];
        }
        const fields = ['message_format', 'messageType', 'document_type', 'source', 'summary_text', 'title'];
        const distinct = new Set();
        for (const field of fields) {
            const value = payload[field];
            if (typeof value === 'string') {
                const matches = this.collectMessageTypesFromText(value);
                matches.forEach((match) => distinct.add(match));
            }
        }
        return Array.from(distinct);
    }
    isPayloadMessageTypeMismatch(payload, expectedTypes) {
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
    isMessageTypeMismatch(snippet, expectedTypes) {
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
    sanitizeDependencies(dependencies) {
        if (!Array.isArray(dependencies)) {
            return [];
        }
        const sanitized = dependencies
            .filter((dep) => typeof dep === 'string')
            .map((dep) => dep.trim())
            .filter(Boolean);
        return Array.from(new Set(sanitized)).slice(0, 10);
    }
    sanitizeValidationContext(context) {
        if (!context || typeof context !== 'object') {
            return undefined;
        }
        const result = {};
        const ctx = context;
        if (Array.isArray(ctx.violations)) {
            const violations = ctx.violations
                .filter((item) => typeof item === 'string')
                .map((item) => item.trim())
                .filter((item) => item.length > 0)
                .slice(0, 6);
            if (violations.length) {
                result.violations = violations;
            }
        }
        if (Array.isArray(ctx.forbiddenApis)) {
            const forbiddenApis = ctx.forbiddenApis
                .filter((item) => typeof item === 'string')
                .map((item) => item.trim())
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
    ensureNotesLimit(notes) {
        if (!Array.isArray(notes)) {
            return [];
        }
        const sanitized = notes
            .filter((note) => typeof note === 'string')
            .map((note) => note.trim())
            .filter(Boolean);
        return sanitized.slice(0, MAX_NOTES);
    }
    safeParseJson(value) {
        try {
            return JSON.parse(value);
        }
        catch (_error) {
            return null;
        }
    }
    raiseValidationError(message, code, context) {
        const error = new errorHandler_1.AppError(message, 422);
        error.context = {
            code,
            ...(context || {})
        };
        throw error;
    }
    assertValidSource(source) {
        if (typeof source !== 'string' || !source.trim()) {
            throw new errorHandler_1.AppError('source darf nicht leer sein', 400);
        }
    }
    sanitizeMetadata(metadata) {
        if (!metadata) {
            return null;
        }
        if (typeof metadata !== 'object' || Array.isArray(metadata)) {
            throw new errorHandler_1.AppError('metadata muss ein Objekt sein', 400);
        }
        try {
            return JSON.parse(JSON.stringify(metadata));
        }
        catch (_error) {
            throw new errorHandler_1.AppError('metadata enthält nicht serialisierbare Werte', 400);
        }
    }
    normalizeTimeout(timeoutMs) {
        if (typeof timeoutMs !== 'number' || Number.isNaN(timeoutMs)) {
            return DEFAULT_TIMEOUT_MS;
        }
        return Math.min(Math.max(Math.trunc(timeoutMs), MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
    }
    buildSourceInfo(source) {
        const hash = (0, crypto_1.createHash)('sha256').update(source, 'utf8').digest('hex');
        const preview = source.replace(/\s+/g, ' ').trim().slice(0, SOURCE_PREVIEW_LENGTH);
        const lineCount = source.split(/\r?\n/).length;
        return {
            language: 'node',
            hash,
            bytes: buffer_1.Buffer.byteLength(source, 'utf8'),
            preview,
            lineCount
        };
    }
    buildInitialResult() {
        return null;
    }
    toPublicJob(record) {
        if (record.type === 'generate-script') {
            const { userId: _userId, normalizedInput: _normalizedInput, ...rest } = record;
            return rest;
        }
        const { userId: _userId, ...rest } = record;
        return rest;
    }
}
exports.ToolingService = ToolingService;
exports.toolingService = new ToolingService();
//# sourceMappingURL=tooling.service.js.map