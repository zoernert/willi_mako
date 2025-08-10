// Feature Flag Utility
// CR-COMMUNITY-HUB-001
// Autor: AI Assistant
// Datum: 2025-08-09

import { validateCommunityEnv } from './communityValidation';

// Parse and validate environment variables
const envConfig = validateCommunityEnv();

/**
 * Check if a feature flag is enabled
 * @param flag Feature flag name
 * @returns boolean indicating if feature is enabled
 */
export const isFeatureEnabled = (flag: keyof typeof envConfig): boolean => {
  return envConfig[flag] as boolean;
};

/**
 * Get community configuration
 * @returns Parsed community environment configuration
 */
export const getCommunityConfig = () => envConfig;

/**
 * Feature flag constants for type safety
 */
export const FEATURE_FLAGS = {
  COMMUNITY_HUB: 'FEATURE_COMMUNITY_HUB',
  COMMUNITY_ESCALATION: 'FEATURE_COMMUNITY_ESCALATION',
  COMMUNITY_PUBLIC_READ: 'COMMUNITY_ENABLE_PUBLIC_READ'
} as const;

/**
 * Middleware to check if community hub is enabled
 */
export const requireCommunityFeature = (req: any, res: any, next: any) => {
  if (!isFeatureEnabled('FEATURE_COMMUNITY_HUB')) {
    return res.status(404).json({
      success: false,
      message: 'Community Hub feature is not enabled'
    });
  }
  next();
};

/**
 * Check if user can read community content (public or authenticated)
 */
export const canReadCommunity = (isAuthenticated: boolean): boolean => {
  return isAuthenticated || isFeatureEnabled('COMMUNITY_ENABLE_PUBLIC_READ');
};

/**
 * Get rate limit configuration
 */
export const getRateLimits = () => ({
  patchOpsPerFiveMin: 30,
  commentsPerFiveMin: 10,
  threadsPerHour: 5
});

/**
 * Log feature flag usage for analytics
 */
export const logFeatureUsage = (flag: string, context?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[FEATURE] ${flag} used`, context);
  }
  // In production, this would send to analytics service
};
