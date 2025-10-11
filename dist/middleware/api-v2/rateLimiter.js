"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiV2RateLimiter = void 0;
const metrics_1 = require("./metrics");
const DEFAULT_OPTIONS = {
    capacity: Number(process.env.API_V2_RATE_LIMIT_CAPACITY || 20),
    refillTokens: Number(process.env.API_V2_RATE_LIMIT_REFILL || 20),
    intervalMs: Number(process.env.API_V2_RATE_LIMIT_INTERVAL_MS || 60000)
};
const buckets = new Map();
const disabled = process.env.API_V2_RATE_LIMIT_DISABLED === 'true';
function resolveKey(req) {
    var _a;
    const sessionId = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.sessionId) || req.headers['x-session-id'];
    if (sessionId) {
        return `session:${sessionId}`;
    }
    const user = req.user;
    if (user === null || user === void 0 ? void 0 : user.id) {
        return `user:${user.id}`;
    }
    return `ip:${req.ip}`;
}
function getEndpointKey(req) {
    return `${req.method} ${req.baseUrl}${req.route ? req.route.path : req.path}`;
}
function consumeToken(key, options) {
    var _a;
    const now = Date.now();
    const bucket = (_a = buckets.get(key)) !== null && _a !== void 0 ? _a : { tokens: options.capacity, lastRefill: now };
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
const apiV2RateLimiter = (options = {}) => {
    const resolvedOptions = {
        ...DEFAULT_OPTIONS,
        ...options
    };
    return (req, res, next) => {
        if (disabled) {
            return next();
        }
        const key = resolveKey(req);
        const endpointKey = getEndpointKey(req);
        if (!consumeToken(`${key}:${endpointKey}`, resolvedOptions)) {
            metrics_1.apiV2Metrics.recordRateLimit(endpointKey);
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
exports.apiV2RateLimiter = apiV2RateLimiter;
//# sourceMappingURL=rateLimiter.js.map