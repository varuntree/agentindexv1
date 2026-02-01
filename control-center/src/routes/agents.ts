import { Router, type Request, type Response } from 'express';

import type { EnrichmentStatus } from '@/types';
import { getAgentBySlug, getAgentEnrichmentStatusCounts, listAgents } from '@/db/queries';

interface AgentsQuery {
  agency_id?: string;
  enrichment_status?: string;
  limit?: string;
  suburb?: string;
}

function parseLimit(limit: string | undefined): number | undefined {
  if (!limit) return undefined;
  const value = Number(limit);
  if (!Number.isFinite(value)) return undefined;
  if (value <= 0) return undefined;
  return Math.min(Math.floor(value), 500);
}

function parseEnrichmentStatus(value: string | undefined): EnrichmentStatus | undefined {
  if (!value) return undefined;
  if (
    value === 'pending' ||
    value === 'in_progress' ||
    value === 'complete' ||
    value === 'failed' ||
    value === 'skipped'
  ) {
    return value;
  }
  return undefined;
}

function parseAgencyId(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.floor(parsed);
}

export function createAgentsRouter(): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    const query = req.query as unknown as AgentsQuery;
    const agents = listAgents({
      suburb: query.suburb,
      agencyId: parseAgencyId(query.agency_id),
      enrichmentStatus: parseEnrichmentStatus(query.enrichment_status),
      limit: parseLimit(query.limit)
    });

    res.status(200).json(agents);
  });

  router.get('/enrichment-status', (_req: Request, res: Response) => {
    const counts = getAgentEnrichmentStatusCounts();
    res.status(200).json(counts);
  });

  router.get('/:slug', (req: Request, res: Response) => {
    const slug = req.params.slug;
    const agent = getAgentBySlug(slug);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.status(200).json(agent);
  });

  return router;
}
