import path from 'node:path';
import process from 'node:process';

import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { logger } from '@/lib/logger';
import { createServer } from '@/server';

const port = Number(process.env.CONTROL_CENTER_PORT || 3001);
const app = createServer();

app.listen(port, () => {
  logger.info('server', `listening on http://localhost:${port}`, { port });
});
