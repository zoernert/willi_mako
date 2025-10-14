import { createHash, randomUUID } from 'crypto';
import { Buffer } from 'buffer';
import { Script } from 'node:vm';

import { AppError } from '../../middleware/errorHandler';
import {
  GenerateToolScriptRequest,
  GenerateToolScriptResponse,
  ToolJob,
  ToolJobDiagnostics,
  ToolJobResult,
  ToolJobSourceInfo,
  ToolScriptConstraints,
  ToolScriptDescriptor,
  ToolScriptInputSchema,
  ToolScriptValidationReport
} from '../../domain/api-v2/tooling.types';
import llm from '../llmProvider';

interface NodeScriptJobInput {
  userId: string;
  sessionId: string;
  source: string;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

interface ToolJobRecord extends ToolJob {
  userId: string;
}

interface GenerateToolScriptInternalInput extends GenerateToolScriptRequest {
  userId: string;
}

interface NormalizedToolScriptConstraints {
  deterministic: boolean;
  allowNetwork: boolean;
  allowFilesystem: boolean;
  maxRuntimeMs: number;
}

interface NormalizedGenerateScriptInput extends GenerateToolScriptInternalInput {
  instructions: string;
  additionalContext?: string;
  expectedOutputDescription?: string;
  inputSchema?: ToolScriptInputSchema;
  constraints: NormalizedToolScriptConstraints;
}

const DEFAULT_TIMEOUT_MS = 5000;
const MIN_TIMEOUT_MS = 500;
const MAX_TIMEOUT_MS = 60000;
const MAX_SOURCE_LENGTH = 4000;
const SOURCE_PREVIEW_LENGTH = 240;
const MAX_INSTRUCTIONS_LENGTH = 1600;
const MAX_CONTEXT_LENGTH = 2000;
const MAX_EXPECTED_OUTPUT_LENGTH = 1200;
const MAX_NOTES = 6;

export class ToolingService {
  private readonly jobs = new Map<string, ToolJobRecord>();

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

    const record: ToolJobRecord = {
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

  public async generateDeterministicScript(input: GenerateToolScriptInternalInput): Promise<GenerateToolScriptResponse> {
    const normalized = this.normalizeGenerateScriptInput(input);
    const prompt = this.buildScriptPrompt(normalized);

    let rawCandidate: any;
    try {
      rawCandidate = await llm.generateStructuredOutput(prompt, {
        user_id: normalized.userId,
        session_id: normalized.sessionId,
        persona: 'tooling-script-generator'
      });
    } catch (error: any) {
      const appError = new AppError('Skript konnte nicht generiert werden', 502);
      (appError as any).context = {
        code: 'llm_generation_failed',
        details: error?.message || String(error || 'unbekannter Fehler')
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

  private buildScriptPrompt(input: NormalizedGenerateScriptInput): string {
    const parts: string[] = [];

    parts.push(
      'Du bist ein strenger Code-Generator für deterministische Node.js-Tools. '
      + 'Erzeuge ausschließlich CommonJS-Module mit `async function run(input)` und `module.exports = { run };`'
    );

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

    parts.push(
      'Zwänge und Sicherheitsregeln:\n'
      + this.formatConstraintsForPrompt(input.constraints)
      + '\n- Keine Zufallsfunktionen (Math.random, crypto.randomUUID, Date.now, setTimeout, setInterval).'
      + '\n- Kein Zugriff auf Netzwerk (http, https, fetch) oder Dateisystem (fs) ohne explizite Freigabe.'
      + '\n- Kein Aufruf von process.exit, child_process, worker_threads oder Shell-Kommandos.'
      + '\n- Nutze nur synchronen Node.js-Standard ohne zusätzliche NPM-Pakete.'
      + '\n- Rückgabe muss über `return` innerhalb von `run` erfolgen und ausschließlich vom input abhängen.'
    );

    parts.push(
      'Antwortformat: JSON ohne Markdown, ohne Kommentare. Felder: '
      + '{"code": string, "description": string, "entrypoint": "run", "runtime": "node18", "deterministic": true, '
      + '"dependencies": string[], "warnings": string[], "notes": string[]}. '
      + 'Code als reiner String ohne ```-Blöcke.'
    );

    parts.push('Nutze deutschsprachige Beschreibungen für description/notes, halte sie knapp (max 240 Zeichen pro Eintrag).');

    return parts.join('\n\n');
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

    const codeRaw = typeof (payload as any).code === 'string' ? (payload as any).code : (payload as any).script;
    if (typeof codeRaw !== 'string') {
      this.raiseValidationError('Antwort enthält keinen Code', 'missing_code');
    }

    const code = this.extractCodeBlock(codeRaw);
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
    const notes = this.ensureNotesLimit((payload as any).notes);

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
      // Validate syntax by compiling the code in isolation
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

    if (!functionRegex.test(code) && !constRegex.test(code) && !letRegex.test(code) && !varRegex.test(code)) {
      this.raiseValidationError('run muss als async Funktion definiert sein', 'missing_async_run');
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
      { pattern: /process\.kill\s*\(/g, label: 'process.kill()' }
    ];

    for (const check of forbiddenGlobals) {
      if (check.pattern.test(code)) {
        validation.forbiddenApis.push(check.label);
      }
    }

    if (validation.forbiddenApis.length > 0) {
      this.raiseValidationError(
        'Der Code verwendet verbotene APIs',
        'forbidden_apis',
        { forbiddenApis: Array.from(new Set(validation.forbiddenApis)) }
      );
    }

    validation.deterministic = constraints.deterministic;

    return validation;
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

    if (source.length > MAX_SOURCE_LENGTH) {
      throw new AppError(`source überschreitet das Limit von ${MAX_SOURCE_LENGTH} Zeichen`, 400);
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
    const { userId: _userId, ...publicJob } = record;
    return publicJob;
  }
}

export const toolingService = new ToolingService();
