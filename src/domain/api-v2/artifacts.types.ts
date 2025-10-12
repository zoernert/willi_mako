export type ArtifactEncoding = 'utf8' | 'base64';

export interface ArtifactStorage {
  mode: 'inline';
  encoding: ArtifactEncoding;
  content: string;
}

export interface ArtifactOptionalMetadata {
  description?: string;
  version?: string;
  tags?: string[];
  metadata?: Record<string, unknown> | null;
}

export interface Artifact extends ArtifactOptionalMetadata {
  id: string;
  sessionId: string;
  name: string;
  type: string;
  mimeType: string;
  byteSize: number;
  checksum: string;
  createdAt: string;
  updatedAt: string;
  storage: ArtifactStorage;
  preview: string | null;
}

export interface CreateArtifactRequestBody extends ArtifactOptionalMetadata {
  sessionId: string;
  type: string;
  name: string;
  mimeType: string;
  encoding: ArtifactEncoding;
  content: string;
}

export interface CreateArtifactResponseBody {
  sessionId: string;
  artifact: Artifact;
}
