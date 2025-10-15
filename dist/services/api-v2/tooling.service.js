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
const DEFAULT_TIMEOUT_MS = 5000;
const MIN_TIMEOUT_MS = 500;
const MAX_TIMEOUT_MS = 60000;
const MAX_SOURCE_LENGTH = 4000;
const SOURCE_PREVIEW_LENGTH = 240;
const MAX_INSTRUCTIONS_LENGTH = 1600;
const MAX_CONTEXT_LENGTH = 2000;
const MAX_EXPECTED_OUTPUT_LENGTH = 1200;
const MAX_NOTES = 6;
class ToolingService {
    constructor() {
        this.jobs = new Map();
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
    async generateDeterministicScript(input) {
        const normalized = this.normalizeGenerateScriptInput(input);
        const prompt = this.buildScriptPrompt(normalized);
        let rawCandidate;
        try {
            rawCandidate = await llmProvider_1.default.generateStructuredOutput(prompt, {
                user_id: normalized.userId,
                session_id: normalized.sessionId,
                persona: 'tooling-script-generator'
            });
        }
        catch (error) {
            const appError = new errorHandler_1.AppError('Skript konnte nicht generiert werden', 502);
            appError.context = {
                code: 'llm_generation_failed',
                details: (error === null || error === void 0 ? void 0 : error.message) || String(error || 'unbekannter Fehler')
            };
            throw appError;
        }
        const descriptor = this.normalizeScriptCandidate(rawCandidate, normalized);
        return {
            sessionId: normalized.sessionId,
            script: descriptor,
            inputSchema: normalized.inputSchema,
            expectedOutputDescription: normalized.expectedOutputDescription
        };
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
        const inputSchema = input.inputSchema ? this.normalizeInputSchema(input.inputSchema) : undefined;
        const constraints = this.normalizeConstraints(input.constraints);
        return {
            ...input,
            instructions,
            additionalContext,
            expectedOutputDescription,
            inputSchema,
            constraints
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
    buildScriptPrompt(input) {
        const parts = [];
        parts.push('Du bist ein strenger Code-Generator für deterministische Node.js-Tools. '
            + 'Erzeuge ausschließlich CommonJS-Module mit `async function run(input)` und `module.exports = { run };`');
        parts.push(`Aufgabe:\n${input.instructions}`);
        if (input.additionalContext) {
            parts.push(`Zusätzlicher Kontext:\n${input.additionalContext}`);
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
            + 'Code als reiner String ohne ```-Blöcke.');
        parts.push('Nutze deutschsprachige Beschreibungen für description/notes, halte sie knapp (max 240 Zeichen pro Eintrag).');
        return parts.join('\n\n');
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
        const codeRaw = typeof payload.code === 'string' ? payload.code : payload.script;
        if (typeof codeRaw !== 'string') {
            this.raiseValidationError('Antwort enthält keinen Code', 'missing_code');
        }
        const code = this.extractCodeBlock(codeRaw);
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
        const notes = this.ensureNotesLimit(payload.notes);
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
            notes
        };
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
            // Validate syntax by compiling the code in isolation
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
        if (!functionRegex.test(code) && !constRegex.test(code) && !letRegex.test(code) && !varRegex.test(code)) {
            this.raiseValidationError('run muss als async Funktion definiert sein', 'missing_async_run');
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
            { pattern: /process\.kill\s*\(/g, label: 'process.kill()' }
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
        if (source.length > MAX_SOURCE_LENGTH) {
            throw new errorHandler_1.AppError(`source überschreitet das Limit von ${MAX_SOURCE_LENGTH} Zeichen`, 400);
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
        const { userId: _userId, ...publicJob } = record;
        return publicJob;
    }
}
exports.ToolingService = ToolingService;
exports.toolingService = new ToolingService();
//# sourceMappingURL=tooling.service.js.map