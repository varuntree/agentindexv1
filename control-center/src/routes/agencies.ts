import { Router, type Request, type Response } from 'express';

import { getAgencyBySlug, getAgentsByAgency, listAgencies } from '@/db/queries';

interface AgenciesQuery {
  limit?: string;
  postcode?: string;
  state?: string;
  suburb?: string;
}

function parseLimit(limit: string | undefined): number | undefined {
  if (!limit) return undefined;
  const value = Number(limit);
  if (!Number.isFinite(value)) return undefined;
  if (value <= 0) return undefined;
  return Math.min(Math.floor(value), 500);
}

export function createAgenciesRouter(): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    const query = req.query as unknown as AgenciesQuery;
    const agencies = listAgencies({
      suburb: query.suburb,
      state: query.state,
      postcode: query.postcode,
      limit: parseLimit(query.limit)
    });
    res.status(200).json(agencies);
  });

  router.get('/:slug', (req: Request, res: Response) => {
    const slug = req.params.slug;
    const agency = getAgencyBySlug(slug);
    if (!agency) {
      res.status(404).json({ error: 'Agency not found' });
      return;
    }

    const agents = getAgentsByAgency(agency.id);
    res.status(200).json({ agency, agents });
  });

  return router;
}

