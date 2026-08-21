#!/usr/bin/env node
/**
 * build-narration.mjs — three raw takes in, one narration master out.
 *
 *   node tools/mryolk/build-narration.mjs
 *
 * The edit is cut against ONE file. Editing against three raw takes means every timestamp
 * carries a part number and an offset, and the first time a part is re-processed every one of
 * them is wrong. So the parts are conditioned identically, joined once, and everything
 * downstream — transcription, subtitles, beats, the composition length — is expressed against
 * the single master that results.
 *
 * ------------------------------------------------------------------- what was measured
 *
 * `analyse-audio.mjs` reported, for all three takes: zero clipped samples, DC offset under
 * 0.0003, loudness range 2.7-4 LU, and no silence longer than 1.06s. That is clean, evenly
 * delivered narration with no dead air.
 *
 * Two things follow, and both are decisions NOT to process:
 *
 *   NO NOISE REDUCTION. There is no measurable noise to reduce. `afftdn` on clean speech is
 *   not free — it costs sibilance and the leading edge of plosives — so running it here would
 *   pay real quality for an imaginary problem.
 *
 *   NO AGGRESSIVE SILENCE REMOVAL. There is no dead air. Every pause in these files is a
 *   sentence boundary a listener uses to keep up, and this is thirteen minutes of economics,
 *   not a Short. Pauses are TIGHTENED, not removed: anything past `maxPause` is pulled back
 *   toward `pauseTarget`, and everything shorter is left exactly as recorded.
 *
 * The one thing that did need fixing is the level drift — the takes land at -22.3, -24.0 and
 * -25.8 LUFS, so joining them raw would make the video quietly fade over its own runtime.
 * Each part is normalised independently BEFORE the join, which removes the drift at the
 * source instead of trying to ride it afterwards.
 *
 * Speed is 1.08x. The delivered rate measured 159.5 wpm, which is already a comfortable
 * explainer pace rather than a slow one; 1.08 lifts it to roughly 175 wpm — energetic, still
 * unhurried. The 1.3x reflex that suits a 40-second Short would put articulation past 230 wpm
 * and make this exhausting somewhere around minute four.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { FFMPEG } from '../ffbin.mjs';
import { analyse } from './analyse-audio.mjs';
import { AUDIO_DIR, DATA_DIR, NARRATION_PARTS, SOURCE_DIR } from './config.mjs';

/** Silence inserted between parts, so a section change sounds deliberate rather than spliced. */
const PART_GAP_SECONDS = 0.42;

const SETTINGS = {
  tempo: 1.08,
  maxPause: 0.38,
  pauseTarget: 0.26,
  pauseSlope: 0.2,
  pauseCap: 0.32,
  head: 0.04,
  tail: 0.2,
  lufs: -16,
  tp: -1.5,
  lra: 7,
  minSilence: 0.12,
  noiseDb: -40,
};

const MASTER = join(AUDIO_DIR, 'narration-master.wav');

const ff = (args) => execFileSync(FFMPEG, ['-hide_banner', '-nostdin', '-v', 'error', ...args], {
  encoding: 'utf8', maxBuffer: 1 << 28,
});

function main() {
  mkdirSync(AUDIO_DIR, { recursive: true });
  mkdirSync(DATA_DIR, { recursive: true });

  const report = { settings: SETTINGS, partGapSeconds: PART_GAP_SECONDS, parts: [], master: null };
  const processed = [];

  for (const part of NARRATION_PARTS) {
    const src = join(SOURCE_DIR, part);
    const name = part.replace(/\.mp3$/i, '').toLowerCase();
    const out = join(AUDIO_DIR, `part-${name}.wav`);

    console.log(`\n=== ${part} ===`);
    const before = analyse(src);

    execFileSync(process.execPath, [
      join('tools', 'process-voiceover.mjs'), src, out,
      ...Object.entries(SETTINGS).flatMap(([k, v]) => [`--${k}`, String(v)]),
    ], { stdio: 'inherit' });

    const after = analyse(out);
    report.parts.push({ part, source: src, processed: out, before, after });
    processed.push(out);
  }

  /*
   * Join through the concat DEMUXER on identical PCM WAVs rather than through a filter graph.
   * Every input is already 48 kHz mono s16 by construction, so there is nothing to convert,
   * and a demuxer concat is a byte-level append — it cannot introduce the sample-rate
   * conversion or the boundary ramp that a re-encoding join can.
   */
  const gap = join(AUDIO_DIR, '.part-gap.wav');
  ff(['-y', '-f', 'lavfi', '-i', `anullsrc=r=48000:cl=mono:d=${PART_GAP_SECONDS}`,
    '-c:a', 'pcm_s16le', gap]);

  const listPath = join(AUDIO_DIR, '.concat.txt');
  const items = [];
  processed.forEach((p, i) => {
    if (i > 0) items.push(gap);
    items.push(p);
  });
  // Absolute paths: the concat demuxer resolves relative entries against the LIST's directory,
  // not the working directory, so repo-relative paths would be looked up inside the audio folder.
  writeFileSync(listPath, items.map((p) => `file '${resolve(p).replace(/\\/g, '/')}'`).join('\n'), 'utf8');

  ff(['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', MASTER]);
  rmSync(listPath); rmSync(gap);

  const master = analyse(MASTER);
  const rawTotal = report.parts.reduce((a, p) => a + p.before.duration, 0);

  report.master = {
    file: MASTER,
    ...master,
    rawTotalSeconds: Number(rawTotal.toFixed(2)),
    processedSeconds: Number(master.duration.toFixed(2)),
    reductionPercent: Number((100 * (1 - master.duration / rawTotal)).toFixed(2)),
  };

  writeFileSync(join(DATA_DIR, 'audio-report.json'), `${JSON.stringify(report, null, 2)}\n`);

  console.log('\n================ NARRATION MASTER ================');
  console.log(`raw       ${rawTotal.toFixed(2)}s  (${fmt(rawTotal)})`);
  console.log(`processed ${master.duration.toFixed(2)}s  (${fmt(master.duration)})`);
  console.log(`reduced   ${report.master.reductionPercent}%`);
  console.log(`loudness  ${master.integratedLufs} LUFS   true peak ${master.truePeakDb} dBTP   LRA ${master.lra}`);
  console.log(`clipping  ${master.clippedSamples} samples`);
  console.log(`silence   ${master.silence.totalSeconds}s (${(master.silence.fractionOfFile * 100).toFixed(1)}%), longest ${master.silence.longest}s`);
  console.log(`file      ${MASTER}`);
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

if (!existsSync(join('tools', 'process-voiceover.mjs'))) {
  throw new Error('run from the repository root');
}
main();
