import { NextFunction, Request, Response } from 'express';
interface EndpointMetrics {
    requests: number;
    errors: number;
    totalDurationMs: number;
    rateLimited: number;
}
declare class ApiV2MetricsRegistry {
    private readonly metrics;
    recordRequest(endpoint: string, statusCode: number, durationMs: number): void;
    recordRateLimit(endpoint: string): void;
    snapshot(): Record<string, EndpointMetrics & {
        p50DurationMs: number;
        p95DurationMs: number;
    }>;
    private getOrCreate;
    reset(): void;
}
export declare const apiV2Metrics: ApiV2MetricsRegistry;
export declare const apiV2MetricsMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const apiV2MetricsHandler: (req: Request, res: Response) => void;
export {};
//# sourceMappingURL=metrics.d.ts.map