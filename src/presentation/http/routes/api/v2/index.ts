import { Router } from 'express';
import authRoutes from './auth.routes';
import sessionsRoutes from './sessions.routes';
import chatRoutes from './chat.routes';
import { apiV2MetricsHandler, apiV2MetricsMiddleware } from '../../../../../middleware/api-v2/metrics';
import { apiV2OpenApiDocument } from './openapi';

const router = Router();

router.use(apiV2MetricsMiddleware);

router.use('/auth', authRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/chat', chatRoutes);
router.get('/metrics', apiV2MetricsHandler);
router.get('/openapi.json', (_req, res) => {
	res.json(apiV2OpenApiDocument);
});

export default router;
