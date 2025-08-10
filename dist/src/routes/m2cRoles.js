"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const errors_1 = require("../utils/errors");
const response_1 = require("../utils/response");
const m2cRoleService_1 = __importDefault(require("../services/m2cRoleService"));
const router = (0, express_1.Router)();
/**
 * Get all available M2C roles
 * GET /api/m2c-roles
 */
router.get('/m2c-roles', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (process.env.ENABLE_M2C_ROLES !== 'true') {
        throw new errors_1.AppError('M2C Rollen Feature ist nicht aktiviert', 404);
    }
    const roles = await m2cRoleService_1.default.getAllRoles();
    // Only expose public fields for the role list
    const publicRoles = roles.map(role => ({
        id: role.id,
        role_name: role.role_name,
        short_description: role.short_description
    }));
    response_1.ResponseUtils.success(res, publicRoles, 'M2C-Rollen erfolgreich abgerufen');
}));
/**
 * Get user's selected M2C roles
 * GET /api/users/me/m2c-roles
 */
router.get('/users/me/m2c-roles', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (process.env.ENABLE_M2C_ROLES !== 'true') {
        throw new errors_1.AppError('M2C Rollen Feature ist nicht aktiviert', 404);
    }
    const userId = req.user.id;
    const selection = await m2cRoleService_1.default.getUserRoleSelection(userId);
    const response = {
        roleIds: selection.roleIds,
        roles: selection.roles.map(role => ({
            id: role.id,
            role_name: role.role_name,
            short_description: role.short_description
        }))
    };
    response_1.ResponseUtils.success(res, response, 'Benutzer M2C-Rollen erfolgreich abgerufen');
}));
/**
 * Update user's selected M2C roles
 * PUT /api/users/me/m2c-roles
 */
router.put('/users/me/m2c-roles', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (process.env.ENABLE_M2C_ROLES !== 'true') {
        throw new errors_1.AppError('M2C Rollen Feature ist nicht aktiviert', 404);
    }
    const userId = req.user.id;
    const { roleIds } = req.body;
    // Validate input
    if (!Array.isArray(roleIds)) {
        throw new errors_1.AppError('roleIds muss ein Array sein', 400);
    }
    // Validate that all elements are strings
    const invalidTypes = roleIds.filter(id => typeof id !== 'string');
    if (invalidTypes.length > 0) {
        throw new errors_1.AppError('Alle roleIds müssen Strings sein', 400);
    }
    try {
        await m2cRoleService_1.default.updateUserRoleSelection(userId, roleIds);
        response_1.ResponseUtils.success(res, { roleIds }, 'M2C-Rollen erfolgreich aktualisiert');
    }
    catch (error) {
        if (error instanceof Error) {
            throw new errors_1.AppError(error.message, 400);
        }
        throw error;
    }
}));
/**
 * Get M2C roles cache statistics (for monitoring/debugging)
 * GET /api/m2c-roles/stats
 */
router.get('/m2c-roles/stats', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // Only allow admin users to see cache stats
    if (req.user.role !== 'admin') {
        throw new errors_1.AppError('Zugriff verweigert', 403);
    }
    const stats = m2cRoleService_1.default.getCacheStats();
    response_1.ResponseUtils.success(res, stats, 'M2C-Rollen Cache-Statistiken');
}));
exports.default = router;
//# sourceMappingURL=m2cRoles.js.map