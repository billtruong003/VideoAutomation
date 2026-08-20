/**
 * api.mjs — thin adapters over the Google REST endpoints, with quota accounting.
 *
 * WHY HAND-WRITTEN ADAPTERS RATHER THAN THE `googleapis` MEGA-CLIENT
 *
 *   1. The architecture wants Google response shapes kept behind a boundary so domain code
 *      never depends on raw API types. A generated client encourages exactly the opposite.
 *   2. `videos.batchGetStats` shipped on 3 June 2026. Pinning a generated client that may
 *      not know that method yet would mean either waiting for it or bypassing it anyway.
 *   3. `googleapis` is a very large dependency for the handful of endpoints this needs.
 *
 * Authentication still uses the OFFICIAL `google-auth-library`, so token refresh, PKCE and
 * credential handling are not hand-rolled. Only the request shapes are ours.
 *
 * EVERY call goes through `call()`, which is the single place that records quota. That is
 * deliberate: a quota ledger with a second code path is a quota ledger that is wrong.
 */

const DATA_API = 'https://www.googleapis.com/youtube/v3';
const ANALYTICS_API = 'https://youtubeanalytics.googleapis.com/v2';

/**
 * Quota costs, current as of the June 2026 granular-quota change.
 *
 * `bucket` matters as much as `cost`: since 1 June 2026 `search.list` and `videos.insert`
 * each bill to their own daily allowance (100 calls) instead of the shared 10,000-unit pool,
 * and `videos.batchGetStats` (3 June 2026) has a third bucket of its own. Treating these as
 * one pool — as every pre-2026 guide does — would misreport headroom badly in both
 * directions.
 */
export const QUOTA = {
  'channels.list': { cost: 1, bucket: 'default' },
  'playlistItems.list': { cost: 1, bucket: 'default' },
  'playlists.list': { cost: 1, bucket: 'default' },
  'videos.list': { cost: 1, bucket: 'default' },
  'videos.batchGetStats': { cost: 1, bucket: 'batchGetStats' },
  'videos.update': { cost: 50, bucket: 'default' },
  'videos.insert': { cost: 1, bucket: 'videos.insert' },
  'thumbnails.set': { cost: 50, bucket: 'default' },
  'captions.list': { cost: 50, bucket: 'default' },
  'captions.insert': { cost: 400, bucket: 'default' },
  'playlistItems.insert': { cost: 50, bucket: 'default' },
  'commentThreads.list': { cost: 1, bucket: 'default' },
  'comments.insert': { cost: 50, bucket: 'default' },
  'search.list': { cost: 1, bucket: 'search.list' },
  'analytics.query': { cost: 0, bucket: 'analytics' },
};

/** Daily allowances, per the current quota documentation. */
export const QUOTA_LIMITS = {
  default: { limit: 10000, unit: 'units' },
  'search.list': { limit: 100, unit: 'calls' },
  'videos.insert': { limit: 100, unit: 'calls' },
  batchGetStats: { limit: 10000, unit: 'units' },
  analytics: { limit: null, unit: 'requests' },
};

/** In-memory ledger for one process run. The persistent ledger is a SQLite concern. */
export function createLedger() {
  const events = [];
  return {
    events,
    record(method, ok, ms) {
      const q = QUOTA[method] ?? { cost: 0, bucket: 'default' };
      events.push({ method, ...q, ok, ms, at: new Date().toISOString() });
    },
    totals() {
      const out = {};
      for (const e of events) {
        out[e.bucket] ??= { units: 0, calls: 0, errors: 0 };
        out[e.bucket].units += e.cost;
        out[e.bucket].calls += 1;
        if (!e.ok) out[e.bucket].errors += 1;
      }
      return out;
    },
  };
}

/**
 * Normalise a Google error into a domain error, keeping the diagnostic cause.
 *
 * Raw SDK/HTTP errors must not reach the UI: "403" tells a user nothing, while
 * QUOTA_EXCEEDED versus SCOPE_MISSING versus API_DISABLED are three completely different
 * actions. The original reason is preserved on `.cause` for the logs.
 */
export class YouTubeApiError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.name = 'YouTubeApiError';
    this.code = code;
    this.detail = detail;
  }
}

function classify(status, body) {
  const reason = body?.error?.errors?.[0]?.reason ?? body?.error?.status ?? '';
  const message = body?.error?.message ?? `HTTP ${status}`;

  if (status === 401) return new YouTubeApiError('AUTH_EXPIRED', 'Google rejected the credentials.', { reason, message });
  if (reason === 'quotaExceeded' || reason === 'rateLimitExceeded' || reason === 'RESOURCE_EXHAUSTED') {
    return new YouTubeApiError('QUOTA_EXCEEDED', 'Daily API quota exhausted for this bucket.', { reason, message });
  }
  if (reason === 'accessNotConfigured' || /has not been used in project|is disabled/i.test(message)) {
    return new YouTubeApiError('API_DISABLED', 'The API is not enabled for this Google Cloud project.', { reason, message });
  }
  if (status === 403 && /insufficient|scope/i.test(message)) {
    return new YouTubeApiError('SCOPE_MISSING', 'The granted token lacks a required scope.', { reason, message });
  }
  if (status === 403) return new YouTubeApiError('FORBIDDEN', message, { reason, message });
  if (status === 404) return new YouTubeApiError('NOT_FOUND', message, { reason, message });
  if (status >= 500) return new YouTubeApiError('UPSTREAM_ERROR', 'Google returned a server error; retry.', { reason, message });
  return new YouTubeApiError('API_ERROR', message, { reason, message });
}

/**
 * Normalise whatever `getRequestHeaders` returned into a plain object.
 *
 * google-auth-library v10 returns a WHATWG `Headers` instance, and older versions returned a
 * plain object. Spreading a `Headers` with `{...h}` silently yields `{}` — the Authorization
 * header vanishes and Google answers "Method doesn't allow unregistered callers", which
 * looks like a Cloud project misconfiguration rather than the client bug it is.
 */
const toPlainHeaders = (h) =>
  h && typeof h.entries === 'function' ? Object.fromEntries(h.entries()) : { ...(h ?? {}) };

/** The single call path. Everything else in this file goes through here. */
async function call(client, ledger, method, url, init = {}) {
  const started = Date.now();
  let ok = false;
  try {
    const auth = toPlainHeaders(await client.getRequestHeaders(url));
    const res = await fetch(url, { ...init, headers: { ...auth, ...(init.headers ?? {}) } });
    const text = await res.text();
    const body = text ? JSON.parse(text) : {};
    if (!res.ok) throw classify(res.status, body);
    ok = true;
    return body;
  } finally {
    ledger?.record(method, ok, Date.now() - started);
  }
}

const qs = (params) => {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    u.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  return u.toString();
};

// ---------------------------------------------------------------------------
// Data API — read only. Nothing in this file can write.
// ---------------------------------------------------------------------------

/** The authenticated user's channel. `mine=true` is how we resolve identity. */
export async function getMyChannel(client, ledger) {
  const url = `${DATA_API}/channels?${qs({
    part: ['id', 'snippet', 'statistics', 'contentDetails', 'status', 'brandingSettings'],
    mine: true,
  })}`;
  const body = await call(client, ledger, 'channels.list', url);
  const c = body.items?.[0];
  if (!c) throw new YouTubeApiError('NOT_FOUND', 'No channel is associated with this Google account.');

  // Adapter boundary: domain code sees THIS shape, never Google's.
  return {
    channelId: c.id,
    title: c.snippet?.title ?? null,
    handle: c.snippet?.customUrl ?? null,
    publishedAt: c.snippet?.publishedAt ?? null,
    country: c.snippet?.country ?? null,
    uploadsPlaylistId: c.contentDetails?.relatedPlaylists?.uploads ?? null,
    subscriberCount: num(c.statistics?.subscriberCount),
    subscriberCountHidden: Boolean(c.statistics?.hiddenSubscriberCount),
    viewCount: num(c.statistics?.viewCount),
    videoCount: num(c.statistics?.videoCount),
    privacyStatus: c.status?.privacyStatus ?? null,
    isLinked: c.status?.isLinked ?? null,
    longUploadsStatus: c.status?.longUploadsStatus ?? null,
  };
}

const num = (v) => (v === undefined || v === null ? null : Number(v));

/** Page through the uploads playlist — the cheap way to enumerate our own videos. */
export async function listUploads(client, ledger, uploadsPlaylistId, { max = 50 } = {}) {
  const items = [];
  let pageToken;
  do {
    const url = `${DATA_API}/playlistItems?${qs({
      part: ['snippet', 'contentDetails', 'status'],
      playlistId: uploadsPlaylistId,
      maxResults: Math.min(50, max - items.length),
      pageToken,
    })}`;
    const body = await call(client, ledger, 'playlistItems.list', url);
    for (const it of body.items ?? []) {
      items.push({
        videoId: it.contentDetails?.videoId,
        title: it.snippet?.title ?? null,
        publishedAt: it.contentDetails?.videoPublishedAt ?? it.snippet?.publishedAt ?? null,
        privacyStatus: it.status?.privacyStatus ?? null,
        position: it.snippet?.position ?? null,
      });
    }
    pageToken = body.nextPageToken;
  } while (pageToken && items.length < max);
  return items;
}

/**
 * Batched stats for a set of video IDs.
 *
 * Uses `videos.batchGetStats` (added 3 June 2026), which costs 1 unit from its OWN bucket
 * and returns publish time, views, likes, comments and duration. For a stats refresh loop
 * this is strictly better than `videos.list`, which bills the shared 10,000-unit pool that
 * everything else also draws on.
 */
export async function batchGetStats(client, ledger, videoIds) {
  if (!videoIds.length) return [];
  const url = `${DATA_API}/videos:batchGetStats?${qs({
    part: ['id', 'snippet', 'statistics', 'contentDetails'],
    id: videoIds,
  })}`;
  const body = await call(client, ledger, 'videos.batchGetStats', url);
  return (body.items ?? []).map((v) => ({
    videoId: v.id,
    publishTime: v.snippet?.publishTime ?? null,
    viewCount: num(v.statistics?.viewCount),
    likeCount: num(v.statistics?.likeCount),
    commentCount: num(v.statistics?.commentCount),
    duration: v.contentDetails?.duration ?? null,
    durationMs: num(v.contentDetails?.durationMillis),
  }));
}

/** Full video resources, for the fields batchGetStats does not carry. */
export async function getVideos(client, ledger, videoIds, parts = ['snippet', 'status', 'contentDetails', 'statistics', 'processingDetails']) {
  if (!videoIds.length) return [];
  const url = `${DATA_API}/videos?${qs({ part: parts, id: videoIds, maxResults: 50 })}`;
  const body = await call(client, ledger, 'videos.list', url);
  return (body.items ?? []).map((v) => ({
    videoId: v.id,
    title: v.snippet?.title ?? null,
    description: v.snippet?.description ?? null,
    tags: v.snippet?.tags ?? [],
    categoryId: v.snippet?.categoryId ?? null,
    defaultLanguage: v.snippet?.defaultLanguage ?? null,
    publishedAt: v.snippet?.publishedAt ?? null,
    privacyStatus: v.status?.privacyStatus ?? null,
    publishAt: v.status?.publishAt ?? null,
    uploadStatus: v.status?.uploadStatus ?? null,
    rejectionReason: v.status?.rejectionReason ?? null,
    madeForKids: v.status?.madeForKids ?? null,
    processingStatus: v.processingDetails?.processingStatus ?? null,
    duration: v.contentDetails?.duration ?? null,
    viewCount: num(v.statistics?.viewCount),
    likeCount: num(v.statistics?.likeCount),
    commentCount: num(v.statistics?.commentCount),
  }));
}

// ---------------------------------------------------------------------------
// Analytics API — owner reports
// ---------------------------------------------------------------------------

/**
 * Run a YouTube Analytics query.
 *
 * Metric/dimension combinations are NOT arbitrary — the API rejects invalid pairings — so
 * callers are expected to come through the report definitions in `analytics-reports.mjs`
 * rather than assembling strings here.
 */
export async function analyticsQuery(client, ledger, params) {
  const url = `${ANALYTICS_API}/reports?${qs({ ids: 'channel==MINE', ...params })}`;
  const body = await call(client, ledger, 'analytics.query', url);
  return {
    columns: (body.columnHeaders ?? []).map((h) => h.name),
    rows: body.rows ?? [],
    // Analytics data lags; the caller must surface this rather than imply the figures are final.
    meta: { queriedAt: new Date().toISOString(), params },
  };
}
