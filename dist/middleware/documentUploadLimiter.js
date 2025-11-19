"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchDocumentUploadLimiter = exports.singleDocumentUploadLimiter = exports.documentUploadLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
/**
 * Custom rate limiter for document upload routes
 * Allows more requests than the global limiter to support batch uploads
 */
exports.documentUploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.DOCUMENT_UPLOAD_RATE_WINDOW || '5') * 60 * 1000, // 5 minutes
    max: parseInt(process.env.DOCUMENT_UPLOAD_RATE_MAX || '50'), // 50 requests per 5 minutes
    message: {
        error: 'Too many upload requests. Please wait a moment before uploading more documents.',
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Skip rate limiting for admin users (optional)
    skip: (req) => {
        const user = req.user;
        return (user === null || user === void 0 ? void 0 : user.role) === 'admin';
    }
});
/**
 * More lenient rate limiter for individual file uploads
 * Used when uploading single documents
 */
exports.singleDocumentUploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.DOCUMENT_UPLOAD_RATE_WINDOW || '5') * 60 * 1000,
    max: parseInt(process.env.DOCUMENT_UPLOAD_RATE_MAX_SINGLE || '30'),
    message: {
        error: 'Too many upload requests. Please wait before uploading another document.',
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
    },
    skip: (req) => {
        const user = req.user;
        return (user === null || user === void 0 ? void 0 : user.role) === 'admin';
    }
});
/**
 * Very lenient rate limiter for batch uploads
 * Used when uploading multiple documents at once
 */
exports.batchDocumentUploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.DOCUMENT_UPLOAD_RATE_WINDOW || '5') * 60 * 1000,
    max: parseInt(process.env.DOCUMENT_UPLOAD_RATE_MAX_BATCH || '20'),
    message: {
        error: 'Too many batch upload requests. Please wait before uploading more documents.',
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
    },
    skip: (req) => {
        const user = req.user;
        return (user === null || user === void 0 ? void 0 : user.role) === 'admin';
    }
});
//# sourceMappingURL=documentUploadLimiter.js.map