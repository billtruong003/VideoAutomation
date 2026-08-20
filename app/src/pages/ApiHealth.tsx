/**
 * API Health — the real state of the backend's connection to Google.
 *
 * Every value is read from the backend, which in turn reads it from the token store, the
 * quota ledger and live API calls. Nothing on this page is a hardcoded "healthy".
 *
 * No secret is displayed. Scope names are shown because they are not secret and knowing them
 * is how a user understands what the app can and cannot do; token values never appear.
 */

import { useQuery, type Capabilities, type Channel } from '../api';
import { Badge, Card, ErrorState, Kpi, Loading, Notice, fmtDate, fmtNum } from '../components/ui';

type Health = {
  oauth: { status: string; hasRefreshToken: boolean; scopes: string[]; accessTokenExpiresAt: string | null; expired: boolean | null };
  tokenStorage: { mode: string; encrypted: boolean; label: string };
  credential: { kind?: string; clientId?: string; projectId?: string; path?: string; source?: string; error?: string };
  dataApi: string; analyticsApi: string;
  channel: Channel | null;
  lastSuccess: { method: string; at: string } | null;
  lastFailure: { method: string; at: string } | null;
  lastSync: { kind: string; finished_at: string; status: string } | null;
  capabilities: Capabilities;
};

type Quota = {
  note: string; estimate: boolean;
  buckets: { bucket: string; units: number; calls: number; errors: number; limit: number | null; unit: string; methods: { method: string; units: number; calls: number }[] }[];
  lastCall: { method: string; bucket: string; ok: number; at: string } | null;
};

export default function ApiHealth() {
  const h = useQuery<Health>('/health');
  const q = useQuery<Quota>('/quota');

  if (h.loading) return <Card><Loading what="Checking system health" /></Card>;
  if (h.error) return <ErrorState error={h.error} onRetry={h.reload} />;
  const d = h.data!;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>API Health</h1>
          <p className="sub">Live state of the Google connection. No secrets are shown here.</p>
        </div>
        <button className="btn ghost" onClick={h.reload}>Recheck</button>
      </div>

      <div className="grid c4" style={{ marginBottom: 20 }}>
        <Kpi label="OAuth" muted value={
          <Badge tone={d.oauth.status === 'CONNECTED' ? 'good' : 'bad'}>
            {d.oauth.status === 'CONNECTED' ? 'Connected' : 'Action required'}
          </Badge>} note={d.oauth.hasRefreshToken ? 'Refresh token held' : 'No refresh token'} />
        <Kpi label="Token storage" muted value={
          <Badge tone={d.tokenStorage.encrypted ? 'good' : 'bad'}>
            {d.tokenStorage.encrypted ? 'DPAPI encrypted' : 'Plaintext'}
          </Badge>} note={d.tokenStorage.label} />
        <Kpi label="YouTube Data API" muted value={
          <Badge tone={d.dataApi === 'HEALTHY' ? 'good' : 'warn'}>{d.dataApi}</Badge>} />
        <Kpi label="Analytics API" muted value={
          <Badge tone={d.analyticsApi === 'HEALTHY' ? 'good' : 'warn'}>{d.analyticsApi}</Badge>} />
      </div>

      <div className="grid c2">
        <Card title="Channel">
          {d.channel ? (
            <div className="dl">
              <dt>Title</dt><dd>{d.channel.title}</dd>
              <dt>Handle</dt><dd>{d.channel.handle ?? '—'}</dd>
              <dt>Channel ID</dt><dd className="mono">{d.channel.channelId}</dd>
              <dt>Uploads playlist</dt><dd className="mono">{d.channel.uploadsPlaylistId}</dd>
              <dt>Videos</dt><dd>{fmtNum(d.channel.videoCount)}</dd>
              <dt>Subscribers</dt><dd>{d.channel.subscriberCountHidden ? 'hidden' : fmtNum(d.channel.subscriberCount)}</dd>
            </div>
          ) : <p className="muted">Not connected.</p>}
        </Card>

        <Card title="Credential & scopes">
          <div className="dl">
            <dt>Client type</dt><dd>{d.credential?.kind ?? '—'}</dd>
            <dt>Cloud project</dt><dd className="mono">{d.credential?.projectId ?? '—'}</dd>
            <dt>Resolved via</dt><dd>{d.credential?.source ?? '—'}</dd>
            <dt>Access expires</dt><dd>{fmtDate(d.oauth.accessTokenExpiresAt)}</dd>
          </div>
          <h3 style={{ marginTop: 12 }}>Granted scopes</h3>
          {d.oauth.scopes.length === 0
            ? <p className="muted">None.</p>
            : <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }} className="mono">
                {d.oauth.scopes.map((s) => <li key={s} style={{ wordBreak: 'break-all' }}>{s.replace('https://www.googleapis.com/auth/', '')}</li>)}
              </ul>}
          <p className="muted" style={{ fontSize: 11.5, marginTop: 10, marginBottom: 0 }}>
            The client secret is read from outside the repository and is never displayed, logged or sent to the browser.
          </p>
        </Card>
      </div>

      <h2 style={{ marginTop: 22 }}>Capabilities</h2>
      <div className="stack" style={{ marginBottom: 20 }}>
        {Object.values(d.capabilities ?? {}).map((c) => (
          <div key={c.key} className="card tight">
            <div className="row between">
              <div>
                <strong>{c.label}</strong>
                {!c.allowed && c.blockedReason && (
                  <div className="muted" style={{ fontSize: 12, marginTop: 3, maxWidth: '80ch' }}>{c.blockedReason}</div>
                )}
              </div>
              <Badge tone={c.allowed ? 'good' : 'warn'}>{c.allowed ? 'Available' : 'Blocked'}</Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="grid c2">
        <Card title="Recent API activity">
          <div className="dl">
            <dt>Last success</dt>
            <dd>{d.lastSuccess ? <>{d.lastSuccess.method} · {fmtDate(d.lastSuccess.at)}</> : '—'}</dd>
            <dt>Last failure</dt>
            <dd>{d.lastFailure ? <>{d.lastFailure.method} · {fmtDate(d.lastFailure.at)}</> : 'None'}</dd>
            <dt>Last sync</dt>
            <dd>{d.lastSync ? <>{d.lastSync.kind} · {fmtDate(d.lastSync.finished_at)}</> : '—'}</dd>
          </div>
        </Card>

        <Card title="Quota ledger · last 24h">
          {q.loading && <Loading />}
          {q.data && (
            <>
              {q.data.buckets.length === 0
                ? <p className="muted">No API calls recorded yet.</p>
                : (
                  <table className="table">
                    <thead><tr><th>Bucket</th><th>Used</th><th>Limit</th><th>Errors</th></tr></thead>
                    <tbody>
                      {q.data.buckets.map((b) => (
                        <tr key={b.bucket}>
                          <td className="mono">{b.bucket}</td>
                          <td>{b.unit === 'calls' ? b.calls : b.units} {b.unit}</td>
                          <td className="muted">{b.limit ? `${b.limit} ${b.unit}/day` : 'not published'}</td>
                          <td>{b.errors || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              <div style={{ marginTop: 12 }}>
                <Notice tone="info">{q.data.note}</Notice>
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
