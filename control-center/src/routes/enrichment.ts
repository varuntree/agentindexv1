import { Router, type Request, type Response } from 'express';

interface EnrichmentRunBody {
  suburbSlug?: unknown;
}

export function createEnrichmentRouter(): Router {
  const router = Router();

  router.post('/run', (req: Request, res: Response) => {
    const body = req.body as EnrichmentRunBody;
    const suburbSlug = typeof body.suburbSlug === 'string' ? body.suburbSlug : '';

    res.status(200).json({
      status: 'pending',
      message: 'Enrichment queued (placeholder)',
      input: { suburbSlug: suburbSlug || null }
    });
  });

  return router;
}

