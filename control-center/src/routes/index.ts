import { Router, type Request, type Response } from 'express';

import { createAgenciesRouter } from '@/routes/agencies';
import { createAgentsRouter } from '@/routes/agents';
import { createDiscoveryRouter } from '@/routes/discovery';
import { createEnrichmentRouter } from '@/routes/enrichment';
import { createEventsRouter } from '@/routes/events';
import { createHealthRouter } from '@/routes/health';
import { createSuburbsRouter } from '@/routes/suburbs';

function createApiRouter(): Router {
  const apiRouter = Router();

  apiRouter.use('/suburbs', createSuburbsRouter());
  apiRouter.use('/agencies', createAgenciesRouter());
  apiRouter.use('/agents', createAgentsRouter());
  apiRouter.use('/discovery', createDiscoveryRouter());
  apiRouter.use('/enrichment', createEnrichmentRouter());
  apiRouter.use('/events', createEventsRouter());

  apiRouter.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  return apiRouter;
}

export function createRootRouter(): Router {
  const router = Router();

  router.use('/health', createHealthRouter());
  router.use('/api', createApiRouter());

  return router;
}
