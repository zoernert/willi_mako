"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
const isShareEnabled = (metadata) => {
    var _a;
    if (!metadata) {
        return false;
    }
    const shareFlag = (_a = metadata.share_enabled) !== null && _a !== void 0 ? _a : metadata.shareEnabled;
    if (typeof shareFlag === 'string') {
        return shareFlag.toLowerCase() === 'true';
    }
    return Boolean(shareFlag);
};
router.get('/:chatId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const chatResult = await database_1.default.query('SELECT id, title, created_at, updated_at, metadata FROM chats WHERE id = $1 AND is_active = true', [chatId]);
    if (chatResult.rows.length === 0) {
        throw new errorHandler_1.AppError('Chat not found', 404);
    }
    const chat = chatResult.rows[0];
    if (!isShareEnabled(chat.metadata)) {
        throw new errorHandler_1.AppError('Chat not found', 404);
    }
    const messagesResult = await database_1.default.query(`SELECT id, role, content, created_at
     FROM messages
     WHERE chat_id = $1
     ORDER BY created_at ASC`, [chatId]);
    res.json({
        success: true,
        data: {
            chat: {
                id: chat.id,
                title: chat.title,
                created_at: chat.created_at,
                updated_at: chat.updated_at,
            },
            messages: messagesResult.rows,
        },
    });
}));
exports.default = router;
//# sourceMappingURL=public-chat.js.map