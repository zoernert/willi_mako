"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const sessions_routes_1 = __importDefault(require("./sessions.routes"));
const chat_routes_1 = __importDefault(require("./chat.routes"));
const metrics_1 = require("../../../../../middleware/api-v2/metrics");
const openapi_1 = require("./openapi");
const router = (0, express_1.Router)();
router.use(metrics_1.apiV2MetricsMiddleware);
router.use('/auth', auth_routes_1.default);
router.use('/sessions', sessions_routes_1.default);
router.use('/chat', chat_routes_1.default);
router.get('/metrics', metrics_1.apiV2MetricsHandler);
router.get('/openapi.json', (_req, res) => {
    res.json(openapi_1.apiV2OpenApiDocument);
});
exports.default = router;
//# sourceMappingURL=index.js.map