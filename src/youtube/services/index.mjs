/**
 * services/index.mjs — the domain layer.
 *
 * All business rules live here, not in React and not in route handlers. The frontend renders
 * what these functions return; it never recomputes readiness, approval validity, scoring or
 * capability gates. One source of truth per rule.
 */

import { existsSync, readFileSync } from 'node:fs';
import { getAuthorisedClient } from '../auth.mjs';
import { describeStoredTokens, storageMode } from '../token-store.mjs';
import { loadOAuthClientConfig, SCOPES } from '../config.mjs';
import {
  analyticsQuery, createLedger, getMyChannel, listUploads, QUOTA, QUOTA_LIMITS,
} from '../api.mjs';
import { getDb, now, getSetting, setSetting } from '../db/index.mjs';
import { CAPABILITY, CAPABILITY_META, JOB_STATE, JOB_TYPE, PUBLISH_STATE, PUBLISH_STATE_META, canTransition } from '../domain/states.mjs';
import {
  approvalSnapshot, buildManifest, checkApproval, computeMetadataHash,
  publishReadiness, validateManifest,
} from '../domain/manifest.mjs';
import {
  buildBrief, generateDescriptionDeterministic, generateTagsDeterministic,
  generateTitleCandidatesDeterministic, resolveProvider,
} from '../domain/generate.mjs';
import { lintCandidate, rankCandidates } from '../metadata/lint.mjs';
import { generateDescriptions, lintDescription, CTA_VARIANTS } from '../domain/description.mjs';
import { budgetOf, dedupeTags, generateTags, lintTags } from '../domain/tags.mjs';
import { DomainError, ERROR } from '../server/errors.mjs';
import { log } from '../server/logger.mjs';

// ---------------------------------------------------------------------------
// auth + persistent quota
// ---------------------------------------------------------------------------

/** A ledger that also persists, so quota survives restarts. */
function persistentLedger() {
  const mem = createLedger();
  const db = getDb();
  const ins = db.prepare('INSERT INTO quota_event (method, bucket, cost, ok, ms, at) VALUES (?,?,?,?,?,?)');
  return {
    ...mem,
    record(method, ok, ms) {
      mem.record(method, ok, ms);
      const q = QUOTA[method] ?? { cost: 0, bucket: 'default' };
      try { ins.run(method, q.bucket, q.cost, ok ? 1 : 0, ms, now()); } catch { /* ledger must not break a call */ }
    },
  };
}

let cachedClient = null;
async function client({ interactive = false } = {}) {
  if (cachedClient) return cachedClient;
  const { client: c } = await getAuthorisedClient({ scopes: SCOPES.read, interactive });
  cachedClient = c;
  return c;
}

export async function connect() {
  cachedClient = null;
  const { client: c } = await getAuthorisedClient({ scopes: SCOPES.read, interactive: true });
  cachedClient = c;
  return { connected: true };
}

export async function disconnect() {
  const { clearTokens } = await import('../token-store.mjs');
  clearTokens();
  cachedClient = null;
  // Google API-derived data is dropped with the grant. Our production data is untouched —
  // it was never API data.
  const db = getDb();
  db.exec('DELETE FROM youtube_video; DELETE FROM analytics_snapshot; DELETE FROM retention_point;');
  return { connected: false, cleared: ['youtube_video', 'analytics_snapshot', 'retention_point'] };
}

// ---------------------------------------------------------------------------
// capabilities — "the code can" vs "we are permitted to"
// ---------------------------------------------------------------------------

export function capabilities() {
  const tokens = describeStoredTokens();
  const hasUpload = tokens.scopes?.includes('https://www.googleapis.com/auth/youtube.upload');
  // The compliance audit has not been marked as passed, so public/scheduled writes stay off.
  const auditPassed = getSetting('compliance.auditPassed', 'false') === 'true';

  const out = {};
  const set = (key, allowed, reasonOverride) => {
    out[key] = {
      key, allowed,
      label: CAPABILITY_META[key].label,
      blockedReason: allowed ? null : (reasonOverride ?? CAPABILITY_META[key].blockedReason),
    };
  };
  set(CAPABILITY.OAUTH_READ, Boolean(tokens.present && tokens.hasRefreshToken));
  set(CAPABILITY.PRIVATE_UPLOAD, Boolean(hasUpload));
  set(CAPABILITY.PUBLIC_PUBLISHING, auditPassed);
  set(CAPABILITY.SCHEDULED_PUBLISHING, auditPassed);
  return out;
}

// ---------------------------------------------------------------------------
// health
// ---------------------------------------------------------------------------

export async function systemHealth() {
  const db = getDb();
  const tokens = describeStoredTokens();
  let cred = null;
  try { cred = loadOAuthClientConfig().describe; } catch (e) { cred = { error: e.message }; }

  const lastOk = db.prepare('SELECT method, at FROM quota_event WHERE ok = 1 ORDER BY id DESC LIMIT 1').get();
  const lastFail = db.prepare('SELECT method, at FROM quota_event WHERE ok = 0 ORDER BY id DESC LIMIT 1').get();
  const lastSync = db.prepare('SELECT kind, finished_at, status FROM sync_run ORDER BY id DESC LIMIT 1').get();

  let channel = null;
  let dataApi = 'UNKNOWN';
  let analyticsApi = 'UNKNOWN';
  if (tokens.present) {
    try {
      channel = await getChannel({ refresh: false });
      dataApi = channel ? 'HEALTHY' : 'UNKNOWN';
    } catch (e) { dataApi = e.code ?? 'ERROR'; }
    try {
      const a = await channelAnalytics({ range: '7d' });
      analyticsApi = a.availability === 'ERROR' ? 'ERROR' : 'HEALTHY';
    } catch (e) { analyticsApi = e.code ?? 'ERROR'; }
  }

  return {
    oauth: {
      status: tokens.present && tokens.hasRefreshToken ? 'CONNECTED' : 'ACTION_REQUIRED',
      hasRefreshToken: Boolean(tokens.hasRefreshToken),
      scopes: tokens.scopes ?? [],
      accessTokenExpiresAt: tokens.expiresAt ?? null,
      expired: tokens.expired ?? null,
    },
    tokenStorage: {
      mode: storageMode(),
      encrypted: storageMode() === 'dpapi',
      label: storageMode() === 'dpapi' ? 'Windows DPAPI (per-user encrypted)' : 'PLAINTEXT FALLBACK',
    },
    credential: cred,
    dataApi, analyticsApi, channel,
    lastSuccess: lastOk ?? null,
    lastFailure: lastFail ?? null,
    lastSync: lastSync ?? null,
    capabilities: capabilities(),
  };
}

// ---------------------------------------------------------------------------
// channel
// ---------------------------------------------------------------------------

let channelCache = { at: 0, value: null };

export async function getChannel({ refresh = false } = {}) {
  // Cache: the dashboard, health page and video pages all want the channel. Refetching per
  // component would burn quota for a value that changes about once a week.
  if (!refresh && channelCache.value && Date.now() - channelCache.at < 5 * 60_000) {
    return channelCache.value;
  }
  const tokens = describeStoredTokens();
  if (!tokens.present) throw new DomainError(ERROR.AUTH_REQUIRED, 'Not connected to Google.');

  const ledger = persistentLedger();
  const c = await client();
  const ch = await getMyChannel(c, ledger);

  if (ch.uploadsPlaylistId) {
    try {
      const uploads = await listUploads(c, ledger, ch.uploadsPlaylistId, { max: 50 });
      ch.uploadCount = uploads.length;
      const db = getDb();
      const up = db.prepare(`INSERT INTO youtube_video (video_id, channel_id, title, privacy_status, published_at, last_synced_at)
        VALUES (?,?,?,?,?,?) ON CONFLICT(video_id) DO UPDATE SET
        title=excluded.title, privacy_status=excluded.privacy_status, last_synced_at=excluded.last_synced_at`);
      for (const u of uploads) up.run(u.videoId, ch.channelId, u.title, u.privacyStatus, u.publishedAt, now());
    } catch (e) {
      log.warn('uploads listing failed', { err: e });
      ch.uploadCount = 0;
    }
  }

  channelCache = { at: Date.now(), value: ch };
  return ch;
}

// ---------------------------------------------------------------------------
// content
// ---------------------------------------------------------------------------

const VIEW_FILTER = {
  ALL: null,
  LOCAL: [PUBLISH_STATE.DRAFT, PUBLISH_STATE.QA_READY],
  READY: [PUBLISH_STATE.METADATA_READY, PUBLISH_STATE.USER_APPROVED],
  PRIVATE: [PUBLISH_STATE.UPLOADED_PRIVATE],
  SCHEDULED: [PUBLISH_STATE.SCHEDULED],
  PUBLISHED: [PUBLISH_STATE.PUBLISHED],
  FAILED: [PUBLISH_STATE.FAILED],
};

export function listContent({ view = 'ALL', q = '' } = {}) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT c.content_id, c.topic, c.title_working, c.episode_number, c.duration_s, c.video_bytes,
           c.publish_state, c.qa_status, c.rendered_at, c.content_hash, c.srt_path,
           (SELECT COUNT(*) FROM content_still s WHERE s.content_id = c.content_id) AS still_count,
           (SELECT COUNT(*) FROM production_beat b WHERE b.content_id = c.content_id) AS beat_count,
           (SELECT text FROM metadata_candidate m WHERE m.content_id = c.content_id AND m.kind='title' AND m.selected=1 LIMIT 1) AS selected_title,
           yv.video_id, yv.privacy_status, yv.publish_at, yv.published_at
    FROM content_item c
    LEFT JOIN youtube_video yv ON yv.content_id = c.content_id
    ORDER BY c.episode_number ASC, c.content_id ASC`).all();

  const states = VIEW_FILTER[view] ?? null;
  const needle = String(q).trim().toLowerCase();

  return rows
    .filter((r) => (states ? states.includes(r.publish_state) : true))
    // Local search over indexed rows — never `search.list`, which is capped at 100 calls/day.
    .filter((r) => !needle
      || r.topic?.toLowerCase().includes(needle)
      || r.content_id.toLowerCase().includes(needle)
      || r.selected_title?.toLowerCase().includes(needle))
    .map(decorate);
}

function decorate(r) {
  return {
    ...r,
    stateMeta: PUBLISH_STATE_META[r.publish_state] ?? PUBLISH_STATE_META.DRAFT,
    hasRender: Boolean(r.duration_s),
    hasSrt: Boolean(r.srt_path),
    shortHash: r.content_hash ? r.content_hash.slice(7, 19) : null,
  };
}

export function getContent(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM content_item WHERE content_id = ?').get(id);
  if (!row) return null;

  const beats = db.prepare('SELECT * FROM production_beat WHERE content_id = ? ORDER BY t_seconds').all(id);
  const stills = db.prepare('SELECT path, frame, scene FROM content_still WHERE content_id = ? ORDER BY frame').all(id);
  const candidates = db.prepare('SELECT * FROM metadata_candidate WHERE content_id = ? ORDER BY id DESC').all(id);
  const approval = latestApproval(id);
  const yt = db.prepare('SELECT * FROM youtube_video WHERE content_id = ?').get(id);

  const manifest = getManifest(id);

  let episodeConfig = null;
  if (row.episode_path && existsSync(row.episode_path)) {
    try { episodeConfig = JSON.parse(readFileSync(row.episode_path, 'utf8')); } catch { /* optional */ }
  }

  return {
    ...decorate(row),
    beats,
    stills: stills.map((s, i) => ({ ...s, index: i })),
    candidates: candidates.map((c) => ({ ...c, lint: c.lint_json ? JSON.parse(c.lint_json) : null })),
    approval,
    approvalCheck: manifest.approvalCheck,
    manifest: manifest.manifest,
    readiness: manifest.readiness,
    youtube: yt ?? null,
    episodeConfig,
    scriptPreview: row.script_text ? row.script_text.slice(0, 4000) : null,
  };
}

const latestApproval = (id) =>
  getDb().prepare('SELECT * FROM approval WHERE content_id = ? AND revoked_at IS NULL ORDER BY id DESC LIMIT 1').get(id) ?? null;

/** Marker prefix so a revocation caused by an edit can be told apart from a manual one. */
const CHANGED_PREFIX = 'Changed after approval: ';

/**
 * The approval verdict the UI renders.
 *
 * Subtle but important: `saveManifest` REVOKES an approval the moment a material field
 * changes, which means by the time anyone asks, there is no active approval to diff against
 * and a naive check reports a bare "not approved". That is the failure this function exists
 * to prevent — telling someone their approval is gone without telling them what moved just
 * makes them re-approve blindly, which defeats the gate. So the most recent revocation is
 * consulted and its recorded field list is surfaced.
 */
function approvalStatus(id, manifest) {
  const active = latestApproval(id);
  if (active) return checkApproval(manifest, active);

  const revoked = getDb().prepare(
    'SELECT * FROM approval WHERE content_id = ? AND revoked_at IS NOT NULL ORDER BY id DESC LIMIT 1',
  ).get(id);

  if (revoked?.revoked_reason?.startsWith(CHANGED_PREFIX)) {
    return {
      valid: false,
      reason: 'APPROVAL_INVALIDATED',
      changed: revoked.revoked_reason.slice(CHANGED_PREFIX.length).split(', ').filter(Boolean),
      revokedAt: revoked.revoked_at,
    };
  }
  return { valid: false, reason: 'NOT_APPROVED', changed: [] };
}

// ---------------------------------------------------------------------------
// metadata
// ---------------------------------------------------------------------------

/** Recent titles used for novelty + grammar-family checks. */
function recentTitles(excludeId) {
  const db = getDb();
  const chosen = db.prepare(`
    SELECT m.text AS title FROM metadata_candidate m
    WHERE m.kind='title' AND m.selected=1 AND m.content_id != ?
    ORDER BY m.id DESC LIMIT 20`).all(excludeId);
  if (chosen.length) return chosen.map((r) => ({ title: r.title, description: '' }));
  // Before anything is chosen, the batch's own working titles are the channel's voice history.
  return db.prepare('SELECT topic AS title FROM content_item WHERE content_id != ? ORDER BY episode_number LIMIT 20')
    .all(excludeId).map((r) => ({ title: r.title, description: '' }));
}

export async function generateMetadata(id, { count = 7 } = {}) {
  const db = getDb();
  const content = db.prepare('SELECT * FROM content_item WHERE content_id = ?').get(id);
  if (!content) throw new DomainError(ERROR.NOT_FOUND, 'No such content item.');

  const provider = resolveProvider();
  const brief = buildBrief(content);
  const history = recentTitles(id);

  const titles = generateTitleCandidatesDeterministic(brief).slice(0, count);
  const ranked = rankCandidates(titles.map((t) => ({ title: t })), { history, facts: content.facts_text ?? '' });

  const ins = db.prepare(`INSERT INTO metadata_candidate (content_id, kind, text, family, score, lint_json, source, selected, created_at)
    VALUES (?,?,?,?,?,?,?,0,?)`);
  db.prepare("DELETE FROM metadata_candidate WHERE content_id = ? AND kind = 'title' AND selected = 0").run(id);
  for (const r of ranked) {
    ins.run(id, 'title', r.title, r.family, r.score.overall, JSON.stringify(r), 'generated', now());
  }

  const description = generateDescriptionDeterministic(brief);
  const tags = generateTagsDeterministic(brief);

  return {
    provider,
    brief: {
      coreObject: brief.coreObject,
      coreQuestion: brief.coreQuestion,
      actualReveal: brief.actualReveal,
      payoff: brief.payoff,
      durationSeconds: brief.durationSeconds,
      beatCount: brief.beats.length,
    },
    titles: ranked,
    description,
    descriptionLint: lintCandidate({ title: '', description }, { history, facts: content.facts_text ?? '' }),
    tags,
    history: history.map((h) => h.title),
  };
}

export function lintMetadata(id, { title, description, tags }) {
  const db = getDb();
  const content = db.prepare('SELECT * FROM content_item WHERE content_id = ?').get(id);
  if (!content) throw new DomainError(ERROR.NOT_FOUND, 'No such content item.');
  const history = recentTitles(id);
  const facts = content.facts_text ?? '';

  // Three separate verdicts rather than one blended score. A description failing does not
  // make a title bad, and the UI needs to say which of the three needs attention.
  return {
    title: lintCandidate({ title, description: '', tags: [] }, { history, facts }),
    description: lintDescription(description ?? '', {
      facts, transcript: content.script_text ?? '', history: recentMetadata(id),
    }),
    tags: lintTags(tags ?? [], { history: recentTagSets(id) }),
  };
}

/** Recent chosen descriptions, for CTA-repetition and boilerplate checks. */
function recentMetadata(excludeId) {
  return getDb().prepare(`
    SELECT m.text AS description FROM metadata_candidate m
    WHERE m.kind = 'description' AND m.selected = 1 AND m.content_id != ?
    ORDER BY m.id DESC LIMIT 20`).all(excludeId);
}

/** Recent tag sets, so an identical 15-tag block across the channel is visible. */
function recentTagSets(excludeId) {
  return getDb().prepare(`
    SELECT manifest_json FROM publish_manifest WHERE content_id != ? ORDER BY updated_at DESC LIMIT 10`)
    .all(excludeId)
    .map((r) => { try { return (JSON.parse(r.manifest_json).metadata?.tags ?? []).map((t) => t.toLowerCase()); } catch { return []; } });
}

/** CTA strings used recently, most recent first — drives CTA rotation. */
function ctaHistory(excludeId) {
  return recentMetadata(excludeId).map((r) =>
    CTA_VARIANTS.filter(Boolean).find((c) => (r.description ?? '').includes(c)) ?? null);
}

/**
 * Generate descriptions on their own, without regenerating titles.
 *
 * The old flow only produced a description as a by-product of generating titles, so there
 * was no way to re-roll the copy while keeping a chosen title — which is exactly what a
 * creator wants to do most often.
 */
export function generateDescription(id) {
  const db = getDb();
  const content = db.prepare('SELECT * FROM content_item WHERE content_id = ?').get(id);
  if (!content) throw new DomainError(ERROR.NOT_FOUND, 'No such content item.');

  const brief = buildBrief(content);
  const variants = generateDescriptions(brief, { ctaHistory: ctaHistory(id) });
  const facts = content.facts_text ?? '';
  const transcript = content.script_text ?? '';
  const history = recentMetadata(id);

  return {
    provider: resolveProvider(),
    evidence: {
      coreObject: brief.coreObject,
      coreQuestion: brief.coreQuestion,
      actualReveal: brief.actualReveal,
      payoff: brief.payoff,
      scriptSummary: transcript.slice(0, 320),
    },
    variants: variants.map((v) => ({ ...v, lint: lintDescription(v.text, { facts, transcript, history }) })),
  };
}

/** Generate tags on their own, classified and budgeted. */
export function generateTagsFor(id) {
  const db = getDb();
  const content = db.prepare('SELECT * FROM content_item WHERE content_id = ?').get(id);
  if (!content) throw new DomainError(ERROR.NOT_FOUND, 'No such content item.');

  const brief = buildBrief(content);
  const { candidates, dropped } = generateTags(brief, { transcript: content.script_text ?? '' });
  return {
    candidates,
    dropped,
    budget: budgetOf(candidates.map((c) => c.text)),
    lint: lintTags(candidates.map((c) => c.text), { history: recentTagSets(id) }),
  };
}

/** Normalise and dedupe a user-edited tag list without discarding their intent silently. */
export function normaliseTags(tags) {
  const { kept, dropped } = dedupeTags(tags);
  return { tags: kept.map((k) => k.text), dropped, budget: budgetOf(kept.map((k) => k.text)) };
}

// ---------------------------------------------------------------------------
// manifest + approval
// ---------------------------------------------------------------------------

export function getManifest(id) {
  const db = getDb();
  const content = db.prepare('SELECT * FROM content_item WHERE content_id = ?').get(id);
  if (!content) throw new DomainError(ERROR.NOT_FOUND, 'No such content item.');

  const row = db.prepare('SELECT * FROM publish_manifest WHERE content_id = ?').get(id);
  const manifest = row ? JSON.parse(row.manifest_json) : buildManifest(content);

  return {
    manifest,
    state: row?.state ?? content.publish_state,
    validation: validateManifest(manifest),
    readiness: publishReadiness(manifest),
    approvalCheck: approvalStatus(id, manifest),
    metadataHash: computeMetadataHash(manifest),
  };
}

export function saveManifest(id, patch) {
  const db = getDb();
  const content = db.prepare('SELECT * FROM content_item WHERE content_id = ?').get(id);
  if (!content) throw new DomainError(ERROR.NOT_FOUND, 'No such content item.');

  const current = getManifest(id).manifest;
  const merged = buildManifest(content, deepMerge(stripMeta(current), patch));

  const v = validateManifest(merged);
  if (!v.ok) throw new DomainError(ERROR.INVALID_METADATA, 'Manifest failed validation.', v.issues);

  // Remember the chosen title so the channel's novelty history reflects real decisions.
  if (patch.metadata?.selectedTitle) {
    db.prepare("UPDATE metadata_candidate SET selected = 0 WHERE content_id = ? AND kind = 'title'").run(id);
    const existing = db.prepare("SELECT id FROM metadata_candidate WHERE content_id = ? AND kind='title' AND text = ?")
      .get(id, patch.metadata.selectedTitle);
    if (existing) db.prepare('UPDATE metadata_candidate SET selected = 1 WHERE id = ?').run(existing.id);
    else db.prepare(`INSERT INTO metadata_candidate (content_id, kind, text, family, score, lint_json, source, selected, created_at)
      VALUES (?,?,?,?,?,?,?,1,?)`).run(id, 'title', patch.metadata.selectedTitle, null, null, null, 'manual', now());
  }

  const approval = latestApproval(id);
  const check = checkApproval(merged, approval);

  // The approval-invalidation edge. If a material field moved after approval, the approval is
  // revoked and the item falls back — this is the safety property the whole design exists for.
  let state = db.prepare('SELECT state FROM publish_manifest WHERE content_id = ?').get(id)?.state
    ?? content.publish_state;
  if (approval && !check.valid) {
    db.prepare('UPDATE approval SET revoked_at = ?, revoked_reason = ? WHERE id = ?')
      .run(now(), CHANGED_PREFIX + check.changed.join(', '), approval.id);
    state = PUBLISH_STATE.METADATA_READY;
    log.warn('approval invalidated', { contentId: id, changed: check.changed });
  } else if (merged.metadata.selectedTitle && merged.metadata.description
    && (state === PUBLISH_STATE.DRAFT || state === PUBLISH_STATE.QA_READY)) {
    state = PUBLISH_STATE.METADATA_READY;
  }

  merged.approval.status = state;
  const ts = now();
  db.prepare(`INSERT INTO publish_manifest (content_id, schema_version, state, manifest_json, metadata_hash, asset_hash, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(content_id) DO UPDATE SET state=excluded.state, manifest_json=excluded.manifest_json,
      metadata_hash=excluded.metadata_hash, asset_hash=excluded.asset_hash, updated_at=excluded.updated_at`)
    .run(id, merged.schemaVersion, state, JSON.stringify(merged), computeMetadataHash(merged), merged.asset.sha256, ts, ts);
  db.prepare('UPDATE content_item SET publish_state = ?, updated_at = ? WHERE content_id = ?').run(state, ts, id);

  return getManifest(id);
}

const stripMeta = (m) => { const c = structuredClone(m); delete c.approval; return c; };

function deepMerge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b ?? {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object'
      ? deepMerge(a[k], v) : v;
  }
  return out;
}

export function approve(id) {
  const db = getDb();
  const { manifest, readiness } = getManifest(id);
  if (!readiness.ready) {
    throw new DomainError(ERROR.INVALID_METADATA, 'Not ready to approve.', readiness.blockers);
  }
  const metaHash = computeMetadataHash(manifest);
  db.prepare('UPDATE approval SET revoked_at = ?, revoked_reason = ? WHERE content_id = ? AND revoked_at IS NULL')
    .run(now(), 'Superseded by a newer approval', id);
  db.prepare(`INSERT INTO approval (content_id, approved_at, asset_hash, metadata_hash, privacy_status, publish_at, snapshot_json)
    VALUES (?,?,?,?,?,?,?)`)
    .run(id, now(), manifest.asset.sha256, metaHash, manifest.youtube.privacy,
      manifest.youtube.publishAt, JSON.stringify(approvalSnapshot(manifest)));

  const state = PUBLISH_STATE.USER_APPROVED;
  manifest.approval = { status: state, assetHash: manifest.asset.sha256, metadataHash: metaHash, approvedAt: now() };
  db.prepare('UPDATE publish_manifest SET state = ?, manifest_json = ?, updated_at = ? WHERE content_id = ?')
    .run(state, JSON.stringify(manifest), now(), id);
  db.prepare('UPDATE content_item SET publish_state = ?, updated_at = ? WHERE content_id = ?').run(state, now(), id);
  log.info('approved', { contentId: id, metadataHash: metaHash });
  return getManifest(id);
}

export function revokeApproval(id) {
  const db = getDb();
  db.prepare('UPDATE approval SET revoked_at = ?, revoked_reason = ? WHERE content_id = ? AND revoked_at IS NULL')
    .run(now(), 'Manually revoked', id);
  db.prepare('UPDATE content_item SET publish_state = ?, updated_at = ? WHERE content_id = ?')
    .run(PUBLISH_STATE.METADATA_READY, now(), id);
  db.prepare('UPDATE publish_manifest SET state = ?, updated_at = ? WHERE content_id = ?')
    .run(PUBLISH_STATE.METADATA_READY, now(), id);
  return getManifest(id);
}

export function exportManifest(id) {
  const { manifest } = getManifest(id);
  return manifest;
}

// ---------------------------------------------------------------------------
// upload — implemented, gated, and never automatic
// ---------------------------------------------------------------------------

export async function requestPrivateUpload(id, { confirm = false } = {}) {
  const db = getDb();
  const { manifest, readiness, approvalCheck } = getManifest(id);

  if (!approvalCheck.valid) {
    throw new DomainError(ERROR.APPROVAL_REQUIRED,
      approvalCheck.reason === 'APPROVAL_INVALIDATED'
        ? `Approval was invalidated (${approvalCheck.changed.join(', ')}). Approve again.`
        : 'This content has not been approved.');
  }
  if (!readiness.ready) throw new DomainError(ERROR.INVALID_METADATA, 'Not ready.', readiness.blockers);

  const caps = capabilities();
  if (manifest.youtube.privacy !== 'private') {
    throw new DomainError(ERROR.UPLOAD_RESTRICTED_PRIVATE, 'Only private uploads are permitted.');
  }
  if (!caps.PRIVATE_UPLOAD.allowed) {
    throw new DomainError(ERROR.SCOPE_MISSING, caps.PRIVATE_UPLOAD.blockedReason);
  }

  // Idempotency: same asset + metadata + schedule can only ever produce one job.
  const key = `upload:${manifest.asset.sha256}:${computeMetadataHash(manifest)}`;
  const existingJob = db.prepare('SELECT * FROM job WHERE idempotency_key = ?').get(key);
  const existingVideo = db.prepare('SELECT * FROM youtube_video WHERE content_id = ?').get(id);
  if (existingVideo) throw new DomainError(ERROR.UPLOAD_DUPLICATE, 'This content already has a YouTube video.');
  if (existingJob && ['PENDING', 'RUNNING', 'RETRY_WAIT', 'SUCCEEDED'].includes(existingJob.state)) {
    throw new DomainError(ERROR.UPLOAD_DUPLICATE, 'An upload job for this exact content already exists.', { jobId: existingJob.id });
  }

  // Without explicit confirmation this returns the confirmation payload and does nothing.
  if (!confirm) {
    return {
      requiresConfirmation: true,
      confirmation: {
        channel: channelCache.value?.title ?? 'Bill Finds Out',
        contentId: id,
        title: manifest.metadata.selectedTitle,
        privacy: 'PRIVATE',
        assetHashShort: manifest.asset.sha256.slice(7, 19),
        durationSeconds: manifest.asset.durationSeconds,
        captions: manifest.captions.upload ? manifest.captions.path : null,
      },
    };
  }

  const ts = now();
  const info = db.prepare(`INSERT INTO job (type, content_id, state, idempotency_key, payload_json, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?)`)
    .run(JOB_TYPE.UPLOAD_VIDEO, id, JOB_STATE.PENDING, key, JSON.stringify({ manifest }), ts, ts);
  db.prepare('UPDATE content_item SET publish_state = ?, updated_at = ? WHERE content_id = ?')
    .run(PUBLISH_STATE.UPLOADING, ts, id);
  log.info('upload job queued', { contentId: id, jobId: info.lastInsertRowid });
  return { requiresConfirmation: false, jobId: info.lastInsertRowid, state: JOB_STATE.PENDING };
}

// ---------------------------------------------------------------------------
// queue
// ---------------------------------------------------------------------------

export function listJobs() {
  return getDb().prepare('SELECT * FROM job ORDER BY id DESC LIMIT 200').all()
    .map((j) => ({ ...j, payload: undefined }));
}

export function retryJob(jobId) {
  const db = getDb();
  const j = db.prepare('SELECT * FROM job WHERE id = ?').get(jobId);
  if (!j) throw new DomainError(ERROR.NOT_FOUND, 'No such job.');
  db.prepare('UPDATE job SET state = ?, error_code = NULL, error_message = NULL, next_retry_at = NULL, updated_at = ? WHERE id = ?')
    .run(JOB_STATE.PENDING, now(), jobId);
  return listJobs();
}

export function cancelJob(jobId) {
  const db = getDb();
  const j = db.prepare('SELECT * FROM job WHERE id = ?').get(jobId);
  if (!j) throw new DomainError(ERROR.NOT_FOUND, 'No such job.');
  if (j.state === JOB_STATE.RUNNING) throw new DomainError(ERROR.INTERNAL, 'Cannot cancel a running job.');
  db.prepare('UPDATE job SET state = ?, updated_at = ? WHERE id = ?').run(JOB_STATE.CANCELLED, now(), jobId);
  return listJobs();
}

/** A harmless job that exercises the queue end to end without touching Google. */
export function enqueueDryRun() {
  const ts = now();
  const info = getDb().prepare(`INSERT INTO job (type, content_id, state, payload_json, created_at, updated_at)
    VALUES (?,?,?,?,?,?)`).run(JOB_TYPE.DRY_RUN, null, JOB_STATE.PENDING, JSON.stringify({ steps: 5 }), ts, ts);
  return { jobId: info.lastInsertRowid };
}

// ---------------------------------------------------------------------------
// analytics
// ---------------------------------------------------------------------------

const RANGES = { '7d': 7, '28d': 28, '90d': 90, lifetime: 3650 };
const METRICS = 'views,engagedViews,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,shares,subscribersGained,subscribersLost';

const isoDate = (d) => d.toISOString().slice(0, 10);

export async function channelAnalytics({ range = '28d' } = {}) {
  const tokens = describeStoredTokens();
  if (!tokens.present) throw new DomainError(ERROR.AUTH_REQUIRED, 'Not connected to Google.');

  const days = RANGES[range] ?? 28;
  const end = new Date();
  const start = new Date(end.getTime() - days * 864e5);
  const ledger = persistentLedger();

  try {
    const rep = await analyticsQuery(await client(), ledger, {
      startDate: isoDate(start), endDate: isoDate(end), metrics: METRICS,
    });
    const row = rep.rows?.[0] ?? null;
    const hasData = Boolean(row && row.some((v) => Number(v) > 0));
    const metrics = row ? Object.fromEntries(rep.columns.map((c, i) => [c, row[i]])) : null;

    getDb().prepare(`INSERT INTO analytics_snapshot (scope, checkpoint, start_date, end_date, requested_at, data_end_date, availability, metrics_json)
      VALUES (?,?,?,?,?,?,?,?)`).run('channel', range, isoDate(start), isoDate(end), now(), isoDate(end),
        hasData ? 'OK' : 'NO_DATA', JSON.stringify(metrics));

    return {
      range, startDate: isoDate(start), endDate: isoDate(end),
      availability: hasData ? 'OK' : 'NO_DATA',
      columns: rep.columns, metrics, queriedAt: rep.meta.queriedAt,
      note: hasData ? null : 'The query was authorised and valid. This channel has no analytics data yet.',
    };
  } catch (e) {
    if (e.code === 'AUTH_EXPIRED' || e.code === 'SCOPE_MISSING') throw e;
    return { range, availability: 'ERROR', metrics: null, columns: [], error: e.code ?? 'ERROR', note: e.message };
  }
}

export async function videoAnalytics(videoId, { range = '28d' } = {}) {
  const days = RANGES[range] ?? 28;
  const end = new Date();
  const start = new Date(end.getTime() - days * 864e5);
  const ledger = persistentLedger();
  try {
    const rep = await analyticsQuery(await client(), ledger, {
      startDate: isoDate(start), endDate: isoDate(end), metrics: METRICS, filters: `video==${videoId}`,
    });
    const row = rep.rows?.[0] ?? null;
    const hasData = Boolean(row && row.some((v) => Number(v) > 0));
    return {
      videoId, range, availability: hasData ? 'OK' : 'NO_DATA',
      columns: rep.columns,
      metrics: row ? Object.fromEntries(rep.columns.map((c, i) => [c, row[i]])) : null,
    };
  } catch (e) {
    return { videoId, range, availability: 'ERROR', error: e.code ?? 'ERROR', note: e.message };
  }
}

/**
 * Retention: YouTube's normalised curve joined to our own storyboard beats.
 *
 * The beats are returned whether or not YouTube has data, because the production timeline is
 * ours and is useful on its own. The curve is returned only when it genuinely exists — a
 * fabricated curve would be worse than an empty state.
 */
export async function retention(contentId) {
  const db = getDb();
  const content = db.prepare('SELECT * FROM content_item WHERE content_id = ?').get(contentId);
  if (!content) throw new DomainError(ERROR.NOT_FOUND, 'No such content item.');

  const beats = db.prepare('SELECT scene, beat_index, t_seconds, ratio, label, action FROM production_beat WHERE content_id = ? ORDER BY t_seconds').all(contentId);
  const yt = db.prepare('SELECT * FROM youtube_video WHERE content_id = ?').get(contentId);

  if (!yt?.video_id) {
    return {
      contentId, videoId: null, availability: 'NOT_PUBLISHED', curve: [], beats,
      note: 'Retention becomes available once this video is published and has accumulated watch data.',
    };
  }

  const ledger = persistentLedger();
  try {
    const rep = await analyticsQuery(await client(), ledger, {
      startDate: '2005-01-01', endDate: isoDate(new Date()),
      metrics: 'audienceWatchRatio,relativeRetentionPerformance',
      dimensions: 'elapsedVideoTimeRatio', filters: `video==${yt.video_id}`,
    });
    const curve = (rep.rows ?? []).map((r) => ({
      elapsedRatio: Number(r[0]), audienceWatchRatio: Number(r[1]), relativeRetentionPerformance: Number(r[2]),
    }));
    if (curve.length) {
      const ins = db.prepare(`INSERT OR IGNORE INTO retention_point
        (video_id, elapsed_ratio, audience_watch_ratio, relative_retention_performance, captured_at) VALUES (?,?,?,?,?)`);
      const at = now();
      for (const p of curve) ins.run(yt.video_id, p.elapsedRatio, p.audienceWatchRatio, p.relativeRetentionPerformance, at);
    }
    return {
      contentId, videoId: yt.video_id,
      availability: curve.length ? 'OK' : 'NO_DATA', curve, beats,
      note: curve.length ? null : 'YouTube has not reported retention data for this video yet.',
    };
  } catch (e) {
    return { contentId, videoId: yt.video_id, availability: 'ERROR', curve: [], beats, error: e.code ?? 'ERROR', note: e.message };
  }
}

// ---------------------------------------------------------------------------
// quota + settings
// ---------------------------------------------------------------------------

export function quotaLedger() {
  const db = getDb();
  const since = new Date(Date.now() - 864e5).toISOString();
  const rows = db.prepare('SELECT bucket, method, SUM(cost) AS units, COUNT(*) AS calls, SUM(CASE WHEN ok=0 THEN 1 ELSE 0 END) AS errors FROM quota_event WHERE at >= ? GROUP BY bucket, method').all(since);
  const buckets = {};
  for (const r of rows) {
    buckets[r.bucket] ??= { bucket: r.bucket, units: 0, calls: 0, errors: 0, limit: QUOTA_LIMITS[r.bucket]?.limit ?? null, unit: QUOTA_LIMITS[r.bucket]?.unit ?? 'units', methods: [] };
    buckets[r.bucket].units += r.units;
    buckets[r.bucket].calls += r.calls;
    buckets[r.bucket].errors += r.errors;
    buckets[r.bucket].methods.push({ method: r.method, units: r.units, calls: r.calls, errors: r.errors });
  }
  const last = db.prepare('SELECT method, bucket, ok, at FROM quota_event ORDER BY id DESC LIMIT 1').get();
  return {
    windowHours: 24,
    estimate: true,
    note: 'LOCAL ESTIMATE. Google does not expose live quota consumption; the Cloud Console is authoritative.',
    buckets: Object.values(buckets),
    lastCall: last ?? null,
  };
}

export async function getSettings() {
  let cred = null;
  try { cred = loadOAuthClientConfig().describe; } catch (e) { cred = { error: e.message }; }
  const tokens = describeStoredTokens();
  return {
    google: {
      credentialPath: cred?.path ?? null,
      credentialSource: cred?.source ?? null,
      clientType: cred?.kind ?? null,
      projectId: cred?.projectId ?? null,
      connected: Boolean(tokens.present),
      scopes: tokens.scopes ?? [],
    },
    content: {
      productionRoot: process.cwd(),
      defaultLanguage: getSetting('content.language', 'en'),
      timezone: getSetting('content.timezone', 'Asia/Seoul'),
    },
    youtubeDefaults: {
      categoryId: getSetting('yt.categoryId', '27'),
      privacy: getSetting('yt.privacy', 'private'),
      captionLanguage: getSetting('yt.captionLanguage', 'en'),
    },
    metadata: {
      provider: resolveProvider(),
      candidateCount: Number(getSetting('meta.candidateCount', '7')),
      historyWindow: Number(getSetting('meta.historyWindow', '20')),
    },
    system: {
      stateDir: (await import('../config.mjs')).STATE_DIR,
      logFile: log.file,
      version: '1.0.0-creator-os',
    },
    capabilities: capabilities(),
  };
}

export { setSetting };
export { canTransition };

/* ===================================================================== audio library */

/**
 * Search the indexed packs.
 *
 * Duplicates are hidden by default: 329 of the 3,733 indexed files are byte-identical copies
 * across the two overlapping meme packs, and showing all of them turns every search into a
 * list of the same sound repeated.
 *
 * Risk is a first-class filter rather than a badge, because the useful question here is
 * almost never "what sounds exist" -- it is "what can I actually use", and the answer to
 * that is 53 of 3,395.
 */
export function searchAudio({ q = '', category = '', risk = '', pack = '', imported = null,
  includeDupes = false, limit = 120, offset = 0 } = {}) {
  const db = getDb();
  const where = [];
  const args = {};

  if (!includeDupes) where.push('dup_of IS NULL');
  if (q) {
    where.push('(filename LIKE @q OR tags LIKE @q OR subcategory LIKE @q)');
    args.q = `%${q}%`;
  }
  if (category) { where.push('category = @category'); args.category = category; }
  if (risk) { where.push('risk = @risk'); args.risk = risk; }
  if (pack) { where.push('pack = @pack'); args.pack = pack; }
  if (imported === true) where.push('imported_id IS NOT NULL');
  if (imported === false) where.push('imported_id IS NULL');

  const sql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) n FROM audio_source ${sql}`).get(args).n;

  /*
   * Ordered by risk first, so the handful of usable sounds surface above the thousands that
   * need a listen. A relevance sort would bury them.
   */
  const rows = db.prepare(`
    SELECT id, pack, filename, ext, bytes, duration_s, sample_rate, channels, peak_db, rms_db,
           category, subcategory, tags, risk, risk_reasons, provenance, dup_of, imported_id
    FROM audio_source ${sql}
    ORDER BY CASE risk WHEN 'USABLE' THEN 0 WHEN 'REVIEW' THEN 1 ELSE 2 END,
             duration_s ASC, filename ASC
    LIMIT @limit OFFSET @offset`).all({ ...args, limit, offset });

  return {
    total,
    offset,
    items: rows.map((r) => ({
      ...r,
      tags: safeJson(r.tags, []),
      riskReasons: safeJson(r.risk_reasons, []),
    })),
  };
}

/** Counts for the filter chips, so the UI never shows a filter that would return nothing. */
export function audioFacets() {
  const db = getDb();
  const group = (col) => db.prepare(
    `SELECT COALESCE(${col}, 'UNKNOWN') k, COUNT(*) n FROM audio_source WHERE dup_of IS NULL
     GROUP BY k ORDER BY n DESC`).all();
  return {
    risk: group('risk'),
    category: group('category'),
    pack: group('pack'),
    totals: db.prepare(`
      -- "indexed" is a keyword in SQLite (INDEXED BY), so it cannot be a bare alias.
      SELECT COUNT(*) total_indexed,
             SUM(CASE WHEN dup_of IS NULL THEN 1 ELSE 0 END) unique_sounds,
             SUM(CASE WHEN dup_of IS NOT NULL THEN 1 ELSE 0 END) duplicates,
             SUM(CASE WHEN imported_id IS NOT NULL THEN 1 ELSE 0 END) imported
      FROM audio_source`).get(),
  };
}

/** The assets actually in the repository, with how often each has been used. */
export function listAudioAssets() {
  const db = getDb();
  return db.prepare(`
    SELECT a.*, (SELECT COUNT(*) FROM audio_usage u WHERE u.asset_id = a.id) uses
    FROM audio_asset a ORDER BY a.type, a.id`).all()
    .map((r) => ({ ...r, tags: safeJson(r.tags, []) }));
}

/**
 * The absolute path of an indexed source, for previewing.
 *
 * Looked up by database id rather than accepted as a path, so a request cannot name an
 * arbitrary file on disk. The packs are read-only and nothing here ever opens them for
 * writing.
 */
export function audioSourcePath(id) {
  const row = getDb().prepare('SELECT path, ext FROM audio_source WHERE id = ?').get(Number(id));
  if (!row) throw new DomainError(ERROR.NOT_FOUND, 'No such indexed sound.');
  if (!existsSync(row.path)) throw new DomainError(ERROR.NOT_FOUND, 'The pack file is no longer at its indexed path.');
  return row;
}

function safeJson(s, fallback) {
  try { return JSON.parse(s ?? ''); } catch { return fallback; }
}
