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
    async enqueueGenerateScriptJob(input) {
        const normalized = this.normalizeGenerateScriptInput(input);
        const now = new Date().toISOString();
        const record = {
            id: (0, crypto_1.randomUUID)(),
            type: 'generate-script',
            sessionId: normalized.sessionId,
            status: 'queued',
            createdAt: now,
            updatedAt: now,
            progress: {
                stage: 'queued',
                message: 'Job wurde eingereiht'
            },
            attempts: 0,
            warnings: [],
            userId: normalized.userId,
            normalizedInput: normalized
        };
        this.jobs.set(record.id, record);
        this.generateScriptQueue.push(record);
        this.startGenerateScriptWorker();
        return this.toPublicJob(record);
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
        var _a, _b;
        job.status = 'running';
        job.updatedAt = new Date().toISOString();
        try {
            const response = await this.executeGenerateScript(job);
            job.result = response;
            const warnings = new Set((_a = response.script.validation.warnings) !== null && _a !== void 0 ? _a : []);
            if (job.result.script.validation.warnings) {
                job.result.script.validation.warnings = Array.from(new Set(job.result.script.validation.warnings));
            }
            if (!response.script.validation.deterministic) {
                warnings.add('Skript verletzt deterministische Vorgaben.');
            }
            if (response.testResults && !response.testResults.passed) {
                warnings.add('Mindestens ein automatischer Test ist fehlgeschlagen.');
            }
            job.warnings = Array.from(warnings);
            job.status = 'succeeded';
            this.updateGenerateJobProgress(job, 'completed', 'Skript erfolgreich generiert', job.attempts || undefined);
        }
        catch (error) {
            job.error = this.buildGenerateScriptError(error);
            job.status = 'failed';
            job.warnings = (_b = job.warnings) !== null && _b !== void 0 ? _b : [];
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
        var _a, _b, _c;
        const normalized = job.normalizedInput;
        this.updateGenerateJobProgress(job, 'collecting-context', 'Kontext wird gesammelt', job.attempts || undefined);
        const contextSnippets = await this.collectContextSnippets(normalized);
        let descriptor = null;
        let validationError = null;
        let lastCandidateCode;
        let lastRunSnippet;
        let attempts = 0;
        for (attempts = 1; attempts <= MAX_GENERATION_ATTEMPTS; attempts++) {
            job.attempts = attempts;
            if (attempts === 1) {
                this.updateGenerateJobProgress(job, 'prompting', 'LLM wird aufgerufen', attempts);
            }
            else {
                this.updateGenerateJobProgress(job, 'repairing', 'Vorheriger Versuch schlug fehl – erneuter Prompt mit Feedback', attempts);
            }
            const feedback = validationError
                ? {
                    attempt: attempts,
                    validationErrorMessage: validationError.message,
                    validationErrorCode: ((_a = validationError === null || validationError === void 0 ? void 0 : validationError.context) === null || _a === void 0 ? void 0 : _a.code) || (validationError === null || validationError === void 0 ? void 0 : validationError.code),
                    previousCode: lastCandidateCode ? this.truncateText(lastCandidateCode, 4000) : undefined,
                    runSnippet: lastRunSnippet
                }
                : undefined;
            const prompt = this.buildScriptPrompt(normalized, contextSnippets, feedback);
            let rawCandidate;
            try {
                rawCandidate = await llmProvider_1.default.generateStructuredOutput(prompt, {
                    user_id: normalized.userId,
                    session_id: normalized.sessionId,
                    persona: 'tooling-script-generator',
                    attempt: attempts
                });
            }
            catch (error) {
                const appError = new errorHandler_1.AppError('Skript konnte nicht generiert werden', 502);
                appError.context = {
                    code: 'llm_generation_failed',
                    attempt: attempts,
                    details: (error === null || error === void 0 ? void 0 : error.message) || String(error || 'unbekannter Fehler')
                };
                throw appError;
            }
            try {
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
                code: (_c = (_b = fallbackError.context) === null || _b === void 0 ? void 0 : _b.code) !== null && _c !== void 0 ? _c : 'script_generation_failed',
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
        const referenceDocuments = this.normalizeReferences(input.referenceDocuments);
        const testCases = this.normalizeTestCases(input.testCases);
        return {
            ...input,
            instructions,
            additionalContext,
            expectedOutputDescription,
            inputSchema,
            constraints,
            referenceDocuments,
            testCases
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
            + '\n- Rückgabe muss über `return` innerhalb von `run` erfolgen und ausschließlich vom input abhängen.');
        parts.push('Antwortformat: JSON ohne Markdown, ohne Kommentare. Felder: '
            + '{"code": string, "description": string, "entrypoint": "run", "runtime": "node18", "deterministic": true, '
            + '"dependencies": string[], "warnings": string[], "notes": string[]}. '
            + '"dependencies": string[], "warnings": string[], "notes": string[], "artifacts"?: Artifact[]}. '
            + 'Code als reiner String ohne ```-Blöcke.');
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
        const artifacts = this.normalizeArtifacts(payload.artifacts);
        const codeRaw = typeof payload.code === 'string' ? payload.code : payload.script;
        let code = typeof codeRaw === 'string' ? this.extractCodeBlock(codeRaw) : undefined;
        if (!code && (artifacts === null || artifacts === void 0 ? void 0 : artifacts.length)) {
            code = artifacts.map((artifact) => artifact.code).join('\n\n');
        }
        if (!code) {
            this.raiseValidationError('Antwort enthält keinen Code', 'missing_code');
        }
        this.assertValidSource(code);
        const description = typeof payload.description === 'string' && payload.description.trim()
            ? payload.description.trim().slice(0, 280)
            : input.instructions.slice(0, 280);
        const entrypointRaw = typeof payload.entrypoint === 'string' && payload.entrypoint.trim()
            ? payload.entrypoint.trim()
            : 'run';
        const entrypoint = entrypointRaw === 'run' ? 'run' : 'run';
        const dependencies = this.sanitizeDependencies(payload.dependencies);
        const candidateWarnings = this.ensureNotesLimit(payload.warnings);
        let notes = this.ensureNotesLimit(payload.notes);
        if (artifacts && artifacts.length) {
            notes = this.ensureNotesLimit([
                ...notes,
                `Skript wurde aus ${artifacts.length} Artefakt(en) zusammengesetzt.`
            ]);
        }
        const validation = this.validateGeneratedScript(code, input.constraints, entrypoint);
        validation.warnings = Array.from(new Set([...validation.warnings, ...candidateWarnings]));
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
        const runBlockMatch = code.match(new RegExp(`async\\s+function\\s+${entrypoint}\\s*\\([^)]*\\)\\s*{([\\s\\S]*?)}`));
        let runBody = runBlockMatch ? runBlockMatch[1] : undefined;
        if (!runBody) {
            const arrowBlockMatch = code.match(new RegExp(`${entrypoint}\\s*=\\s*async\\s*\\([^)]*\\)\\s*=>\\s*{([\\s\\S]*?)}`));
            if (arrowBlockMatch) {
                runBody = arrowBlockMatch[1];
            }
        }
        if (runBody) {
            if (!/return\b/.test(runBody)) {
                this.raiseValidationError('Die Funktion run muss eine Antwort mit `return` liefern.', 'missing_return_statement');
            }
            if (!/\binput\b/.test(runBody)) {
                validation.warnings.push('Die Funktion run nutzt den Eingabe-Parameter `input` nicht.');
            }
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
            this.raiseValidationError('Der Code verwendet verbotene APIs', 'forbidden_apis', { forbiddenApis: Array.from(new Set(validation.forbiddenApis)) });
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