import { createHash, randomUUID } from 'crypto';

import { AppError } from '../../middleware/errorHandler';
import {
  Artifact,
  ArtifactEncoding,
  ArtifactOptionalMetadata,
  ArtifactStorage,
  CreateArtifactRequestBody
} from '../../domain/api-v2/artifacts.types';

interface ArtifactRecord extends Artifact {
  userId: string;
}

interface CreateArtifactInput extends CreateArtifactRequestBody {
  userId: string;
}

const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_TAGS = 12;
const MAX_TAG_LENGTH = 40;
const MAX_METADATA_SIZE_BYTES = 10_000;
const MAX_ARTIFACT_BYTES = 200_000;
const PREVIEW_CHAR_LIMIT = 320;

export class ArtifactsService {
  private readonly artifacts = new Map<string, ArtifactRecord>();

  public async createArtifact(input: CreateArtifactInput): Promise<Artifact> {
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
    const checksum = createHash('sha256').update(buffer).digest('hex');
    const preview = this.buildPreview(buffer, encoding, input.mimeType);

    const now = new Date().toISOString();

    const record: ArtifactRecord = {
      id: randomUUID(),
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

  public async getArtifactForUser(artifactId: string, userId: string): Promise<Artifact> {
    const record = this.artifacts.get(artifactId);

    if (!record || record.userId !== userId) {
      throw new AppError('Artefakt wurde nicht gefunden', 404);
    }

    return this.toPublicArtifact(record);
  }

  private assertValidSessionId(sessionId: string): void {
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      throw new AppError('sessionId ist erforderlich', 400);
    }
  }

  private assertValidType(type: string): void {
    if (typeof type !== 'string' || !type.trim()) {
      throw new AppError('type ist erforderlich', 400);
    }
  }

  private assertValidName(name: string): void {
    if (typeof name !== 'string' || !name.trim()) {
      throw new AppError('name ist erforderlich', 400);
    }

    if (name.length > MAX_NAME_LENGTH) {
      throw new AppError(`name überschreitet das Limit von ${MAX_NAME_LENGTH} Zeichen`, 400);
    }
  }

  private assertValidMimeType(mimeType: string): void {
    if (typeof mimeType !== 'string' || !mimeType.includes('/')) {
      throw new AppError('mimeType ist erforderlich', 400);
    }
  }

  private sanitizeDescription(description?: string): string | undefined {
    if (description === undefined) {
      return undefined;
    }

    if (typeof description !== 'string') {
      throw new AppError('description muss ein String sein', 400);
    }

    const trimmed = description.trim();

    if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
      throw new AppError(`description überschreitet das Limit von ${MAX_DESCRIPTION_LENGTH} Zeichen`, 400);
    }

    return trimmed || undefined;
  }

  private sanitizeTags(tags?: string[]): string[] | undefined {
    if (tags === undefined) {
      return undefined;
    }

    if (!Array.isArray(tags)) {
      throw new AppError('tags müssen als Array vorliegen', 400);
    }

    if (tags.length > MAX_TAGS) {
      throw new AppError(`tags überschreiten das Limit von ${MAX_TAGS} Einträgen`, 400);
    }

    const sanitized = tags.map((tag) => {
      if (typeof tag !== 'string' || !tag.trim()) {
        throw new AppError('tags dürfen nur nicht-leere Strings enthalten', 400);
      }

      const trimmed = tag.trim();

      if (trimmed.length > MAX_TAG_LENGTH) {
        throw new AppError(`Tag "${trimmed}" überschreitet das Limit von ${MAX_TAG_LENGTH} Zeichen`, 400);
      }

      return trimmed;
    });

    return sanitized.length ? sanitized : undefined;
  }

  private sanitizeMetadata(metadata: ArtifactOptionalMetadata['metadata']): ArtifactOptionalMetadata['metadata'] {
    if (metadata === undefined || metadata === null) {
      return metadata ?? null;
    }

    if (typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new AppError('metadata muss ein Objekt sein', 400);
    }

    try {
      const serialized = JSON.stringify(metadata);

      if (Buffer.byteLength(serialized, 'utf8') > MAX_METADATA_SIZE_BYTES) {
        throw new AppError(`metadata überschreitet das Limit von ${MAX_METADATA_SIZE_BYTES} Bytes`, 400);
      }

      return JSON.parse(serialized);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('metadata enthält nicht serialisierbare Werte', 400);
    }
  }

  private sanitizeVersion(version?: string): string | undefined {
    if (version === undefined) {
      return undefined;
    }

    if (typeof version !== 'string') {
      throw new AppError('version muss ein String sein', 400);
    }

    return version.trim() || undefined;
  }

  private toBuffer(content: string, encoding: ArtifactEncoding): { buffer: Buffer; encoding: ArtifactEncoding } {
    if (typeof content !== 'string' || !content.length) {
      throw new AppError('content ist erforderlich', 400);
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
      } catch (_error) {
        throw new AppError('content ist kein gültiger Base64-String', 400);
      }
    }

    throw new AppError('encoding wird nicht unterstützt', 400);
  }

  private assertWithinSize(byteLength: number): void {
    if (byteLength === 0) {
      throw new AppError('content darf nicht leer sein', 400);
    }

    if (byteLength > MAX_ARTIFACT_BYTES) {
      throw new AppError(`content überschreitet das Limit von ${MAX_ARTIFACT_BYTES} Bytes`, 400);
    }
  }

  private buildStorage(content: string, encoding: ArtifactEncoding): ArtifactStorage {
    return {
      mode: 'inline',
      encoding,
      content
    };
  }

  private buildPreview(buffer: Buffer, encoding: ArtifactEncoding, mimeType: string): string | null {
    if (encoding === 'base64') {
      return buffer.toString('base64').slice(0, PREVIEW_CHAR_LIMIT);
    }

    if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml')) {
      const text = buffer.toString('utf8');
      return text.length > PREVIEW_CHAR_LIMIT ? `${text.slice(0, PREVIEW_CHAR_LIMIT)}…` : text;
    }

    return null;
  }

  private toPublicArtifact(record: ArtifactRecord): Artifact {
    const { userId: _userId, ...artifact } = record;
    return artifact;
  }
}

export const artifactsService = new ArtifactsService();
