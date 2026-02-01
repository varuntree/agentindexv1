const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

function main() {
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'ari.db');
  if (!fs.existsSync(dbPath)) {
    process.stderr.write(`Missing DB file: ${dbPath}\n`);
    process.exit(1);
  }
  process.stdout.write(`DB exists: ${dbPath}\n`);

  execSync('npm run db:migrate', { stdio: 'inherit' });

  const agenciesSchema = execSync(`sqlite3 ${dbPath} ".schema agencies"`, { encoding: 'utf8' });
  const agentsSchema = execSync(`sqlite3 ${dbPath} ".schema agents"`, { encoding: 'utf8' });
  const progressSchema = execSync(`sqlite3 ${dbPath} ".schema scrape_progress"`, { encoding: 'utf8' });

  if (!agenciesSchema.includes('CREATE TABLE')) throw new Error('Missing agencies table schema');
  if (!agentsSchema.includes('CREATE TABLE')) throw new Error('Missing agents table schema');
  if (!progressSchema.includes('CREATE TABLE')) throw new Error('Missing scrape_progress table schema');

  const count = Number(execSync(`sqlite3 ${dbPath} "SELECT COUNT(*) FROM scrape_progress"`, { encoding: 'utf8' }).trim());
  if (count !== 50) throw new Error(`Expected 50 suburbs in scrape_progress, got ${count}`);

  process.stdout.write('DB schema + seed verified.\n');
}

main();
