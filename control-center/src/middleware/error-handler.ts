import type { NextFunction, Request, Response } from 'express';

import { logger } from '@/lib/logger';

interface ErrorWithStatus {
  statusCode?: number;
  status?: number;
  message?: string;
}

function getStatusCode(error: unknown): number {
  if (typeof error === 'object' && error !== null) {
    const maybe = error as ErrorWithStatus;
    const code = maybe.statusCode ?? maybe.status;
    if (typeof code === 'number' && Number.isFinite(code) && code >= 400 && code <= 599) return code;
  }
  return 500;
}

function getMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as ErrorWithStatus).message;
    if (typeof message === 'string' && message.trim().length > 0) return message;
  }
  return 'Internal Server Error';
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  const route = `${req.method} ${req.originalUrl.split('?')[0]}`;
  const statusCode = getStatusCode(error);
  const message = getMessage(error);

  logger.error(route, 'unhandled error', {
    statusCode,
    message,
    error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error
  });

  if (res.headersSent) return;
  res.status(statusCode).json({ error: message });
}

