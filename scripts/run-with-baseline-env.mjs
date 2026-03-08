import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const command = process.argv.slice(2).join(' ').trim();
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const preloadScript = path.join(scriptDir, 'suppress-baseline-warning.cjs').replaceAll('\\', '/');
const existingNodeOptions = process.env.NODE_OPTIONS?.trim();
const preloadOption = `--require=${preloadScript}`;
const nodeOptions = existingNodeOptions ? `${preloadOption} ${existingNodeOptions}` : preloadOption;

if (!command) {
  console.error('Missing command.');
  process.exit(1);
}

const child = spawn(command, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA: 'true',
    BROWSERSLIST_IGNORE_OLD_DATA: 'true',
    NODE_OPTIONS: nodeOptions,
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
