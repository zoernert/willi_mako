declare const envConfig: {
    QDRANT_COMMUNITY_COLLECTION: string;
    COMMUNITY_MAX_PROPOSALS: number;
    COMMUNITY_ENABLE_PUBLIC_READ: boolean;
    FEATURE_COMMUNITY_HUB: boolean;
    FEATURE_COMMUNITY_ESCALATION: boolean;
};
/**
 * Check if a feature flag is enabled
 * @param flag Feature flag name
 * @returns boolean indicating if feature is enabled
 */
export declare const isFeatureEnabled: (flag: keyof typeof envConfig) => boolean;
/**
 * Get community configuration
 * @returns Parsed community environment configuration
 */
export declare const getCommunityConfig: () => {
    QDRANT_COMMUNITY_COLLECTION: string;
    COMMUNITY_MAX_PROPOSALS: number;
    COMMUNITY_ENABLE_PUBLIC_READ: boolean;
    FEATURE_COMMUNITY_HUB: boolean;
    FEATURE_COMMUNITY_ESCALATION: boolean;
};
/**
 * Feature flag constants for type safety
 */
export declare const FEATURE_FLAGS: {
    readonly COMMUNITY_HUB: "FEATURE_COMMUNITY_HUB";
    readonly COMMUNITY_ESCALATION: "FEATURE_COMMUNITY_ESCALATION";
    readonly COMMUNITY_PUBLIC_READ: "COMMUNITY_ENABLE_PUBLIC_READ";
};
/**
 * Middleware to check if community hub is enabled
 */
export declare const requireCommunityFeature: (req: any, res: any, next: any) => any;
/**
 * Check if user can read community content (public or authenticated)
 */
export declare const canReadCommunity: (isAuthenticated: boolean) => boolean;
/**
 * Get rate limit configuration
 */
export declare const getRateLimits: () => {
    patchOpsPerFiveMin: number;
    commentsPerFiveMin: number;
    threadsPerHour: number;
};
/**
 * Log feature flag usage for analytics
 */
export declare const logFeatureUsage: (flag: string, context?: any) => void;
export {};
//# sourceMappingURL=featureFlags.d.ts.map