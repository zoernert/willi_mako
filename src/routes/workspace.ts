import express from 'express';
import { WorkspaceService } from '../services/workspaceService';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const workspaceService = new WorkspaceService();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * GET /api/workspace/test
 * Test endpoint to verify authentication
 */
router.get('/test', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    return res.json({ 
      message: 'Workspace test successful',
      userId,
      userRole,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in workspace test:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/workspace/dashboard
 * Get workspace dashboard data
 */
router.get('/dashboard', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const dashboard = await workspaceService.getWorkspaceDashboard(userId);
    return res.json(dashboard);
    
  } catch (error) {
    console.error('Error getting workspace dashboard:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/workspace/settings
 * Get user workspace settings
 */
router.get('/settings', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const settings = await workspaceService.getUserWorkspaceSettings(userId);
    return res.json(settings);
    
  } catch (error) {
    console.error('Error getting workspace settings:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/workspace/settings
 * Update user workspace settings
 */
router.put('/settings', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const updates = req.body;
    
    // Validate allowed fields
    const allowedFields = ['ai_context_enabled', 'auto_tag_enabled', 'storage_limit_mb', 'settings'];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {} as any);
    
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const settings = await workspaceService.updateWorkspaceSettings(userId, filteredUpdates);
    return res.json(settings);
    
  } catch (error) {
    console.error('Error updating workspace settings:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/workspace/storage
 * Get storage usage information
 */
router.get('/storage', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const storageInfo = await workspaceService.getStorageUsage(userId);
    return res.json(storageInfo);
    
  } catch (error) {
    console.error('Error getting storage info:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/workspace/cleanup
 * Clean up unused storage
 */
router.post('/cleanup', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const result = await workspaceService.cleanupStorage(userId);
    return res.json(result);
    
  } catch (error) {
    console.error('Error cleaning up storage:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/workspace/export
 * Export user workspace data
 */
router.get('/export', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const exportData = await workspaceService.exportUserData(userId);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=workspace-export-${userId}.json`);
    
    return res.json(exportData);
    
  } catch (error) {
    console.error('Error exporting workspace data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/workspace/search
 * Search across user's notes and documents
 */
router.get('/search', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { q, type = 'all', limit = '20' } = req.query;
    
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({ 
        error: 'Query parameter "q" is required and must be at least 2 characters' 
      });
    }
    
    const results = await workspaceService.searchWorkspaceContent(
      userId, 
      q.trim(), 
      type as 'all' | 'documents' | 'notes',
      parseInt(limit as string, 10)
    );
    
    return res.json({ results });
    
  } catch (error) {
    console.error('Error searching workspace:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/workspace/data
 * Delete all user workspace data
 */
router.delete('/data', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Require confirmation
    const { confirm } = req.body;
    if (confirm !== 'DELETE_ALL_DATA') {
      return res.status(400).json({ 
        error: 'Please confirm deletion by sending { "confirm": "DELETE_ALL_DATA" }' 
      });
    }
    
    await workspaceService.deleteUserData(userId);
    return res.json({ message: 'All workspace data deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting workspace data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
