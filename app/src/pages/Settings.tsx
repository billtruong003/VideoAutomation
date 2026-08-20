/**
 * Settings — configuration and system locations.
 *
 * Read-mostly in V1. It shows where things are and what is configured, because the most
 * common question a local tool has to answer is "where did it put my data?".
 *
 * No token, no client secret, no credential contents. The credential PATH is shown because
 * knowing which file is in use is operationally necessary; its contents never are.
 */

import { useQuery, type Capabilities } from '../api';
import { Badge, Card, ErrorState, Loading, Notice } from '../components/ui';

type Settings = {
  google: { credentialPath: string | null; credentialSource: string | null; clientType: string | null; projectId: string | null; connected: boolean; scopes: string[] };
  content: { productionRoot: string; defaultLanguage: string; timezone: string };
  youtubeDefaults: { categoryId: string; privacy: string; captionLanguage: string };
  metadata: { provider: { id: string; label: string; configured: boolean; note: string }; candidateCount: number; historyWindow: number };
  system: { stateDir: string; logFile: string; version: string };
  capabilities: Capabilities;
};

export default function Settings() {
  const { data, error, loading, reload } = useQuery<Settings>('/settings');
  if (loading) return <Card><Loading what="Loading settings" /></Card>;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const d = data!;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="sub">Configuration and where this application keeps its data.</p>
        </div>
      </div>

      <div className="stack">
        <Card title="Google">
          <div className="dl">
            <dt>Connection</dt>
            <dd><Badge tone={d.google.connected ? 'good' : 'warn'}>{d.google.connected ? 'Connected' : 'Not connected'}</Badge></dd>
            <dt>Client type</dt><dd>{d.google.clientType ?? '—'}</dd>
            <dt>Cloud project</dt><dd className="mono">{d.google.projectId ?? '—'}</dd>
            <dt>Resolved via</dt><dd>{d.google.credentialSource ?? '—'}</dd>
          </div>
          <h3>Credential file</h3>
          <div className="path">{d.google.credentialPath ?? 'Not found'}</div>
          <Notice tone="info" title="Never in the repository">
            The OAuth client is read from an external path supplied by configuration. Its
            contents are never copied into the working tree, logged, or sent to this page.
          </Notice>
          <h3 style={{ marginTop: 14 }}>Granted scopes</h3>
          {d.google.scopes.length === 0 ? <p className="muted">None.</p> : (
            <ul className="mono" style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
              {d.google.scopes.map((s) => <li key={s} style={{ wordBreak: 'break-all' }}>{s.replace('https://www.googleapis.com/auth/', '')}</li>)}
            </ul>
          )}
        </Card>

        <div className="grid c2">
          <Card title="Content">
            <div className="dl">
              <dt>Default language</dt><dd>{d.content.defaultLanguage}</dd>
              <dt>Timezone</dt><dd>{d.content.timezone}</dd>
            </div>
            <h3>Production root</h3>
            <div className="path">{d.content.productionRoot}</div>
            <p className="muted" style={{ fontSize: 12 }}>
              Content is discovered from <span className="mono">data/batch-*.json</span>,{' '}
              <span className="mono">episodes/</span>, <span className="mono">out/</span> and{' '}
              <span className="mono">qa/</span>. Rescanning is idempotent — it updates rows in place.
            </p>
          </Card>

          <Card title="YouTube defaults">
            <div className="dl">
              <dt>Category</dt><dd>{d.youtubeDefaults.categoryId} (Education)</dd>
              <dt>Default privacy</dt><dd><Badge tone="good">{d.youtubeDefaults.privacy}</Badge></dd>
              <dt>Caption language</dt><dd>{d.youtubeDefaults.captionLanguage}</dd>
            </div>
            <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
              Made-for-kids and synthetic-content declarations are deliberately not defaulted —
              both are explicit declarations and are chosen per video.
            </p>
          </Card>
        </div>

        <Card title="Metadata">
          <div className="dl">
            <dt>Provider</dt>
            <dd>
              {d.metadata.provider.label}{' '}
              <Badge tone={d.metadata.provider.configured ? 'good' : 'warn'}>
                {d.metadata.provider.configured ? 'Configured' : 'Not configured'}
              </Badge>
            </dd>
            <dt>Candidates</dt><dd>{d.metadata.candidateCount}</dd>
            <dt>History window</dt><dd>{d.metadata.historyWindow} recent titles</dd>
          </div>
          <Notice tone="info">{d.metadata.provider.note}</Notice>
        </Card>

        <Card title="System">
          <div className="dl">
            <dt>Version</dt><dd className="mono">{d.system.version}</dd>
          </div>
          <h3>State directory (database, tokens, logs)</h3>
          <div className="path">{d.system.stateDir}</div>
          <h3 style={{ marginTop: 12 }}>Log file</h3>
          <div className="path">{d.system.logFile}</div>
          <Notice tone="good" title="Outside the repository">
            Operational state lives in the user application-data folder, so a database, a log or
            a token can never be committed.
          </Notice>
        </Card>
      </div>
    </>
  );
}
