#!/usr/bin/env node
/**
 * audio-scan.mjs — index the external audio packs into a searchable local library.
 *
 *   node tools/audio-scan.mjs [--packs a,b] [--force]
 *
 * The four source packs hold ~3,700 files and ~465 MB. They are READ-ONLY: nothing here
 * opens them for writing, renames them, or deletes anything. Everything this produces lands
 * in the local cache and the local database, both outside git.
 *
 * ONE FFMPEG PROCESS PER FILE. That single decode yields everything at once:
 *
 *   - stdout: 4 kHz mono PCM, from which duration, peak, RMS, silence ratio and a 32-bucket
 *     energy fingerprint are computed here rather than by parsing ffmpeg's stderr
 *   - stderr: the format header, which carries codec, sample rate, channels and bitrate
 *
 * Two processes per file (ffprobe + ffmpeg) would have doubled a ~3,700-file scan for
 * information one call already contains.
 *
 * Re-running is INCREMENTAL. A file whose size and mtime are unchanged is skipped, so the
 * expensive work happens once and a rescan after adding a pack costs only the new files.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { FFMPEG } from './ffbin.mjs';
import { getDb, now } from '../src/youtube/db/index.mjs';
import { classify } from '../src/youtube/audio/classify.mjs';

const PACKS = {
  meme_SFX_Pack: 'C:\\Users\\ducnq\\Downloads\\meme_SFX_Pack',
  'meme-sfx': 'C:\\Users\\ducnq\\Downloads\\meme-sfx',
  Tiktok_Trends_Pack: 'C:\\Users\\ducnq\\Downloads\\Tiktok_Trends_Pack',
  BG_SneakyMusic: 'C:\\Users\\ducnq\\Downloads\\BG_SneakyMusic',
};

const AUDIO_EXT = new Set(['.wav', '.mp3', '.m4a', '.aac', '.ogg', '.flac']);
const FP_SR = 4000;
const FP_BUCKETS = 32;

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = (() => {
  const i = args.indexOf('--packs');
  return i >= 0 ? new Set(args[i + 1].split(',')) : null;
})();

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (AUDIO_EXT.has(extname(entry.name).toLowerCase())) out.push(p);
  }
  return out;
}

const hashFile = (path) =>
  new Promise((res, rej) => {
    const h = createHash('sha256');
    createReadStream(path).on('data', (d) => h.update(d)).on('error', rej)
      .on('end', () => res(h.digest('hex')));
  });

/**
 * Decode once and derive everything.
 *
 * Returns null for a file ffmpeg cannot read — a corrupt entry is FLAGGED, never allowed to
 * abort a 3,700-file scan.
 */
function probe(path) {
  const r = spawnSync(FFMPEG, [
    '-hide_banner', '-nostdin', '-i', path,
    '-ac', '1', '-ar', String(FP_SR), '-f', 's16le', '-',
  ], { maxBuffer: 1 << 28, timeout: 30_000 });

  const log = String(r.stderr ?? '');
  const pcm = r.stdout;
  if (!pcm || pcm.length < 64) return { ok: false, error: firstError(log) };

  const n = pcm.length / 2;
  let peak = 0;
  let sumSq = 0;
  const buckets = new Float64Array(FP_BUCKETS);
  const perBucket = Math.max(1, Math.floor(n / FP_BUCKETS));
  // Silence measured on 20 ms frames, which is short enough to catch a gap and long enough
  // not to be fooled by a single zero-crossing.
  const frame = Math.round(FP_SR * 0.02);
  let silentFrames = 0;
  let frames = 0;
  let frameSum = 0;
  let framePos = 0;

  for (let i = 0; i < n; i++) {
    const v = pcm.readInt16LE(i * 2) / 32768;
    const a = Math.abs(v);
    if (a > peak) peak = a;
    sumSq += v * v;

    const b = Math.min(FP_BUCKETS - 1, Math.floor(i / perBucket));
    buckets[b] += v * v;

    frameSum += v * v;
    if (++framePos >= frame) {
      const rms = Math.sqrt(frameSum / framePos);
      if (20 * Math.log10(rms + 1e-12) < -50) silentFrames++;
      frames++;
      frameSum = 0; framePos = 0;
    }
  }

  const rms = Math.sqrt(sumSq / n);
  const maxB = Math.max(...buckets) || 1;
  // Quantise the envelope to 4 bits per bucket: coarse enough that a re-encode or a small
  // level difference produces the same string, fine enough that different sounds do not.
  const fingerprint = Array.from(buckets, (b) => Math.round((b / maxB) * 15).toString(16)).join('');

  const header = {
    codec: /Audio:\s*([\w.]+)/.exec(log)?.[1] ?? null,
    sampleRate: Number(/(\d+)\s*Hz/.exec(log)?.[1] ?? 0) || null,
    channels: /\bmono\b/.test(log) ? 1 : /\bstereo\b/.test(log) ? 2 : null,
    bitrate: Number(/bitrate:\s*(\d+)\s*kb\/s/.exec(log)?.[1] ?? 0) || null,
  };

  return {
    ok: true,
    duration: n / FP_SR,
    peakDb: 20 * Math.log10(peak + 1e-12),
    rmsDb: 20 * Math.log10(rms + 1e-12),
    silenceRatio: frames ? silentFrames / frames : 0,
    fingerprint,
    ...header,
  };
}

const firstError = (log) => {
  const line = log.split('\n').reverse().find((l) => /error|invalid|no such|failed/i.test(l));
  return (line ?? 'decode produced no audio').trim().slice(0, 180);
};

// ---------------------------------------------------------------------------

const db = getDb();
const started = Date.now();

const upsert = db.prepare(`
  INSERT INTO audio_source (
    sha256, pack, path, filename, ext, bytes, mtime, duration_s, sample_rate, channels,
    codec, bitrate_kbps, peak_db, rms_db, silence_ratio, fingerprint, category, subcategory,
    tags, provenance, valid, error, scanned_at
  ) VALUES (
    @sha256,@pack,@path,@filename,@ext,@bytes,@mtime,@duration_s,@sample_rate,@channels,
    @codec,@bitrate_kbps,@peak_db,@rms_db,@silence_ratio,@fingerprint,@category,@subcategory,
    @tags,@provenance,@valid,@error,@scanned_at
  )
  ON CONFLICT(path) DO UPDATE SET
    sha256=excluded.sha256, bytes=excluded.bytes, mtime=excluded.mtime,
    duration_s=excluded.duration_s, sample_rate=excluded.sample_rate, channels=excluded.channels,
    codec=excluded.codec, bitrate_kbps=excluded.bitrate_kbps, peak_db=excluded.peak_db,
    rms_db=excluded.rms_db, silence_ratio=excluded.silence_ratio, fingerprint=excluded.fingerprint,
    category=excluded.category, subcategory=excluded.subcategory, tags=excluded.tags,
    valid=excluded.valid, error=excluded.error, scanned_at=excluded.scanned_at`);

const seen = db.prepare('SELECT bytes, mtime FROM audio_source WHERE path = ?');

const summary = {};

for (const [pack, dir] of Object.entries(PACKS)) {
  if (only && !only.has(pack)) continue;
  if (!existsSync(dir)) { console.log(`  ${pack}: NOT FOUND — skipped`); continue; }

  const files = walk(dir);
  const s = { files: files.length, scanned: 0, skipped: 0, invalid: 0 };
  process.stdout.write(`  ${pack}: ${files.length} files `);

  for (const path of files) {
    const st = statSync(path);
    const mtime = st.mtimeMs;

    if (!force) {
      const prev = seen.get(path);
      if (prev && prev.bytes === st.size && prev.mtime === mtime) { s.skipped++; continue; }
    }

    const p = probe(path);
    const filename = basename(path);
    const cls = p.ok ? classify({ filename, pack, duration: p.duration, rmsDb: p.rmsDb }) : { category: null, subcategory: null, tags: [] };

    upsert.run({
      sha256: p.ok ? await hashFile(path) : null,
      pack, path, filename, ext: extname(path).toLowerCase().slice(1),
      bytes: st.size, mtime,
      duration_s: p.ok ? p.duration : null,
      sample_rate: p.sampleRate ?? null,
      channels: p.channels ?? null,
      codec: p.codec ?? null,
      bitrate_kbps: p.bitrate ?? null,
      peak_db: p.ok ? p.peakDb : null,
      rms_db: p.ok ? p.rmsDb : null,
      silence_ratio: p.ok ? p.silenceRatio : null,
      fingerprint: p.ok ? p.fingerprint : null,
      category: cls.category, subcategory: cls.subcategory,
      tags: JSON.stringify(cls.tags),
      // Honest by default. These are user-supplied packs with no license metadata, and
      // inventing a licence status would be worse than admitting we do not know one.
      provenance: 'USER_PROVIDED_UNKNOWN_LICENSE',
      valid: p.ok ? 1 : 0,
      error: p.ok ? null : p.error,
      scanned_at: now(),
    });

    s.scanned++;
    if (!p.ok) s.invalid++;
    if (s.scanned % 200 === 0) process.stdout.write('.');
  }

  summary[pack] = s;
  console.log(` → ${s.scanned} scanned, ${s.skipped} unchanged, ${s.invalid} invalid`);
}

// ---------------------------------------------------------------------------
// duplicate marking
// ---------------------------------------------------------------------------

console.log('\n  marking duplicates…');

// EXACT: identical bytes. The first path (stable ordering) becomes canonical.
db.exec(`
  UPDATE audio_source SET dup_of = NULL, dup_kind = NULL;
  UPDATE audio_source SET dup_of = (
    SELECT MIN(a2.id) FROM audio_source a2
    WHERE a2.sha256 = audio_source.sha256 AND a2.valid = 1
  ), dup_kind = 'EXACT'
  WHERE valid = 1 AND sha256 IS NOT NULL
    AND id <> (SELECT MIN(a3.id) FROM audio_source a3 WHERE a3.sha256 = audio_source.sha256 AND a3.valid = 1);
`);

/**
 * NEAR: same coarse energy envelope and a duration within 100 ms.
 *
 * Meme packs are full of the same sound at a different bitrate, trimmed a hair differently,
 * or renamed. The fingerprint is deliberately coarse (32 buckets, 4 bits) so a re-encode
 * collapses onto the same string while genuinely different sounds do not.
 */
const nearGroups = db.prepare(`
  SELECT fingerprint, GROUP_CONCAT(id) ids, COUNT(*) n
  FROM audio_source
  WHERE valid = 1 AND dup_of IS NULL AND fingerprint IS NOT NULL AND duration_s > 0.15
  GROUP BY fingerprint HAVING n > 1`).all();

const markNear = db.prepare("UPDATE audio_source SET dup_of = ?, dup_kind = 'NEAR' WHERE id = ?");
const rowById = db.prepare('SELECT id, duration_s FROM audio_source WHERE id = ?');
let nearCount = 0;

db.transaction(() => {
  for (const g of nearGroups) {
    const ids = g.ids.split(',').map(Number).sort((a, b) => a - b);
    const canonical = rowById.get(ids[0]);
    for (const id of ids.slice(1)) {
      const r = rowById.get(id);
      if (Math.abs((r.duration_s ?? 0) - (canonical.duration_s ?? 0)) <= 0.1) {
        markNear.run(canonical.id, id);
        nearCount++;
      }
    }
  }
})();

const stat = (sql) => db.prepare(sql).get().c;
const total = stat('SELECT COUNT(*) c FROM audio_source');
const valid = stat('SELECT COUNT(*) c FROM audio_source WHERE valid = 1');
const exact = stat("SELECT COUNT(*) c FROM audio_source WHERE dup_kind = 'EXACT'");
const unique = stat('SELECT COUNT(*) c FROM audio_source WHERE valid = 1 AND dup_of IS NULL');

db.prepare('INSERT INTO sync_run (kind, started_at, finished_at, status, items, detail) VALUES (?,?,?,?,?,?)')
  .run('audio-scan', new Date(started).toISOString(), now(), 'OK', total, JSON.stringify(summary));

console.log('');
console.log(`  indexed        ${total}`);
console.log(`  valid          ${valid}`);
console.log(`  invalid        ${total - valid}`);
console.log(`  exact dupes    ${exact}`);
console.log(`  near dupes     ${nearCount}`);
console.log(`  UNIQUE SOUNDS  ${unique}`);
console.log(`\n  ${((Date.now() - started) / 1000).toFixed(0)}s`);
