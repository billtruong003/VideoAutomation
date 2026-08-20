/**
 * VideoDetail — the heart of the application.
 *
 * Production, metadata, publish, analytics and retention for one piece of content, in one
 * place. This is where the feedback loop is actually visible: the same page that shows the
 * storyboard beats will show the retention curve those beats explain.
 *
 * Raw JSON is available but never the default view — an operations tool that dumps a
 * storyboard blob at you is a developer console, not a tool.
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { assetUrl, useQuery } from '../api';
import { Badge, Card, Empty, ErrorState, Loading, Notice, fmtBytes, fmtDate, fmtDuration } from '../components/ui';
import RetentionChart from '../components/RetentionChart';

type Beat = { scene: string; beat_index: number; t_seconds: number; ratio: number; label: string | null; action: string };
type Still = { path: string; frame: number | null; scene: string | null; index: number };

type Detail = {
  content_id: string; topic: string; episode_number: number | null;
  duration_s: number | null; video_bytes: number | null; content_hash: string | null;
  video_path: string | null; srt_path: string | null; storyboard_path: string | null;
  rendered_at: string | null; qa_status: string; publish_state: string;
  stateMeta: { label: string; tone: string; hint: string };
  scriptPreview: string | null; beats: Beat[]; stills: Still[];
  manifest: { metadata: { selectedTitle: string; description: string; tags: string[] } };
  approvalCheck: { valid: boolean; reason: string | null; changed: string[] };
  readiness: { ready: boolean; blockers: string[]; warnings: string[] };
  youtube: { video_id: string; privacy_status: string } | null;
  episodeConfig: { hook?: string; cast?: { lead: string; support: string[]; note: string } } | null;
};

const TABS = ['Production', 'Metadata', 'Publish', 'Analytics', 'Retention'] as const;

export default function VideoDetail() {
  const { id = '' } = useParams();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Production');
  const { data, error, loading, reload } = useQuery<Detail>(id ? `/content/${id}` : null, [id]);

  if (loading) return <Card><Loading what="Loading content" /></Card>;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <Empty title="Not found">No content with that id.</Empty>;

  return (
    <>
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <p className="sub"><Link to="/videos">Videos</Link> · episode {data.episode_number ?? '—'}</p>
          <h1 style={{ overflowWrap: 'anywhere' }}>{data.manifest.metadata.selectedTitle || data.topic}</h1>
          <div className="row" style={{ marginTop: 6 }}>
            <Badge tone={data.stateMeta.tone} title={data.stateMeta.hint}>{data.stateMeta.label}</Badge>
            <span className="muted mono">{data.content_id}</span>
            <span className="muted">{fmtDuration(data.duration_s)} · {fmtBytes(data.video_bytes)}</span>
          </div>
        </div>
        <div className="row">
          <Link to={`/metadata/${id}`} className="btn ghost">Metadata Studio</Link>
          <Link to={`/publish/${id}`} className="btn">Publish Studio</Link>
        </div>
      </div>

      {!data.approvalCheck.valid && data.approvalCheck.reason === 'APPROVAL_INVALIDATED' && (
        <div style={{ marginBottom: 16 }}>
          <Notice tone="warn" title="Approval required again">
            These changed after approval: <strong>{data.approvalCheck.changed.join(', ')}</strong>.
            Review and approve again before uploading.
          </Notice>
        </div>
      )}

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Production' && <Production data={data} id={id} />}
      {tab === 'Metadata' && <MetadataTab data={data} id={id} />}
      {tab === 'Publish' && <PublishTab id={id} />}
      {tab === 'Analytics' && <AnalyticsTab data={data} />}
      {tab === 'Retention' && <RetentionTab id={id} />}
    </>
  );
}

function Production({ data, id }: { data: Detail; id: string }) {
  return (
    <div className="grid c2">
      <div className="stack">
        <Card title="Render">
          {data.video_path ? (
            <video
              src={assetUrl(id, 'video')}
              controls
              preload="metadata"
              poster={assetUrl(id, 'still', 0)}
              style={{ width: '100%', maxHeight: 460, background: '#000', borderRadius: 8, display: 'block' }}
            />
          ) : <Empty title="No render">This episode has no MP4 in out/.</Empty>}
          <div className="sep" />
          <div className="dl">
            <dt>Duration</dt><dd>{fmtDuration(data.duration_s)}</dd>
            <dt>Rendered</dt><dd>{fmtDate(data.rendered_at)}</dd>
            <dt>Content hash</dt><dd className="mono">{data.content_hash?.slice(7, 23) ?? '—'}</dd>
            <dt>QA</dt><dd><Badge tone={data.qa_status === 'RENDERED' ? 'good' : 'warn'}>{data.qa_status}</Badge></dd>
          </div>
          <div className="path">{data.video_path}</div>
        </Card>

        {data.stills.length > 0 && (
          <Card title={`QA contact sheet · ${data.stills.length}`}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {data.stills.map((s) => (
                <figure key={s.index} style={{ margin: 0 }}>
                  <img
                    src={assetUrl(id, 'still', s.index)} alt={s.scene ?? ''} loading="lazy"
                    style={{ width: '100%', borderRadius: 6, border: '1px solid var(--line)', display: 'block' }}
                  />
                  <figcaption className="muted" style={{ fontSize: 10.5, marginTop: 3 }}>{s.scene ?? `frame ${s.frame}`}</figcaption>
                </figure>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="stack">
        <Card title="Storyboard beats">
          {data.beats.length === 0 ? <Empty title="No beats" mood="thinking">No storyboard indexed.</Empty> : (
            <>
              <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
                {data.beats.length} beats. These overlay the retention curve once the video is published.
              </p>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                <table className="table">
                  <tbody>
                    {data.beats.map((b) => (
                      <tr key={b.beat_index}>
                        <td className="mono muted" style={{ width: 52 }}>{b.t_seconds.toFixed(1)}s</td>
                        <td style={{ width: 62 }}>{(b.ratio * 100).toFixed(0)}%</td>
                        <td style={{ width: 96 }}>
                          {b.label ? <Badge tone="info">{b.label}</Badge> : <span className="muted">—</span>}
                        </td>
                        <td style={{ fontSize: 12 }}>{b.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>

        <Card title="Script">
          {data.scriptPreview
            ? <p style={{ fontSize: 13, lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>{data.scriptPreview}</p>
            : <Empty title="No script">No narration text indexed.</Empty>}
        </Card>

        <Card title="Captions & source">
          <div className="dl">
            <dt>SRT track</dt>
            <dd>{data.srt_path ? <Badge tone="good">Ready</Badge> : <Badge tone="warn">Not linked</Badge>}</dd>
            <dt>Burned-in</dt><dd>Yes — rendered into the video</dd>
          </div>
          <p className="muted" style={{ fontSize: 12 }}>
            Burned-in captions and a YouTube caption track are different things. This episode has
            burned-in captions in the render; the SRT can additionally be uploaded as a track.
          </p>
          {data.srt_path && <div className="path">{data.srt_path}</div>}
        </Card>

        {data.episodeConfig?.cast && (
          <Card title="Cast">
            <div className="dl">
              <dt>Lead</dt><dd>{data.episodeConfig.cast.lead}</dd>
              <dt>Support</dt><dd>{data.episodeConfig.cast.support?.join(', ') || '—'}</dd>
            </div>
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>{data.episodeConfig.cast.note}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function MetadataTab({ data, id }: { data: Detail; id: string }) {
  const m = data.manifest.metadata;
  return (
    <Card title="Current metadata" actions={<Link to={`/metadata/${id}`} className="btn sm">Open Metadata Studio</Link>}>
      <div className="dl">
        <dt>Title</dt><dd>{m.selectedTitle || <span className="muted">Not set</span>}</dd>
        <dt>Description</dt><dd style={{ whiteSpace: 'pre-wrap', fontWeight: 400 }}>{m.description || <span className="muted">Not set</span>}</dd>
        <dt>Tags</dt><dd>{m.tags.length ? m.tags.join(', ') : <span className="muted">None</span>}</dd>
      </div>
    </Card>
  );
}

function PublishTab({ id }: { id: string }) {
  return (
    <Card title="Publish">
      <p className="muted">Publish settings, approval and upload live in the Publish Studio.</p>
      <Link to={`/publish/${id}`} className="btn">Open Publish Studio</Link>
    </Card>
  );
}

function AnalyticsTab({ data }: { data: Detail }) {
  const vid = data.youtube?.video_id ?? null;
  const q = useQuery<{ availability: string; metrics: Record<string, string> | null }>(
    vid ? `/analytics/video/${vid}?range=28d` : null, [vid],
  );

  if (!vid) {
    return <Empty title="Not published yet">
      This video is not on YouTube, so there is nothing to measure. Analytics appear after publication.
    </Empty>;
  }
  if (q.loading) return <Card><Loading what="Querying Analytics" /></Card>;
  if (q.data?.availability !== 'OK') {
    return <Empty title="No analytics data yet">YouTube has not reported data for this video.</Empty>;
  }
  return (
    <div className="grid c4">
      {Object.entries(q.data.metrics ?? {}).map(([k, v]) => (
        <div className="card tight" key={k}>
          <div className="kpi-label">{k}</div>
          <div className="kpi-value">{v}</div>
        </div>
      ))}
    </div>
  );
}

function RetentionTab({ id }: { id: string }) {
  const q = useQuery<any>(`/retention/${id}`, [id]);
  if (q.loading) return <Card><Loading what="Loading retention" /></Card>;
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  return <RetentionChart data={q.data} />;
}
