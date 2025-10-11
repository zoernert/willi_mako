"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatParityService = exports.ChatParityService = void 0;
const errorHandler_1 = require("../../middleware/errorHandler");
class ChatParityService {
    constructor(baseUrl) {
        const port = process.env.PORT || '3009';
        this.baseUrl = baseUrl || process.env.API_V2_PARITY_BASE_URL || `http://127.0.0.1:${port}`;
    }
    async forwardChat(request, authorization, signal) {
        var _a;
        if (!authorization) {
            throw new errorHandler_1.AppError('Authorization Header fehlt', 401);
        }
        let response;
        try {
            response = await fetch(`${this.baseUrl}/api/chat/chats/${encodeURIComponent(request.chatId)}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: authorization,
                    'x-session-id': request.sessionId
                },
                body: JSON.stringify({
                    content: request.message,
                    sessionId: request.sessionId,
                    contextSettings: request.contextSettings,
                    timelineId: request.timelineId
                }),
                signal
            });
        }
        catch (error) {
            throw new errorHandler_1.AppError((error === null || error === void 0 ? void 0 : error.message) || 'Chat-Parität: Anfrage fehlgeschlagen', 502);
        }
        const payload = (await response.json().catch(() => null));
        if (!response.ok || !payload || payload.success !== true) {
            throw new errorHandler_1.AppError(((_a = payload === null || payload === void 0 ? void 0 : payload.error) === null || _a === void 0 ? void 0 : _a.message) || 'Chat-Parität fehlgeschlagen', response.status || 502);
        }
        return payload.data;
    }
}
exports.ChatParityService = ChatParityService;
exports.chatParityService = new ChatParityService();
//# sourceMappingURL=chatParity.service.js.map