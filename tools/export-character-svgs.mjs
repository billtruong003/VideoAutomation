#!/usr/bin/env node
/**
 * export-character-svgs.mjs — standalone SVG snapshots of the canonical cast.
 *
 *   node tools/export-character-svgs.mjs
 *
 * The React components remain the source of truth. These files are GENERATED from them,
 * never hand-edited, which is the only arrangement where an exported SVG and the runtime
 * character cannot drift apart — the failure mode where a character sheet in a folder
 * slowly stops matching the character in the videos.
 *
 * What they are for: asset browsing, thumbnails, manifests, pasting into a doc, and giving
 * a future agent something to look at without booting Remotion. What they are NOT for is
 * being imported back into the pipeline. If you find yourself reading one of these at
 * render time, use the component.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

const ENTRY = 'tools/.svg-export-entry.tsx';
const BUNDLE = 'tools/.svg-export-bundle.cjs';
const OUT_DIR = 'public/doodle/characters';

writeFileSync(
  ENTRY,
  `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DoodleCharacter } from '../src/components/DoodleCharacter';
import { CAST_ORDER, CHARACTERS } from '../src/character/registry';

/** One neutral full-body per character, plus each character's signature beat. */
const SIGNATURE: Record<string, [string, string]> = {
  bill: ['confused', 'confused'],
  mina: ['armsCrossed', 'unimpressed'],
  dex: ['presenting', 'evilIdea'],
  gus: ['armsBehindBack', 'deadpan'],
  mochi: ['loaf', 'judging'],
};

const files: { name: string; svg: string }[] = [];

const wrap = (el: React.ReactNode) =>
  renderToStaticMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-140 -230 280 320" width="280" height="320">
      {el as any}
    </svg>,
  );

for (const id of CAST_ORDER) {
  const c = CHARACTERS[id];
  const rest = c.kind === 'creature' ? 'stand' : 'neutral';
  const [sigPose, sigExpr] = SIGNATURE[id];

  files.push({
    name: id + '-neutral',
    svg: wrap(
      <DoodleCharacter character={id} pose={rest} expression={c.defaultExpression}
        x={0} y={0} frame={0} wobbleAmount={0} blink={false} gaze="center" seed={'svg-' + id} />,
    ),
  });

  files.push({
    name: id + '-signature',
    svg: wrap(
      <DoodleCharacter character={id} pose={sigPose} expression={sigExpr}
        x={0} y={0} frame={0} wobbleAmount={0} blink={false} gaze="center" seed={'svg-sig-' + id} />,
    ),
  });

  files.push({
    name: id + '-silhouette',
    svg: wrap(
      <DoodleCharacter character={id} pose={rest} expression={c.defaultExpression} silhouette
        x={0} y={0} frame={0} wobbleAmount={0} blink={false} gaze="center" seed={'svg-sil-' + id} />,
    ),
  });
}

process.stdout.write(JSON.stringify(files));
`,
  'utf8',
);

const build = spawnSync(
  'npx',
  ['esbuild', ENTRY, '--bundle', '--platform=node', '--format=cjs', '--jsx=automatic', `--outfile=${BUNDLE}`, '--log-level=error'],
  { encoding: 'utf8', shell: true, maxBuffer: 1 << 26 },
);
if (build.status !== 0) {
  console.error(build.stdout, build.stderr);
  process.exit(1);
}

const run = spawnSync('node', [BUNDLE], { encoding: 'utf8', maxBuffer: 1 << 29 });
if (run.status !== 0) {
  console.error(run.stdout, run.stderr);
  process.exit(1);
}

const files = JSON.parse(run.stdout);
rmSync(ENTRY, { force: true });
rmSync(BUNDLE, { force: true });

mkdirSync(OUT_DIR, { recursive: true });
for (const { name, svg } of files) {
  writeFileSync(`${OUT_DIR}/${name}.svg`, `${svg}
`, 'utf8');
}

console.log(`exported ${files.length} character SVGs to ${OUT_DIR}/`);
for (const { name, svg } of files) {
  console.log(`  ${name.padEnd(22)} ${String(svg.length).padStart(7)} bytes`);
}
