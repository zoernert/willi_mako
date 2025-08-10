import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/errors';
import { ResponseUtils } from '../utils/response';
import m2cRoleService from '../services/m2cRoleService';

const router = Router();

/**
 * Get all available M2C roles
 * GET /api/m2c-roles
 */
router.get('/m2c-roles', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (process.env.ENABLE_M2C_ROLES !== 'true') {
    throw new AppError('M2C Rollen Feature ist nicht aktiviert', 404);
  }

  const roles = await m2cRoleService.getAllRoles();
  
  // Only expose public fields for the role list
  const publicRoles = roles.map(role => ({
    id: role.id,
    role_name: role.role_name,
    short_description: role.short_description
  }));

  ResponseUtils.success(res, publicRoles, 'M2C-Rollen erfolgreich abgerufen');
}));

/**
 * Get user's selected M2C roles
 * GET /api/users/me/m2c-roles
 */
router.get('/users/me/m2c-roles', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (process.env.ENABLE_M2C_ROLES !== 'true') {
    throw new AppError('M2C Rollen Feature ist nicht aktiviert', 404);
  }

  const userId = req.user!.id;
  const selection = await m2cRoleService.getUserRoleSelection(userId);
  
  const response = {
    roleIds: selection.roleIds,
    roles: selection.roles.map(role => ({
      id: role.id,
      role_name: role.role_name,
      short_description: role.short_description
    }))
  };

  ResponseUtils.success(res, response, 'Benutzer M2C-Rollen erfolgreich abgerufen');
}));

/**
 * Update user's selected M2C roles
 * PUT /api/users/me/m2c-roles
 */
router.put('/users/me/m2c-roles', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (process.env.ENABLE_M2C_ROLES !== 'true') {
    throw new AppError('M2C Rollen Feature ist nicht aktiviert', 404);
  }

  const userId = req.user!.id;
  const { roleIds } = req.body;

  // Validate input
  if (!Array.isArray(roleIds)) {
    throw new AppError('roleIds muss ein Array sein', 400);
  }

  // Validate that all elements are strings
  const invalidTypes = roleIds.filter(id => typeof id !== 'string');
  if (invalidTypes.length > 0) {
    throw new AppError('Alle roleIds müssen Strings sein', 400);
  }

  try {
    await m2cRoleService.updateUserRoleSelection(userId, roleIds);
    ResponseUtils.success(res, { roleIds }, 'M2C-Rollen erfolgreich aktualisiert');
  } catch (error) {
    if (error instanceof Error) {
      throw new AppError(error.message, 400);
    }
    throw error;
  }
}));

/**
 * Get M2C roles cache statistics (for monitoring/debugging)
 * GET /api/m2c-roles/stats
 */
router.get('/m2c-roles/stats', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Only allow admin users to see cache stats
  if (req.user!.role !== 'admin') {
    throw new AppError('Zugriff verweigert', 403);
  }

  const stats = m2cRoleService.getCacheStats();
  ResponseUtils.success(res, stats, 'M2C-Rollen Cache-Statistiken');
}));

export default router;
