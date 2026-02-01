import { Router, type Request, type Response } from 'express';

import { getActivityHistory, onActivityEvent } from '@/lib/activity-events';

function writeEvent(res: Response, eventName: string, data: unknown): void {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function createEventsRouter(): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    writeEvent(res, 'ready', { timestamp: new Date().toISOString() });

    for (const event of getActivityHistory()) {
      writeEvent(res, 'log', event);
    }

    const unsubscribe = onActivityEvent((event) => {
      writeEvent(res, 'log', event);
    });

    const keepAlive = setInterval(() => {
      res.write(': keep-alive\n\n');
    }, 15_000);

    req.on('close', () => {
      clearInterval(keepAlive);
      unsubscribe();
    });
  });

  return router;
}

