/**
 * audio-import.mjs — copy a shortlisted source into the repository, deliberately.
 *
 * The packs are read-only source libraries of 465 MB. Nothing enters git by accident: a file
 * arrives here only when it is named on the command line, and the tool prints exactly what it
 * is about to add and how large the commit will be before it writes anything.
 *
 * Imported audio is normalised on the way in -- mono, 48 kHz, peak-limited -- so everything
 * in public/ shares one headroom convention with the procedurally generated effects already
 * there. An imported file that stayed at its original level would be the one sound in the mix
 * that clips.
 *
 * Effects stay WAV because they are fractions of a second and lossless costs nothing. Music
 * beds are encoded: four beds as 48 kHz mono WAV is 11 MB of git history for audio that sits
 * 15 LU under the narration and is deliberately never listened to closely. Mono MP3 at 128k
 * is inaudible at that depth and about a tenth of the size.
 *
 * Beds are also LOUDNESS-NORMALISED to a fixed -30 LUFS on the way in. Measured raw, these
 * four beds sit between -14.5 and -15.8 LUFS -- indistinguishable from the narration's -14.5.
 * Left alone, "quiet" would have meant a different depth for every track and a multiplier
 * picked by ear. Normalising here makes the level a measured property of the file, so the
 * composition can apply a single honest gain and the mix is reproducible.
 *
 * PROVENANCE IS NEVER INVENTED. Every imported row keeps USER_PROVIDED_UNKNOWN_LICENSE. This
 * tool records where a file came from; it cannot and does not establish that it may be used.
 *
 *   node tools/audio-import.mjs --ids 123,456          import specific indexed sources
 *   node tools/audio-import.mjs --music                import the whole music pack
 *   node tools/audio-import.mjs --ids 123 --dry-run    show what would happen
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { getDb, now } from '../src/youtube/db/index.mjs';
import { FFMPEG } from './ffbin.mjs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const val = (n) => { const i = argv.indexOf(`--${n}`); return i < 0 ? null : argv[i + 1]; };

const DRY = flag('dry-run');
const PUBLIC = join(process.cwd(), 'public');

/** Where a category lives on disk. Music is separated because it is mixed differently. */
const DEST = (category) => (category === 'MUSIC' ? 'music' : 'sfx');

/** A stable, boring filename. Pack filenames are shouty, punctuated and non-portable. */
function slugify(name, category, sub) {
  const base = basename(name).replace(/\.[a-z0-9]+$/i, '').replace(/^\d+[_\s-]*/, '');
  const s = base.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'sound';
  return category === 'MUSIC' ? `bed-${s}` : `${(sub ?? 'sfx')}-${s}`;
}

const db = getDb();

let rows;
if (flag('music')) {
  rows = db.prepare(
    "SELECT * FROM audio_source WHERE category = 'MUSIC' AND pack LIKE 'BG_%' AND dup_of IS NULL ORDER BY id").all();
} else if (val('ids')) {
  const ids = val('ids').split(',').map((s) => Number(s.trim())).filter(Number.isFinite);
  rows = ids.map((id) => db.prepare('SELECT * FROM audio_source WHERE id = ?').get(id)).filter(Boolean);
} else {
  console.error('Nothing selected. Pass --ids 1,2,3 or --music.');
  process.exit(1);
}

if (!rows.length) { console.error('No matching sources.'); process.exit(1); }

console.log(`\n  ${rows.length} file${rows.length === 1 ? '' : 's'} to import\n`);
let totalIn = 0;
for (const r of rows) {
  totalIn += r.bytes ?? 0;
  const reasons = JSON.parse(r.risk_reasons ?? '[]');
  console.log(`  [${String(r.id).padStart(5)}] ${r.risk.padEnd(6)} ${(r.category ?? 'UNKNOWN').padEnd(11)} ${r.duration_s?.toFixed(1)}s  ${r.filename}`);
  if (reasons.length) console.log(`          ${reasons.join('; ')}`);
}
console.log(`\n  source size ${(totalIn / 1e6).toFixed(1)} MB (output will differ after conversion)`);

const risky = rows.filter((r) => r.risk === 'AVOID');
if (risky.length) {
  console.log(`\n  ${risky.length} of these are marked AVOID. Importing anyway is a deliberate act;`);
  console.log('  they will still carry their reasons in the asset registry.');
}

if (DRY) { console.log('\n  --dry-run: nothing written.\n'); process.exit(0); }

const insert = db.prepare(`
  INSERT INTO audio_asset
    (id, type, category, subcategory, tags, rel_path, sha256, duration_s, peak_db, rms_db,
     source_pack, source_filename, provenance, usage_count, imported_at)
  VALUES (@id, @type, @category, @subcategory, @tags, @rel_path, @sha256, @duration_s, @peak_db,
          @rms_db, @source_pack, @source_filename, @provenance, 0, @imported_at)
  ON CONFLICT(rel_path) DO UPDATE SET sha256 = excluded.sha256, duration_s = excluded.duration_s`);

let written = 0;
let outBytes = 0;

for (const r of rows) {
  if (!existsSync(r.path)) { console.log(`  MISSING ${r.filename}`); continue; }

  const destDir = join(PUBLIC, DEST(r.category));
  mkdirSync(destDir, { recursive: true });
  const id = slugify(r.filename, r.category, r.subcategory);
  const isMusic = r.category === 'MUSIC';
  const ext = isMusic ? 'mp3' : 'wav';
  const rel = `${DEST(r.category)}/${id}.${ext}`;
  const abs = join(PUBLIC, rel);

  /*
   * Mono 48 kHz to match the narration and the generated effects, and a limiter rather than
   * loudness normalisation: these are short cues whose loudness is set by the mix, but whose
   * PEAK must be tamed so nothing in the library can clip the master on its own.
   */
  const res = spawnSync(FFMPEG, [
    '-hide_banner', '-nostdin', '-y', '-i', r.path,
    '-ac', '1', '-ar', '48000',
    '-af', isMusic
      ? 'loudnorm=I=-30:TP=-6:LRA=11,afade=t=in:st=0:d=0.02'
      : 'alimiter=limit=0.89:level=false,afade=t=in:st=0:d=0.01',
    ...(isMusic ? ['-c:a', 'libmp3lame', '-b:a', '128k'] : ['-c:a', 'pcm_s16le']),
    // (music also carries the loudnorm filter set above)
    abs,
  ], { timeout: 120_000 });

  if (res.status !== 0 || !existsSync(abs)) {
    console.log(`  FAILED  ${r.filename} — ffmpeg exit ${res.status}`);
    continue;
  }

  const buf = readFileSync(abs);
  const sha = `sha256:${createHash('sha256').update(buf).digest('hex')}`;
  outBytes += statSync(abs).size;

  insert.run({
    id, type: r.category === 'MUSIC' ? 'MUSIC' : 'SFX',
    category: r.category, subcategory: r.subcategory,
    tags: r.tags ?? '[]', rel_path: rel, sha256: sha,
    duration_s: r.duration_s, peak_db: r.peak_db, rms_db: r.rms_db,
    source_pack: r.pack, source_filename: r.filename,
    // Never upgraded by this tool. Importing a file says nothing about its licence.
    provenance: 'USER_PROVIDED_UNKNOWN_LICENSE',
    imported_at: now(),
  });
  db.prepare('UPDATE audio_source SET imported_id = ?, shortlisted = 1 WHERE id = ?').run(id, r.id);

  console.log(`  + ${rel}  (${(statSync(abs).size / 1e6).toFixed(2)} MB)`);
  written++;
}

console.log(`\n  imported ${written} file${written === 1 ? '' : 's'}, ${(outBytes / 1e6).toFixed(1)} MB added to the repository`);
console.log('  provenance: USER_PROVIDED_UNKNOWN_LICENSE — confirm before anything is published\n');
