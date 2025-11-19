/**
 * Custom rate limiter for document upload routes
 * Allows more requests than the global limiter to support batch uploads
 */
export declare const documentUploadLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * More lenient rate limiter for individual file uploads
 * Used when uploading single documents
 */
export declare const singleDocumentUploadLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Very lenient rate limiter for batch uploads
 * Used when uploading multiple documents at once
 */
export declare const batchDocumentUploadLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=documentUploadLimiter.d.ts.map