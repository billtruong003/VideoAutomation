/**
 * Dashboard — the operational overview.
 *
 * The rule that shapes this page: never render a zero that could be mistaken for a
 * measurement. A channel with no published videos has no analytics, and showing "Views 0"
 * would be a lie of presentation — so the KPI block is replaced by an explicit empty state
 * until YouTube actually reports something.
 */

import { Link } from 'react-router-dom';
import { useQuery, type Capabilities, type Channel, type ContentRow, type Job } from '../api';
import { Badge, Card, Empty, ErrorState, Kpi, Loading, Notice, fmtDate, fmtNum } from '../components/ui';

type Health = {
  oauth: { status: string; scopes: string[]; hasRefreshToken: boolean };
  tokenStorage: { mode: string; encrypted: boolean; label: string };
  dataApi: string; analyticsApi: string;
  lastSync: { kind: string; finished_at: string; status: string } | null;
  capabilities: Capabilities;
};

type ChannelAnalytics = {
  availability: 'OK' | 'NO_DATA' | 'ERROR';
  metrics: Record<string, string> | null;
  note: string | null;
  startDate?: string; endDate?: string;
};

const STATE_ORDER = ['DRAFT', 'QA_READY', 'METADATA_READY', 'USER_APPROVED', 'UPLOADED_PRIVATE', 'SCHEDULED', 'PUBLISHED', 'FAILED'];
const STATE_LABEL: Record<string, string> = {
  DRAFT: 'Local Drafts', QA_READY: 'QA Ready', METADATA_READY: 'Metadata Ready',
  USER_APPROVED: 'Approved', UPLOADED_PRIVATE: 'Uploaded Private', SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published', FAILED: 'Failed',
};

export default function Dashboard() {
  const channel = useQuery<Channel>('/channel');
  const health = useQuery<Health>('/health');
  const content = useQuery<ContentRow[]>('/content');
  const jobs = useQuery<Job[]>('/queue');
  const analytics = useQuery<ChannelAnalytics>('/analytics/channel?range=28d');

  const rows = content.data ?? [];
  const counts = Object.fromEntries(STATE_ORDER.map((s) => [s, rows.filter((r) => r.publish_state === s).length]));
  const caps = health.data?.capabilities;

  const blockers: { tone: string; title: string; body: string }[] = [];
  if (caps && !caps.PUBLIC_PUBLISHING?.allowed) {
    blockers.push({ tone: 'warn', title: 'Public API publishing is blocked', body: caps.PUBLIC_PUBLISHING.blockedReason ?? '' });
  }
  if (caps && !caps.PRIVATE_UPLOAD?.allowed) {
    blockers.push({ tone: 'info', title: 'Upload permission not granted', body: caps.PRIVATE_UPLOAD.blockedReason ?? '' });
  }
  if (channel.data && channel.data.videoCount === 0) {
    blockers.push({ tone: 'info', title: 'No videos published yet', body: 'Analytics and retention become available once a video is published and accumulates data.' });
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{channel.data?.title ?? 'Bill Finds Out'}</h1>
          <p className="sub">
            {channel.data?.handle ?? '@billfindsout'}
            {channel.data && <> · {fmtNum(channel.data.videoCount)} videos on YouTube · {fmtNum(channel.data.subscriberCount)} subscribers</>}
          </p>
        </div>
        <Link to="/videos" className="btn ghost">Open content</Link>
      </div>

      {channel.error && <div style={{ marginBottom: 16 }}><ErrorState error={channel.error} onRetry={channel.reload} /></div>}

      {blockers.length > 0 && (
        <div className="stack" style={{ marginBottom: 18 }}>
          {blockers.map((b, i) => <Notice key={i} tone={b.tone} title={b.title}>{b.body}</Notice>)}
        </div>
      )}

      {/* ---- system ---- */}
      <h2>System</h2>
      <div className="grid c4" style={{ marginBottom: 22 }}>
        {health.loading ? <Loading what="Checking system" /> : (
          <>
            <Kpi label="OAuth" muted
              value={<Badge tone={health.data?.oauth.status === 'CONNECTED' ? 'good' : 'bad'}>
                {health.data?.oauth.status === 'CONNECTED' ? 'Connected' : 'Action required'}
              </Badge>}
              note={health.data?.oauth.hasRefreshToken ? 'Refresh token held' : 'No refresh token'} />
            <Kpi label="YouTube Data API" muted
              value={<Badge tone={health.data?.dataApi === 'HEALTHY' ? 'good' : 'warn'}>{health.data?.dataApi ?? '—'}</Badge>} />
            <Kpi label="Analytics API" muted
              value={<Badge tone={health.data?.analyticsApi === 'HEALTHY' ? 'good' : 'warn'}>{health.data?.analyticsApi ?? '—'}</Badge>} />
            <Kpi label="Token storage" muted
              value={<Badge tone={health.data?.tokenStorage.encrypted ? 'good' : 'bad'}>
                {health.data?.tokenStorage.encrypted ? 'DPAPI encrypted' : 'Plaintext'}
              </Badge>}
              note={health.data?.lastSync ? `Last sync ${fmtDate(health.data.lastSync.finished_at)}` : 'No sync yet'} />
          </>
        )}
      </div>

      {/* ---- content pipeline ---- */}
      <h2>Content pipeline</h2>
      <div className="grid c4" style={{ marginBottom: 22 }}>
        {STATE_ORDER.map((s) => (
          <Kpi key={s} label={STATE_LABEL[s]} value={counts[s] ?? 0}
            muted={(counts[s] ?? 0) === 0} />
        ))}
      </div>

      {/* ---- channel performance ---- */}
      <h2>Channel performance · last 28 days</h2>
      <div style={{ marginBottom: 22 }}>
        {analytics.loading && <Card><Loading what="Querying YouTube Analytics" /></Card>}
        {analytics.error && <ErrorState error={analytics.error} onRetry={analytics.reload} />}
        {analytics.data?.availability === 'NO_DATA' && (
          <Empty title="No analytics data yet">
            The Analytics query was authorised and valid — this channel simply has no measured
            data. Figures appear once a video is published and viewers watch it.
          </Empty>
        )}
        {analytics.data?.availability === 'OK' && analytics.data.metrics && (
          <div className="grid c6">
            <Kpi label="Views" value={fmtNum(Number(analytics.data.metrics.views))}
              note="Every start or replay" />
            <Kpi label="Engaged Views" value={fmtNum(Number(analytics.data.metrics.engagedViews))}
              note="Watched past the first seconds" />
            <Kpi label="Avg View Duration" value={`${analytics.data.metrics.averageViewDuration}s`} />
            <Kpi label="Avg % Viewed" value={`${Number(analytics.data.metrics.averageViewPercentage).toFixed(1)}%`} />
            <Kpi label="Shares" value={fmtNum(Number(analytics.data.metrics.shares))} />
            <Kpi label="Subs Gained" value={fmtNum(Number(analytics.data.metrics.subscribersGained))} />
          </div>
        )}
      </div>

      <div className="grid c2">
        <Card title="Recent local content" actions={<Link to="/videos" className="btn sm ghost">All</Link>}>
          {content.loading && <Loading />}
          {rows.length === 0 && !content.loading && <Empty title="No content indexed">Rescan from the Videos page.</Empty>}
          {rows.length > 0 && (
            <table className="table">
              <tbody>
                {rows.slice(0, 6).map((r) => (
                  <tr key={r.content_id}>
                    <td style={{ width: 34 }} className="muted mono">{r.episode_number ?? '—'}</td>
                    <td><Link to={`/videos/${r.content_id}`}>{r.selected_title ?? r.topic}</Link></td>
                    <td style={{ width: 130, textAlign: 'right' }}>
                      <Badge tone={r.stateMeta.tone} title={r.stateMeta.hint}>{r.stateMeta.label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Queue" actions={<Link to="/queue" className="btn sm ghost">Open</Link>}>
          {jobs.loading && <Loading />}
          {(jobs.data ?? []).length === 0 && !jobs.loading && (
            <Empty title="No jobs" mood="thinking">Upload, caption and sync jobs appear here.</Empty>
          )}
          {(jobs.data ?? []).slice(0, 6).map((j) => (
            <div key={j.id} className="row between" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span className="mono">#{j.id} {j.type}</span>
              <Badge tone={j.state === 'SUCCEEDED' ? 'good' : j.state === 'FAILED' ? 'bad' : 'busy'}>{j.state}</Badge>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
