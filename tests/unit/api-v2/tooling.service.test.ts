import { ToolingService } from '../../../src/services/api-v2/tooling.service';

describe('ToolingService', () => {
  let service: ToolingService;

  beforeEach(() => {
    service = new ToolingService();
  });

  it('creates a queued sandbox job with diagnostics and sanitized metadata', async () => {
    const job = await service.createNodeScriptJob({
      userId: 'user-123',
      sessionId: 'session-123',
      source: 'console.log("hello")',
      timeoutMs: 1234,
      metadata: {
        requestedArtifact: 'console-output',
        nested: { keep: true }
      }
    });

    expect(job.type).toBe('run-node-script');
    expect(job.status).toBe('queued');
    expect(job.timeoutMs).toBeGreaterThanOrEqual(500);
    expect(job.timeoutMs).toBeLessThanOrEqual(60000);
    expect(job.source.hash).toHaveLength(64);
    expect(job.source.preview).toContain('console.log');
    expect(job.diagnostics.executionEnabled).toBe(false);
    expect(job.warnings.length).toBeGreaterThan(0);
    expect(job.metadata).toEqual({
      requestedArtifact: 'console-output',
      nested: { keep: true }
    });
  });

  it('rejects oversized source payloads', async () => {
    const oversized = 'a'.repeat(4100);

    await expect(
      service.createNodeScriptJob({
        userId: 'user-1',
        sessionId: 'session-1',
        source: oversized
      })
    ).rejects.toThrow('source überschreitet das Limit von 4000 Zeichen');
  });

  it('throws when retrieving job for another user', async () => {
    const job = await service.createNodeScriptJob({
      userId: 'owner-1',
      sessionId: 'session-1',
      source: 'console.log("ok")'
    });

    await expect(service.getJobForUser(job.id, 'other-user')).rejects.toThrow('Tool-Job wurde nicht gefunden');

    const ownJob = await service.getJobForUser(job.id, 'owner-1');
    expect(ownJob.id).toBe(job.id);
  });
});
