/**
 * errors.mjs — one vocabulary of domain errors, and one translation layer.
 *
 * The UI must never see `GaxiosError: invalid_grant` or a stack trace. It sees a code, a
 * sentence a human can act on, and — behind a disclosure — the technical detail for when
 * someone is actually debugging.
 */

export const ERROR = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  CONSENT_REVOKED: 'CONSENT_REVOKED',
  SCOPE_MISSING: 'SCOPE_MISSING',
  API_DISABLED: 'API_DISABLED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  UPLOAD_RESTRICTED_PRIVATE: 'UPLOAD_RESTRICTED_PRIVATE',
  UPLOAD_DUPLICATE: 'UPLOAD_DUPLICATE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  VIDEO_PROCESSING: 'VIDEO_PROCESSING',
  VIDEO_REJECTED: 'VIDEO_REJECTED',
  INVALID_METADATA: 'INVALID_METADATA',
  INVALID_SCHEDULE: 'INVALID_SCHEDULE',
  APPROVAL_INVALIDATED: 'APPROVAL_INVALIDATED',
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
  CAPABILITY_BLOCKED: 'CAPABILITY_BLOCKED',
  ANALYTICS_NOT_READY: 'ANALYTICS_NOT_READY',
  ANALYTICS_QUERY_INVALID: 'ANALYTICS_QUERY_INVALID',
  NOT_FOUND: 'NOT_FOUND',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  INTERNAL: 'INTERNAL',
};

/** What a person should read, and what they can do about it. */
export const ERROR_COPY = {
  AUTH_REQUIRED: { title: 'Google authorisation required', body: 'Connect your Google account to continue.', action: 'Connect' },
  AUTH_EXPIRED: { title: 'Authorisation expired', body: 'Google no longer accepts the stored grant. Reconnect to continue.', action: 'Reconnect' },
  CONSENT_REVOKED: { title: 'Access was revoked', body: 'This app’s access to your Google account was withdrawn. Reconnect to restore it.', action: 'Reconnect' },
  SCOPE_MISSING: { title: 'Extra permission needed', body: 'The current grant does not include the permission this action needs.', action: 'Reconnect with publish access' },
  API_DISABLED: { title: 'API not enabled', body: 'The required API is not enabled for this Google Cloud project.', action: null },
  QUOTA_EXCEEDED: { title: 'Daily quota reached', body: 'This API bucket is exhausted for today. It resets at midnight Pacific time.', action: null },
  UPLOAD_RESTRICTED_PRIVATE: {
    title: 'Public publishing is blocked',
    body: 'This Google project has not passed the YouTube API compliance audit, so API uploads stay private permanently. Private upload still works.',
    action: null,
  },
  UPLOAD_DUPLICATE: { title: 'Already uploaded', body: 'This exact video has already been uploaded. Open the existing upload instead of creating a second one.', action: null },
  UPLOAD_FAILED: { title: 'Upload failed', body: 'The upload did not complete. The queue holds the error and can retry.', action: 'Open queue' },
  VIDEO_PROCESSING: { title: 'Still processing', body: 'YouTube is still processing this video.', action: null },
  VIDEO_REJECTED: { title: 'Rejected by YouTube', body: 'YouTube rejected this video. See the reason in the queue.', action: null },
  INVALID_METADATA: { title: 'Metadata is not valid', body: 'Fix the highlighted fields before approving.', action: null },
  INVALID_SCHEDULE: { title: 'Schedule is not valid', body: 'The publish time must be a valid timestamp in the future.', action: null },
  APPROVAL_INVALIDATED: { title: 'Approval no longer valid', body: 'Something material changed after approval. Review and approve again.', action: 'Review' },
  APPROVAL_REQUIRED: { title: 'Approval required', body: 'This job has not been approved.', action: 'Review' },
  CAPABILITY_BLOCKED: { title: 'Action unavailable', body: 'This capability is gated. See API Health for why.', action: 'Open API Health' },
  ANALYTICS_NOT_READY: { title: 'No analytics yet', body: 'YouTube has not reported analytics data for this yet.', action: null },
  ANALYTICS_QUERY_INVALID: { title: 'Invalid analytics query', body: 'That combination of metrics and dimensions is not supported.', action: null },
  NOT_FOUND: { title: 'Not found', body: 'That item does not exist.', action: null },
  UPSTREAM_ERROR: { title: 'Google returned an error', body: 'A temporary problem at Google. Retrying usually works.', action: 'Retry' },
  INTERNAL: { title: 'Something went wrong', body: 'An unexpected local error occurred. The log has the detail.', action: null },
};

export class DomainError extends Error {
  /**
   * `status` is left undefined by default on purpose. Defaulting it to 400 would shadow the
   * HTTP_STATUS map below — every error would answer 400 and a caller could not distinguish
   * "you must re-approve" (409) from "that was malformed" (400).
   */
  constructor(code, message, detail = null, status = undefined) {
    super(message ?? ERROR_COPY[code]?.title ?? code);
    this.name = 'DomainError';
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

const HTTP_STATUS = {
  AUTH_REQUIRED: 401, AUTH_EXPIRED: 401, CONSENT_REVOKED: 401, SCOPE_MISSING: 403,
  API_DISABLED: 503, QUOTA_EXCEEDED: 429, CAPABILITY_BLOCKED: 409,
  UPLOAD_RESTRICTED_PRIVATE: 409, UPLOAD_DUPLICATE: 409, APPROVAL_INVALIDATED: 409,
  APPROVAL_REQUIRED: 409, NOT_FOUND: 404, UPSTREAM_ERROR: 502, INTERNAL: 500,
};

/**
 * Turn anything thrown anywhere into a normalised wire shape.
 *
 * Google/library errors already classified by `api.mjs` come through with a `.code`; raw
 * throws become INTERNAL. Either way the client gets the same envelope.
 */
export function toWireError(err) {
  if (err instanceof DomainError) {
    return { status: err.status ?? HTTP_STATUS[err.code] ?? 400, body: envelope(err.code, err.message, err.detail) };
  }
  const code = err?.code && ERROR[err.code] ? err.code : mapLoose(err);
  return { status: HTTP_STATUS[code] ?? 500, body: envelope(code, err?.message, err?.detail ?? null) };
}

function mapLoose(err) {
  const m = String(err?.message ?? '');
  if (/invalid_grant|Token has been expired|revoked/i.test(m)) return ERROR.AUTH_EXPIRED;
  if (/AUTH_REQUIRED|no usable stored grant/i.test(m)) return ERROR.AUTH_REQUIRED;
  if (/insufficient|scope/i.test(m)) return ERROR.SCOPE_MISSING;
  if (/quota/i.test(m)) return ERROR.QUOTA_EXCEEDED;
  return ERROR.INTERNAL;
}

function envelope(code, message, detail) {
  const copy = ERROR_COPY[code] ?? ERROR_COPY.INTERNAL;
  return {
    error: {
      code,
      title: copy.title,
      body: copy.body,
      action: copy.action,
      // Technical detail, shown only behind a disclosure in the UI. Redacted by the logger
      // before it ever reaches a file; here it is already free of credential material
      // because api.mjs never puts token values into `detail`.
      detail: detail ?? (message ? String(message).slice(0, 400) : null),
    },
  };
}
