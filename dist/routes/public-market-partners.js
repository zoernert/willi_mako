"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const codelookup_service_1 = require("../modules/codelookup/services/codelookup.service");
const mongo_codelookup_repository_1 = require("../modules/codelookup/repositories/mongo-codelookup.repository");
const postgres_codelookup_repository_1 = require("../modules/codelookup/repositories/postgres-codelookup.repository");
const database_1 = __importDefault(require("../config/database"));
// Public router: no auth. Provides a safe, rate-limited market partner search API.
const router = (0, express_1.Router)();
let codeLookupService;
const initializeService = async () => {
    try {
        // Prefer Mongo-backed discovery results if available
        const mongoRepository = new mongo_codelookup_repository_1.MongoCodeLookupRepository();
        codeLookupService = new codelookup_service_1.CodeLookupService(mongoRepository);
        console.log('Public MarketPartner Search: using Mongo repository');
    }
    catch (error) {
        console.warn('Public MarketPartner Search: Mongo unavailable, falling back to Postgres', error);
        // Fallback to Postgres which serves legacy BDEW/EIC
        const postgresRepository = new postgres_codelookup_repository_1.PostgresCodeLookupRepository(database_1.default);
        codeLookupService = new codelookup_service_1.CodeLookupService(postgresRepository);
    }
};
initializeService();
/**
 * GET /api/public/market-partners/search?q=...
 * Public market partner search. Returns a compact, privacy-conscious payload.
 */
router.get('/search', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { q } = req.query;
    let { limit } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
        throw new errorHandler_1.AppError('Query parameter "q" is required', 400);
    }
    // Clamp limit between 1 and 20 (default 10)
    const parsedLimit = Math.min(20, Math.max(1, parseInt(limit || '10', 10) || 10));
    const results = await codeLookupService.searchCodes(q);
    // Return richer public shape with available metadata from discovery
    const enriched = results.slice(0, parsedLimit).map(r => ({
        code: r.code,
        companyName: r.companyName,
        codeType: r.codeType,
        source: r.source,
        validFrom: r.validFrom || undefined,
        validTo: r.validTo || undefined,
        bdewCodes: r.bdewCodes || undefined,
        contacts: r.contacts || undefined,
        contactSheetUrl: r.contactSheetUrl || undefined,
        markdown: r.markdown || undefined,
        allSoftwareSystems: r.allSoftwareSystems || undefined,
    }));
    res.json({
        success: true,
        data: {
            results: enriched,
            count: enriched.length,
            query: q,
        }
    });
}));
exports.default = router;
//# sourceMappingURL=public-market-partners.js.map