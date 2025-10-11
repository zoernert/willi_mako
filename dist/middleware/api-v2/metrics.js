"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiV2MetricsHandler = exports.apiV2MetricsMiddleware = exports.apiV2Metrics = void 0;
class ApiV2MetricsRegistry {
    constructor() {
        this.metrics = new Map();
    }
    recordRequest(endpoint, statusCode, durationMs) {
        const entry = this.getOrCreate(endpoint);
        entry.requests += 1;
        entry.totalDurationMs += durationMs;
        if (statusCode >= 400) {
            entry.errors += 1;
        }
    }
    recordRateLimit(endpoint) {
        const entry = this.getOrCreate(endpoint);
        entry.rateLimited += 1;
    }
    snapshot() {
        const result = {};
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
    getOrCreate(endpoint) {
        const existing = this.metrics.get(endpoint);
        if (existing) {
            return existing;
        }
        const initial = {
            requests: 0,
            errors: 0,
            totalDurationMs: 0,
            rateLimited: 0
        };
        this.metrics.set(endpoint, initial);
        return initial;
    }
    reset() {
        this.metrics.clear();
    }
}
exports.apiV2Metrics = new ApiV2MetricsRegistry();
const apiV2MetricsMiddleware = (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1000000;
        const key = `${req.method} ${req.baseUrl}${req.route ? req.route.path : req.path}`;
        exports.apiV2Metrics.recordRequest(key, res.statusCode, durationMs);
    });
    next();
};
exports.apiV2MetricsMiddleware = apiV2MetricsMiddleware;
const apiV2MetricsHandler = (req, res) => {
    res.json({
        success: true,
        data: exports.apiV2Metrics.snapshot()
    });
};
exports.apiV2MetricsHandler = apiV2MetricsHandler;
//# sourceMappingURL=metrics.js.map