/**
 * audio-reclassify.mjs — re-run classification and risk over the existing index.
 *
 * Decoding 3,733 files took two and a half minutes; the labels derived from those
 * measurements take under a second. Keeping them separate means the taxonomy can be
 * corrected as often as it needs to be without touching the source packs again.
 *
 *   node tools/audio-reclassify.mjs
 */

import { getDb } from '../src/youtube/db/index.mjs';
import { classify, assessRisk, RISK } from '../src/youtube/audio/classify.mjs';

const db = getDb();
const rows = db.prepare('SELECT id, pack, filename, duration_s, rms_db, silence_ratio FROM audio_source').all();

const update = db.prepare(
  'UPDATE audio_source SET category=?, subcategory=?, tags=?, risk=?, risk_reasons=? WHERE id=?');

const counts = { byRisk: {}, byCat: {} };

db.transaction(() => {
  for (const r of rows) {
    const f = {
      filename: r.filename, pack: r.pack,
      duration: r.duration_s ?? 0, rmsDb: r.rms_db, silenceRatio: r.silence_ratio,
    };
    const c = classify(f);
    const { risk, reasons } = assessRisk(f, c);
    update.run(c.category, c.subcategory, JSON.stringify(c.tags ?? []), risk, JSON.stringify(reasons), r.id);
    counts.byRisk[risk] = (counts.byRisk[risk] ?? 0) + 1;
    const k = c.category ?? 'UNKNOWN';
    counts.byCat[k] = (counts.byCat[k] ?? 0) + 1;
  }
})();

const uniq = (sql) => db.prepare(sql).get().n;
console.log(`\n  reclassified ${rows.length} rows\n`);
console.log('  RISK (all rows)');
for (const [k, v] of Object.entries(counts.byRisk).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k.padEnd(8)} ${String(v).padStart(5)}`);
}
console.log('\n  RISK (unique sounds only, duplicates excluded)');
for (const k of Object.values(RISK)) {
  console.log(`    ${k.padEnd(8)} ${String(uniq(`SELECT COUNT(*) n FROM audio_source WHERE dup_of IS NULL AND risk='${k}'`)).padStart(5)}`);
}
console.log('\n  USABLE by category');
for (const r of db.prepare(
  "SELECT COALESCE(category,'UNKNOWN') c, COUNT(*) n FROM audio_source WHERE dup_of IS NULL AND risk='USABLE' GROUP BY c ORDER BY n DESC").all()) {
  console.log(`    ${r.c.padEnd(12)} ${String(r.n).padStart(4)}`);
}
console.log();
