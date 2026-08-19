#!/usr/bin/env node
/**
 * ingest-vendor-assets.mjs — run the whole V2 resolver chain on real third-party art.
 *
 *   node tools/ingest-vendor-assets.mjs [--force]
 *
 *   node_modules/lucide-static/icons/*.svg
 *        -> assets/vendor/lucide/     verbatim copy, the provenance record
 *        -> assets/normalized/        tools/normalize-svg.mjs   (SVGO + viewBox origin)
 *        -> assets/stylized/          tools/roughify-svg.mjs    (Rough.js, seeded by id)
 *        -> data/asset-registry.json  who it came from, what licence, what we did to it
 *
 * WHY a vendor stage exists at all. Drawing every icon by hand is the reason V1's asset
 * work dominated the schedule, and most icons carry no authorial value — a wallet is a
 * wallet. But dropping someone else's SVG straight into a video creates two problems that
 * only look small: it does not match the channel's hand, and nobody can later answer "where
 * did that come from and were we allowed to change it?". This tool answers both, per asset,
 * mechanically.
 *
 * The verbatim copy in assets/vendor/ is deliberate and is NOT dead weight: it is the only
 * artefact that proves what the upstream file looked like on the day it was ingested. When
 * lucide-static updates, the diff against that copy is the whole audit.
 *
 * `modified: true` in the registry is a licence-compliance statement, not a build flag.
 * Lucide is ISC — permissive, requires the copyright notice to travel with it, and says
 * nothing about modification. Recording that we DID modify it keeps the record honest for
 * the next asset source, whose licence may well care. Note that SVGO strips the upstream
 * `<!-- @license -->` comment during normalization, so the registry entry is where that
 * notice now lives; the run warns if ASSET_LICENSES.md has not caught up.
 *
 * Deterministic: the icon list is fixed and sorted, and every downstream stage is seeded
 * from the asset id. Re-running rewrites the same bytes and MERGES into the registry —
 * existing entries are updated in place and `usedIn` (which is maintained by scene code,
 * not by this tool) is preserved. Unrelated entries from other ingest tools survive.
 */

import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeSvg } from './normalize-svg.mjs';
import {
  roughifyFile, parseXml, assertSeedParity,
  STYLE_VERSION, ROUGH_LIB, REFERENCE_SIZE,
} from './roughify-svg.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (...p) => join(ROOT, ...p);
const posix = (p) => p.split('\\').join('/');

// ---------------------------------------------------------------------------
// the curated set
// ---------------------------------------------------------------------------
//
// Eight, not eighty. The channel explains *why casinos have no clocks*, so the useful
// vocabulary is time, attention and money — everything else would be inventory for its own
// sake. Each entry carries the tags a resolver would search on; the id is the search key.

const SOURCE_PKG = 'lucide-static';
const LICENSE = { license: 'ISC', licenseUrl: 'https://github.com/lucide-icons/lucide/blob/main/LICENSE' };

const ICONS = [
  { file: 'alarm-clock', tags: ['clock', 'time', 'alarm', 'urgency', 'wake'] },
  { file: 'clock', tags: ['clock', 'time', 'hours', 'the-thing-casinos-remove'] },
  { file: 'eye', tags: ['attention', 'watching', 'awareness', 'notice'] },
  { file: 'eye-off', tags: ['attention', 'unaware', 'hidden', 'not-noticing'] },
  { file: 'hourglass', tags: ['time', 'passing', 'running-out', 'patience'] },
  { file: 'moon', tags: ['night', 'time-of-day', 'outside-world', 'late'] },
  { file: 'sun', tags: ['day', 'daylight', 'time-of-day', 'outside-world'] },
  { file: 'wallet', tags: ['money', 'spending', 'loss', 'stakes'] },
].sort((a, b) => (a.file < b.file ? -1 : 1));

const VENDOR_DIR = rel('assets/vendor/lucide');
const NORMALIZED_DIR = rel('assets/normalized');
const STYLIZED_DIR = rel('assets/stylized');
const REGISTRY = rel('data/asset-registry.json');

// ---------------------------------------------------------------------------
// registry merge
// ---------------------------------------------------------------------------

/**
 * Load the registry as a Map keyed by id. A missing or unreadable file is a hard error
 * only if it exists and is corrupt — silently starting from scratch over a JSON typo would
 * wipe every hand-maintained `usedIn` list in the project.
 */
function loadRegistry() {
  if (!existsSync(REGISTRY)) return { assets: new Map(), extra: {} };
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(REGISTRY, 'utf8'));
  } catch (err) {
    throw new Error(`data/asset-registry.json exists but is not valid JSON (${err.message}). Fix or delete it — refusing to overwrite.`);
  }
  const list = Array.isArray(parsed.assets) ? parsed.assets : [];
  return { assets: new Map(list.map((a) => [a.id, a])) };
}

function writeRegistry(assets) {
  const list = [...assets.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const tally = (key) =>
    list.reduce((acc, a) => {
      const k = a[key] ?? 'unknown';
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});

  const doc = {
    note:
      'Generated by tools/ingest-vendor-assets.mjs — a merge target, not a snapshot. ' +
      'Re-running updates entries in place; `usedIn` is maintained by scene code and is never overwritten here.',
    generatedBy: 'tools/ingest-vendor-assets.mjs',
    styleVersion: STYLE_VERSION,
    stylizer: ROUGH_LIB,
    counts: {
      total: list.length,
      normalized: list.filter((a) => a.normalized).length,
      stylized: list.filter((a) => a.stylized).length,
      stale: list.filter((a) => a.styleVersion !== STYLE_VERSION).length,
      byType: tally('type'),
      bySource: tally('source'),
      byLicense: tally('license'),
    },
    assets: list,
  };

  mkdirSync(dirname(REGISTRY), { recursive: true });
  writeFileSync(REGISTRY, JSON.stringify(doc, null, 2) + '\n');
  return doc;
}

// ---------------------------------------------------------------------------
// output validation — cheap, and the only thing standing between a broken asset and a render
// ---------------------------------------------------------------------------

function assertValidSvg(file, label) {
  const text = readFileSync(file, 'utf8');
  const svg = parseXml(text); // throws on malformed / mismatched / unclosed tags
  if (!svg.attrs.viewBox) throw new Error(`${label} lost its viewBox`);
  if (!/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(text)) throw new Error(`${label} has no SVG namespace`);
  const count = (node) =>
    node.children.reduce((acc, c) => acc + (c.tag === 'path' ? 1 : 0) + count(c), 0);
  const paths = count(svg);
  if (paths === 0) throw new Error(`${label} contains no drawn paths`);
  return { paths, viewBox: svg.attrs.viewBox };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main(argv) {
  const force = argv.includes('--force');
  assertSeedParity();

  const iconsDir = rel('node_modules', SOURCE_PKG, 'icons');
  if (!existsSync(iconsDir)) {
    throw new Error(`${SOURCE_PKG} is not installed — expected ${posix(iconsDir)}`);
  }

  const pkgVersion = JSON.parse(readFileSync(rel('node_modules', SOURCE_PKG, 'package.json'), 'utf8')).version;
  const source = `${SOURCE_PKG}@${pkgVersion}`;

  // Verify the whole curated set BEFORE writing anything. A half-ingested set is worse
  // than a failed one, because the registry would then claim assets that are not there.
  const missing = ICONS.filter((i) => !existsSync(join(iconsDir, `${i.file}.svg`)));
  if (missing.length) {
    throw new Error(
      `these icons do not exist in ${source}: ${missing.map((m) => m.file).join(', ')} — ` +
        'check the upstream names before re-running',
    );
  }

  for (const dir of [VENDOR_DIR, NORMALIZED_DIR, STYLIZED_DIR]) mkdirSync(dir, { recursive: true });

  const { assets } = loadRegistry();
  const rows = [];

  for (const icon of ICONS) {
    const id = `vendor-lucide-${icon.file}`;
    const upstream = join(iconsDir, `${icon.file}.svg`);

    // 1. provenance copy — byte-for-byte, never touched again
    const vendorFile = join(VENDOR_DIR, `${icon.file}.svg`);
    copyFileSync(upstream, vendorFile);

    // 2. normalize
    const norm = normalizeSvg(readFileSync(vendorFile, 'utf8'), `${icon.file}.svg`);
    const normFile = join(NORMALIZED_DIR, `${icon.file}.svg`);
    writeFileSync(normFile, norm.svg);
    assertValidSvg(normFile, `assets/normalized/${icon.file}.svg`);

    // 3. roughify (cached unless --force)
    const stylizedFile = join(STYLIZED_DIR, `${icon.file}.svg`);
    const rough = roughifyFile(normFile, stylizedFile, { force });
    const check = assertValidSvg(stylizedFile, `assets/stylized/${icon.file}.svg`);
    if (rough.skipped.length) {
      throw new Error(`${icon.file}: stylizer could not handle <${rough.skipped.join('>, <')}>`);
    }

    // 4. registry entry — merged over whatever was already recorded
    const previous = assets.get(id) ?? {};
    assets.set(id, {
      id,
      type: 'icon',
      tags: icon.tags,
      source,
      sourcePath: posix(`node_modules/${SOURCE_PKG}/icons/${icon.file}.svg`),
      ...LICENSE,
      modified: true,
      vendorPath: posix(`assets/vendor/lucide/${icon.file}.svg`),
      normalized: true,
      normalizedPath: posix(`assets/normalized/${icon.file}.svg`),
      normalizedViewBox: norm.normalized.viewBox,
      stylized: true,
      stylizedPath: posix(`assets/stylized/${icon.file}.svg`),
      stylizer: ROUGH_LIB,
      seed: rough.seed,
      styleVersion: STYLE_VERSION,
      // `usedIn` belongs to the scenes, not to the ingest. Never clobber it.
      usedIn: previous.usedIn ?? [],
    });

    rows.push({
      id: icon.file,
      bytesVendor: norm.bytesBefore,
      bytesNorm: norm.bytesAfter,
      shapes: rough.shapes,
      paths: check.paths,
      seed: rough.seed,
      cached: rough.cached,
    });
  }

  const doc = writeRegistry(assets);

  // ---- report ----
  const w = Math.max(5, ...rows.map((r) => r.id.length));
  console.log(`ingested ${rows.length} vendor asset(s) from ${source}  (${LICENSE.license})\n`);
  console.log(
    `  ${'icon'.padEnd(w)}  ${'vendor'.padStart(7)}  ${'norm'.padStart(7)}  ` +
      `${'saved'.padStart(6)}  ${'shapes'.padStart(6)}  ${'paths'.padStart(5)}  ${'seed'.padStart(11)}  state`,
  );
  console.log(
    `  ${'-'.repeat(w)}  ${'-'.repeat(7)}  ${'-'.repeat(7)}  ${'-'.repeat(6)}  ` +
      `${'-'.repeat(6)}  ${'-'.repeat(5)}  ${'-'.repeat(11)}  -----`,
  );
  for (const r of rows) {
    console.log(
      `  ${r.id.padEnd(w)}  ${String(r.bytesVendor).padStart(7)}  ${String(r.bytesNorm).padStart(7)}  ` +
        `${(((1 - r.bytesNorm / r.bytesVendor) * 100).toFixed(0) + '%').padStart(6)}  ` +
        `${String(r.shapes).padStart(6)}  ${String(r.paths).padStart(5)}  ${String(r.seed).padStart(11)}  ` +
        `${r.cached ? 'cached' : 'stylized'}`,
    );
  }

  console.log('\n  wrote:');
  console.log(`    assets/vendor/lucide/     ${rows.length} verbatim copies (provenance)`);
  console.log(`    assets/normalized/        ${rows.length} SVGO-normalized, viewBox origin at 0 0`);
  console.log(`    assets/stylized/          ${rows.length} Rough.js-stylized, ${ROUGH_LIB}, reference size ${REFERENCE_SIZE}`);
  console.log(`    data/asset-registry.json  ${doc.counts.total} entries (${rows.length} touched this run)`);
  console.log(
    `\n  registry: ${doc.counts.normalized} normalized, ${doc.counts.stylized} stylized, ` +
      `${doc.counts.stale} stale vs styleVersion '${STYLE_VERSION}'`,
  );
  console.log(`  licences: ${Object.entries(doc.counts.byLicense).map(([k, v]) => `${k} x${v}`).join(', ')}`);
  console.log('\n  every stylized SVG parsed, kept its viewBox and contains drawn paths.');

  // The channel's licence ledger is a human document; this tool will not edit it, but it
  // will not let it quietly become wrong either. ASSET_LICENSES.md currently states that
  // there is no third-party illustration in this project — after this run, there is.
  const ledger = rel('ASSET_LICENSES.md');
  if (existsSync(ledger) && !readFileSync(ledger, 'utf8').toLowerCase().includes(SOURCE_PKG)) {
    console.log(
      `\n  NOTE: ASSET_LICENSES.md does not mention ${source}. ` +
        `Add it — ${LICENSE.license}, ${LICENSE.licenseUrl} — the ISC notice must travel with the art.`,
    );
  }
}

try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(`ingest-vendor-assets failed: ${err.message}`);
  process.exit(1);
}
