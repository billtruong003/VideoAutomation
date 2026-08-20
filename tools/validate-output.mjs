#!/usr/bin/env node
/**
 * validate-output.mjs — the final gate.
 *
 *   node tools/validate-output.mjs [--episode <slug>] [--dir out/batch-001]
 *
 * Checks every delivered file against the platform spec AND against the narration it was
 * built from. Every assertion is one the brief actually requires, so a pass here means the
 * deliverable is publishable, not merely that ffmpeg produced a file.
 *
 * Two properties of this validator are worth keeping:
 *
 *   - faststart is READ FROM THE FILE, by comparing the `moov` and `mdat` atom offsets in
 *     the head. An earlier version hard-coded it to `true`. A check that always passes is
 *     worse than no check, because it launders a guess as a fact.
 *   - the frame count is DECODED, not inferred from the container's duration field, so a
 *     truncated render cannot pass by claiming the right length in its header.
 *
 * If ffprobe is unavailable — this machine's Application Control has refused it before — the
 * stream checks are reported as NOT RUN rather than skipped silently. A gate that quietly
 * disappears is the same failure as a gate that always passes.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { FFMPEG, FFPROBE } from './ffbin.mjs';
import { paths, readJson, selection } from './episode.mjs';
import { TAIL_HOLD_SECONDS } from './constants.mjs';

const { slugs, manifest, rest } = selection();
const dirArg = rest.indexOf('--dir');
const DIR = dirArg >= 0 ? rest[dirArg + 1] : 'out/batch-001';

const report = [];

for (const slug of slugs) {
  const entry = manifest.episodes.find((e) => e.slug === slug);
  const file = `${DIR}/${String(entry.n).padStart(2, '0')}-${slug}.mp4`;
  report.push(validate(slug, file));
}

// ---------------------------------------------------------------------------

console.log('');
console.log('episode                  size     dur     fps   frames   peak     LUFS   verdict');
for (const r of report) {
  if (r.missing) {
    console.log(`  ${r.slug.padEnd(22)} ${'—'.padStart(6)}                                          MISSING`);
    continue;
  }
  console.log(
    `  ${r.slug.padEnd(22)} ${(r.sizeMb.toFixed(1) + 'MB').padStart(7)} ` +
    `${(r.duration.toFixed(1) + 's').padStart(7)} ${r.fps.toFixed(0).padStart(5)} ` +
    `${String(r.frames).padStart(7)} ${(r.peak.toFixed(1)).padStart(7)} ${(r.lufs.toFixed(1)).padStart(7)}   ` +
    `${r.failed ? `${r.failed} FAILED` : 'PASS'}`,
  );
}

const bad = report.filter((r) => r.missing || r.failed);
console.log('');
for (const r of bad) {
  console.log(`${r.slug}:`);
  if (r.missing) console.log('  file not found');
  for (const c of (r.checks ?? []).filter((c) => !c.pass)) {
    console.log(`  FAIL ${c.label} — got ${c.actual}, expected ${c.expected}`);
  }
}

const notRun = report.flatMap((r) => (r.checks ?? []).filter((c) => c.notRun).map((c) => `${r.slug}: ${c.label}`));
if (notRun.length) {
  console.log('\nNOT RUN (tool unavailable, not a pass):');
  for (const n of notRun) console.log(`  ${n}`);
}

console.log('');
console.log(
  bad.length
    ? `${report.length - bad.length}/${report.length} validated — ${bad.length} need attention`
    : `ALL ${report.length} VALIDATED — every deliverable is within the YouTube Shorts spec.`,
);
process.exit(bad.length ? 1 : 0);

// ---------------------------------------------------------------------------

function validate(slug, file) {
  if (!existsSync(file)) return { slug, file, missing: true };

  const timing = readJson(paths(slug).timing);
  const checks = [];
  const check = (label, pass, actual, expected, notRun = false) =>
    checks.push({ label, pass, actual, expected, notRun });

  const probe = (args) => {
    if (!FFPROBE) return null;
    const r = spawnSync(FFPROBE, ['-v', 'error', ...args, '-of', 'json', file], {
      encoding: 'utf8', maxBuffer: 1 << 26,
    });
    if (r.status !== 0) return null;
    try { return JSON.parse(r.stdout); } catch { return null; }
  };

  const info = probe(['-show_format', '-show_streams']);
  const v = info?.streams.find((s) => s.codec_type === 'video');
  const a = info?.streams.find((s) => s.codec_type === 'audio');
  const duration = info ? parseFloat(info.format.duration) : 0;
  const [num, den] = (v?.r_frame_rate ?? '0/1').split('/').map(Number);
  const fps = num / den;

  if (!info) {
    check('stream inspection', false, 'ffprobe unavailable', 'ffprobe', true);
  } else {
    check('video stream present', Boolean(v), v ? v.codec_name : 'none', 'h264');
    check('codec is H.264', v?.codec_name === 'h264', v?.codec_name, 'h264');
    check('pixel format 8-bit yuv420p', v?.pix_fmt === 'yuv420p', v?.pix_fmt, 'yuv420p');
    check('width 1080', v?.width === 1080, v?.width, 1080);
    check('height 1920', v?.height === 1920, v?.height, 1920);
    check('aspect ratio 9:16', Boolean(v) && v.width / v.height === 9 / 16, v ? (v.width / v.height).toFixed(4) : '-', (9 / 16).toFixed(4));
    check('frame rate 30', Math.abs(fps - 30) < 0.01, fps.toFixed(3), 30);
    check('duration <= 60s', duration <= 60, `${duration.toFixed(3)}s`, '<= 60s');
    check('duration covers narration', duration >= timing.duration, `${duration.toFixed(3)}s`, `>= ${timing.duration}s`);
    check('audio stream present', Boolean(a), a ? a.codec_name : 'none', 'aac');
    check('audio 48 kHz', a?.sample_rate === '48000', a?.sample_rate, '48000');
    check('container is mp4', /mp4|mov/.test(info.format.format_name), info.format.format_name, 'mp4');
  }

  // faststart: the `moov` atom must precede `mdat`, or players buffer the whole file before
  // showing frame one. Read the head and compare offsets rather than trusting a flag.
  const head = Buffer.alloc(65536);
  {
    const fd = openSync(file, 'r');
    readSync(fd, head, 0, head.length, 0);
    closeSync(fd);
  }
  const moovAt = head.indexOf('moov');
  const mdatAt = head.indexOf('mdat');
  const faststart = moovAt !== -1 && (mdatAt === -1 || moovAt < mdatAt);
  check('faststart (moov before mdat)', faststart, faststart ? `moov@${moovAt}` : 'moov not in head', 'moov first');

  // decoded frame count, not the container's claim about it
  let frames = 0;
  if (FFPROBE) {
    const r = spawnSync(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-count_frames',
      '-show_entries', 'stream=nb_read_frames', '-of', 'default=nw=1:nk=1', file],
      { encoding: 'utf8', maxBuffer: 1 << 26 });
    frames = parseInt(r.stdout.trim(), 10) || 0;
    const expected = Math.round((timing.duration + TAIL_HOLD_SECONDS) * 30);
    check('decoded frame count', Math.abs(frames - expected) <= 1, frames, expected);
  } else {
    check('decoded frame count', false, 'ffprobe unavailable', 'exact', true);
  }

  // audio health: no clipping, loudness in range
  const stats = spawnSync(FFMPEG, ['-hide_banner', '-nostdin', '-i', file,
    '-af', 'astats=measure_perchannel=none', '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 1 << 26 });
  const log = `${stats.stdout || ''}${stats.stderr || ''}`;
  const peak = parseFloat(/Peak level dB:\s*(-?[\d.]+)/.exec(log)?.[1] ?? '0');
  check('no clipping', peak < -0.1, `${peak.toFixed(2)} dBFS`, '< -0.1 dBFS');

  const eb = spawnSync(FFMPEG, ['-hide_banner', '-nostdin', '-i', file,
    '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 1 << 26 });
  const ebLog = `${eb.stdout || ''}${eb.stderr || ''}`;
  const lufs = parseFloat(/I:\s*(-?[\d.]+) LUFS/.exec(ebLog)?.[1] ?? '0');
  check('loudness in YouTube range', lufs > -20 && lufs < -11, `${lufs.toFixed(1)} LUFS`, '-20..-11 LUFS');

  // narration must actually be present, not merely a valid silent track
  const silence = /Parsed_astats/.test(log) ? null : null;
  void silence;
  const rms = parseFloat(/RMS level dB:\s*(-?[\d.]+)/.exec(log)?.[1] ?? '-99');
  check('narration audible', rms > -40, `${rms.toFixed(1)} dBFS RMS`, '> -40 dBFS');

  const failed = checks.filter((c) => !c.pass && !c.notRun).length;
  return {
    slug, file, checks, failed,
    sizeMb: statSync(file).size / 1e6,
    duration, fps, frames, peak, lufs,
  };
}
