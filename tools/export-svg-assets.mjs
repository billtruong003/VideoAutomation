#!/usr/bin/env node
/**
 * export-svg-assets.mjs — write the component library out as standalone .svg files.
 *
 *   node tools/export-svg-assets.mjs
 *
 * The props, poses and backgrounds live as React components because scenes need to
 * animate their internals (clock hands, slot lights, reel symbols) — a flat .svg file
 * cannot do that. But an asset LIBRARY should be inspectable without running Remotion,
 * so this renders every component at frame 0 with react-dom/server and writes the result
 * to public/doodle/**. Those files are the browsable library; the components remain the
 * source of truth.
 *
 * Bundling goes through esbuild because Node cannot import .tsx directly.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const ENTRY = 'tools/.svg-export-entry.tsx';
const BUNDLE = 'tools/.svg-export-bundle.cjs';

// The entry imports the real libraries, so this export can never drift from what the
// video actually renders.
writeFileSync(
  ENTRY,
  `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DoodleCharacter } from '../src/components/DoodleCharacter';
import { POSES } from '../src/character/poses';
import { EXPRESSIONS } from '../src/character/expressions';
import * as Time from '../src/props/time';
import * as World from '../src/props/world';
import * as Casino from '../src/props/casino';
import * as Money from '../src/props/money';
import * as Marks from '../src/fx/marks';
import * as BG from '../src/backgrounds';

const wrap = (inner: React.ReactNode, w: number, h: number, vb: string) =>
  '<?xml version="1.0" encoding="UTF-8"?>\\n' +
  \`<svg xmlns="http://www.w3.org/2000/svg" width="\${w}" height="\${h}" viewBox="\${vb}">\` +
  renderToStaticMarkup(inner as React.ReactElement) +
  '</svg>\\n';

const out: { path: string; svg: string }[] = [];

// ---- character poses (neutral face) ----
for (const name of Object.keys(POSES)) {
  out.push({
    path: \`characters/main/pose-\${name}.svg\`,
    svg: wrap(
      <DoodleCharacter
        pose={(POSES as any)[name]}
        expression={EXPRESSIONS.neutral}
        x={0} y={0} scale={1} frame={0} seed={'export-' + name} wobbleAmount={0} halo={false}
      />,
      160, 220, '-80 -150 160 220',
    ),
  });
}

// ---- character expressions (neutral pose, head crop) ----
for (const name of Object.keys(EXPRESSIONS)) {
  out.push({
    path: \`characters/main/expression-\${name}.svg\`,
    svg: wrap(
      <DoodleCharacter
        pose={POSES.neutral}
        expression={(EXPRESSIONS as any)[name]}
        x={0} y={0} scale={1} frame={0} seed={'exportx-' + name} wobbleAmount={0} halo={false}
      />,
      120, 120, '-60 -150 120 120',
    ),
  });
}

const P = (el: React.ReactNode, size = 200) => wrap(el, size, size, \`\${-size / 2} \${-size / 2} \${size} \${size}\`);

// ---- props ----
const props: [string, React.ReactNode, number?][] = [
  ['props/wall-clock', <Time.WallClock frame={0} wobbleAmount={0} hourAngle={300} minuteAngle={60} />, 100],
  ['props/clock-hands', <Time.ClockHands frame={0} wobbleAmount={0} hourAngle={300} minuteAngle={60} />, 100],
  ['props/wristwatch', <Time.Wristwatch frame={0} wobbleAmount={0} />, 80],
  ['props/huge-wall-clock', <Time.HugeWallClock frame={0} wobbleAmount={0} />, 200],
  ['props/window-daylight', <World.Window frame={0} wobbleAmount={0} daylight />, 140],
  ['props/window-dull', <World.Window frame={0} wobbleAmount={0} />, 140],
  ['props/sun', <World.Sun frame={0} wobbleAmount={0} />, 100],
  ['props/moon', <World.Moon frame={0} wobbleAmount={0} />, 80],
  ['props/ceiling-light', <World.CeilingLight frame={0} wobbleAmount={0} lit />, 120],
  ['props/door', <World.Door frame={0} wobbleAmount={0} />, 200],
  ['props/plant', <World.Plant frame={0} wobbleAmount={0} />, 100],
  ['props/comfy-chair', <World.ComfyChair frame={0} wobbleAmount={0} />, 140],
  ['props/drink-cup', <World.DrinkCup frame={0} wobbleAmount={0} />, 80],
  ['props/slot-machine', <Casino.SlotMachine frame={0} wobbleAmount={0} lit />, 240],
  ['props/slot-machine-row', <Casino.SlotMachineRow frame={0} wobbleAmount={0} lit />, 480],
  ['props/casino-chip', <Casino.CasinoChip frame={0} wobbleAmount={0} />, 60],
  ['props/chip-stack', <Casino.ChipStack frame={0} wobbleAmount={0} />, 100],
  ['props/roulette-table', <Casino.RouletteTable frame={0} wobbleAmount={0} />, 200],
  ['props/playing-cards', <Casino.PlayingCards frame={0} wobbleAmount={0} fanned />, 100],
  ['props/dice', <Casino.Dice frame={0} wobbleAmount={0} pips={5} />, 60],
  ['props/casino-sign', <Casino.CasinoSign frame={0} wobbleAmount={0} lit />, 220],
  ['props/ceiling-light-row', <Casino.CeilingLightRow frame={0} wobbleAmount={0} lit />, 400],
  ['props/wallet', <Money.Wallet frame={0} wobbleAmount={0} />, 90],
  ['props/empty-wallet', <Money.EmptyWallet frame={0} wobbleAmount={0} />, 100],
  ['props/cash', <Money.Cash frame={0} wobbleAmount={0} count={3} />, 100],
  ['props/receipt', <Money.Receipt frame={0} wobbleAmount={0} />, 140],
  ['props/empty-cup', <Money.EmptyCup frame={0} wobbleAmount={0} />, 80],
  ['props/trash-pile', <Money.TrashPile frame={0} wobbleAmount={0} />, 140],
  ['fx/question-mark', <Marks.QuestionMark frame={0} wobbleAmount={0} />, 80],
  ['fx/exclamation-mark', <Marks.ExclamationMark frame={0} wobbleAmount={0} />, 80],
  ['fx/arrow', <Marks.Arrow frame={0} wobbleAmount={0} curved />, 140],
  ['fx/sparkles', <Marks.Sparkles frame={0} wobbleAmount={0} />, 140],
  ['fx/attention-lines', <Marks.AttentionLines frame={0} wobbleAmount={0} />, 200],
  ['fx/motion-lines', <Marks.MotionLines frame={0} wobbleAmount={0} />, 140],
  ['fx/impact-star', <Marks.ImpactStar frame={0} wobbleAmount={0} />, 160],
  ['fx/sweat-drops', <Marks.SweatDrops frame={0} wobbleAmount={0} />, 100],
  ['fx/dizzy-spiral', <Marks.DizzySpiral frame={0} wobbleAmount={0} />, 100],
  ['fx/thought-cloud', <Marks.ThoughtCloud frame={0} wobbleAmount={0} />, 220],
];
for (const [path, el, size] of props) out.push({ path: path + '.svg', svg: P(el, size) });

// ---- backgrounds (full stage) ----
const backgrounds: [string, React.ReactNode][] = [
  ['casino-entrance', <BG.CasinoEntrance frame={0} />],
  ['traditional-floor', <BG.TraditionalFloor frame={0} />],
  ['slot-area', <BG.SlotArea frame={0} lit />],
  ['time-distortion-void', <BG.TimeDistortionVoid frame={0} intensity={0.85} />],
  ['modern-casino', <BG.ModernCasino frame={0} />],
  ['outside-world', <BG.OutsideWorld frame={0} />],
];
for (const [name, el] of backgrounds) {
  out.push({ path: \`backgrounds/\${name}.svg\`, svg: wrap(el, 1080, 1920, '0 0 1080 1920') });
}

process.stdout.write(JSON.stringify(out));
`,
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

const run = spawnSync('node', [BUNDLE], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (run.status !== 0) {
  console.error(run.stdout, run.stderr);
  process.exit(1);
}

const assets = JSON.parse(run.stdout);
const dirs = new Set();
for (const a of assets) {
  const dir = `public/doodle/${a.path}`.replace(/\/[^/]+$/, '');
  if (!dirs.has(dir)) { mkdirSync(dir, { recursive: true }); dirs.add(dir); }
  writeFileSync(`public/doodle/${a.path}`, a.svg);
}

rmSync(ENTRY, { force: true });
rmSync(BUNDLE, { force: true });

const byKind = assets.reduce((acc, a) => {
  const k = a.path.split('/')[0];
  acc[k] = (acc[k] ?? 0) + 1;
  return acc;
}, {});
console.log(`exported ${assets.length} SVG files to public/doodle/`);
for (const [k, n] of Object.entries(byKind)) console.log(`  ${k.padEnd(14)} ${n}`);
