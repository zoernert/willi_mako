import { NextFunction, Request, Response } from 'express';
interface RateLimiterOptions {
    capacity: number;
    refillTokens: number;
    intervalMs: number;
}
export declare const apiV2RateLimiter: (options?: Partial<RateLimiterOptions>) => (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=rateLimiter.d.ts.map