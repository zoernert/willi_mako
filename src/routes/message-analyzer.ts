// src/routes/message-analyzer.ts
import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { MessageAnalyzerService } from '../modules/message-analyzer/services/message-analyzer.service';
import llm from '../services/llmProvider';
import { AppError } from '../utils/errors';

const router = Router();
const messageAnalyzerService = new MessageAnalyzerService();

router.post(
  '/analyze',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return next(new AppError('Message content is required and must be a string.', 400));
    }

    try {
      const result = await messageAnalyzerService.analyze(message);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/ai-explanation',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return next(new AppError('Message content is required and must be a string.', 400));
    }

    try {
      // Use the full 6-phase analysis pipeline for comprehensive explanation
      const analysis = await messageAnalyzerService.analyze(message);
      
      // Use the raw summary from Gemini (already contains formatted tables)
      const explanation = analysis.summary;
      
      res.status(200).json({ 
        success: true, 
        data: { 
          explanation,
          messageType: analysis.format,
          success: true,
          debug: analysis.debug  // NEW: Include debug info for all 6 phases
        } 
      });
    } catch (error) {
      console.error('Error generating AI explanation:', error);
      next(new AppError('Fehler beim Generieren der KI-Erklärung', 500));
    }
  }
);

// Interactive chat endpoint for message analysis
router.post(
  '/chat',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const { message, chatHistory, currentEdifactMessage } = req.body;

    if (!message || typeof message !== 'string') {
      return next(new AppError('Message content is required and must be a string.', 400));
    }

    if (!currentEdifactMessage || typeof currentEdifactMessage !== 'string') {
      return next(new AppError('Current EDIFACT message is required for context.', 400));
    }

    try {
      // Build context from chat history
      const historyContext = chatHistory && Array.isArray(chatHistory) 
        ? chatHistory.map((msg: any) => `${msg.role === 'user' ? 'Nutzer' : 'Assistent'}: ${msg.content}`).join('\n')
        : '';

      const prompt = `Du bist ein Experte für EDIFACT-Nachrichten in der deutschen Energiewirtschaft (edi@energy). 
      
Aktuelle EDIFACT-Nachricht:
${currentEdifactMessage}

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
    } catch (error) {
      console.error('Error in message analyzer chat:', error);
      next(new AppError('Fehler beim Verarbeiten der Chat-Anfrage', 500));
    }
  }
);

// Modify EDIFACT message based on natural language instruction
router.post(
  '/modify',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const { instruction, currentMessage } = req.body;

    if (!instruction || typeof instruction !== 'string') {
      return next(new AppError('Modification instruction is required.', 400));
    }

    if (!currentMessage || typeof currentMessage !== 'string') {
      return next(new AppError('Current message is required.', 400));
    }

    try {
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
    } catch (error) {
      console.error('Error modifying message:', error);
      next(new AppError('Fehler beim Modifizieren der Nachricht', 500));
    }
  }
);

// Validate EDIFACT message structure and semantics
router.post(
  '/validate',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return next(new AppError('Message content is required.', 400));
    }

    try {
      const validation = await messageAnalyzerService.validateEdifactMessage(message);
      
      res.status(200).json({ 
        success: true, 
        data: validation
      });
    } catch (error) {
      console.error('Error validating message:', error);
      next(new AppError('Fehler beim Validieren der Nachricht', 500));
    }
  }
);

export { router as messageAnalyzerRoutes };
