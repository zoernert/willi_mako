"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/public-edifact.ts
const express_1 = require("express");
const errors_1 = require("../utils/errors");
// Lazy import inside handlers to avoid circular init
const router = (0, express_1.Router)();
// Health check for the public EDIFACT API
router.get('/health', (_req, res) => {
    res.status(200).json({ success: true, status: 'ok' });
});
// Analyze full or near-complete EDIFACT messages
router.post('/analyze', async (req, res, next) => {
    var _a, _b, _c, _d;
    try {
        const message = ((_d = (_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : (_c = req.body) === null || _c === void 0 ? void 0 : _c.text) !== null && _d !== void 0 ? _d : '').toString();
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return next(new errors_1.AppError('Field "message" is required (string).', 400));
        }
        const limited = message.slice(0, 20000);
        const { edifactTool } = await Promise.resolve().then(() => __importStar(require('../services/edifactTool')));
        const result = await edifactTool.analyzeMessage(limited);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
// Explain EDIFACT segment or short fragment
router.post('/explain', async (req, res, next) => {
    var _a, _b, _c, _d;
    try {
        const fragment = ((_d = (_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.fragment) !== null && _b !== void 0 ? _b : (_c = req.body) === null || _c === void 0 ? void 0 : _c.text) !== null && _d !== void 0 ? _d : '').toString();
        if (!fragment || typeof fragment !== 'string' || fragment.trim().length === 0) {
            return next(new errors_1.AppError('Field "fragment" is required (string).', 400));
        }
        const limited = fragment.slice(0, 2000);
        const { edifactTool } = await Promise.resolve().then(() => __importStar(require('../services/edifactTool')));
        const result = await edifactTool.explainSegment(limited);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=public-edifact.js.map