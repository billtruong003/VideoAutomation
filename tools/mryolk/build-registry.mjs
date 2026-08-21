#!/usr/bin/env node
/**
 * build-registry.mjs — join the extraction facts to the semantic taxonomy.
 *
 *   node tools/mryolk/build-registry.mjs
 *
 * The extractor knows where every drawing came from and what it hashes to. The taxonomy knows
 * what each one means. Neither is useful to a scene on its own, so this merges them into the
 * single registry the renderer imports, and — more importantly — it FAILS when they disagree.
 *
 * The failure cases it catches are the ones that quietly ruin an edit:
 *
 *   a cell with no meaning       an asset nothing can ever address, i.e. wasted art
 *   a meaning with no cell       a scene referencing a drawing that does not exist
 *   a duplicated slug            two drawings answering to one name, so which one appears
 *                                depends on iteration order
 *
 * All three are cheap to detect here and expensive to notice at minute nine of a render.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR } from './config.mjs';
import { TAXONOMY } from './taxonomy.mjs';

const extraction = JSON.parse(readFileSync(join(DATA_DIR, 'sheet-extraction.json'), 'utf8'));

const byCell = new Map(extraction.assets.map((a) => [a.id, a]));
const meanings = new Map();
const problems = [];

for (const [cell, slug, category, ...tags] of TAXONOMY) {
  if (meanings.has(slug)) problems.push(`duplicate slug "${slug}" (${meanings.get(slug).cell} and ${cell})`);
  if (!byCell.has(cell)) problems.push(`taxonomy names cell "${cell}", which was not extracted`);
  meanings.set(slug, { cell, category, tags });
}
for (const a of extraction.assets) {
  if (![...meanings.values()].some((m) => m.cell === a.id)) problems.push(`cell "${a.id}" has no meaning`);
}

if (problems.length) {
  console.error(`registry rejected — ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

const assets = [...meanings.entries()].map(([slug, m]) => {
  const a = byCell.get(m.cell);
  return {
    slug,
    cell: m.cell,
    category: m.category,
    tags: m.tags,
    sheet: a.sheet,
    sourceCrop: a.sourceCrop,
    file: a.file,
    width: a.width,
    height: a.height,
    sha256: a.sha256,
  };
});

const byCategory = assets.reduce((acc, a) => {
  acc[a.category] = (acc[a.category] ?? 0) + 1;
  return acc;
}, {});
const tagCounts = assets.flatMap((a) => a.tags).reduce((acc, t) => {
  acc[t] = (acc[t] ?? 0) + 1;
  return acc;
}, {});

const registry = {
  version: 1,
  backgroundRemoval: extraction.backgroundRemoval,
  generatedFrom: 'data/mryolk/sheet-extraction.json + tools/mryolk/taxonomy.mjs',
  counts: { assets: assets.length, byCategory },
  tags: Object.fromEntries(Object.entries(tagCounts).sort((a, b) => b[1] - a[1])),
  assets: assets.sort((a, b) => a.slug.localeCompare(b.slug)),
};

writeFileSync(join(DATA_DIR, 'asset-registry.json'), `${JSON.stringify(registry, null, 2)}\n`);

console.log(`registry OK — ${assets.length} assets`);
for (const [cat, n] of Object.entries(byCategory)) console.log(`  ${cat.padEnd(20)} ${n}`);
console.log(`  ${Object.keys(tagCounts).length} distinct tags`);
