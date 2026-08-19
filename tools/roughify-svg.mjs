#!/usr/bin/env node
/**
 * roughify-svg.mjs — turn a clean normalized SVG into the channel's hand-drawn version.
 *
 *   node tools/roughify-svg.mjs <input.svg|input-dir> <output-dir> [--roughness 1.4] [--bowing 1.6] [--force]
 *
 * Stage 2 of the V2 asset resolver chain (normalize -> roughify -> register). This is the
 * step that makes a third-party icon look like it was drawn by the same hand as everything
 * else: DESIGN CLEANLY, RENDER IMPERFECTLY (see src/style/tokens.ts).
 *
 * ---------------------------------------------------------------------------
 * HONEST NOTE ON svg2roughjs — READ THIS BEFORE ASSUMING A DEPENDENCY
 * ---------------------------------------------------------------------------
 * `svg2roughjs@3.2.3` is in package.json and it is NOT used by this tool. It was tried
 * first and rejected for three independently fatal reasons, all verified by running it:
 *
 *   1. It does not load under Node ESM at all. Its package `main` points at a UMD bundle,
 *      so `import('svg2roughjs')` resolves to a module with ZERO exports
 *      (`m.Svg2Roughjs is not a constructor`). Importing `dist/svg2roughjs.es.js` directly
 *      fails too: that build has bundler-only extensionless imports
 *      (`Cannot find module '.../roughjs/bin/rough'`).
 *   2. Even bundled, it is browser-only by design. It calls `document.createElement`,
 *      `window.getComputedStyle`, `SVGGraphicsElement.getBBox()`, `new Image()` and a 2D
 *      canvas. jsdom implements none of the SVG geometry interfaces (`getBBox` returns
 *      nothing useful), so it would need jsdom PLUS node-canvas — two heavyweight native
 *      dependencies to render a 24x24 icon.
 *   3. Minor, and stated fairly: it CAN be made deterministic — `Svg2Roughjs` has a `seed`
 *      property (it defaults to `null`, i.e. unseeded, which would break byte-identical
 *      output, but that is fixable). One seed applies to the whole document rather than
 *      per-shape identity, which is a small loss. This was not the reason for rejecting it;
 *      (1) and (2) were.
 *
 * So this tool implements the equivalent directly: parse the SVG, walk its drawable
 * elements, feed each through Rough.js's own generator, emit the result as a new SVG.
 * `roughjs` is imported directly here rather than bundling `src/rough/generator.ts` through
 * esbuild — that module's cache and `RoughPath` shape are tuned for per-frame React
 * rendering, and a one-shot CLI has nothing to gain from it. The one thing that DOES matter
 * for consistency, the seeding rule, is reimplemented byte-for-byte from
 * `seedFrom()`/`hashString()` (FNV-1a, mod 2^31-1, 0 mapped to 1) so a tool-stylized asset
 * and a runtime-stylized asset agree on what seed an identity means. That parity is
 * asserted at startup by `assertSeedParity()` against the values in src/, so if either side
 * changes, this tool fails loudly instead of drifting.
 * ---------------------------------------------------------------------------
 *
 * Determinism: the seed comes from the asset id (the filename) and the shape's index in
 * document order — never from a counter, a clock or Math.random. Re-running overwrites with
 * identical bytes. The output carries a content-addressed cache key in its header comment;
 * a second run with the same input, options and STYLE_VERSION is skipped rather than
 * recomputed. `--force` bypasses the cache (that is what the determinism check uses).
 */

import rough from 'roughjs';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { basename, extname, join, resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

/** Bump when the emitted geometry changes, so stale caches are invalidated. */
export const ROUGHIFY_VERSION = 'roughify-1';
export const ROUGH_LIB = 'roughjs@4.6.6';

// ---------------------------------------------------------------------------
// style contract — read from src/style/tokens.ts, never duplicated by hand
// ---------------------------------------------------------------------------

function readToken(re, what) {
  const src = readFileSync(join(ROOT, 'src/style/tokens.ts'), 'utf8');
  const m = src.match(re);
  if (!m) throw new Error(`could not read ${what} from src/style/tokens.ts`);
  return m[1];
}

export const STYLE_VERSION = readToken(/export const STYLE_VERSION = '([^']+)'/, 'STYLE_VERSION');
/** `currentColor` has no meaning in a standalone file; the channel's answer is ink. */
export const INK = readToken(/ink:\s*'(#[0-9A-Fa-f]{3,8})'/, 'PALETTE.ink');

// ---------------------------------------------------------------------------
// seeding — must agree with src/lib/rand.ts + src/rough/generator.ts
// ---------------------------------------------------------------------------

/** FNV-1a, identical to hashString() in src/lib/rand.ts. */
export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Identical to seedFrom() in src/rough/generator.ts. */
export function seedFrom(identity) {
  const h = hashString(identity) % 2147483647;
  return h === 0 ? 1 : h;
}

/**
 * Guard against the copy above silently diverging from src/. Cheap, and the alternative
 * (assets stylized with a seed the runtime would never produce) is invisible until it
 * matters.
 */
export function assertSeedParity() {
  const rand = readFileSync(join(ROOT, 'src/lib/rand.ts'), 'utf8');
  const gen = readFileSync(join(ROOT, 'src/rough/generator.ts'), 'utf8');
  const ok =
    /h = 2166136261 >>> 0/.test(rand) &&
    /Math\.imul\(h, 16777619\) >>> 0/.test(rand) &&
    /hashString\(identity\) % 2147483647/.test(gen) &&
    /h === 0 \? 1 : h/.test(gen);
  if (!ok) {
    throw new Error(
      'seed parity check FAILED — src/lib/rand.ts or src/rough/generator.ts changed its ' +
        'hashing/seeding rule. Update seedFrom()/hashString() in tools/roughify-svg.mjs to match.',
    );
  }
}

// ---------------------------------------------------------------------------
// a very small XML reader
// ---------------------------------------------------------------------------
//
// Deliberately not a general XML parser. Its only input is SVGO output from
// tools/normalize-svg.mjs — well-formed, no DTD, no entities beyond the standard five —
// which is precisely why normalization is a separate, mandatory stage.

const TOKEN_RE =
  /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<!DOCTYPE[^>]*>|<\/([A-Za-z_][\w:.-]*)\s*>|<([A-Za-z_][\w:.-]*)((?:\s+[^\s/>=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;
const ATTR_RE = /([^\s=/]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

function parseAttrs(raw) {
  const attrs = {};
  let m;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(raw)) !== null) attrs[m[1]] = decodeEntities(m[2] ?? m[3] ?? '');
  return attrs;
}

const decodeEntities = (s) =>
  s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-fA-F]+);/g, (_, e) => {
    if (e === 'lt') return '<';
    if (e === 'gt') return '>';
    if (e === 'amp') return '&';
    if (e === 'quot') return '"';
    if (e === 'apos') return "'";
    return String.fromCodePoint(Number(e[1] === 'x' ? `0${e.slice(1)}` : e.slice(1)));
  });

export function parseXml(src) {
  const root = { tag: '#root', attrs: {}, children: [] };
  const stack = [root];
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(src)) !== null) {
    const [full, closeTag, openTag, rawAttrs, selfClose] = m;
    if (closeTag) {
      const top = stack[stack.length - 1];
      if (stack.length === 1 || top.tag !== closeTag) {
        throw new Error(`mismatched </${closeTag}> (open element is <${top.tag}>)`);
      }
      stack.pop();
    } else if (openTag) {
      const node = { tag: openTag, attrs: parseAttrs(rawAttrs ?? ''), children: [] };
      stack[stack.length - 1].children.push(node);
      if (!selfClose) stack.push(node);
    } else {
      void full; // comment / prolog / doctype / cdata — nothing drawable
    }
  }
  if (stack.length !== 1) throw new Error(`unclosed element <${stack[stack.length - 1].tag}>`);
  const svg = root.children.find((c) => c.tag === 'svg');
  if (!svg) throw new Error('no <svg> root element');
  return svg;
}

// ---------------------------------------------------------------------------
// style resolution
// ---------------------------------------------------------------------------

const PRESENTATION = [
  'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'opacity', 'fill-opacity', 'stroke-opacity', 'fill-rule',
];

/** Merge a node's presentation attributes (and any inline `style`) over the inherited set. */
function resolveStyle(inherited, attrs) {
  const out = { ...inherited };
  for (const k of PRESENTATION) if (attrs[k] !== undefined) out[k] = attrs[k];
  if (attrs.style) {
    for (const decl of attrs.style.split(';')) {
      const i = decl.indexOf(':');
      if (i === -1) continue;
      const k = decl.slice(0, i).trim();
      if (PRESENTATION.includes(k)) out[k] = decl.slice(i + 1).trim();
    }
  }
  // `opacity` is NOT inherited in SVG — it composites. Multiplying it down the tree is the
  // closest a flattened output can get, and it is what a browser renders for these files.
  if (attrs.opacity !== undefined || (attrs.style ?? '').includes('opacity')) {
    out.opacity = String(Number(inherited.opacity ?? 1) * Number(out.opacity ?? 1));
  }
  return out;
}

/**
 * SVG paint -> a colour Rough.js can use, or `'none'`.
 * Defaults follow the SVG spec (fill defaults to black, stroke to none) rather than being
 * invented here, so an asset roughens into what a browser would have shown.
 */
function paint(value, fallback) {
  const v = String(value ?? fallback ?? 'none').trim();
  if (v === '' || v === 'none' || v === 'transparent') return 'none';
  if (v === 'currentColor') return INK;
  // url(#gradient) cannot survive roughening — a squiggle has no gradient stops.
  if (v.startsWith('url(')) return INK;
  return v;
}

// ---------------------------------------------------------------------------
// geometry -> Rough.js
// ---------------------------------------------------------------------------

const generator = rough.generator();
const n = (v, d = 0) => {
  const x = Number.parseFloat(v);
  return Number.isFinite(x) ? x : d;
};

function points(raw) {
  const parts = String(raw ?? '').trim().split(/[\s,]+/).filter(Boolean).map(Number);
  const pts = [];
  for (let i = 0; i + 1 < parts.length; i += 2) pts.push([parts[i], parts[i + 1]]);
  return pts;
}

/** Rounded rect as a path — Rough.js rectangles are always square-cornered. */
function roundedRectPath(x, y, w, h, rx, ry) {
  const a = Math.min(rx, w / 2);
  const b = Math.min(ry, h / 2);
  return (
    `M ${x + a} ${y} H ${x + w - a} A ${a} ${b} 0 0 1 ${x + w} ${y + b} ` +
    `V ${y + h - b} A ${a} ${b} 0 0 1 ${x + w - a} ${y + h} ` +
    `H ${x + a} A ${a} ${b} 0 0 1 ${x} ${y + h - b} ` +
    `V ${y + b} A ${a} ${b} 0 0 1 ${x + a} ${y} Z`
  );
}

/**
 * Rough.js `roughness` is in ABSOLUTE user units, not relative to the drawing. Passing 1.4
 * to a 24-unit Lucide icon displaces strokes by ~6% of the icon and pushes them outside the
 * viewBox; passing the same 1.4 to a 1080-unit background is invisible. So the number the
 * caller gives is defined at a reference size — 100 units, the scale this channel's props
 * are authored at (see tools/export-svg-assets.mjs: props export at 60–240) — and is scaled
 * to whatever the asset actually is. Clamped so a pathological viewBox cannot produce
 * either a clean line or a hairball. `--reference-size 0` opts out and passes the raw value.
 */
export const REFERENCE_SIZE = 100;
const SCALE_CLAMP = [0.12, 8];

export function scaleFor(vbW, vbH, referenceSize = REFERENCE_SIZE) {
  if (!referenceSize) return 1;
  const s = Math.min(vbW, vbH) / referenceSize;
  return Math.min(SCALE_CLAMP[1], Math.max(SCALE_CLAMP[0], s));
}

const DRAWABLE = new Set(['rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'path']);
/** Containers whose children are drawn. */
const CONTAINER = new Set(['svg', 'g', 'a', 'switch']);
/** Silently ignored: definitions and metadata, none of which render on their own. */
const IGNORED = new Set(['defs', 'metadata', 'title', 'desc', 'style', 'script', 'clipPath', 'mask', 'filter', 'linearGradient', 'radialGradient', 'pattern', 'symbol', 'marker']);

function drawableToRough(node, opts) {
  const a = node.attrs;
  switch (node.tag) {
    case 'rect': {
      const x = n(a.x), y = n(a.y), w = n(a.width), h = n(a.height);
      if (!(w > 0 && h > 0)) return null;
      const rx = n(a.rx, n(a.ry, 0));
      const ry = n(a.ry, rx);
      return rx > 0 || ry > 0
        ? generator.path(roundedRectPath(x, y, w, h, rx, ry), opts)
        : generator.rectangle(x, y, w, h, opts);
    }
    case 'circle': {
      const r = n(a.r);
      return r > 0 ? generator.circle(n(a.cx), n(a.cy), r * 2, opts) : null;
    }
    case 'ellipse': {
      const rx = n(a.rx), ry = n(a.ry);
      return rx > 0 && ry > 0 ? generator.ellipse(n(a.cx), n(a.cy), rx * 2, ry * 2, opts) : null;
    }
    case 'line':
      return generator.line(n(a.x1), n(a.y1), n(a.x2), n(a.y2), opts);
    case 'polygon': {
      const p = points(a.points);
      return p.length >= 3 ? generator.polygon(p, opts) : null;
    }
    case 'polyline': {
      const p = points(a.points);
      return p.length >= 2 ? generator.linearPath(p, opts) : null;
    }
    case 'path':
      return a.d && a.d.trim() ? generator.path(a.d, opts) : null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// emit
// ---------------------------------------------------------------------------

const xmlEscape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Rough.js emits ~15 significant digits. Two decimals is well past sub-pixel at any size
 * this channel renders, and it roughly halves the file. Rounding is applied to the OUTPUT
 * only — never to the geometry fed to the generator, which would change the squiggle.
 */
const roundPath = (d) =>
  d.replace(/-?\d*\.\d+(?:[eE][-+]?\d+)?/g, (mm) => {
    const v = Number(Number.parseFloat(mm).toFixed(2));
    return String(Object.is(v, -0) ? 0 : v);
  });

/**
 * Roughify one SVG source string.
 * `id` is the asset identity that seeds every squiggle — stable across runs by construction.
 */
export function roughifySvg(source, id, { roughness = 1.4, bowing = 1.6, referenceSize = REFERENCE_SIZE } = {}) {
  const svg = parseXml(source);

  const viewBox = svg.attrs.viewBox;
  if (!viewBox) throw new Error(`<svg> has no viewBox — run tools/normalize-svg.mjs first`);
  const [, , vbW, vbH] = viewBox.trim().split(/[\s,]+/).map(Number);
  if (!(vbW > 0 && vbH > 0)) throw new Error(`degenerate viewBox: ${viewBox}`);
  const width = svg.attrs.width ?? String(vbW);
  const height = svg.attrs.height ?? String(vbH);

  const unitScale = scaleFor(vbW, vbH, referenceSize);
  const effRoughness = Number((roughness * unitScale).toFixed(4));

  const fileSeed = seedFrom(`${STYLE_VERSION}:${id}`);
  const body = [];
  const skipped = [];
  let shapes = 0;

  const walk = (node, inherited, transforms) => {
    for (const child of node.children) {
      if (IGNORED.has(child.tag)) continue;

      const style = resolveStyle(inherited, child.attrs);
      const chain = child.attrs.transform ? [...transforms, child.attrs.transform.trim()] : transforms;

      if (CONTAINER.has(child.tag)) {
        walk(child, style, chain);
        continue;
      }
      if (!DRAWABLE.has(child.tag)) {
        // <text>, <image>, <use>, <foreignObject>: real content this stylizer cannot
        // roughen. Reported rather than dropped in silence.
        skipped.push(child.tag);
        continue;
      }

      const index = shapes++;
      const stroke = paint(style.stroke, 'none');
      const fill = paint(style.fill, 'black');
      // An element with neither stroke nor fill is invisible; drawing it would be noise.
      if (stroke === 'none' && fill === 'none') continue;

      const opts = {
        seed: seedFrom(`${STYLE_VERSION}:${id}:${index}:${child.tag}`),
        roughness: effRoughness,
        bowing,
        stroke,
        strokeWidth: n(style['stroke-width'], 1),
        preserveVertices: true,
        disableMultiStroke: false,
      };
      if (fill !== 'none') {
        opts.fill = fill;
        // Solid, always. Hachure aliases into noise at phone sizes — see FILL in tokens.ts.
        opts.fillStyle = 'solid';
      }

      const drawable = drawableToRough(child, opts);
      if (!drawable) continue;

      const inner = generator
        .toPaths(drawable)
        .map((p) => {
          const attrs = [`d="${roundPath(p.d)}"`];
          attrs.push(`fill="${p.fill && p.fill !== 'none' ? p.fill : 'none'}"`);
          if (p.stroke && p.stroke !== 'none') {
            attrs.push(`stroke="${p.stroke}"`);
            attrs.push(`stroke-width="${Number(Number(p.strokeWidth).toFixed(2))}"`);
            attrs.push(`stroke-linecap="${style['stroke-linecap'] ?? 'round'}"`);
            attrs.push(`stroke-linejoin="${style['stroke-linejoin'] ?? 'round'}"`);
          } else {
            attrs.push('stroke="none"');
          }
          return `<path ${attrs.join(' ')}/>`;
        })
        .join('');

      if (!inner) continue;

      const gAttrs = [];
      if (chain.length) gAttrs.push(`transform="${xmlEscape(chain.join(' '))}"`);
      const op = Number(style.opacity ?? 1);
      if (Number.isFinite(op) && op !== 1) gAttrs.push(`opacity="${Number(op.toFixed(3))}"`);
      gAttrs.push(`data-shape="${xmlEscape(child.tag)}-${index}"`);
      body.push(`<g ${gAttrs.join(' ')}>${inner}</g>`);
    }
  };

  walk(svg, resolveStyle({}, svg.attrs), svg.attrs.transform ? [svg.attrs.transform.trim()] : []);

  if (shapes === 0) {
    throw new Error('no drawable elements found — nothing to roughen');
  }

  const out =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">` +
    body.join('') +
    '</svg>\n';

  return {
    svg: out, seed: fileSeed, shapes, skipped: [...new Set(skipped)],
    viewBox, width, height, unitScale, effRoughness,
  };
}

// ---------------------------------------------------------------------------
// cache — content-addressed, stored in the output's own header comment
// ---------------------------------------------------------------------------

export function cacheKey(source, id, opts) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        v: ROUGHIFY_VERSION, lib: ROUGH_LIB, style: STYLE_VERSION, ink: INK,
        id, roughness: opts.roughness, bowing: opts.bowing, referenceSize: opts.referenceSize, source,
      }),
    )
    .digest('hex')
    .slice(0, 16);
}

const HEADER = (id, seed, key) =>
  `<!-- roughify-svg.mjs · ${ROUGH_LIB} · style=${STYLE_VERSION} · id=${id} · seed=${seed} · cache=${key} -->\n`;

const readCacheKey = (file) => {
  if (!existsSync(file)) return null;
  const m = readFileSync(file, 'utf8').match(/cache=([0-9a-f]{16})/);
  return m ? m[1] : null;
};

/** Roughify one file on disk, honouring the cache. */
export function roughifyFile(inFile, outFile, opts = {}) {
  const id = basename(inFile, extname(inFile));
  const source = readFileSync(inFile, 'utf8');
  const settings = {
    roughness: opts.roughness ?? 1.4,
    bowing: opts.bowing ?? 1.6,
    referenceSize: opts.referenceSize ?? REFERENCE_SIZE,
  };
  const key = cacheKey(source, id, settings);

  if (!opts.force && readCacheKey(outFile) === key) {
    const cached = readFileSync(outFile, 'utf8');
    return {
      id, cached: true, key,
      seed: Number(cached.match(/seed=(\d+)/)?.[1] ?? seedFrom(`${STYLE_VERSION}:${id}`)),
      shapes: (cached.match(/data-shape=/g) ?? []).length,
      skipped: [],
      bytes: Buffer.byteLength(cached, 'utf8'),
    };
  }

  const r = roughifySvg(source, id, settings);
  const text = HEADER(id, r.seed, key) + r.svg;
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, text);
  return {
    id, cached: false, key, seed: r.seed, shapes: r.shapes, skipped: r.skipped,
    viewBox: r.viewBox, effRoughness: r.effRoughness,
    bytes: Buffer.byteLength(text, 'utf8'),
  };
}

// ---------------------------------------------------------------------------
// cli
// ---------------------------------------------------------------------------

export function collectSvgs(target) {
  const abs = resolve(target);
  if (!existsSync(abs)) throw new Error(`input not found: ${target}`);
  if (statSync(abs).isDirectory()) {
    return readdirSync(abs).filter((f) => f.toLowerCase().endsWith('.svg')).sort().map((f) => join(abs, f));
  }
  return [abs];
}

function main(argv) {
  const opts = { roughness: 1.4, bowing: 1.6, referenceSize: REFERENCE_SIZE, force: false };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--roughness') opts.roughness = Number(argv[++i]);
    else if (a === '--bowing') opts.bowing = Number(argv[++i]);
    else if (a === '--reference-size') opts.referenceSize = Number(argv[++i]);
    else if (a === '--force') opts.force = true;
    else if (a.startsWith('--')) throw new Error(`unknown flag: ${a}`);
    else positional.push(a);
  }
  if (!Number.isFinite(opts.roughness) || !Number.isFinite(opts.bowing)) {
    throw new Error('--roughness and --bowing need numeric values');
  }

  const [input, outDir] = positional;
  if (!input || !outDir) {
    console.error(
      'usage: node tools/roughify-svg.mjs <input.svg|input-dir> <output-dir> ' +
        '[--roughness 1.4] [--bowing 1.6] [--reference-size 100] [--force]',
    );
    process.exit(1);
  }

  assertSeedParity();

  const files = collectSvgs(input);
  if (files.length === 0) throw new Error(`no .svg files found in ${input}`);
  mkdirSync(resolve(outDir), { recursive: true });

  const rows = [];
  const failures = [];
  for (const file of files) {
    const out = join(resolve(outDir), basename(file));
    try {
      rows.push(roughifyFile(file, out, opts));
    } catch (err) {
      failures.push({ name: basename(file), message: err.message });
    }
  }

  const w = Math.max(5, ...rows.map((r) => r.id.length));
  console.log(
    `roughified ${rows.length} SVG file(s) -> ${outDir}` +
      `   (roughness ${opts.roughness} @ reference size ${opts.referenceSize || 'off'}, ` +
      `bowing ${opts.bowing}, style ${STYLE_VERSION})\n`,
  );
  console.log(
    `  ${'asset'.padEnd(w)}  ${'seed'.padStart(11)}  ${'shapes'.padStart(6)}  ` +
      `${'bytes'.padStart(7)}  ${'eff.rough'.padStart(9)}  state`,
  );
  console.log(`  ${'-'.repeat(w)}  ${'-'.repeat(11)}  ${'-'.repeat(6)}  ${'-'.repeat(7)}  ${'-'.repeat(9)}  -----`);
  for (const r of rows) {
    console.log(
      `  ${r.id.padEnd(w)}  ${String(r.seed).padStart(11)}  ${String(r.shapes).padStart(6)}  ` +
        `${String(r.bytes).padStart(7)}  ${String(r.effRoughness ?? '-').padStart(9)}  ` +
        `${r.cached ? 'cached' : 'written'}` +
        (r.skipped.length ? `   SKIPPED: <${r.skipped.join('>, <')}>` : ''),
    );
  }
  const written = rows.filter((r) => !r.cached).length;
  console.log(`\n  ${written} written, ${rows.length - written} served from cache`);
  console.log(`  seeding: seedFrom('${STYLE_VERSION}:<asset-id>[:<shape-index>:<tag>]') — no clock, no counter, no Math.random`);

  if (failures.length) {
    console.error(`\nROUGHIFY FAILED for ${failures.length} file(s):`);
    for (const f of failures) console.error(`  ${f.name}: ${f.message}`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(`roughify-svg failed: ${err.message}`);
    process.exit(1);
  }
}
