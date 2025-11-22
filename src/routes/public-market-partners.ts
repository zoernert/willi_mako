import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { CodeLookupService } from '../modules/codelookup/services/codelookup.service';
import { MongoCodeLookupRepository } from '../modules/codelookup/repositories/mongo-codelookup.repository';
import { PostgresCodeLookupRepository } from '../modules/codelookup/repositories/postgres-codelookup.repository';
import pool from '../config/database';

// Public router: no auth. Provides a safe, rate-limited market partner search API.
const router = Router();

let codeLookupService: CodeLookupService;

const initializeService = async () => {
  try {
    // Prefer Mongo-backed discovery results if available
    const mongoRepository = new MongoCodeLookupRepository();
    codeLookupService = new CodeLookupService(mongoRepository);
    console.log('Public MarketPartner Search: using Mongo repository');
  } catch (error) {
    console.warn('Public MarketPartner Search: Mongo unavailable, falling back to Postgres', error);
    // Fallback to Postgres which serves legacy BDEW/EIC
    const postgresRepository = new PostgresCodeLookupRepository(pool);
    codeLookupService = new CodeLookupService(postgresRepository);
  }
};

initializeService();

/**
 * GET /api/public/market-partners/search?q=...&role=...
 * Public market partner search. Returns a compact, privacy-conscious payload.
 */
const DEFAULT_QUERY_LIMIT = 50;
const DEFAULT_FILTER_LIMIT = 500;
const MAX_LIMIT = 2000;

router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const { q, role } = req.query;
  let { limit } = req.query as { limit?: string };

  const searchQuery = typeof q === 'string' && q.trim().length > 0 ? q : undefined;

  const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : NaN;
  const sanitizedLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, MAX_LIMIT)
    : (searchQuery ? DEFAULT_QUERY_LIMIT : DEFAULT_FILTER_LIMIT);

  // Build filters object
  const filters: any = {};
  if (role && typeof role === 'string' && role.trim().length > 0) {
    filters.marketRole = role.trim();
  }

  if (!searchQuery && Object.keys(filters).length === 0) {
    throw new AppError('Provide either a search query or at least one filter (e.g. role)', 400);
  }

  const results = await codeLookupService.searchCodes(searchQuery, filters, { limit: sanitizedLimit });

  // Return richer public shape with available metadata from discovery
  const enriched = results.map(r => ({
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
      query: searchQuery || null,
      limit: sanitizedLimit,
    }
  });
}));

export default router;
