#!/usr/bin/env node
/**
 * validate-specs.mjs — check every Batch 002 scene spec before anything renders.
 *
 *   node tools/validate-specs.mjs
 *
 * The DSL resolves everything by NAME: a prop, a mark, a background, a character, a pose, an
 * expression, a keyword anchor. That is what makes a spec short, and it is also what moves the
 * whole class of "you asked for something that does not exist" from compile time to render
 * time — where each discovery costs a bundle plus a frame, roughly thirty seconds, and finds
 * exactly one mistake before dying.
 *
 * Twenty specs authored in one sitting will contain a handful of these. Finding them all in
 * under a second is worth a tool.
 *
 * It reads the specs as TEXT rather than importing them, because importing pulls in Remotion
 * and the whole component tree, and this check needs to run cheaply and without a browser. The
 * names it validates against are read the same way, from the files that declare them, so the
 * two sides cannot drift.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SPEC_DIR = join(ROOT, 'src/episodes/batch002');

/*
 * Normalise line endings on every read.
 *
 * The repo mixes CRLF and LF and git rewrites them on checkout, while every regex below is
 * anchored on a bare newline. Without this the validator's verdict depends on how a file
 * happened to be written last, which is not a verdict at all — it reported "could not find a
 * scenes block" on a perfectly good spec purely because the file had been saved with CRLF.
 */
const norm = (s) => s.split('\r\n').join('\n');
const read = (p) => norm(readFileSync(join(ROOT, p), 'utf8'));
const names = (src) => [...src.matchAll(/^export const (\w+)/gm)].map((m) => m[1]);

/* ------------------------------------------------- what actually exists */

const PROP_FILES = ['machines', 'money', 'objects', 'time', 'travel', 'world', 'batch002'];
const VALID_PROPS = new Set(PROP_FILES.flatMap((f) => names(read(`src/props/${f}.tsx`))));
const VALID_MARKS = new Set(['diagram', 'marks'].flatMap((f) => names(read(`src/fx/${f}.tsx`))));
const VALID_BG = new Set(names(read('src/backgrounds/everyday.tsx')));

/** Poses come from one shared table; every character can strike any of them. */
const VALID_POSES = new Set(
  ['humanoid', 'creature'].flatMap((f) => {
    try { return [...read(`src/character/poses/${f}.ts`).matchAll(/^ {2}(\w+): \{/gm)].map((m) => m[1]); }
    catch { return []; }
  }),
);

/**
 * Expressions are PER CHARACTER and deliberately not uniform — Gus's range is narrower than
 * Bill's on purpose, so an expression valid for one is a hard error for the other.
 */
function expressionsOf(id) {
  const src = read(`src/character/characters/${id}.ts`);
  /*
   * Stop at `} satisfies`, which is how these tables actually close. Matching to a bare `};`
   * ran straight past the end of the object and swept up the character definition that follows
   * it, so `palette`, `roughSeed` and `motion` were all being accepted as valid expressions.
   * A whitelist that contains the wrong things still rejects a typo, which is exactly why it
   * would have survived unnoticed.
   */
  const block = src.match(/_EXPRESSIONS[^=]*=\s*\{([\s\S]*?)\n\} satisfies/);
  if (!block) return new Set();
  return new Set([...block[1].matchAll(/^ {2}(\w+):/gm)].map((m) => m[1]));
}
const VALID_EXPR = { bill: expressionsOf('bill'), gus: expressionsOf('gus') };

/* ------------------------------------------------------------- checking */

const problems = [];
const specFiles = readdirSync(SPEC_DIR)
  .filter((f) => f.endsWith('.ts') && f !== 'index.ts' && f !== 'layout.ts');

let layers = 0;
for (const file of specFiles) {
  const slug = file.replace(/\.ts$/, '');
  const src = norm(readFileSync(join(SPEC_DIR, file), 'utf8'));
  const flag = (msg) => problems.push(`${slug}: ${msg}`);

  // The episode's own scene ids and keyword ids — the only anchors a spec may reference.
  const cfg = JSON.parse(read(`episodes/${slug}/episode.json`));
  const sceneIds = new Set(cfg.scenes.map((s) => s.id));
  const keywordIds = new Set(cfg.keywords.map((k) => k[0]));

  // Scene keys are the top-level entries of `scenes: { ... }`.
  const scenesBlock = src.match(/scenes: \{([\s\S]*)\n {2}\},\n\};/);
  if (!scenesBlock) { flag('could not find a scenes block'); continue; }
  const declared = [...scenesBlock[1].matchAll(/^ {4}(\w[\w-]*): \{$/gm)].map((m) => m[1]);
  for (const id of declared) if (!sceneIds.has(id)) flag(`scene "${id}" is not in the narration timing`);
  for (const id of sceneIds) if (!declared.includes(id)) flag(`scene "${id}" has no spec — it will render empty`);

  // Every name the DSL will look up.
  for (const m of src.matchAll(/k: 'prop', name: '([^']+)'/g)) {
    layers++;
    if (!VALID_PROPS.has(m[1])) flag(`unknown prop "${m[1]}"`);
  }
  for (const m of src.matchAll(/k: 'mark', name: '([^']+)'/g)) {
    layers++;
    if (!VALID_MARKS.has(m[1])) flag(`unknown mark "${m[1]}"`);
  }
  for (const m of src.matchAll(/bg: '([^']+)'/g)) {
    if (!VALID_BG.has(m[1])) flag(`unknown background "${m[1]}"`);
  }
  for (const m of src.matchAll(/pose: '([^']+)'/g)) {
    if (!VALID_POSES.has(m[1])) flag(`unknown pose "${m[1]}"`);
  }

  /*
   * Expressions are checked against the character in the SAME actor block, which is why this
   * walks blocks rather than scanning the file: `expression: 'happy'` is correct for Bill and
   * wrong for Gus, and a file-wide scan cannot tell them apart.
   */
  for (const block of src.matchAll(/k: 'actor',[\s\S]*?(?=\n {8}\},|\n {6}\],)/g)) {
    const who = block[0].match(/who: '(\w+)'/)?.[1];
    if (!who) continue;
    if (!VALID_EXPR[who]) { flag(`unknown character "${who}"`); continue; }
    for (const e of block[0].matchAll(/expression: '(\w+)'/g)) {
      if (!VALID_EXPR[who].has(e[1])) {
        flag(`${who} has no expression "${e[1]}" (has: ${[...VALID_EXPR[who]].join(', ')})`);
      }
    }
  }

  /*
   * Anchors. A quoted `at`/`until`/`punchAt`/`dimFrom` is a keyword id; a number is
   * seconds-in-scene and needs no checking. A typo here is the worst kind of failure, because
   * `kwIn` throws mid-render on an episode that bundled fine.
   */
  for (const key of ['at', 'until', 'punchAt', 'dimFrom']) {
    for (const m of src.matchAll(new RegExp(`${key}: '([^']+)'`, 'g'))) {
      if (!keywordIds.has(m[1])) flag(`${key}: "${m[1]}" is not a declared keyword`);
    }
  }
}

/* --------------------------------------------------------------- report */

if (problems.length) {
  console.error(`SPEC VALIDATION FAILED — ${problems.length} problem(s):`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

console.log(
  `specs ok · ${specFiles.length} episodes · ${layers} prop/mark layers · `
  + `${VALID_PROPS.size} props, ${VALID_MARKS.size} marks, ${VALID_BG.size} backgrounds available`,
);
