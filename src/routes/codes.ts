import { Router, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import pool from '../config/database';
import { PostgresCodeLookupRepository } from '../modules/codelookup/repositories/postgres-codelookup.repository';
import { CodeLookupService } from '../modules/codelookup/services/codelookup.service';

const router = Router();

// Initialize repository and service
const codeLookupRepository = new PostgresCodeLookupRepository(pool);
const codeLookupService = new CodeLookupService(codeLookupRepository);

/**
 * GET /api/v1/codes/search
 * Sucht nach BDEW- und EIC-Codes
 */
router.get('/search', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    throw new AppError('Query parameter "q" is required', 400);
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

/**
 * GET /api/v1/codes/bdew/search
 * Sucht nur in BDEW-Codes
 */
router.get('/bdew/search', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    throw new AppError('Query parameter "q" is required', 400);
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

/**
 * GET /api/v1/codes/eic/search
 * Sucht nur in EIC-Codes
 */
router.get('/eic/search', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    throw new AppError('Query parameter "q" is required', 400);
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

/**
 * GET /api/v1/codes/lookup/:code
 * Schaut einen spezifischen Code nach
 */
router.get('/lookup/:code', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { code } = req.params;

  if (!code) {
    throw new AppError('Code parameter is required', 400);
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

export default router;
