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
const llmProvider_1 = __importDefault(require("../services/llmProvider"));
const qdrant_1 = require("../services/qdrant");
const faqLinkingService_1 = require("../services/faqLinkingService");
const js_client_rest_1 = require("@qdrant/js-client-rest");
const embeddingProvider_1 = require("../services/embeddingProvider");
const router = (0, express_1.Router)();
/**
 * Helper function to index FAQ into Qdrant
 * Chunks the FAQ content and creates embeddings for semantic search
 */
async function indexFAQIntoQdrant(faq) {
    try {
        const client = new js_client_rest_1.QdrantClient({
            url: process.env.QDRANT_URL || 'http://localhost:6333',
            apiKey: process.env.QDRANT_API_KEY,
            checkCompatibility: false
        });
        const baseCollection = process.env.QDRANT_COLLECTION || 'willi_mako';
        const collection = (0, embeddingProvider_1.getCollectionName)(baseCollection);
        // Prepare full text for chunking
        const fullText = [
            faq.title,
            faq.description || '',
            faq.context,
            faq.answer,
            faq.additional_info || ''
        ].filter(Boolean).join('\n\n');
        // Chunk text into ~1000 char pieces on paragraph boundaries
        // This matches the chunking strategy used in admin.ts
        const rawParas = fullText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
        const chunks = [];
        const MAX_CHUNK_SIZE = 1000; // Keep chunks under 1000 chars for optimal embedding
        for (const p of rawParas) {
            if (p.length <= MAX_CHUNK_SIZE) {
                chunks.push(p);
                continue;
            }
            // Split large paragraphs
            let start = 0;
            while (start < p.length) {
                chunks.push(p.slice(start, start + MAX_CHUNK_SIZE));
                start += MAX_CHUNK_SIZE;
            }
        }
        // Ensure at least one chunk exists
        if (!chunks.length) {
            chunks.push(fullText.slice(0, MAX_CHUNK_SIZE));
        }
        // Create embeddings and upsert points
        const points = [];
        const { v5: uuidv5 } = require('uuid');
        for (let idx = 0; idx < chunks.length; idx++) {
            const chunkText = chunks[idx];
            // Generate embedding using text-embedding-004 (via embeddingProvider)
            const vector = await (0, embeddingProvider_1.generateEmbedding)(chunkText);
            // Create deterministic UUID for this FAQ chunk
            const pointId = uuidv5(`faq:${faq.id}:${idx}`, uuidv5.URL);
            points.push({
                id: pointId,
                vector,
                payload: {
                    content_type: 'faq',
                    faq_id: faq.id,
                    title: faq.title,
                    description: faq.description || '',
                    tags: faq.tags,
                    chunk_index: idx,
                    total_chunks: chunks.length,
                    text: chunkText,
                    chunk_type: 'faq_content', // Consistent with other chunk types
                    source: 'faq_api',
                    created_at: new Date().toISOString()
                }
            });
        }
        // Upsert all chunks to Qdrant
        if (points.length > 0) {
            await client.upsert(collection, { wait: true, points });
            console.log(`✓ Indexed FAQ ${faq.id} into Qdrant collection '${collection}': ${points.length} chunks`);
        }
    }
    catch (error) {
        // Log error but don't throw - FAQ creation should succeed even if indexing fails
        console.error('Error indexing FAQ into Qdrant:', error);
    }
}
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
        const { getRelatedFAQs } = await Promise.resolve().then(() => __importStar(require('../lib/faq-api')));
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
        return {
            ...faq,
            tags: parsedTags,
            linked_terms: linkedTerms,
            related_faqs: relatedFAQs
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
    const faqWithLinks = {
        ...faq,
        tags: parsedTags,
        linked_terms: linkedTerms
    };
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
// Middleware for Bearer token authentication with specific token
const authenticateBearerToken = (requiredToken) => {
    return (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer TOKEN"
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access token required',
                code: 'TOKEN_MISSING'
            });
        }
        if (token !== requiredToken) {
            return res.status(403).json({
                success: false,
                error: 'Invalid token',
                code: 'TOKEN_INVALID'
            });
        }
        next();
    };
};
// Create new FAQ entry via API
router.post('/faqs', authenticateBearerToken('str0mda0'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { question, answer, tags, description, additional_info } = req.body;
    // Validation
    if (!question || !answer) {
        return res.status(400).json({
            success: false,
            error: 'Question and answer are required',
            code: 'MISSING_REQUIRED_FIELDS'
        });
    }
    // Prepare tags array
    let parsedTags;
    if (Array.isArray(tags)) {
        parsedTags = tags;
    }
    else if (typeof tags === 'string') {
        parsedTags = [tags];
    }
    else {
        parsedTags = ['Energiewirtschaft']; // Default tag
    }
    // Insert new FAQ
    const result = await database_1.default.query(`
    INSERT INTO faqs (
      title,
      description,
      context,
      answer,
      additional_info,
      tags,
      is_active,
      is_public,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id, title, description, context, answer, additional_info, tags, 
              view_count, is_active, is_public, created_at, updated_at
  `, [
        question, // title
        description || `FAQ-Eintrag zu: ${question}`, // description
        answer, // context (used for search/semantic matching)
        answer, // answer (the markdown content)
        additional_info || null, // additional_info
        JSON.stringify(parsedTags) // tags as JSONB
    ]);
    const newFaq = result.rows[0];
    // Parse tags back to array for response
    let responseTags;
    try {
        responseTags = typeof newFaq.tags === 'string' ? JSON.parse(newFaq.tags) : newFaq.tags;
    }
    catch (parseError) {
        responseTags = parsedTags;
    }
    // Index FAQ into Qdrant (fire-and-forget, non-blocking)
    // This will chunk the content and create embeddings using text-embedding-004
    (async () => {
        try {
            await indexFAQIntoQdrant({
                id: newFaq.id,
                title: newFaq.title,
                description: newFaq.description,
                context: newFaq.context,
                answer: newFaq.answer,
                additional_info: newFaq.additional_info,
                tags: responseTags
            });
        }
        catch (err) {
            console.error('Background FAQ indexing failed:', err);
        }
    })();
    res.status(201).json({
        success: true,
        data: {
            ...newFaq,
            tags: responseTags
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
    const adminTimeoutMs = Number(process.env.ADMIN_FAQ_TIMEOUT_MS || process.env.CHAT_TIMEOUT_MS || '90000');
    const budgetMs = Math.max(10000, adminTimeoutMs - 5000);
    try {
        const generation = llmProvider_1.default.generateFAQContent(messages);
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('FAQ_TIMEOUT')), budgetMs));
        faqContent = await Promise.race([generation, timeout]);
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
        // Provide fallback content if AI generation fails or times out
        const timedOut = (error === null || error === void 0 ? void 0 : error.message) === 'FAQ_TIMEOUT';
        faqContent = {
            title: 'FAQ aus Chat erstellt',
            description: timedOut ? 'Automatisch generierter FAQ-Eintrag (Timeout – Inhalt bitte ergänzen)' : 'Automatisch generierter FAQ-Eintrag aus einem Chat-Verlauf',
            context: 'Basierend auf einer Unterhaltung mit einem Nutzer',
            answer: timedOut ? 'Die automatische Generierung hat das Zeitlimit überschritten. Bitte Inhalt manuell ergänzen.' : 'Detaillierte Antwort wird bei der nächsten Bearbeitung ergänzt',
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
    const responseData = {
        ...newFAQ,
        tags: tagsToStore // Use the validated tags array
    };
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
    const faqs = result.rows.map(faq => ({
        ...faq,
        tags: typeof faq.tags === 'string' ? (() => {
            try {
                return JSON.parse(faq.tags);
            }
            catch (e) {
                return ['Energiewirtschaft'];
            }
        })() : faq.tags
    }));
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
            const enhancedFAQ = await llmProvider_1.default.enhanceFAQWithContext(finalFAQData, searchContext);
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
        data: {
            ...updatedFAQ,
            tags: parsedTags
        }
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
        const paramIndex = queryParams.length + 1;
        query += ' AND ( title ILIKE $' + paramIndex + ' OR description ILIKE $' + paramIndex + ' OR answer ILIKE $' + paramIndex + ' OR context ILIKE $' + paramIndex + ' )';
        queryParams.push('%' + search + '%');
    }
    // Tag filtering
    if (tag) {
        query += ' AND tags @> $' + (queryParams.length + 1);
        queryParams.push(JSON.stringify([tag]));
    }
    // Sorting
    const validSortFields = ['created_at', 'updated_at', 'view_count', 'title'];
    const validOrders = ['asc', 'desc'];
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order) ? order : 'desc';
    query += ' ORDER BY ' + sortField + ' ' + sortOrder.toUpperCase();
    query += ' LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
    queryParams.push(limit, offset);
    const result = await database_1.default.query(query, queryParams);
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM faqs WHERE is_active = true AND is_public = true';
    const countParams = [];
    if (search) {
        const paramIndex = countParams.length + 1;
        countQuery += ' AND ( title ILIKE $' + paramIndex + ' OR description ILIKE $' + paramIndex + ' OR answer ILIKE $' + paramIndex + ' OR context ILIKE $' + paramIndex + ' )';
        countParams.push('%' + search + '%');
    }
    if (tag) {
        countQuery += ' AND tags @> $' + (countParams.length + 1);
        countParams.push(JSON.stringify([tag]));
    }
    const countResult = await database_1.default.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    // Add linked terms to each FAQ
    const faqsWithLinks = await Promise.all(result.rows.map(async (faq) => {
        const linkedTerms = await faqLinkingService_1.faqLinkingService.getLinksForFAQ(faq.id);
        // Import and get related FAQs
        const { getRelatedFAQs } = await Promise.resolve().then(() => __importStar(require('../lib/faq-api')));
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
        return {
            ...faq,
            tags: parsedTags,
            linked_terms: linkedTerms,
            related_faqs: relatedFAQs
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
// New: FAQ Artifacts API
router.get('/admin/faqs/:id/artifacts', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const result = await database_1.default.query(`SELECT id, faq_id, artifacts, meta, created_at, updated_at FROM faq_artifacts WHERE faq_id = $1 ORDER BY created_at DESC LIMIT 1`, [id]);
    if (result.rows.length === 0) {
        return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: result.rows[0] });
}));
router.post('/admin/faqs/:id/artifacts/outline', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const { id } = req.params;
    const { notes, target_lengths } = req.body || {};
    // Build prompt from current FAQ + optional notes
    const faqRes = await database_1.default.query(`SELECT title, description, context, answer, additional_info, tags FROM faqs WHERE id = $1`, [id]);
    if (faqRes.rows.length === 0)
        throw new errorHandler_1.AppError('FAQ not found', 404);
    const faq = faqRes.rows[0];
    const faqTags = Array.isArray(faq.tags) ? faq.tags : JSON.parse(faq.tags || '[]');
    const editorNotes = notes ? '\nHinweise des Editors: ' + notes + '\n' : '';
    const outlinePrompt = 'Erstelle eine detaillierte Gliederung (Outline) für einen ausführlichen FAQ-Artikel zum Thema:\n\nTitel: ' + faq.title + '\nTags: ' + faqTags.join(', ') + '\n\nKurzbeschreibung: ' + faq.description + '\nKontext: ' + (faq.context || '') + '\nAntwort (bisher): ' + (faq.answer || '') + '\nZusätzliche Infos: ' + (faq.additional_info || '') + '\n\nAnforderungen:\n- Struktur in Abschnitte mit Titeln, Typ (description|context|answer|additional_info) und Reihenfolge\n- Stichpunkte je Abschnitt was abzudecken ist\n- Optional Quellenhinweise (generisch, werden später ersetzt)\n- Keine langen Texte, nur Outline.\n' + editorNotes;
    const outlineText = await llmProvider_1.default.generateText(outlinePrompt);
    // Minimal parsing: keep raw text as outline notes, sections skeleton without content
    const artifacts = { outline: { sections: [], notes: outlineText } };
    const meta = { strategy: 'outline-first', target_lengths, created_by: req.user.id, model: (_a = llmProvider_1.default.getLastUsedModel) === null || _a === void 0 ? void 0 : _a.call(llmProvider_1.default) };
    const upsert = await database_1.default.query(`INSERT INTO faq_artifacts (faq_id, artifacts, meta) VALUES ($1, $2, $3)
     ON CONFLICT (faq_id) DO UPDATE SET artifacts = $2, meta = $3, updated_at = CURRENT_TIMESTAMP
     RETURNING id, faq_id, artifacts, meta, created_at, updated_at`, [id, artifacts, meta]);
    res.json({ success: true, data: upsert.rows[0] });
}));
router.post('/admin/faqs/:id/artifacts/section', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const { id } = req.params;
    const { section, order = 0, type, sources = [], target_length = 600, continue_from = '' } = req.body || {};
    if (!type || !['description', 'context', 'answer', 'additional_info'].includes(type))
        throw new errorHandler_1.AppError('Invalid section type', 400);
    const faqRes = await database_1.default.query(`SELECT title, description, context, answer, additional_info, tags FROM faqs WHERE id = $1`, [id]);
    if (faqRes.rows.length === 0)
        throw new errorHandler_1.AppError('FAQ not found', 404);
    const faq = faqRes.rows[0];
    // Retrieve relevant context from vector store (guided semantic search)
    const faqTags = Array.isArray(faq.tags) ? faq.tags : JSON.parse(faq.tags || '[]');
    const searchQuery = (faq.title + ' ' + faq.description + ' ' + faqTags.join(' ')).trim();
    const results = await qdrant_1.QdrantService.semanticSearchGuided(searchQuery, { limit: 30, alpha: 0.75, outlineScoping: true, excludeVisual: true });
    const extractText = (r) => { var _a, _b, _c, _d, _e, _f; return ((_a = r === null || r === void 0 ? void 0 : r.payload) === null || _a === void 0 ? void 0 : _a.text) || ((_c = (_b = r === null || r === void 0 ? void 0 : r.payload) === null || _b === void 0 ? void 0 : _b.payload) === null || _c === void 0 ? void 0 : _c.text) || ((_d = r === null || r === void 0 ? void 0 : r.payload) === null || _d === void 0 ? void 0 : _d.text_content) || ((_e = r === null || r === void 0 ? void 0 : r.payload) === null || _e === void 0 ? void 0 : _e.snippet) || ((_f = r === null || r === void 0 ? void 0 : r.payload) === null || _f === void 0 ? void 0 : _f.content) || ''; };
    const contextSnippets = (results || []).map(extractText).filter(Boolean).slice(0, 8);
    const snippetsFormatted = contextSnippets.map((s, i) => '[' + (i + 1) + '] ' + s.substring(0, 500)).join('\n');
    const prompt = 'Schreibe den Abschnitt (' + type + ') Nummer ' + order + ' für einen ausführlichen FAQ-Artikel.\n\nTitel: ' + faq.title + '\nTags: ' + faqTags.join(', ') + '\n\nBisherige Inhalte:\n- Beschreibung: ' + faq.description + '\n- Kontext: ' + (faq.context || '') + '\n- Antwort: ' + (faq.answer || '') + '\n- Zusätzliche Infos: ' + (faq.additional_info || '') + '\n\nAbschnitt-Hinweise: ' + (section || '-') + '\nQuellen-Snippets:\n' + snippetsFormatted + '\n\nFortsetzen-Text (falls vorhanden): ' + (continue_from || '-') + '\n\nAnforderungen:\n- Ziel-Länge ca. ' + target_length + ' Wörter\n- Präzise, faktenbasiert, keine Wiederholungen\n- Nutze Snippets zur Belegung von Aussagen\n- Markdown erlaubt (Überschriften, Listen)\n- Nutze primär Inhalte aus pseudocode_* und structured_table Chunks; zitiere chunk_type/Seite falls möglich.\n\nGib nur den Abschnittstext zurück.';
    const content = await llmProvider_1.default.generateText(prompt);
    // Load latest artifacts record (or create)
    const artRes = await database_1.default.query(`SELECT id, artifacts FROM faq_artifacts WHERE faq_id = $1 ORDER BY created_at DESC LIMIT 1`, [id]);
    let artifacts = ((_a = artRes.rows[0]) === null || _a === void 0 ? void 0 : _a.artifacts) || {};
    artifacts.sections = artifacts.sections || [];
    const sectionId = type + '-' + Date.now();
    artifacts.sections.push({ id: sectionId, title: (section === null || section === void 0 ? void 0 : section.title) || type, type, order, content, sources });
    const upsert = await database_1.default.query(`INSERT INTO faq_artifacts (faq_id, artifacts, meta) VALUES ($1, $2, COALESCE((SELECT meta FROM faq_artifacts WHERE faq_id = $1 LIMIT 1), '{}'::jsonb))
     ON CONFLICT (faq_id) DO UPDATE SET artifacts = $2, updated_at = CURRENT_TIMESTAMP
     RETURNING id, faq_id, artifacts, meta, created_at, updated_at`, [id, artifacts]);
    res.json({ success: true, data: upsert.rows[0] });
}));
// Edit existing section (title/order/type/content)
router.patch('/admin/faqs/:id/artifacts/section/:sectionId', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id, sectionId } = req.params;
    const { title, order, type, content } = req.body || {};
    const artRes = await database_1.default.query(`SELECT id, artifacts FROM faq_artifacts WHERE faq_id = $1 LIMIT 1`, [id]);
    if (artRes.rows.length === 0)
        throw new errorHandler_1.AppError('No artifacts found for FAQ', 404);
    const artifacts = artRes.rows[0].artifacts || {};
    const sections = artifacts.sections || [];
    const idx = sections.findIndex(s => s.id === sectionId);
    if (idx === -1)
        throw new errorHandler_1.AppError('Section not found', 404);
    if (title !== undefined)
        sections[idx].title = title;
    if (order !== undefined)
        sections[idx].order = order;
    if (type !== undefined) {
        if (!['description', 'context', 'answer', 'additional_info'].includes(type))
            throw new errorHandler_1.AppError('Invalid section type', 400);
        sections[idx].type = type;
    }
    if (content !== undefined)
        sections[idx].content = content;
    artifacts.sections = sections;
    const update = await database_1.default.query(`UPDATE faq_artifacts SET artifacts = $1, updated_at = CURRENT_TIMESTAMP WHERE faq_id = $2 RETURNING id, faq_id, artifacts, meta, created_at, updated_at`, [artifacts, id]);
    res.json({ success: true, data: update.rows[0] });
}));
// Delete a generated section
router.delete('/admin/faqs/:id/artifacts/section/:sectionId', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id, sectionId } = req.params;
    const artRes = await database_1.default.query(`SELECT id, artifacts FROM faq_artifacts WHERE faq_id = $1 LIMIT 1`, [id]);
    if (artRes.rows.length === 0)
        throw new errorHandler_1.AppError('No artifacts found for FAQ', 404);
    const artifacts = artRes.rows[0].artifacts || {};
    const before = (artifacts.sections || []).length;
    artifacts.sections = (artifacts.sections || []).filter((s) => s.id !== sectionId);
    const after = (artifacts.sections || []).length;
    if (before === after)
        throw new errorHandler_1.AppError('Section not found', 404);
    const update = await database_1.default.query(`UPDATE faq_artifacts SET artifacts = $1, updated_at = CURRENT_TIMESTAMP WHERE faq_id = $2 RETURNING id, faq_id, artifacts, meta, created_at, updated_at`, [artifacts, id]);
    res.json({ success: true, data: update.rows[0] });
}));
router.post('/admin/faqs/:id/extend-field', auth_1.authenticateToken, requireAdminForFaq, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const { id } = req.params;
    const { field, target_length = 1500, strategy = 'sectionwise' } = req.body || {};
    const allowed = ['description', 'context', 'answer', 'additional_info'];
    if (!allowed.includes(field))
        throw new errorHandler_1.AppError('Unsupported field', 400);
    const faqRes = await database_1.default.query(`SELECT id, title, description, context, answer, additional_info, tags FROM faqs WHERE id = $1`, [id]);
    if (faqRes.rows.length === 0)
        throw new errorHandler_1.AppError('FAQ not found', 404);
    const faq = faqRes.rows[0];
    // Iterative generation in segments of ~500-700 words
    const segmentTarget = Math.max(400, Math.min(800, Math.round(target_length / 2)));
    let current = (faq[field] || '');
    let totalWords = current.split(/\s+/).filter(Boolean).length;
    let iterations = 0;
    while (totalWords < target_length && iterations < 6) {
        iterations++;
        const searchQuery = `${faq.title} ${(Array.isArray(faq.tags) ? faq.tags : JSON.parse(faq.tags || '[]')).join(' ')} ${current.substring(0, 400)}`.trim();
        const results = await qdrant_1.QdrantService.semanticSearchGuided(searchQuery, { limit: 24, alpha: 0.75, outlineScoping: true, excludeVisual: true });
        const extractText = (r) => { var _a, _b, _c, _d, _e, _f; return ((_a = r === null || r === void 0 ? void 0 : r.payload) === null || _a === void 0 ? void 0 : _a.text) || ((_c = (_b = r === null || r === void 0 ? void 0 : r.payload) === null || _b === void 0 ? void 0 : _b.payload) === null || _c === void 0 ? void 0 : _c.text) || ((_d = r === null || r === void 0 ? void 0 : r.payload) === null || _d === void 0 ? void 0 : _d.text_content) || ((_e = r === null || r === void 0 ? void 0 : r.payload) === null || _e === void 0 ? void 0 : _e.snippet) || ((_f = r === null || r === void 0 ? void 0 : r.payload) === null || _f === void 0 ? void 0 : _f.content) || ''; };
        const contextSnippets = (results || []).map(extractText).filter(Boolean).slice(0, 6);
        const snippetsText = contextSnippets.map((s, i) => '[' + (i + 1) + '] ' + s.substring(0, 500)).join('\n');
        const prompt = 'Erweitere das Feld \'' + field + '\' eines FAQ-Eintrags.\n\nTitel: ' + faq.title + '\nVorhandener Text (Auszug):\n' + current.slice(-1200) + '\n\nRelevante Snippets:\n' + snippetsText + '\n\nAnforderungen:\n- Füge einen kohärenten Abschnitt an (ca. ' + segmentTarget + ' Wörter)\n- Keine Wiederholung, konsistente Begriffe, Quellenbezug\n- Nutze Überschriften/Listen wo sinnvoll\n- Bevorzuge Informationen aus pseudocode_* und structured_table\n- Zitiere, falls möglich, chunk_type/Seite\n- Gib nur den neuen Text (ohne alten) zurück.';
        const addition = await llmProvider_1.default.generateText(prompt);
        current = current + '\n\n' + addition;
        current = current.trim();
        totalWords = current.split(/\s+/).filter(Boolean).length;
    }
    // Save field
    const columnMap = { description: 'description', context: 'context', answer: 'answer', additional_info: 'additional_info' };
    const col = columnMap[field];
    const updateQuery = 'UPDATE faqs SET ' + col + ' = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
    const update = await database_1.default.query(updateQuery, [current, id]);
    // Also reflect in artifacts for traceability
    const insertQuery = 'INSERT INTO faq_artifacts (faq_id, artifacts, meta) VALUES ($1, $2, $3) ON CONFLICT (faq_id) DO UPDATE SET artifacts = faq_artifacts.artifacts || $2, meta = faq_artifacts.meta || $3, updated_at = CURRENT_TIMESTAMP';
    const extendedKey = 'extended_' + field;
    const artifacts = {};
    artifacts[extendedKey] = { length: totalWords };
    const targetLengths = {};
    targetLengths[field] = target_length;
    const meta = { strategy, target_lengths: targetLengths, model: (_a = llmProvider_1.default.getLastUsedModel) === null || _a === void 0 ? void 0 : _a.call(llmProvider_1.default), created_by: req.user.id };
    await database_1.default.query(insertQuery, [id, artifacts, meta]);
    res.json({ success: true, data: update.rows[0] });
}));
exports.default = router;
//# sourceMappingURL=faq.js.map