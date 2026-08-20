/**
 * domain.test.mjs — unit tests for the rules that must not silently change.
 *
 * These cover the pure domain logic only: linting, scoring, manifest validation, approval
 * hashing, state transitions and error normalisation. Nothing here touches SQLite, the
 * network or Google — that is what makes them fast enough to run on every change.
 *
 * Integration against the live channel stays behind `npm run youtube:doctor`, and the
 * approval gate is additionally proven against the running server by `tools/approval-qa.mjs`.
 */

import { describe, expect, it } from 'vitest';

import { lintCandidate, rankCandidates } from '../src/youtube/metadata/lint.mjs';
import { classifyTitleFamily } from '../src/youtube/metadata/style.mjs';
import {
  approvalSnapshot, buildManifest, checkApproval, computeMetadataHash,
  publishReadiness, validateManifest,
} from '../src/youtube/domain/manifest.mjs';
import { canTransition, PUBLISH_STATE } from '../src/youtube/domain/states.mjs';
import { DomainError, ERROR, toWireError } from '../src/youtube/server/errors.mjs';

const FACTS = 'That tiny hole in your airplane window is supposed to be there. It helps manage the '
  + 'pressure between the layers, so the outer structural pane takes most of the pressure difference '
  + 'while you are flying at altitude.';

// ---------------------------------------------------------------------------

describe('title grammar families', () => {
  it('separates the families this channel rotates through', () => {
    expect(classifyTitleFamily('Why Manhole Covers Are Round')).toBe('WHY');
    expect(classifyTitleFamily('How a Gas Pump Knows Your Tank Is Full')).toBe('HOW');
    expect(classifyTitleFamily("Escalator Brushes Aren't for Your Shoes")).toBe('NEGATION');
    expect(classifyTitleFamily('The Hidden Reason Manhole Covers Are Round')).toBe('HIDDEN');
    expect(classifyTitleFamily('That Tiny Hole in a Pen Cap Has a Job')).toBe('OBJECT_JOB');
  });

  it('falls back to CLAIM rather than throwing on an unusual shape', () => {
    expect(classifyTitleFamily('Airplane Windows, Explained')).toBe('CLAIM');
  });
});

describe('factual claim guard', () => {
  it('rejects a number the episode never states', () => {
    const r = lintCandidate({ title: 'Why Your Airplane Window Has a 3 Inch Hole' }, { facts: FACTS });
    const codes = r.issues.map((i) => i.code);
    expect(codes).toContain('UNSUPPORTED_CLAIM');
    expect(r.errors).toBeGreaterThan(0);
  });

  it('rejects an invented altitude', () => {
    const r = lintCandidate({ title: 'How an Airplane Window Survives 30,000 Feet' }, { facts: FACTS });
    expect(r.issues.map((i) => i.code)).toContain('UNSUPPORTED_CLAIM');
  });

  it('allows a title with no numeric claim at all', () => {
    const r = lintCandidate({ title: "The Hole in Your Airplane Window Isn't a Defect" }, { facts: FACTS });
    expect(r.issues.map((i) => i.code)).not.toContain('UNSUPPORTED_CLAIM');
  });

  it('drops truthfulness when a claim is unsupported', () => {
    const bad = lintCandidate({ title: 'Why Your Airplane Window Has a 3 Inch Hole' }, { facts: FACTS });
    const good = lintCandidate({ title: 'Why Your Airplane Window Has That Hole' }, { facts: FACTS });
    expect(bad.score.truthfulness).toBeLessThan(good.score.truthfulness);
  });
});

describe('anti-AI linting', () => {
  it('flags stock phrasing', () => {
    const r = lintCandidate({ title: 'Did You Know Airplane Windows Have a Secret Hole?' }, {});
    expect(r.issues.map((i) => i.code)).toContain('STOCK_PHRASE');
  });

  it('flags unearned hype and clickbait punctuation together', () => {
    const r = lintCandidate({ title: "You Won't Believe This Insane Airplane Window Hole!!" }, {});
    const codes = r.issues.map((i) => i.code);
    expect(codes).toContain('STOCK_PHRASE');
    expect(codes).toContain('FAKE_HYPE');
    expect(codes).toContain('CLICKBAIT_PUNCT');
  });

  it('flags boilerplate description openers', () => {
    const r = lintCandidate(
      { title: 'A Fine Title', description: "Welcome back to the channel! Today we explore windows." }, {},
    );
    expect(r.issues.map((i) => i.code)).toContain('BOILERPLATE_OPENER');
  });

  it('leaves a clean, specific title alone', () => {
    const r = lintCandidate({ title: 'Why Manhole Covers Are Round' }, { facts: 'manhole covers are round' });
    expect(r.errors).toBe(0);
  });
});

describe('repetition against recent titles', () => {
  const history = [
    { title: 'Why Airplane Windows Have That Tiny Hole' },
    { title: 'Why Manhole Covers Are Round' },
    { title: 'Why Pen Caps Have Tiny Holes' },
    { title: 'Why Jeans Have That Tiny Pocket' },
  ];

  it('warns when a grammar family is over-used', () => {
    const r = lintCandidate({ title: 'Why Escalators Have Those Brushes' }, { history });
    expect(r.issues.map((i) => i.code)).toContain('FAMILY_OVERUSE');
  });

  it('does not warn when the candidate rotates to another family', () => {
    const r = lintCandidate({ title: "Escalator Brushes Aren't for Your Shoes" }, { history });
    expect(r.issues.map((i) => i.code)).not.toContain('FAMILY_OVERUSE');
  });

  it('flags a near-duplicate of a recent title', () => {
    const r = lintCandidate({ title: 'Why Manhole Covers Are Round' }, { history });
    expect(r.issues.map((i) => i.code)).toContain('TOO_SIMILAR');
    expect(r.novelty).toBeLessThan(0.6);
  });

  it('flags a repeated opening phrase', () => {
    const r = lintCandidate({ title: 'Why Airplane Windows Are Oval' }, { history });
    expect(r.issues.map((i) => i.code)).toContain('REPEATED_OPENER');
  });
});

describe('editorial ranking', () => {
  it('sinks candidates with errors below clean ones', () => {
    const ranked = rankCandidates([
      { title: "You Won't Believe This Insane Window Hole!!" },
      { title: "The Hole in Your Airplane Window Isn't a Defect" },
    ], { facts: FACTS });
    expect(ranked[0].title).toBe("The Hole in Your Airplane Window Isn't a Defect");
    expect(ranked[0].errors).toBe(0);
  });

  it('never emits a virality or predicted-views figure', () => {
    const r = lintCandidate({ title: 'Why Manhole Covers Are Round' }, {});
    expect(Object.keys(r.score).sort()).toEqual(
      ['channelFit', 'clarity', 'curiosity', 'novelty', 'overall', 'specificity', 'truthfulness'],
    );
  });
});

// ---------------------------------------------------------------------------

const CONTENT = {
  content_id: 'airplane-window-hole',
  topic: 'The Hole In Your Airplane Window',
  title_working: 'The Hole In Your Airplane Window',
  video_path: 'out/batch-001/01-airplane-window-hole.mp4',
  content_hash: 'sha256:57cda941dd0b4b36aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  duration_s: 27.9, video_bytes: 11_000_000, srt_path: 'C:/x/y.srt', thumbnail_path: null,
};

describe('publish manifest', () => {
  it('validates a manifest built from a content row', () => {
    const m = buildManifest(CONTENT);
    expect(validateManifest(m).ok).toBe(true);
  });

  it('rejects a manifest whose title exceeds YouTube’s limit', () => {
    const m = buildManifest(CONTENT, { metadata: { selectedTitle: 'x'.repeat(120) } });
    const v = validateManifest(m);
    expect(v.ok).toBe(false);
    expect(v.issues.join(' ')).toMatch(/selectedTitle/);
  });

  it('blocks approval until the synthetic-media declaration is made', () => {
    const m = buildManifest(CONTENT, { metadata: { description: 'x' } });
    expect(m.youtube.containsSyntheticMedia).toBeNull();
    expect(publishReadiness(m).ready).toBe(false);
    expect(publishReadiness(m).blockers.join(' ')).toMatch(/[Ss]ynthetic/);
  });

  it('blocks anything other than a private upload while the gate is closed', () => {
    const m = buildManifest(CONTENT, {
      metadata: { description: 'x' },
      youtube: { privacy: 'public', containsSyntheticMedia: false },
    });
    expect(publishReadiness(m).blockers.join(' ')).toMatch(/private/i);
  });

  it('blocks a publish time in the past', () => {
    const m = buildManifest(CONTENT, {
      metadata: { description: 'x' },
      youtube: { containsSyntheticMedia: false, publishAt: '2020-01-01T00:00:00.000Z' },
    });
    expect(publishReadiness(m).blockers.join(' ')).toMatch(/past/);
  });

  it('is ready once every declaration is made', () => {
    const m = buildManifest(CONTENT, {
      metadata: { description: 'A real description.' },
      youtube: { containsSyntheticMedia: false },
    });
    expect(publishReadiness(m).ready).toBe(true);
  });
});

describe('approval hashing', () => {
  const base = buildManifest(CONTENT, {
    metadata: { selectedTitle: 'A Good Title', description: 'A real description.' },
    youtube: { containsSyntheticMedia: false },
  });
  const approvalRow = {
    asset_hash: base.asset.sha256,
    metadata_hash: computeMetadataHash(base),
    revoked_at: null,
    snapshot_json: JSON.stringify(approvalSnapshot(base)),
  };

  it('holds when nothing changed', () => {
    expect(checkApproval(base, approvalRow).valid).toBe(true);
  });

  it('breaks on a one-character title change, and names the field', () => {
    const changed = structuredClone(base);
    changed.metadata.selectedTitle = 'A Good Title!';
    const r = checkApproval(changed, approvalRow);
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('APPROVAL_INVALIDATED');
    expect(r.changed).toContain('title');
  });

  it('breaks when the publish time moves', () => {
    const changed = structuredClone(base);
    changed.youtube.publishAt = '2030-01-01T00:00:00.000Z';
    expect(checkApproval(changed, approvalRow).changed).toContain('publish time');
  });

  it('breaks when the video asset itself changes', () => {
    const changed = structuredClone(base);
    changed.asset.sha256 = 'sha256:different';
    expect(checkApproval(changed, approvalRow).changed).toContain('video asset');
  });

  it('breaks when privacy changes', () => {
    const changed = structuredClone(base);
    changed.youtube.privacy = 'public';
    expect(checkApproval(changed, approvalRow).changed).toContain('privacy');
  });

  it('reports NOT_APPROVED rather than throwing when there is no approval', () => {
    expect(checkApproval(base, null)).toEqual({ valid: false, reason: 'NOT_APPROVED', changed: [] });
  });

  it('produces a stable hash regardless of tag ordering', () => {
    const a = buildManifest(CONTENT, { metadata: { tags: ['b', 'a'] } });
    const b = buildManifest(CONTENT, { metadata: { tags: ['a', 'b'] } });
    expect(computeMetadataHash(a)).toBe(computeMetadataHash(b));
  });
});

describe('state transitions', () => {
  it('allows the normal forward path', () => {
    expect(canTransition(PUBLISH_STATE.QA_READY, PUBLISH_STATE.METADATA_READY)).toBe(true);
    expect(canTransition(PUBLISH_STATE.USER_APPROVED, PUBLISH_STATE.UPLOADING)).toBe(true);
    expect(canTransition(PUBLISH_STATE.UPLOADING, PUBLISH_STATE.UPLOADED_PRIVATE)).toBe(true);
  });

  it('allows the approval-invalidation edge backwards', () => {
    expect(canTransition(PUBLISH_STATE.USER_APPROVED, PUBLISH_STATE.METADATA_READY)).toBe(true);
  });

  it('forbids skipping approval', () => {
    expect(canTransition(PUBLISH_STATE.METADATA_READY, PUBLISH_STATE.UPLOADING)).toBe(false);
  });

  it('treats PUBLISHED as terminal', () => {
    expect(canTransition(PUBLISH_STATE.PUBLISHED, PUBLISH_STATE.DRAFT)).toBe(false);
  });
});

describe('error normalisation', () => {
  it('maps an approval error to 409 rather than a bare 400', () => {
    const { status, body } = toWireError(new DomainError(ERROR.APPROVAL_REQUIRED));
    expect(status).toBe(409);
    expect(body.error.code).toBe('APPROVAL_REQUIRED');
  });

  it('translates a raw invalid_grant into an actionable domain error', () => {
    const { status, body } = toWireError(new Error('invalid_grant: Token has been expired or revoked.'));
    expect(status).toBe(401);
    expect(body.error.code).toBe('AUTH_EXPIRED');
    expect(body.error.title).toMatch(/expired/i);
  });

  it('never leaks a raw stack trace into the user-facing body', () => {
    const err = new Error('boom');
    err.stack = 'Error: boom\n    at secretPath';
    const { body } = toWireError(err);
    expect(JSON.stringify(body)).not.toMatch(/secretPath/);
  });

  it('gives every code human copy', () => {
    for (const code of Object.values(ERROR)) {
      const { body } = toWireError(new DomainError(code));
      expect(body.error.title).toBeTruthy();
      expect(body.error.body).toBeTruthy();
    }
  });
});
