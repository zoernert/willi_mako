// src/routes/message-analyzer.ts
import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { MessageAnalyzerService } from '../modules/message-analyzer/services/message-analyzer.service';
import geminiService from '../services/gemini';
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
      const prompt = `Erkläre mir den Inhalt folgender Marktmeldung aus der Energiewirtschaft. Gib eine verständliche und strukturierte Erklärung auf Deutsch:

${message}

Bitte erkläre:
1. Was für eine Art von Nachricht das ist
2. Die wichtigsten Inhalte und Bedeutung
3. Welche Akteure betroffen sind
4. Was die praktischen Auswirkungen sind
5. Eventuell vorhandene Besonderheiten oder Auffälligkeiten`;

      const explanation = await geminiService.generateText(prompt);
      
      res.status(200).json({ 
        success: true, 
        data: { 
          explanation,
          success: true 
        } 
      });
    } catch (error) {
      console.error('Error generating AI explanation:', error);
      next(new AppError('Fehler beim Generieren der KI-Erklärung', 500));
    }
  }
);

export { router as messageAnalyzerRoutes };
