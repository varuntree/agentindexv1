import { Router, type Request, type Response } from 'express';

import { runDiscovery } from '@/skills/discovery';
import { logger } from '@/lib/logger';

interface DiscoveryRunBody {
  dryRun?: unknown;
  state?: unknown;
  suburb?: unknown;
}

export function createDiscoveryRouter(): Router {
  const router = Router();

  router.post('/run', (req: Request, res: Response) => {
    const body = req.body as DiscoveryRunBody;
    const suburb = typeof body.suburb === 'string' ? body.suburb : '';
    const state = typeof body.state === 'string' ? body.state : '';
    const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : false;

    if (!suburb || !state) {
      res.status(400).json({ error: 'suburb and state required' });
      return;
    }

    void runDiscovery({ suburb, state, dryRun })
      .then((result) => {
        logger.info('POST /api/discovery/run', 'finished', result);
      })
      .catch((error: unknown) => {
        logger.error('POST /api/discovery/run', 'failed', { suburb, state, error });
      });

    res.status(202).json({
      status: 'running',
      message: dryRun ? 'Discovery dry-run started' : 'Discovery started',
      input: { suburb, state, dryRun }
    });
  });

  return router;
}
