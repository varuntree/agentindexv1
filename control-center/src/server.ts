import { type Express, type NextFunction, type Request, type Response } from 'express';
import express from 'express';

import { logger } from '@/lib/logger';
import { errorHandler } from '@/middleware/error-handler';
import { createRootRouter } from '@/routes';

function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}

function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const route = `${req.method} ${req.originalUrl.split('?')[0]}`;
    logger.info(route, 'request', {
      statusCode: res.statusCode,
      durationMs: Date.now() - start
    });
  });
  next();
}

export function createServer(): Express {
  const app = express();

  app.disable('x-powered-by');

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(corsMiddleware);
  app.use(requestLoggingMiddleware);

  app.use(createRootRouter());

  app.use(errorHandler);

  return app;
}

