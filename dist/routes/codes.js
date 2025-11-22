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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const database_1 = __importDefault(require("../config/database"));
const postgres_codelookup_repository_1 = require("../modules/codelookup/repositories/postgres-codelookup.repository");
const mongo_codelookup_repository_1 = require("../modules/codelookup/repositories/mongo-codelookup.repository");
const codelookup_service_1 = require("../modules/codelookup/services/codelookup.service");
const router = (0, express_1.Router)();
// Initialize MongoDB connection and repository
let codeLookupService;
const initializeService = async () => {
    try {
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
            filters.softwareSystems = query.softwareSystems.filter((s) => typeof s === 'string');
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
    if (query.role && typeof query.role === 'string') {
        filters.marketRole = query.role;
    }
    if (query.confidence) {
        if (typeof query.confidence === 'string') {
            filters.confidence = [query.confidence];
        }
        else if (Array.isArray(query.confidence)) {
            filters.confidence = query.confidence.filter((c) => typeof c === 'string' && ['High', 'Medium', 'Low'].includes(c));
        }
    }
    return filters;
};
/**
 * GET /api/v1/codes/search
 * Erweiterte Suche nach BDEW- und EIC-Codes mit Filtern
 */
router.get('/search', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { q, timelineId } = req.query;
    if (!q || typeof q !== 'string') {
        throw new errorHandler_1.AppError('Query parameter "q" is required', 400);
    }
    const filters = buildFilters(req.query);
    const results = await codeLookupService.searchCodes(q, filters);
    // Timeline-Integration (falls timelineId übergeben)
    if (timelineId && typeof timelineId === 'string') {
        try {
            const { TimelineActivityService } = await Promise.resolve().then(() => __importStar(require('../services/TimelineActivityService')));
            const { Pool } = await Promise.resolve().then(() => __importStar(require('pg')));
            const pool = new Pool({ connectionString: process.env.DATABASE_URL });
            const timelineService = new TimelineActivityService(pool);
            // Timeline-Aktivität erfassen
            await timelineService.captureActivity({
                timelineId,
                feature: 'code-lookup',
                activityType: 'search_performed',
                rawData: {
                    search_query: q,
                    filters,
                    results_count: results.length,
                    search_timestamp: new Date().toISOString(),
                    found_codes: results.slice(0, 5).map(r => ({
                        code: r.code,
                        company_name: r.companyName || 'Unknown',
                        code_type: r.codeType || 'BDEW'
                    }))
                },
                priority: 3
            });
        }
        catch (timelineError) {
            console.warn('Timeline integration failed:', timelineError);
            // Don't fail the main request if timeline integration fails
        }
    }
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
/**
 * Report error for market partner data
 */
router.post('/report-error', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const { marketPartner, errorDescription } = req.body;
    if (!marketPartner || !errorDescription) {
        throw new errorHandler_1.AppError('Market partner data and error description are required', 400);
    }
    if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.email)) {
        throw new errorHandler_1.AppError('User email required to send error report', 401);
    }
    // Import EmailService here to avoid circular dependencies
    const { emailService } = await Promise.resolve().then(() => __importStar(require('../services/emailService')));
    try {
        // Use email as name fallback - we could also query the database for full_name if needed
        const userName = req.user.email; // Simple fallback
        await emailService.sendMarketPartnerErrorReport(req.user.email, userName, marketPartner, errorDescription);
        res.json({
            success: true,
            message: 'Error report sent successfully'
        });
    }
    catch (error) {
        console.error('Failed to send error report:', error);
        throw new errorHandler_1.AppError('Failed to send error report', 500);
    }
}));
exports.default = router;
//# sourceMappingURL=codes.js.map