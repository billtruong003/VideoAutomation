/**
 * Queue — persistent background jobs.
 *
 * Everything here is read from SQLite, so closing Creator OS and reopening it shows the same
 * queue. A job that was RUNNING when the process died is returned to PENDING by the worker at
 * startup rather than being silently lost.
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, useQuery, type Job } from '../api';
import { Badge, Card, Empty, ErrorState, Loading, Notice, fmtDate } from '../components/ui';

const TONE: Record<string, string> = {
  PENDING: 'neutral', RUNNING: 'busy', SUCCEEDED: 'good',
  FAILED: 'bad', RETRY_WAIT: 'warn', CANCELLED: 'neutral',
};

export default function Queue() {
  const { data, error, loading, reload } = useQuery<Job[]>('/queue');
  const jobs = data ?? [];
  const active = jobs.some((j) => j.state === 'RUNNING' || j.state === 'PENDING');

  // Poll only while something is actually moving — no permanent background traffic.
  useEffect(() => {
    if (!active) return;
    const t = setInterval(reload, 1200);
    return () => clearInterval(t);
  }, [active, reload]);

  const dryRun = async () => { await api.post('/queue/dry-run'); reload(); };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Queue</h1>
          <p className="sub">Background jobs. Persisted in SQLite — they survive a restart.</p>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={dryRun}>Run dry-run job</button>
          <button className="btn ghost" onClick={reload}>Refresh</button>
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && jobs.length === 0 && <Card><Loading what="Loading jobs" /></Card>}

      {!loading && jobs.length === 0 && (
        <Empty title="No jobs yet" mood="thinking">
          Uploads, caption uploads, thumbnail sets and syncs appear here. The dry-run job
          exercises the whole queue without touching Google.
        </Empty>
      )}

      {jobs.length > 0 && (
        <Card className="tight">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th style={{ width: 150 }}>Type</th>
                <th>Content</th>
                <th style={{ width: 130 }}>State</th>
                <th style={{ width: 130 }}>Progress</th>
                <th style={{ width: 68 }}>Tries</th>
                <th style={{ width: 160 }}>Updated</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className="mono muted">{j.id}</td>
                  <td className="mono" style={{ fontSize: 11.5 }}>{j.type}</td>
                  <td>
                    {j.content_id
                      ? <Link to={`/videos/${j.content_id}`}>{j.content_id}</Link>
                      : <span className="muted">—</span>}
                    {j.error_message && (
                      <details className="raw">
                        <summary>Error detail</summary>
                        <pre>{j.error_code}{'\n\n'}{j.error_message}</pre>
                      </details>
                    )}
                  </td>
                  <td>
                    <Badge tone={TONE[j.state] ?? 'neutral'}>{j.state}</Badge>
                    {j.error_code && <div className="muted" style={{ fontSize: 11 }}>{j.error_code}</div>}
                  </td>
                  <td>
                    <div className="progress"><div style={{ width: `${Math.round((j.progress ?? 0) * 100)}%` }} /></div>
                    <div className="muted" style={{ fontSize: 11 }}>{Math.round((j.progress ?? 0) * 100)}%</div>
                  </td>
                  <td className="muted">{j.attempt}/{j.max_attempts}</td>
                  <td className="muted" style={{ fontSize: 11.5 }}>
                    {fmtDate(j.updated_at)}
                    {j.next_retry_at && <div>retry {fmtDate(j.next_retry_at)}</div>}
                  </td>
                  <td>
                    <div className="row" style={{ gap: 5 }}>
                      {(j.state === 'FAILED' || j.state === 'RETRY_WAIT') && (
                        <button className="btn sm ghost" onClick={() => api.post(`/queue/${j.id}/retry`).then(reload)}>Retry</button>
                      )}
                      {(j.state === 'PENDING' || j.state === 'RETRY_WAIT') && (
                        <button className="btn sm ghost" onClick={() => api.post(`/queue/${j.id}/cancel`).then(reload)}>Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div style={{ marginTop: 16 }}>
        <Notice tone="info" title="Retry policy">
          Only transient failures are retried, with exponential backoff. Quota exhaustion and a
          missing scope are states rather than faults — retrying them would burn budget on an
          outcome that cannot change, so they fail immediately and say why.
        </Notice>
      </div>
    </>
  );
}
