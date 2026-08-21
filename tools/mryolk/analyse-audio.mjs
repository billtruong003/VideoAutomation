#!/usr/bin/env node
/**
 * analyse-audio.mjs — measure narration before touching it.
 *
 *   node tools/mryolk/analyse-audio.mjs <file...>
 *
 * Cleanup settings picked from habit are how clean narration ends up over-processed. A noise
 * gate applied to audio with no noise costs consonants and gains nothing; a 1.3x speed-up
 * applied to speech that is already brisk makes it exhausting for twelve minutes. So this
 * reports what is actually there — level, noise floor, silence distribution, clipping,
 * speaking rate — and the processing choice is made against those numbers and written down.
 *
 * Speaking rate is the number that matters most here, and it is estimated from the SPEECH
 * time rather than the file duration: a file that is 20% pauses reads as slow when it is
 * merely gappy, and the fix for the two is different — one wants a tempo change, the other
 * wants pause trimming.
 */

import { spawnSync } from 'node:child_process';
import { FFMPEG } from '../ffbin.mjs';

const ffmpegLog = (args) => {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostdin', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });
  return `${r.stdout || ''}${r.stderr || ''}`;
};

const num = (re, log) => { const m = re.exec(log); return m ? Number(m[1]) : null; };

export function analyse(path, { noiseDb = -40, minSilence = 0.12 } = {}) {
  const stats = ffmpegLog(['-i', path, '-af', 'astats=metadata=1:reset=0', '-f', 'null', '-']);
  const r128 = ffmpegLog(['-i', path, '-af', 'loudnorm=print_format=json', '-f', 'null', '-']);
  const sil = ffmpegLog([
    '-i', path, '-af', `silencedetect=noise=${noiseDb}dB:d=${minSilence}`, '-f', 'null', '-',
  ]);

  let json = {};
  const jm = /\{[\s\S]*?\}/.exec(r128.slice(r128.lastIndexOf('{') - 1));
  try { json = JSON.parse(jm ? jm[0] : '{}'); } catch { json = {}; }

  const duration = (() => {
    let last = null;
    for (const m of sil.matchAll(/time=(\d+):(\d\d):(\d\d(?:\.\d+)?)/g)) {
      last = +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3]);
    }
    return last;
  })();

  const silences = [];
  let open = null;
  for (const line of sil.split('\n')) {
    const s = /silence_start:\s*(-?[\d.]+)/.exec(line);
    const e = /silence_end:\s*([\d.]+)/.exec(line);
    if (s) open = Number(s[1]);
    if (e && open !== null) { silences.push({ start: open, end: Number(e[1]) }); open = null; }
  }
  if (open !== null && duration) silences.push({ start: open, end: duration });

  const silenceTotal = silences.reduce((a, s) => a + (s.end - s.start), 0);
  const buckets = { micro: 0, sentence: 0, long: 0, dead: 0 };
  for (const s of silences) {
    const d = s.end - s.start;
    if (d < 0.30) buckets.micro++;
    else if (d < 0.60) buckets.sentence++;
    else if (d < 1.20) buckets.long++;
    else buckets.dead++;
  }

  return {
    file: path,
    duration,
    channels: num(/Audio:.*?,\s*\d+\sHz,\s*(mono|stereo)/, stats) === null
      ? (/,\s*mono,/.test(stats) ? 1 : 2) : null,
    sampleRate: num(/Audio:.*?,\s*(\d+)\sHz/, stats),
    peakDb: num(/Peak level dB:\s*(-?[\d.inf]+)/, stats),
    rmsDb: num(/RMS level dB:\s*(-?[\d.inf]+)/, stats),
    noiseFloorDb: num(/Min level dB:\s*(-?[\d.inf]+)/, stats),
    flatFactor: num(/Flat factor:\s*([\d.]+)/, stats),
    clippedSamples: num(/Number of clipped samples:\s*(\d+)/, stats) ?? 0,
    dcOffset: num(/DC offset:\s*(-?[\d.]+)/, stats),
    integratedLufs: json.input_i != null ? Number(json.input_i) : null,
    truePeakDb: json.input_tp != null ? Number(json.input_tp) : null,
    lra: json.input_lra != null ? Number(json.input_lra) : null,
    threshold: json.input_thresh != null ? Number(json.input_thresh) : null,
    silence: {
      count: silences.length,
      totalSeconds: Number(silenceTotal.toFixed(2)),
      fractionOfFile: duration ? Number((silenceTotal / duration).toFixed(3)) : null,
      longest: silences.length ? Number(Math.max(...silences.map((s) => s.end - s.start)).toFixed(2)) : 0,
      buckets,
    },
    speechSeconds: duration ? Number((duration - silenceTotal).toFixed(2)) : null,
  };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`
  || process.argv[1]?.endsWith('analyse-audio.mjs')) {
  const files = process.argv.slice(2);
  const out = files.map((f) => analyse(f));
  console.log(JSON.stringify(out, null, 2));
}
