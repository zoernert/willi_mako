import { Router, Response, Request } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import pool from '../config/database';
import GeminiService from '../services/gemini';
import QdrantService from '../services/qdrant';

const router = Router();

// Get all FAQs for public display
router.get('/faqs', asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10, offset = 0, tag } = req.query;
  
  let query = `
    SELECT id, title, description, context, answer, additional_info, tags,
           view_count, created_at, updated_at
    FROM faqs
    WHERE is_active = true
  `;
  
  const queryParams: any[] = [];
  
  if (tag) {
    query += ` AND tags @> $${queryParams.length + 1}`;
    queryParams.push(JSON.stringify([tag]));
  }
  
  query += `
    ORDER BY created_at DESC
    LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
  `;
  
  queryParams.push(limit, offset);
  
  const result = await pool.query(query, queryParams);
  
  res.json({
    success: true,
    data: result.rows
  });
}));

// Get specific FAQ by ID
router.get('/faqs/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const result = await pool.query(`
    SELECT id, title, description, context, answer, additional_info, tags,
           view_count, created_at, updated_at
    FROM faqs
    WHERE id = $1 AND is_active = true
  `, [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('FAQ not found', 404);
  }
  
  // Increment view count
  await pool.query(
    'UPDATE faqs SET view_count = view_count + 1 WHERE id = $1',
    [id]
  );
  
  res.json({
    success: true,
    data: result.rows[0]
  });
}));

// Start chat from FAQ (authenticated)
router.post('/faqs/:id/start-chat', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  
  // Get FAQ details
  const faqResult = await pool.query(`
    SELECT title, description, context, answer FROM faqs WHERE id = $1 AND is_active = true
  `, [id]);
  
  if (faqResult.rows.length === 0) {
    throw new AppError('FAQ not found', 404);
  }
  
  const faq = faqResult.rows[0];
  
  // Create new chat
  const chatResult = await pool.query(
    'INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at, updated_at',
    [userId, `FAQ: ${faq.title}`]
  );
  
  const chat = chatResult.rows[0];
  
  // Create initial message with FAQ context
  const initialMessage = `Basierend auf dem FAQ-Eintrag "${faq.title}":\n\n${faq.description}\n\nKönnen Sie mir mehr dazu erklären?`;
  
  await pool.query(
    'INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3)',
    [chat.id, 'user', initialMessage]
  );
  
  res.json({
    success: true,
    data: {
      chat: chat,
      initialMessage: initialMessage
    }
  });
}));

// Get all available tags
router.get('/faq-tags', asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query(`
    SELECT DISTINCT tag
    FROM (
      SELECT jsonb_array_elements_text(tags) as tag
      FROM faqs
      WHERE is_active = true
    ) as tags
    ORDER BY tag
  `);
  
  res.json({
    success: true,
    data: result.rows.map(row => row.tag)
  });
}));

// Admin routes - require admin authentication
router.use((req: AuthenticatedRequest, res, next) => {
  if (req.user?.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }
  next();
});

// Get all chats for admin (to create FAQs from)
router.get('/admin/chats', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { limit = 50, offset = 0 } = req.query;
  
  const result = await pool.query(`
    SELECT c.id, c.title, c.created_at, c.updated_at,
           u.full_name as user_name, u.email as user_email,
           COUNT(m.id) as message_count,
           (SELECT COUNT(*) FROM messages WHERE chat_id = c.id AND role = 'assistant') as ai_responses
    FROM chats c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN messages m ON c.id = m.chat_id
    GROUP BY c.id, c.title, c.created_at, c.updated_at, u.full_name, u.email
    HAVING COUNT(m.id) > 0
    ORDER BY c.updated_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);
  
  res.json({
    success: true,
    data: result.rows
  });
}));

// Get specific chat details for admin
router.get('/admin/chats/:chatId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { chatId } = req.params;
  
  const chatResult = await pool.query(`
    SELECT c.id, c.title, c.created_at, c.updated_at,
           u.full_name as user_name, u.email as user_email
    FROM chats c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = $1
  `, [chatId]);
  
  if (chatResult.rows.length === 0) {
    throw new AppError('Chat not found', 404);
  }
  
  const messagesResult = await pool.query(`
    SELECT id, role, content, created_at
    FROM messages
    WHERE chat_id = $1
    ORDER BY created_at ASC
  `, [chatId]);
  
  res.json({
    success: true,
    data: {
      chat: chatResult.rows[0],
      messages: messagesResult.rows
    }
  });
}));

// Create FAQ from chat
router.post('/admin/chats/:chatId/create-faq', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { chatId } = req.params;
  const userId = req.user!.id;
  
  // Get chat messages
  const messagesResult = await pool.query(`
    SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY created_at ASC
  `, [chatId]);
  
  if (messagesResult.rows.length === 0) {
    throw new AppError('No messages found in chat', 400);
  }
  
  const messages = messagesResult.rows;
  
  // Generate FAQ content using LLM
  const faqContent = await GeminiService.generateFAQContent(messages);
  
  // Create FAQ with auto-generated content
  const faqResult = await pool.query(`
    INSERT INTO faqs (title, description, context, answer, additional_info, tags, source_chat_id, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, title, description, context, answer, additional_info, tags, created_at
  `, [
    faqContent.title,
    faqContent.description,
    faqContent.context,
    faqContent.answer,
    faqContent.additionalInfo,
    JSON.stringify(faqContent.tags),
    chatId,
    userId
  ]);
  
  res.json({
    success: true,
    data: faqResult.rows[0]
  });
}));

// Get all FAQs for admin management
router.get('/admin/faqs', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { limit = 20, offset = 0 } = req.query;
  
  const result = await pool.query(`
    SELECT f.id, f.title, f.description, f.tags, f.is_active, f.view_count,
           f.created_at, f.updated_at,
           u.full_name as created_by_name
    FROM faqs f
    LEFT JOIN users u ON f.created_by = u.id
    ORDER BY f.created_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);
  
  res.json({
    success: true,
    data: result.rows
  });
}));

// Update FAQ
router.put('/admin/faqs/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { title, description, context, answer, additional_info, tags, is_active, enhance_with_context } = req.body;
  
  let finalFAQData = {
    title,
    description,
    context,
    answer,
    additionalInfo: additional_info,
    tags
  };
  
  // If enhance_with_context is true, search for relevant context and enhance the FAQ
  if (enhance_with_context) {
    try {
      // Search for relevant context using title, description, and tags
      const searchQuery = `${title} ${description} ${tags.join(' ')}`;
      const searchResults = await QdrantService.searchByText(searchQuery, 5);
      
      let searchContext = '';
      if (searchResults.length > 0) {
        searchContext = searchResults.map((result: any) => result.payload.text).join('\n\n');
      }
      
      // Enhance FAQ with LLM using the search context
      const enhancedFAQ = await GeminiService.enhanceFAQWithContext(finalFAQData, searchContext);
      finalFAQData = enhancedFAQ;
    } catch (error) {
      console.error('Error enhancing FAQ with context:', error);
      // Continue with original data if enhancement fails
    }
  }

  const result = await pool.query(`
    UPDATE faqs 
    SET title = $1, description = $2, context = $3, answer = $4, 
        additional_info = $5, tags = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP
    WHERE id = $8
    RETURNING *
  `, [
    finalFAQData.title, 
    finalFAQData.description, 
    finalFAQData.context, 
    finalFAQData.answer, 
    finalFAQData.additionalInfo, 
    JSON.stringify(finalFAQData.tags), 
    is_active, 
    id
  ]);

  if (result.rows.length === 0) {
    throw new AppError('FAQ not found', 404);
  }

  res.json({
    success: true,
    data: result.rows[0]
  });
}));

// Delete FAQ
router.delete('/admin/faqs/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  const result = await pool.query('DELETE FROM faqs WHERE id = $1', [id]);
  
  if (result.rowCount === 0) {
    throw new AppError('FAQ not found', 404);
  }
  
  res.json({
    success: true,
    message: 'FAQ deleted successfully'
  });
}));

export default router;
