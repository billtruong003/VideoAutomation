#!/usr/bin/env node
/**
 * verify-sync.mjs — prove the remapped timings actually match the processed audio.
 *
 *   node tools/verify-sync.mjs
 *
 * Remapping is only trustworthy if it is checked against the delivered waveform rather
 * than against the arithmetic that produced it. This decodes voiceover-processed.wav,
 * finds real speech onsets from the energy envelope, and measures how far each phrase
 * start in narration-timing.json sits from the nearest onset. It also re-checks the
 * whole file for clipping, dead air, and head/tail padding.
 */

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const timing = JSON.parse(readFileSync('data/narration-timing.json', 'utf8'));
const WAV = 'public/audio/voiceover-processed.wav';
const SR = 16000;
const HOP = Math.round(SR * 0.01); // 10 ms

const pcm = (() => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-i', WAV,
    '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { maxBuffer: 1 << 29 });
  if (r.error) throw r.error;
  return r.stdout;
})();

const nFrames = Math.floor(pcm.length / 2 / HOP);
const db = new Float64Array(nFrames);
let peakSample = 0;
for (let f = 0; f < nFrames; f++) {
  let s = 0;
  for (let j = 0; j < HOP; j++) {
    const v = pcm.readInt16LE((f * HOP + j) * 2);
    s += v * v;
    const a = Math.abs(v);
    if (a > peakSample) peakSample = a;
  }
  db[f] = 20 * Math.log10(Math.sqrt(s / HOP) / 32768 + 1e-12);
}

const SPEECH_DB = -38;
const voiced = Array.from(db, (d) => d > SPEECH_DB);

/** Frame indices where speech starts after >=60 ms of quiet. */
const onsets = [];
for (let f = 1; f < nFrames; f++) {
  if (voiced[f] && !voiced[f - 1]) {
    let quiet = 0;
    for (let k = f - 1; k >= 0 && !voiced[k]; k--) quiet++;
    if (quiet >= 6 || f < 6) onsets.push(f * HOP / SR);
  }
}

console.log(`processed audio: ${(pcm.length / 2 / SR).toFixed(3)}s, ${onsets.length} speech onsets detected\n`);

let worst = 0;
console.log('phrase                 expected   nearest onset   delta');
for (const p of timing.phrases) {
  let best = Infinity, at = null;
  for (const o of onsets) {
    const d = Math.abs(o - p.start);
    if (d < best) { best = d; at = o; }
  }
  worst = Math.max(worst, best);
  const flag = best > 0.12 ? '  <-- CHECK' : '';
  console.log(`  ${p.id.padEnd(22)} ${p.start.toFixed(3).padStart(7)}   ${at.toFixed(3).padStart(7)}   ${(at - p.start >= 0 ? '+' : '') + (at - p.start).toFixed(3)}${flag}`);
}

// ---- global health ----
const leadQuiet = (voiced.indexOf(true)) * HOP / SR;
let tailIdx = nFrames - 1;
while (tailIdx > 0 && !voiced[tailIdx]) tailIdx--;
const tailQuiet = (nFrames - 1 - tailIdx) * HOP / SR;

let longestGap = 0, gapAt = 0, run = 0;
for (let f = 0; f < nFrames; f++) {
  if (!voiced[f]) { run++; if (run > longestGap) { longestGap = run; gapAt = (f - run) * HOP / SR; } }
  else run = 0;
}
const peakDbfs = 20 * Math.log10(peakSample / 32768);

console.log('');
console.log(`  worst phrase drift : ${worst.toFixed(3)}s ${worst <= 0.12 ? 'OK' : 'TOO HIGH'}`);
console.log(`  leading silence    : ${leadQuiet.toFixed(3)}s ${leadQuiet < 0.25 ? 'OK' : 'TOO LONG'}`);
console.log(`  trailing silence   : ${tailQuiet.toFixed(3)}s ${tailQuiet < 0.40 ? 'OK' : 'TOO LONG'}`);
console.log(`  longest internal gap: ${(longestGap * 0.01).toFixed(3)}s at ${gapAt.toFixed(2)}s ${longestGap * 0.01 < 0.60 ? 'OK' : 'TOO LONG'}`);
console.log(`  peak               : ${peakDbfs.toFixed(2)} dBFS ${peakDbfs < -0.1 ? 'OK (no clipping)' : 'CLIPPING'}`);

const fail = worst > 0.12 || peakDbfs >= -0.1 || leadQuiet >= 0.25 || tailQuiet >= 0.4;
console.log('');
console.log(fail ? 'SYNC VERIFICATION FAILED' : 'SYNC VERIFICATION PASSED');
process.exit(fail ? 1 : 0);
