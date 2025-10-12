"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.artifactsService = exports.ArtifactsService = void 0;
const crypto_1 = require("crypto");
const errorHandler_1 = require("../../middleware/errorHandler");
const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_TAGS = 12;
const MAX_TAG_LENGTH = 40;
const MAX_METADATA_SIZE_BYTES = 10000;
const MAX_ARTIFACT_BYTES = 200000;
const PREVIEW_CHAR_LIMIT = 320;
class ArtifactsService {
    constructor() {
        this.artifacts = new Map();
    }
    async createArtifact(input) {
        this.assertValidSessionId(input.sessionId);
        this.assertValidType(input.type);
        this.assertValidName(input.name);
        this.assertValidMimeType(input.mimeType);
        const description = this.sanitizeDescription(input.description);
        const tags = this.sanitizeTags(input.tags);
        const metadata = this.sanitizeMetadata(input.metadata);
        const { buffer, encoding } = this.toBuffer(input.content, input.encoding);
        this.assertWithinSize(buffer.byteLength);
        const storage = this.buildStorage(input.content, encoding);
        const checksum = (0, crypto_1.createHash)('sha256').update(buffer).digest('hex');
        const preview = this.buildPreview(buffer, encoding, input.mimeType);
        const now = new Date().toISOString();
        const record = {
            id: (0, crypto_1.randomUUID)(),
            sessionId: input.sessionId,
            userId: input.userId,
            name: input.name,
            type: input.type,
            mimeType: input.mimeType,
            byteSize: buffer.byteLength,
            checksum,
            createdAt: now,
            updatedAt: now,
            storage,
            preview,
            description,
            version: this.sanitizeVersion(input.version),
            tags,
            metadata
        };
        this.artifacts.set(record.id, record);
        return this.toPublicArtifact(record);
    }
    async getArtifactForUser(artifactId, userId) {
        const record = this.artifacts.get(artifactId);
        if (!record || record.userId !== userId) {
            throw new errorHandler_1.AppError('Artefakt wurde nicht gefunden', 404);
        }
        return this.toPublicArtifact(record);
    }
    assertValidSessionId(sessionId) {
        if (typeof sessionId !== 'string' || !sessionId.trim()) {
            throw new errorHandler_1.AppError('sessionId ist erforderlich', 400);
        }
    }
    assertValidType(type) {
        if (typeof type !== 'string' || !type.trim()) {
            throw new errorHandler_1.AppError('type ist erforderlich', 400);
        }
    }
    assertValidName(name) {
        if (typeof name !== 'string' || !name.trim()) {
            throw new errorHandler_1.AppError('name ist erforderlich', 400);
        }
        if (name.length > MAX_NAME_LENGTH) {
            throw new errorHandler_1.AppError(`name überschreitet das Limit von ${MAX_NAME_LENGTH} Zeichen`, 400);
        }
    }
    assertValidMimeType(mimeType) {
        if (typeof mimeType !== 'string' || !mimeType.includes('/')) {
            throw new errorHandler_1.AppError('mimeType ist erforderlich', 400);
        }
    }
    sanitizeDescription(description) {
        if (description === undefined) {
            return undefined;
        }
        if (typeof description !== 'string') {
            throw new errorHandler_1.AppError('description muss ein String sein', 400);
        }
        const trimmed = description.trim();
        if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
            throw new errorHandler_1.AppError(`description überschreitet das Limit von ${MAX_DESCRIPTION_LENGTH} Zeichen`, 400);
        }
        return trimmed || undefined;
    }
    sanitizeTags(tags) {
        if (tags === undefined) {
            return undefined;
        }
        if (!Array.isArray(tags)) {
            throw new errorHandler_1.AppError('tags müssen als Array vorliegen', 400);
        }
        if (tags.length > MAX_TAGS) {
            throw new errorHandler_1.AppError(`tags überschreiten das Limit von ${MAX_TAGS} Einträgen`, 400);
        }
        const sanitized = tags.map((tag) => {
            if (typeof tag !== 'string' || !tag.trim()) {
                throw new errorHandler_1.AppError('tags dürfen nur nicht-leere Strings enthalten', 400);
            }
            const trimmed = tag.trim();
            if (trimmed.length > MAX_TAG_LENGTH) {
                throw new errorHandler_1.AppError(`Tag "${trimmed}" überschreitet das Limit von ${MAX_TAG_LENGTH} Zeichen`, 400);
            }
            return trimmed;
        });
        return sanitized.length ? sanitized : undefined;
    }
    sanitizeMetadata(metadata) {
        if (metadata === undefined || metadata === null) {
            return metadata !== null && metadata !== void 0 ? metadata : null;
        }
        if (typeof metadata !== 'object' || Array.isArray(metadata)) {
            throw new errorHandler_1.AppError('metadata muss ein Objekt sein', 400);
        }
        try {
            const serialized = JSON.stringify(metadata);
            if (Buffer.byteLength(serialized, 'utf8') > MAX_METADATA_SIZE_BYTES) {
                throw new errorHandler_1.AppError(`metadata überschreitet das Limit von ${MAX_METADATA_SIZE_BYTES} Bytes`, 400);
            }
            return JSON.parse(serialized);
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            throw new errorHandler_1.AppError('metadata enthält nicht serialisierbare Werte', 400);
        }
    }
    sanitizeVersion(version) {
        if (version === undefined) {
            return undefined;
        }
        if (typeof version !== 'string') {
            throw new errorHandler_1.AppError('version muss ein String sein', 400);
        }
        return version.trim() || undefined;
    }
    toBuffer(content, encoding) {
        if (typeof content !== 'string' || !content.length) {
            throw new errorHandler_1.AppError('content ist erforderlich', 400);
        }
        if (encoding === 'utf8') {
            return { buffer: Buffer.from(content, 'utf8'), encoding };
        }
        if (encoding === 'base64') {
            try {
                const buffer = Buffer.from(content, 'base64');
                if (buffer.toString('base64') !== content.replace(/\s+/g, '')) {
                    throw new Error('invalid base64');
                }
                return { buffer, encoding };
            }
            catch (_error) {
                throw new errorHandler_1.AppError('content ist kein gültiger Base64-String', 400);
            }
        }
        throw new errorHandler_1.AppError('encoding wird nicht unterstützt', 400);
    }
    assertWithinSize(byteLength) {
        if (byteLength === 0) {
            throw new errorHandler_1.AppError('content darf nicht leer sein', 400);
        }
        if (byteLength > MAX_ARTIFACT_BYTES) {
            throw new errorHandler_1.AppError(`content überschreitet das Limit von ${MAX_ARTIFACT_BYTES} Bytes`, 400);
        }
    }
    buildStorage(content, encoding) {
        return {
            mode: 'inline',
            encoding,
            content
        };
    }
    buildPreview(buffer, encoding, mimeType) {
        if (encoding === 'base64') {
            return buffer.toString('base64').slice(0, PREVIEW_CHAR_LIMIT);
        }
        if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml')) {
            const text = buffer.toString('utf8');
            return text.length > PREVIEW_CHAR_LIMIT ? `${text.slice(0, PREVIEW_CHAR_LIMIT)}…` : text;
        }
        return null;
    }
    toPublicArtifact(record) {
        const { userId: _userId, ...artifact } = record;
        return artifact;
    }
}
exports.ArtifactsService = ArtifactsService;
exports.artifactsService = new ArtifactsService();
//# sourceMappingURL=artifacts.service.js.map