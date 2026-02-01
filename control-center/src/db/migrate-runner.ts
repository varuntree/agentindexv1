import { db } from '@/db/database';

try {
  db.close();
  process.stdout.write('Migrations complete.\n');
} catch (error) {
  console.error('[migrate-runner]', { error });
  process.exitCode = 1;
}

