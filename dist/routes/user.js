"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
router.get('/profile', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const user = await database_1.default.query('SELECT id, email, full_name, company, created_at FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) {
        throw new errorHandler_1.AppError('User not found', 404);
    }
    res.json({
        success: true,
        data: user.rows[0]
    });
}));
router.put('/profile', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { fullName, company } = req.body;
    const result = await database_1.default.query('UPDATE users SET full_name = $1, company = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, email, full_name, company', [fullName, company, userId]);
    if (result.rows.length === 0) {
        throw new errorHandler_1.AppError('User not found', 404);
    }
    res.json({
        success: true,
        data: result.rows[0]
    });
}));
router.get('/preferences', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const preferences = await database_1.default.query('SELECT companies_of_interest, preferred_topics, notification_settings FROM user_preferences WHERE user_id = $1', [userId]);
    if (preferences.rows.length === 0) {
        await database_1.default.query('INSERT INTO user_preferences (user_id) VALUES ($1)', [userId]);
        res.json({
            success: true,
            data: {
                companies_of_interest: [],
                preferred_topics: [],
                notification_settings: {}
            }
        });
    }
    else {
        res.json({
            success: true,
            data: preferences.rows[0]
        });
    }
}));
router.put('/preferences', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { companiesOfInterest, preferredTopics, notificationSettings } = req.body;
    const result = await database_1.default.query(`UPDATE user_preferences 
     SET companies_of_interest = $1, preferred_topics = $2, notification_settings = $3, updated_at = CURRENT_TIMESTAMP 
     WHERE user_id = $4 
     RETURNING companies_of_interest, preferred_topics, notification_settings`, [
        JSON.stringify(companiesOfInterest || []),
        JSON.stringify(preferredTopics || []),
        JSON.stringify(notificationSettings || {}),
        userId
    ]);
    if (result.rows.length === 0) {
        throw new errorHandler_1.AppError('Preferences not found', 404);
    }
    res.json({
        success: true,
        data: result.rows[0]
    });
}));
router.get('/documents', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const documents = await database_1.default.query('SELECT id, title, description, file_size, created_at FROM documents WHERE is_active = true ORDER BY created_at DESC');
    res.json({
        success: true,
        data: documents.rows
    });
}));
router.get('/documents/:documentId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { documentId } = req.params;
    const document = await database_1.default.query('SELECT id, title, description, file_path, mime_type FROM documents WHERE id = $1 AND is_active = true', [documentId]);
    if (document.rows.length === 0) {
        throw new errorHandler_1.AppError('Document not found', 404);
    }
    res.json({
        success: true,
        data: document.rows[0]
    });
}));
router.get('/stats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const totalChats = await database_1.default.query('SELECT COUNT(*) as count FROM chats WHERE user_id = $1', [userId]);
    const totalMessages = await database_1.default.query('SELECT COUNT(*) as count FROM messages m JOIN chats c ON m.chat_id = c.id WHERE c.user_id = $1', [userId]);
    const recentActivity = await database_1.default.query('SELECT COUNT(*) as count FROM messages m JOIN chats c ON m.chat_id = c.id WHERE c.user_id = $1 AND m.created_at > NOW() - INTERVAL \'30 days\'', [userId]);
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
//# sourceMappingURL=user.js.map