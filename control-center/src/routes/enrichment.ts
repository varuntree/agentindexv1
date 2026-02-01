import { Router, type Request, type Response } from 'express';

import { runEnrichment } from '@/skills/enrichment';
import { logger } from '@/lib/logger';
import { publishActivityEvent } from '@/lib/activity-events';

interface EnrichmentRunBody {
  dryRun?: unknown;
  limit?: unknown;
}

export function createEnrichmentRouter(): Router {
  const router = Router();

  router.post('/run', (req: Request, res: Response) => {
    const body = req.body as EnrichmentRunBody;
    const rawLimit = body.limit;
    const limit =
      typeof rawLimit === 'number'
        ? rawLimit
        : typeof rawLimit === 'string'
          ? Number(rawLimit)
          : NaN;
    const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : false;

    if (!Number.isFinite(limit) || limit <= 0) {
      res.status(400).json({ error: 'limit must be a positive number' });
      return;
    }

    publishActivityEvent({
      type: 'info',
      route: 'enrichment',
      message: 'started',
      context: { limit, dryRun }
    });

    void runEnrichment({ limit, dryRun })
      .then((result) => {
        logger.info('POST /api/enrichment/run', 'finished', result);
        publishActivityEvent({
          type: result.status === 'complete' ? 'success' : 'info',
          route: 'enrichment',
          message: 'finished',
          context: result
        });
      })
      .catch((error: unknown) => {
        logger.error('POST /api/enrichment/run', 'failed', { limit, error });
        publishActivityEvent({
          type: 'error',
          route: 'enrichment',
          message: 'failed',
          context: { limit, error: error instanceof Error ? error.message : String(error) }
        });
      });

    res.status(202).json({
      status: 'running',
      message: dryRun ? 'Enrichment dry-run started' : 'Enrichment started',
      input: { limit, dryRun }
    });
  });

  return router;
}
