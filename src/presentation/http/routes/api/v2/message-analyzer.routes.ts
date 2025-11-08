// src/presentation/http/routes/api/v2/message-analyzer.routes.ts
import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../../../../middleware/auth';
import { asyncHandler, AppError } from '../../../../../middleware/errorHandler';
import { apiV2RateLimiter } from '../../../../../middleware/api-v2/rateLimiter';
import { MessageAnalyzerService } from '../../../../../modules/message-analyzer/services/message-analyzer.service';
import llm from '../../../../../services/llmProvider';

const router = Router();
const messageAnalyzerService = new MessageAnalyzerService();

/**
 * POST /message-analyzer/analyze
 * Strukturanalyse einer EDIFACT-Nachricht
 */
router.post(
  '/analyze',
  authenticateToken,
  apiV2RateLimiter(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      throw new AppError('Message content is required and must be a string.', 400);
    }

    const result = await messageAnalyzerService.analyze(message);
    
    res.status(200).json({ 
      success: true, 
      data: result 
    });
  })
);

/**
 * POST /message-analyzer/explanation
 * KI-generierte verständliche Erklärung einer EDIFACT-Nachricht
 * Nutzt die neue 6-Phasen-Architektur für optimale Ergebnisse
 */
router.post(
  '/explanation',
  authenticateToken,
  apiV2RateLimiter(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      throw new AppError('Message content is required and must be a string.', 400);
    }

    // Use the full analysis pipeline for comprehensive explanation
    const analysis = await messageAnalyzerService.analyze(message);
    
    // The analysis.summary already contains the intelligent explanation
    // from the 6-phase pipeline with knowledge base context
    const explanation = `${analysis.summary}\n\n**Detaillierte Prüfungen:**\n${analysis.plausibilityChecks.map(check => `• ${check}`).join('\n')}`;
    
    res.status(200).json({ 
      success: true, 
      data: { 
        explanation,
        messageType: analysis.format,
        success: true 
      } 
    });
  })
);

/**
 * POST /message-analyzer/chat
 * Interaktiver Chat über eine EDIFACT-Nachricht
 * Nutzt die 6-Phasen-Analyse für besseren Kontext
 */
router.post(
  '/chat',
  authenticateToken,
  apiV2RateLimiter(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { message, chatHistory, currentEdifactMessage } = req.body;

    if (!message || typeof message !== 'string') {
      throw new AppError('Message content is required and must be a string.', 400);
    }

    if (!currentEdifactMessage || typeof currentEdifactMessage !== 'string') {
      throw new AppError('Current EDIFACT message is required for context.', 400);
    }

    // Build context from chat history
    const historyContext = chatHistory && Array.isArray(chatHistory) 
      ? chatHistory.map((msg: any) => `${msg.role === 'user' ? 'Nutzer' : 'Assistent'}: ${msg.content}`).join('\n')
      : '';

    // Get structured analysis for better context (only if not cached)
    let contextualInfo = '';
    try {
      const analysis = await messageAnalyzerService.analyze(currentEdifactMessage);
      // Add structured info to context if available
      if (analysis.summary) {
        contextualInfo = `\n**Nachrichtenanalyse:**\n${analysis.summary}\n`;
      }
    } catch (error) {
      console.warn('Could not get analysis context for chat:', error);
      // Continue without analysis context
    }

    const prompt = `Du bist ein Experte für EDIFACT-Nachrichten in der deutschen Energiewirtschaft (edi@energy). 
    
Aktuelle EDIFACT-Nachricht:
${currentEdifactMessage}
${contextualInfo}
${historyContext ? `Bisheriger Gesprächsverlauf:\n${historyContext}\n` : ''}

Benutzerfrage: ${message}

Beantworte die Frage präzise und verständlich auf Deutsch. Beziehe dich auf die konkrete EDIFACT-Nachricht und nutze dein Expertenwissen zu Formaten wie MSCONS, UTILMD, ORDERS, INVOIC, etc.`;

    const response = await llm.generateText(prompt);
    
    res.status(200).json({ 
      success: true, 
      data: { 
        response,
        timestamp: new Date().toISOString()
      } 
    });
  })
);

/**
 * POST /message-analyzer/modify
 * Modifizierung einer EDIFACT-Nachricht basierend auf natürlichsprachlicher Anweisung
 */
router.post(
  '/modify',
  authenticateToken,
  apiV2RateLimiter(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { instruction, currentMessage } = req.body;

    if (!instruction || typeof instruction !== 'string') {
      throw new AppError('Modification instruction is required.', 400);
    }

    if (!currentMessage || typeof currentMessage !== 'string') {
      throw new AppError('Current message is required.', 400);
    }

    // Use LLM to modify the message based on instruction
    const prompt = `Du bist ein Experte für EDIFACT-Nachrichten in der deutschen Energiewirtschaft (edi@energy).

Aktuelle EDIFACT-Nachricht:
${currentMessage}

Änderungsauftrag: ${instruction}

WICHTIG: 
1. Führe die gewünschte Änderung durch und gib die VOLLSTÄNDIGE modifizierte EDIFACT-Nachricht zurück
2. Behalte das EDIFACT-Format exakt bei (Trennzeichen, Segmentstruktur, etc.)
3. Achte auf korrekte Syntax und Formatkonventionen
4. Gib NUR die modifizierte Nachricht zurück, keine Erklärungen
5. Stelle sicher, dass alle Pflichtfelder erhalten bleiben

Modifizierte EDIFACT-Nachricht:`;

    const modifiedMessage = await llm.generateText(prompt);
    
    // Clean up the response (remove potential markdown formatting)
    const cleanedMessage = modifiedMessage
      .replace(/```edifact\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Validate basic EDIFACT structure
    const isValid = await messageAnalyzerService.validateEdifactStructure(cleanedMessage);
    
    res.status(200).json({ 
      success: true, 
      data: { 
        modifiedMessage: cleanedMessage,
        isValid,
        timestamp: new Date().toISOString()
      } 
    });
  })
);

/**
 * POST /message-analyzer/validate
 * Validierung einer EDIFACT-Nachricht (Struktur und Semantik)
 */
router.post(
  '/validate',
  authenticateToken,
  apiV2RateLimiter(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      throw new AppError('Message content is required.', 400);
    }

    const validation = await messageAnalyzerService.validateEdifactMessage(message);
    
    res.status(200).json({ 
      success: true, 
      data: validation
    });
  })
);

export default router;
