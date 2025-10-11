import { Router } from 'express';
import authRoutes from './auth.routes';
import sessionsRoutes from './sessions.routes';
import chatRoutes from './chat.routes';
import { apiV2MetricsHandler, apiV2MetricsMiddleware } from '../../../../../middleware/api-v2/metrics';
import { apiV2OpenApiDocument } from './openapi';
import retrievalRoutes from './retrieval.routes';
import reasoningRoutes from './reasoning.routes';
import contextRoutes from './context.routes';
import clarificationRoutes from './clarification.routes';

const router = Router();

router.use(apiV2MetricsMiddleware);

router.use('/auth', authRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/chat', chatRoutes);
router.use('/retrieval', retrievalRoutes);
router.use('/reasoning', reasoningRoutes);
router.use('/context', contextRoutes);
router.use('/clarification', clarificationRoutes);
router.get('/metrics', apiV2MetricsHandler);
router.get('/openapi.json', (_req, res) => {
	res.json(apiV2OpenApiDocument);
});

export default router;
