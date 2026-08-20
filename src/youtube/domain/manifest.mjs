/**
 * manifest.mjs — the publish manifest: schema, hashing, and approval invalidation.
 *
 * The manifest is the reproducible record of *what we intend to publish*. Operational state
 * (job progress, retries, sync times) lives in SQLite; the manifest is the deterministic
 * document that can be exported, diffed and re-applied.
 *
 * The important idea here is that an approval is bound to HASHES, not to a flag. Storing
 * `approved: true` cannot tell you that the title changed afterwards. Storing the hash of
 * the exact metadata that was approved can, and that is the difference between a safety gate
 * and a decoration.
 */

import { createHash } from 'node:crypto';
import { z } from 'zod';

export const MANIFEST_SCHEMA_VERSION = 1;

const isoOrNull = z.string().datetime({ offset: true }).nullable();

export const ManifestSchema = z.object({
  schemaVersion: z.literal(MANIFEST_SCHEMA_VERSION),
  contentId: z.string().min(1),

  asset: z.object({
    videoPath: z.string().min(1),
    sha256: z.string().min(7),
    durationSeconds: z.number().positive().nullable(),
    bytes: z.number().int().positive().nullable(),
  }),

  captions: z.object({
    path: z.string().nullable(),
    language: z.string().min(2).default('en'),
    /** Burned-in captions are NOT a caption track. Both exist; they are different things. */
    burnedIn: z.boolean().default(true),
    upload: z.boolean().default(false),
  }),

  thumbnail: z.object({
    path: z.string().nullable(),
    syncedVideoId: z.string().nullable().default(null),
  }),

  metadata: z.object({
    selectedTitle: z.string().min(1).max(100),
    description: z.string().max(5000),
    tags: z.array(z.string()).max(30).default([]),
    categoryId: z.string().default('27'),
    language: z.string().default('en'),
  }),

  youtube: z.object({
    privacy: z.enum(['private', 'unlisted', 'public']).default('private'),
    publishAt: isoOrNull.default(null),
    playlistIds: z.array(z.string()).default([]),
    /**
     * Explicit declarations. `madeForKids` is a legal declaration under COPPA and
     * `containsSyntheticMedia` is a policy judgement about specific content — neither is
     * inferred, and `containsSyntheticMedia` starts null so a human must choose.
     */
    madeForKids: z.boolean(),
    containsSyntheticMedia: z.boolean().nullable().default(null),
  }),

  approval: z.object({
    status: z.string(),
    assetHash: z.string().nullable().default(null),
    metadataHash: z.string().nullable().default(null),
    approvedAt: isoOrNull.default(null),
  }),
});

const sha = (s) => `sha256:${createHash('sha256').update(s).digest('hex')}`;

/**
 * Hash of everything a human is agreeing to when they approve.
 *
 * Deliberately covers more than the title: privacy, schedule, caption choice, thumbnail and
 * playlist are all things whose silent change after approval would be a surprise. Ordering is
 * fixed and explicit so the hash is stable across key reordering.
 */
export function computeMetadataHash(manifest) {
  const m = manifest.metadata;
  const y = manifest.youtube;
  const c = manifest.captions;
  return sha(JSON.stringify([
    m.selectedTitle, m.description, [...m.tags].sort(), m.categoryId, m.language,
    y.privacy, y.publishAt, [...y.playlistIds].sort(), y.madeForKids, y.containsSyntheticMedia,
    c.upload ? c.path : null, c.language,
    manifest.thumbnail.path,
  ]));
}

/** Build a manifest from a content row plus any saved overrides. */
export function buildManifest(content, overrides = {}) {
  const base = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    contentId: content.content_id,
    asset: {
      videoPath: content.video_path ?? '',
      sha256: content.content_hash ?? '',
      durationSeconds: content.duration_s ?? null,
      bytes: content.video_bytes ?? null,
    },
    captions: { path: content.srt_path ?? null, language: 'en', burnedIn: true, upload: Boolean(content.srt_path) },
    thumbnail: { path: content.thumbnail_path ?? null, syncedVideoId: null },
    metadata: {
      selectedTitle: content.title_working ?? content.topic ?? content.content_id,
      description: '',
      tags: [],
      categoryId: '27',
      language: 'en',
    },
    youtube: {
      privacy: 'private',
      publishAt: null,
      playlistIds: [],
      madeForKids: false,
      containsSyntheticMedia: null,
    },
    approval: { status: 'DRAFT', assetHash: null, metadataHash: null, approvedAt: null },
  };
  return deepMerge(base, overrides);
}

function deepMerge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b ?? {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object'
      ? deepMerge(a[k], v)
      : v;
  }
  return out;
}

export function validateManifest(manifest) {
  const r = ManifestSchema.safeParse(manifest);
  return r.success
    ? { ok: true, manifest: r.data, issues: [] }
    : { ok: false, manifest: null, issues: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}

/**
 * Is the stored approval still valid for the manifest as it now stands?
 *
 * Returns the SPECIFIC fields that moved, because "approval invalidated" without saying what
 * changed just makes the user re-approve blindly, which defeats the gate.
 */
export function checkApproval(manifest, approvalRow) {
  if (!approvalRow || approvalRow.revoked_at) {
    return { valid: false, reason: 'NOT_APPROVED', changed: [] };
  }
  const currentMetaHash = computeMetadataHash(manifest);
  const currentAssetHash = manifest.asset.sha256;

  const changed = [];
  if (approvalRow.asset_hash !== currentAssetHash) changed.push('video asset');
  if (approvalRow.metadata_hash !== currentMetaHash) {
    const snap = JSON.parse(approvalRow.snapshot_json ?? '{}');
    if (snap.title !== manifest.metadata.selectedTitle) changed.push('title');
    if (snap.description !== manifest.metadata.description) changed.push('description');
    if (snap.privacy !== manifest.youtube.privacy) changed.push('privacy');
    if (snap.publishAt !== manifest.youtube.publishAt) changed.push('publish time');
    if (JSON.stringify(snap.tags ?? []) !== JSON.stringify(manifest.metadata.tags)) changed.push('tags');
    if (snap.captionPath !== (manifest.captions.upload ? manifest.captions.path : null)) changed.push('captions');
    if (snap.thumbnailPath !== manifest.thumbnail.path) changed.push('thumbnail');
    if (JSON.stringify(snap.playlistIds ?? []) !== JSON.stringify(manifest.youtube.playlistIds)) changed.push('playlists');
    if (snap.madeForKids !== manifest.youtube.madeForKids) changed.push('made for kids');
    if (snap.containsSyntheticMedia !== manifest.youtube.containsSyntheticMedia) changed.push('synthetic media declaration');
    if (!changed.length) changed.push('metadata');
  }

  return changed.length
    ? { valid: false, reason: 'APPROVAL_INVALIDATED', changed }
    : { valid: true, reason: null, changed: [] };
}

/** The snapshot recorded at approval time — what the human actually saw. */
export function approvalSnapshot(manifest) {
  return {
    title: manifest.metadata.selectedTitle,
    description: manifest.metadata.description,
    tags: manifest.metadata.tags,
    privacy: manifest.youtube.privacy,
    publishAt: manifest.youtube.publishAt,
    captionPath: manifest.captions.upload ? manifest.captions.path : null,
    thumbnailPath: manifest.thumbnail.path,
    playlistIds: manifest.youtube.playlistIds,
    madeForKids: manifest.youtube.madeForKids,
    containsSyntheticMedia: manifest.youtube.containsSyntheticMedia,
  };
}

/**
 * Is this manifest ready to be approved at all?
 *
 * Separate from validation: a manifest can be schema-valid and still not something a person
 * should be allowed to approve (no render, unhashed asset, undeclared synthetic media).
 */
export function publishReadiness(manifest) {
  const blockers = [];
  const warnings = [];

  if (!manifest.asset.videoPath) blockers.push('No rendered video.');
  if (!manifest.asset.sha256) blockers.push('Video has not been hashed.');
  if (!manifest.metadata.selectedTitle?.trim()) blockers.push('No title selected.');
  if (manifest.metadata.selectedTitle?.length > 100) blockers.push('Title exceeds YouTube’s 100-character limit.');
  if (manifest.youtube.containsSyntheticMedia === null) {
    blockers.push('Synthetic/altered content declaration has not been made.');
  }
  if (!manifest.metadata.description?.trim()) warnings.push('Description is empty.');
  if (manifest.captions.upload && !manifest.captions.path) warnings.push('Caption upload is on but no SRT is linked.');
  if (manifest.youtube.privacy !== 'private') {
    blockers.push('Only private uploads are permitted while the compliance gate is closed.');
  }
  if (manifest.youtube.publishAt) {
    const t = Date.parse(manifest.youtube.publishAt);
    if (Number.isNaN(t)) blockers.push('Publish time is not a valid timestamp.');
    else if (t <= Date.now()) blockers.push('Publish time is in the past.');
  }

  return { ready: blockers.length === 0, blockers, warnings };
}
