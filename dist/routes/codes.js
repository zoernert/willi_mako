"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const database_1 = __importDefault(require("../config/database"));
const postgres_codelookup_repository_1 = require("../modules/codelookup/repositories/postgres-codelookup.repository");
const codelookup_service_1 = require("../modules/codelookup/services/codelookup.service");
const router = (0, express_1.Router)();
const codeLookupRepository = new postgres_codelookup_repository_1.PostgresCodeLookupRepository(database_1.default);
const codeLookupService = new codelookup_service_1.CodeLookupService(codeLookupRepository);
router.get('/search', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
        throw new errorHandler_1.AppError('Query parameter "q" is required', 400);
    }
    const results = await codeLookupService.searchCodes(q);
    res.json({
        success: true,
        data: {
            results,
            count: results.length,
            query: q
        }
    });
}));
router.get('/bdew/search', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
        throw new errorHandler_1.AppError('Query parameter "q" is required', 400);
    }
    const results = await codeLookupService.searchBDEWCodes(q);
    res.json({
        success: true,
        data: {
            results,
            count: results.length,
            query: q
        }
    });
}));
router.get('/eic/search', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
        throw new errorHandler_1.AppError('Query parameter "q" is required', 400);
    }
    const results = await codeLookupService.searchEICCodes(q);
    res.json({
        success: true,
        data: {
            results,
            count: results.length,
            query: q
        }
    });
}));
router.get('/lookup/:code', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { code } = req.params;
    if (!code) {
        throw new errorHandler_1.AppError('Code parameter is required', 400);
    }
    const result = await codeLookupService.lookupSingleCode(code);
    if (!result) {
        res.json({
            success: true,
            data: {
                result: null,
                found: false,
                code
            }
        });
        return;
    }
    res.json({
        success: true,
        data: {
            result,
            found: true,
            code
        }
    });
}));
exports.default = router;
//# sourceMappingURL=codes.js.map