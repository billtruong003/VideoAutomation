#!/usr/bin/env node
/**
 * normalize-svg.mjs — put any incoming SVG into the one shape the rest of V2 assumes.
 *
 *   node tools/normalize-svg.mjs <input.svg|input-dir> <output-dir> [--shapes-to-paths] [--precision 3]
 *
 * Stage 1 of the V2 asset resolver chain (normalize -> roughify -> register).
 *
 * WHY this exists at all: third-party SVGs are not a format, they are a rumour. Illustrator
 * writes `<metadata>` blocks and `<!-- Generator: -->` comments; Figma writes nested groups
 * with identity transforms; Lucide writes a pretty-printed 24x24 grid with a class attribute.
 * The stylizer downstream walks the element tree and roughens every primitive it finds, so
 * every one of those variations turns into a different bug. Normalising first means the
 * roughifier only ever has to understand ONE dialect of SVG.
 *
 * Two normalisations happen here, and they are different things:
 *
 *   1. SVGO — removes cruft, collapses useless groups, cleans path data.
 *   2. viewBox origin — an SVG authored at `viewBox="-80 -150 160 220"` and one authored at
 *      `viewBox="0 0 160 220"` describe the same picture, but every consumer that wants to
 *      place, scale or crop the asset has to special-case the offset. So the origin is moved
 *      to (0,0) and the content is wrapped in the compensating translate. Nothing moves on
 *      screen; the coordinate system just stops being a surprise.
 *
 * Two deliberate departures from SVGO's defaults, both about the NEXT stage:
 *
 *   - `cleanupIds` is OFF. Ids are how a scene reaches inside an asset ("the minute hand").
 *     SVGO's id minification is safe only when it can see every reference, and it cannot see
 *     the React code that will reference them. Renaming `#minute-hand` to `#b` is not a
 *     saving, it is a broken asset.
 *   - `convertShapeToPath` is OFF by default. Rough.js draws a `circle` better than it draws
 *     the *path* of a circle — it knows the shape's construction and can wobble it as an arc
 *     rather than as a chain of beziers. Throwing away `<circle>`/`<rect>`/`<line>` before
 *     roughening is discarding exactly the information the stylizer wants. Pass
 *     `--shapes-to-paths` if a downstream consumer genuinely needs paths only.
 *
 * Deterministic: same bytes in, same bytes out. No timestamps, no randomness.
 */

import { optimize } from 'svgo';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// svgo configuration
// ---------------------------------------------------------------------------

/** Build the SVGO config. Split out so the ingest tool can reuse the exact same one. */
export function svgoConfig({ shapesToPaths = false, precision = 3 } = {}) {
  return {
    multipass: true,
    js2svg: { pretty: false, eol: 'lf', finalNewline: false },
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            // NOTE: `removeViewBox` is NOT part of preset-default in svgo 4 — the viewBox
            // survives by default, and listing it here only earns a warning. It is
            // asserted for real by normalizeViewBox() below, which is the honest check.
            // see header: ids are a public API of an asset
            cleanupIds: false,
            // see header: primitives roughen better than their path equivalents
            convertShapeToPath: shapesToPaths ? { convertArcs: false } : false,
            // keep numbers tight but not lossy at 24px grids
            cleanupNumericValues: { floatPrecision: precision },
            convertPathData: { floatPrecision: precision, forceAbsolutePath: false },
            convertTransform: { floatPrecision: precision },
          },
        },
      },
      // editor cruft / active content that preset-default deliberately leaves alone
      'removeScripts',
      // stable attribute order => byte-identical output across runs and machines
      'sortAttrs',
    ],
  };
}

// ---------------------------------------------------------------------------
// viewBox normalisation
// ---------------------------------------------------------------------------

const ATTR_RE = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

/** Attributes of the root `<svg>` open tag, plus the byte range that tag occupies. */
function rootTag(svg) {
  const open = svg.indexOf('<svg');
  if (open === -1) throw new Error('no <svg> root element');
  const close = svg.indexOf('>', open);
  if (close === -1) throw new Error('unterminated <svg> open tag');
  const raw = svg.slice(open, close + 1);
  const attrs = {};
  let m;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(raw)) !== null) attrs[m[1]] = m[2] ?? m[3] ?? '';
  return { attrs, start: open, bodyStart: close + 1 };
}

const num = (s) => {
  const v = Number.parseFloat(s);
  return Number.isFinite(v) ? v : null;
};

/** Round away float noise so `-0` and `12.000000001` never reach the output. */
const round = (v, p) => {
  const r = Number(v.toFixed(p));
  return Object.is(r, -0) ? 0 : r;
};

/**
 * Move the viewBox origin to (0,0), compensating with a translate on the content.
 * Returns the rewritten SVG plus the before/after geometry for the report.
 */
export function normalizeViewBox(svg, precision = 3) {
  const { attrs, start, bodyStart } = rootTag(svg);

  let vb = attrs.viewBox
    ? attrs.viewBox.trim().split(/[\s,]+/).map(num)
    : null;

  if (!vb || vb.length !== 4 || vb.some((v) => v === null)) {
    // No usable viewBox — synthesise one from width/height, which is the only other
    // statement the file makes about its own size.
    const w = num(attrs.width ?? '');
    const h = num(attrs.height ?? '');
    if (w === null || h === null) {
      throw new Error('SVG has neither a usable viewBox nor numeric width/height');
    }
    vb = [0, 0, w, h];
  }

  const [minX, minY, vbW, vbH] = vb;
  if (!(vbW > 0 && vbH > 0)) throw new Error(`degenerate viewBox: ${vb.join(' ')}`);

  const bodyEnd = svg.lastIndexOf('</svg>');
  if (bodyEnd === -1) throw new Error('no closing </svg>');
  let body = svg.slice(bodyStart, bodyEnd);

  const dx = round(-minX, precision);
  const dy = round(-minY, precision);
  const shifted = dx !== 0 || dy !== 0;
  if (shifted) body = `<g transform="translate(${dx} ${dy})">${body}</g>`;

  const w = round(vbW, precision);
  const h = round(vbH, precision);

  // Rebuild the root tag from scratch: fixed attribute order is what makes the output
  // byte-stable regardless of how the source happened to order things.
  const keep = Object.entries(attrs)
    .filter(([k]) => !['width', 'height', 'viewBox', 'xmlns', 'version', 'x', 'y'].includes(k))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => ` ${k}="${v}"`)
    .join('');

  const root =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"${keep}>`;

  return {
    svg: svg.slice(0, start) + root + body + '</svg>',
    original: { viewBox: vb.join(' '), width: num(attrs.width ?? '') ?? vbW, height: num(attrs.height ?? '') ?? vbH },
    normalized: { viewBox: `0 0 ${w} ${h}`, width: w, height: h },
    shifted,
  };
}

// ---------------------------------------------------------------------------
// the one public operation
// ---------------------------------------------------------------------------

/**
 * Normalize one SVG source string.
 * `name` is only used for SVGO's error messages, never for output content.
 */
export function normalizeSvg(source, name = 'asset.svg', opts = {}) {
  const res = optimize(source, { path: name, ...svgoConfig(opts) });
  if (res.error) throw new Error(`svgo failed: ${res.error}`);

  const vb = normalizeViewBox(res.data, opts.precision ?? 3);

  return {
    svg: vb.svg + '\n',
    bytesBefore: Buffer.byteLength(source, 'utf8'),
    bytesAfter: Buffer.byteLength(vb.svg + '\n', 'utf8'),
    original: vb.original,
    normalized: vb.normalized,
    shifted: vb.shifted,
  };
}

// ---------------------------------------------------------------------------
// cli
// ---------------------------------------------------------------------------

/** Every .svg under `target`, or just `target` if it is a file. Sorted => stable order. */
export function collectSvgs(target) {
  const abs = resolve(target);
  if (!existsSync(abs)) throw new Error(`input not found: ${target}`);
  if (statSync(abs).isDirectory()) {
    return readdirSync(abs)
      .filter((f) => f.toLowerCase().endsWith('.svg'))
      .sort()
      .map((f) => join(abs, f));
  }
  return [abs];
}

export const pad = (s, n) => String(s).padEnd(n);
export const padL = (s, n) => String(s).padStart(n);

function main(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--shapes-to-paths') flags.shapesToPaths = true;
    else if (a === '--precision') flags.precision = Number(argv[++i]);
    else if (a.startsWith('--')) throw new Error(`unknown flag: ${a}`);
    else positional.push(a);
  }

  const [input, outDir] = positional;
  if (!input || !outDir) {
    console.error('usage: node tools/normalize-svg.mjs <input.svg|input-dir> <output-dir> [--shapes-to-paths] [--precision 3]');
    process.exit(1);
  }

  const files = collectSvgs(input);
  if (files.length === 0) throw new Error(`no .svg files found in ${input}`);

  mkdirSync(resolve(outDir), { recursive: true });

  const rows = [];
  const failures = [];

  for (const file of files) {
    const name = basename(file);
    try {
      const r = normalizeSvg(readFileSync(file, 'utf8'), name, flags);
      writeFileSync(join(resolve(outDir), name), r.svg);
      rows.push({ name, ...r });
    } catch (err) {
      failures.push({ name, message: err.message });
    }
  }

  // ---- report ----
  const nameW = Math.max(4, ...rows.map((r) => r.name.length));
  console.log(`normalized ${rows.length} SVG file(s) -> ${outDir}\n`);
  console.log(
    `  ${pad('file', nameW)}  ${padL('before', 8)}  ${padL('after', 8)}  ${padL('saved', 7)}  ${pad('viewBox', 22)}  ${'normalized'}`,
  );
  console.log(`  ${'-'.repeat(nameW)}  ${'-'.repeat(8)}  ${'-'.repeat(8)}  ${'-'.repeat(7)}  ${'-'.repeat(22)}  ${'-'.repeat(14)}`);

  let before = 0;
  let after = 0;
  for (const r of rows) {
    before += r.bytesBefore;
    after += r.bytesAfter;
    const savedPct = ((1 - r.bytesAfter / r.bytesBefore) * 100).toFixed(1);
    console.log(
      `  ${pad(r.name, nameW)}  ${padL(r.bytesBefore, 8)}  ${padL(r.bytesAfter, 8)}  ${padL(savedPct + '%', 7)}  ` +
        `${pad(r.original.viewBox, 22)}  ${r.normalized.viewBox}${r.shifted ? '  (origin shifted)' : ''}`,
    );
  }

  if (rows.length) {
    console.log(`  ${'-'.repeat(nameW)}  ${'-'.repeat(8)}  ${'-'.repeat(8)}  ${'-'.repeat(7)}`);
    console.log(
      `  ${pad('TOTAL', nameW)}  ${padL(before, 8)}  ${padL(after, 8)}  ${padL(((1 - after / before) * 100).toFixed(1) + '%', 7)}`,
    );
  }

  if (failures.length) {
    console.error(`\nNORMALIZE FAILED for ${failures.length} file(s):`);
    for (const f of failures) console.error(`  ${f.name}: ${f.message}`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(`normalize-svg failed: ${err.message}`);
    process.exit(1);
  }
}
