import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import pool from '../config/database';

const router = Router();

// Get user profile
router.get('/profile', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  
  const user = await pool.query(
    'SELECT id, email, full_name, company, created_at FROM users WHERE id = $1',
    [userId]
  );
  
  if (user.rows.length === 0) {
    throw new AppError('User not found', 404);
  }
  
  res.json({
    success: true,
    data: user.rows[0]
  });
}));

// Update user profile
router.put('/profile', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { fullName, company } = req.body;
  
  const result = await pool.query(
    'UPDATE users SET full_name = $1, company = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, email, full_name, company',
    [fullName, company, userId]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }
  
  res.json({
    success: true,
    data: result.rows[0]
  });
}));

// Get user preferences
router.get('/preferences', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  
  const preferences = await pool.query(
    'SELECT companies_of_interest, preferred_topics, notification_settings FROM user_preferences WHERE user_id = $1',
    [userId]
  );
  
  if (preferences.rows.length === 0) {
    // Create default preferences if they don't exist
    await pool.query(
      'INSERT INTO user_preferences (user_id) VALUES ($1)',
      [userId]
    );
    
    res.json({
      success: true,
      data: {
        companies_of_interest: [],
        preferred_topics: [],
        notification_settings: {}
      }
    });
  } else {
    res.json({
      success: true,
      data: preferences.rows[0]
    });
  }
}));

// Update user preferences
router.put('/preferences', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { companiesOfInterest, preferredTopics, notificationSettings } = req.body;
  
  const result = await pool.query(
    `UPDATE user_preferences 
     SET companies_of_interest = $1, preferred_topics = $2, notification_settings = $3, updated_at = CURRENT_TIMESTAMP 
     WHERE user_id = $4 
     RETURNING companies_of_interest, preferred_topics, notification_settings`,
    [
      JSON.stringify(companiesOfInterest || []),
      JSON.stringify(preferredTopics || []),
      JSON.stringify(notificationSettings || {}),
      userId
    ]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Preferences not found', 404);
  }
  
  res.json({
    success: true,
    data: result.rows[0]
  });
}));

// Get available documents/cheat sheets
router.get('/documents', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const documents = await pool.query(
    'SELECT id, title, description, file_size, created_at FROM documents WHERE is_active = true ORDER BY created_at DESC'
  );
  
  res.json({
    success: true,
    data: documents.rows
  });
}));

// Get document content
router.get('/documents/:documentId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { documentId } = req.params;
  
  const document = await pool.query(
    'SELECT id, title, description, file_path, mime_type FROM documents WHERE id = $1 AND is_active = true',
    [documentId]
  );
  
  if (document.rows.length === 0) {
    throw new AppError('Document not found', 404);
  }
  
  res.json({
    success: true,
    data: document.rows[0]
  });
}));

// Get chat statistics
router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  
  // Get total chats
  const totalChats = await pool.query(
    'SELECT COUNT(*) as count FROM chats WHERE user_id = $1',
    [userId]
  );
  
  // Get total messages
  const totalMessages = await pool.query(
    'SELECT COUNT(*) as count FROM messages m JOIN chats c ON m.chat_id = c.id WHERE c.user_id = $1',
    [userId]
  );
  
  // Get recent activity (last 30 days)
  const recentActivity = await pool.query(
    'SELECT COUNT(*) as count FROM messages m JOIN chats c ON m.chat_id = c.id WHERE c.user_id = $1 AND m.created_at > NOW() - INTERVAL \'30 days\'',
    [userId]
  );
  
  res.json({
    success: true,
    data: {
      totalChats: parseInt(totalChats.rows[0].count),
      totalMessages: parseInt(totalMessages.rows[0].count),
      recentActivity: parseInt(recentActivity.rows[0].count)
    }
  });
}));

export default router;
