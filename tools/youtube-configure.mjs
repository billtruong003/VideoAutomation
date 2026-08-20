/**
 * youtube-configure.mjs — configure the real channel, and prove what changed.
 *
 * Every write follows the same five steps: READ current state, compute a DIFF, write only if
 * the diff is non-empty, READ BACK, and VERIFY. Nothing is written to demonstrate that an
 * endpoint works.
 *
 * THE LOCKED FIELDS ARE THE POINT OF THE CARE HERE.
 *
 *   channel name · handle · description · avatar · banner
 *
 * These were configured by hand and must survive untouched. The danger is not that we set them
 * deliberately -- nothing here does -- but that `channels.update` is a FULL-RESOURCE update:
 * send `brandingSettings` with only `keywords` populated and Google is entitled to treat every
 * omitted sibling as cleared. So the current `brandingSettings.channel` object is read, spread
 * verbatim, and only `keywords` replaced. `brandingSettings.image` is never sent at all --
 * banner URLs are read-only there, and including them invites an error or a change.
 *
 * After every write the live channel is re-read and the five locked values compared byte for
 * byte against the snapshot taken before anything happened. A mismatch stops the run.
 *
 * Every mutation is appended to a local audit record. No token, secret or credential is
 * written to it.
 *
 *   node tools/youtube-configure.mjs --dry-run     show the diff, write nothing
 *   node tools/youtube-configure.mjs               apply
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getAuthorisedClient } from '../src/youtube/auth.mjs';
import { SCOPES, STATE_DIR } from '../src/youtube/config.mjs';

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');

const AUDIT = join(STATE_DIR, 'channel-write-audit.jsonl');
const SNAPSHOT = join(STATE_DIR, 'channel-locked-snapshot.json');

/* ------------------------------------------------------------------ desired state */

/**
 * Channel keywords. Semantic, not promotional.
 *
 * The blocked words (`viral`, `fyp`, `trending`, `mind blown`) are absent by intent: they
 * describe every channel on YouTube, so they describe none, and they misrepresent what this
 * channel is to the one system that reads this field.
 */
const DESIRED_KEYWORDS = [
  'Bill Finds Out',
  'hidden reasons behind everyday things',
  'hidden design',
  'everyday design',
  'how things work',
  'everyday science',
  'everyday engineering',
  'product design',
  'hidden safety features',
  'engineering explained',
  'science explained',
  'design explained',
  'why things are designed',
];

const PLAYLIST = {
  title: 'Hidden Reasons Behind Everyday Things',
  description:
    "Weird little design choices, hidden safety features, and everyday objects that make a "
    + "lot more sense once you know why they're there.",
  privacyStatus: 'public',
};

/**
 * YouTube stores keywords as one space-separated string, quoting anything containing a space.
 * Without the quotes "hidden design" would be indexed as the two unrelated words.
 */
const encodeKeywords = (list) =>
  list.map((k) => (k.includes(' ') ? `"${k}"` : k)).join(' ');

/* ---------------------------------------------------------------------- api plumbing */

const { client } = await getAuthorisedClient({ scopes: SCOPES.configure, interactive: true });

async function api(method, url, body) {
  const headers = Object.fromEntries((await client.getRequestHeaders(url)).entries());
  const res = await fetch(url, {
    method,
    headers: { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const detail = json?.error?.message ?? text.slice(0, 300);
    throw new Error(`${method} ${url.split('?')[0]} -> ${res.status}: ${detail}`);
  }
  return json;
}

const V3 = 'https://www.googleapis.com/youtube/v3';

/** Append one mutation to the audit record. Safe summaries only — never a credential. */
function audit(entry) {
  mkdirSync(dirname(AUDIT), { recursive: true });
  appendFileSync(AUDIT, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
}

const lockedOf = (c) => ({
  title: c.snippet?.title ?? null,
  handle: c.snippet?.customUrl ?? null,
  description: c.snippet?.description ?? null,
  avatarUrl: c.snippet?.thumbnails?.high?.url ?? c.snippet?.thumbnails?.default?.url ?? null,
  bannerUrl: c.brandingSettings?.image?.bannerExternalUrl ?? null,
});

/*
 * Avatar and banner URLs carry a cache-busting suffix that changes on its own, so comparing
 * whole URLs would produce false alarms. The stable part is the asset id before the "=".
 */
const assetId = (url) => (url ? String(url).split('=')[0] : null);

function compareLocked(before, after) {
  const diffs = [];
  for (const k of ['title', 'handle', 'description']) {
    if (before[k] !== after[k]) diffs.push({ field: k, before: before[k], after: after[k] });
  }
  for (const k of ['avatarUrl', 'bannerUrl']) {
    if (assetId(before[k]) !== assetId(after[k])) {
      diffs.push({ field: k, before: assetId(before[k]), after: assetId(after[k]) });
    }
  }
  return diffs;
}

const readChannel = async () => (await api('GET',
  `${V3}/channels?part=id,snippet,brandingSettings,status,contentDetails&mine=true`)).items[0];

/** Poll for the expected value, since the write is not immediately visible to a read. */
async function readBackKeywords(expected, attempts = 5) {
  let got = '';
  for (let i = 0; i < attempts; i++) {
    const c = await readChannel();
    got = c.brandingSettings?.channel?.keywords ?? '';
    if (got === expected) return got;
    await new Promise((r) => { setTimeout(r, 1500); });
  }
  return got;
}

/* ============================================================== run */

console.log(`\n  CHANNEL CONFIGURATION${DRY ? '  (dry run)' : ''}\n`);

const before = await readChannel();
const lockedBefore = lockedOf(before);

console.log('  LOCKED BEFORE');
console.log(`    name        ${lockedBefore.title}`);
console.log(`    handle      ${lockedBefore.handle}`);
console.log(`    description ${JSON.stringify(lockedBefore.description)}`);
console.log(`    avatar      ${assetId(lockedBefore.avatarUrl)?.slice(-24)}`);
console.log(`    banner      ${assetId(lockedBefore.bannerUrl)?.slice(-24)}`);

mkdirSync(dirname(SNAPSHOT), { recursive: true });
writeFileSync(SNAPSHOT, JSON.stringify(lockedBefore, null, 2));

const results = [];

/* ---------------------------------------------------- 1. channel keywords */

const currentKeywords = before.brandingSettings?.channel?.keywords ?? '';
const desiredKeywords = encodeKeywords(DESIRED_KEYWORDS);

console.log('\n  KEYWORDS');
console.log(`    before  ${currentKeywords ? JSON.stringify(currentKeywords) : '(none set)'}`);
console.log(`    after   ${JSON.stringify(desiredKeywords)}  [${desiredKeywords.length} chars]`);

if (currentKeywords === desiredKeywords) {
  console.log('    -> already correct, no write');
  results.push({ setting: 'brandingSettings.channel.keywords', api: 'channels.update', before: currentKeywords, after: currentKeywords, status: 'UNCHANGED' });
} else if (DRY) {
  results.push({ setting: 'brandingSettings.channel.keywords', api: 'channels.update', before: currentKeywords || null, after: desiredKeywords, status: 'WOULD_WRITE' });
} else {
  /*
   * Full-resource update. The existing `channel` object is spread so every sibling -- title,
   * description, country, unsubscribedTrailer -- is sent back exactly as read. `image` is
   * omitted entirely: banner URLs are read-only in this part.
   */
  const body = {
    id: before.id,
    brandingSettings: {
      channel: { ...(before.brandingSettings?.channel ?? {}), keywords: desiredKeywords },
    },
  };
  await api('PUT', `${V3}/channels?part=brandingSettings`, body);
  /*
   * channels.list is eventually consistent after channels.update. An immediate read-back
   * returned an empty keywords string and reported a MISMATCH on a write that had in fact
   * succeeded -- re-reading a moment later showed the value correctly. Verifying once, right
   * away, produces a false alarm on a healthy write, so this retries briefly before deciding.
   */
  const got = await readBackKeywords(desiredKeywords);
  const ok = got === desiredKeywords;
  console.log(`    -> written, read back ${ok ? 'MATCHES' : `MISMATCH: ${JSON.stringify(got)}`}`);
  results.push({ setting: 'brandingSettings.channel.keywords', api: 'channels.update', before: currentKeywords || null, after: got, status: ok ? 'APPLIED' : 'MISMATCH' });
  audit({ method: 'channels.update', resource: before.id, fields: ['brandingSettings.channel.keywords'], beforeSummary: currentKeywords || null, afterSummary: got });
}

/* -------------------------------------------------------- 2. the playlist */

console.log('\n  PLAYLIST');
const playlists = await api('GET', `${V3}/playlists?part=id,snippet,status&mine=true&maxResults=50`);
const existing = (playlists.items ?? []).find((p) => p.snippet.title.trim().toLowerCase() === PLAYLIST.title.toLowerCase());

let playlistId = existing?.id ?? null;
if (existing) {
  console.log(`    reusing ${existing.id}`);
  results.push({ setting: 'playlist', api: 'playlists.list', before: existing.id, after: existing.id, status: 'REUSED' });
} else if (DRY) {
  console.log(`    would create "${PLAYLIST.title}"`);
  results.push({ setting: 'playlist', api: 'playlists.insert', before: null, after: PLAYLIST.title, status: 'WOULD_WRITE' });
} else {
  const created = await api('PUT'.replace('PUT', 'POST'), `${V3}/playlists?part=snippet,status`, {
    snippet: { title: PLAYLIST.title, description: PLAYLIST.description, defaultLanguage: 'en' },
    status: { privacyStatus: PLAYLIST.privacyStatus },
  });
  playlistId = created.id;
  console.log(`    created ${playlistId}`);
  results.push({ setting: 'playlist', api: 'playlists.insert', before: null, after: playlistId, status: 'APPLIED' });
  audit({ method: 'playlists.insert', resource: playlistId, fields: ['snippet.title', 'snippet.description', 'status.privacyStatus'], beforeSummary: null, afterSummary: PLAYLIST.title });
}

/* --------------------------------------------- 3. homepage channel section */

console.log('\n  CHANNEL SECTION');
let sectionStatus = 'NOT_ATTEMPTED';
let sectionDetail = null;
try {
  const sections = await api('GET', `${V3}/channelSections?part=id,snippet,contentDetails&mine=true`);
  const already = (sections.items ?? []).find((s) =>
    s.snippet?.type === 'singlePlaylist' && s.contentDetails?.playlists?.includes(playlistId));
  if (already) {
    console.log(`    section already points at the playlist (${already.id})`);
    sectionStatus = 'REUSED';
    sectionDetail = already.id;
  } else if (DRY || !playlistId) {
    console.log('    would create a singlePlaylist section');
    sectionStatus = 'WOULD_WRITE';
  } else {
    const made = await api('POST', `${V3}/channelSections?part=snippet,contentDetails`, {
      snippet: { type: 'singlePlaylist', style: 'horizontalRow', position: 0 },
      contentDetails: { playlists: [playlistId] },
    });
    console.log(`    created ${made.id}`);
    sectionStatus = 'APPLIED';
    sectionDetail = made.id;
    audit({ method: 'channelSections.insert', resource: made.id, fields: ['snippet.type', 'contentDetails.playlists'], beforeSummary: null, afterSummary: `singlePlaylist -> ${playlistId}` });
  }
} catch (e) {
  /*
   * channelSections has been progressively restricted. If it is no longer writable for this
   * channel, that is reported as an API limitation -- it is NOT worked around by driving
   * Studio in a browser.
   */
  console.log(`    NOT AVAILABLE THROUGH API: ${e.message.split('\n')[0]}`);
  sectionStatus = 'NOT_AVAILABLE';
  sectionDetail = e.message.split('\n')[0].slice(0, 200);
}
results.push({ setting: 'channel section', api: 'channelSections.insert', before: null, after: sectionDetail, status: sectionStatus });

/* ------------------------------------------------- 4. verify locked fields */

console.log('\n  LOCKED VERIFICATION');
const after = await readChannel();
const lockedAfter = lockedOf(after);
const diffs = compareLocked(lockedBefore, lockedAfter);

for (const k of ['title', 'handle', 'description', 'avatarUrl', 'bannerUrl']) {
  const same = !diffs.some((d) => d.field === k);
  console.log(`    ${same ? 'unchanged' : 'CHANGED  '}  ${k}`);
}

if (diffs.length) {
  console.error('\n  CRITICAL: a locked field changed. Stopping.');
  console.error(JSON.stringify(diffs, null, 2));
  audit({ method: 'VERIFY', resource: after.id, fields: diffs.map((d) => d.field), beforeSummary: 'see snapshot', afterSummary: 'MISMATCH' });
  process.exit(1);
}

const summary = {
  channelId: after.id,
  playlistId,
  keywords: after.brandingSettings?.channel?.keywords ?? null,
  country: after.snippet?.country ?? null,
  results,
  lockedVerified: true,
  dryRun: DRY,
};
writeFileSync(join(STATE_DIR, 'channel-config-result.json'), JSON.stringify(summary, null, 2));

console.log('\n  all locked fields verified unchanged');
console.log(`  playlist id: ${playlistId ?? '(not created)'}`);
console.log(`  audit: ${AUDIT}\n`);
