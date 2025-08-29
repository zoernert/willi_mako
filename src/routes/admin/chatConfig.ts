import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { ResponseUtils } from '../../utils/response';
import { AppError } from '../../utils/errors';
import { DatabaseHelper } from '../../utils/database';
import { v4 as uuidv4 } from 'uuid';
// import geminiService from '../../services/gemini';
import llm from '../../services/llmProvider';
import { QdrantService } from '../../services/qdrant';
import { ContextManager } from '../../services/contextManager';
import chatConfigurationService from '../../services/chatConfigurationService';

const router = Router();
const qdrantService = new QdrantService();
const contextManager = new ContextManager();

// Admin middleware - require admin role
const requireAdmin = (req: AuthenticatedRequest, res: Response, next: Function) => {
  if (req.user?.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }
  next();
};

router.use(requireAdmin);

// Interface definitions
interface ChatConfiguration {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  config: {
    maxIterations: number;
    systemPrompt: string;
    vectorSearch: {
      maxQueries: number;
      limit: number;
      scoreThreshold: number;
      useQueryExpansion: boolean;
    };
    processingSteps: ProcessingStep[];
    contextSynthesis: {
      enabled: boolean;
      maxLength: number;
    };
    qualityChecks: {
      enabled: boolean;
      minResponseLength: number;
      checkForHallucination: boolean;
    };
  };
  avgResponseTimeMs: number;
  successRate: number;
  testCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ProcessingStep {
  name: string;
  enabled: boolean;
  prompt: string;
}

interface TestResult {
  success: boolean;
  responseTimeMs: number;
  generatedResponse: string;
  contextUsed: string;
  searchQueries: string[];
  processingSteps: any[];
  iterations: IterationResult[];
  iterationCount: number;
  finalConfidence: number;
  errorMessage?: string;
}

interface IterationResult {
  iteration: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  query: string;
  steps: ProcessingStepResult[];
  finalAnswer: string;
  shouldContinue: boolean;
  confidence: number;
}

interface ProcessingStepResult {
  step: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  input: any;
  output: any;
  success: boolean;
  errorMessage?: string;
}

/**
 * GET /admin/chat-config
 * Get all chat configurations
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const configurations = await DatabaseHelper.executeQuery<ChatConfiguration>(`
      SELECT 
        id, name, description, is_active as "isActive", config,
        avg_response_time_ms as "avgResponseTimeMs",
        success_rate as "successRate",
        test_count as "testCount",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM chat_configurations 
      ORDER BY created_at DESC
    `);

    ResponseUtils.success(res, configurations, 'Chat configurations retrieved successfully');
  } catch (error) {
    console.error('Error fetching chat configurations:', error);
    throw new AppError('Failed to fetch chat configurations', 500);
  }
}));

/**
 * GET /admin/chat-config/active
 * Get the currently active configuration
 */
router.get('/active', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const activeConfig = await chatConfigurationService.getActiveConfiguration();
    ResponseUtils.success(res, activeConfig, 'Active configuration retrieved successfully');
  } catch (error) {
    console.error('Error getting active configuration:', error);
    throw new AppError('Failed to get active configuration', 500);
  }
}));

/**
 * GET /admin/chat-config/test-sessions
 * Get all test sessions across all configurations
 */
router.get('/test-sessions', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { limit = 50 } = req.query;

  try {
    const testSessions = await DatabaseHelper.executeQuery(`
      SELECT 
        cts.id,
        cts.configuration_id as "config_id",
        cts.test_query as "user_query",
        cts.response_time_ms as "processing_time_ms",
        cts.generated_response as "response",
        cts.context_used as "contextUsed",
        cts.search_queries as "searchQueries",
        cts.processing_steps as "processingSteps",
        cts.error_message as "errorMessage",
        cts.was_successful as "wasSuccessful",
        cts.admin_rating as "adminRating",
        cts.admin_notes as "adminNotes",
        cts.created_at,
        cc.name as "configurationName",
        u.full_name as "adminName"
      FROM chat_test_sessions cts
      LEFT JOIN chat_configurations cc ON cts.configuration_id = cc.id
      LEFT JOIN users u ON cts.admin_user_id = u.id
      ORDER BY cts.created_at DESC
      LIMIT $1
    `, [limit]);

    // Transform for frontend compatibility
    const transformedSessions = testSessions.map((session: any) => ({
      id: session.id,
      config_id: session.config_id,
      user_query: session.user_query,
      response: session.response || '',
      processing_time_ms: session.processing_time_ms || 0,
      vector_results_count: session.searchQueries ? 
        (Array.isArray(session.searchQueries) ? session.searchQueries.length : 0) : 0,
      created_at: session.created_at,
      configuration_name: session.configurationName,
      admin_name: session.adminName,
      was_successful: session.wasSuccessful,
      admin_rating: session.adminRating,
      admin_notes: session.adminNotes
    }));

    ResponseUtils.success(res, transformedSessions, 'Test sessions retrieved successfully');
  } catch (error) {
    console.error('Error fetching test sessions:', error);
    throw new AppError('Failed to fetch test sessions', 500);
  }
}));

/**
 * GET /admin/chat-config/:configId
 * Get specific chat configuration
 */
router.get('/:configId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { configId } = req.params;

  try {
    const config = await DatabaseHelper.executeQuerySingle<ChatConfiguration>(`
      SELECT 
        id, name, description, is_active as "isActive", config,
        avg_response_time_ms as "avgResponseTimeMs",
        success_rate as "successRate",
        test_count as "testCount",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM chat_configurations 
      WHERE id = $1
    `, [configId]);

    if (!config) {
      throw new AppError('Configuration not found', 404);
    }

    ResponseUtils.success(res, config, 'Configuration retrieved successfully');
  } catch (error) {
    console.error('Error fetching configuration:', error);
    throw new AppError('Failed to fetch configuration', 500);
  }
}));

/**
 * POST /admin/chat-config
 * Create new chat configuration
 */
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, config } = req.body;

  if (!name || !config) {
    throw new AppError('Name and config are required', 400);
  }

  try {
    const result = await DatabaseHelper.executeQuerySingle<{id: string}>(`
      INSERT INTO chat_configurations (name, description, config, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [name, description || '', JSON.stringify(config), req.user?.id]);

    const newConfig = await DatabaseHelper.executeQuerySingle<ChatConfiguration>(`
      SELECT 
        id, name, description, is_active as "isActive", config,
        avg_response_time_ms as "avgResponseTimeMs",
        success_rate as "successRate",
        test_count as "testCount",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM chat_configurations 
      WHERE id = $1
    `, [result?.id]);

    ResponseUtils.success(res, newConfig, 'Configuration created successfully', 201);
  } catch (error) {
    console.error('Error creating configuration:', error);
    throw new AppError('Failed to create configuration', 500);
  }
}));

/**
 * PUT /admin/chat-config/:configId
 * Update chat configuration
 */
router.put('/:configId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { configId } = req.params;
  const { name, description, config, isActive } = req.body;

  console.log('PUT /admin/chat-config/:configId - configId:', configId);
  console.log('PUT /admin/chat-config/:configId - body:', { name, description, config: config ? 'present' : 'missing', isActive });

  try {
    // If setting as active, deactivate all other configurations first
    if (isActive) {
      await DatabaseHelper.executeQuery(`
        UPDATE chat_configurations SET is_active = false, updated_at = CURRENT_TIMESTAMP
      `);
    }

    // First check if the configuration exists
    const existingConfig = await DatabaseHelper.executeQuerySingle(`
      SELECT id FROM chat_configurations WHERE id = $1
    `, [configId]);

    if (!existingConfig) {
      throw new AppError('Configuration not found', 404);
    }

    // Update the configuration
    await DatabaseHelper.executeQuery(`
      UPDATE chat_configurations 
      SET name = $1, description = $2, config = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [name, description || '', JSON.stringify(config), isActive || false, configId]);

    const updatedConfig = await DatabaseHelper.executeQuerySingle<ChatConfiguration>(`
      SELECT 
        id, name, description, is_active as "isActive", config,
        avg_response_time_ms as "avgResponseTimeMs",
        success_rate as "successRate",
        test_count as "testCount",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM chat_configurations 
      WHERE id = $1
    `, [configId]);

    ResponseUtils.success(res, updatedConfig, 'Configuration updated successfully');
  } catch (error) {
    console.error('Error updating configuration:', error);
    throw new AppError('Failed to update configuration', 500);
  }
}));

/**
 * DELETE /admin/chat-config/:configId
 * Delete chat configuration
 */
router.delete('/:configId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { configId } = req.params;

  try {
    // Check if this is the active configuration
    const config = await DatabaseHelper.executeQuerySingle<{isActive: boolean}>(`
      SELECT is_active as "isActive" FROM chat_configurations WHERE id = $1
    `, [configId]);

    if (config?.isActive) {
      throw new AppError('Cannot delete active configuration', 400);
    }

    const result = await DatabaseHelper.executeQuery(`
      DELETE FROM chat_configurations WHERE id = $1
    `, [configId]);

    if (result.length === 0) {
      throw new AppError('Configuration not found', 404);
    }

    ResponseUtils.success(res, { id: configId }, 'Configuration deleted successfully');
  } catch (error) {
    console.error('Error deleting configuration:', error);
    throw new AppError('Failed to delete configuration', 500);
  }
}));

/**
 * POST /admin/chat-config/:configId/test
 * Test chat configuration with a query
 */
router.post('/:configId/test', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { configId } = req.params;
  const { testQuery, contextSettings } = req.body;

  if (!testQuery) {
    throw new AppError('Test query is required', 400);
  }

  try {
    const config = await DatabaseHelper.executeQuerySingle<ChatConfiguration>(`
      SELECT config FROM chat_configurations WHERE id = $1
    `, [configId]);

    if (!config) {
      throw new AppError('Configuration not found', 404);
    }

    const startTime = Date.now();
    const testResult = await executeTestWithConfiguration(testQuery, config.config, contextSettings);
    const responseTime = Date.now() - startTime;

    // Save test session
    await DatabaseHelper.executeQuery(`
      INSERT INTO chat_test_sessions (
        configuration_id, admin_user_id, test_query, response_time_ms,
        generated_response, context_used, search_queries, processing_steps,
        iterations, iteration_count, final_confidence,
        error_message, was_successful
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      configId,
      req.user?.id,
      testQuery,
      responseTime,
      testResult.generatedResponse,
      testResult.contextUsed,
      JSON.stringify(testResult.searchQueries),
      JSON.stringify(testResult.processingSteps),
      JSON.stringify(testResult.iterations || []),
      testResult.iterationCount || 1,
      testResult.finalConfidence || 0.8,
      testResult.errorMessage || null,
      testResult.success
    ]);

    // Update configuration statistics
    await updateConfigurationStats(configId, responseTime, testResult.success);

    // Return detailed test result for admin evaluation
    ResponseUtils.success(res, {
      testQuery,
      generatedResponse: testResult.generatedResponse,
      contextUsed: testResult.contextUsed,
      searchQueries: testResult.searchQueries,
      processingSteps: testResult.processingSteps,
      iterations: testResult.iterations || [],
      iterationCount: testResult.iterationCount || 1,
      finalConfidence: testResult.finalConfidence || 0.8,
      responseTimeMs: responseTime,
      success: testResult.success,
      errorMessage: testResult.errorMessage,
      configurationId: configId,
      timestamp: new Date().toISOString()
    }, 'Test completed successfully');

  } catch (error) {
    console.error('Error testing configuration:', error);
    throw new AppError('Failed to test configuration', 500);
  }
}));

/**
 * GET /admin/chat-config/:configId/test-history
 * Get test history for a configuration
 */
router.get('/:configId/test-history', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { configId } = req.params;
  const { limit = 50 } = req.query;

  try {
    const testHistory = await DatabaseHelper.executeQuery(`
      SELECT 
        cts.id,
        cts.test_query as "testQuery",
        cts.response_time_ms as "responseTimeMs",
        cts.generated_response as "generatedResponse",
        cts.context_used as "contextUsed",
        cts.search_queries as "searchQueries",
        cts.processing_steps as "processingSteps",
        cts.iterations,
        cts.iteration_count as "iterationCount",
        cts.final_confidence as "finalConfidence",
        cts.error_message as "errorMessage",
        cts.was_successful as "wasSuccessful",
        cts.admin_rating as "adminRating",
        cts.admin_notes as "adminNotes",
        cts.created_at as "createdAt",
        u.full_name as "adminName"
      FROM chat_test_sessions cts
      LEFT JOIN users u ON cts.admin_user_id = u.id
      WHERE cts.configuration_id = $1
      ORDER BY cts.created_at DESC
      LIMIT $2
    `, [configId, limit]);

    ResponseUtils.success(res, testHistory, 'Test history retrieved successfully');
  } catch (error) {
    console.error('Error fetching test history:', error);
    throw new AppError('Failed to fetch test history', 500);
  }
}));

/**
 * PUT /admin/chat-config/test/:sessionId/rating
 * Rate a test session
 */
router.put('/test/:sessionId/rating', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId } = req.params;
  const { rating, notes } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new AppError('Rating must be between 1 and 5', 400);
  }

  try {
    await DatabaseHelper.executeQuery(`
      UPDATE chat_test_sessions 
      SET admin_rating = $1, admin_notes = $2
      WHERE id = $3
    `, [rating, notes || '', sessionId]);

    ResponseUtils.success(res, { rating, notes }, 'Test session rated successfully');
  } catch (error) {
    console.error('Error rating test session:', error);
    throw new AppError('Failed to rate test session', 500);
  }
}));

/**
 * POST /admin/chat-config/:configId/activate
 * Activate a configuration (make it the active one)
 */
router.post('/:configId/activate', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { configId } = req.params;

  try {
    await chatConfigurationService.setAsDefault(configId);
    ResponseUtils.success(res, { id: configId }, 'Configuration activated successfully');
  } catch (error) {
    console.error('Error activating configuration:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      throw new AppError('Configuration not found', 404);
    }
    throw new AppError('Failed to activate configuration', 500);
  }
}));

/**
 * GET /admin/chat-config/test-sessions
 * Get all test sessions across all configurations
 */
router.get('/test-sessions', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { limit = 50 } = req.query;

  try {
    const testSessions = await DatabaseHelper.executeQuery(`
      SELECT 
        cts.id,
        cts.configuration_id as "config_id",
        cts.test_query as "user_query",
        cts.response_time_ms as "processing_time_ms",
        cts.generated_response as "response",
        cts.context_used as "contextUsed",
        cts.search_queries as "searchQueries",
        cts.processing_steps as "processingSteps",
        cts.error_message as "errorMessage",
        cts.was_successful as "wasSuccessful",
        cts.admin_rating as "adminRating",
        cts.admin_notes as "adminNotes",
        cts.created_at,
        cc.name as "configurationName",
        u.full_name as "adminName"
      FROM chat_test_sessions cts
      LEFT JOIN chat_configurations cc ON cts.configuration_id = cc.id
      LEFT JOIN users u ON cts.admin_user_id = u.id
      ORDER BY cts.created_at DESC
      LIMIT $1
    `, [limit]);

    // Transform for frontend compatibility
    const transformedSessions = testSessions.map((session: any) => ({
      id: session.id,
      config_id: session.config_id,
      user_query: session.user_query,
      response: session.response || '',
      processing_time_ms: session.processing_time_ms || 0,
      vector_results_count: session.searchQueries ? 
        (Array.isArray(session.searchQueries) ? session.searchQueries.length : 0) : 0,
      created_at: session.created_at,
      configuration_name: session.configurationName,
      admin_name: session.adminName,
      was_successful: session.wasSuccessful,
      admin_rating: session.adminRating,
      admin_notes: session.adminNotes
    }));

    ResponseUtils.success(res, transformedSessions, 'Test sessions retrieved successfully');
  } catch (error) {
    console.error('Error fetching test sessions:', error);
    throw new AppError('Failed to fetch test sessions', 500);
  }
}));

/**
 * GET /admin/chat-config/active
 * Get the currently active configuration
 */
router.get('/active', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const activeConfig = await chatConfigurationService.getActiveConfiguration();
    ResponseUtils.success(res, activeConfig, 'Active configuration retrieved successfully');
  } catch (error) {
    console.error('Error getting active configuration:', error);
    throw new AppError('Failed to get active configuration', 500);
  }
}));

// Helper functions

async function executeTestWithConfiguration(
  testQuery: string, 
  config: any, 
  contextSettings?: any
): Promise<TestResult> {
  const testStartTime = Date.now();
  const iterations: IterationResult[] = [];
  const maxIterations = config.maxIterations || 1;
  
  let finalResponse = '';
  let finalContextUsed = '';
  let allSearchQueries: string[] = [];
  let finalConfidence = 0;
  let overallSuccess = true;

  try {
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const iterationStartTime = Date.now();
      const iterationSteps: ProcessingStepResult[] = [];
      let currentQuery = iteration === 0 ? testQuery : `${testQuery} (iteration ${iteration + 1})`;
      let searchQueries: string[] = [currentQuery];
      let contextUsed = '';
      let generatedResponse = '';
      let shouldContinue = iteration < maxIterations - 1;
      let confidence = 0.8; // Default confidence
      
      // Step 1: Query Understanding (if enabled)
      if (config.processingSteps.find((s: ProcessingStep) => s.name === 'query_understanding' && s.enabled)) {
        const step = config.processingSteps.find((s: ProcessingStep) => s.name === 'query_understanding');
        const stepStartTime = Date.now();
        
        try {
          if (config.vectorSearch.useQueryExpansion) {
            searchQueries = await llm.generateSearchQueries(currentQuery);
            searchQueries = searchQueries.slice(0, config.vectorSearch.maxQueries);
          }

          const stepEndTime = Date.now();
          iterationSteps.push({
            step: 'query_understanding',
            name: 'Query Understanding',
            startTime: stepStartTime,
            endTime: stepEndTime,
            duration: stepEndTime - stepStartTime,
            input: currentQuery,
            output: { searchQueries, queryExpansionUsed: config.vectorSearch.useQueryExpansion },
            success: true
          });
        } catch (error) {
          const stepEndTime = Date.now();
          iterationSteps.push({
            step: 'query_understanding',
            name: 'Query Understanding',
            startTime: stepStartTime,
            endTime: stepEndTime,
            duration: stepEndTime - stepStartTime,
            input: currentQuery,
            output: { error: error instanceof Error ? error.message : 'Unknown error' },
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
          overallSuccess = false;
        }
      }

      // Step 2: Context Search (if enabled)
      if (config.processingSteps.find((s: ProcessingStep) => s.name === 'context_search' && s.enabled)) {
        const stepStartTime = Date.now();
        
        try {
          const allResults: any[] = [];
          const searchDetails: any[] = [];
          
          for (const query of searchQueries) {
            const results = await qdrantService.searchByText(
              query, 
              config.vectorSearch.limit, 
              config.vectorSearch.scoreThreshold
            );
            
            // Collect detailed information about each search
            searchDetails.push({
              query,
              resultsCount: results.length,
              results: results.map((r: any) => ({
                id: r.id,
                score: r.score,
                content: r.payload?.content || r.payload?.text || 'No content available',
                text: r.payload?.text?.substring(0, 300) + '...' || 'No text',
                source: r.payload?.source || 'Unknown',
                title: r.payload?.title || r.payload?.filename || 'Untitled',
                metadata: r.payload?.metadata || {},
                chunk_index: r.payload?.chunk_index || 0
              }))
            });
            
            allResults.push(...results);
          }

          // Remove duplicates based on ID
          const uniqueResults = allResults.filter((result, index, self) => 
            index === self.findIndex(r => r.id === result.id)
          );

          const stepEndTime = Date.now();
          iterationSteps.push({
            step: 'context_search',
            name: 'Context Search',
            startTime: stepStartTime,
            endTime: stepEndTime,
            duration: stepEndTime - stepStartTime,
            input: searchQueries,
            output: { 
              totalResultsFound: allResults.length,
              uniqueResultsUsed: uniqueResults.length,
              scoreThreshold: config.vectorSearch.scoreThreshold,
              searchDetails,
              avgScore: uniqueResults.length > 0 ? 
                uniqueResults.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / uniqueResults.length : 0
            },
            success: true
          });

          // Step 3: Context Optimization (if enabled)
          if (config.processingSteps.find((s: ProcessingStep) => s.name === 'context_optimization' && s.enabled)) {
            const optStepStartTime = Date.now();
            
            try {
              if (uniqueResults.length > 0) {
                // Extract content from results, prioritizing relevant information
                const relevantContent = uniqueResults.map((r: any) => {
                  return r.payload?.content || r.content || r.payload?.text || '';
                }).filter(text => text.trim().length > 0);

                const rawContext = relevantContent.join('\n\n');

                if (config.contextSynthesis.enabled && rawContext.length > config.contextSynthesis.maxLength) {
                  // Synthesize context for complex queries
                  contextUsed = await llm.synthesizeContext(currentQuery, uniqueResults);
                  
                  // Ensure synthesis produced meaningful content
                  if (contextUsed.length < 200) {
                    // If synthesis failed, use raw content (truncated if necessary)
                    contextUsed = rawContext.length > config.contextSynthesis.maxLength 
                      ? rawContext.substring(0, config.contextSynthesis.maxLength) + '...'
                      : rawContext;
                  }
                } else {
                  // Use raw context, truncate if necessary
                  contextUsed = rawContext.length > config.contextSynthesis.maxLength 
                    ? rawContext.substring(0, config.contextSynthesis.maxLength) + '...'
                    : rawContext;
                }
              } else {
                contextUsed = '';
              }

              const optStepEndTime = Date.now();
              
              iterationSteps.push({
                step: 'context_optimization',
                name: 'Context Optimization',
                startTime: optStepStartTime,
                endTime: optStepEndTime,
                duration: optStepEndTime - optStepStartTime,
                input: { resultCount: uniqueResults.length },
                output: { 
                  contextLength: contextUsed.length,
                  synthesized: config.contextSynthesis.enabled && contextUsed.length > 200,
                  maxLength: config.contextSynthesis.maxLength,
                  wasTruncated: contextUsed.endsWith('...'),
                  uniqueResultsUsed: uniqueResults.length
                },
                success: true
              });
            } catch (error) {
              const optStepEndTime = Date.now();
              iterationSteps.push({
                step: 'context_optimization',
                name: 'Context Optimization',
                startTime: optStepStartTime,
                endTime: optStepEndTime,
                duration: optStepEndTime - optStepStartTime,
                input: { resultCount: uniqueResults.length },
                output: { error: error instanceof Error ? error.message : 'Unknown error' },
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
              });
              overallSuccess = false;
              // Fallback: use raw context even on error
              const relevantContent = uniqueResults.map((r: any) => {
                return r.payload?.content || r.content || r.payload?.text || '';
              }).filter(text => text.trim().length > 0);
              contextUsed = relevantContent.join('\n\n');
            }
          } else {
            // Even without optimization, extract proper content
            const relevantContent = uniqueResults.map((r: any) => {
              return r.payload?.content || r.content || r.payload?.text || '';
            }).filter(text => text.trim().length > 0);
            contextUsed = relevantContent.join('\n\n');
          }
        } catch (error) {
          const stepEndTime = Date.now();
          iterationSteps.push({
            step: 'context_search',
            name: 'Context Search',
            startTime: stepStartTime,
            endTime: stepEndTime,
            duration: stepEndTime - stepStartTime,
            input: searchQueries,
            output: { error: error instanceof Error ? error.message : 'Unknown error' },
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
          overallSuccess = false;
        }
      }

      // Step 4: Response Generation (if enabled)
      if (config.processingSteps.find((s: ProcessingStep) => s.name === 'response_generation' && s.enabled)) {
        const stepStartTime = Date.now();
        
        try {
          const messages = [{ role: 'user' as const, content: currentQuery }];
          
          generatedResponse = await llm.generateResponse(
            messages,
            contextUsed,
            {},
            false,
            contextSettings?.useWorkspaceOnly ? 'workspace-only' : 'standard'
          );

          // Calculate confidence based on response quality
          confidence = calculateResponseConfidence(generatedResponse, contextUsed);

          const stepEndTime = Date.now();
          iterationSteps.push({
            step: 'response_generation',
            name: 'Response Generation',
            startTime: stepStartTime,
            endTime: stepEndTime,
            duration: stepEndTime - stepStartTime,
            input: { 
              query: currentQuery, 
              contextLength: contextUsed.length,
              systemPrompt: config.systemPrompt.substring(0, 100) + '...'
            },
            output: { 
              responseLength: generatedResponse.length,
              contextUsed: contextUsed.length > 0,
              systemPromptUsed: config.systemPrompt.length > 0,
              confidence
            },
            success: true
          });
        } catch (error) {
          const stepEndTime = Date.now();
          iterationSteps.push({
            step: 'response_generation',
            name: 'Response Generation',
            startTime: stepStartTime,
            endTime: stepEndTime,
            duration: stepEndTime - stepStartTime,
            input: { 
              query: currentQuery, 
              contextLength: contextUsed.length
            },
            output: { error: error instanceof Error ? error.message : 'Unknown error' },
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
          overallSuccess = false;
        }
      }

      // Step 5: Response Validation (if enabled)
      if (config.processingSteps.find((s: ProcessingStep) => s.name === 'response_validation' && s.enabled)) {
        const stepStartTime = Date.now();
        
        try {
          let validationIssues: string[] = [];

          if (config.qualityChecks.enabled) {
            if (generatedResponse.length < config.qualityChecks.minResponseLength) {
              validationIssues.push('Response too short');
            }

            if (config.qualityChecks.checkForHallucination) {
              // Simple hallucination check - look for specific patterns
              if (generatedResponse.includes('Ich bin mir nicht sicher') || 
                  generatedResponse.includes('Das kann ich nicht beantworten')) {
                validationIssues.push('Potential hallucination detected');
              }
            }
          }

          // Determine if we should continue based on validation
          shouldContinue = shouldContinue && validationIssues.length > 0 && confidence < 0.7;

          const stepEndTime = Date.now();
          iterationSteps.push({
            step: 'response_validation',
            name: 'Response Validation',
            startTime: stepStartTime,
            endTime: stepEndTime,
            duration: stepEndTime - stepStartTime,
            input: generatedResponse.substring(0, 200) + '...',
            output: { 
              validationIssues,
              passed: validationIssues.length === 0,
              shouldContinue,
              confidence
            },
            success: true
          });
        } catch (error) {
          const stepEndTime = Date.now();
          iterationSteps.push({
            step: 'response_validation',
            name: 'Response Validation',
            startTime: stepStartTime,
            endTime: stepEndTime,
            duration: stepEndTime - stepStartTime,
            input: generatedResponse.substring(0, 200) + '...',
            output: { error: error instanceof Error ? error.message : 'Unknown error' },
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
          overallSuccess = false;
        }
      }

      const iterationEndTime = Date.now();
      
      // Store iteration result
      iterations.push({
        iteration: iteration + 1,
        startTime: iterationStartTime,
        endTime: iterationEndTime,
        duration: iterationEndTime - iterationStartTime,
        query: currentQuery,
        steps: iterationSteps,
        finalAnswer: generatedResponse,
        shouldContinue,
        confidence
      });

      // Update final values with the latest iteration
      finalResponse = generatedResponse;
      finalContextUsed = contextUsed;
      allSearchQueries = [...allSearchQueries, ...searchQueries];
      finalConfidence = confidence;

      // Stop if we shouldn't continue or confidence is high enough
      if (!shouldContinue || confidence >= 0.9) {
        break;
      }
    }

    const totalResponseTime = Date.now() - testStartTime;

    return {
      success: overallSuccess,
      responseTimeMs: totalResponseTime,
      generatedResponse: finalResponse,
      contextUsed: finalContextUsed,
      searchQueries: allSearchQueries,
      processingSteps: [], // Keep for backward compatibility
      iterations,
      iterationCount: iterations.length,
      finalConfidence
    };

  } catch (error) {
    console.error('Error in test execution:', error);
    return {
      success: false,
      responseTimeMs: Date.now() - testStartTime,
      generatedResponse: '',
      contextUsed: '',
      searchQueries: [testQuery],
      processingSteps: [],
      iterations: [],
      iterationCount: 0,
      finalConfidence: 0,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to calculate response confidence
function calculateResponseConfidence(response: string, context: string): number {
  let confidence = 0.5; // Base confidence
  
  // Higher confidence if response is longer and more detailed
  if (response.length > 200) confidence += 0.1;
  if (response.length > 500) confidence += 0.1;
  
  // Higher confidence if context was used
  if (context.length > 0) confidence += 0.2;
  
  // Lower confidence for uncertainty phrases
  if (response.includes('nicht sicher') || response.includes('möglicherweise') || response.includes('vielleicht')) {
    confidence -= 0.2;
  }
  
  // Higher confidence for specific information
  if (response.includes('gemäß') || response.includes('laut') || response.includes('entsprechend')) {
    confidence += 0.1;
  }
  
  return Math.max(0, Math.min(1, confidence));
}

async function updateConfigurationStats(configId: string, responseTime: number, success: boolean) {
  try {
    // Get current stats
    const current = await DatabaseHelper.executeQuerySingle<{
      avgResponseTimeMs: number;
      successRate: number;
      testCount: number;
    }>(`
      SELECT 
        avg_response_time_ms as "avgResponseTimeMs",
        success_rate as "successRate",
        test_count as "testCount"
      FROM chat_configurations 
      WHERE id = $1
    `, [configId]);

    if (current) {
      const newTestCount = current.testCount + 1;
      const newAvgResponseTime = Math.round(
        (current.avgResponseTimeMs * current.testCount + responseTime) / newTestCount
      );
      const newSuccessRate = (
        (current.successRate * current.testCount + (success ? 100 : 0)) / newTestCount
      );

      await DatabaseHelper.executeQuery(`
        UPDATE chat_configurations 
        SET 
          avg_response_time_ms = $1,
          success_rate = $2,
          test_count = $3
        WHERE id = $4
      `, [newAvgResponseTime, newSuccessRate, newTestCount, configId]);
    }
  } catch (error) {
    console.error('Error updating configuration stats:', error);
    // Don't throw error here as it's not critical
  }
}

export default router;
