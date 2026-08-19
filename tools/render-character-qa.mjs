#!/usr/bin/env node
/**
 * render-character-qa.mjs — render every character QA sheet.
 *
 *   node tools/render-character-qa.mjs            all sheets
 *   node tools/render-character-qa.mjs bill       only sheets whose name contains "bill"
 *
 * These sheets are the acceptance gate for the cast. Rendering them is half the job;
 * the other half is opening them and actually looking, which is a human (or a vision
 * model) step this script deliberately does not pretend to do.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const CAST = ['bill', 'mina', 'dex', 'gus', 'mochi'];

/** [composition id, output file, what this sheet is asking] */
const SHEETS = [
  ['CharModel', 'bill-model-sheet', 'proportions, views, costume overlays, construction numbers'],
  ['CharExpr-bill', 'bill-expression-sheet', 'every Bill face — the mandatory face QA gate'],
  ['CharPose-bill', 'bill-pose-sheet', 'every Bill pose, neutral face throughout'],
  ['CharHandArm', 'hand-arm-test', 'no floating hands: trace shoulder to hand in every cell'],
  ['CharLineup', 'cast-lineup', 'same universe, distinct silhouettes, Bill reads as the lead'],
  ['CharSilhouettes', 'silhouettes', 'identity survives with every detail removed'],
  ['CharPhoneSize', 'phone-size-test', '100 / 60 / 30 / thumbnail — the sizes people watch at'],
  ...CAST.slice(1).flatMap((id) => [
    [`CharExpr-${id}`, `${id}-expression-sheet`, `every ${id} face`],
    [`CharPose-${id}`, `${id}-pose-sheet`, `${id} core poses`],
  ]),
];

const filter = process.argv[2];
const wanted = filter ? SHEETS.filter(([, out]) => out.includes(filter)) : SHEETS;

mkdirSync('qa/characters', { recursive: true });

console.log(`rendering ${wanted.length} character QA sheet(s)\n`);
let failed = 0;

for (const [comp, name, why] of wanted) {
  const out = `qa/characters/${name}.png`;
  const r = spawnSync('npx', ['remotion', 'still', comp, out, '--frame=0'], {
    encoding: 'utf8',
    shell: true,
    maxBuffer: 1 << 26,
  });
  const ok = r.status === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${out.padEnd(44)} ${why}`);
  if (!ok) {
    console.error(`${r.stdout || ''}${r.stderr || ''}`.split('\n').slice(-20).join('\n'));
  }
}

console.log(`\n${wanted.length - failed}/${wanted.length} rendered`);
process.exit(failed ? 1 : 0);
