/**
 * raster.mjs — read and write RGBA rasters without an image library.
 *
 * This project has no `sharp`, no `jimp`, no `canvas`, and adding a native image dependency
 * to a machine that already refuses to start half the binaries it is handed (see
 * `tools/ffbin.mjs`) is a poor trade for what amounts to two format conversions. ffmpeg is
 * already a hard dependency of the render pipeline and it decodes and encodes PNG perfectly
 * well, so it is used as the codec and the actual pixel work happens in plain typed arrays.
 *
 * The raster shape is deliberately boring: `{width, height, data}` where `data` is a
 * `Uint8ClampedArray` of RGBA, row-major, exactly like `ImageData`. Every other module here
 * operates on that and never touches a file format.
 */

import { spawnSync } from 'node:child_process';
import { FFMPEG } from '../ffbin.mjs';

/** Decode any image ffmpeg understands into straight RGBA. */
export function readRGBA(path) {
  const size = spawnSync(FFMPEG, [
    '-hide_banner', '-nostdin', '-v', 'error', '-i', path,
    '-map', '0:v:0', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-',
  ], { maxBuffer: 1 << 30 });
  if (size.error) throw size.error;
  if (size.status !== 0) throw new Error(`ffmpeg could not decode ${path}: ${size.stderr}`);

  const dims = probeSize(path);
  const data = new Uint8ClampedArray(size.stdout.buffer, size.stdout.byteOffset, size.stdout.length);
  const expected = dims.width * dims.height * 4;
  if (data.length !== expected) {
    throw new Error(`decoded ${data.length} bytes for ${path}, expected ${expected}`);
  }
  return { width: dims.width, height: dims.height, data };
}

function probeSize(path) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostdin', '-i', path], { encoding: 'utf8' });
  const log = `${r.stdout || ''}${r.stderr || ''}`;
  const m = /,\s(\d+)x(\d+)[\s,]/.exec(log);
  if (!m) throw new Error(`could not read dimensions of ${path}`);
  return { width: Number(m[1]), height: Number(m[2]) };
}

/** Encode an RGBA raster to a PNG with its alpha channel intact. */
export function writePNG({ width, height, data }, path) {
  const r = spawnSync(FFMPEG, [
    '-hide_banner', '-nostdin', '-v', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${width}x${height}`, '-i', 'pipe:0',
    '-frames:v', '1', '-pix_fmt', 'rgba', '-c:v', 'png', '-compression_level', '9',
    path,
  ], { input: Buffer.from(data.buffer, data.byteOffset, data.length), maxBuffer: 1 << 30 });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`ffmpeg could not write ${path}: ${r.stderr}`);
}

export const makeRaster = (width, height, fill = 0) => ({
  width, height,
  data: new Uint8ClampedArray(width * height * 4).fill(fill),
});

/** Copy `src` onto `dst` at (dx, dy), source-over. */
export function blit(dst, src, dx, dy) {
  for (let y = 0; y < src.height; y++) {
    const ty = dy + y;
    if (ty < 0 || ty >= dst.height) continue;
    for (let x = 0; x < src.width; x++) {
      const tx = dx + x;
      if (tx < 0 || tx >= dst.width) continue;
      const s = (y * src.width + x) * 4;
      const a = src.data[s + 3] / 255;
      if (a === 0) continue;
      const d = (ty * dst.width + tx) * 4;
      const da = dst.data[d + 3] / 255;
      const out = a + da * (1 - a);
      for (let c = 0; c < 3; c++) {
        dst.data[d + c] = (src.data[s + c] * a + dst.data[d + c] * da * (1 - a)) / out;
      }
      dst.data[d + 3] = out * 255;
    }
  }
}

/** Nearest-neighbour-free box downscale. Good enough for contact sheets, and cheap. */
export function scaleTo(src, w, h) {
  const out = makeRaster(w, h);
  const sx = src.width / w;
  const sy = src.height / h;
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * sy); const y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * sx); const x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      let r = 0; let g = 0; let b = 0; let a = 0; let n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * src.width + xx) * 4;
          const al = src.data[i + 3] / 255;
          r += src.data[i] * al; g += src.data[i + 1] * al; b += src.data[i + 2] * al;
          a += al; n++;
        }
      }
      const o = (y * w + x) * 4;
      if (a > 0) {
        out.data[o] = r / a; out.data[o + 1] = g / a; out.data[o + 2] = b / a;
      }
      out.data[o + 3] = (a / n) * 255;
    }
  }
  return out;
}

export function crop(src, x0, y0, w, h) {
  const out = makeRaster(w, h);
  for (let y = 0; y < h; y++) {
    const sy = y0 + y;
    if (sy < 0 || sy >= src.height) continue;
    for (let x = 0; x < w; x++) {
      const sx = x0 + x;
      if (sx < 0 || sx >= src.width) continue;
      const s = (sy * src.width + sx) * 4;
      const d = (y * w + x) * 4;
      out.data[d] = src.data[s]; out.data[d + 1] = src.data[s + 1];
      out.data[d + 2] = src.data[s + 2]; out.data[d + 3] = src.data[s + 3];
    }
  }
  return out;
}
