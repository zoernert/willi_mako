"use strict";
// Feature Flag Utility
// CR-COMMUNITY-HUB-001
// Autor: AI Assistant
// Datum: 2025-08-09
Object.defineProperty(exports, "__esModule", { value: true });
exports.logFeatureUsage = exports.getRateLimits = exports.canReadCommunity = exports.requireCommunityFeature = exports.FEATURE_FLAGS = exports.getCommunityConfig = exports.isFeatureEnabled = void 0;
const communityValidation_1 = require("./communityValidation");
// Parse and validate environment variables
const envConfig = (0, communityValidation_1.validateCommunityEnv)();
/**
 * Check if a feature flag is enabled
 * @param flag Feature flag name
 * @returns boolean indicating if feature is enabled
 */
const isFeatureEnabled = (flag) => {
    return envConfig[flag];
};
exports.isFeatureEnabled = isFeatureEnabled;
/**
 * Get community configuration
 * @returns Parsed community environment configuration
 */
const getCommunityConfig = () => envConfig;
exports.getCommunityConfig = getCommunityConfig;
/**
 * Feature flag constants for type safety
 */
exports.FEATURE_FLAGS = {
    COMMUNITY_HUB: 'FEATURE_COMMUNITY_HUB',
    COMMUNITY_ESCALATION: 'FEATURE_COMMUNITY_ESCALATION',
    COMMUNITY_PUBLIC_READ: 'COMMUNITY_ENABLE_PUBLIC_READ'
};
/**
 * Middleware to check if community hub is enabled
 */
const requireCommunityFeature = (req, res, next) => {
    if (!(0, exports.isFeatureEnabled)('FEATURE_COMMUNITY_HUB')) {
        return res.status(404).json({
            success: false,
            message: 'Community Hub feature is not enabled'
        });
    }
    next();
};
exports.requireCommunityFeature = requireCommunityFeature;
/**
 * Check if user can read community content (public or authenticated)
 */
const canReadCommunity = (isAuthenticated) => {
    return isAuthenticated || (0, exports.isFeatureEnabled)('COMMUNITY_ENABLE_PUBLIC_READ');
};
exports.canReadCommunity = canReadCommunity;
/**
 * Get rate limit configuration
 */
const getRateLimits = () => ({
    patchOpsPerFiveMin: 30,
    commentsPerFiveMin: 10,
    threadsPerHour: 5
});
exports.getRateLimits = getRateLimits;
/**
 * Log feature flag usage for analytics
 */
const logFeatureUsage = (flag, context) => {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[FEATURE] ${flag} used`, context);
    }
    // In production, this would send to analytics service
};
exports.logFeatureUsage = logFeatureUsage;
//# sourceMappingURL=featureFlags.js.map