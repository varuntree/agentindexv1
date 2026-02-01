import { Router, type Request, type Response } from 'express';

interface DiscoveryRunBody {
  state?: unknown;
  suburb?: unknown;
}

export function createDiscoveryRouter(): Router {
  const router = Router();

  router.post('/run', (req: Request, res: Response) => {
    const body = req.body as DiscoveryRunBody;
    const suburb = typeof body.suburb === 'string' ? body.suburb : '';
    const state = typeof body.state === 'string' ? body.state : '';

    if (!suburb || !state) {
      res.status(400).json({ error: 'suburb and state required' });
      return;
    }

    res.status(200).json({
      status: 'pending',
      message: 'Discovery queued (placeholder)',
      input: { suburb, state }
    });
  });

  return router;
}

