"use strict";
// Validation middleware for bilateral clarifications
// Created: 12. August 2025
// Description: Input validation for bilateral clarification endpoints
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSearch = exports.validatePagination = exports.validateUUID = exports.validateComment = exports.validateNote = exports.validateClarification = void 0;
const express_validator_1 = require("express-validator");
// Helper function to check validation results
const checkValidationResult = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};
// Validation rules for creating/updating clarifications
exports.validateClarification = [
    (0, express_validator_1.body)('title')
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage('Title must be between 3 and 255 characters'),
    (0, express_validator_1.body)('description')
        .trim()
        .isLength({ min: 10, max: 5000 })
        .withMessage('Description must be between 10 and 5000 characters'),
    (0, express_validator_1.body)('priority')
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Priority must be one of: low, medium, high, urgent'),
    (0, express_validator_1.body)('category')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Category must be between 2 and 100 characters'),
    (0, express_validator_1.body)('deadline')
        .optional()
        .isISO8601()
        .withMessage('Deadline must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('assignedToId')
        .optional()
        .isUUID()
        .withMessage('Assigned user ID must be a valid UUID'),
    (0, express_validator_1.body)('externalParty')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('External party must be less than 255 characters'),
    (0, express_validator_1.body)('regulatoryReference')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Regulatory reference must be less than 255 characters'),
    (0, express_validator_1.body)('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array'),
    (0, express_validator_1.body)('tags.*')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Each tag must be between 1 and 50 characters'),
    checkValidationResult
];
// Validation rules for creating/updating notes
exports.validateNote = [
    (0, express_validator_1.body)('content')
        .trim()
        .isLength({ min: 1, max: 5000 })
        .withMessage('Note content must be between 1 and 5000 characters'),
    (0, express_validator_1.body)('isPrivate')
        .optional()
        .isBoolean()
        .withMessage('isPrivate must be a boolean value'),
    (0, express_validator_1.body)('clarificationId')
        .isUUID()
        .withMessage('Clarification ID must be a valid UUID'),
    checkValidationResult
];
// Validation rules for creating/updating comments
exports.validateComment = [
    (0, express_validator_1.body)('content')
        .trim()
        .isLength({ min: 1, max: 2000 })
        .withMessage('Comment content must be between 1 and 2000 characters'),
    (0, express_validator_1.body)('clarificationId')
        .isUUID()
        .withMessage('Clarification ID must be a valid UUID'),
    (0, express_validator_1.body)('parentCommentId')
        .optional()
        .isUUID()
        .withMessage('Parent comment ID must be a valid UUID'),
    checkValidationResult
];
// Additional validation helpers that might be useful
const validateUUID = (paramName) => [
    (0, express_validator_1.body)(paramName)
        .isUUID()
        .withMessage(`${paramName} must be a valid UUID`),
    checkValidationResult
];
exports.validateUUID = validateUUID;
const validatePagination = (req, res, next) => {
    const { page, limit } = req.query;
    if (page && (isNaN(Number(page)) || Number(page) < 1)) {
        return res.status(400).json({
            success: false,
            message: 'Page must be a positive integer'
        });
    }
    if (limit && (isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
        return res.status(400).json({
            success: false,
            message: 'Limit must be a positive integer between 1 and 100'
        });
    }
    next();
};
exports.validatePagination = validatePagination;
const validateSearch = (req, res, next) => {
    const { search } = req.query;
    if (search && typeof search === 'string' && search.length > 255) {
        return res.status(400).json({
            success: false,
            message: 'Search query must be less than 255 characters'
        });
    }
    next();
};
exports.validateSearch = validateSearch;
//# sourceMappingURL=validation.js.map