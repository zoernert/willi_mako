"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const response_1 = require("../utils/response");
const errors_1 = require("../utils/errors");
const database_1 = require("../utils/database");
const systemSettingsService_1 = require("../services/systemSettingsService");
const emailService_1 = require("../services/emailService");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const chatConfig_1 = __importDefault(require("./admin/chatConfig"));
const content_1 = __importDefault(require("./admin/content"));
// Import API-Schlüssel-Admin-Route
const apiKeysRouter = require('./admin-api-keys');
const userAIKeyService_1 = __importDefault(require("../services/userAIKeyService"));
const database_2 = __importDefault(require("../config/database"));
const qdrant_1 = require("../services/qdrant");
const advancedReasoningService_1 = __importDefault(require("../services/advancedReasoningService"));
const router = (0, express_1.Router)();
// Admin middleware - require admin role
const requireAdmin = (req, res, next) => {
    var _a;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new errors_1.AppError('Admin access required', 403);
    }
    next();
};
// Apply authentication and admin middleware to all routes
router.use(auth_1.authenticateToken);
router.use(requireAdmin);
// Mount chat configuration routes
router.use('/chat-config', chatConfig_1.default);
// Mount API-Schlüssel-Routes
router.use('/', apiKeysRouter);
// Content admin (articles/whitepapers on filesystem)
router.use('/content', content_1.default);
// Initialize and mount community admin routes (needs to be done in server.ts with db pool)
// router.use('/community', initializeCommunityAdminRoutes(db)); // This will be done in server.ts
// Configure multer for admin document uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = process.env.UPLOAD_PATH || './uploads';
        const adminDir = path_1.default.join(uploadDir, 'admin-documents');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        if (!fs_1.default.existsSync(adminDir)) {
            fs_1.default.mkdirSync(adminDir, { recursive: true });
        }
        cb(null, adminDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        const name = path_1.default.basename(file.originalname, ext);
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
});
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown'];
    const allowedExtensions = ['.pdf', '.txt', '.md'];
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new Error('Unsupported file type. Allowed types: PDF, TXT, MD'));
    }
};
const upload = (0, multer_1.default)({
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
router.get('/stats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        // Get total counts
        const usersResult = await database_1.DatabaseHelper.executeQuerySingle('SELECT COUNT(*) as count FROM users');
        const documentsResult = await database_1.DatabaseHelper.executeQuerySingle('SELECT COUNT(*) as count FROM documents WHERE is_active = true');
        const chatsResult = await database_1.DatabaseHelper.executeQuerySingle('SELECT COUNT(*) as count FROM chats');
        const messagesResult = await database_1.DatabaseHelper.executeQuerySingle('SELECT COUNT(*) as count FROM messages');
        // Get recent counts (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const recentUsersResult = await database_1.DatabaseHelper.executeQuerySingle('SELECT COUNT(*) as count FROM users WHERE created_at > $1', [thirtyDaysAgo]);
        const recentChatsResult = await database_1.DatabaseHelper.executeQuerySingle('SELECT COUNT(*) as count FROM chats WHERE created_at > $1', [thirtyDaysAgo]);
        const stats = {
            totalUsers: (usersResult === null || usersResult === void 0 ? void 0 : usersResult.count) || 0,
            totalDocuments: (documentsResult === null || documentsResult === void 0 ? void 0 : documentsResult.count) || 0,
            totalChats: (chatsResult === null || chatsResult === void 0 ? void 0 : chatsResult.count) || 0,
            totalMessages: (messagesResult === null || messagesResult === void 0 ? void 0 : messagesResult.count) || 0,
            recentUsers: (recentUsersResult === null || recentUsersResult === void 0 ? void 0 : recentUsersResult.count) || 0,
            recentChats: (recentChatsResult === null || recentChatsResult === void 0 ? void 0 : recentChatsResult.count) || 0
        };
        response_1.ResponseUtils.success(res, stats, 'Statistics retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching admin stats:', error);
        throw new errors_1.AppError('Failed to fetch statistics', 500);
    }
}));
/**
 * GET /admin/activity
 * Get recent system activity
 */
router.get('/activity', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        // Get recent activities from different tables
        const activities = [];
        // Recent user registrations
        const recentUsers = await database_1.DatabaseHelper.executeQuery(`
      SELECT 'user_registration' as type, full_name as name, created_at as timestamp,
             CONCAT('Neuer Benutzer registriert: ', full_name) as description
      FROM users 
      WHERE created_at > NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC LIMIT 5
    `);
        // Recent documents uploaded
        const recentDocuments = await database_1.DatabaseHelper.executeQuery(`
      SELECT 'document_upload' as type, title as name, created_at as timestamp,
             CONCAT('Dokument hochgeladen: ', title) as description
      FROM documents 
      WHERE created_at > NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC LIMIT 5
    `);
        // Recent chats created
        const recentChats = await database_1.DatabaseHelper.executeQuery(`
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
        response_1.ResponseUtils.success(res, activities.slice(0, 10), 'Recent activity retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching recent activity:', error);
        throw new errors_1.AppError('Failed to fetch recent activity', 500);
    }
}));
/**
 * GET /admin/users
 * Get all users for admin management
 */
router.get('/users', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        const users = await database_1.DatabaseHelper.executeQuery(`
      SELECT id, email, full_name, role, company, can_access_cs30, created_at, updated_at
      FROM users 
      ORDER BY created_at DESC
    `);
        response_1.ResponseUtils.success(res, users, 'Users retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching users:', error);
        throw new errors_1.AppError('Failed to fetch users', 500);
    }
}));
/**
 * PATCH /admin/users/:userId/ai-key-policy
 * Toggle whether user can use system keys
 */
router.patch('/users/:userId/ai-key-policy', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const { systemKeyAllowed } = req.body;
    if (typeof systemKeyAllowed !== 'boolean') {
        throw new errors_1.AppError('systemKeyAllowed must be boolean', 400);
    }
    await userAIKeyService_1.default.setSystemKeyAccess(userId, systemKeyAllowed);
    response_1.ResponseUtils.success(res, { id: userId, systemKeyAllowed }, 'AI key policy updated');
}));
/**
 * DELETE /admin/users/:userId/ai-key
 * Admin deletes a user's personal API key
 */
router.delete('/users/:userId/ai-key', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    await userAIKeyService_1.default.deleteUserGeminiKey(userId);
    response_1.ResponseUtils.success(res, { id: userId, deleted: true }, 'User AI key removed');
}));
/**
 * GET /admin/users/:userId/ai-key/status
 */
router.get('/users/:userId/ai-key/status', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const status = await userAIKeyService_1.default.getUserGeminiKeyStatus(userId);
    response_1.ResponseUtils.success(res, status, 'AI key status');
}));
/**
 * PUT /admin/users/:userId/role
 * Update user role
 */
router.put('/users/:userId/role', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
        throw new errors_1.AppError('Invalid role. Must be "user" or "admin"', 400);
    }
    try {
        await database_1.DatabaseHelper.executeQuery('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, userId]);
        response_1.ResponseUtils.success(res, { id: userId, role }, 'User role updated successfully');
    }
    catch (error) {
        console.error('Error updating user role:', error);
        throw new errors_1.AppError('Failed to update user role', 500);
    }
}));
/**
 * PUT /admin/users/:userId/cs30-access
 * Update user CS30 access permission
 * CR-CS30: New endpoint for managing cs30 database access
 */
router.put('/users/:userId/cs30-access', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const { canAccess } = req.body;
    if (typeof canAccess !== 'boolean') {
        throw new errors_1.AppError('canAccess must be a boolean value', 400);
    }
    try {
        // Check if user exists
        const userExists = await database_1.DatabaseHelper.executeQuerySingle('SELECT COUNT(*) as count FROM users WHERE id = $1', [userId]);
        if (!userExists || userExists.count === 0) {
            throw new errors_1.AppError('User not found', 404);
        }
        await database_1.DatabaseHelper.executeQuery('UPDATE users SET can_access_cs30 = $1, updated_at = NOW() WHERE id = $2', [canAccess, userId]);
        response_1.ResponseUtils.success(res, {
            id: userId,
            can_access_cs30: canAccess
        }, `CS30 access ${canAccess ? 'granted' : 'revoked'} successfully`);
    }
    catch (error) {
        console.error('Error updating CS30 access:', error);
        throw new errors_1.AppError('Failed to update CS30 access', 500);
    }
}));
/**
 * DELETE /admin/users/:userId
 * Delete user (admin only)
 */
router.delete('/users/:userId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const { userId } = req.params;
    // Prevent admin from deleting themselves
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) === userId) {
        throw new errors_1.AppError('Cannot delete your own account', 400);
    }
    try {
        // Delete related data first (foreign key constraints)
        await database_1.DatabaseHelper.executeQuery('DELETE FROM messages WHERE chat_id IN (SELECT id FROM chats WHERE user_id = $1)', [userId]);
        await database_1.DatabaseHelper.executeQuery('DELETE FROM chats WHERE user_id = $1', [userId]);
        await database_1.DatabaseHelper.executeQuery('DELETE FROM documents WHERE uploaded_by = $1', [userId]);
        await database_1.DatabaseHelper.executeQuery('DELETE FROM users WHERE id = $1', [userId]);
        response_1.ResponseUtils.success(res, { id: userId }, 'User deleted successfully');
    }
    catch (error) {
        console.error('Error deleting user:', error);
        throw new errors_1.AppError('Failed to delete user', 500);
    }
}));
/**
 * GET /admin/documents
 * Get all documents for admin management
 */
router.get('/documents', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        const documents = await database_1.DatabaseHelper.executeQuery(`
      SELECT d.id, d.title, d.description, d.file_path, d.file_size, 
             d.is_active, d.created_at, u.full_name as uploaded_by_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      ORDER BY d.created_at DESC
    `);
        response_1.ResponseUtils.success(res, documents, 'Documents retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching documents:', error);
        throw new errors_1.AppError('Failed to fetch documents', 500);
    }
}));
/**
 * POST /admin/documents
 * Upload document as admin
 */
router.post('/documents', upload.single('file'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const { title, description } = req.body;
    const file = req.file;
    if (!file) {
        throw new errors_1.AppError('No file uploaded', 400);
    }
    if (!title) {
        throw new errors_1.AppError('Title is required', 400);
    }
    try {
        const result = await database_1.DatabaseHelper.executeQuerySingle(`
      INSERT INTO documents (title, description, file_path, file_size, mime_type, uploaded_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id
    `, [
            title,
            description || '',
            file.path,
            file.size,
            file.mimetype,
            (_a = req.user) === null || _a === void 0 ? void 0 : _a.id
        ]);
        const insertId = result === null || result === void 0 ? void 0 : result.id;
        response_1.ResponseUtils.success(res, { id: insertId, title, filename: file.filename }, 'Document uploaded successfully');
    }
    catch (error) {
        console.error('Error uploading document:', error);
        // Clean up uploaded file on error
        if (file.path && fs_1.default.existsSync(file.path)) {
            fs_1.default.unlinkSync(file.path);
        }
        throw new errors_1.AppError('Failed to upload document', 500);
    }
}));
/**
 * PUT /admin/documents/:documentId
 * Update document metadata
 */
router.put('/documents/:documentId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { documentId } = req.params;
    const { title, description, isActive } = req.body;
    try {
        await database_1.DatabaseHelper.executeQuery(`
      UPDATE documents 
      SET title = $1, description = $2, is_active = $3, updated_at = NOW() 
      WHERE id = $4
    `, [title, description, isActive !== false, documentId]);
        response_1.ResponseUtils.success(res, { id: documentId }, 'Document updated successfully');
    }
    catch (error) {
        console.error('Error updating document:', error);
        throw new errors_1.AppError('Failed to update document', 500);
    }
}));
/**
 * DELETE /admin/documents/:documentId
 * Delete document
 */
router.delete('/documents/:documentId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { documentId } = req.params;
    try {
        // Get document file path before deletion
        const document = await database_1.DatabaseHelper.executeQuerySingle('SELECT file_path FROM documents WHERE id = $1', [documentId]);
        // Delete from database
        await database_1.DatabaseHelper.executeQuery('DELETE FROM documents WHERE id = $1', [documentId]);
        // Delete physical file
        if ((document === null || document === void 0 ? void 0 : document.file_path) && fs_1.default.existsSync(document.file_path)) {
            fs_1.default.unlinkSync(document.file_path);
        }
        response_1.ResponseUtils.success(res, { id: documentId }, 'Document deleted successfully');
    }
    catch (error) {
        console.error('Error deleting document:', error);
        throw new errors_1.AppError('Failed to delete document', 500);
    }
}));
/**
 * GET /admin/settings
 * Get system settings
 */
router.get('/settings', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        // Get SMTP settings from database/config
        const smtpSettings = await systemSettingsService_1.SystemSettingsService.getSMTPSettings();
        // Get other settings
        const systemSettings = await systemSettingsService_1.SystemSettingsService.getSettings([
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
        response_1.ResponseUtils.success(res, settings, 'Settings retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching settings:', error);
        throw new errors_1.AppError('Failed to fetch settings', 500);
    }
}));
/**
 * PUT /admin/settings
 * Update system settings
 */
router.put('/settings', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    try {
        const { systemName, systemDescription, maxFileSize, enableRegistration, enableGuestAccess, smtpHost, smtpPort, smtpUser, smtpPassword, enableEmailNotifications } = req.body;
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'admin';
        // Prepare settings to update
        const settingsToUpdate = {};
        if (systemName !== undefined)
            settingsToUpdate['system.name'] = systemName;
        if (systemDescription !== undefined)
            settingsToUpdate['system.description'] = systemDescription;
        if (maxFileSize !== undefined)
            settingsToUpdate['upload.max_file_size_mb'] = parseInt(maxFileSize);
        if (enableRegistration !== undefined)
            settingsToUpdate['security.enable_registration'] = enableRegistration;
        if (enableGuestAccess !== undefined)
            settingsToUpdate['security.enable_guest_access'] = enableGuestAccess;
        // SMTP settings
        if (smtpHost !== undefined)
            settingsToUpdate['smtp.host'] = smtpHost;
        if (smtpPort !== undefined)
            settingsToUpdate['smtp.port'] = parseInt(smtpPort);
        if (smtpUser !== undefined)
            settingsToUpdate['smtp.user'] = smtpUser;
        if (smtpPassword !== undefined && smtpPassword !== '***hidden***') {
            settingsToUpdate['smtp.password'] = smtpPassword;
        }
        if (enableEmailNotifications !== undefined) {
            settingsToUpdate['email.notifications_enabled'] = enableEmailNotifications;
        }
        // Update settings in database
        await systemSettingsService_1.SystemSettingsService.setSettings(settingsToUpdate, userId);
        // Force refresh email service configuration
        emailService_1.emailService.refreshConfiguration();
        response_1.ResponseUtils.success(res, { updated: Object.keys(settingsToUpdate) }, 'Settings updated successfully');
    }
    catch (error) {
        console.error('Error updating settings:', error);
        throw new errors_1.AppError('Failed to update settings', 500);
    }
}));
/**
 * POST /admin/settings/test-qdrant
 * Test Qdrant connection
 */
router.post('/settings/test-qdrant', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        // Simple connection test - try to access Qdrant health endpoint
        const qdrantUrl = process.env.QDRANT_URL;
        if (!qdrantUrl) {
            throw new errors_1.AppError('Qdrant URL not configured', 400);
        }
        const fetch = (await Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
        const response = await fetch(`${qdrantUrl}/health`);
        if (response.ok) {
            response_1.ResponseUtils.success(res, { status: 'connected' }, 'Qdrant connection successful');
        }
        else {
            throw new errors_1.AppError('Qdrant connection failed', 500);
        }
    }
    catch (error) {
        console.error('Qdrant connection test failed:', error);
        throw new errors_1.AppError('Failed to connect to Qdrant', 500);
    }
}));
/**
 * POST /admin/settings/test-smtp
 * Test SMTP connection
 */
router.post('/settings/test-smtp', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // For now, just return success. In production, you would test actual SMTP connection
    response_1.ResponseUtils.success(res, { status: 'connected' }, 'SMTP connection test successful');
}));
/**
 * GET /admin/stats/detailed
 * Get detailed statistics
 */
router.get('/stats/detailed', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        // Users by role
        const usersByRole = await database_1.DatabaseHelper.executeQuery(`
      SELECT role, COUNT(*) as count
      FROM users 
      GROUP BY role
    `);
        // Popular FAQs
        const popularFAQs = await database_1.DatabaseHelper.executeQuery(`
      SELECT id, title, view_count
      FROM faqs 
      WHERE is_active = true
      ORDER BY view_count DESC 
      LIMIT 10
    `);
        // Chats by month (last 6 months)
        const chatsByMonth = await database_1.DatabaseHelper.executeQuery(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
      FROM chats 
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
    `);
        // Messages by day (last 30 days)
        const messagesByDay = await database_1.DatabaseHelper.executeQuery(`
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
        response_1.ResponseUtils.success(res, detailedStats, 'Detailed statistics retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching detailed stats:', error);
        throw new errors_1.AppError('Failed to fetch detailed statistics', 500);
    }
}));
/**
 * POST /admin/settings/test-smtp
 * Test SMTP email configuration
 */
router.post('/settings/test-smtp', requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    try {
        // Test connection first
        const connectionTest = await emailService_1.emailService.testConnection();
        if (!connectionTest) {
            throw new errors_1.AppError('SMTP connection test failed. Please check your configuration.', 400);
        }
        // Get current user's email for test
        const testEmail = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.email) || 'admin@test.com';
        // Send test email
        await emailService_1.emailService.sendEmail({
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
        response_1.ResponseUtils.success(res, { sent: true, testEmail }, 'Test email sent successfully');
    }
    catch (error) {
        console.error('Error sending test email:', error);
        throw new errors_1.AppError(error instanceof Error ? error.message : 'Failed to send test email', 500);
    }
}));
/**
 * GET /admin/users/:userId/details
 * Get detailed user information including M2C roles, chat stats, and recent activity
 */
router.get('/users/:userId/details', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    try {
        // Get basic user information
        const user = await database_1.DatabaseHelper.executeQuerySingle(`
      SELECT id, email, full_name, name, role, company, 
        selected_m2c_role_ids, can_access_cs30, created_at, updated_at
      FROM users 
      WHERE id = $1
    `, [userId]);
        if (!user) {
            throw new errors_1.AppError('User not found', 404);
        }
        // Get M2C role names based on the selected_m2c_role_ids array
        const m2cRoles = await database_1.DatabaseHelper.executeQuery(`
      SELECT role_name
      FROM m2c_roles
      WHERE id = ANY($1::uuid[])
    `, [user.selected_m2c_role_ids]);
        // Get chat statistics
        const chatStats = await database_1.DatabaseHelper.executeQuerySingle(`
      SELECT 
        (SELECT COUNT(*) FROM chats WHERE user_id = $1) AS chat_count,
        (SELECT COUNT(*) FROM messages WHERE chat_id IN (SELECT id FROM chats WHERE user_id = $1)) AS message_count
    `, [userId]);
        // Get recent chats
        const recentChats = await database_1.DatabaseHelper.executeQuery(`
      SELECT c.id, c.title, c.created_at, c.updated_at,
        (SELECT COUNT(*) FROM messages WHERE chat_id = c.id) AS message_count
      FROM chats c
      WHERE c.user_id = $1
      ORDER BY c.updated_at DESC
      LIMIT 5
    `, [userId]);
        // Get quiz statistics
        const quizStats = await database_1.DatabaseHelper.executeQuerySingle(`
      SELECT 
        COUNT(*) AS completed_quizzes,
        AVG(percentage) AS avg_quiz_score
      FROM user_quiz_attempts
      WHERE user_id = $1 AND is_completed = true
    `, [userId]);
        // Combine all data
        const userDetails = {
            ...user,
            is_active: true, // Assuming all users in the database are active
            m2c_roles: m2cRoles.map(role => role.role_name),
            chat_count: parseInt((chatStats === null || chatStats === void 0 ? void 0 : chatStats.chat_count) || '0'),
            message_count: parseInt((chatStats === null || chatStats === void 0 ? void 0 : chatStats.message_count) || '0'),
            recent_chats: recentChats.map(chat => ({
                ...chat,
                message_count: parseInt(chat.message_count)
            })),
            completed_quizzes: parseInt((quizStats === null || quizStats === void 0 ? void 0 : quizStats.completed_quizzes) || '0'),
            avg_quiz_score: (quizStats === null || quizStats === void 0 ? void 0 : quizStats.avg_quiz_score) ? Math.round(quizStats.avg_quiz_score) : null
        };
        response_1.ResponseUtils.success(res, userDetails, 'User details retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching user details:', error);
        throw new errors_1.AppError('Failed to fetch user details', 500);
    }
}));
exports.default = router;
/**
 * Additional Admin Utilities
 * - Clone a user's chat as the current admin
 * - Run parameterizable semantic search
 */
// Clone a chat as admin (creates a new chat owned by admin and copies messages)
router.post('/chats/:chatId/clone-as-admin', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const adminUserId = req.user.id;
    // Start a transaction to ensure consistency
    const client = await database_2.default.connect();
    try {
        await client.query('BEGIN');
        // Load original chat
        const chatResult = await client.query('SELECT id, title, user_id FROM chats WHERE id = $1', [chatId]);
        if (chatResult.rows.length === 0) {
            throw new errors_1.AppError('Chat not found', 404);
        }
        const original = chatResult.rows[0];
        // Create new chat for admin
        const newTitle = `Kopie von ${original.title || 'Chat'}`.substring(0, 200);
        const newChatInsert = await client.query('INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at, updated_at', [adminUserId, newTitle]);
        const newChat = newChatInsert.rows[0];
        // Copy messages
        const messages = await client.query('SELECT role, content, metadata FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [chatId]);
        let copied = 0;
        for (const m of messages.rows) {
            await client.query('INSERT INTO messages (chat_id, role, content, metadata) VALUES ($1, $2, $3, $4)', [newChat.id, m.role, m.content, m.metadata || null]);
            copied++;
        }
        await client.query('COMMIT');
        return response_1.ResponseUtils.success(res, { newChat, copiedMessages: copied }, 'Chat cloned as admin');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error cloning chat as admin:', error);
        throw new errors_1.AppError('Failed to clone chat', 500);
    }
    finally {
        client.release();
    }
}));
// Parameterizable semantic search
router.post('/semantic-search', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { query, mode, limit, scoreThreshold, alpha, outlineScoping, excludeVisual, userId, teamId } = req.body || {};
    if (!query || typeof query !== 'string' || !query.trim()) {
        throw new errors_1.AppError('Query is required', 400);
    }
    const svc = new qdrant_1.QdrantService();
    const m = (mode || 'guided');
    const lim = Math.max(1, Math.min(parseInt(limit !== null && limit !== void 0 ? limit : 20, 10) || 20, 100));
    const thr = typeof scoreThreshold === 'number' ? scoreThreshold : 0.5;
    const a = typeof alpha === 'number' ? alpha : 0.75;
    const outline = outlineScoping !== false; // default true
    const exclude = excludeVisual !== false; // default true
    try {
        let result;
        if (m === 'simple') {
            result = await qdrant_1.QdrantService.searchByText(query, lim, thr);
        }
        else if (m === 'guided') {
            result = await qdrant_1.QdrantService.semanticSearchGuided(query, { limit: lim, alpha: a, outlineScoping: outline, excludeVisual: exclude });
        }
        else if (m === 'hybrid') {
            result = await svc.searchWithHybrid(query, lim, thr, a, userId, teamId);
        }
        else if (m === 'optimized') {
            // Respect DISABLE_HYDE env flag while allowing explicit override via query param in future
            const disableHydeEnv = (process.env.DISABLE_HYDE || '').toLowerCase();
            const hydeGloballyDisabled = disableHydeEnv === '1' || disableHydeEnv === 'true' || disableHydeEnv === 'yes';
            result = await svc.searchWithOptimizations(query, lim, thr, !hydeGloballyDisabled);
        }
        else if (m === 'faqs') {
            result = await svc.searchFAQs(query, lim, thr);
        }
        else if (m === 'cs30') {
            result = await svc.searchCs30(query, Math.min(lim, 20), Math.max(thr, 0.7));
        }
        else {
            result = await qdrant_1.QdrantService.searchByText(query, lim, thr);
        }
        return response_1.ResponseUtils.success(res, { mode: m, limit: lim, scoreThreshold: thr, alpha: a, results: result }, 'Semantic search executed');
    }
    catch (error) {
        console.error('Error in semantic search:', error);
        throw new errors_1.AppError('Semantic search failed', 500);
    }
}));
// Chatflow preview/steering for admins
router.post('/chatflow/preview', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { query, chatId, targetUserId, useDetailedIntentAnalysis, overridePipeline } = req.body || {};
    if (!query || typeof query !== 'string') {
        throw new errors_1.AppError('Query is required', 400);
    }
    // Load previous messages if chatId provided
    let previousMessages = [];
    if (chatId) {
        const msgs = await database_2.default.query('SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [chatId]);
        previousMessages = msgs.rows;
    }
    // Load user preferences for target user if provided, else current admin (minimal set)
    let userIdForPrefs = targetUserId || req.user.id;
    const prefs = await database_2.default.query('SELECT companies_of_interest, preferred_topics FROM user_preferences WHERE user_id = $1', [userIdForPrefs]);
    const userPreferences = { ...(prefs.rows[0] || {}), user_id: userIdForPrefs };
    // Build context settings with admin overrides
    const contextSettings = {
        useDetailedIntentAnalysis: useDetailedIntentAnalysis === true,
        ...(overridePipeline ? { overridePipeline } : {})
    };
    // Execute reasoning without persisting
    const result = await advancedReasoningService_1.default.generateReasonedResponse(query, previousMessages, userPreferences, contextSettings);
    return response_1.ResponseUtils.success(res, { result, used: { useDetailedIntentAnalysis: !!contextSettings.useDetailedIntentAnalysis, overridePipeline: overridePipeline || null, chatId: chatId || null, targetUserId: userIdForPrefs } }, 'Chatflow preview generated');
}));
//# sourceMappingURL=admin.js.map