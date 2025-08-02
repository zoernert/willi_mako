import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import pool from '../config/database';
import geminiService from '../services/gemini';
import { QdrantService } from '../services/qdrant';
import flipModeService from '../services/flip-mode';
import contextManager from '../services/contextManager';
import chatConfigurationService from '../services/chatConfigurationService';
import { GamificationService } from '../modules/quiz/gamification.service';

const router = Router();

// Initialize services
const qdrantService = new QdrantService();
const gamificationService = new GamificationService();

// Advanced retrieval service for contextual compression
class AdvancedRetrieval {
  async getContextualCompressedResults(
    query: string,
    userPreferences: any, // userPreferences is kept for interface consistency, but not used in the new flow
    limit: number = 10
  ): Promise<any[]> {
    try {
      // 1. Optimierte Suche mit Pre-Filtering und Query-Transformation
      const optimizedResults = await qdrantService.searchWithOptimizations(
        query,
        limit * 2, // Hole mehr Ergebnisse für bessere Synthese
        0.3, // Niedrigerer Threshold für mehr Ergebnisse
        true // Verwende HyDE
      );

      if (optimizedResults.length === 0) {
        // Fallback zur normalen Suche
        const searchQueries = await geminiService.generateSearchQueries(query);
        const allResults = [];
        for (const q of searchQueries) {
          const results = await qdrantService.search('system', q, limit);
          allResults.push(...results);
        }
        const uniqueResults = this.removeDuplicates(allResults);
        
        if (uniqueResults.length === 0) {
          return [];
        }

        // Context Synthesis für Fallback
        const synthesizedContext = await geminiService.synthesizeContext(query, uniqueResults);
        return [
          {
            payload: {
              text: synthesizedContext,
            },
            score: 1.0,
            id: uuidv4(),
          },
        ];
      }

      // 2. Entferne Duplikate
      const uniqueResults = this.removeDuplicates(optimizedResults);

      // 3. Intelligente Post-Processing basierend auf chunk_type
      const contextualizedResults = this.enhanceResultsWithChunkTypeContext(uniqueResults);

      // 4. Context Synthesis mit verbessertem Kontext
      const synthesizedContext = await geminiService.synthesizeContextWithChunkTypes(query, contextualizedResults);

      // Return the synthesized context in the expected format
      return [
        {
          payload: {
            text: synthesizedContext,
            sources: uniqueResults.map(r => ({
              source_document: r.payload?.document_metadata?.document_base_name || 'Unknown',
              page_number: r.payload?.page_number || 'N/A',
              chunk_type: r.payload?.chunk_type || 'paragraph',
              score: r.score
            }))
          },
          score: 1.0,
          id: uuidv4(),
        },
      ];
    } catch (error) {
      console.error('Error in advanced retrieval:', error);
      return [];
    }
  }

  /**
   * Erweitert Ergebnisse mit kontextspezifischen Informationen basierend auf chunk_type
   */
  private enhanceResultsWithChunkTypeContext(results: any[]): any[] {
    return results.map(result => {
      const chunkType = result.payload?.chunk_type || 'paragraph';
      let contextualPrefix = '';

      switch (chunkType) {
        case 'structured_table':
          contextualPrefix = '[TABELLE] ';
          break;
        case 'definition':
          contextualPrefix = '[DEFINITION] ';
          break;
        case 'abbreviation':
          contextualPrefix = '[ABKÜRZUNG] ';
          break;
        case 'visual_summary':
          contextualPrefix = '[DIAGRAMM-BESCHREIBUNG] ';
          break;
        case 'full_page':
          contextualPrefix = '[VOLLTEXT] ';
          break;
        default:
          contextualPrefix = '[ABSATZ] ';
      }

      return {
        ...result,
        payload: {
          ...result.payload,
          contextual_content: contextualPrefix + (result.payload?.text || result.payload?.content || ''),
          chunk_type_description: this.getChunkTypeDescription(chunkType)
        }
      };
    });
  }

  /**
   * Beschreibt den Typ des Chunks für besseren Kontext
   */
  private getChunkTypeDescription(chunkType: string): string {
    const descriptions: Record<string, string> = {
      'structured_table': 'Tabellarische Darstellung von Daten',
      'definition': 'Offizielle Definition eines Begriffs',
      'abbreviation': 'Erklärung einer Abkürzung',
      'visual_summary': 'Textuelle Beschreibung eines Diagramms oder einer visuellen Darstellung',
      'full_page': 'Vollständiger Seiteninhalt',
      'paragraph': 'Textabsatz'
    };
    return descriptions[chunkType] || 'Allgemeiner Textinhalt';
  }

  private removeDuplicates(results: any[]): any[] {
    const seen = new Set();
    return results.filter(result => {
      if (seen.has(result.id)) {
        return false;
      }
      seen.add(result.id);
      return true;
    });
  }
}

const retrieval = new AdvancedRetrieval();

// Get user's chats
router.get('/chats', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  
  const chats = await pool.query(
    'SELECT id, title, created_at, updated_at FROM chats WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId]
  );
  
  res.json({
    success: true,
    data: chats.rows
  });
}));

// Get specific chat with messages
router.get('/chats/:chatId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { chatId } = req.params;
  const userId = req.user!.id;
  
  // Verify chat belongs to user
  const chat = await pool.query(
    'SELECT id, title, created_at, updated_at FROM chats WHERE id = $1 AND user_id = $2',
    [chatId, userId]
  );
  
  if (chat.rows.length === 0) {
    throw new AppError('Chat not found', 404);
  }
  
  // Get messages
  const messages = await pool.query(
    'SELECT id, role, content, metadata, created_at FROM messages WHERE chat_id = $1 ORDER BY created_at ASC',
    [chatId]
  );
  
  res.json({
    success: true,
    data: {
      chat: chat.rows[0],
      messages: messages.rows
    }
  });
}));

// Create new chat
router.post('/chats', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { title } = req.body;
  const userId = req.user!.id;
  
  const chat = await pool.query(
    'INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at, updated_at',
    [userId, title || 'Neuer Chat']
  );
  
  res.status(201).json({
    success: true,
    data: chat.rows[0]
  });
}));

// Send message in chat
router.post('/chats/:chatId/messages', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { chatId } = req.params;
  const { content, contextSettings } = req.body;
  const userId = req.user!.id;
  
  if (!content) {
    throw new AppError('Message content is required', 400);
  }
  
  // Verify chat belongs to user and get flip_mode_used status
  const chatResult = await pool.query(
    'SELECT id, flip_mode_used FROM chats WHERE id = $1 AND user_id = $2',
    [chatId, userId]
  );
  
  if (chatResult.rows.length === 0) {
    throw new AppError('Chat not found', 404);
  }
  const chat = chatResult.rows[0];
  
  // Save user message
  const userMessage = await pool.query(
    'INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3) RETURNING id, role, content, created_at',
    [chatId, 'user', content]
  );
  
  // Check if Flip Mode should be activated
  if (!chat.flip_mode_used) {
    const clarificationResult = await flipModeService.analyzeClarificationNeed(content, userId);
    if (clarificationResult.needsClarification) {
      const clarificationMessageContent = JSON.stringify({
          type: 'clarification',
          clarificationResult,
      });
      const assistantMessage = await pool.query(
        'INSERT INTO messages (chat_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING id, role, content, metadata, created_at',
        [chatId, 'assistant', clarificationMessageContent, { type: 'clarification' }]
      );
      await pool.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);
      return res.json({
        success: true,
        data: {
          userMessage: userMessage.rows[0],
          assistantMessage: assistantMessage.rows[0],
          type: 'clarification'
        }
      });
    }
  }

  // Proceed with normal response generation using configured pipeline
  const previousMessages = await pool.query(
    'SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY created_at ASC',
    [chatId]
  );
  const userPreferences = await pool.query(
    'SELECT companies_of_interest, preferred_topics FROM user_preferences WHERE user_id = $1',
    [userId]
  );

  // Use the configured chat pipeline for response generation
  const configuredResult = await chatConfigurationService.generateConfiguredResponse(
    content,
    userId,
    previousMessages.rows,
    userPreferences.rows[0] || {},
    contextSettings
  );

  let aiResponse = configuredResult.response;
  let responseMetadata: {
    contextSources: number;
    userContextUsed: boolean;
    contextReason: string;
    userDocumentsUsed?: number;
    userNotesUsed?: number;
    contextSummary?: string;
    configurationUsed?: string;
    processingSteps?: any[];
    searchQueries?: string[];
  } = { 
    contextSources: configuredResult.searchQueries.length,
    userContextUsed: false, // Will be updated if user context is used
    contextReason: 'Configured pipeline used',
    configurationUsed: configuredResult.configurationUsed,
    processingSteps: configuredResult.processingSteps,
    searchQueries: configuredResult.searchQueries
  };

  // Check if we need to enhance with user context (fallback to existing logic if needed)
  let userContext: any = null;
  if (contextSettings?.includeUserDocuments || contextSettings?.includeUserNotes) {
    const contextResult = await contextManager.determineOptimalContext(
      content,
      userId,
      previousMessages.rows.slice(-5),
      contextSettings
    );
    userContext = contextResult.userContext;
    const contextDecision = contextResult.contextDecision;

    if (contextDecision.useUserContext && (userContext.userDocuments.length > 0 || userContext.userNotes.length > 0)) {
      // Enhance the configured response with user context
      let contextMode: 'workspace-only' | 'standard' | 'system-only' = 'standard';
      if (contextSettings?.useWorkspaceOnly) {
        contextMode = 'workspace-only';
      } else if (contextSettings && !contextSettings.includeSystemKnowledge) {
        contextMode = 'workspace-only';
      } else if (contextSettings && !contextSettings.includeUserDocuments && !contextSettings.includeUserNotes) {
        contextMode = 'system-only';
      }

      aiResponse = await geminiService.generateResponseWithUserContext(
        previousMessages.rows.map(msg => ({ role: msg.role, content: msg.content })),
        configuredResult.contextUsed,
        userContext.userDocuments,
        userContext.userNotes,
        userPreferences.rows[0] || {},
        contextMode
      );

      responseMetadata = {
        ...responseMetadata,
        userContextUsed: true,
        contextReason: contextDecision.reason,
        userDocumentsUsed: userContext.userDocuments.length,
        userNotesUsed: userContext.userNotes.length,
        contextSummary: userContext.contextSummary
      };
    }
  }
  
  const assistantMessage = await pool.query(
    'INSERT INTO messages (chat_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING id, role, content, metadata, created_at',
    [chatId, 'assistant', aiResponse, JSON.stringify(responseMetadata)]
  );
   
  await pool.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);

  // Award points for document usage if documents were used in the response
  if (responseMetadata.userDocumentsUsed && responseMetadata.userDocumentsUsed > 0 && userContext?.suggestedDocuments) {
    try {
      for (const document of userContext.suggestedDocuments) {
        // Ensure document has a valid ID before awarding points
        if (document && document.id && typeof document.id === 'string') {
          await gamificationService.awardDocumentUsagePoints(document.id, chatId);
        }
      }
    } catch (error) {
      console.error('Error awarding document usage points:', error);
      // Don't fail the chat response if points awarding fails
    }
  }

  const messageCountResult = await pool.query('SELECT COUNT(*) FROM messages WHERE chat_id = $1 AND role = $2', [chatId, 'assistant']);
  let updatedChatTitle = null;
  if (parseInt(messageCountResult.rows[0].count) === 1) {
    try {
      const generatedTitle = await geminiService.generateChatTitle(userMessage.rows[0].content, aiResponse);
      await pool.query('UPDATE chats SET title = $1 WHERE id = $2', [generatedTitle, chatId]);
      updatedChatTitle = generatedTitle;
    } catch (error) {
      console.error('Error generating chat title:', error);
    }
  }

  return res.json({
    success: true,
    data: {
      userMessage: userMessage.rows[0],
      assistantMessage: assistantMessage.rows[0],
      updatedChatTitle,
      type: 'normal'
    }
  });
}));

// Generate response (with or without clarification)
router.post('/chats/:chatId/generate', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { chatId } = req.params;
    const { originalQuery, clarificationResponses } = req.body;
    const userId = req.user!.id;

    if (!originalQuery) {
        throw new AppError('Original query is required', 400);
    }

    // Verify chat belongs to user
    const chat = await pool.query('SELECT id FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
    if (chat.rows.length === 0) {
        throw new AppError('Chat not found', 404);
    }

    // Build enhanced query with clarification context (live or from profile)
    const enhancedQuery = await flipModeService.buildEnhancedQuery(originalQuery, userId, clarificationResponses);

    // Get user preferences for retrieval
    const userPreferences = await pool.query(
        'SELECT companies_of_interest, preferred_topics FROM user_preferences WHERE user_id = $1',
        [userId]
    );

    // Get relevant context using enhanced query
    const contextResults = await retrieval.getContextualCompressedResults(
        enhancedQuery,
        userPreferences.rows[0] || {},
        10
    );
    const context = contextResults.map(result => result.payload.text).join('\n\n');

    // Get previous messages for context
    const previousMessages = await pool.query(
        'SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY created_at ASC',
        [chatId]
    );
    const messagesForGeneration = previousMessages.rows.map(msg => ({ role: msg.role, content: msg.content }));
    
    // Add the enhanced query as the current user turn
    messagesForGeneration.push({ role: 'user', content: enhancedQuery });

    // Generate enhanced AI response
    const aiResponse = await geminiService.generateResponse(
        messagesForGeneration,
        context,
        userPreferences.rows[0] || {},
        true // isEnhancedQuery = true
    );

    // Save AI response
    const assistantMessage = await pool.query(
        'INSERT INTO messages (chat_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING id, role, content, metadata, created_at',
        [chatId, 'assistant', aiResponse, JSON.stringify({
            contextSources: contextResults.length,
            enhancedQuery: true,
            originalQuery: originalQuery,
        })]
    );

    // Mark flip mode as used for this chat and update timestamp
    await pool.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP, flip_mode_used = TRUE WHERE id = $1', [chatId]);

    res.json({
        success: true,
        data: {
            assistantMessage: assistantMessage.rows[0],
            type: 'enhanced_response'
        }
    });
}));


// Delete chat
router.delete('/chats/:chatId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { chatId } = req.params;
  const userId = req.user!.id;
  
  // Verify chat belongs to user
  const result = await pool.query(
    'DELETE FROM chats WHERE id = $1 AND user_id = $2',
    [chatId, userId]
  );
  
  if (result.rowCount === 0) {
    throw new AppError('Chat not found', 404);
  }
  
  res.json({
    success: true,
    message: 'Chat deleted successfully'
  });
}));

// Update chat title
router.put('/chats/:chatId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { chatId } = req.params;
  const { title } = req.body;
  const userId = req.user!.id;
  
  if (!title) {
    throw new AppError('Title is required', 400);
  }
  
  const result = await pool.query(
    'UPDATE chats SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING id, title, updated_at',
    [title, chatId, userId]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Chat not found', 404);
  }
  
  res.json({
    success: true,
    data: result.rows[0]
  });
}));

export default router;