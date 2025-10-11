import { NextFunction, Request, Response } from 'express';

interface EndpointMetrics {
  requests: number;
  errors: number;
  totalDurationMs: number;
  rateLimited: number;
}

class ApiV2MetricsRegistry {
  private readonly metrics = new Map<string, EndpointMetrics>();

  public recordRequest(endpoint: string, statusCode: number, durationMs: number): void {
    const entry = this.getOrCreate(endpoint);
    entry.requests += 1;
    entry.totalDurationMs += durationMs;

    if (statusCode >= 400) {
      entry.errors += 1;
    }
  }

  public recordRateLimit(endpoint: string): void {
    const entry = this.getOrCreate(endpoint);
    entry.rateLimited += 1;
  }

  public snapshot(): Record<string, EndpointMetrics & { p50DurationMs: number; p95DurationMs: number }> {
    const result: Record<string, EndpointMetrics & { p50DurationMs: number; p95DurationMs: number }> = {};

    for (const [endpoint, metrics] of this.metrics.entries()) {
      const averageDuration = metrics.requests > 0 ? metrics.totalDurationMs / metrics.requests : 0;
      // Placeholder percentiles until more advanced metrics store is implemented
      result[endpoint] = {
        ...metrics,
        p50DurationMs: averageDuration,
        p95DurationMs: averageDuration
      };
    }

    return result;
  }

  private getOrCreate(endpoint: string): EndpointMetrics {
    const existing = this.metrics.get(endpoint);
    if (existing) {
      return existing;
    }

    const initial: EndpointMetrics = {
      requests: 0,
      errors: 0,
      totalDurationMs: 0,
      rateLimited: 0
    };

    this.metrics.set(endpoint, initial);
    return initial;
  }

  public reset(): void {
    this.metrics.clear();
  }
}

export const apiV2Metrics = new ApiV2MetricsRegistry();

export const apiV2MetricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    const key = `${req.method} ${req.baseUrl}${req.route ? req.route.path : req.path}`;

    apiV2Metrics.recordRequest(key, res.statusCode, durationMs);
  });

  next();
};

export const apiV2MetricsHandler = (req: Request, res: Response): void => {
  res.json({
    success: true,
    data: apiV2Metrics.snapshot()
  });
};
