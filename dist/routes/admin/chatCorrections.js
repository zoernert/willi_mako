"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../../middleware/errorHandler");
const response_1 = require("../../utils/response");
const errors_1 = require("../../utils/errors");
const chatCorrectionSuggestion_service_1 = require("../../modules/chat-corrections/chatCorrectionSuggestion.service");
const router = (0, express_1.Router)();
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const suggestions = await chatCorrectionSuggestion_service_1.chatCorrectionSuggestionService.listSuggestions(status);
    response_1.ResponseUtils.success(res, suggestions, 'Korrekturvorschläge geladen');
}));
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const suggestion = await chatCorrectionSuggestion_service_1.chatCorrectionSuggestionService.getSuggestion(req.params.id);
    if (!suggestion) {
        throw new errors_1.AppError('Korrekturvorschlag wurde nicht gefunden', 404);
    }
    response_1.ResponseUtils.success(res, suggestion, 'Korrekturvorschlag geladen');
}));
router.post('/:id/approve', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a, _b, _c, _d, _e;
    if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
        throw new errors_1.AppError('Authentifizierung erforderlich', 401);
    }
    const rawTags = (_b = req.body) === null || _b === void 0 ? void 0 : _b.tags;
    const tags = Array.isArray(rawTags)
        ? rawTags.map((t) => (typeof t === 'string' ? t.trim() : '')).filter(Boolean)
        : typeof rawTags === 'string'
            ? rawTags.split(',').map((t) => t.trim()).filter(Boolean)
            : undefined;
    const result = await chatCorrectionSuggestion_service_1.chatCorrectionSuggestionService.approveSuggestion(req.params.id, req.user.id, {
        vectorText: typeof ((_c = req.body) === null || _c === void 0 ? void 0 : _c.vectorText) === 'string' ? req.body.vectorText : undefined,
        vectorTitle: typeof ((_d = req.body) === null || _d === void 0 ? void 0 : _d.vectorTitle) === 'string' ? req.body.vectorTitle : undefined,
        tags,
        notes: typeof ((_e = req.body) === null || _e === void 0 ? void 0 : _e.notes) === 'string' ? req.body.notes : undefined
    });
    response_1.ResponseUtils.success(res, result, 'Korrekturvorschlag freigegeben');
}));
router.post('/:id/reject', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a, _b;
    if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
        throw new errors_1.AppError('Authentifizierung erforderlich', 401);
    }
    const result = await chatCorrectionSuggestion_service_1.chatCorrectionSuggestionService.rejectSuggestion(req.params.id, req.user.id, (_b = req.body) === null || _b === void 0 ? void 0 : _b.notes);
    response_1.ResponseUtils.success(res, result, 'Korrekturvorschlag abgelehnt');
}));
exports.default = router;
//# sourceMappingURL=chatCorrections.js.map