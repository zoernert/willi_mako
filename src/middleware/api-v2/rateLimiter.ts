import { NextFunction, Request, Response } from 'express';
import { apiV2Metrics } from './metrics';

interface RateLimiterOptions {
  capacity: number;
  refillTokens: number;
  intervalMs: number;
}

interface TokenBucketState {
  tokens: number;
  lastRefill: number;
}

const DEFAULT_OPTIONS: RateLimiterOptions = {
  capacity: Number(process.env.API_V2_RATE_LIMIT_CAPACITY || 20),
  refillTokens: Number(process.env.API_V2_RATE_LIMIT_REFILL || 20),
  intervalMs: Number(process.env.API_V2_RATE_LIMIT_INTERVAL_MS || 60_000)
};

const buckets = new Map<string, TokenBucketState>();

const disabled = process.env.API_V2_RATE_LIMIT_DISABLED === 'true';

function resolveKey(req: Request): string {
  const sessionId = (req.body?.sessionId as string) || (req.headers['x-session-id'] as string);
  if (sessionId) {
    return `session:${sessionId}`;
  }

  const user = (req as any).user;
  if (user?.id) {
    return `user:${user.id}`;
  }

  return `ip:${req.ip}`;
}

function getEndpointKey(req: Request): string {
  return `${req.method} ${req.baseUrl}${req.route ? req.route.path : req.path}`;
}

function consumeToken(key: string, options: RateLimiterOptions): boolean {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: options.capacity, lastRefill: now };

  const elapsed = now - bucket.lastRefill;
  if (elapsed > 0) {
    const tokensToAdd = (elapsed / options.intervalMs) * options.refillTokens;
    bucket.tokens = Math.min(options.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return false;
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return true;
}

export const apiV2RateLimiter = (options: Partial<RateLimiterOptions> = {}) => {
  const resolvedOptions: RateLimiterOptions = {
    ...DEFAULT_OPTIONS,
    ...options
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    if (disabled) {
      return next();
    }

    const key = resolveKey(req);
    const endpointKey = getEndpointKey(req);

    if (!consumeToken(`${key}:${endpointKey}`, resolvedOptions)) {
      apiV2Metrics.recordRateLimit(endpointKey);
      res.status(429).json({
        success: false,
        error: {
          message: 'Rate-Limit erreicht. Bitte warte einen Moment und versuche es erneut.',
          code: 'RATE_LIMITED'
        }
      });
      return;
    }

    next();
  };
};
