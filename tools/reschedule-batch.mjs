/**
 * reschedule-batch.mjs — move already-uploaded videos to new publish times.
 *
 * SCHEDULE CORRECTION ONLY. Nothing here uploads, deletes, or touches copy: the only field
 * written is `status.publishAt`, and `privacyStatus` is re-sent as `private` purely because
 * publishAt is meaningless without it.
 *
 * videos.update REPLACES the part it is given, so the current status is read first and sent
 * back with only publishAt changed. Building a status object by hand would clear whatever was
 * omitted -- madeForKids, the synthetic-content declaration, embeddable and license among them.
 *
 * Verification re-reads with retry. videos.update is eventually consistent, and reading back
 * immediately returns the OLD publishAt on an update that has in fact been accepted.
 *
 *   node tools/reschedule-batch.mjs --plan tmp/reschedule-plan.json [--dry-run]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { getDb, now } from '../src/youtube/db/index.mjs';
import { scheduleVideo, readVideo, api } from '../src/youtube/release.mjs';

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const planPath = argv[argv.indexOf('--plan') + 1] ?? 'tmp/reschedule-plan.json';

const db = getDb();
const plan = JSON.parse(readFileSync(planPath, 'utf8'));
const PLAYLIST = 'PLGqOZxhW6Pak';

/** Tags compare as a SET: YouTube returns them alphabetically, not in submission order. */
const sameTags = (a, b) => {
  const x = [...(a ?? [])].map((t) => t.toLowerCase()).sort();
  const y = [...(b ?? [])].map((t) => t.toLowerCase()).sort();
  return x.length === y.length && x.every((t, i) => t === y[i]);
};

const members = new Set((await api('GET',
  `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${PLAYLIST}&maxResults=50`)
).items?.map((i) => i.contentDetails.videoId) ?? []);

const results = [];
console.log(`\n  RESCHEDULE${DRY ? ' (dry run)' : ''} — ${plan.length} videos\n`);

for (const e of plan) {
  // Snapshot everything that must NOT change, before touching anything.
  const before = await readVideo(e.videoId);
  if (!before) { console.log(`  ${e.contentId}: not found`); continue; }
  const snap = {
    title: before.snippet.title,
    description: before.snippet.description,
    tags: before.snippet.tags ?? [],
    madeForKids: before.status.madeForKids,
    embeddable: before.status.embeddable,
    license: before.status.license,
    categoryId: before.snippet.categoryId,
    defaultLanguage: before.snippet.defaultLanguage,
  };
  const capsBefore = (await api('GET',
    `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${e.videoId}`)).items ?? [];

  if (DRY) {
    console.log(`  ${e.contentId.padEnd(22)} would set ${e.publishAtUtc}`);
    continue;
  }

  await scheduleVideo(e.videoId, e.publishAtUtc);

  /* Read back with retry — the write is not immediately visible. */
  let after = await readVideo(e.videoId);
  for (let i = 0; i < 6 && after?.status?.publishAt !== e.publishAtUtc.replace('.000Z', 'Z'); i++) {
    await new Promise((r) => { setTimeout(r, 2500); });
    after = await readVideo(e.videoId);
  }
  const capsAfter = (await api('GET',
    `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${e.videoId}`)).items ?? [];

  const expected = e.publishAtUtc.replace('.000Z', 'Z');
  const check = {
    publishAt: after?.status?.publishAt === expected,
    privacy: after?.status?.privacyStatus === 'private',
    title: after?.snippet?.title === snap.title,
    description: after?.snippet?.description === snap.description,
    tags: sameTags(after?.snippet?.tags, snap.tags),
    madeForKids: after?.status?.madeForKids === snap.madeForKids,
    embeddable: after?.status?.embeddable === snap.embeddable,
    license: after?.status?.license === snap.license,
    category: after?.snippet?.categoryId === snap.categoryId,
    processing: (after?.processingDetails?.processingStatus ?? 'succeeded') === 'succeeded',
    playlist: members.has(e.videoId),
    captions: capsAfter.length === capsBefore.length,
  };
  const ok = Object.values(check).every(Boolean);

  db.prepare(`UPDATE youtube_video SET publish_at = ?, privacy_status = ?, schedule_status = ?,
              last_synced_at = ? WHERE video_id = ?`)
    .run(after?.status?.publishAt ?? null, after?.status?.privacyStatus ?? null,
      ok ? 'RESCHEDULED_VERIFIED' : 'NEEDS_REVIEW', now(), e.videoId);

  const failed = Object.entries(check).filter(([, v]) => !v).map(([k]) => k);
  console.log(`  ${e.contentId.padEnd(22)} ${e.videoId}  ${after?.status?.publishAt}  `
    + `${ok ? 'RESCHEDULED_VERIFIED' : `NEEDS_REVIEW (${failed.join(', ')})`}`);

  results.push({ ...e, actualPublishAt: after?.status?.publishAt ?? null, check, state: ok ? 'RESCHEDULED_VERIFIED' : 'NEEDS_REVIEW' });
}

if (!DRY) {
  writeFileSync('tmp/reschedule-results.json', JSON.stringify(results, null, 2));
  const good = results.filter((r) => r.state === 'RESCHEDULED_VERIFIED').length;
  console.log(`\n  ${good}/${results.length} RESCHEDULED_VERIFIED\n`);
}
