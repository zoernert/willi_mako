import { Router, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { ResponseUtils } from '../../utils/response';
import { AppError } from '../../utils/errors';
import { AuthenticatedRequest } from '../../middleware/auth';
import { chatCorrectionSuggestionService } from '../../modules/chat-corrections/chatCorrectionSuggestion.service';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const suggestions = await chatCorrectionSuggestionService.listSuggestions(status);
    ResponseUtils.success(res, suggestions, 'Korrekturvorschläge geladen');
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const suggestion = await chatCorrectionSuggestionService.getSuggestion(req.params.id);
    if (!suggestion) {
      throw new AppError('Korrekturvorschlag wurde nicht gefunden', 404);
    }
    ResponseUtils.success(res, suggestion, 'Korrekturvorschlag geladen');
  })
);

router.post(
  '/:id/approve',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user?.id) {
      throw new AppError('Authentifizierung erforderlich', 401);
    }

    const rawTags = req.body?.tags;
    const tags = Array.isArray(rawTags)
      ? rawTags.map((t) => (typeof t === 'string' ? t.trim() : '')).filter(Boolean)
      : typeof rawTags === 'string'
        ? rawTags.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined;

    const result = await chatCorrectionSuggestionService.approveSuggestion(req.params.id, req.user.id, {
      vectorText: typeof req.body?.vectorText === 'string' ? req.body.vectorText : undefined,
      vectorTitle: typeof req.body?.vectorTitle === 'string' ? req.body.vectorTitle : undefined,
      tags,
      notes: typeof req.body?.notes === 'string' ? req.body.notes : undefined
    });

    ResponseUtils.success(res, result, 'Korrekturvorschlag freigegeben');
  })
);

router.post(
  '/:id/reject',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user?.id) {
      throw new AppError('Authentifizierung erforderlich', 401);
    }

    const result = await chatCorrectionSuggestionService.rejectSuggestion(req.params.id, req.user.id, req.body?.notes);
    ResponseUtils.success(res, result, 'Korrekturvorschlag abgelehnt');
  })
);

export default router;
