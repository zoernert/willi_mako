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
 * GET /api/public/market-partners/search?q=...
 * Public market partner search. Returns a compact, privacy-conscious payload.
 */
router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query;
  let { limit } = req.query as { limit?: string };

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    throw new AppError('Query parameter "q" is required', 400);
  }

  // Clamp limit between 1 and 20 (default 10)
  const parsedLimit = Math.min(20, Math.max(1, parseInt(limit || '10', 10) || 10));

  const results = await codeLookupService.searchCodes(q);

  // Map to compact public shape to avoid overexposure of contact details
  const compact = results.slice(0, parsedLimit).map(r => ({
    code: r.code,
    companyName: r.companyName,
    codeType: r.codeType,
    source: r.source,
  }));

  res.json({
    success: true,
    data: {
      results: compact,
      count: compact.length,
      query: q,
    }
  });
}));

export default router;
