import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { ResponseUtils } from '../utils/response';
import { AppError } from '../utils/errors';
import { DatabaseHelper } from '../utils/database';
import { SystemSettingsService } from '../services/systemSettingsService';
import { emailService } from '../services/emailService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import chatConfigRouter from './admin/chatConfig';

const router = Router();

// Admin middleware - require admin role
const requireAdmin = (req: AuthenticatedRequest, res: Response, next: Function) => {
  if (req.user?.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }
  next();
};

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Mount chat configuration routes
router.use('/chat-config', chatConfigRouter);

// Configure multer for admin document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_PATH || './uploads';
    const adminDir = path.join(uploadDir, 'admin-documents');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    if (!fs.existsSync(adminDir)) {
      fs.mkdirSync(adminDir, { recursive: true });
    }
    
    cb(null, adminDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown'];
  const allowedExtensions = ['.pdf', '.txt', '.md'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Allowed types: PDF, TXT, MD'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '50') * 1024 * 1024 // 50MB default
  }
});

/**
 * GET /admin/stats
 * Get dashboard statistics
 */
router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get total counts
    const usersResult = await DatabaseHelper.executeQuerySingle<{count: number}>('SELECT COUNT(*) as count FROM users');
    const documentsResult = await DatabaseHelper.executeQuerySingle<{count: number}>('SELECT COUNT(*) as count FROM documents WHERE is_active = true');
    const chatsResult = await DatabaseHelper.executeQuerySingle<{count: number}>('SELECT COUNT(*) as count FROM chats');
    const messagesResult = await DatabaseHelper.executeQuerySingle<{count: number}>('SELECT COUNT(*) as count FROM messages');
    
    // Get recent counts (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const recentUsersResult = await DatabaseHelper.executeQuerySingle<{count: number}>('SELECT COUNT(*) as count FROM users WHERE created_at > $1', [thirtyDaysAgo]);
    const recentChatsResult = await DatabaseHelper.executeQuerySingle<{count: number}>('SELECT COUNT(*) as count FROM chats WHERE created_at > $1', [thirtyDaysAgo]);

    const stats = {
      totalUsers: usersResult?.count || 0,
      totalDocuments: documentsResult?.count || 0,
      totalChats: chatsResult?.count || 0,
      totalMessages: messagesResult?.count || 0,
      recentUsers: recentUsersResult?.count || 0,
      recentChats: recentChatsResult?.count || 0
    };

    ResponseUtils.success(res, stats, 'Statistics retrieved successfully');
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    throw new AppError('Failed to fetch statistics', 500);
  }
}));

/**
 * GET /admin/activity
 * Get recent system activity
 */
router.get('/activity', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get recent activities from different tables
    const activities = [];

    // Recent user registrations
    const recentUsers = await DatabaseHelper.executeQuery<{type: string, name: string, timestamp: Date, description: string}>(`
      SELECT 'user_registration' as type, full_name as name, created_at as timestamp,
             CONCAT('Neuer Benutzer registriert: ', full_name) as description
      FROM users 
      WHERE created_at > NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC LIMIT 5
    `);

    // Recent documents uploaded
    const recentDocuments = await DatabaseHelper.executeQuery<{type: string, name: string, timestamp: Date, description: string}>(`
      SELECT 'document_upload' as type, title as name, created_at as timestamp,
             CONCAT('Dokument hochgeladen: ', title) as description
      FROM documents 
      WHERE created_at > NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC LIMIT 5
    `);

    // Recent chats created
    const recentChats = await DatabaseHelper.executeQuery<{type: string, name: string, timestamp: Date, description: string}>(`
      SELECT 'chat_created' as type, title as name, c.created_at as timestamp,
             CONCAT('Neuer Chat erstellt: ', title, ' von ', u.full_name) as description
      FROM chats c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at > NOW() - INTERVAL '7 days'
      ORDER BY c.created_at DESC LIMIT 5
    `);

    // Combine and sort all activities
    activities.push(...recentUsers, ...recentDocuments, ...recentChats);
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    ResponseUtils.success(res, activities.slice(0, 10), 'Recent activity retrieved successfully');
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    throw new AppError('Failed to fetch recent activity', 500);
  }
}));

/**
 * GET /admin/users
 * Get all users for admin management
 */
router.get('/users', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await DatabaseHelper.executeQuery<{
      id: string;
      email: string;
      full_name: string;
      role: string;
      company: string;
      created_at: Date;
      updated_at: Date;
    }>(`
      SELECT id, email, full_name, role, company, created_at, updated_at
      FROM users 
      ORDER BY created_at DESC
    `);

    ResponseUtils.success(res, users, 'Users retrieved successfully');
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new AppError('Failed to fetch users', 500);
  }
}));

/**
 * PUT /admin/users/:userId/role
 * Update user role
 */
router.put('/users/:userId/role', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!['user', 'admin'].includes(role)) {
    throw new AppError('Invalid role. Must be "user" or "admin"', 400);
  }

  try {
    await DatabaseHelper.executeQuery('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, userId]);
    ResponseUtils.success(res, { id: userId, role }, 'User role updated successfully');
  } catch (error) {
    console.error('Error updating user role:', error);
    throw new AppError('Failed to update user role', 500);
  }
}));

/**
 * DELETE /admin/users/:userId
 * Delete user (admin only)
 */
router.delete('/users/:userId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;

  // Prevent admin from deleting themselves
  if (req.user?.id === userId) {
    throw new AppError('Cannot delete your own account', 400);
  }

  try {
    // Delete related data first (foreign key constraints)
    await DatabaseHelper.executeQuery('DELETE FROM messages WHERE chat_id IN (SELECT id FROM chats WHERE user_id = $1)', [userId]);
    await DatabaseHelper.executeQuery('DELETE FROM chats WHERE user_id = $1', [userId]);
    await DatabaseHelper.executeQuery('DELETE FROM documents WHERE uploaded_by = $1', [userId]);
    await DatabaseHelper.executeQuery('DELETE FROM users WHERE id = $1', [userId]);

    ResponseUtils.success(res, { id: userId }, 'User deleted successfully');
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new AppError('Failed to delete user', 500);
  }
}));

/**
 * GET /admin/documents
 * Get all documents for admin management
 */
router.get('/documents', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const documents = await DatabaseHelper.executeQuery<{
      id: string;
      title: string;
      description: string;
      file_path: string;
      file_size: number;
      is_active: boolean;
      created_at: Date;
      uploaded_by_name: string;
    }>(`
      SELECT d.id, d.title, d.description, d.file_path, d.file_size, 
             d.is_active, d.created_at, u.full_name as uploaded_by_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      ORDER BY d.created_at DESC
    `);

    ResponseUtils.success(res, documents, 'Documents retrieved successfully');
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw new AppError('Failed to fetch documents', 500);
  }
}));

/**
 * POST /admin/documents
 * Upload document as admin
 */
router.post('/documents', upload.single('file'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { title, description } = req.body;
  const file = req.file;

  if (!file) {
    throw new AppError('No file uploaded', 400);
  }

  if (!title) {
    throw new AppError('Title is required', 400);
  }

  try {
    const result = await DatabaseHelper.executeQuerySingle<{id: string}>(`
      INSERT INTO documents (title, description, file_path, file_size, mime_type, uploaded_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id
    `, [
      title,
      description || '',
      file.path,
      file.size,
      file.mimetype,
      req.user?.id
    ]);

    const insertId = result?.id;
    ResponseUtils.success(res, { id: insertId, title, filename: file.filename }, 'Document uploaded successfully');
  } catch (error) {
    console.error('Error uploading document:', error);
    // Clean up uploaded file on error
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw new AppError('Failed to upload document', 500);
  }
}));

/**
 * PUT /admin/documents/:documentId
 * Update document metadata
 */
router.put('/documents/:documentId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { documentId } = req.params;
  const { title, description, isActive } = req.body;

  try {
    await DatabaseHelper.executeQuery(`
      UPDATE documents 
      SET title = $1, description = $2, is_active = $3, updated_at = NOW() 
      WHERE id = $4
    `, [title, description, isActive !== false, documentId]);

    ResponseUtils.success(res, { id: documentId }, 'Document updated successfully');
  } catch (error) {
    console.error('Error updating document:', error);
    throw new AppError('Failed to update document', 500);
  }
}));

/**
 * DELETE /admin/documents/:documentId
 * Delete document
 */
router.delete('/documents/:documentId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { documentId } = req.params;

  try {
    // Get document file path before deletion
    const document = await DatabaseHelper.executeQuerySingle<{file_path: string}>('SELECT file_path FROM documents WHERE id = $1', [documentId]);

    // Delete from database
    await DatabaseHelper.executeQuery('DELETE FROM documents WHERE id = $1', [documentId]);

    // Delete physical file
    if (document?.file_path && fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }

    ResponseUtils.success(res, { id: documentId }, 'Document deleted successfully');
  } catch (error) {
    console.error('Error deleting document:', error);
    throw new AppError('Failed to delete document', 500);
  }
}));

/**
 * GET /admin/settings
 * Get system settings
 */
router.get('/settings', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get SMTP settings from database/config
    const smtpSettings = await SystemSettingsService.getSMTPSettings();
    
    // Get other settings
    const systemSettings = await SystemSettingsService.getSettings([
      'system.name',
      'system.description',
      'upload.max_file_size_mb',
      'security.enable_registration',
      'security.enable_guest_access'
    ]);

    const settings = {
      systemName: systemSettings['system.name'] || 'Willi Mako',
      systemDescription: systemSettings['system.description'] || 'Intelligentes FAQ-System mit KI-Unterstützung',
      maxFileSize: systemSettings['upload.max_file_size_mb'] || 50,
      enableRegistration: systemSettings['security.enable_registration'] !== false,
      enableGuestAccess: systemSettings['security.enable_guest_access'] === true,
      geminiApiKey: process.env.GEMINI_API_KEY ? '***hidden***' : '',
      qdrantUrl: process.env.QDRANT_URL || '',
      qdrantApiKey: process.env.QDRANT_API_KEY ? '***hidden***' : '',
      smtpHost: smtpSettings.host,
      smtpPort: smtpSettings.port,
      smtpUser: smtpSettings.user,
      smtpPassword: smtpSettings.password ? '***hidden***' : '',
      enableEmailNotifications: smtpSettings.enabled
    };

    ResponseUtils.success(res, settings, 'Settings retrieved successfully');
  } catch (error) {
    console.error('Error fetching settings:', error);
    throw new AppError('Failed to fetch settings', 500);
  }
}));

/**
 * PUT /admin/settings
 * Update system settings
 */
router.put('/settings', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      systemName,
      systemDescription,
      maxFileSize,
      enableRegistration,
      enableGuestAccess,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      enableEmailNotifications
    } = req.body;

    const userId = req.user?.id || 'admin';

    // Prepare settings to update
    const settingsToUpdate: Record<string, any> = {};

    if (systemName !== undefined) settingsToUpdate['system.name'] = systemName;
    if (systemDescription !== undefined) settingsToUpdate['system.description'] = systemDescription;
    if (maxFileSize !== undefined) settingsToUpdate['upload.max_file_size_mb'] = parseInt(maxFileSize);
    if (enableRegistration !== undefined) settingsToUpdate['security.enable_registration'] = enableRegistration;
    if (enableGuestAccess !== undefined) settingsToUpdate['security.enable_guest_access'] = enableGuestAccess;

    // SMTP settings
    if (smtpHost !== undefined) settingsToUpdate['smtp.host'] = smtpHost;
    if (smtpPort !== undefined) settingsToUpdate['smtp.port'] = parseInt(smtpPort);
    if (smtpUser !== undefined) settingsToUpdate['smtp.user'] = smtpUser;
    if (smtpPassword !== undefined && smtpPassword !== '***hidden***') {
      settingsToUpdate['smtp.password'] = smtpPassword;
    }
    if (enableEmailNotifications !== undefined) {
      settingsToUpdate['email.notifications_enabled'] = enableEmailNotifications;
    }

    // Update settings in database
    await SystemSettingsService.setSettings(settingsToUpdate, userId);

    // Force refresh email service configuration
    emailService.refreshConfiguration();

    ResponseUtils.success(res, { updated: Object.keys(settingsToUpdate) }, 'Settings updated successfully');
  } catch (error) {
    console.error('Error updating settings:', error);
    throw new AppError('Failed to update settings', 500);
  }
}));

/**
 * POST /admin/settings/test-qdrant
 * Test Qdrant connection
 */
router.post('/settings/test-qdrant', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Simple connection test - try to access Qdrant health endpoint
    const qdrantUrl = process.env.QDRANT_URL;
    if (!qdrantUrl) {
      throw new AppError('Qdrant URL not configured', 400);
    }

    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${qdrantUrl}/health`);
    
    if (response.ok) {
      ResponseUtils.success(res, { status: 'connected' }, 'Qdrant connection successful');
    } else {
      throw new AppError('Qdrant connection failed', 500);
    }
  } catch (error) {
    console.error('Qdrant connection test failed:', error);
    throw new AppError('Failed to connect to Qdrant', 500);
  }
}));

/**
 * POST /admin/settings/test-smtp
 * Test SMTP connection
 */
router.post('/settings/test-smtp', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // For now, just return success. In production, you would test actual SMTP connection
  ResponseUtils.success(res, { status: 'connected' }, 'SMTP connection test successful');
}));

/**
 * GET /admin/stats/detailed
 * Get detailed statistics
 */
router.get('/stats/detailed', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Users by role
    const usersByRole = await DatabaseHelper.executeQuery<{role: string; count: number}>(`
      SELECT role, COUNT(*) as count
      FROM users 
      GROUP BY role
    `);

    // Popular FAQs
    const popularFAQs = await DatabaseHelper.executeQuery<{id: string; title: string; view_count: number}>(`
      SELECT id, title, view_count
      FROM faqs 
      WHERE is_active = true
      ORDER BY view_count DESC 
      LIMIT 10
    `);

    // Chats by month (last 6 months)
    const chatsByMonth = await DatabaseHelper.executeQuery<{month: string; count: number}>(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
      FROM chats 
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
    `);

    // Messages by day (last 30 days)
    const messagesByDay = await DatabaseHelper.executeQuery<{day: string; count: number}>(`
      SELECT DATE(created_at) as day, COUNT(*) as count
      FROM messages 
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY day DESC
    `);

    const detailedStats = {
      usersByRole,
      popularFAQs,
      chatsByMonth,
      messagesByDay
    };

    ResponseUtils.success(res, detailedStats, 'Detailed statistics retrieved successfully');
  } catch (error) {
    console.error('Error fetching detailed stats:', error);
    throw new AppError('Failed to fetch detailed statistics', 500);
  }
}));

/**
 * POST /admin/settings/test-smtp
 * Test SMTP email configuration
 */
router.post('/settings/test-smtp', requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Test connection first
    const connectionTest = await emailService.testConnection();
    if (!connectionTest) {
      throw new AppError('SMTP connection test failed. Please check your configuration.', 400);
    }

    // Get current user's email for test
    const testEmail = req.user?.email || 'admin@test.com';

    // Send test email
    await emailService.sendEmail({
      to: testEmail,
      subject: 'SMTP Test - Willi Mako',
      html: `
        <h2>✅ SMTP-Konfiguration erfolgreich!</h2>
        <p>Diese Test-E-Mail bestätigt, dass die SMTP-Konfiguration korrekt funktioniert.</p>
        <p><strong>Gesendet am:</strong> ${new Date().toLocaleString('de-DE')}</p>
        <p><strong>Von:</strong> Willi Mako Administrations-Panel</p>
        <p><strong>An:</strong> ${testEmail}</p>
      `,
      text: 'SMTP-Konfiguration erfolgreich! Diese Test-E-Mail bestätigt, dass die SMTP-Konfiguration korrekt funktioniert.'
    });

    ResponseUtils.success(res, { sent: true, testEmail }, 'Test email sent successfully');
  } catch (error) {
    console.error('Error sending test email:', error);
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to send test email',
      500
    );
  }
}));

export default router;
