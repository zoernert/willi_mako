// src/routes/public-edifact.ts
import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
// Lazy import inside handlers to avoid circular init

const router = Router();

// Health check for the public EDIFACT API
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, status: 'ok' });
});

// Analyze full or near-complete EDIFACT messages
router.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const message = (req.body?.message ?? req.body?.text ?? '').toString();
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return next(new AppError('Field "message" is required (string).', 400));
    }
    const limited = message.slice(0, 20000);
  const { edifactTool } = await import('../services/edifactTool');
  const result = await edifactTool.analyzeMessage(limited);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Explain EDIFACT segment or short fragment
router.post('/explain', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fragment = (req.body?.fragment ?? req.body?.text ?? '').toString();
    if (!fragment || typeof fragment !== 'string' || fragment.trim().length === 0) {
      return next(new AppError('Field "fragment" is required (string).', 400));
    }
    const limited = fragment.slice(0, 2000);
  const { edifactTool } = await import('../services/edifactTool');
  const result = await edifactTool.explainSegment(limited);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
