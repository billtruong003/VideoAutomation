/**
 * api.ts — the only place the frontend talks to the backend.
 *
 * Every component goes through here, so there is one fetch implementation, one error shape
 * and one cache. Components never build URLs, never see a Google type, and never hold a
 * credential — the backend is the secret boundary and this module is the whole of the
 * browser's side of it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type WireError = {
  code: string;
  title: string;
  body: string;
  action: string | null;
  detail: string | null;
};

export class ApiError extends Error {
  constructor(public wire: WireError, public status: number) {
    super(wire.title);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const wire: WireError = body?.error ?? {
      code: 'INTERNAL', title: 'Request failed', body: `HTTP ${res.status}`, action: null, detail: null,
    };
    throw new ApiError(wire, res.status);
  }
  return body as T;
}

export const api = {
  get: <T,>(p: string) => request<T>(p),
  post: <T,>(p: string, body?: unknown) => request<T>(p, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T,>(p: string, body?: unknown) => request<T>(p, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
};

/** Asset URLs are content-id based. The browser has no way to express a filesystem path. */
export const assetUrl = (contentId: string, kind: 'video' | 'srt' | 'thumbnail' | 'still', i = 0) =>
  `/api/asset/${encodeURIComponent(contentId)}/${kind}${kind === 'still' ? `?i=${i}` : ''}`;

export type QueryState<T> = {
  data: T | null;
  error: WireError | null;
  loading: boolean;
  reload: () => void;
};

/**
 * Minimal fetch hook.
 *
 * Deliberately not a query library: the app has a dozen endpoints and a single user. What it
 * does guarantee is that every consumer gets the same four states — loading, loaded, empty,
 * error — so no page can accidentally render a permanent spinner.
 */
export function useQuery<T>(path: string | null, deps: unknown[] = []): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<WireError | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [nonce, setNonce] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    if (!path) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    api.get<T>(path)
      .then((d) => { if (alive.current) { setData(d); setError(null); } })
      .catch((e) => { if (alive.current) setError(e instanceof ApiError ? e.wire : {
        code: 'INTERNAL', title: 'Request failed', body: String(e), action: null, detail: null,
      }); })
      .finally(() => { if (alive.current) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nonce, ...deps]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload };
}

// ---------------------------------------------------------------- domain types

export type Capability = { key: string; allowed: boolean; label: string; blockedReason: string | null };
export type Capabilities = Record<string, Capability>;

export type Channel = {
  channelId: string; title: string; handle: string | null; publishedAt: string;
  subscriberCount: number | null; subscriberCountHidden: boolean;
  viewCount: number | null; videoCount: number | null;
  uploadsPlaylistId: string | null; uploadCount?: number;
};

export type StateMeta = { label: string; tone: string; hint: string };

export type ContentRow = {
  content_id: string; topic: string; title_working: string | null; episode_number: number | null;
  duration_s: number | null; video_bytes: number | null; publish_state: string; qa_status: string;
  rendered_at: string | null; content_hash: string | null; srt_path: string | null;
  still_count: number; beat_count: number; selected_title: string | null;
  video_id: string | null; privacy_status: string | null; publish_at: string | null;
  stateMeta: StateMeta; hasRender: boolean; hasSrt: boolean; shortHash: string | null;
};

export type LintIssue = { severity: 'error' | 'warn'; code: string; message: string; hint?: string };
export type LintResult = {
  title: string; family: string; issues: LintIssue[]; errors: number; warnings: number;
  novelty: number;
  score: { clarity: number; curiosity: number; specificity: number; truthfulness: number; channelFit: number; novelty: number; overall: number };
};

export type Manifest = {
  schemaVersion: number; contentId: string;
  asset: { videoPath: string; sha256: string; durationSeconds: number | null; bytes: number | null };
  captions: { path: string | null; language: string; burnedIn: boolean; upload: boolean };
  thumbnail: { path: string | null; syncedVideoId: string | null };
  metadata: { selectedTitle: string; description: string; tags: string[]; categoryId: string; language: string };
  youtube: {
    privacy: 'private' | 'unlisted' | 'public'; publishAt: string | null; playlistIds: string[];
    madeForKids: boolean; containsSyntheticMedia: boolean | null;
  };
  approval: { status: string; assetHash: string | null; metadataHash: string | null; approvedAt: string | null };
};

export type ManifestEnvelope = {
  manifest: Manifest; state: string;
  validation: { ok: boolean; issues: string[] };
  readiness: { ready: boolean; blockers: string[]; warnings: string[] };
  approvalCheck: { valid: boolean; reason: string | null; changed: string[] };
  metadataHash: string;
};

export type Job = {
  id: number; type: string; content_id: string | null; state: string; progress: number;
  attempt: number; max_attempts: number; error_code: string | null; error_message: string | null;
  next_retry_at: string | null; created_at: string; updated_at: string; bytes_sent: number;
};
