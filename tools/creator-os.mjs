#!/usr/bin/env node
/**
 * creator-os.mjs — one command that starts everything.
 *
 *   npm run creator:dev
 *
 * Starts the local backend (with the job worker in-process) and the Vite dev server, waits
 * for both, and prints the one URL a person needs. Four terminals is not an interface.
 *
 * Everything binds 127.0.0.1. Vite proxies /api to the backend, so the browser sees a single
 * origin and the frontend never needs to know the backend port — or hold any credential.
 */

import { spawn } from 'node:child_process';
import { start } from '../src/youtube/server/index.mjs';
import { startWorker } from '../src/youtube/services/worker.mjs';
import { STATE_DIR } from '../src/youtube/config.mjs';
import { log } from '../src/youtube/server/logger.mjs';

const UI_PORT = Number(process.env.BFO_UI_PORT ?? 5173);

console.log('\n  Bill Finds Out — Creator OS\n');

await start();
startWorker();
console.log('  worker         running (in-process)');

const vite = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', '--config', 'app/vite.config.ts', '--port', String(UI_PORT), '--host', '127.0.0.1'],
  { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' },
);

let announced = false;
const announce = () => {
  if (announced) return;
  announced = true;
  console.log('');
  console.log('  ────────────────────────────────────────────');
  console.log(`  Creator OS:    http://127.0.0.1:${UI_PORT}`);
  console.log('  ────────────────────────────────────────────');
  console.log(`  logs           ${log.file}`);
  console.log(`  state          ${STATE_DIR}`);
  console.log('\n  Ctrl+C to stop.\n');
};

vite.stdout.on('data', (d) => {
  const s = d.toString();
  if (/ready in|Local:/i.test(s)) announce();
  if (process.env.BFO_VERBOSE) process.stdout.write(s);
});
vite.stderr.on('data', (d) => {
  const s = d.toString();
  // Vite writes its startup banner to stderr in some versions; only surface real problems.
  if (/error|failed/i.test(s)) process.stderr.write(s);
});

setTimeout(announce, 4000).unref();

const stop = () => { try { vite.kill(); } catch { /* already gone */ } process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
