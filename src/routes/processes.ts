import express from 'express';
import { ProcessService } from '../services/processService';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all process routes
// router.use(authenticateToken);

/**
 * POST /api/processes/search
 * Search for processes and generate Mermaid diagrams
 */
router.post('/search', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { query, conversationHistory = [] } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query ist erforderlich und muss ein String sein'
      });
    }

    if (query.length < 3) {
      return res.status(400).json({
        error: 'Query muss mindestens 3 Zeichen lang sein'
      });
    }

    // Log the search request for monitoring
    console.log(`[ProcessSearch] User: ${req.user?.id}, Query: "${query}"`);

    const result = await ProcessService.searchProcesses({
      query,
      conversationHistory
    });

    // Log the results for monitoring
    console.log(`[ProcessSearch] Found ${result.diagrams.length} diagrams for query: "${query}"`);

    res.json(result);
  } catch (error) {
    console.error('Error in process search:', error);
    res.status(500).json({
      error: 'Fehler bei der Prozesssuche',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
});

/**
 * POST /api/processes/optimize
 * Optimize an existing process based on user feedback
 */
router.post('/optimize', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { originalQuery, optimizationRequest, currentDiagrams = [] } = req.body;

    if (!originalQuery || !optimizationRequest) {
      return res.status(400).json({
        error: 'originalQuery und optimizationRequest sind erforderlich'
      });
    }

    console.log(`[ProcessOptimize] User: ${req.user?.id}, Optimization: "${optimizationRequest}"`);    const result = await ProcessService.optimizeProcess({
      originalQuery,
      optimizationRequest,
      currentDiagrams
    });

    res.json(result);
  } catch (error) {
    console.error('Error in process optimization:', error);
    res.status(500).json({
      error: 'Fehler bei der Prozessoptimierung',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
});

/**
 * POST /api/processes/related
 * Find related processes for a given diagram
 */
router.post('/related', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { diagram } = req.body;

    if (!diagram || !diagram.id) {
      return res.status(400).json({
        error: 'Diagram mit ID ist erforderlich'
      });
    }

    console.log(`[ProcessRelated] User: ${req.user?.id}, Diagram: "${diagram.title}"`);

    const relatedDiagrams = await ProcessService.findRelatedProcesses(diagram);

    res.json({
      relatedDiagrams,
      count: relatedDiagrams.length
    });
  } catch (error) {
    console.error('Error finding related processes:', error);
    res.status(500).json({
      error: 'Fehler bei der Suche nach verwandten Prozessen',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
});

/**
 * GET /api/processes/health
 * Health check for the process service
 */
router.get('/health', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    // Simple health check - try to perform a basic search
    const testResult = await ProcessService.searchProcesses({
      query: 'test',
      conversationHistory: []
    });
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      diagramsAvailable: testResult.diagrams.length > 0
    });
  } catch (error) {
    console.error('Process service health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/processes/improve-mermaid
 * Improve Mermaid code using LLM
 */
router.post('/improve-mermaid', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { originalCode, title, context } = req.body;

    if (!originalCode || typeof originalCode !== 'string') {
      return res.status(400).json({
        error: 'originalCode ist erforderlich und muss ein String sein'
      });
    }

    console.log(`[MermaidImprove] User: ${req.user?.id}, Title: "${title}"`);

    const result = await ProcessService.improveMermaidCode(originalCode, context);

    console.log(`[MermaidImprove] Improved code for: "${title}"`);

    res.json({
      improvedCode: result,
      improvements: ['LLM-basierte Verbesserung'],
      valid: true,
      confidence: 0.8
    });
  } catch (error) {
    console.error('Error in Mermaid code improvement:', error);
    res.status(500).json({
      error: 'Fehler bei der Mermaid-Code-Verbesserung',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
});

/**
 * POST /api/processes/validate-mermaid
 * Validate Mermaid code syntax
 */
router.post('/validate-mermaid', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        error: 'code ist erforderlich und muss ein String sein'
      });
    }

    console.log(`[MermaidValidate] User: ${req.user?.id}, Code length: ${code.length}`);

    const result = await ProcessService.validateMermaidCode(code);

    res.json(result);
  } catch (error) {
    console.error('Error in Mermaid code validation:', error);
    res.status(500).json({
      error: 'Fehler bei der Mermaid-Code-Validierung',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
});

/**
 * POST /api/processes/search/with-improvement
 * Search for processes with automatic Mermaid code improvement
 */
router.post('/search/with-improvement', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { query, conversationHistory = [] } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query ist erforderlich',
        details: 'Bitte geben Sie eine gültige Suchanfrage ein'
      });
    }

    // Log the improved search request for monitoring
    console.log(`[ProcessSearch with Improvement] User: ${req.user?.id}, Query: "${query}"`);

    const result = await ProcessService.searchProcessesWithImprovement({
      query,
      conversationHistory
    });

    // Log the results for monitoring
    console.log(`[ProcessSearch with Improvement] Found ${result.diagrams.length} improved diagrams for query: "${query}"`);

    res.json(result);
  } catch (error) {
    console.error('Error in improved process search:', error);
    res.status(500).json({
      error: 'Fehler bei der erweiterten Prozesssuche',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
});

export default router;
