#!/usr/bin/env node
/**
 * motion-qa.mjs — find the parts of the video that aren't moving.
 *
 *   node tools/motion-qa.mjs [preview/preview.mp4]
 *
 * The "no PowerPoint" rule is easy to state and hard to check by eye, because a static
 * stretch feels fine while you are scrubbing and dead when you actually watch. This
 * decodes the render at low resolution and measures mean absolute pixel change between
 * consecutive frames, then reports the quietest windows against the storyboard so a dead
 * stretch can be traced to the scene that owns it.
 *
 * It measures MOVEMENT, not quality — a high score from a pointless zoom still counts.
 * Read it alongside the storyboard beats, not instead of them.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { FFMPEG, FFPROBE } from './ffbin.mjs';

const FILE = process.argv[2] ?? 'preview/preview.mp4';
const STORY = process.argv[3] ?? 'data/storyboard.json';
const storyboard = JSON.parse(readFileSync(STORY, 'utf8'));
const FPS = storyboard.fps;

// decode to a tiny greyscale stream — plenty for a difference metric, and fast
const W = 64, H = 114;
const res = spawnSync(
  FFMPEG,
  ['-hide_banner', '-nostdin', '-i', FILE, '-vf', `scale=${W}:${H}`, '-pix_fmt', 'gray', '-f', 'rawvideo', '-'],
  { maxBuffer: 1 << 29 },
);
if (res.error) throw res.error;
const raw = res.stdout;
const frameSize = W * H;
const nFrames = Math.floor(raw.length / frameSize);
if (nFrames < 2) throw new Error(`decoded only ${nFrames} frames from ${FILE}`);

/** Mean absolute difference from the previous frame, 0..255, one entry per frame. */
const diff = new Float64Array(nFrames);
for (let f = 1; f < nFrames; f++) {
  const a = f * frameSize;
  const b = (f - 1) * frameSize;
  let sum = 0;
  for (let i = 0; i < frameSize; i++) sum += Math.abs(raw[a + i] - raw[b + i]);
  diff[f] = sum / frameSize;
}

const sceneAt = (t) =>
  storyboard.scenes.find((s) => t >= s.start && t < s.end)?.scene ?? '(tail)';

// rolling 1-second windows
const WIN = FPS;
const windows = [];
for (let f = 1; f + WIN < nFrames; f += Math.round(FPS / 3)) {
  let sum = 0;
  for (let k = 0; k < WIN; k++) sum += diff[f + k];
  windows.push({ t: f / FPS, score: sum / WIN });
}

const scores = windows.map((w) => w.score).sort((a, b) => a - b);
const median = scores[Math.floor(scores.length / 2)];
const STATIC = median * 0.22; // a window this far below typical reads as a held frame

console.log(`${FILE}: ${nFrames} frames, ${(nFrames / FPS).toFixed(2)}s`);
console.log(`median 1s motion score: ${median.toFixed(3)}   static threshold: ${STATIC.toFixed(3)}\n`);

const dead = windows.filter((w) => w.score < STATIC);
if (dead.length === 0) {
  console.log('No static windows. Every second of the video contains visible change.');
} else {
  // merge adjacent dead windows into runs
  const runs = [];
  for (const w of dead) {
    const last = runs[runs.length - 1];
    if (last && w.t - last.end < 0.7) last.end = w.t + 1;
    else runs.push({ start: w.t, end: w.t + 1, score: w.score });
  }
  console.log('STATIC STRETCHES:');
  for (const r of runs) {
    console.log(`  ${r.start.toFixed(2)}s -> ${r.end.toFixed(2)}s  (${(r.end - r.start).toFixed(2)}s)  scene: ${sceneAt(r.start)}  score ${r.score.toFixed(3)}`);
  }
}

console.log('\nper-scene motion (mean score):');
for (const s of storyboard.scenes) {
  const f0 = Math.round(s.start * FPS) + 1;
  const f1 = Math.min(nFrames, Math.round(s.end * FPS));
  let sum = 0, n = 0;
  for (let f = f0; f < f1; f++) { sum += diff[f]; n++; }
  const mean = n ? sum / n : 0;
  const bar = '#'.repeat(Math.max(1, Math.round(mean / median * 14)));
  console.log(`  ${s.scene.padEnd(22)} ${mean.toFixed(3).padStart(7)}  ${bar}`);
}
