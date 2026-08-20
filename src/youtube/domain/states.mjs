/**
 * states.mjs — the single vocabulary for every status in the system.
 *
 * Magic status strings scattered across a backend and a React tree are how a system ends up
 * with `"uploaded"`, `"UPLOADED"` and `"uploaded_private"` all meaning the same thing and
 * none of them matching. Everything — API responses, database rows, UI badges — imports
 * from here.
 */

/** Where a piece of content sits on its way to YouTube. */
export const PUBLISH_STATE = {
  DRAFT: 'DRAFT',
  QA_READY: 'QA_READY',
  METADATA_READY: 'METADATA_READY',
  USER_APPROVED: 'USER_APPROVED',
  UPLOADING: 'UPLOADING',
  UPLOADED_PRIVATE: 'UPLOADED_PRIVATE',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  FAILED: 'FAILED',
};

/**
 * Legal transitions. Enforced in the service layer, not merely documented.
 *
 * `USER_APPROVED -> METADATA_READY` is the approval-invalidation edge: it is a legal move
 * backwards, which is the whole point of hashing an approval.
 */
export const PUBLISH_TRANSITIONS = {
  DRAFT: ['QA_READY', 'FAILED'],
  QA_READY: ['METADATA_READY', 'DRAFT', 'FAILED'],
  METADATA_READY: ['USER_APPROVED', 'QA_READY', 'FAILED'],
  USER_APPROVED: ['UPLOADING', 'METADATA_READY', 'FAILED'],
  UPLOADING: ['UPLOADED_PRIVATE', 'FAILED'],
  UPLOADED_PRIVATE: ['SCHEDULED', 'PUBLISHED', 'FAILED'],
  SCHEDULED: ['PUBLISHED', 'UPLOADED_PRIVATE', 'FAILED'],
  PUBLISHED: [],
  FAILED: ['DRAFT', 'METADATA_READY', 'USER_APPROVED'],
};

export function canTransition(from, to) {
  return (PUBLISH_TRANSITIONS[from] ?? []).includes(to);
}

/** Human-facing labels and the badge tone the UI should use. */
export const PUBLISH_STATE_META = {
  DRAFT: { label: 'Draft', tone: 'neutral', hint: 'Discovered locally. No metadata yet.' },
  QA_READY: { label: 'QA Ready', tone: 'neutral', hint: 'Render validated and ready for metadata.' },
  METADATA_READY: { label: 'Metadata Ready', tone: 'info', hint: 'Title and description chosen. Awaiting approval.' },
  USER_APPROVED: { label: 'Approved', tone: 'good', hint: 'Approved for upload at this exact content and metadata.' },
  UPLOADING: { label: 'Uploading', tone: 'busy', hint: 'Resumable upload in progress.' },
  UPLOADED_PRIVATE: { label: 'Uploaded (Private)', tone: 'good', hint: 'On YouTube, private.' },
  SCHEDULED: { label: 'Scheduled', tone: 'good', hint: 'YouTube will publish at the set time.' },
  PUBLISHED: { label: 'Published', tone: 'good', hint: 'Live on YouTube.' },
  FAILED: { label: 'Failed', tone: 'bad', hint: 'See the queue for the error.' },
};

/** Background job types. Only operations the system actually performs. */
export const JOB_TYPE = {
  UPLOAD_VIDEO: 'UPLOAD_VIDEO',
  SET_THUMBNAIL: 'SET_THUMBNAIL',
  UPLOAD_CAPTION: 'UPLOAD_CAPTION',
  ADD_PLAYLIST: 'ADD_PLAYLIST',
  SYNC_VIDEO: 'SYNC_VIDEO',
  SYNC_ANALYTICS: 'SYNC_ANALYTICS',
  /** A deliberately harmless job used to exercise the queue without touching Google. */
  DRY_RUN: 'DRY_RUN',
};

export const JOB_STATE = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  RETRY_WAIT: 'RETRY_WAIT',
  CANCELLED: 'CANCELLED',
};

export const JOB_STATE_META = {
  PENDING: { label: 'Pending', tone: 'neutral' },
  RUNNING: { label: 'Running', tone: 'busy' },
  SUCCEEDED: { label: 'Succeeded', tone: 'good' },
  FAILED: { label: 'Failed', tone: 'bad' },
  RETRY_WAIT: { label: 'Retry scheduled', tone: 'warn' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

/**
 * Production beat labels used for the retention overlay.
 *
 * A video does not need all of them. These are the shapes this channel's Shorts actually
 * use, derived from each episode's own storyboard.json.
 */
export const BEAT_LABEL = {
  HOOK: 'HOOK',
  QUESTION: 'QUESTION',
  WRONG_ASSUMPTION: 'WRONG_ASSUMPTION',
  MECHANISM: 'MECHANISM',
  REVEAL: 'REVEAL',
  PAYOFF: 'PAYOFF',
  GAG: 'GAG',
  LOOP: 'LOOP',
};

/**
 * Capability gates.
 *
 * These separate "the code can do it" from "we are permitted to do it". `PUBLIC_PUBLISHING`
 * is false because the Cloud project has not passed the YouTube API compliance audit, and
 * until it does, every `videos.insert` upload is permanently private regardless of what the
 * request asks for. OAuth succeeding does not change this, which is exactly why it is a
 * separate flag rather than something inferred from auth state.
 */
export const CAPABILITY = {
  OAUTH_READ: 'OAUTH_READ',
  PRIVATE_UPLOAD: 'PRIVATE_UPLOAD',
  PUBLIC_PUBLISHING: 'PUBLIC_PUBLISHING',
  SCHEDULED_PUBLISHING: 'SCHEDULED_PUBLISHING',
};

export const CAPABILITY_META = {
  OAUTH_READ: {
    label: 'Read channel & analytics',
    blockedReason: null,
  },
  PRIVATE_UPLOAD: {
    label: 'Upload as private',
    blockedReason: 'Requires the youtube.upload scope. Reconnect with publish permissions.',
  },
  PUBLIC_PUBLISHING: {
    label: 'Publish publicly via API',
    blockedReason:
      'YouTube API compliance audit required. Uploads from unaudited projects created after ' +
      '28 July 2020 are permanently restricted to private, and publishAt cannot override it.',
  },
  SCHEDULED_PUBLISHING: {
    label: 'Schedule publication via API',
    blockedReason:
      'Blocked by the same compliance audit as public publishing. A schedule can be prepared ' +
      'and stored locally, but the API write is withheld.',
  },
};
