import { Router, type Request, type Response } from 'express';

import { getAllSuburbs, getSuburbProgress } from '@/db/queries';

export function createSuburbsRouter(): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const suburbs = getAllSuburbs();
    res.status(200).json(suburbs);
  });

  router.get('/:slug', (req: Request, res: Response) => {
    const slug = req.params.slug;
    const suburb = getSuburbProgress(slug);
    if (!suburb) {
      res.status(404).json({ error: 'Suburb not found' });
      return;
    }
    res.status(200).json(suburb);
  });

  return router;
}

