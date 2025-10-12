import { ArtifactsService } from '../../../src/services/api-v2/artifacts.service';

const BASE64_SAMPLE = Buffer.from('console.log("hello artifact")', 'utf8').toString('base64');

describe('ArtifactsService', () => {
  let service: ArtifactsService;

  beforeEach(() => {
    service = new ArtifactsService();
  });

  it('creates an inline artifact with checksum and preview', async () => {
    const artifact = await service.createArtifact({
      userId: 'user-1',
      sessionId: 'session-1',
      name: 'package.json',
      type: 'code',
      mimeType: 'application/json',
      encoding: 'utf8',
      content: '{"name":"demo"}',
      description: 'Generated package manifest',
      tags: ['manifest', 'npm'],
      metadata: { requestedBy: 'tooling-service' }
    });

    expect(artifact.storage.encoding).toBe('utf8');
    expect(artifact.byteSize).toBeGreaterThan(0);
    expect(artifact.checksum).toHaveLength(64);
    expect(artifact.preview).toContain('"name"');
    expect(artifact.tags).toEqual(['manifest', 'npm']);
    expect(artifact.metadata).toEqual({ requestedBy: 'tooling-service' });
  });

  it('accepts base64 content and normalises metadata', async () => {
    const artifact = await service.createArtifact({
      userId: 'user-2',
      sessionId: 'session-2',
      name: 'bundle.tar.gz',
      type: 'binary',
      mimeType: 'application/gzip',
      encoding: 'base64',
      content: BASE64_SAMPLE,
      version: 'v1.0.0',
      metadata: { sizeHint: 42 }
    });

    expect(artifact.storage.encoding).toBe('base64');
    expect(artifact.preview).not.toBeNull();
    expect(artifact.version).toBe('v1.0.0');
  });

  it('rejects oversize payloads', async () => {
    const bigContent = Buffer.alloc(210_000).toString('base64');

    await expect(
      service.createArtifact({
        userId: 'user-1',
        sessionId: 'session-1',
        name: 'too-big.bin',
        type: 'binary',
        mimeType: 'application/octet-stream',
        encoding: 'base64',
        content: bigContent
      })
    ).rejects.toThrow('content überschreitet das Limit');
  });

  it('enforces ownership when retrieving artifacts', async () => {
    const artifact = await service.createArtifact({
      userId: 'owner',
      sessionId: 'session-1',
      name: 'readme.md',
      type: 'text',
      mimeType: 'text/markdown',
      encoding: 'utf8',
      content: '# Hello'
    });

    await expect(service.getArtifactForUser(artifact.id, 'stranger')).rejects.toThrow('Artefakt wurde nicht gefunden');

    const ownArtifact = await service.getArtifactForUser(artifact.id, 'owner');
    expect(ownArtifact.id).toBe(artifact.id);
  });
});
