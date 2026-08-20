#!/usr/bin/env node
/**
 * verify-sync.mjs — prove the remapped timings actually match the processed audio.
 *
 *   node tools/verify-sync.mjs [--episode <slug>]     (default: every episode in the batch)
 *
 * Remapping is only trustworthy if it is checked against the DELIVERED waveform rather than
 * against the arithmetic that produced it. This decodes each episode's processed WAV, finds
 * real speech onsets from the energy envelope, and measures how far each phrase start in
 * narration-timing.json sits from the nearest onset. It also re-checks the whole file for
 * clipping, dead air and head/tail padding.
 *
 * For this batch the check earns its keep twice over: the word timings were ESTIMATED from
 * SRT cues rather than supplied by the TTS, so this is the gate that catches an estimate
 * that drifted. Scene starts are the estimate's weakest points — they are the words most
 * likely to sit right after a pause — which makes them the right thing to measure.
 *
 * Passing here is what LOCKS an episode's audio.
 */

import { spawnSync } from 'node:child_process';
import { FFMPEG } from './ffbin.mjs';
import { paths, readJson, selection } from './episode.mjs';

const SR = 16000;
const HOP = Math.round(SR * 0.01); // 10 ms
const SPEECH_DB = -38;

/** Thresholds. Drift is the loose one here by design — see the note about estimates above. */
const LIMITS = { drift: 0.16, lead: 0.25, tail: 0.45, gap: 0.75, peak: -0.1 };

const { slugs } = selection();
const results = [];

for (const slug of slugs) results.push(check(slug));

console.log('');
console.log('episode                  drift    lead    tail     gap     peak   verdict');
for (const r of results) {
  console.log(
    `  ${r.slug.padEnd(22)} ${r.worst.toFixed(3).padStart(5)}  ${r.lead.toFixed(3).padStart(5)}  ` +
    `${r.tail.toFixed(3).padStart(5)}  ${r.gap.toFixed(3).padStart(5)}  ` +
    `${r.peak.toFixed(1).padStart(6)}   ${r.ok ? 'LOCKED' : 'FAILED'}`,
  );
}

const failed = results.filter((r) => !r.ok);
console.log('');
if (failed.length) {
  for (const r of failed) console.log(`${r.slug}: ${r.reasons.join('; ')}`);
  console.log(`\nSYNC VERIFICATION FAILED for ${failed.length} of ${results.length} episodes`);
  process.exit(1);
}
console.log(`SYNC VERIFICATION PASSED — ${results.length} episodes locked`);

// ---------------------------------------------------------------------------

function check(slug) {
  const P = paths(slug);
  const timing = readJson(P.timing);

  const pcm = (() => {
    const r = spawnSync(FFMPEG, ['-hide_banner', '-nostdin', '-i', P.wav,
      '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { maxBuffer: 1 << 29 });
    if (r.error) throw r.error;
    return r.stdout;
  })();

  const nFrames = Math.floor(pcm.length / 2 / HOP);
  const voiced = new Uint8Array(nFrames);
  let peakSample = 0;
  for (let f = 0; f < nFrames; f++) {
    let s = 0;
    for (let j = 0; j < HOP; j++) {
      const v = pcm.readInt16LE((f * HOP + j) * 2);
      s += v * v;
      const a = Math.abs(v);
      if (a > peakSample) peakSample = a;
    }
    voiced[f] = 20 * Math.log10(Math.sqrt(s / HOP) / 32768 + 1e-12) > SPEECH_DB ? 1 : 0;
  }

  /** Frame times where speech starts after >= 60 ms of quiet. */
  const onsets = [];
  for (let f = 1; f < nFrames; f++) {
    if (voiced[f] && !voiced[f - 1]) {
      let quiet = 0;
      for (let k = f - 1; k >= 0 && !voiced[k]; k--) quiet++;
      if (quiet >= 6 || f < 6) onsets.push((f * HOP) / SR);
    }
  }

  let worst = 0;
  let worstId = null;
  for (const p of timing.phrases) {
    let best = Infinity;
    for (const o of onsets) best = Math.min(best, Math.abs(o - p.start));
    if (best > worst) { worst = best; worstId = p.id; }
  }

  const firstVoiced = voiced.indexOf(1);
  const lead = (firstVoiced < 0 ? 0 : firstVoiced) * HOP / SR;
  let tailIdx = nFrames - 1;
  while (tailIdx > 0 && !voiced[tailIdx]) tailIdx--;
  const tail = ((nFrames - 1 - tailIdx) * HOP) / SR;

  let gapFrames = 0;
  let run = 0;
  for (let f = 0; f <= tailIdx; f++) {
    if (!voiced[f]) { run++; if (run > gapFrames) gapFrames = run; } else run = 0;
  }
  const gap = gapFrames * 0.01;
  const peak = 20 * Math.log10(peakSample / 32768);

  const reasons = [];
  if (worst > LIMITS.drift) reasons.push(`phrase "${worstId}" drifts ${worst.toFixed(3)}s from the nearest onset`);
  if (lead >= LIMITS.lead) reasons.push(`${lead.toFixed(3)}s of leading silence`);
  if (tail >= LIMITS.tail) reasons.push(`${tail.toFixed(3)}s of trailing silence`);
  if (gap >= LIMITS.gap) reasons.push(`${gap.toFixed(3)}s internal dead air`);
  if (peak >= LIMITS.peak) reasons.push(`peak ${peak.toFixed(2)} dBFS is clipping`);

  return { slug, worst, worstId, lead, tail, gap, peak, ok: reasons.length === 0, reasons };
}
