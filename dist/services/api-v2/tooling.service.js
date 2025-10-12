"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolingService = exports.ToolingService = void 0;
const crypto_1 = require("crypto");
const buffer_1 = require("buffer");
const errorHandler_1 = require("../../middleware/errorHandler");
const DEFAULT_TIMEOUT_MS = 5000;
const MIN_TIMEOUT_MS = 500;
const MAX_TIMEOUT_MS = 60000;
const MAX_SOURCE_LENGTH = 4000;
const SOURCE_PREVIEW_LENGTH = 240;
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