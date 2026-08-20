#!/usr/bin/env node
/**
 * fix-character-ground.mjs — one-shot: lift every character clear of the caption band.
 *
 * `DoodleCharacter`'s `y` is the character's HIP, not their feet — the rig puts the hip at
 * the origin with roughly 34 units of leg below it. Batch 001's scene files were authored as
 * though `y` were the ground line, so every wide shot sat about 34*scale pixels lower than
 * intended and the captions at y≈1442 crossed characters' shins, waists and in one case
 * Bill's chin. That last one is a straight violation of the framing rules in CHARACTER_BIBLE.
 *
 * Rather than re-eyeball forty placements, this computes the correct hip from a target FEET
 * line and clamps. It only ever raises a character, so deliberately high placements — Mochi
 * on a shelf, a character in the far background — are left exactly as they are.
 *
 * Run once. The corrected numbers then live in the scene files.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';

/** Feet must land above the caption band, which starts around y=1405. */
const FEET_LIMIT = 1372;
/** Units of leg below the hip in the shared rig. */
const LEG_BELOW_HIP = 34;

const DIR = 'src/episodes';
let changed = 0;

for (const slug of readdirSync(DIR)) {
  const file = `${DIR}/${slug}/scenes.tsx`;
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  const out = src.replace(/<DoodleCharacter\b[\s\S]*?\/>/g, (block) => {
    const yM = /\by=\{(-?[\d.]+)\}/.exec(block);
    const sM = /\bscale=\{(-?[\d.]+)\}/.exec(block);
    if (!yM || !sM) return block;

    const y = Number(yM[1]);
    const scale = Number(sM[1]);
    const maxHip = Math.round(FEET_LIMIT - LEG_BELOW_HIP * scale);
    if (y <= maxHip) return block;

    changed++;
    const who = /character="(\w+)"/.exec(block)?.[1] ?? '?';
    console.log(`  ${slug.padEnd(22)} ${who.padEnd(6)} y ${y} -> ${maxHip}  (scale ${scale})`);
    return block.replace(/\by=\{-?[\d.]+\}/, `y={${maxHip}}`);
  });

  if (out !== src) writeFileSync(file, out);
}

console.log(`\n${changed} character placements raised clear of the caption band.`);
