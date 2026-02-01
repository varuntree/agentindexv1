const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '', 'utf8');
}

function main() {
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'ari.db');
  ensureDir(path.dirname(dbPath));
  ensureFile(dbPath);
  process.stdout.write(`DB ready: ${dbPath}\n`);
  process.stdout.write('No migrations applied (Step 2 will add schema).\n');
}

main();

