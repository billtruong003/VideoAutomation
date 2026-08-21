#!/usr/bin/env node
/**
 * live-state.mjs — read the channel as it ACTUALLY is, right now.
 *
 *   node tools/live-state.mjs [--json]
 *
 * Every scheduling decision has to start here rather than from a stored plan. This channel has
 * been edited by hand between phases — a video published manually, a slot moved in Studio — and
 * a local release calendar that disagrees with YouTube is not a record of anything.
 *
 * Read-only, and cheap: `playlistItems.list` and `videos.list` are 1 unit each.
 */

import { getAuthorisedClient } from '../src/youtube/auth.mjs';
import { SCOPES } from '../src/youtube/config.mjs';

const V3 = 'https://www.googleapis.com/youtube/v3';

/*
 * READ SCOPES ONLY. This tool must stay runnable when no write grant exists, because
 * "what is actually on the channel" is the question you most need answered when the
 * write path is broken.
 */
const { client } = await getAuthorisedClient({ scopes: SCOPES.read, interactive: false });
async function api(method, url) {
  const headers = Object.fromEntries((await client.getRequestHeaders(url)).entries());
  const res = await fetch(url, { method, headers });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(json?.error?.message ?? `${res.status} ${res.statusText}`);
  return json;
}
const TZ_NY = 'America/New_York';
const TZ_KST = 'Asia/Seoul';

/**
 * Format an instant in a named zone.
 *
 * Through Intl rather than by arithmetic: the offset between New York and Seoul is not
 * constant across a DST boundary, and this batch is scheduled either side of one.
 */
const fmt = (iso, tz) => (iso
  ? new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso)).replace(',', ' ')
  : '—');

const ch = await api('GET', `${V3}/channels?part=contentDetails,snippet&mine=true`);
const channel = ch.items?.[0];
const uploadsId = channel?.contentDetails?.relatedPlaylists?.uploads;

const ids = [];
let pageToken = '';
do {
  const page = await api('GET', `${V3}/playlistItems?part=contentDetails&maxResults=50&playlistId=${uploadsId}${pageToken ? `&pageToken=${pageToken}` : ''}`);
  for (const i of page.items ?? []) ids.push(i.contentDetails.videoId);
  pageToken = page.nextPageToken ?? '';
} while (pageToken);

const videos = [];
for (let i = 0; i < ids.length; i += 50) {
  const chunk = ids.slice(i, i + 50);
  const r = await api('GET', `${V3}/videos?part=snippet,status,contentDetails,processingDetails&id=${chunk.join(',')}`);
  videos.push(...(r.items ?? []));
}

const rows = videos.map((v) => ({
  id: v.id,
  privacy: v.status?.privacyStatus ?? '?',
  publishAt: v.status?.publishAt ?? null,
  publishedAt: v.snippet?.publishedAt ?? null,
  processing: v.processingDetails?.processingStatus ?? v.status?.uploadStatus ?? '?',
  title: v.snippet?.title ?? '',
})).sort((a, b) => String(a.publishAt ?? a.publishedAt).localeCompare(String(b.publishAt ?? b.publishedAt)));

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ channelId: channel?.id, uploadsId, videos: rows }, null, 2));
} else {
  console.log(`channel: ${channel?.snippet?.title} (${channel?.id})`);
  console.log(`uploads playlist: ${uploadsId}`);
  console.log(`videos on channel: ${rows.length}`);
  console.log('');
  console.log('ID           PRIVACY   WHEN (NY)          WHEN (SEOUL)       PROCESSING  TITLE');
  for (const r of rows) {
    const when = r.publishAt ?? (r.privacy === 'public' ? r.publishedAt : null);
    console.log(
      `${r.id}  ${r.privacy.padEnd(8)}  ${fmt(when, TZ_NY).padEnd(17)}  ${fmt(when, TZ_KST).padEnd(17)}  `
      + `${String(r.processing).padEnd(10)}  ${r.title.slice(0, 46)}`,
    );
  }

  const pub = rows.filter((r) => r.privacy === 'public');
  const sched = rows.filter((r) => r.publishAt);
  console.log('');
  console.log(`public: ${pub.length} · has publishAt: ${sched.length} · total: ${rows.length}`);

  /*
   * The compliance question, settled by evidence rather than assumption.
   *
   * An unaudited API project has every uploaded video locked private, and publishAt cannot
   * release it. The doctor can only warn; a PUBLIC video that arrived through the API proves
   * it either way. Whether scheduling this batch means anything at all depends on this one
   * fact, so it gets stated rather than inferred.
   */
  console.log(pub.length > 0
    ? 'COMPLIANCE: a video is PUBLIC — uploads on this project can leave private.'
    : 'COMPLIANCE: nothing public — cannot confirm API uploads may go public.');

  console.log('');
  console.log('OCCUPIED INSTANTS — a Batch 002 slot must not land on one of these:');
  for (const r of rows) {
    const when = r.publishAt ?? (r.privacy === 'public' ? r.publishedAt : null);
    if (when) console.log(`  ${when}   NY ${fmt(when, TZ_NY)}   KST ${fmt(when, TZ_KST)}   ${r.id}`);
  }
}
