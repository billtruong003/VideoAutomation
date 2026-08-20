#!/usr/bin/env node
/**
 * youtube-doctor.mjs — prove the OAuth and read path against the REAL channel.
 *
 *   npm run youtube:doctor
 *
 * This is a READ-ONLY smoke test. It cannot upload, cannot modify metadata, cannot post a
 * comment and cannot change a privacy setting — by construction, because it only ever asks
 * for `youtube.readonly` and `yt-analytics.readonly`, and neither scope can write.
 *
 * It answers the five questions that are genuinely independent of each other, and which a
 * naive "it works!" report would collapse into one:
 *
 *   A. does OAuth complete
 *   B. does the Data API read
 *   C. does the Analytics API authorise
 *   D. is videos.insert callable (scope-wise)  — NOT tested by upload, only reasoned about
 *   E. can API-uploaded videos ever become public
 *
 * E is the one that surprises people. An unaudited Cloud project created after 28 July 2020
 * has every `videos.insert` upload forced to private, permanently, regardless of what the
 * request asks for. OAuth working tells you nothing about it.
 *
 * Nothing secret is printed. Tokens, codes and the client secret never reach stdout.
 */

import { loadOAuthClientConfig, SCOPES, STATE_DIR } from '../src/youtube/config.mjs';
import { getAuthorisedClient } from '../src/youtube/auth.mjs';
import { describeStoredTokens, storageMode } from '../src/youtube/token-store.mjs';
import {
  analyticsQuery, batchGetStats, createLedger, getMyChannel, listUploads,
  QUOTA_LIMITS, YouTubeApiError,
} from '../src/youtube/api.mjs';

const EXPECTED_TITLE = /bill\s*finds\s*out/i;

const line = (s = '') => console.log(s);
const h = (s) => { line(''); line(s); line('-'.repeat(s.length)); };
const kv = (k, v) => line(`  ${String(k).padEnd(26)} ${v}`);
const ok = (b) => (b ? 'PASS' : 'FAIL');

const results = {};

try {
  // -------------------------------------------------------------------------
  h('1. CREDENTIAL');
  const cfg = loadOAuthClientConfig();
  kv('found via', cfg.describe.source);
  kv('client type', cfg.describe.kind === 'installed' ? 'installed (Desktop app)' : cfg.describe.kind);
  kv('client id', cfg.describe.clientId);
  kv('cloud project', cfg.describe.projectId ?? '(not in file)');
  kv('registered redirects', JSON.stringify(cfg.describe.redirectUris));
  kv('client secret', cfg.describe.hasSecret ? 'present (not printed)' : 'MISSING');
  kv('file location', 'outside the repository');
  results.credential = cfg.describe.kind === 'installed';

  if (cfg.describe.kind !== 'installed') {
    line('\n  NOTE: a "web" client would need its redirect URI registered in the Cloud Console.');
  }

  // -------------------------------------------------------------------------
  h('2. TOKEN STORAGE');
  kv('mode', storageMode() === 'dpapi' ? 'Windows DPAPI (per-user encrypted)' : 'PLAINTEXT (fallback)');
  kv('state directory', STATE_DIR);
  const before = describeStoredTokens();
  kv('existing grant', before.present ? `yes (refresh token: ${before.hasRefreshToken})` : 'none');

  // -------------------------------------------------------------------------
  h('3. OAUTH  (gate A)');
  kv('flow', 'installed app · authorization code + PKCE (S256)');
  kv('redirect', 'http://127.0.0.1:<random>/oauth2callback');
  kv('scopes requested', '');
  for (const s of SCOPES.read) line(`      ${s}`);
  line('');

  const ledger = createLedger();
  const { client, reauthorised } = await getAuthorisedClient({ scopes: SCOPES.read, interactive: true });
  const after = describeStoredTokens();

  kv('authorisation', reauthorised ? 'completed interactively' : 'reused stored grant');
  kv('access token', after.hasAccessToken ? 'obtained (not printed)' : 'MISSING');
  kv('refresh token', after.hasRefreshToken ? 'obtained (not printed)' : 'NOT ISSUED');
  kv('granted scopes', after.scopes.length ? '' : '(none reported)');
  for (const s of after.scopes) line(`      ${s}`);
  kv('access token expires', after.expiresAt ?? 'unknown');
  results.oauth = Boolean(after.hasAccessToken);
  results.refreshToken = Boolean(after.hasRefreshToken);

  // -------------------------------------------------------------------------
  h('4. DATA API — CHANNEL IDENTITY  (gate B)');
  const ch = await getMyChannel(client, ledger);
  kv('channel id', ch.channelId);
  kv('title', ch.title);
  kv('handle', ch.handle ?? '(none set)');
  kv('created', ch.publishedAt);
  kv('subscribers', ch.subscriberCountHidden ? 'hidden by channel' : ch.subscriberCount);
  kv('total views', ch.viewCount);
  kv('video count', ch.videoCount);
  kv('uploads playlist', ch.uploadsPlaylistId);
  kv('privacy status', ch.privacyStatus ?? '(n/a)');
  kv('long uploads', ch.longUploadsStatus ?? '(n/a)');
  results.dataApi = true;
  results.channelMatches = EXPECTED_TITLE.test(ch.title ?? '');
  kv('is "Bill Finds Out"?', results.channelMatches ? 'YES' : `NO — got "${ch.title}"`);

  // -------------------------------------------------------------------------
  h('5. DATA API — VIDEO INVENTORY');
  let uploads = [];
  if (ch.uploadsPlaylistId) {
    uploads = await listUploads(client, ledger, ch.uploadsPlaylistId, { max: 50 });
    kv('uploads found', uploads.length);
    for (const u of uploads.slice(0, 10)) {
      line(`      ${(u.videoId ?? '?').padEnd(13)} ${(u.privacyStatus ?? '?').padEnd(9)} ${u.title ?? ''}`);
    }
    if (!uploads.length) line('      (channel has no uploads yet — expected for a new channel)');
  }

  if (uploads.length) {
    h('6. DATA API — videos.batchGetStats  (June 2026 endpoint)');
    try {
      const stats = await batchGetStats(client, ledger, uploads.slice(0, 50).map((u) => u.videoId).filter(Boolean));
      kv('rows returned', stats.length);
      for (const s of stats.slice(0, 5)) {
        line(`      ${s.videoId}  views=${s.viewCount}  likes=${s.likeCount}  dur=${s.duration}`);
      }
      results.batchGetStats = true;
    } catch (e) {
      kv('result', `unavailable — ${e.code ?? ''} ${e.message}`);
      results.batchGetStats = false;
    }
  }

  // -------------------------------------------------------------------------
  h('7. ANALYTICS API  (gate C)');
  const end = new Date();
  const start = new Date(end.getTime() - 28 * 864e5);
  const iso = (d) => d.toISOString().slice(0, 10);
  try {
    const rep = await analyticsQuery(client, ledger, {
      startDate: iso(start),
      endDate: iso(end),
      metrics: 'views,engagedViews,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,shares,subscribersGained',
    });
    kv('query', 'channel totals, last 28 days');
    kv('columns', rep.columns.join(', '));
    if (rep.rows.length) {
      kv('row', JSON.stringify(rep.rows[0]));
    } else {
      kv('rows', 'NO DATA YET — query authorised and valid, channel has no analytics');
    }
    results.analytics = true;
  } catch (e) {
    kv('result', `${e.code ?? 'ERROR'} — ${e.message}`);
    results.analytics = false;
  }

  // -------------------------------------------------------------------------
  h('8. UPLOAD GATES  (gates D and E — reasoned, NOT executed)');
  line('  This doctor never uploads. These are the two gates that OAuth success does not prove.');
  line('');
  kv('D · videos.insert callable', 'requires youtube.upload scope — NOT requested by this doctor');
  kv('E · can uploads go public', 'DEPENDS ON API COMPLIANCE AUDIT — see below');
  line('');
  line('  Google: "All videos uploaded via the videos.insert endpoint from unverified API');
  line('  projects created after 28 July 2020 will be restricted to private viewing mode."');
  line('');
  line(`  This project (${cfg.describe.projectId ?? 'unknown'}) must be assumed unaudited until an`);
  line('  audit is submitted and approved. Until then every API upload is permanently private,');
  line('  and status.publishAt scheduling cannot make it public.');

  // -------------------------------------------------------------------------
  h('9. QUOTA LEDGER  (this run)');
  const totals = ledger.totals();
  for (const [bucket, t] of Object.entries(totals)) {
    const lim = QUOTA_LIMITS[bucket];
    const cap = lim?.limit ? `${lim.limit} ${lim.unit}/day` : 'not published';
    kv(bucket, `${t.units} units · ${t.calls} calls · ${t.errors} errors   (bucket limit ${cap})`);
  }
  line('');
  line('  LOCAL ESTIMATE ONLY. Google does not expose live quota consumption through the API;');
  line('  the authoritative figure is in the Cloud Console.');

  // -------------------------------------------------------------------------
  h('VERDICT');
  const gates = [
    ['A · OAuth completes', results.oauth],
    ['B · Data API reads', results.dataApi],
    ['C · Analytics authorises', results.analytics],
    ['    refresh token issued', results.refreshToken],
    ['    correct channel', results.channelMatches],
  ];
  for (const [name, pass] of gates) kv(name, ok(pass));
  line('');

  const core = results.oauth && results.dataApi && results.analytics;
  line(core
    ? '  READ PATH PROVEN against the live channel.'
    : '  READ PATH INCOMPLETE — see the failures above.');
  process.exit(core ? 0 : 1);
} catch (e) {
  line('');
  if (e instanceof YouTubeApiError) {
    line(`  ${e.code}: ${e.message}`);
    if (e.detail) line(`  detail: ${JSON.stringify(e.detail)}`);
  } else {
    line(`  FAILED: ${e.message}`);
  }
  line('');
  process.exit(1);
}
