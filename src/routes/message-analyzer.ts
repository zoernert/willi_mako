// src/routes/message-analyzer.ts
import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { MessageAnalyzerService } from '../modules/message-analyzer/services/message-analyzer.service';
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

export { router as messageAnalyzerRoutes };
