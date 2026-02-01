const { spawn } = require('node:child_process');

function runProcess(args) {
  const child = spawn('npm', args, {
    stdio: 'inherit',
    env: process.env,
  });

  return child;
}

const control = runProcess(['run', 'dev', '--prefix', 'control-center']);
const seo = runProcess(['run', 'dev', '--prefix', 'seo-site']);

function shutdown(signal) {
  if (!control.killed) control.kill(signal);
  if (!seo.killed) seo.kill(signal);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

let exited = false;
function onExit(code) {
  if (exited) return;
  exited = true;
  shutdown('SIGTERM');
  process.exit(code ?? 1);
}

control.on('exit', (code) => onExit(code));
seo.on('exit', (code) => onExit(code));
