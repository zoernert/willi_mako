import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import pool from '../config/database';
import geminiService from '../services/gemini';
import QdrantService from '../services/qdrant';
import flipModeService from '../services/flip-mode';

const router = Router();

// Advanced retrieval service for contextual compression
class AdvancedRetrieval {
  async getContextualCompressedResults(
    query: string,
    userPreferences: any,
    limit: number = 20
  ) {
    try {
      // Generate embedding for the query
      const queryEmbedding = await geminiService.generateEmbedding(query);
      
      // Multi-query retrieval - generate variations of the query
      const queryVariations = await this.generateQueryVariations(query);
      
      // Search for each variation
      const allResults = [];
      for (const variation of queryVariations) {
        const variationEmbedding = await geminiService.generateEmbedding(variation);
        const results = await QdrantService.searchSimilar(variationEmbedding, limit / queryVariations.length);
        allResults.push(...results);
      }
      
      // Remove duplicates and sort by relevance
      const uniqueResults = this.removeDuplicates(allResults);
      
      // Apply contextual compression
      const compressedResults = await this.applyContextualCompression(
        uniqueResults,
        query,
        userPreferences
      );
      
      return compressedResults.slice(0, limit);
    } catch (error) {
      console.error('Error in advanced retrieval:', error);
      return [];
    }
  }

  private async generateQueryVariations(query: string): Promise<string[]> {
    const variations = [query];
    
    // Add company-specific variations
    const companyTerms = ['Stadtwerke', 'Energieversorger', 'Netzbetreiber', 'Stromanbieter'];
    for (const term of companyTerms) {
      if (query.toLowerCase().includes(term.toLowerCase())) {
        variations.push(`${query} ${term}`);
      }
    }
    
    // Add topic-specific variations
    const topicTerms = ['Marktkommunikation', 'Bilanzierung', 'Regulierung', 'Smart Meter'];
    for (const term of topicTerms) {
      if (query.toLowerCase().includes(term.toLowerCase())) {
        variations.push(`${query} ${term}`);
      }
    }
    
    return variations;
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

  private async applyContextualCompression(
    results: any[],
    query: string,
    userPreferences: any
  ): Promise<any[]> {
    // Filter results based on user preferences
    const filteredResults = results.filter(result => {
      // Check if result is relevant to user's companies of interest
      if (userPreferences.companiesOfInterest && userPreferences.companiesOfInterest.length > 0) {
        const hasCompanyMatch = userPreferences.companiesOfInterest.some((company: string) =>
          result.payload.text.toLowerCase().includes(company.toLowerCase())
        );
        if (hasCompanyMatch) {
          result.score += 0.1; // Boost relevance
        }
      }
      
      // Check if result matches preferred topics
      if (userPreferences.preferredTopics && userPreferences.preferredTopics.length > 0) {
        const hasTopicMatch = userPreferences.preferredTopics.some((topic: string) =>
          result.payload.text.toLowerCase().includes(topic.toLowerCase())
        );
        if (hasTopicMatch) {
          result.score += 0.1; // Boost relevance
        }
      }
      
      return result.score > 0.6; // Minimum relevance threshold
    });
    
    // Sort by score and return top results
    return filteredResults.sort((a, b) => b.score - a.score);
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
  const { content } = req.body;
  const userId = req.user!.id;
  
  if (!content) {
    throw new AppError('Message content is required', 400);
  }
  
  // Verify chat belongs to user
  const chat = await pool.query(
    'SELECT id FROM chats WHERE id = $1 AND user_id = $2',
    [chatId, userId]
  );
  
  if (chat.rows.length === 0) {
    throw new AppError('Chat not found', 404);
  }
  
  // Get user preferences
  const userPreferences = await pool.query(
    'SELECT companies_of_interest, preferred_topics FROM user_preferences WHERE user_id = $1',
    [userId]
  );
  
  // Save user message
  const userMessage = await pool.query(
    'INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3) RETURNING id, role, content, created_at',
    [chatId, 'user', content]
  );
  
  // Get previous messages for context
  const previousMessages = await pool.query(
    'SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY created_at ASC',
    [chatId]
  );
  
  // Check if Flip Mode should be activated BEFORE getting extensive context
  const clarificationResult = await flipModeService.analyzeClarificationNeed(content, userId);
  
  if (clarificationResult.needsClarification) {
    // Save AI response with clarification
    const clarificationMessage = {
      type: 'clarification',
      content: 'Ich möchte Ihnen die bestmögliche Antwort geben! Mit ein paar zusätzlichen Informationen kann ich Ihnen eine viel zielgerichtetere Antwort liefern.',
      clarificationResult,
      reasoning: clarificationResult.reasoning
    };
    
    const assistantMessage = await pool.query(
      'INSERT INTO messages (chat_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING id, role, content, metadata, created_at',
      [chatId, 'assistant', JSON.stringify(clarificationMessage), JSON.stringify({ 
        type: 'clarification', 
        sessionId: clarificationResult.sessionId,
        ambiguityScore: clarificationResult.ambiguityScore
      })]
    );
    
    // Update chat timestamp
    await pool.query(
      'UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [chatId]
    );
    
    return res.json({
      success: true,
      data: {
        userMessage: userMessage.rows[0],
        assistantMessage: assistantMessage.rows[0],
        type: 'clarification'
      }
    });
  }

  // Get relevant context using advanced retrieval ONLY if no clarification needed
  const contextResults = await retrieval.getContextualCompressedResults(
    content,
    userPreferences.rows[0] || {},
    10
  );
  
  const context = contextResults
    .map(result => result.payload.text)
    .join('\n\n');
  
  // Generate AI response
  const aiResponse = await geminiService.generateResponse(
    previousMessages.rows.map(msg => ({ role: msg.role, content: msg.content })),
    context,
    userPreferences.rows[0] || {}
  );
  
  // Save AI response
  const assistantMessage = await pool.query(
    'INSERT INTO messages (chat_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING id, role, content, metadata, created_at',
    [chatId, 'assistant', aiResponse, JSON.stringify({ contextSources: contextResults.length })]
  );
   
  // Update chat timestamp
  await pool.query(
    'UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [chatId]
  );

  // Check if this is the first assistant message in this chat
  const messageCount = await pool.query(
    'SELECT COUNT(*) FROM messages WHERE chat_id = $1 AND role = $2',
    [chatId, 'assistant']
  );

  let updatedChatTitle = null;

  // Generate and update chat title if this is the first AI response
  if (parseInt(messageCount.rows[0].count) === 1) {
    try {
      const generatedTitle = await geminiService.generateChatTitle(
        userMessage.rows[0].content,
        aiResponse
      );
      
      await pool.query(
        'UPDATE chats SET title = $1 WHERE id = $2',
        [generatedTitle, chatId]
      );
      
      updatedChatTitle = generatedTitle;
    } catch (error) {
      console.error('Error generating chat title:', error);
      // Continue without updating title if generation fails
    }
  }

  return res.json({
    success: true,
    data: {
      userMessage: userMessage.rows[0],
      assistantMessage: assistantMessage.rows[0],
      updatedChatTitle: updatedChatTitle,
      type: 'normal'
    }
  });
}));

// Handle clarification response
router.post('/chats/:chatId/clarification', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { chatId } = req.params;
  const { sessionId, responses } = req.body;
  const userId = req.user!.id;
  
  if (!sessionId || !responses) {
    throw new AppError('Session ID and responses are required', 400);
  }
  
  // Verify chat belongs to user
  const chat = await pool.query(
    'SELECT id FROM chats WHERE id = $1 AND user_id = $2',
    [chatId, userId]
  );
  
  if (chat.rows.length === 0) {
    throw new AppError('Chat not found', 404);
  }
  
  // Record clarification responses
  for (const response of responses) {
    await flipModeService.recordClarificationResponse(
      sessionId,
      response.questionId,
      response.answer
    );
  }
  
  // Build enhanced query with clarification context
  const enhancedQuery = await flipModeService.buildEnhancedQuery(sessionId);
  
  // Get user preferences
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
  
  const context = contextResults
    .map(result => result.payload.text)
    .join('\n\n');
  
  // Get previous messages for context, but exclude clarification messages
  const previousMessages = await pool.query(
    'SELECT role, content, metadata FROM messages WHERE chat_id = $1 ORDER BY created_at ASC',
    [chatId]
  );

  // Filter out clarification messages and get original user query
  const filteredMessages = previousMessages.rows.filter(msg => {
    try {
      const metadata = msg.metadata ? 
        (typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata) : {};
      return metadata.type !== 'clarification';
    } catch (error) {
      console.error('Error parsing metadata:', error, msg.metadata);
      return true; // Include message if metadata parsing fails
    }
  });

  // Use the enhanced query as the latest user message
  const messagesForGeneration = filteredMessages.map(msg => ({ role: msg.role, content: msg.content }));
  
  // Replace the last user message with the enhanced query
  if (messagesForGeneration.length > 0 && messagesForGeneration[messagesForGeneration.length - 1].role === 'user') {
    messagesForGeneration[messagesForGeneration.length - 1].content = enhancedQuery;
  } else {
    messagesForGeneration.push({ role: 'user', content: enhancedQuery });
  }

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
      clarificationSessionId: sessionId,
      enhancedQuery: true
    })]
  );
  
  // Update chat timestamp
  await pool.query(
    'UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [chatId]
  );
  
  // Mark session as complete
  await flipModeService.completeSession(sessionId);
  
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
