"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const response_1 = require("../utils/response");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
router.get('/profile', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const user = await userService.getUserById(userId);
    return response_1.ResponseUtils.success(res, user);
}));
router.put('/profile', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { fullName, company } = req.body;
    const validation = validation_1.ValidationUtils.combine(validation_1.ValidationUtils.required(fullName, 'fullName'), validation_1.ValidationUtils.required(company, 'company'));
    if (!validation.isValid) {
        return response_1.ResponseUtils.validationError(res, validation.errors);
    }
    const updatedUser = await userService.updateUser(userId, fullName, company);
    return response_1.ResponseUtils.success(res, updatedUser, 'Profile updated successfully');
}));
router.get('/preferences', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const preferences = await userService.getUserPreferences(userId);
    return response_1.ResponseUtils.success(res, preferences);
}));
router.put('/preferences', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { companiesOfInterest, preferredTopics, notificationSettings } = req.body;
    const updatedPreferences = await userService.updateUserPreferences(userId, {
        companies_of_interest: companiesOfInterest,
        preferred_topics: preferredTopics,
        notification_settings: notificationSettings
    });
    return response_1.ResponseUtils.success(res, updatedPreferences, 'Preferences updated successfully');
}));
router.get('/documents', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const documents = await require('../config/database').default.query('SELECT id, title, description, file_size, created_at FROM documents WHERE is_active = true ORDER BY created_at DESC');
    res.json({
        success: true,
        data: documents.rows
    });
}));
router.get('/documents/:documentId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { documentId } = req.params;
    const document = await require('../config/database').default.query('SELECT id, title, description, file_path, mime_type FROM documents WHERE id = $1 AND is_active = true', [documentId]);
    if (document.rows.length === 0) {
        return response_1.ResponseUtils.notFound(res, 'Document');
    }
    return res.json({
        success: true,
        data: document.rows[0]
    });
}));
router.get('/stats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const pool = require('../config/database').default;
    const totalChats = await pool.query('SELECT COUNT(*) as count FROM chats WHERE user_id = $1', [userId]);
    const totalMessages = await pool.query('SELECT COUNT(*) as count FROM messages m JOIN chats c ON m.chat_id = c.id WHERE c.user_id = $1', [userId]);
    const recentActivity = await pool.query('SELECT COUNT(*) as count FROM messages m JOIN chats c ON m.chat_id = c.id WHERE c.user_id = $1 AND m.created_at > NOW() - INTERVAL \'30 days\'', [userId]);
    res.json({
        success: true,
        data: {
            totalChats: parseInt(totalChats.rows[0].count),
            totalMessages: parseInt(totalMessages.rows[0].count),
            recentActivity: parseInt(recentActivity.rows[0].count)
        }
    });
}));
exports.default = router;
//# sourceMappingURL=user.backup.js.map