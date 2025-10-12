import { createHash, randomUUID } from 'crypto';
import { Buffer } from 'buffer';

import { AppError } from '../../middleware/errorHandler';
import { ToolJob, ToolJobDiagnostics, ToolJobResult, ToolJobSourceInfo } from '../../domain/api-v2/tooling.types';

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

const DEFAULT_TIMEOUT_MS = 5000;
const MIN_TIMEOUT_MS = 500;
const MAX_TIMEOUT_MS = 60000;
const MAX_SOURCE_LENGTH = 4000;
const SOURCE_PREVIEW_LENGTH = 240;

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
