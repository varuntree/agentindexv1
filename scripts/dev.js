const { spawn } = require('node:child_process');

function prefixStream(stream, prefix) {
  let buffered = '';
  stream.on('data', (chunk) => {
    buffered += chunk.toString('utf8');
    const lines = buffered.split('\n');
    buffered = lines.pop() ?? '';
    for (const line of lines) {
      if (line.length === 0) continue;
      process.stdout.write(`${prefix} ${line}\n`);
    }
  });
  stream.on('end', () => {
    if (buffered.length > 0) {
      process.stdout.write(`${prefix} ${buffered}\n`);
    }
  });
}

function runProcess(label, args) {
  const child = spawn('npm', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  prefixStream(child.stdout, `[${label}]`);
  prefixStream(child.stderr, `[${label}]`);

  return child;
}

const control = runProcess('control-center', ['run', 'dev', '--prefix', 'control-center']);
const seo = runProcess('seo-site', ['run', 'dev', '--prefix', 'seo-site']);

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

