const path = require('node:path');
const { spawnSync } = require('node:child_process');

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit', env: process.env });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}`);
  }
}

function main() {
  const root = process.cwd();
  run('npm', ['run', 'db:migrate'], path.join(root, 'control-center'));
}

main();
