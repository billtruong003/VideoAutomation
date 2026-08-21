#!/usr/bin/env node
/**
 * verify-output.mjs — the delivery gate.
 *
 *   node tools/mryolk/verify-output.mjs out/mryolk-why-the-world-runs-on-debt.mp4
 *
 * A render that exits 0 has proved that ffmpeg did not crash. It has not proved that the
 * narration is present, that the subtitles line up with it, that the mix does not clip, or
 * that the file is the length it should be. Those are separate claims and each is checked
 * here against a measurement.
 *
 * Every check reports PASS, FAIL, or NOT RUN. The third exists because ffprobe is optional on
 * this machine (see `tools/ffbin.mjs`), and a gate that silently skips a check it could not
 * perform is worse than one that admits it — a green report nobody can trust is not a report.
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { FFPROBE, probeDuration, probeJson, ffmpegStderr } from '../ffbin.mjs';
import { DATA_DIR, VIDEO, TAIL_HOLD_SECONDS } from './config.mjs';

const target = process.argv[2] ?? join('out', 'mryolk-why-the-world-runs-on-debt.mp4');
if (!existsSync(target)) {
  console.error(`no such file: ${target}`);
  process.exit(1);
}

const audio = JSON.parse(readFileSync(join(DATA_DIR, 'audio-report.json'), 'utf8'));
const transcript = JSON.parse(readFileSync(join(DATA_DIR, 'stt', 'transcript.json'), 'utf8'));
const srt = readFileSync(join(DATA_DIR, 'stt', 'subtitles.srt'), 'utf8');

const expectedSeconds = audio.master.processedSeconds + TAIL_HOLD_SECONDS;
const expectedFrames = Math.ceil(expectedSeconds * VIDEO.fps);

const results = [];
const check = (name, status, detail) => results.push({ name, status, detail });
const pass = (n, d) => check(n, 'PASS', d);
const fail = (n, d) => check(n, 'FAIL', d);
const skip = (n, d) => check(n, 'NOT RUN', d);

/* ---------------------------------------------------------------- container */

const bytes = statSync(target).size;
pass('file present', `${(bytes / 1e6).toFixed(1)} MB`);

const duration = probeDuration(target);
const drift = Math.abs(duration - expectedSeconds);
if (drift <= 0.15) pass('duration', `${duration.toFixed(2)}s (expected ${expectedSeconds.toFixed(2)}s)`);
else fail('duration', `${duration.toFixed(2)}s but expected ${expectedSeconds.toFixed(2)}s — drift ${drift.toFixed(2)}s`);

const streams = probeJson(target, ['-show_entries', 'stream=codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels,nb_frames,pix_fmt']);
if (!streams) {
  skip('video stream', 'ffprobe unavailable on this machine');
  skip('audio stream', 'ffprobe unavailable on this machine');
  skip('frame count', 'ffprobe unavailable on this machine');
} else {
  const v = streams.streams.find((s) => s.codec_type === 'video');
  const a = streams.streams.find((s) => s.codec_type === 'audio');

  if (v && v.width === VIDEO.width && v.height === VIDEO.height) {
    pass('resolution', `${v.width}x${v.height}`);
  } else fail('resolution', `${v?.width}x${v?.height}, expected ${VIDEO.width}x${VIDEO.height}`);

  if (v?.codec_name === 'h264') pass('video codec', v.codec_name);
  else fail('video codec', String(v?.codec_name));

  // yuvj420p is the deprecated full-range variant; players disagree about how to show it.
  if (v?.pix_fmt === 'yuv420p') pass('pixel format', v.pix_fmt);
  else fail('pixel format', `${v?.pix_fmt}, expected yuv420p`);

  const [num, den] = String(v?.r_frame_rate ?? '0/1').split('/').map(Number);
  const fps = den ? num / den : 0;
  if (Math.abs(fps - VIDEO.fps) < 0.01) pass('frame rate', `${fps} fps`);
  else fail('frame rate', `${fps} fps, expected ${VIDEO.fps}`);

  const nb = Number(v?.nb_frames ?? 0);
  if (nb === 0) skip('frame count', 'container reports no frame count');
  else if (Math.abs(nb - expectedFrames) <= 2) pass('frame count', `${nb} (expected ${expectedFrames})`);
  else fail('frame count', `${nb}, expected ${expectedFrames}`);

  if (a && Number(a.sample_rate) === 48000) pass('audio rate', `${a.sample_rate} Hz, ${a.channels}ch, ${a.codec_name}`);
  else fail('audio rate', `${a?.sample_rate} Hz, expected 48000`);
}

/* -------------------------------------------------------------------- mix */

const loud = ffmpegStderr(['-i', target, '-af', 'loudnorm=print_format=json', '-f', 'null', '-']);
let measured = {};
try {
  const idx = loud.lastIndexOf('{');
  measured = JSON.parse(loud.slice(idx, loud.indexOf('}', idx) + 1).replace(/}\s*$/, '}'));
} catch { /* handled below */ }

const lufs = Number(measured.input_i);
const tp = Number(measured.input_tp);

if (Number.isFinite(lufs)) {
  // Narration alone was mastered to -16 LUFS; the SFX bed lifts the programme slightly.
  // YouTube normalises to about -14, so anything in this window plays back untouched or
  // very close to it.
  if (lufs >= -18 && lufs <= -12) pass('integrated loudness', `${lufs} LUFS`);
  else fail('integrated loudness', `${lufs} LUFS, outside -18..-12`);
} else skip('integrated loudness', 'loudnorm did not report');

if (Number.isFinite(tp)) {
  if (tp <= -1.0) pass('true peak', `${tp} dBTP`);
  else fail('true peak', `${tp} dBTP, expected <= -1.0`);
} else skip('true peak', 'loudnorm did not report');

const stats = ffmpegStderr(['-i', target, '-af', 'astats=measure_perchannel=none', '-f', 'null', '-']);
const clipped = Number(/Number of clipped samples:\s*(\d+)/.exec(stats)?.[1] ?? '0');
if (clipped === 0) pass('clipping', '0 clipped samples');
else fail('clipping', `${clipped} clipped samples`);

/*
 * Narration presence. A file can be the right length, the right loudness and still have a
 * silent stretch where a mux went wrong, so the audio is scanned for gaps long enough that a
 * viewer would notice one — measured against the narration's own longest pause, which was
 * 0.55s, so anything past 2.5s is not a pause.
 */
const sil = ffmpegStderr(['-i', target, '-af', 'silencedetect=noise=-50dB:d=2.5', '-f', 'null', '-']);
const gaps = [...sil.matchAll(/silence_start:\s*(-?[\d.]+)[\s\S]*?silence_duration:\s*([\d.]+)/g)]
  .map((m) => ({ at: Number(m[1]), seconds: Number(m[2]) }))
  // The tail hold after the last word is silent by design.
  .filter((g) => g.at < audio.master.processedSeconds - 1);
if (gaps.length === 0) pass('narration continuity', 'no unexplained silence over 2.5s');
else fail('narration continuity', gaps.map((g) => `${g.seconds.toFixed(1)}s at ${g.at.toFixed(1)}s`).join(', '));

/* ------------------------------------------------------------------- srt */

const cues = srt.trim().split(/\n\n+/).map((block) => {
  const lines = block.split('\n');
  const m = /(\d\d):(\d\d):(\d\d),(\d\d\d) --> (\d\d):(\d\d):(\d\d),(\d\d\d)/.exec(lines[1] ?? '');
  if (!m) return null;
  const toS = (h, mi, s, ms) => +h * 3600 + +mi * 60 + +s + +ms / 1000;
  return {
    index: Number(lines[0]),
    start: toS(m[1], m[2], m[3], m[4]),
    end: toS(m[5], m[6], m[7], m[8]),
    text: lines.slice(2).join(' '),
  };
}).filter(Boolean);

if (cues.length === transcript.cueCount) pass('srt cue count', `${cues.length}`);
else fail('srt cue count', `${cues.length} in file, ${transcript.cueCount} in transcript`);

const badOrder = cues.filter((c, i) => i > 0 && c.start < cues[i - 1].end);
if (badOrder.length === 0) pass('srt overlap', 'no cue starts before the previous ends');
else fail('srt overlap', `${badOrder.length} overlapping cues, first at cue ${badOrder[0].index}`);

const negative = cues.filter((c) => c.end <= c.start);
if (negative.length === 0) pass('srt cue length', 'every cue has positive duration');
else fail('srt cue length', `${negative.length} cues end at or before they start`);

const last = cues[cues.length - 1];
if (last && last.end <= duration + 0.05) pass('srt within video', `last cue ends ${last.end.toFixed(2)}s, video ${duration.toFixed(2)}s`);
else fail('srt within video', `last cue ends ${last?.end.toFixed(2)}s, past the ${duration.toFixed(2)}s video`);

const numbering = cues.every((c, i) => c.index === i + 1);
if (numbering) pass('srt numbering', 'sequential from 1');
else fail('srt numbering', 'cue indices are not sequential');

/* ---------------------------------------------------------------- report */

const failed = results.filter((r) => r.status === 'FAIL');
const skipped = results.filter((r) => r.status === 'NOT RUN');

console.log(`\n=== DELIVERY GATE — ${target} ===\n`);
for (const r of results) {
  const badge = r.status === 'PASS' ? ' ok ' : r.status === 'FAIL' ? 'FAIL' : ' -- ';
  console.log(`[${badge}] ${r.name.padEnd(24)} ${r.detail}`);
}
console.log(`\n${results.length - failed.length - skipped.length} passed, ${failed.length} failed, ${skipped.length} not run`);

process.exit(failed.length ? 1 : 0);
