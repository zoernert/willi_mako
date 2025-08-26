export = googleAIKeyManager;
declare const googleAIKeyManager: GoogleAIKeyManager;
/**
 * API Key Manager Service
 * Handles intelligent switching between free and paid Google AI API keys
 * based on quota usage
 */
declare class GoogleAIKeyManager {
    freeApiKey: string;
    paidApiKey: string;
    usageCounter: {
        free: {
            dailyUsage: number;
            dailyLimit: number;
            minuteUsage: number;
            minuteLimit: number;
            lastMinute: string;
            lastDay: string;
        };
    };
    usageMetrics: {
        free: {
            dailyUsage: {};
            totalUsage: number;
            lastReset: any;
            currentDayUsage: number;
        };
        paid: {
            dailyUsage: {};
            totalUsage: number;
            lastReset: any;
            currentDayUsage: number;
        };
        summary: {
            currentDay: string;
            costSavings: {
                totalFreeRequests: number;
                costSavingsUSD: string;
                costSavingsEUR: string;
            };
        };
    };
    backoffTimes: number[];
    currentBackoff: number;
    freeGenAI: GoogleGenerativeAI;
    paidGenAI: GoogleGenerativeAI;
    /**
     * Get the current minute for rate limiting
     */
    getCurrentMinute(): string;
    /**
     * Get the current day for daily quota tracking
     */
    getCurrentDay(): string;
    /**
     * Check and update rate limits for the current time period
     */
    updateRateLimits(): void;
    /**
     * Increment usage counters after using the free API key
     */
    incrementUsage(): void;
    /**
     * Check if free tier limits have been reached
     */
    isFreeQuotaAvailable(): boolean;
    /**
     * Sleep for specified milliseconds
     */
    sleep(ms: any): Promise<any>;
    /**
     * Get the appropriate Generative AI instance based on quota availability
     * Will try to use free tier first with intelligent backoff strategy
     * @param {string} model - The model name to use
     * @returns {Object} A configured Google Generative AI model instance
     */
    getGenerativeModel(options: any): any;
    /**
     * Get the raw GoogleGenerativeAI instance (either free or paid)
     * based on quota availability
     */
    getGenAI(): GoogleGenerativeAI;
    /**
     * Load metrics from persistent storage
     */
    loadMetrics(): Promise<void>;
    /**
     * Save metrics to persistent storage
     */
    saveMetrics(): Promise<void>;
    /**
     * Track API key usage
     * @param {string} keyType - Either 'free' or 'paid'
     */
    trackKeyUsage(keyType: string): void;
    /**
     * Get usage metrics for admin dashboard
     * @returns {Object} The usage metrics for both API keys
     */
    getUsageMetrics(): any;
    /**
     * Calculate estimated cost savings from using free tier
     * @returns {Object} Cost savings information
     */
    calculateCostSavings(): any;
}
import { GoogleGenerativeAI } from "@google/generative-ai";
//# sourceMappingURL=googleAIKeyManager.d.ts.map