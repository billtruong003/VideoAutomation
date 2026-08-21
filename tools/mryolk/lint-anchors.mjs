#!/usr/bin/env node
/**
 * lint-anchors.mjs — catch a visual that is anchored to the wrong occurrence of a word.
 *
 *   node tools/mryolk/lint-anchors.mjs
 *
 * Scenes place visuals with `w('borrow')`, meaning "when the narrator says borrow". When that
 * word is spoken only once in the chapter, the anchor is unambiguous. When it is spoken
 * several times, `w()` silently returns the FIRST one — and if the intended beat was the last,
 * the element's delay goes negative and it appears at the start of its section instead of on
 * the word.
 *
 * That failure is nearly invisible in review. Nothing errors, nothing is missing, and the
 * frame looks plausible; the drawing is simply early. Eight of them were found in this edit
 * only by auditing, after they had already survived a spot check of fifty rendered frames.
 *
 * So ambiguity has to be resolved deliberately. An anchor whose word recurs must either:
 *
 *   use `wAfter(word, someFrame)`   anchored relative to a point, which cannot drift
 *   pass an explicit occurrence     `w('ten', 5)` — the author has counted
 *   appear in DELIBERATE below      with the reason the first occurrence is right
 *
 * The check only fires when the occurrences are far enough apart to matter; two uses of a
 * word inside one sentence are not a trap.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR } from './config.mjs';

/** Seconds between first and last occurrence, past which an anchor must be explicit. */
const AMBIGUITY_SECONDS = 8;

/**
 * Anchors that resolve to the first occurrence ON PURPOSE.
 *
 * Each is here because the beat it marks genuinely is the first time the word is spoken, and
 * a later use exists elsewhere in the same chapter.
 */
const DELIBERATE = {
  "ch04-banks.tsx:liability": 'the balance-sheet bracket lands on "and a liability, your deposit"; the later use is the closing recap',
  "ch06-bonds.tsx:bonds": 'the government issues its bond on "by selling bonds"; the later use is the buyers section',
  "ch12-2008.tsx:mortgage": 'the document appears on "huge amounts of mortgage debt"; the later use is the defaults beat',
};

const words = JSON.parse(readFileSync(join(DATA_DIR, 'stt', 'words.json'), 'utf8'));
const segments = JSON.parse(readFileSync(join(DATA_DIR, 'stt', 'segments.json'), 'utf8'));

const clean = (s) => s.toLowerCase()
  .replace(/[‘’ʼ]/g, "'")
  .replace(/'s\b/g, '')
  .replace(/[^a-z0-9-]/g, '');

const matches = (token, needle) => {
  const t = clean(token);
  const n = clean(needle);
  if (!n) return false;
  if (t.replace(/-/g, '') === n.replace(/-/g, '')) return true;
  return t.split('-').filter(Boolean).includes(n);
};

const SCENES = join('src', 'mryolk', 'scenes');
const problems = [];
let checked = 0;

for (const file of readdirSync(SCENES).filter((f) => /^ch\d\d.*\.tsx$/.test(f))) {
  const src = readFileSync(join(SCENES, file), 'utf8');
  const range = /ctxFor\((\d+),\s*(\d+)\)/.exec(src);
  if (!range) continue;

  const from = Number(range[1]);
  const to = Number(range[2]);
  const start = segments[from].start;
  const end = segments[to].end;
  const inRange = words.filter((w) => w.start >= start - 0.001 && w.end <= end + 0.001);

  // Only bare `w('word')` calls are at risk. `w('word', n)` and `wAfter(...)` are explicit.
  const seen = new Set();
  for (const m of src.matchAll(/(?<!After\()\bw\('([^']+)'\)/g)) {
    const needle = m[1];
    if (seen.has(needle)) continue;
    seen.add(needle);
    checked += 1;

    const hits = inRange.filter((w) => matches(w.text, needle));
    if (hits.length <= 1) continue;

    const spread = hits[hits.length - 1].start - hits[0].start;
    if (spread < AMBIGUITY_SECONDS) continue;

    const key = `${file}:${needle}`;
    if (DELIBERATE[key]) continue;

    problems.push(
      `${file}  w('${needle}') is spoken ${hits.length} times across ${spread.toFixed(1)}s `
      + `(${hits[0].start.toFixed(1)}s … ${hits[hits.length - 1].start.toFixed(1)}s) `
      + 'and resolves to the first. Use wAfter(), pass an occurrence, or record it in DELIBERATE.',
    );
  }
}

if (problems.length) {
  console.error(`${problems.length} ambiguous anchor(s):\n`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`anchors OK — ${checked} bare anchors checked, ${Object.keys(DELIBERATE).length} deliberate`);
