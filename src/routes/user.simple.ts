import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { ResponseUtils } from '../utils/response';

const router = Router();

// Legacy routes - replaced by new user routes
// These are kept for backward compatibility but redirect to new endpoints

router.get('/profile', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ResponseUtils.success(res, { message: 'Please use /api/auth/profile instead' }, 'Legacy route deprecated');
}));

router.put('/profile', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ResponseUtils.success(res, { message: 'Please use /api/auth/profile instead' }, 'Legacy route deprecated');
}));

router.get('/preferences', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ResponseUtils.success(res, { message: 'Please use /api/auth/preferences instead' }, 'Legacy route deprecated');
}));

router.put('/preferences', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  ResponseUtils.success(res, { message: 'Please use /api/auth/preferences instead' }, 'Legacy route deprecated');
}));

export default router;
