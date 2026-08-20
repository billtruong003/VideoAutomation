#!/usr/bin/env node
/**
 * creator-os-shots.mjs — capture QA screenshots of every primary Creator OS screen.
 *
 *   node tools/creator-os-shots.mjs
 *
 * Uses the installed Chrome in headless mode. `--virtual-time-budget` lets the SPA mount,
 * fetch and settle before the frame is taken, which is the difference between screenshotting
 * the app and screenshotting a loading spinner.
 *
 * Screenshots go to qa/creator-os/. They contain no credential material: the UI never renders
 * a token, and the pages captured show scope NAMES at most.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CHROME = [
  process.env.BFO_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean).find((p) => existsSync(p));

if (!CHROME) {
  console.error('Chrome not found. Set BFO_BROWSER to chrome.exe.');
  process.exit(1);
}

const BASE = process.env.BFO_UI ?? 'http://127.0.0.1:5173';
const OUT = 'qa/creator-os';
mkdirSync(OUT, { recursive: true });

const SHOTS = [
  ['dashboard', '/#/dashboard', 1400],
  ['videos', '/#/videos', 1200],
  ['video-detail-production', '/#/videos/airplane-window-hole', 2000],
  ['metadata-studio', '/#/metadata/airplane-window-hole', 1400],
  ['publish-studio', '/#/publish/airplane-window-hole', 1800],
  ['queue', '/#/queue', 1000],
  ['analytics-empty', '/#/analytics', 1100],
  ['retention-empty', '/#/retention/airplane-window-hole', 1800],
  ['api-health', '/#/health', 1600],
  ['settings', '/#/settings', 1400],
];

const size = process.argv.includes('--narrow') ? '1024,1400' : '1600,1000';
const suffix = process.argv.includes('--narrow') ? '-narrow' : '';

rmSync(join(OUT, 'test.png'), { force: true });

for (const [name, path, height] of SHOTS) {
  // Chrome's --screenshot silently no-ops on a relative path.
  const file = resolve(join(OUT, `${name}${suffix}.png`));
  try {
    execFileSync(CHROME, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--window-size=${size.split(',')[0]},${height}`,
      '--virtual-time-budget=6000',
      '--force-device-scale-factor=1',
      `--screenshot=${file}`,
      `${BASE}${path}`,
    ], { stdio: ['ignore', 'ignore', 'pipe'], timeout: 60_000 });
    console.log(`  ${file}`);
  } catch (e) {
    console.error(`  FAILED ${name}: ${String(e.message).slice(0, 120)}`);
  }
}

console.log(`\n${SHOTS.length} screens captured to ${OUT}`);
