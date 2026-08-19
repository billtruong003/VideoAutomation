#!/usr/bin/env node
/**
 * validate-output.mjs — the final gate.
 *
 *   node tools/validate-output.mjs [out/why-casinos-have-no-clocks.mp4]
 *
 * Checks the delivered file against the platform spec and against the narration it was
 * built from. Every assertion is one the brief actually requires, so a pass here means
 * the deliverable is publishable, not merely that ffmpeg produced a file.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, statSync, openSync, readSync, closeSync } from 'node:fs';

const FILE = process.argv[2] ?? 'out/why-casinos-have-no-clocks.mp4';
const timing = JSON.parse(readFileSync('data/narration-timing.json', 'utf8'));

if (!existsSync(FILE)) {
  console.error(`MISSING: ${FILE}`);
  process.exit(1);
}

const probe = (args) => {
  const r = spawnSync('ffprobe', ['-v', 'error', ...args, '-of', 'json', FILE], {
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout);
};

const info = probe(['-show_format', '-show_streams']);
const v = info.streams.find((s) => s.codec_type === 'video');
const a = info.streams.find((s) => s.codec_type === 'audio');
const duration = parseFloat(info.format.duration);
const [num, den] = (v?.r_frame_rate ?? '0/1').split('/').map(Number);
const fps = num / den;

const checks = [];
const check = (label, pass, actual, expected) => checks.push({ label, pass, actual, expected });

check('video stream present', Boolean(v), v ? v.codec_name : 'none', 'h264');
check('codec is H.264', v?.codec_name === 'h264', v?.codec_name, 'h264');
check('pixel format 8-bit yuv420p', v?.pix_fmt === 'yuv420p', v?.pix_fmt, 'yuv420p');
check('width 1080', v?.width === 1080, v?.width, 1080);
check('height 1920', v?.height === 1920, v?.height, 1920);
check('aspect ratio 9:16', v && v.width / v.height === 9 / 16, v ? (v.width / v.height).toFixed(4) : '-', (9 / 16).toFixed(4));
check('frame rate 30', Math.abs(fps - 30) < 0.01, fps.toFixed(3), 30);
check('duration <= 60s', duration <= 60, `${duration.toFixed(3)}s`, '<= 60s');
check('duration covers narration', duration >= timing.duration, `${duration.toFixed(3)}s`, `>= ${timing.duration}s`);
check('audio stream present', Boolean(a), a ? a.codec_name : 'none', 'aac');
check('audio 48 kHz', a?.sample_rate === '48000', a?.sample_rate, '48000');
check('container is mp4', /mp4|mov/.test(info.format.format_name), info.format.format_name, 'mp4');

// faststart: the `moov` atom must precede `mdat`, or players buffer the whole file before
// showing frame one. Read the head and compare atom offsets rather than trusting a flag.
const head = Buffer.alloc(65536);
{
  const fd = openSync(FILE, 'r');
  readSync(fd, head, 0, head.length, 0);
  closeSync(fd);
}
const moovAt = head.indexOf('moov');
const mdatAt = head.indexOf('mdat');
const faststart = moovAt !== -1 && (mdatAt === -1 || moovAt < mdatAt);
check('faststart (moov before mdat)', faststart, faststart ? `moov@${moovAt}` : 'moov not in head', 'moov first');

// --- decoded frame count must match the composition, not just the container duration ---
const countRes = spawnSync(
  'ffprobe',
  ['-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'default=nw=1:nk=1', FILE],
  { encoding: 'utf8', maxBuffer: 1 << 26 },
);
const frames = parseInt(countRes.stdout.trim(), 10);
const expectedFrames = Math.round((timing.duration + 1.15) * 30);
check('decoded frame count', Math.abs(frames - expectedFrames) <= 1, frames, expectedFrames);

// --- audio health: no clipping, no dead tail ---
const statsRes = spawnSync(
  'ffmpeg',
  ['-hide_banner', '-nostdin', '-i', FILE, '-af', 'astats=measure_perchannel=none', '-f', 'null', '-'],
  { encoding: 'utf8', maxBuffer: 1 << 26 },
);
const log = `${statsRes.stdout || ''}${statsRes.stderr || ''}`;
const peak = parseFloat(/Peak level dB:\s*(-?[\d.]+)/.exec(log)?.[1] ?? '0');
check('no clipping', peak < -0.1, `${peak.toFixed(2)} dBFS`, '< -0.1 dBFS');

const lufsRes = spawnSync(
  'ffmpeg',
  ['-hide_banner', '-nostdin', '-i', FILE, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'],
  { encoding: 'utf8', maxBuffer: 1 << 26 },
);
const lufsLog = `${lufsRes.stdout || ''}${lufsRes.stderr || ''}`;
const lufs = parseFloat(/I:\s*(-?[\d.]+) LUFS/.exec(lufsLog)?.[1] ?? '0');
check('loudness in YouTube range', lufs > -20 && lufs < -11, `${lufs.toFixed(1)} LUFS`, '-20..-11 LUFS');

const sizeMb = statSync(FILE).size / 1e6;

// ---------------------------------------------------------------------------

console.log(`validating ${FILE}  (${sizeMb.toFixed(1)} MB)\n`);
let failed = 0;
for (const c of checks) {
  if (!c.pass) failed++;
  console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.label.padEnd(30)} ${String(c.actual).padStart(12)}   expected ${c.expected}`);
}

console.log('');
if (failed) {
  console.log(`${failed} CHECK(S) FAILED`);
  process.exit(1);
}
console.log('ALL CHECKS PASSED — deliverable is within the YouTube Shorts spec.');
