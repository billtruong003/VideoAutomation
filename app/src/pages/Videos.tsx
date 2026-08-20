/**
 * Videos — the local content inventory.
 *
 * Search and filtering are LOCAL: they run against the indexed SQLite rows, never against
 * `search.list`, which is capped at 100 calls a day and is the scarcest resource in the whole
 * quota system. Finding our own videos through YouTube search would be both slow and wasteful.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, assetUrl, useQuery, type ContentRow } from '../api';
import { Badge, Card, Empty, ErrorState, Loading, fmtBytes, fmtDate, fmtDuration } from '../components/ui';

const VIEWS = ['ALL', 'LOCAL', 'READY', 'PRIVATE', 'SCHEDULED', 'PUBLISHED', 'FAILED'] as const;

export default function Videos() {
  const [view, setView] = useState<string>('ALL');
  const [q, setQ] = useState('');
  const [rescanning, setRescanning] = useState(false);

  const { data, error, loading, reload } = useQuery<ContentRow[]>(
    `/content?view=${view}&q=${encodeURIComponent(q)}`, [view, q],
  );

  const rescan = async () => {
    setRescanning(true);
    try { await api.post('/content/rescan'); reload(); } finally { setRescanning(false); }
  };

  const rows = data ?? [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Videos</h1>
          <p className="sub">Local production content, indexed from the repository.</p>
        </div>
        <button className="btn ghost" onClick={rescan} disabled={rescanning}>
          {rescanning ? 'Rescanning…' : 'Rescan content'}
        </button>
      </div>

      <div className="row" style={{ marginBottom: 16 }}>
        <div className="tabs" style={{ border: 'none', margin: 0, flex: 1 }}>
          {VIEWS.map((v) => (
            <button key={v} className={`tab${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
              {v[0] + v.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <input
          className="input" style={{ maxWidth: 260 }}
          placeholder="Search titles and topics…"
          value={q} onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading && <Card><Loading what="Loading content" /></Card>}
      {error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && rows.length === 0 && (
        <Empty title={q ? 'Nothing matches that search' : 'No content in this view'}>
          {q
            ? 'Try a different term. Search runs locally against indexed content — it never uses YouTube search quota.'
            : 'Rendered episodes are discovered from out/, episodes/ and qa/. Use Rescan content if you have just rendered something.'}
        </Empty>
      )}

      {rows.length > 0 && (
        <Card className="tight">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 64 }}>Frame</th>
                <th style={{ width: 34 }}>#</th>
                <th>Episode</th>
                <th style={{ width: 74 }}>Length</th>
                <th style={{ width: 82 }}>Size</th>
                <th style={{ width: 100 }}>Artifacts</th>
                <th style={{ width: 148 }}>Publish state</th>
                <th style={{ width: 132 }}>YouTube</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.content_id} className="clickable">
                  <td>
                    {r.still_count > 0 ? (
                      <Link to={`/videos/${r.content_id}`}>
                        <img
                          src={assetUrl(r.content_id, 'still', 0)}
                          alt=""
                          loading="lazy"
                          style={{ width: 52, height: 30, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--line)', display: 'block' }}
                        />
                      </Link>
                    ) : <span className="muted">—</span>}
                  </td>
                  <td className="muted mono">{r.episode_number ?? '—'}</td>
                  <td>
                    <Link to={`/videos/${r.content_id}`} style={{ fontWeight: 600 }}>
                      {r.selected_title ?? r.topic}
                    </Link>
                    <div className="muted mono" style={{ fontSize: 11 }}>{r.content_id}</div>
                  </td>
                  <td>{fmtDuration(r.duration_s)}</td>
                  <td className="muted">{fmtBytes(r.video_bytes)}</td>
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      {r.hasRender && <Badge tone="neutral" title="Rendered MP4 present">MP4</Badge>}
                      {r.hasSrt && <Badge tone="neutral" title="Source SRT linked">SRT</Badge>}
                      {r.beat_count > 0 && <Badge tone="neutral" title={`${r.beat_count} storyboard beats`}>{r.beat_count}b</Badge>}
                    </div>
                  </td>
                  <td><Badge tone={r.stateMeta.tone} title={r.stateMeta.hint}>{r.stateMeta.label}</Badge></td>
                  <td>
                    {r.video_id
                      ? <span className="mono" title={r.video_id}>{r.privacy_status ?? 'on YouTube'}</span>
                      : <span className="muted">Not uploaded</span>}
                    {r.publish_at && <div className="muted" style={{ fontSize: 11 }}>{fmtDate(r.publish_at)}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
