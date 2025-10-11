import { apiV2RateLimiter } from '../../../src/middleware/api-v2/rateLimiter';
import { apiV2Metrics } from '../../../src/middleware/api-v2/metrics';

describe('apiV2RateLimiter', () => {
  beforeEach(() => {
    apiV2Metrics.reset();
  });

  it('limits requests per session and endpoint', () => {
    const middleware = apiV2RateLimiter({ capacity: 2, refillTokens: 0, intervalMs: 60_000 });

    const reqBase = {
      method: 'POST',
      baseUrl: '/api/v2',
      path: '/chat',
      body: { sessionId: 'session-test' },
      headers: {},
      ip: '127.0.0.1'
    } as any;

    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    const next = jest.fn();

    middleware(reqBase, res, next);
    middleware(reqBase, res, next);
    middleware(reqBase, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);

    const snapshot = apiV2Metrics.snapshot();
    expect(snapshot['POST /api/v2/chat'].rateLimited).toBe(1);
  });
});
