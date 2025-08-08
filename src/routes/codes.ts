import { Router, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import pool from '../config/database';
import { PostgresCodeLookupRepository } from '../modules/codelookup/repositories/postgres-codelookup.repository';
import { MongoCodeLookupRepository } from '../modules/codelookup/repositories/mongo-codelookup.repository';
import { CodeLookupService } from '../modules/codelookup/services/codelookup.service';
import { SearchFilters } from '../modules/codelookup/interfaces/codelookup.interface';

const router = Router();

// Initialize MongoDB connection and repository
let codeLookupService: CodeLookupService;

const initializeService = async () => {
  try {
    const mongoRepository = new MongoCodeLookupRepository();
    codeLookupService = new CodeLookupService(mongoRepository);
    console.log('Code lookup service initialized with MongoDB');
  } catch (error) {
    console.error('Failed to initialize MongoDB, falling back to PostgreSQL:', error);
    // Fallback zu PostgreSQL
    const postgresRepository = new PostgresCodeLookupRepository(pool);
    codeLookupService = new CodeLookupService(postgresRepository);
  }
};

// Initialize service
initializeService();

/**
 * Helper function to build filters from query parameters
 */
const buildFilters = (query: any): SearchFilters => {
  const filters: SearchFilters = {};
  
  if (query.softwareSystems) {
    if (typeof query.softwareSystems === 'string') {
      filters.softwareSystems = [query.softwareSystems];
    } else if (Array.isArray(query.softwareSystems)) {
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
      filters.confidence = [query.confidence as 'High' | 'Medium' | 'Low'];
    } else if (Array.isArray(query.confidence)) {
      filters.confidence = query.confidence.filter(c => 
        typeof c === 'string' && ['High', 'Medium', 'Low'].includes(c)
      ) as ('High' | 'Medium' | 'Low')[];
    }
  }

  return filters;
};

/**
 * GET /api/v1/codes/search
 * Erweiterte Suche nach BDEW- und EIC-Codes mit Filtern
 */
router.get('/search', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    throw new AppError('Query parameter "q" is required', 400);
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
router.get('/bdew/search', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    throw new AppError('Query parameter "q" is required', 400);
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
router.get('/eic/search', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    throw new AppError('Query parameter "q" is required', 400);
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

/**
 * GET /api/v1/codes/details/:code
 * Gibt detaillierte Informationen zu einem Code zurück
 */
router.get('/details/:code', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { code } = req.params;

  if (!code) {
    throw new AppError('Code parameter is required', 400);
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
router.get('/software-systems', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
router.get('/cities', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
router.get('/functions', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const functions = await codeLookupService.getAvailableCodeFunctions();

  res.json({
    success: true,
    data: {
      functions,
      count: functions.length
    }
  });
}));

export default router;
