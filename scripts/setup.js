const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '', 'utf8');
}

function copyIfMissing(fromPath, toPath) {
  if (fs.existsSync(toPath)) return;
  fs.copyFileSync(fromPath, toPath);
}

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit', env: process.env });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}`);
  }
}

function main() {
  const root = process.cwd();
  const envExample = path.join(root, '.env.example');
  const envFile = path.join(root, '.env');

  if (!fs.existsSync(envExample)) {
    throw new Error('.env.example missing at repo root');
  }

  copyIfMissing(envExample, envFile);

  const dataDir = path.join(root, 'data');
  ensureDir(dataDir);
  ensureFile(path.join(dataDir, '.gitkeep'));

  // Create empty DB file early (schema comes in Step 2)
  const dbPath = process.env.DATABASE_PATH || path.join(root, 'data', 'ari.db');
  ensureDir(path.dirname(dbPath));
  ensureFile(dbPath);

  run('npm', ['install'], path.join(root, 'control-center'));
  run('npm', ['install'], path.join(root, 'seo-site'));

  process.stdout.write('Setup complete.\n');
}

main();

