#!/usr/bin/env node
/**
 * extract-sheets.mjs — turn the Mr.Yolk source sheets into individual transparent PNGs.
 *
 *   node tools/mryolk/extract-sheets.mjs
 *
 * The source art arrives as square sheets holding a grid of small drawings on a flat
 * near-white field. Those sheets are useless as-is: a scene needs ONE pose, at a known size,
 * with a transparent background, addressable by name. This turns each sheet into that.
 *
 * ------------------------------------------------------------------ background removal
 *
 * The obvious implementation — "make every near-white pixel transparent" — destroys this
 * art. Mr.Yolk's eyes are white. So are the documents he holds, the paper of every contract,
 * the airplane, the lab coat, the spreadsheet. A global colour key punches holes straight
 * through the drawing.
 *
 * So the background is identified by CONNECTIVITY rather than by colour: the transparent
 * region is the near-white area REACHABLE FROM THE EDGE OF THE SHEET. White enclosed by an
 * outline is unreachable and therefore survives. That single change is the difference
 * between a usable asset library and 216 drawings with their eyes shot out.
 *
 * Anti-aliasing is the second half of the problem. A hard connectivity mask cuts along the
 * outermost fully-white pixel and leaves the grey ramp of the outline behind as a pale halo.
 * So the flood runs twice: a strict pass finds the definite background, then that core is
 * allowed to grow at most `RAMP_RADIUS` pixels into pixels that are merely light-ish, and
 * those get FRACTIONAL alpha derived from how far along the ramp they are, with their colour
 * un-blended back out of the white they were composited over. The radius bound is what keeps
 * the growth from eating a genuine light-grey object: it can only ever nibble a two-pixel
 * rim, never a region.
 *
 * -------------------------------------------------------------------- grid detection
 *
 * The grid is measured, not assumed. Row bands come from a projection of the non-background
 * mask, column bands from a projection within each row band — done per-row because the cells
 * are not aligned to a strict lattice and a global column split clips the wide drawings. If
 * a projection does not yield the expected count the sheet falls back to an even division,
 * and says so, rather than silently producing 30 assets from a 36-cell sheet.
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, join } from 'node:path';
import { readRGBA, writePNG, makeRaster, blit, scaleTo, crop } from './raster.mjs';
import { SHEETS, SOURCE_DIR, ASSET_DIR, DATA_DIR, QA_DIR } from './config.mjs';

/** A pixel is definite background only if it is BOTH very light and very neutral. */
const CORE_LUM = 248;
const CORE_NEUTRAL = 10;

/** How far the definite background may grow to pick up the anti-aliased ramp. */
const RAMP_RADIUS = 2;
const RAMP_LUM = 215;
const RAMP_NEUTRAL = 34;

/** Transparent margin kept around every exported asset, in source pixels. */
const PADDING = 6;

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const spread = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b);

/**
 * Alpha mask for the sheet: 0 where the drawing is not, 255 where it is, fractional on the
 * anti-aliased rim. Also un-blends the rim colour back off white.
 */
function removeBackground(img) {
  const { width: w, height: h, data } = img;
  const n = w * h;

  /* 0 = untouched, 1 = definite background, 2 = ramp */
  const state = new Uint8Array(n);
  const stack = new Int32Array(n);
  let top = 0;

  const isCore = (i) => {
    const p = i * 4;
    return lum(data[p], data[p + 1], data[p + 2]) >= CORE_LUM
      && spread(data[p], data[p + 1], data[p + 2]) <= CORE_NEUTRAL;
  };
  const isRamp = (i) => {
    const p = i * 4;
    return lum(data[p], data[p + 1], data[p + 2]) >= RAMP_LUM
      && spread(data[p], data[p + 1], data[p + 2]) <= RAMP_NEUTRAL;
  };

  /* Seed from every edge pixel — the background is by definition what touches the outside. */
  for (let x = 0; x < w; x++) {
    for (const i of [x, (h - 1) * w + x]) if (state[i] === 0 && isCore(i)) { state[i] = 1; stack[top++] = i; }
  }
  for (let y = 0; y < h; y++) {
    for (const i of [y * w, y * w + w - 1]) if (state[i] === 0 && isCore(i)) { state[i] = 1; stack[top++] = i; }
  }

  while (top > 0) {
    const i = stack[--top];
    const x = i % w; const y = (i - x) / w;
    if (x > 0) { const j = i - 1; if (state[j] === 0 && isCore(j)) { state[j] = 1; stack[top++] = j; } }
    if (x < w - 1) { const j = i + 1; if (state[j] === 0 && isCore(j)) { state[j] = 1; stack[top++] = j; } }
    if (y > 0) { const j = i - w; if (state[j] === 0 && isCore(j)) { state[j] = 1; stack[top++] = j; } }
    if (y < h - 1) { const j = i + w; if (state[j] === 0 && isCore(j)) { state[j] = 1; stack[top++] = j; } }
  }

  /* Grow the core into the anti-aliased ramp, at most RAMP_RADIUS pixels. */
  let frontier = [];
  for (let i = 0; i < n; i++) if (state[i] === 1) frontier.push(i);
  for (let step = 0; step < RAMP_RADIUS; step++) {
    const next = [];
    for (const i of frontier) {
      const x = i % w; const y = (i - x) / w;
      const neigh = [];
      if (x > 0) neigh.push(i - 1);
      if (x < w - 1) neigh.push(i + 1);
      if (y > 0) neigh.push(i - w);
      if (y < h - 1) neigh.push(i + w);
      for (const j of neigh) {
        if (state[j] !== 0) continue;
        if (!isRamp(j)) continue;
        state[j] = 2;
        next.push(j);
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }

  /* Turn the state map into alpha, and un-composite the ramp off white. */
  const out = makeRaster(w, h);
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    if (state[i] === 1) continue;                       // stays fully transparent
    if (state[i] === 0) {
      out.data[p] = data[p]; out.data[p + 1] = data[p + 1];
      out.data[p + 2] = data[p + 2]; out.data[p + 3] = 255;
      continue;
    }
    const l = lum(data[p], data[p + 1], data[p + 2]);
    const a = Math.min(1, Math.max(0, (CORE_LUM - l) / (CORE_LUM - RAMP_LUM)));
    if (a <= 0.004) continue;
    for (let c = 0; c < 3; c++) {
      out.data[p + c] = Math.min(255, Math.max(0, (data[p + c] - 255 * (1 - a)) / a));
    }
    out.data[p + 3] = Math.round(a * 255);
  }
  return out;
}

/** Contiguous runs of `true` in a boolean profile, ignoring runs shorter than `minRun`. */
function bands(profile, minRun) {
  const out = [];
  let start = -1;
  for (let i = 0; i < profile.length; i++) {
    if (profile[i] && start < 0) start = i;
    else if (!profile[i] && start >= 0) { if (i - start >= minRun) out.push([start, i - 1]); start = -1; }
  }
  if (start >= 0 && profile.length - start >= minRun) out.push([start, profile.length - 1]);
  return out;
}

const opaqueAt = (img, x, y) => img.data[(y * img.width + x) * 4 + 3] > 24;

/**
 * Force a measured band list to the expected count without throwing the measurement away.
 *
 * A projection over-splits when a drawing contains a DETACHED part — a floating question
 * mark, motion lines, a spark — which shows up as its own narrow band with a small gap to its
 * parent. It under-splits when two neighbours touch. Repairing those two cases by merging
 * across the smallest gap and splitting the widest band keeps every boundary that was
 * actually observed, which is what an even re-division destroys: dividing the row evenly
 * moves EVERY edge, and a cut that lands inside a neighbour is how a stray factory chimney
 * ends up welded to the side of a spreadsheet.
 */
function reconcileBands(list, want) {
  const b = list.map(([a, z]) => [a, z]);
  while (b.length > want) {
    let best = 0; let bestGap = Infinity;
    for (let i = 0; i + 1 < b.length; i++) {
      const gap = b[i + 1][0] - b[i][1];
      if (gap < bestGap) { bestGap = gap; best = i; }
    }
    b[best] = [b[best][0], b[best + 1][1]];
    b.splice(best + 1, 1);
  }
  while (b.length < want && b.length > 0) {
    let widest = 0;
    for (let i = 1; i < b.length; i++) if (b[i][1] - b[i][0] > b[widest][1] - b[widest][0]) widest = i;
    const [a, z] = b[widest];
    const mid = Math.floor((a + z) / 2);
    b.splice(widest, 1, [a, mid], [mid + 1, z]);
  }
  return b;
}

/**
 * Cell rectangles for a sheet, measured from its own ink.
 *
 * Returns `{cells, method}` — `method` records whether the grid was measured or fell back,
 * because "36 cells" from a measurement and "36 cells" from an assumption are not the same
 * claim and the manifest should not blur them.
 */
function findCells(img, rows, cols) {
  const { width: w, height: h } = img;
  const rowProfile = new Array(h).fill(false);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) if (opaqueAt(img, x, y)) { rowProfile[y] = true; break; }
  }
  const rawRowBands = bands(rowProfile, 8);
  const repairs = [];
  if (rawRowBands.length !== rows) repairs.push(`rows ${rawRowBands.length}->${rows}`);
  const rowBands = reconcileBands(rawRowBands, rows);

  const cells = [];
  for (let r = 0; r < rows; r++) {
    const [y0, y1] = rowBands[r];
    const colProfile = new Array(w).fill(false);
    for (let x = 0; x < w; x++) {
      for (let y = y0; y <= y1; y++) if (opaqueAt(img, x, y)) { colProfile[x] = true; break; }
    }
    const rawColBands = bands(colProfile, 8);
    if (rawColBands.length !== cols) repairs.push(`r${r + 1} cols ${rawColBands.length}->${cols}`);
    const colBands = reconcileBands(rawColBands, cols);
    for (let c = 0; c < cols; c++) {
      const [x0, x1] = colBands[c];
      cells.push({ row: r, col: c, x0, y0, x1, y1 });
    }
  }
  const method = repairs.length ? `measured+reconciled(${repairs.join(', ')})` : 'measured';
  return { cells, method };
}

/** Tight bounds of anything non-transparent. Null when the cell is empty. */
function contentBounds(img) {
  let minX = img.width; let minY = img.height; let maxX = -1; let maxY = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY };
}

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

function main() {
  mkdirSync(ASSET_DIR, { recursive: true });
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(QA_DIR, { recursive: true });

  const seenSheets = new Map();
  const manifest = { version: 1, backgroundRemoval: 'edge-connectivity+ramp-v1', sheets: [], assets: [] };

  for (const sheet of SHEETS) {
    const path = join(SOURCE_DIR, sheet.file);
    const bytes = readFileSync(path);
    const hash = sha(bytes);

    if (seenSheets.has(hash)) {
      manifest.sheets.push({
        id: sheet.id, file: sheet.file, sha256: hash,
        duplicateOf: seenSheets.get(hash), extracted: 0,
        note: 'byte-identical to another supplied sheet; not extracted twice',
      });
      console.log(`${sheet.id}: duplicate of ${seenSheets.get(hash)} — skipped`);
      continue;
    }
    seenSheets.set(hash, sheet.id);

    const raw = readRGBA(path);
    const cut = removeBackground(raw);
    const { cells, method } = findCells(cut, sheet.rows, sheet.cols);

    const thumbs = [];
    let extracted = 0;

    for (const cell of cells) {
      const cw = cell.x1 - cell.x0 + 1;
      const ch = cell.y1 - cell.y0 + 1;
      const cellImg = crop(cut, cell.x0, cell.y0, cw, ch);
      const b = contentBounds(cellImg);
      if (!b) { thumbs.push(null); continue; }

      const tw = b.maxX - b.minX + 1;
      const th = b.maxY - b.minY + 1;
      const out = makeRaster(tw + PADDING * 2, th + PADDING * 2);
      blit(out, crop(cellImg, b.minX, b.minY, tw, th), PADDING, PADDING);

      const index = cell.row * sheet.cols + cell.col;
      const id = `${sheet.id}-r${cell.row + 1}c${cell.col + 1}`;
      const file = `${id}.png`;
      writePNG(out, join(ASSET_DIR, file));

      manifest.assets.push({
        id,
        sheet: sheet.id,
        index,
        row: cell.row + 1,
        col: cell.col + 1,
        sourceCrop: {
          x: cell.x0 + b.minX, y: cell.y0 + b.minY, width: tw, height: th,
        },
        file: `mryolk/assets/${file}`,
        width: out.width,
        height: out.height,
        sha256: sha(Buffer.from(readFileSync(join(ASSET_DIR, file)))),
      });
      thumbs.push(out);
      extracted++;
    }

    manifest.sheets.push({
      id: sheet.id, file: sheet.file, sha256: hash,
      width: raw.width, height: raw.height,
      rows: sheet.rows, cols: sheet.cols,
      gridMethod: method, extracted,
    });
    console.log(`${sheet.id}: ${extracted}/${cells.length} cells  (grid: ${method})`);

    writeContactSheet(sheet, cells, cut, thumbs);
  }

  writeFileSync(join(DATA_DIR, 'sheet-extraction.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\n${manifest.assets.length} assets → ${ASSET_DIR}`);
}

/**
 * Contact sheet: original cell on the left, transparent result on the right, over a
 * checkerboard so a hole punched through the drawing is visible rather than invisible.
 */
function writeContactSheet(sheet, cells, cut, thumbs) {
  const TH = 120;
  const GAP = 10;
  const LABEL = 16;
  const cellW = TH * 2 + GAP;
  const cellH = TH + LABEL;
  const w = sheet.cols * (cellW + GAP) + GAP;
  const h = sheet.rows * (cellH + GAP) + GAP + 30;
  const page = makeRaster(w, h);
  for (let i = 0; i < w * h; i++) {
    page.data[i * 4] = 34; page.data[i * 4 + 1] = 34; page.data[i * 4 + 2] = 40; page.data[i * 4 + 3] = 255;
  }

  cells.forEach((cell, i) => {
    const thumb = thumbs[i];
    const x = GAP + cell.col * (cellW + GAP);
    const y = 30 + cell.row * (cellH + GAP);

    const cw = cell.x1 - cell.x0 + 1;
    const ch = cell.y1 - cell.y0 + 1;
    const orig = scaleTo(crop(cut, cell.x0, cell.y0, cw, ch), TH, TH);
    // Original pane: composited on white, i.e. how the source looked.
    for (let yy = 0; yy < TH; yy++) {
      for (let xx = 0; xx < TH; xx++) {
        const s = (yy * TH + xx) * 4;
        const a = orig.data[s + 3] / 255;
        const d = ((y + yy) * w + (x + xx)) * 4;
        for (let c = 0; c < 3; c++) page.data[d + c] = orig.data[s + c] * a + 255 * (1 - a);
      }
    }

    if (!thumb) return;
    const res = scaleTo(thumb, TH, TH);
    for (let yy = 0; yy < TH; yy++) {
      for (let xx = 0; xx < TH; xx++) {
        const check = ((xx >> 3) + (yy >> 3)) & 1 ? 200 : 120;
        const s = (yy * TH + xx) * 4;
        const a = res.data[s + 3] / 255;
        const d = ((y + yy) * w + (x + xx + TH + GAP)) * 4;
        for (let c = 0; c < 3; c++) page.data[d + c] = res.data[s + c] * a + check * (1 - a);
      }
    }
  });

  writePNG(page, join(QA_DIR, `contact-${sheet.id}.png`));
}

main();
