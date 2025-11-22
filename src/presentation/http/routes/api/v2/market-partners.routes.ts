import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../../../../../middleware/errorHandler';
import { CodeLookupService } from '../../../../../modules/codelookup/services/codelookup.service';
import { MongoCodeLookupRepository } from '../../../../../modules/codelookup/repositories/mongo-codelookup.repository';
import { PostgresCodeLookupRepository } from '../../../../../modules/codelookup/repositories/postgres-codelookup.repository';
import pool from '../../../../../config/database';

/**
 * API v2 Market Partners Routes
 * Public endpoint for searching market partners (BDEW/EIC codes)
 */
const router = Router();

let codeLookupService: CodeLookupService;

const initializeService = async () => {
  try {
    // Prefer Mongo-backed discovery results if available
    const mongoRepository = new MongoCodeLookupRepository();
    codeLookupService = new CodeLookupService(mongoRepository);
    console.log('[API v2] Market Partners: using Mongo repository');
  } catch (error) {
    console.warn('[API v2] Market Partners: Mongo unavailable, falling back to Postgres', error);
    // Fallback to Postgres which serves legacy BDEW/EIC
    const postgresRepository = new PostgresCodeLookupRepository(pool);
    codeLookupService = new CodeLookupService(postgresRepository);
  }
};

initializeService();

/**
 * GET /api/v2/market-partners/search
 * Search for market partners by query string
 * 
 * Query Parameters:
 * - q: Search query (required)
 * - limit: Maximum number of results (1-20, default 10)
 * - role: Filter by market role (optional), e.g. 'VNB', 'LF', 'MSB', 'UNB'
 * 
 * @public No authentication required
 */
router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const { q, role } = req.query;
  let { limit } = req.query as { limit?: string };

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    throw new AppError('Query parameter "q" is required', 400);
  }

  // Clamp limit between 1 and 20 (default 10)
  const parsedLimit = Math.min(20, Math.max(1, parseInt(limit || '10', 10) || 10));

  // Build filters object
  const filters: any = {};
  if (role && typeof role === 'string' && role.trim().length > 0) {
    filters.marketRole = role.trim();
  }

  const results = await codeLookupService.searchCodes(q, filters);

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

export default router;
