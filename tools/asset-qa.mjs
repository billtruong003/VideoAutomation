#!/usr/bin/env node
/**
 * asset-qa.mjs — validate every asset in isolation, before it can reach a scene.
 *
 *   node tools/asset-qa.mjs
 *
 * V1's asset bugs were all found by eye, late, inside finished scenes: a clock covering a
 * head, a die that rendered as a black smear, hands that vanished into a torso. By then
 * each fix costs a re-render of everything.
 *
 * This renders each asset ALONE through the real V2 stylizer and asserts machine-checkable
 * properties. It catches the failure modes that actually occur in this architecture:
 *
 *   - EMPTY        the component rendered nothing (bad def, wrong prop name)
 *   - NAN          NaN/Infinity leaked into path data (division by zero in geometry)
 *   - OVERSIZE     the drawing escapes its declared size by more than a stroke width,
 *                  which is how "roughness in absolute units" silently ruins small assets
 *   - FLICKER      two renders of the same asset differ, i.e. seeding is not deterministic
 *
 * Those four are unambiguous and are hard failures.
 *
 * SMEAR (a small filled mark roughened into a blob — the V2 dice bug) is reported as a
 * WARNING only. It was originally a hard failure, but path-data volume cannot separate
 * "3-unit disc scribbled into a smear" from "22-vertex filled starburst", which is simply
 * a large drawing: both produce thousands of characters of path data, and the second is
 * healthy. Rather than tune the threshold until the honest cases happen to squeak under
 * it — a check that cries wolf is a check people learn to ignore — it flags for human
 * review and the contact sheets make the final call.
 */

import { spawnSync } from 'node:child_process';
import { writeFileSync, rmSync, mkdirSync, readFileSync, existsSync } from 'node:fs';

const ENTRY = 'tools/.asset-qa-entry.tsx';
const BUNDLE = 'tools/.asset-qa-bundle.cjs';

mkdirSync('qa', { recursive: true });

// The entry imports the real modules, so QA can never drift from what ships.
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

type Case = { id: string; group: string; el: React.ReactNode; size: number };

const cases: Case[] = [];
const push = (group: string, id: string, el: React.ReactNode, size = 120) =>
  cases.push({ id, group, el, size });

// every prop / fx export, drawn at the origin with drift disabled
const mods: [string, Record<string, unknown>][] = [
  ['time', Time as any], ['world', World as any],
  ['casino', Casino as any], ['money', Money as any], ['fx', Marks as any],
];
const SIZES: Record<string, number> = {
  SlotMachine: 260, SlotMachineRow: 520, RouletteTable: 220, CasinoSign: 240,
  CeilingLightRow: 440, HugeWallClock: 220, Door: 220, ComfyChair: 160,
  ThoughtCloud: 260, ImpactStar: 200, AttentionLines: 240, TrashPile: 160,
};
for (const [group, mod] of mods) {
  for (const [name, C] of Object.entries(mod)) {
    if (typeof C !== 'function') continue;
    const El = C as React.FC<any>;
    push(group, name, <El x={0} y={0} frame={0} drift={0} seed={'qa-' + name} />, SIZES[name] ?? 120);
  }
}

// every pose and expression
for (const name of Object.keys(POSES)) {
  push('pose', name,
    <DoodleCharacter pose={(POSES as any)[name]} expression={EXPRESSIONS.neutral}
      x={0} y={0} frame={0} wobbleAmount={0} halo={false} seed={'qa-pose-' + name} />, 300);
}
for (const name of Object.keys(EXPRESSIONS)) {
  push('expression', name,
    <DoodleCharacter pose={POSES.neutral} expression={(EXPRESSIONS as any)[name]}
      x={0} y={0} frame={0} wobbleAmount={0} halo={false} seed={'qa-expr-' + name} />, 300);
}

const render = (el: React.ReactNode) =>
  renderToStaticMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-200 -260 400 460">{el as any}</svg>,
  );

const out = cases.map((c) => ({
  id: c.id,
  group: c.group,
  size: c.size,
  svg: render(c.el),
  // second independent render — same inputs, must be byte-identical
  svg2: render(c.el),
}));

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

const run = spawnSync('node', [BUNDLE], { encoding: 'utf8', maxBuffer: 1 << 29 });
if (run.status !== 0) {
  console.error(run.stdout, run.stderr);
  process.exit(1);
}
const assets = JSON.parse(run.stdout);
rmSync(ENTRY, { force: true });
rmSync(BUNDLE, { force: true });

// ---------------------------------------------------------------------------
// checks
// ---------------------------------------------------------------------------

/** Pull every numeric coordinate out of the path data. */
function coords(svg) {
  const ds = [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]).join(' ');
  return (ds.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? []).map(Number);
}

const results = [];
for (const a of assets) {
  const issues = [];
  const warnings = [];

  const pathCount = (a.svg.match(/<path/g) ?? []).length;
  const dLength = [...a.svg.matchAll(/\sd="([^"]+)"/g)].reduce((n, m) => n + m[1].length, 0);

  if (pathCount === 0) issues.push('EMPTY: rendered no paths');
  if (/NaN|Infinity|undefined/.test(a.svg)) issues.push('NAN: non-finite value in output');

  const nums = coords(a.svg);
  if (nums.length) {
    const max = Math.max(...nums.map(Math.abs));
    // allow generous headroom: rough overshoot + stroke width + the asset's own size
    const limit = a.size * 1.4 + 40;
    if (max > limit) issues.push(`OVERSIZE: reaches ${max.toFixed(0)}u, expected within ~${limit.toFixed(0)}u`);
  }

  /*
   * SMEAR only applies to ROUGH.JS output. A single perfect-freehand gesture is one very
   * long filled outline by design — a spiral is thousands of characters of `d` and is
   * perfectly healthy. Rough.js paths carry a stroke-width; freehand paths are pure fills.
   * Scoping to the former is what makes this check mean "a small shape got scribbled into
   * a blob" rather than "a long stroke exists".
   */
  const roughPaths = [...a.svg.matchAll(/<path[^>]*stroke-width[^>]*\sd="([^"]+)"|<path[^>]*\sd="([^"]+)"[^>]*stroke-width/g)]
    .map((m) => m[1] ?? m[2]);
  const roughLen = roughPaths.reduce((n, d) => n + d.length, 0);
  const perRoughPath = roughPaths.length ? roughLen / roughPaths.length : 0;
  if (roughPaths.length > 0 && perRoughPath > 3500) {
    warnings.push(`SMEAR: ${Math.round(perRoughPath)} chars per rough path — check the contact sheet`);
  }

  if (a.svg !== a.svg2) issues.push('FLICKER: two renders differ — seeding is not deterministic');

  results.push({ id: a.id, group: a.group, pathCount, dLength, issues, warnings });
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------

const failed = results.filter((r) => r.issues.length);
const byGroup = {};
for (const r of results) (byGroup[r.group] ??= []).push(r);

console.log(`ASSET QA — ${results.length} assets rendered in isolation through the V2 stylizer\n`);
for (const [g, rs] of Object.entries(byGroup)) {
  const bad = rs.filter((r) => r.issues.length).length;
  console.log(`  ${g.padEnd(12)} ${String(rs.length).padStart(3)} assets   ${bad ? `${bad} FAILED` : 'all pass'}`);
}

if (failed.length) {
  console.log('\nFAILURES:');
  for (const f of failed) {
    console.log(`  ${f.group}/${f.id}`);
    for (const i of f.issues) console.log(`      ${i}`);
  }
}

// determinism summary is worth stating explicitly — it is the property the whole
// caching architecture depends on
const flicker = results.filter((r) => r.issues.some((i) => i.startsWith('FLICKER'))).length;
console.log(`\ndeterminism: ${results.length - flicker}/${results.length} assets byte-identical across two independent renders`);

const report = {
  generatedBy: 'tools/asset-qa.mjs',
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  results,
};
writeFileSync('qa/asset-qa-report.json', JSON.stringify(report, null, 2));
console.log('report: qa/asset-qa-report.json');

if (existsSync('data/asset-registry.json')) {
  const reg = JSON.parse(readFileSync('data/asset-registry.json', 'utf8'));
  const n = Object.keys(reg.assets ?? {}).length;
  console.log(`registry: ${n} ingested external assets tracked in data/asset-registry.json`);
}

if (failed.length) {
  console.log('\nASSET QA FAILED — fix these before rendering scenes.');
  process.exit(1);
}
console.log('\nASSET QA PASSED — every asset renders, is in bounds, and is deterministic.');
