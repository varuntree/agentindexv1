import path from 'node:path';
import process from 'node:process';

import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const app = express();

app.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send('<!doctype html><html><body><h1>ARI Control Center</h1></body></html>');
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

const port = Number(process.env.CONTROL_CENTER_PORT || 3001);
app.listen(port, () => {
  process.stdout.write(`Control Center listening on http://localhost:${port}\n`);
});

