"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const database_1 = __importDefault(require("../config/database"));
const mongodb_1 = __importDefault(require("../config/mongodb"));
const postgres_codelookup_repository_1 = require("../modules/codelookup/repositories/postgres-codelookup.repository");
const mongo_codelookup_repository_1 = require("../modules/codelookup/repositories/mongo-codelookup.repository");
const codelookup_service_1 = require("../modules/codelookup/services/codelookup.service");
const router = (0, express_1.Router)();
// Initialize MongoDB connection and repository
let codeLookupService;
const initializeService = async () => {
    try {
        await mongodb_1.default.getInstance().connect();
        const mongoRepository = new mongo_codelookup_repository_1.MongoCodeLookupRepository();
        codeLookupService = new codelookup_service_1.CodeLookupService(mongoRepository);
        console.log('Code lookup service initialized with MongoDB');
    }
    catch (error) {
        console.error('Failed to initialize MongoDB, falling back to PostgreSQL:', error);
        // Fallback zu PostgreSQL
        const postgresRepository = new postgres_codelookup_repository_1.PostgresCodeLookupRepository(database_1.default);
        codeLookupService = new codelookup_service_1.CodeLookupService(postgresRepository);
    }
};
// Initialize service
initializeService();
/**
 * Helper function to build filters from query parameters
 */
const buildFilters = (query) => {
    const filters = {};
    if (query.softwareSystems) {
        if (typeof query.softwareSystems === 'string') {
            filters.softwareSystems = [query.softwareSystems];
        }
        else if (Array.isArray(query.softwareSystems)) {
            filters.softwareSystems = query.softwareSystems.filter(s => typeof s === 'string');
        }
    }
    if (query.postCode && typeof query.postCode === 'string') {
        filters.postCode = query.postCode;
    }
    if (query.city && typeof query.city === 'string') {
        filters.city = query.city;
    }
    if (query.codeFunction && typeof query.codeFunction === 'string') {
        filters.codeFunction = query.codeFunction;
    }
    if (query.confidence) {
        if (typeof query.confidence === 'string') {
            filters.confidence = [query.confidence];
        }
        else if (Array.isArray(query.confidence)) {
            filters.confidence = query.confidence.filter(c => typeof c === 'string' && ['High', 'Medium', 'Low'].includes(c));
        }
    }
    return filters;
};
/**
 * GET /api/v1/codes/search
 * Erweiterte Suche nach BDEW- und EIC-Codes mit Filtern
 */
router.get('/search', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
        throw new errorHandler_1.AppError('Query parameter "q" is required', 400);
    }
    const filters = buildFilters(req.query);
    const results = await codeLookupService.searchCodes(q, filters);
    res.json({
        success: true,
        data: {
            results,
            count: results.length,
            query: q,
            filters
        }
    });
}));
/**
 * GET /api/v1/codes/bdew/search
 * Sucht nur in BDEW-Codes
 */
router.get('/bdew/search', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
        throw new errorHandler_1.AppError('Query parameter "q" is required', 400);
    }
    const filters = buildFilters(req.query);
    const results = await codeLookupService.searchBDEWCodes(q, filters);
    res.json({
        success: true,
        data: {
            results,
            count: results.length,
            query: q,
            filters
        }
    });
}));
/**
 * GET /api/v1/codes/eic/search
 * Sucht nur in EIC-Codes
 */
router.get('/eic/search', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
        throw new errorHandler_1.AppError('Query parameter "q" is required', 400);
    }
    const filters = buildFilters(req.query);
    const results = await codeLookupService.searchEICCodes(q, filters);
    res.json({
        success: true,
        data: {
            results,
            count: results.length,
            query: q,
            filters
        }
    });
}));
/**
 * GET /api/v1/codes/lookup/:code
 * Schaut einen spezifischen Code nach
 */
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
/**
 * GET /api/v1/codes/details/:code
 * Gibt detaillierte Informationen zu einem Code zurück
 */
router.get('/details/:code', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { code } = req.params;
    if (!code) {
        throw new errorHandler_1.AppError('Code parameter is required', 400);
    }
    const result = await codeLookupService.getCodeDetails(code);
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
/**
 * GET /api/v1/codes/software-systems
 * Gibt alle verfügbaren Software-Systeme zurück
 */
router.get('/software-systems', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const systems = await codeLookupService.getAvailableSoftwareSystems();
    res.json({
        success: true,
        data: {
            softwareSystems: systems,
            count: systems.length
        }
    });
}));
/**
 * GET /api/v1/codes/cities
 * Gibt alle verfügbaren Städte zurück
 */
router.get('/cities', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const cities = await codeLookupService.getAvailableCities();
    res.json({
        success: true,
        data: {
            cities,
            count: cities.length
        }
    });
}));
/**
 * GET /api/v1/codes/functions
 * Gibt alle verfügbaren Code-Funktionen zurück
 */
router.get('/functions', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const functions = await codeLookupService.getAvailableCodeFunctions();
    res.json({
        success: true,
        data: {
            functions,
            count: functions.length
        }
    });
}));
exports.default = router;
//# sourceMappingURL=codes-new.js.map