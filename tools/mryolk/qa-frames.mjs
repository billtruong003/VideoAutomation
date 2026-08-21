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
import { DATA_DIR, QA_DIR, VIDEO } from './config.mjs';

const target = process.argv[2] ?? join('out', 'mryolk-why-the-world-runs-on-debt.mp4');
if (!existsSync(target)) {
  console.error(`no such file: ${target}`);
  process.exit(1);
}

const plan = JSON.parse(readFileSync(join(DATA_DIR, 'edit-plan.json'), 'utf8'));
const OUT = join(QA_DIR, 'frames');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const ff = (args) => execFileSync(FFMPEG, ['-hide_banner', '-nostdin', '-v', 'error', ...args], {
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

const index = [];
marks.forEach((m, i) => {
  const name = `q${String(i).padStart(3, '0')}-${String(Math.round(m.at)).padStart(4, '0')}s.png`;
  ff(['-ss', String(m.at), '-i', target, '-frames:v', '1', '-vf', 'scale=640:-1', join(OUT, name)]);
  index.push({ file: name, atSeconds: m.at, reason: m.why });
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
  ff([
    '-f', 'image2', '-start_number', String(p * PER_PAGE), '-i', join(TILE, 't%03d.png'),
    '-frames:v', String(count),
    '-filter_complex', 'tile=3x5:margin=6:padding=6:color=0x2b2b30',
    join(QA_DIR, `contact-page-${p + 1}.png`),
  ]);
}
rmSync(TILE, { recursive: true, force: true });

console.log(`${files.length} frames → ${OUT}`);
console.log(`${pages} contact pages → ${QA_DIR}`);
console.log(`index → ${join(QA_DIR, 'frame-index.json')}`);
