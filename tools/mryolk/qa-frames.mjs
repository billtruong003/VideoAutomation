#!/usr/bin/env node
/**
 * qa-frames.mjs — sample the finished video and lay it out for review.
 *
 *   node tools/mryolk/qa-frames.mjs [video]
 *
 * Frames are pulled from the RENDERED FILE rather than re-rendered as stills, for two
 * reasons. It is far cheaper — one decode pass instead of eighty browser launches — and, more
 * importantly, it inspects the artifact that will actually be published. A still re-rendered
 * from source can look correct while the encoded file has a colour or timing problem, and the
 * whole point of this pass is to catch exactly that class of difference.
 *
 * Sampling is not uniform. A frame every N seconds spends most of its budget on the middle of
 * long explanations and can miss a chapter opening entirely, so the schedule combines an even
 * sweep with a deliberate sample just after every scene boundary and every chapter card —
 * those are where a timing error shows up first.
 */

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FFMPEG } from '../ffbin.mjs';
import { readRGBA } from './raster.mjs';
import { DATA_DIR, QA_DIR, VIDEO } from './config.mjs';

/**
 * How much of the action area may be blank before a frame is reported.
 *
 * The film's ground is white, so "mostly white" is normal and cannot be the test on its own —
 * but a frame with NOTHING in the action band is either a hole in the edit or an element that
 * failed to appear. One did: the mortgage dialogue in chapter 2 was scheduled thirty seconds
 * past the end of its own chapter by a nested `Sequence` offset, so four plates never rendered
 * at all. Nothing errored, the caption still ran underneath, and it survived a review of
 * fifty-one sampled frames because a white frame looks like a white frame.
 *
 * The caption band is excluded from the measurement — a caption is not content, and counting
 * it would let a frame pass on its subtitle alone, which is precisely the case that hid this.
 */
const BLANK_THRESHOLD = 0.995;
const ACTION_TOP = 60;
const ACTION_BOTTOM = 880;

const target = process.argv[2] ?? join('out', 'mryolk-why-the-world-runs-on-debt.mp4');
if (!existsSync(target)) {
  console.error(`no such file: ${target}`);
  process.exit(1);
}

const plan = JSON.parse(readFileSync(join(DATA_DIR, 'edit-plan.json'), 'utf8'));
const OUT = join(QA_DIR, 'frames');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const ff = (args) => execFileSync(FFMPEG, ['-hide_banner', '-nostdin', '-v', 'error', '-y', ...args], {
  encoding: 'utf8', maxBuffer: 1 << 28,
});

/** Every second a reviewer should look at, with the reason it was chosen. */
function schedule() {
  const marks = new Map();
  const add = (t, why) => {
    const key = Math.round(t * 10) / 10;
    if (key < 0 || key > plan.composition.durationSeconds - 0.2) return;
    if (!marks.has(key)) marks.set(key, why);
  };

  for (const s of plan.scenes) {
    add(s.start + 1.2, `${s.sceneId} opens — ${s.chapter}`);
    if (s.chapterCard) add(s.start + 0.9, `${s.sceneId} chapter card`);
    // Two interior samples, so a long chapter cannot pass on its first frame alone.
    add(s.start + s.durationSeconds * 0.4, `${s.sceneId} mid`);
    add(s.start + s.durationSeconds * 0.75, `${s.sceneId} late`);
    add(s.end - 0.8, `${s.sceneId} ends`);
  }

  // An even sweep on top, so nothing between the anchors goes unlooked-at.
  for (let t = 3; t < plan.composition.durationSeconds; t += 11) add(t, 'sweep');

  return [...marks.entries()].sort((a, b) => a[0] - b[0]).map(([at, why]) => ({ at, why }));
}

const marks = schedule();
console.log(`sampling ${marks.length} frames from ${target}`);

/** Fraction of the action band that is effectively blank white. */
function blankness(path) {
  const img = readRGBA(path);
  const top = Math.round((ACTION_TOP / VIDEO.height) * img.height);
  const bottom = Math.round((ACTION_BOTTOM / VIDEO.height) * img.height);
  let blank = 0;
  let seen = 0;
  for (let y = top; y < bottom; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      const r = img.data[i];
      const g = img.data[i + 1];
      const b = img.data[i + 2];
      if (r > 244 && g > 244 && b > 244) blank += 1;
      seen += 1;
    }
  }
  return seen ? blank / seen : 1;
}

const index = [];
const blankFrames = [];
marks.forEach((m, i) => {
  const name = `q${String(i).padStart(3, '0')}-${String(Math.round(m.at)).padStart(4, '0')}s.png`;
  const path = join(OUT, name);
  ff(['-ss', String(m.at), '-i', target, '-frames:v', '1', '-vf', 'scale=640:-1', path]);
  const blank = blankness(path);
  index.push({ file: name, atSeconds: m.at, reason: m.why, blankFraction: Number(blank.toFixed(4)) });
  if (blank >= BLANK_THRESHOLD) blankFrames.push({ at: m.at, name, blank, why: m.why });
});

writeFileSync(join(QA_DIR, 'frame-index.json'), `${JSON.stringify(index, null, 2)}\n`);

/*
 * Contact sheets, in pages. One 80-image sheet is unreadable at any size a person actually
 * views it at; pages of 15 stay legible enough to spot a clipped character or a caption
 * landing on a diagram.
 *
 * The frames are copied to a strictly sequential `t%03d.png` first. ffmpeg's image2 demuxer
 * needs a printf pattern it can COUNT through, and the QA filenames deliberately carry their
 * timestamp — which makes them useful to a reviewer and unusable as a sequence.
 */
const files = readdirSync(OUT).filter((f) => f.endsWith('.png')).sort();
const TILE = join(QA_DIR, '.tiles');
rmSync(TILE, { recursive: true, force: true });
mkdirSync(TILE, { recursive: true });
files.forEach((f, i) => copyFileSync(join(OUT, f), join(TILE, `t${String(i).padStart(3, '0')}.png`)));

const PER_PAGE = 15;
const pages = Math.ceil(files.length / PER_PAGE);
for (let p = 0; p < pages; p++) {
  const count = Math.min(PER_PAGE, files.length - p * PER_PAGE);
  /*
   * `-frames:v 1` because `tile` is a MANY-TO-ONE filter: it swallows fifteen input frames and
   * emits a single mosaic. Asking for fifteen output frames tells the image2 muxer to write
   * fifteen files to one filename, which it rejects outright.
   */
  ff([
    '-f', 'image2', '-start_number', String(p * PER_PAGE), '-i', join(TILE, 't%03d.png'),
    '-filter_complex', `tile=3x5:nb_frames=${count}:margin=6:padding=6:color=0x2b2b30`,
    '-frames:v', '1',
    join(QA_DIR, `contact-page-${p + 1}.png`),
  ]);
}
rmSync(TILE, { recursive: true, force: true });

console.log(`${files.length} frames → ${OUT}`);
console.log(`${pages} contact pages → ${QA_DIR}`);
console.log(`index → ${join(QA_DIR, 'frame-index.json')}`);

if (blankFrames.length) {
  console.log(`
${blankFrames.length} frame(s) with an empty action area:`);
  for (const b of blankFrames) {
    const mm = Math.floor(b.at / 60);
    const ss = (b.at % 60).toFixed(1).padStart(4, '0');
    console.log(`  ${mm}:${ss}  ${(b.blank * 100).toFixed(2)}% blank  — ${b.why}`);
  }
  process.exitCode = 1;
} else {
  console.log('\nno frame has an empty action area');
}
