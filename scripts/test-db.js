const fs = require('node:fs');
const path = require('node:path');

function main() {
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'ari.db');
  if (!fs.existsSync(dbPath)) {
    process.stderr.write(`Missing DB file: ${dbPath}\n`);
    process.exit(1);
  }
  process.stdout.write(`DB exists: ${dbPath}\n`);
}

main();

