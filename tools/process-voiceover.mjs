#!/usr/bin/env node
/**
 * process-voiceover.mjs — reusable narration conditioning tool for doodle-explainer episodes.
 *
 *   node tools/process-voiceover.mjs <input-audio> <output.wav> [options]
 *
 * Pipeline (in order):
 *   1. decode to mono 48 kHz PCM (analysis-friendly, no lossy re-encode in the chain)
 *   2. detect silence with ffmpeg `silencedetect`
 *   3. build a deterministic KEEP-PLAN:
 *        - leading silence  -> trimmed to `--head` seconds
 *        - trailing silence -> trimmed to `--tail` seconds
 *        - internal pauses longer than `--maxPause` -> shortened toward `--pauseTarget`
 *          (real room tone from BOTH ends of the pause is kept, the middle is dropped,
 *           so consonant decay + pre-onset breath survive and joins are silence-to-silence)
 *        - pauses at or under `--maxPause` are left completely untouched (micro-pauses are speech)
 *   4. apply the plan by splicing raw PCM sample-accurately (NOT `aselect`, which snaps
 *      cut boundaries to codec frames and desynchronises the map)
 *   5. speed up with `atempo` (WSOLA — pitch preserved, no resampling)
 *   6. two-pass EBU R128 `loudnorm` (linear gain, no pumping) + true-peak ceiling
 *   7. emit the processed WAV *and* a piecewise-linear TIME MAP so any timestamp
 *      expressed against the raw file can be remapped exactly onto the processed file.
 *
 * The time map is the whole point: silence removal is non-linear, so you can NOT simply
 * divide raw timestamps by the tempo factor. Every downstream timing artifact (captions,
 * narration timing, storyboard) is derived from this map.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const DEFAULTS = {
  tempo: 1.12,        // voice speed-up factor (pitch preserved)
  noiseDb: -40,       // silencedetect noise floor
  minSilence: 0.12,   // shortest span silencedetect will report
  maxPause: 0.30,     // internal pauses longer than this get shortened
  pauseTarget: 0.20,  // ...toward this length
  pauseSlope: 0.20,   // ...plus this fraction of the excess (longer pause -> slightly longer keep)
  pauseCap: 0.30,     // ...never keeping more than this
  head: 0.04,         // leading silence kept
  tail: 0.28,         // trailing silence kept
  lufs: -14,          // loudnorm integrated target
  tp: -1.5,           // loudnorm true-peak ceiling
  lra: 11,
  sampleRate: 48000,
};

function parseArgs(argv) {
  const positional = [];
  const opts = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (!(key in DEFAULTS)) throw new Error(`Unknown option --${key}`);
      opts[key] = Number(argv[++i]);
      if (Number.isNaN(opts[key])) throw new Error(`Option --${key} needs a number`);
    } else {
      positional.push(a);
    }
  }
  return { positional, opts };
}

const { positional, opts } = parseArgs(process.argv.slice(2));
if (positional.length < 2) {
  console.error('usage: node tools/process-voiceover.mjs <input> <output.wav> [--tempo 1.12] [--maxPause 0.30] ...');
  process.exit(1);
}
const INPUT = resolve(positional[0]);
const OUTPUT = resolve(positional[1]);
const MAP_PATH = OUTPUT.replace(/\.wav$/i, '') + '.timemap.json';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const run = (bin, args) =>
  execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 });

// ffmpeg writes its logs to stderr and exits 0; capture both streams.
function ffmpeg(args) {
  try {
    return execFileSync('ffmpeg', ['-hide_banner', '-nostdin', ...args], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26,
    });
  } catch (e) {
    const log = `${e.stdout || ''}${e.stderr || ''}`;
    throw new Error(`ffmpeg failed:\n${log.split('\n').slice(-25).join('\n')}`);
  }
}
/**
 * Analysis filters (silencedetect, loudnorm, astats) report on STDERR, and
 * execFileSync only hands back stdout — so these runs go through spawnSync.
 */
function ffmpegStderr(args) {
  const res = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', ...args], {
    encoding: 'utf8', maxBuffer: 1 << 26,
  });
  if (res.error) throw res.error;
  return `${res.stdout || ''}${res.stderr || ''}`;
}

function probeDuration(path) {
  const out = run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', path,
  ]);
  return parseFloat(out.trim());
}

const r3 = (n) => Math.round(n * 1000) / 1000;

// ---------------------------------------------------------------------------
// 1. decode to a clean analysis/work WAV
// ---------------------------------------------------------------------------

if (!existsSync(INPUT)) throw new Error(`Input not found: ${INPUT}`);
mkdirSync(dirname(OUTPUT), { recursive: true });

const TMP = OUTPUT.replace(/\.wav$/i, '') + '.__work.wav';
const TMP2 = OUTPUT.replace(/\.wav$/i, '') + '.__cut.wav';

console.log(`[1/7] decoding ${INPUT}`);
ffmpeg(['-y', '-i', INPUT, '-ac', '1', '-ar', String(opts.sampleRate), '-c:a', 'pcm_s16le', TMP]);
const rawDuration = probeDuration(TMP);
console.log(`      raw duration: ${rawDuration.toFixed(3)}s`);

// ---------------------------------------------------------------------------
// 2. silence detection
// ---------------------------------------------------------------------------

console.log(`[2/7] detecting silence (noise=${opts.noiseDb}dB, d=${opts.minSilence}s)`);
let detectLog;
try {
  detectLog = ffmpegStderr([
    '-i', TMP,
    '-af', `silencedetect=noise=${opts.noiseDb}dB:d=${opts.minSilence}`,
    '-f', 'null', '-',
  ]);
} catch (e) {
  detectLog = `${e.stdout || ''}${e.stderr || ''}`;
}

const silences = [];
{
  let pendingStart = null;
  const re = /silence_(start|end):\s*(-?[\d.]+)/g;
  let m;
  while ((m = re.exec(detectLog)) !== null) {
    if (m[1] === 'start') pendingStart = Math.max(0, parseFloat(m[2]));
    else if (pendingStart !== null) {
      silences.push({ start: pendingStart, end: Math.min(rawDuration, parseFloat(m[2])) });
      pendingStart = null;
    }
  }
  if (pendingStart !== null) silences.push({ start: pendingStart, end: rawDuration });
}
silences.sort((a, b) => a.start - b.start);
console.log(`      ${silences.length} silence spans found`);

// ---------------------------------------------------------------------------
// 3. keep-plan
// ---------------------------------------------------------------------------

console.log('[3/7] building keep-plan');

/** Regions of the raw timeline to DROP. */
const drops = [];
const decisions = [];

for (const s of silences) {
  const dur = s.end - s.start;
  const isLeading = s.start <= 0.02;
  const isTrailing = s.end >= rawDuration - 0.02;

  if (isLeading) {
    if (dur > opts.head) {
      drops.push({ start: s.start, end: s.end - opts.head });
      decisions.push({ kind: 'leading', raw: r3(dur), kept: r3(opts.head), removed: r3(dur - opts.head) });
    }
    continue;
  }
  if (isTrailing) {
    if (dur > opts.tail) {
      drops.push({ start: s.start + opts.tail, end: s.end });
      decisions.push({ kind: 'trailing', raw: r3(dur), kept: r3(opts.tail), removed: r3(dur - opts.tail) });
    }
    continue;
  }
  if (dur <= opts.maxPause) {
    // micro-pause / punctuation beat — speech needs these, leave alone
    decisions.push({ kind: 'kept-intact', at: r3(s.start), raw: r3(dur), kept: r3(dur), removed: 0 });
    continue;
  }
  // shorten, keeping real room tone from both ends of the pause
  const keep = Math.min(dur, Math.min(opts.pauseCap, opts.pauseTarget + (dur - opts.maxPause) * opts.pauseSlope));
  const half = keep / 2;
  drops.push({ start: s.start + half, end: s.end - half });
  decisions.push({ kind: 'shortened', at: r3(s.start), raw: r3(dur), kept: r3(keep), removed: r3(dur - keep) });
}

// invert drops -> keeps
const keeps = [];
{
  let cursor = 0;
  for (const d of drops.sort((a, b) => a.start - b.start)) {
    if (d.start > cursor) keeps.push({ start: cursor, end: d.start });
    cursor = Math.max(cursor, d.end);
  }
  if (cursor < rawDuration) keeps.push({ start: cursor, end: rawDuration });
}
const removedTotal = drops.reduce((a, d) => a + (d.end - d.start), 0);
console.log(`      removing ${removedTotal.toFixed(3)}s across ${drops.length} spans -> ${keeps.length} keep segments`);

// ---------------------------------------------------------------------------
// 4. apply the cut plan
// ---------------------------------------------------------------------------

console.log('[4/7] applying cut plan');

// Splice in raw PCM rather than with `aselect`: the filter snaps every boundary to a
// ~21 ms codec frame, which silently swallowed ~140 ms across 11 cuts and put the time
// map out of step with the delivered file. Splicing samples directly is exact and
// deterministic. Joins sit in dead air (< -50 dBFS) so a hard splice is inaudible.
const RAW_PCM = (() => {
  const res = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-i', TMP,
    '-ac', '1', '-ar', String(opts.sampleRate), '-f', 's16le', '-'], { maxBuffer: 1 << 29 });
  if (res.error) throw res.error;
  return res.stdout;
})();

const BYTES_PER_SAMPLE = 2;
const totalSamples = RAW_PCM.length / BYTES_PER_SAMPLE;
const toSample = (t) => Math.max(0, Math.min(totalSamples, Math.round(t * opts.sampleRate)));

const pieces = [];
let keptSamples = 0;
for (const k of keeps) {
  const a = toSample(k.start);
  const b = toSample(k.end);
  if (b <= a) continue;
  pieces.push(RAW_PCM.subarray(a * BYTES_PER_SAMPLE, b * BYTES_PER_SAMPLE));
  k.samples = b - a;
  keptSamples += b - a;
}
const SPLICED = Buffer.concat(pieces);
const SPLICED_PATH = OUTPUT.replace(/\.wav$/i, '') + '.__cut.pcm';
writeFileSync(SPLICED_PATH, SPLICED);

ffmpeg([
  '-y', '-f', 's16le', '-ar', String(opts.sampleRate), '-ac', '1', '-i', SPLICED_PATH,
  '-c:a', 'pcm_s16le', TMP2,
]);
const cutDuration = probeDuration(TMP2);
console.log(`      cut duration: ${cutDuration.toFixed(3)}s (${keptSamples} samples, sample-accurate)`);

// ---------------------------------------------------------------------------
// 5+6. tempo + two-pass loudnorm
// ---------------------------------------------------------------------------

console.log(`[5/7] tempo ${opts.tempo}x (pitch preserved)`);
console.log('[6/7] measuring loudness (pass 1)');
let measureLog;
try {
  measureLog = ffmpegStderr([
    '-i', TMP2,
    '-af', `atempo=${opts.tempo},loudnorm=I=${opts.lufs}:TP=${opts.tp}:LRA=${opts.lra}:print_format=json`,
    '-f', 'null', '-',
  ]);
} catch (e) {
  measureLog = `${e.stdout || ''}${e.stderr || ''}`;
}
const jsonStart = measureLog.lastIndexOf('{');
const jsonEnd = measureLog.lastIndexOf('}');
let measured = null;
if (jsonStart !== -1 && jsonEnd > jsonStart) {
  try { measured = JSON.parse(measureLog.slice(jsonStart, jsonEnd + 1)); } catch { /* fall through */ }
}

let loudFilter;
if (measured && measured.input_i && Number.isFinite(parseFloat(measured.input_i))) {
  loudFilter =
    `loudnorm=I=${opts.lufs}:TP=${opts.tp}:LRA=${opts.lra}` +
    `:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}` +
    `:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}` +
    `:offset=${measured.target_offset}:linear=true:print_format=summary`;
  console.log(`      measured I=${measured.input_i} LUFS, TP=${measured.input_tp} dBTP -> linear normalisation`);
} else {
  loudFilter = `loudnorm=I=${opts.lufs}:TP=${opts.tp}:LRA=${opts.lra}`;
  console.log('      measurement unavailable, falling back to single-pass loudnorm');
}

console.log('[7/7] rendering processed WAV (pass 2)');
ffmpeg([
  '-y', '-i', TMP2,
  '-af', `atempo=${opts.tempo},${loudFilter},alimiter=limit=0.94:level=disabled`,
  '-ac', '1', '-ar', String(opts.sampleRate), '-c:a', 'pcm_s16le', OUTPUT,
]);
const outDuration = probeDuration(OUTPUT);

// ---------------------------------------------------------------------------
// 7. time map
// ---------------------------------------------------------------------------

// `atempo` (WSOLA) does not deliver exactly length/tempo, so the map is built from the
// tempo the render ACTUALLY achieved. That residual is a uniform time-scale error, so
// folding it in here makes the map exact against the delivered file end-to-end.
const effectiveTempo = cutDuration / outDuration;

const segments = [];
let accSamples = 0;
for (const k of keeps) {
  if (!k.samples) continue;
  const outStart = accSamples / opts.sampleRate / effectiveTempo;
  accSamples += k.samples;
  const outEnd = accSamples / opts.sampleRate / effectiveTempo;
  segments.push({
    rawStart: r3(k.start),
    rawEnd: r3(k.end),
    outStart: r3(outStart),
    outEnd: r3(outEnd),
  });
}
console.log(`      requested tempo ${opts.tempo}, achieved ${effectiveTempo.toFixed(5)}`);

const timemap = {
  generatedBy: 'tools/process-voiceover.mjs',
  input: INPUT.replace(/\\/g, '/'),
  output: OUTPUT.replace(/\\/g, '/'),
  tempo: opts.tempo,
  effectiveTempo: Math.round(effectiveTempo * 1e5) / 1e5,
  sampleRate: opts.sampleRate,
  rawDuration: r3(rawDuration),
  cutDuration: r3(cutDuration),
  processedDuration: r3(outDuration),
  silenceRemoved: r3(removedTotal),
  options: opts,
  decisions,
  segments,
};
writeFileSync(MAP_PATH, JSON.stringify(timemap, null, 2));

// ---------------------------------------------------------------------------
// validation
// ---------------------------------------------------------------------------

let peakLog;
try {
  peakLog = ffmpegStderr(['-i', OUTPUT, '-af', 'astats=measure_overall=Peak_level+RMS_level:measure_perchannel=none', '-f', 'null', '-']);
} catch (e) { peakLog = `${e.stdout || ''}${e.stderr || ''}`; }
const peak = /Peak level dB:\s*(-?[\d.]+|inf)/.exec(peakLog)?.[1];
const rms = /RMS level dB:\s*(-?[\d.]+|inf)/.exec(peakLog)?.[1];

rmSync(TMP, { force: true });
rmSync(TMP2, { force: true });
rmSync(SPLICED_PATH, { force: true });

console.log('');
console.log('  raw       ', rawDuration.toFixed(3) + 's');
console.log('  after cut ', cutDuration.toFixed(3) + `s  (-${removedTotal.toFixed(3)}s silence)`);
console.log('  processed ', outDuration.toFixed(3) + `s  (tempo ${opts.tempo}x)`);
console.log('  peak      ', peak, 'dBFS   rms', rms, 'dBFS');
console.log('  wav       ', OUTPUT);
console.log('  timemap   ', MAP_PATH);

if (parseFloat(peak) > -0.1) console.warn('  WARNING: possible clipping');
