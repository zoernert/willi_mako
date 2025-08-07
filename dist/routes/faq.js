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
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const database_1 = __importDefault(require("../config/database"));
const gemini_1 = __importDefault(require("../services/gemini"));
const qdrant_1 = require("../services/qdrant");
const faqLinkingService_1 = require("../services/faqLinkingService");
const router = (0, express_1.Router)();
// Get all FAQs for public display with links
router.get('/faqs', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 10, offset = 0, tag, search, sort = 'created_at', order = 'desc' } = req.query;
    let query = `
    SELECT id, title, description, context, answer, additional_info, tags,
           view_count, is_public, created_at, updated_at
    FROM faqs
    WHERE is_active = true
  `;
    const queryParams = [];
    // Search functionality
    if (search) {
        query += ` AND (
      title ILIKE $${queryParams.length + 1} OR 
      description ILIKE $${queryParams.length + 1} OR 
      answer ILIKE $${queryParams.length + 1} OR 
      context ILIKE $${queryParams.length + 1}
    )`;
        queryParams.push(`%${search}%`);
    }
    // Tag filtering
    if (tag) {
        query += ` AND tags @> $${queryParams.length + 1}`;
        queryParams.push(JSON.stringify([tag]));
    }
    // Sorting
    const validSortFields = ['created_at', 'updated_at', 'view_count', 'title'];
    const validOrders = ['asc', 'desc'];
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order) ? order : 'desc';
    query += ` ORDER BY ${sortField} ${sortOrder.toUpperCase()}`;
    query += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);
    const result = await database_1.default.query(query, queryParams);
    // Get total count for pagination
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
    // Add linked terms to each FAQ
    const faqsWithLinks = await Promise.all(result.rows.map(async (faq) => {
        const linkedTerms = await faqLinkingService_1.faqLinkingService.getLinksForFAQ(faq.id);
        // Import and get related FAQs
        const { getRelatedFAQs } = await Promise.resolve().then(() => __importStar(require('../../lib/faq-api')));
        const relatedFAQs = await getRelatedFAQs(faq.id, faq.context + ' ' + faq.answer, 5);
        // Parse tags from JSON string to array
        let parsedTags;
        try {
            parsedTags = typeof faq.tags === 'string' ? JSON.parse(faq.tags) : faq.tags;
        }
        catch (parseError) {
            console.error('Error parsing tags:', parseError);
            parsedTags = ['Energiewirtschaft']; // fallback
        }
        return Object.assign(Object.assign({}, faq), { tags: parsedTags, linked_terms: linkedTerms, related_faqs: relatedFAQs });
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
// Get specific FAQ by ID with links
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
    // Get linked terms for this FAQ
    const linkedTerms = await faqLinkingService_1.faqLinkingService.getLinksForFAQ(id);
    // Increment view count
    await database_1.default.query('UPDATE faqs SET view_count = view_count + 1 WHERE id = $1', [id]);
    // Parse tags from JSON string to array
    const faq = result.rows[0];
    let parsedTags;
    try {
        parsedTags = typeof faq.tags === 'string' ? JSON.parse(faq.tags) : faq.tags;
    }
    catch (parseError) {
        console.error('Error parsing tags:', parseError);
        parsedTags = ['Energiewirtschaft']; // fallback
    }
    const faqWithLinks = Object.assign(Object.assign({}, faq), { tags: parsedTags, linked_terms: linkedTerms });
    res.json({
        success: true,
        data: faqWithLinks
    });
}));
// Start chat from FAQ (authenticated)
router.post('/faqs/:id/start-chat', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    // Get FAQ details
    const faqResult = await database_1.default.query(`
    SELECT title, description, context, answer FROM faqs WHERE id = $1 AND is_active = true
  `, [id]);
    if (faqResult.rows.length === 0) {
        throw new errorHandler_1.AppError('FAQ not found', 404);
    }
    const faq = faqResult.rows[0];
    // Create new chat
    const chatResult = await database_1.default.query('INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at, updated_at', [userId, `FAQ: ${faq.title}`]);
    const chat = chatResult.rows[0];
    // Create initial message with FAQ context
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
// Get all available tags
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
// Admin middleware - only for admin routes
const requireAdminForFaq = (req, res, next) => {
    var _a;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new errorHandler_1.AppError('Admin access required', 403);
    }
    next();
};
// Get all chats for admin (to create FAQs from)
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
// Get specific chat details for admin
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
// Create FAQ from chat
router.post('/admin/chats/:chatId/create-faq', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a, _b;
    console.log('=== CREATE FAQ ENDPOINT START ===');
    console.log('Request params:', req.params);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', (_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
    const { chatId } = req.params;
    const userId = req.user.id;
    console.log('Processing chatId:', chatId, 'userId:', userId);
    // Get chat messages
    const messagesResult = await database_1.default.query(`
    SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY created_at ASC
  `, [chatId]);
    if (messagesResult.rows.length === 0) {
        throw new errorHandler_1.AppError('No messages found in chat', 400);
    }
    const messages = messagesResult.rows;
    // Generate FAQ content using LLM with error handling
    console.log('Calling generateFAQContent with messages:', messages.length);
    let faqContent;
    try {
        faqContent = await gemini_1.default.generateFAQContent(messages);
        console.log('Generated FAQ content successfully');
        // Validate the FAQ content structure
        if (!faqContent || typeof faqContent !== 'object') {
            throw new Error('Invalid FAQ content structure returned from AI');
        }
        // Ensure all required fields are present and valid
        faqContent.title = (faqContent.title && faqContent.title.trim()) || 'FAQ aus Chat erstellt';
        faqContent.description = (faqContent.description && faqContent.description.trim()) || 'Automatisch generierter FAQ-Eintrag';
        faqContent.context = (faqContent.context && faqContent.context.trim()) || 'Basierend auf einer Unterhaltung';
        faqContent.answer = (faqContent.answer && faqContent.answer.trim()) || 'Detaillierte Antwort';
        faqContent.additionalInfo = (faqContent.additionalInfo && faqContent.additionalInfo.trim()) || 'Weitere Informationen';
        faqContent.tags = Array.isArray(faqContent.tags) && faqContent.tags.length > 0 ? faqContent.tags : ['Energiewirtschaft'];
        console.log('Validated FAQ content:', {
            title: faqContent.title.substring(0, 50) + '...',
            tagsCount: faqContent.tags.length,
            hasDescription: !!faqContent.description,
            hasContext: !!faqContent.context,
            hasAnswer: !!faqContent.answer
        });
    }
    catch (error) {
        console.error('Error generating FAQ content:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: (_b = error.stack) === null || _b === void 0 ? void 0 : _b.substring(0, 500)
        });
        // Provide fallback content if AI generation fails
        faqContent = {
            title: 'FAQ aus Chat erstellt',
            description: 'Automatisch generierter FAQ-Eintrag aus einem Chat-Verlauf',
            context: 'Basierend auf einer Unterhaltung mit einem Nutzer',
            answer: 'Detaillierte Antwort wird bei der nächsten Bearbeitung ergänzt',
            additionalInfo: 'Weitere Informationen können bei Bedarf ergänzt werden',
            tags: ['Energiewirtschaft', 'Chat-FAQ']
        };
    }
    // Ensure tags are always an array and properly formatted
    let tagsToStore;
    if (Array.isArray(faqContent.tags)) {
        tagsToStore = faqContent.tags;
    }
    else if (typeof faqContent.tags === 'string') {
        try {
            tagsToStore = JSON.parse(faqContent.tags);
        }
        catch (e) {
            console.error('Failed to parse tags string:', faqContent.tags);
            tagsToStore = ['Energiewirtschaft'];
        }
    }
    else {
        tagsToStore = ['Energiewirtschaft'];
    }
    console.log('Tags to store:', tagsToStore);
    // Create FAQ with auto-generated content - neue FAQs sollen öffentlich sichtbar sein
    const faqResult = await database_1.default.query(`
    INSERT INTO faqs (title, description, context, answer, additional_info, tags, source_chat_id, created_by, is_public)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, title, description, context, answer, additional_info, tags, is_active, is_public, created_at
  `, [
        faqContent.title,
        faqContent.description,
        faqContent.context,
        faqContent.answer,
        faqContent.additionalInfo,
        JSON.stringify(tagsToStore),
        chatId,
        userId,
        true // is_public = true
    ]);
    const newFAQ = faqResult.rows[0];
    // Return tags as array (they were stored as JSON string)
    const responseData = Object.assign(Object.assign({}, newFAQ), { tags: tagsToStore // Use the validated tags array
     });
    // Store FAQ in vector database
    try {
        const qdrantService = new qdrant_1.QdrantService();
        await qdrantService.storeFAQContent(responseData.id, responseData.title, responseData.description, responseData.context, responseData.answer, responseData.additional_info, 
        // Pass the tags array to the vector database
        tagsToStore);
    }
    catch (error) {
        console.error('Error storing FAQ in vector database:', error);
        // Don't fail the request if vector storage fails
    }
    res.json({
        success: true,
        data: responseData
    });
}));
// Get all FAQs for admin management
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
    // Parse tags for all FAQs
    const faqs = result.rows.map(faq => (Object.assign(Object.assign({}, faq), { tags: typeof faq.tags === 'string' ? (() => {
            try {
                return JSON.parse(faq.tags);
            }
            catch (e) {
                return ['Energiewirtschaft'];
            }
        })() : faq.tags })));
    res.json({
        success: true,
        data: faqs
    });
}));
// Update FAQ
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
    // If enhance_with_context is true, search for relevant context and enhance the FAQ
    if (enhance_with_context) {
        try {
            // Search for relevant context using title, description, and tags
            const searchQuery = `${title} ${description} ${tags.join(' ')}`;
            const searchResults = await qdrant_1.QdrantService.searchByText(searchQuery, 5);
            let searchContext = '';
            if (searchResults.length > 0) {
                searchContext = searchResults.map((result) => result.payload.text).join('\n\n');
            }
            // Enhance FAQ with LLM using the search context
            const enhancedFAQ = await gemini_1.default.enhanceFAQWithContext(finalFAQData, searchContext);
            finalFAQData = enhancedFAQ;
        }
        catch (error) {
            console.error('Error enhancing FAQ with context:', error);
            // Continue with original data if enhancement fails
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
    // Update FAQ in vector database
    try {
        const qdrantService = new qdrant_1.QdrantService();
        await qdrantService.updateFAQContent(updatedFAQ.id, updatedFAQ.title, updatedFAQ.description, updatedFAQ.context, updatedFAQ.answer, updatedFAQ.additional_info, updatedFAQ.tags);
    }
    catch (error) {
        console.error('Error updating FAQ in vector database:', error);
        // Don't fail the request if vector storage fails
    }
    // Parse tags from JSON string to array before returning
    let parsedTags;
    try {
        parsedTags = typeof updatedFAQ.tags === 'string' ? JSON.parse(updatedFAQ.tags) : updatedFAQ.tags;
    }
    catch (parseError) {
        console.error('Error parsing tags:', parseError);
        parsedTags = ['Energiewirtschaft']; // fallback
    }
    res.json({
        success: true,
        data: Object.assign(Object.assign({}, updatedFAQ), { tags: parsedTags })
    });
}));
// Delete FAQ
router.delete('/admin/faqs/:id', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const result = await database_1.default.query('DELETE FROM faqs WHERE id = $1', [id]);
    if (result.rowCount === 0) {
        throw new errorHandler_1.AppError('FAQ not found', 404);
    }
    // Delete FAQ from vector database
    try {
        const qdrantService = new qdrant_1.QdrantService();
        await qdrantService.deleteFAQContent(id);
    }
    catch (error) {
        console.error('Error deleting FAQ from vector database:', error);
        // Don't fail the request if vector deletion fails
    }
    res.json({
        success: true,
        message: 'FAQ deleted successfully'
    });
}));
// FAQ Linking Routes
// Get all links for a FAQ (Admin)
router.get('/admin/faqs/:id/links', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const links = await faqLinkingService_1.faqLinkingService.getLinksForFAQ(id);
    res.json({
        success: true,
        data: links
    });
}));
// Create FAQ link (Admin)
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
// Delete FAQ link (Admin)
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
// Generate automatic links for FAQ (Admin)
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
// Get FAQ linking statistics (Admin)
router.get('/admin/faqs/linking-stats', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const stats = await faqLinkingService_1.faqLinkingService.getLinkingStats();
    res.json({
        success: true,
        data: stats
    });
}));
// Get public FAQs with links (for homepage)
router.get('/public/faqs', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 10, offset = 0, tag, search, sort = 'created_at', order = 'desc' } = req.query;
    let query = `
    SELECT id, title, description, context, answer, additional_info, tags,
           view_count, created_at, updated_at
    FROM faqs
    WHERE is_active = true AND is_public = true
  `;
    const queryParams = [];
    // Search functionality
    if (search) {
        query += ` AND (
      title ILIKE $${queryParams.length + 1} OR 
      description ILIKE $${queryParams.length + 1} OR 
      answer ILIKE $${queryParams.length + 1} OR 
      context ILIKE $${queryParams.length + 1}
    )`;
        queryParams.push(`%${search}%`);
    }
    // Tag filtering
    if (tag) {
        query += ` AND tags @> $${queryParams.length + 1}`;
        queryParams.push(JSON.stringify([tag]));
    }
    // Sorting
    const validSortFields = ['created_at', 'updated_at', 'view_count', 'title'];
    const validOrders = ['asc', 'desc'];
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order) ? order : 'desc';
    query += ` ORDER BY ${sortField} ${sortOrder.toUpperCase()}`;
    query += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);
    const result = await database_1.default.query(query, queryParams);
    // Get total count for pagination
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
    // Add linked terms to each FAQ
    const faqsWithLinks = await Promise.all(result.rows.map(async (faq) => {
        const linkedTerms = await faqLinkingService_1.faqLinkingService.getLinksForFAQ(faq.id);
        // Import and get related FAQs
        const { getRelatedFAQs } = await Promise.resolve().then(() => __importStar(require('../../lib/faq-api')));
        const relatedFAQs = await getRelatedFAQs(faq.id, faq.context + ' ' + faq.answer, 5);
        // Parse tags from JSON string to array
        let parsedTags;
        try {
            parsedTags = typeof faq.tags === 'string' ? JSON.parse(faq.tags) : faq.tags;
        }
        catch (parseError) {
            console.error('Error parsing tags:', parseError);
            parsedTags = ['Energiewirtschaft']; // fallback
        }
        return Object.assign(Object.assign({}, faq), { tags: parsedTags, linked_terms: linkedTerms, related_faqs: relatedFAQs });
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