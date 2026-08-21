#!/usr/bin/env node
/**
 * render-chunked.mjs — render the long-form video in pieces, then join them.
 *
 *   node tools/mryolk/render-chunked.mjs [--chunk 2000] [--concurrency 2]
 *
 * ---------------------------------------------------------------- why this exists
 *
 * Four consecutive renders died the same way: `Compositor error: No frame found at position
 * ...`, at frames 3233, 16735, 17673 and 808. The evidence rules out most explanations:
 *
 *   - every one of those frames renders perfectly as a standalone still
 *   - re-rendering the surrounding range afterwards succeeds every time
 *   - the media is valid — the clip it blamed has 660 monotonic frames at a clean 30fps and
 *     ffmpeg seeks to the exact timestamp it claimed was missing
 *   - it is not simple exhaustion either: the fourth failure came at frame 808
 *
 * What is left is an intermittent 500 from the compositor's own frame endpoint under
 * concurrent load. It cannot be designed away from here, so it is absorbed instead.
 *
 * A single fourteen-minute render is the wrong unit of work against a flaky dependency: it
 * stakes forty minutes on nothing going wrong once, and when something does, all of it is
 * lost. The render is split into chunks in FRESH processes, each retried on its own, at half
 * the concurrency — fewer simultaneous frame requests, and a failure costs one chunk.
 *
 * ------------------------------------------------------------------- audio and joins
 *
 * Chunks are rendered MUTED and the audio is produced once, separately, in a single audio-only
 * pass. That is not an optimisation — it is what makes the joins safe. Encoding audio per
 * chunk gives every chunk its own encoder priming and padding, and concatenating those leaves
 * a small discontinuity at every boundary. On a narration track that would be eight audible
 * clicks. One continuous audio render cannot have a seam because it never had a boundary.
 *
 * The video chunks are joined by stream COPY, so the pixels in the final file are bit-identical
 * to what each chunk produced; nothing is re-encoded and nothing is re-compressed.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { FFMPEG, probeDuration } from '../ffbin.mjs';
import { DATA_DIR, VIDEO } from './config.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};

const CHUNK = flag('chunk', 2000);
/*
 * Two, not four. Every failure so far has been a 500 from the compositor's own frame endpoint,
 * at a different frame each time, none of them reproducible in isolation — four browser tabs
 * requesting decoded frames concurrently is simply more collisions than this machine's
 * compositor survives. Halving it costs wall-clock and buys a render that finishes.
 */
const CONCURRENCY = flag('concurrency', 2);
const RETRIES = 3;

const OUT = join('out', 'mryolk-why-the-world-runs-on-debt.mp4');
const WORK = join('out', '.mryolk-chunks');
const AUDIO = join(WORK, 'audio.wav');

const plan = JSON.parse(readFileSync(join(DATA_DIR, 'edit-plan.json'), 'utf8'));
const TOTAL = plan.composition.durationInFrames;

mkdirSync(WORK, { recursive: true });

const remotion = (extra, label) => {
  const started = Date.now();
  const r = spawnSync('npx', ['remotion', ...extra], {
    stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', shell: true, maxBuffer: 1 << 28,
  });
  const log = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const secs = ((Date.now() - started) / 1000).toFixed(0);
  return { ok: r.status === 0, log, secs, label };
};

/* ------------------------------------------------------------------- audio */

console.log('audio — one continuous pass, so the chunk joins cannot be heard');
if (existsSync(AUDIO) && statSync(AUDIO).size > 0) {
  console.log('  reusing existing audio render');
} else {
  /*
   * Retried like any other stage. An audio-only render still evaluates the whole composition,
   * which still asks the compositor for video frames — the first attempt at this stage died on
   * exactly the same intermittent failure as a visual chunk. Losing it costs the same as losing
   * a chunk, so it gets the same treatment.
   */
  let done = false;
  for (let attempt = 0; attempt <= RETRIES && !done; attempt++) {
    const a = remotion([
      'render', 'MrYolkDebt', AUDIO, '--codec=wav',
      `--concurrency=${CONCURRENCY}`, '--log=error',
    ], 'audio');
    if (a.ok && existsSync(AUDIO)) {
      console.log(`  ${(statSync(AUDIO).size / 1e6).toFixed(0)} MB in ${a.secs}s${attempt ? ` (attempt ${attempt + 1})` : ''}`);
      done = true;
    } else {
      console.warn(`  ${/No frame found at position \d+/.exec(a.log)?.[0] ?? 'render failed'} — retrying`);
      rmSync(AUDIO, { force: true });
    }
  }
  if (!done) {
    console.error('audio pass failed after every attempt');
    process.exit(1);
  }
}

/* ------------------------------------------------------------------ video */

const chunks = [];
for (let from = 0; from < TOTAL; from += CHUNK) {
  const to = Math.min(from + CHUNK - 1, TOTAL - 1);
  chunks.push({ index: chunks.length, from, to, file: join(WORK, `part-${String(chunks.length).padStart(2, '0')}.mp4`) });
}

console.log(`\nvideo — ${chunks.length} chunks of up to ${CHUNK} frames`);

const failures = [];
for (const c of chunks) {
  if (existsSync(c.file) && statSync(c.file).size > 0) {
    console.log(`  [${c.index + 1}/${chunks.length}] frames ${c.from}-${c.to}  reusing`);
    continue;
  }

  let done = false;
  for (let attempt = 0; attempt <= RETRIES && !done; attempt++) {
    const r = remotion([
      'render', 'MrYolkDebt', c.file,
      `--frames=${c.from}-${c.to}`,
      '--codec=h264', '--crf=18',
      `--concurrency=${CONCURRENCY}`,
      // Muted: the audio comes from the single pass above.
      '--muted',
      '--log=error',
    ], `chunk ${c.index}`);

    if (r.ok && existsSync(c.file)) {
      console.log(`  [${c.index + 1}/${chunks.length}] frames ${c.from}-${c.to}  ${r.secs}s${attempt ? ` (attempt ${attempt + 1})` : ''}`);
      done = true;
    } else {
      const why = /No frame found at position \d+/.exec(r.log)?.[0] ?? 'render failed';
      console.warn(`  [${c.index + 1}/${chunks.length}] frames ${c.from}-${c.to}  ${why} — retrying`);
      rmSync(c.file, { force: true });
    }
  }
  if (!done) failures.push(c);
}

if (failures.length) {
  console.error(`\n${failures.length} chunk(s) failed after ${RETRIES + 1} attempts:`);
  for (const f of failures) console.error(`  frames ${f.from}-${f.to}`);
  process.exit(1);
}

/* ------------------------------------------------------------------- join */

console.log('\njoining');
const list = join(WORK, 'concat.txt');
writeFileSync(list, chunks.map((c) => `file '${resolve(c.file).replace(/\\/g, '/')}'`).join('\n'), 'utf8');

const silent = join(WORK, 'video.mp4');
const ff = (a) => {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostdin', '-v', 'error', '-y', ...a], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || 'ffmpeg failed');
};

// Stream copy: the joined pixels are bit-identical to what each chunk produced.
ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);

/*
 * Mux the one continuous audio track onto the joined video. `-shortest` is deliberately NOT
 * used: the two are the same length by construction, and if they ever were not, silently
 * truncating to the shorter one would hide exactly the bug worth knowing about.
 */
ff([
  '-i', silent, '-i', AUDIO,
  '-map', '0:v:0', '-map', '1:a:0',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
  '-movflags', '+faststart',
  OUT,
]);

const videoSeconds = probeDuration(silent);
const audioSeconds = probeDuration(AUDIO);
const finalSeconds = probeDuration(OUT);
const expected = TOTAL / VIDEO.fps;

console.log(`\nvideo   ${videoSeconds.toFixed(2)}s`);
console.log(`audio   ${audioSeconds.toFixed(2)}s`);
console.log(`final   ${finalSeconds.toFixed(2)}s  (expected ${expected.toFixed(2)}s)`);
console.log(`size    ${(statSync(OUT).size / 1e6).toFixed(1)} MB`);
console.log(`→ ${OUT}`);

if (Math.abs(finalSeconds - expected) > 0.2) {
  console.error('\nfinal duration does not match the composition; not deleting chunks');
  process.exit(1);
}
