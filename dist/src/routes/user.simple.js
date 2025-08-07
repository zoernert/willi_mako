"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
// Legacy routes - replaced by new user routes
// These are kept for backward compatibility but redirect to new endpoints
router.get('/profile', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    response_1.ResponseUtils.success(res, { message: 'Please use /api/auth/profile instead' }, 'Legacy route deprecated');
}));
router.put('/profile', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    response_1.ResponseUtils.success(res, { message: 'Please use /api/auth/profile instead' }, 'Legacy route deprecated');
}));
router.get('/preferences', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    response_1.ResponseUtils.success(res, { message: 'Please use /api/auth/preferences instead' }, 'Legacy route deprecated');
}));
router.put('/preferences', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    response_1.ResponseUtils.success(res, { message: 'Please use /api/auth/preferences instead' }, 'Legacy route deprecated');
}));
exports.default = router;
//# sourceMappingURL=user.simple.js.map