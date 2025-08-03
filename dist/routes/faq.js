"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const database_1 = __importDefault(require("../config/database"));
const gemini_1 = __importDefault(require("../services/gemini"));
const qdrant_1 = require("../services/qdrant");
const faqLinkingService_1 = require("../services/faqLinkingService");
const router = (0, express_1.Router)();
router.get('/faqs', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 10, offset = 0, tag, search, sort = 'created_at', order = 'desc' } = req.query;
    let query = `
    SELECT id, title, description, context, answer, additional_info, tags,
           view_count, is_public, created_at, updated_at
    FROM faqs
    WHERE is_active = true
  `;
    const queryParams = [];
    if (search) {
        query += ` AND (
      title ILIKE $${queryParams.length + 1} OR 
      description ILIKE $${queryParams.length + 1} OR 
      answer ILIKE $${queryParams.length + 1} OR 
      context ILIKE $${queryParams.length + 1}
    )`;
        queryParams.push(`%${search}%`);
    }
    if (tag) {
        query += ` AND tags @> $${queryParams.length + 1}`;
        queryParams.push(JSON.stringify([tag]));
    }
    const validSortFields = ['created_at', 'updated_at', 'view_count', 'title'];
    const validOrders = ['asc', 'desc'];
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order) ? order : 'desc';
    query += ` ORDER BY ${sortField} ${sortOrder.toUpperCase()}`;
    query += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);
    const result = await database_1.default.query(query, queryParams);
    let countQuery = `
    SELECT COUNT(*) 
    FROM faqs 
    WHERE is_active = true
  `;
    const countParams = [];
    if (search) {
        countQuery += ` AND (
      title ILIKE $${countParams.length + 1} OR 
      description ILIKE $${countParams.length + 1} OR 
      answer ILIKE $${countParams.length + 1} OR 
      context ILIKE $${countParams.length + 1}
    )`;
        countParams.push(`%${search}%`);
    }
    if (tag) {
        countQuery += ` AND tags @> $${countParams.length + 1}`;
        countParams.push(JSON.stringify([tag]));
    }
    const countResult = await database_1.default.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    const faqsWithLinks = await Promise.all(result.rows.map(async (faq) => {
        const linkedTerms = await faqLinkingService_1.faqLinkingService.getLinksForFAQ(faq.id);
        return {
            ...faq,
            linked_terms: linkedTerms
        };
    }));
    res.json({
        success: true,
        data: faqsWithLinks,
        pagination: {
            total: totalCount,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: parseInt(offset) + parseInt(limit) < totalCount
        }
    });
}));
router.get('/faqs/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const result = await database_1.default.query(`
    SELECT id, title, description, context, answer, additional_info, tags,
           view_count, is_public, created_at, updated_at
    FROM faqs
    WHERE id = $1 AND is_active = true
  `, [id]);
    if (result.rows.length === 0) {
        throw new errorHandler_1.AppError('FAQ not found', 404);
    }
    const linkedTerms = await faqLinkingService_1.faqLinkingService.getLinksForFAQ(id);
    await database_1.default.query('UPDATE faqs SET view_count = view_count + 1 WHERE id = $1', [id]);
    const faqWithLinks = {
        ...result.rows[0],
        linked_terms: linkedTerms
    };
    res.json({
        success: true,
        data: faqWithLinks
    });
}));
router.post('/faqs/:id/start-chat', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const faqResult = await database_1.default.query(`
    SELECT title, description, context, answer FROM faqs WHERE id = $1 AND is_active = true
  `, [id]);
    if (faqResult.rows.length === 0) {
        throw new errorHandler_1.AppError('FAQ not found', 404);
    }
    const faq = faqResult.rows[0];
    const chatResult = await database_1.default.query('INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at, updated_at', [userId, `FAQ: ${faq.title}`]);
    const chat = chatResult.rows[0];
    const initialMessage = `Basierend auf dem FAQ-Eintrag "${faq.title}":\n\n${faq.description}\n\nKönnen Sie mir mehr dazu erklären?`;
    await database_1.default.query('INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3)', [chat.id, 'user', initialMessage]);
    res.json({
        success: true,
        data: {
            chat: chat,
            initialMessage: initialMessage
        }
    });
}));
router.get('/faq-tags', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = await database_1.default.query(`
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
const requireAdminForFaq = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        throw new errorHandler_1.AppError('Admin access required', 403);
    }
    next();
};
router.get('/admin/chats', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;
    const result = await database_1.default.query(`
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
router.get('/admin/chats/:chatId', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const chatResult = await database_1.default.query(`
    SELECT c.id, c.title, c.created_at, c.updated_at,
           u.full_name as user_name, u.email as user_email
    FROM chats c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = $1
  `, [chatId]);
    if (chatResult.rows.length === 0) {
        throw new errorHandler_1.AppError('Chat not found', 404);
    }
    const messagesResult = await database_1.default.query(`
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
router.post('/admin/chats/:chatId/create-faq', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.id;
    const messagesResult = await database_1.default.query(`
    SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY created_at ASC
  `, [chatId]);
    if (messagesResult.rows.length === 0) {
        throw new errorHandler_1.AppError('No messages found in chat', 400);
    }
    const messages = messagesResult.rows;
    const faqContent = await gemini_1.default.generateFAQContent(messages);
    const faqResult = await database_1.default.query(`
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
    const newFAQ = faqResult.rows[0];
    try {
        const qdrantService = new qdrant_1.QdrantService();
        await qdrantService.storeFAQContent(newFAQ.id, newFAQ.title, newFAQ.description, newFAQ.context, newFAQ.answer, newFAQ.additional_info, newFAQ.tags);
    }
    catch (error) {
        console.error('Error storing FAQ in vector database:', error);
    }
    res.json({
        success: true,
        data: newFAQ
    });
}));
router.get('/admin/faqs', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 20, offset = 0 } = req.query;
    const result = await database_1.default.query(`
    SELECT f.id, f.title, f.description, f.context, f.answer, f.additional_info, 
           f.tags, f.is_active, f.is_public, f.view_count,
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
router.put('/admin/faqs/:id', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
    if (enhance_with_context) {
        try {
            const searchQuery = `${title} ${description} ${tags.join(' ')}`;
            const searchResults = await qdrant_1.QdrantService.searchByText(searchQuery, 5);
            let searchContext = '';
            if (searchResults.length > 0) {
                searchContext = searchResults.map((result) => result.payload.text).join('\n\n');
            }
            const enhancedFAQ = await gemini_1.default.enhanceFAQWithContext(finalFAQData, searchContext);
            finalFAQData = enhancedFAQ;
        }
        catch (error) {
            console.error('Error enhancing FAQ with context:', error);
        }
    }
    const result = await database_1.default.query(`
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
        throw new errorHandler_1.AppError('FAQ not found', 404);
    }
    const updatedFAQ = result.rows[0];
    try {
        const qdrantService = new qdrant_1.QdrantService();
        await qdrantService.updateFAQContent(updatedFAQ.id, updatedFAQ.title, updatedFAQ.description, updatedFAQ.context, updatedFAQ.answer, updatedFAQ.additional_info, updatedFAQ.tags);
    }
    catch (error) {
        console.error('Error updating FAQ in vector database:', error);
    }
    res.json({
        success: true,
        data: updatedFAQ
    });
}));
router.delete('/admin/faqs/:id', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const result = await database_1.default.query('DELETE FROM faqs WHERE id = $1', [id]);
    if (result.rowCount === 0) {
        throw new errorHandler_1.AppError('FAQ not found', 404);
    }
    try {
        const qdrantService = new qdrant_1.QdrantService();
        await qdrantService.deleteFAQContent(id);
    }
    catch (error) {
        console.error('Error deleting FAQ from vector database:', error);
    }
    res.json({
        success: true,
        message: 'FAQ deleted successfully'
    });
}));
router.get('/admin/faqs/:id/links', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const links = await faqLinkingService_1.faqLinkingService.getLinksForFAQ(id);
    res.json({
        success: true,
        data: links
    });
}));
router.post('/admin/faqs/links', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { source_faq_id, target_faq_id, term, display_text, is_automatic } = req.body;
    const userId = req.user.id;
    if (!source_faq_id || !target_faq_id || !term) {
        throw new errorHandler_1.AppError('Source FAQ ID, target FAQ ID, and term are required', 400);
    }
    const link = await faqLinkingService_1.faqLinkingService.createLink({
        source_faq_id,
        target_faq_id,
        term,
        display_text,
        is_automatic: is_automatic || false
    }, userId);
    res.json({
        success: true,
        data: link
    });
}));
router.delete('/admin/faqs/links/:linkId', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { linkId } = req.params;
    const deleted = await faqLinkingService_1.faqLinkingService.deleteLink(linkId);
    if (!deleted) {
        throw new errorHandler_1.AppError('Link not found', 404);
    }
    res.json({
        success: true,
        message: 'Link deleted successfully'
    });
}));
router.post('/admin/faqs/:id/generate-links', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const createdLinksCount = await faqLinkingService_1.faqLinkingService.createAutomaticLinks(id, userId);
    res.json({
        success: true,
        message: `${createdLinksCount} automatic links created`,
        data: { created_links: createdLinksCount }
    });
}));
router.get('/admin/faqs/linking-stats', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const stats = await faqLinkingService_1.faqLinkingService.getLinkingStats();
    res.json({
        success: true,
        data: stats
    });
}));
router.get('/public/faqs', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 10, offset = 0, tag, search, sort = 'created_at', order = 'desc' } = req.query;
    let query = `
    SELECT id, title, description, context, answer, additional_info, tags,
           view_count, created_at, updated_at
    FROM faqs
    WHERE is_active = true AND is_public = true
  `;
    const queryParams = [];
    if (search) {
        query += ` AND (
      title ILIKE $${queryParams.length + 1} OR 
      description ILIKE $${queryParams.length + 1} OR 
      answer ILIKE $${queryParams.length + 1} OR 
      context ILIKE $${queryParams.length + 1}
    )`;
        queryParams.push(`%${search}%`);
    }
    if (tag) {
        query += ` AND tags @> $${queryParams.length + 1}`;
        queryParams.push(JSON.stringify([tag]));
    }
    const validSortFields = ['created_at', 'updated_at', 'view_count', 'title'];
    const validOrders = ['asc', 'desc'];
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order) ? order : 'desc';
    query += ` ORDER BY ${sortField} ${sortOrder.toUpperCase()}`;
    query += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);
    const result = await database_1.default.query(query, queryParams);
    let countQuery = `
    SELECT COUNT(*) 
    FROM faqs 
    WHERE is_active = true AND is_public = true
  `;
    const countParams = [];
    if (search) {
        countQuery += ` AND (
      title ILIKE $${countParams.length + 1} OR 
      description ILIKE $${countParams.length + 1} OR 
      answer ILIKE $${countParams.length + 1} OR 
      context ILIKE $${countParams.length + 1}
    )`;
        countParams.push(`%${search}%`);
    }
    if (tag) {
        countQuery += ` AND tags @> $${countParams.length + 1}`;
        countParams.push(JSON.stringify([tag]));
    }
    const countResult = await database_1.default.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    const faqsWithLinks = await Promise.all(result.rows.map(async (faq) => {
        const linkedTerms = await faqLinkingService_1.faqLinkingService.getLinksForFAQ(faq.id);
        return {
            ...faq,
            linked_terms: linkedTerms
        };
    }));
    res.json({
        success: true,
        data: faqsWithLinks,
        pagination: {
            total: totalCount,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: parseInt(offset) + parseInt(limit) < totalCount
        }
    });
}));
exports.default = router;
//# sourceMappingURL=faq.js.map