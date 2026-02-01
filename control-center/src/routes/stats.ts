import { Router, type Request, type Response } from 'express';

import { db } from '@/db/database';
import { getAgentEnrichmentStatusCounts } from '@/db/queries';
import { getActivityHistory } from '@/lib/activity-events';

interface CountRow {
  count: number;
}

interface GroupCountRow {
  count: number;
  key: string;
}

function getCount(sql: string): number {
  const row = db.prepare(sql).get() as CountRow | undefined;
  const count = row?.count ?? 0;
  return Number.isFinite(count) ? count : 0;
}

function getGroupedCounts(sql: string): Record<string, number> {
  const rows = db.prepare(sql).all() as GroupCountRow[];
  const result: Record<string, number> = {};
  for (const row of rows) {
    const count = Number.isFinite(row.count) ? row.count : 0;
    result[row.key] = count;
  }
  return result;
}

export function createStatsRouter(): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    try {
      const totals = {
        agencies: getCount('SELECT COUNT(*) AS count FROM agencies'),
        agents: getCount('SELECT COUNT(*) AS count FROM agents'),
        suburbs: getCount('SELECT COUNT(*) AS count FROM scrape_progress')
      };

      const suburbsByStatus = getGroupedCounts(
        `
          SELECT COALESCE(status, 'pending') AS key, COUNT(*) AS count
          FROM scrape_progress
          GROUP BY COALESCE(status, 'pending')
        `
      );

      const enrichmentByStatus = getAgentEnrichmentStatusCounts();

      const enrichmentByQuality = getGroupedCounts(
        `
          SELECT COALESCE(enrichment_quality, 'none') AS key, COUNT(*) AS count
          FROM agents
          GROUP BY COALESCE(enrichment_quality, 'none')
        `
      );

      const recentActivity = getActivityHistory().slice(-20).reverse();

      res.status(200).json({
        generated_at: new Date().toISOString(),
        totals,
        suburbs_by_status: suburbsByStatus,
        enrichment_by_status: enrichmentByStatus,
        enrichment_by_quality: enrichmentByQuality,
        recent_activity: recentActivity
      });
    } catch (error) {
      console.error('[GET /api/stats]', { error });
      res.status(500).json({ error: 'Failed to load stats' });
    }
  });

  return router;
}

