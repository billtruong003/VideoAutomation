/**
 * Retention — the production timeline joined to YouTube's normalised curve.
 *
 * With no published video there is no curve, and none is invented. What IS shown is our own
 * storyboard timeline, because that is real and useful on its own — it is the overlay that
 * will sit under the curve the moment data exists.
 */

import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, type ContentRow } from '../api';
import { Badge, Card, Empty, ErrorState, Loading, Notice } from '../components/ui';
import RetentionChart from '../components/RetentionChart';

export default function Retention() {
  const { id } = useParams();
  const nav = useNavigate();
  const content = useQuery<ContentRow[]>('/content');
  const rows = content.data ?? [];

  if (!id) {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>Retention</h1>
            <p className="sub">Audience retention with our own storyboard beats overlaid.</p>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <Notice tone="info" title="How this works">
            YouTube returns roughly 100 points of <span className="mono">audienceWatchRatio</span> against{' '}
            <span className="mono">elapsedVideoTimeRatio</span>. We hold every storyboard beat with its own
            <span className="mono"> t ÷ duration</span> ratio, so the two join directly. "Viewers leave at 57%"
            becomes "they leave at the mechanism reveal" — a statement about a creative decision.
          </Notice>
        </div>

        {content.loading && <Card><Loading /></Card>}
        {rows.length === 0 && !content.loading && <Empty title="No content indexed" />}

        <div className="grid c3">
          {rows.map((r) => (
            <Card key={r.content_id} className="tight">
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{r.selected_title ?? r.topic}</div>
              <div className="row between">
                <div className="row" style={{ gap: 5 }}>
                  <Badge tone="info">{r.beat_count} beats</Badge>
                  <Badge tone={r.video_id ? 'good' : 'neutral'}>{r.video_id ? 'published' : 'not published'}</Badge>
                </div>
                <button className="btn sm" onClick={() => nav(`/retention/${r.content_id}`)}>Open</button>
              </div>
            </Card>
          ))}
        </div>
      </>
    );
  }
  return <One id={id} />;
}

function One({ id }: { id: string }) {
  const { data, error, loading, reload } = useQuery<any>(`/retention/${id}`, [id]);
  return (
    <>
      <div className="page-head">
        <div>
          <p className="sub"><Link to="/retention">Retention</Link> · <Link to={`/videos/${id}`}>{id}</Link></p>
          <h1>Retention</h1>
        </div>
      </div>
      {loading && <Card><Loading what="Loading retention" /></Card>}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && <RetentionChart data={data} />}
    </>
  );
}
