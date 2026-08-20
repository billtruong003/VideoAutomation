/**
 * Publish Studio — settings, approval and the private upload.
 *
 * Two safety properties are visible on this page rather than buried:
 *
 *   1. APPROVAL IS BOUND TO CONTENT. Change the title, the schedule, the privacy or the
 *      caption choice after approving and the approval is revoked by the backend, with the
 *      specific changed fields named. The banner here is that fact surfacing.
 *
 *   2. PUBLIC PUBLISHING IS GATED. The compliance audit has not passed, so the public and
 *      scheduled options are disabled with the reason attached. A schedule can still be
 *      *prepared* and stored in the manifest — no API write is made.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, assetUrl, useQuery, type Capabilities, type ContentRow, type ManifestEnvelope } from '../api';
import { Badge, Card, Empty, ErrorState, Field, Loading, Notice, fmtDuration } from '../components/ui';

export default function PublishStudio() {
  const { id } = useParams();
  const nav = useNavigate();
  const content = useQuery<ContentRow[]>('/content');

  if (!id) {
    return (
      <>
        <div className="page-head"><div><h1>Publish Studio</h1><p className="sub">Choose an episode to prepare.</p></div></div>
        {content.loading && <Card><Loading /></Card>}
        <div className="grid c3">
          {(content.data ?? []).map((r) => (
            <Card key={r.content_id} className="tight">
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{r.selected_title ?? r.topic}</div>
              <div className="row between">
                <Badge tone={r.stateMeta.tone}>{r.stateMeta.label}</Badge>
                <button className="btn sm" onClick={() => nav(`/publish/${r.content_id}`)}>Open</button>
              </div>
            </Card>
          ))}
        </div>
      </>
    );
  }
  return <Studio id={id} />;
}

type Confirmation = {
  channel: string; contentId: string; title: string; privacy: string;
  assetHashShort: string; durationSeconds: number | null; captions: string | null;
};

/**
 * UTC instant -> the value a `datetime-local` input expects.
 *
 * A `datetime-local` input has no timezone: it reads and writes wall-clock time in the
 * browser's zone. Feeding it `iso.slice(0,16)` looks right and is wrong — the input then
 * treats a UTC wall time as local, and converting back on save shifts the instant by the
 * whole offset. A stored 09:30Z came back as 00:30Z. The dual local/UTC readout is what
 * caught it, which is the entire reason both are shown.
 */
function utcToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The inverse: local wall-clock from the input -> a UTC instant for YouTube. */
const localInputToUtc = (local: string): string | null =>
  local ? new Date(local).toISOString() : null;

function Studio({ id }: { id: string }) {
  const envQ = useQuery<ManifestEnvelope>(`/content/${id}/manifest`, [id]);
  const capsQ = useQuery<Capabilities>('/capabilities');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: string; text: string } | null>(null);
  const [confirm, setConfirm] = useState<Confirmation | null>(null);

  const [privacy, setPrivacy] = useState<'private' | 'unlisted' | 'public'>('private');
  const [publishAt, setPublishAt] = useState('');
  const [madeForKids, setMadeForKids] = useState(false);
  const [synthetic, setSynthetic] = useState<'unset' | 'yes' | 'no'>('unset');
  const [captionUpload, setCaptionUpload] = useState(false);
  const [category, setCategory] = useState('27');

  const env = envQ.data;
  const m = env?.manifest;

  useEffect(() => {
    if (!m) return;
    setPrivacy(m.youtube.privacy);
    setPublishAt(utcToLocalInput(m.youtube.publishAt));
    setMadeForKids(m.youtube.madeForKids);
    setSynthetic(m.youtube.containsSyntheticMedia === null ? 'unset' : m.youtube.containsSyntheticMedia ? 'yes' : 'no');
    setCaptionUpload(m.captions.upload);
    setCategory(m.metadata.categoryId);
  }, [m]);

  const caps = capsQ.data;
  const publicBlocked = !caps?.PUBLIC_PUBLISHING?.allowed;

  const patch = async (body: unknown) => {
    setBusy(true); setMsg(null);
    try { await api.patch(`/content/${id}/manifest`, body); envQ.reload(); }
    catch (e: any) { setMsg({ tone: 'bad', text: e?.wire?.detail ?? e?.wire?.title ?? 'Save failed' }); }
    finally { setBusy(false); }
  };

  const saveSettings = () => patch({
    youtube: {
      privacy,
      publishAt: localInputToUtc(publishAt),
      madeForKids,
      containsSyntheticMedia: synthetic === 'unset' ? null : synthetic === 'yes',
    },
    captions: { upload: captionUpload },
    metadata: { categoryId: category },
  });

  const approve = async () => {
    setBusy(true); setMsg(null);
    try {
      await api.post(`/content/${id}/approve`);
      envQ.reload();
      setMsg({ tone: 'good', text: 'Approved. This approval is bound to the exact video and metadata above.' });
    } catch (e: any) {
      setMsg({ tone: 'bad', text: (e?.wire?.detail ?? []).join?.(' · ') || e?.wire?.title || 'Approval failed' });
    } finally { setBusy(false); }
  };

  const requestUpload = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api.post<{ requiresConfirmation: boolean; confirmation?: Confirmation }>(
        `/content/${id}/upload`, { confirm: false },
      );
      if (r.requiresConfirmation && r.confirmation) setConfirm(r.confirmation);
    } catch (e: any) {
      setMsg({ tone: 'bad', text: e?.wire?.body ?? e?.wire?.title ?? 'Upload unavailable' });
    } finally { setBusy(false); }
  };

  const doUpload = async () => {
    setBusy(true);
    try {
      await api.post(`/content/${id}/upload`, { confirm: true });
      setConfirm(null); envQ.reload();
      setMsg({ tone: 'good', text: 'Upload queued. Track it in the Queue.' });
    } catch (e: any) {
      setConfirm(null);
      setMsg({ tone: 'bad', text: e?.wire?.body ?? e?.wire?.title ?? 'Upload failed' });
    } finally { setBusy(false); }
  };

  if (envQ.loading) return <Card><Loading what="Loading manifest" /></Card>;
  if (envQ.error) return <ErrorState error={envQ.error} onRetry={envQ.reload} />;
  if (!env || !m) return <Empty title="Not found" />;

  const approved = env.approvalCheck.valid;
  const invalidated = env.approvalCheck.reason === 'APPROVAL_INVALIDATED';

  return (
    <>
      <div className="page-head">
        <div>
          <p className="sub"><Link to={`/videos/${id}`}>{id}</Link></p>
          <h1>Publish Studio</h1>
        </div>
        <Badge tone={approved ? 'good' : 'neutral'}>{env.state}</Badge>
      </div>

      {msg && <div style={{ marginBottom: 14 }}><Notice tone={msg.tone}>{msg.text}</Notice></div>}

      {invalidated && (
        <div style={{ marginBottom: 14 }}>
          <Notice tone="warn" title="Approval invalidated">
            These changed after approval: <strong>{env.approvalCheck.changed.join(', ')}</strong>.
            Nothing can be uploaded until you approve again.
          </Notice>
        </div>
      )}

      {publicBlocked && (
        <div style={{ marginBottom: 14 }}>
          <Notice tone="warn" title="Public API publishing is blocked">
            {caps?.PUBLIC_PUBLISHING?.blockedReason}
            {' '}A schedule can still be prepared and saved locally — no API write is made.
          </Notice>
        </div>
      )}

      <div className="grid c2">
        {/* -------------------------------------------------- left: preview */}
        <div className="stack">
          <Card title="Video">
            <video src={assetUrl(id, 'video')} controls preload="metadata" poster={assetUrl(id, 'still', 0)}
              style={{ width: '100%', maxHeight: 380, background: '#000', borderRadius: 8, display: 'block' }} />
            <div className="dl" style={{ marginBottom: 0 }}>
              <dt>Duration</dt><dd>{fmtDuration(m.asset.durationSeconds)}</dd>
              <dt>Asset hash</dt><dd className="mono">{m.asset.sha256.slice(7, 23)}</dd>
            </div>
          </Card>

          <Card title="Readiness">
            {env.readiness.ready
              ? <Notice tone="good">Ready to approve.</Notice>
              : (
                <>
                  {env.readiness.blockers.map((b, i) => (
                    <div key={i} className="lint-item error"><span>✗</span><span>{b}</span></div>
                  ))}
                </>
              )}
            {env.readiness.warnings.map((w, i) => (
              <div key={i} className="lint-item warn"><span>⚠</span><span>{w}</span></div>
            ))}
          </Card>

          <Card title="Manifest">
            <div className="row between" style={{ marginBottom: 8 }}>
              <span className="muted" style={{ fontSize: 12 }}>Schema v{m.schemaVersion} · validated</span>
              <a className="btn sm ghost" href={`/api/content/${id}/manifest/export`} target="_blank" rel="noreferrer">Export JSON</a>
            </div>
            <details className="raw">
              <summary>View manifest</summary>
              <pre>{JSON.stringify(m, null, 2)}</pre>
            </details>
          </Card>
        </div>

        {/* ------------------------------------------------- right: settings */}
        <div className="stack">
          <Card title="Metadata" actions={<Link to={`/metadata/${id}`} className="btn sm ghost">Edit</Link>}>
            <div className="dl" style={{ marginBottom: 0 }}>
              <dt>Title</dt><dd>{m.metadata.selectedTitle || <span className="muted">Not set</span>}</dd>
              <dt>Description</dt>
              <dd style={{ fontWeight: 400, whiteSpace: 'pre-wrap' }}>{m.metadata.description || <span className="muted">Not set</span>}</dd>
              <dt>Tags</dt><dd style={{ fontWeight: 400 }}>{m.metadata.tags.join(', ') || <span className="muted">None</span>}</dd>
            </div>
          </Card>

          <Card title="YouTube settings">
            <Field label="Visibility">
              <select className="select" value={privacy} onChange={(e) => setPrivacy(e.target.value as any)}>
                <option value="private">Private</option>
                <option value="unlisted" disabled={publicBlocked}>Unlisted {publicBlocked ? '— blocked' : ''}</option>
                <option value="public" disabled={publicBlocked}>Public {publicBlocked ? '— blocked' : ''}</option>
              </select>
            </Field>

            <Field
              label="Prepare schedule (stored locally)"
              hint={publishAt
                ? `Local: ${new Date(publishAt).toLocaleString('en-GB')} · UTC: ${new Date(publishAt).toISOString()}`
                : 'Both local and UTC are shown once set, so a timezone mistake cannot hide.'}
            >
              <input className="input" type="datetime-local" value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)} />
            </Field>

            <Field label="Category">
              <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="27">Education</option>
                <option value="28">Science &amp; Technology</option>
                <option value="24">Entertainment</option>
                <option value="26">Howto &amp; Style</option>
              </select>
            </Field>

            <Field label="Captions"
              hint="The render already has burned-in captions. This uploads the SRT as a separate YouTube caption track — a different thing.">
              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={captionUpload} disabled={!m.captions.path}
                  onChange={(e) => setCaptionUpload(e.target.checked)} />
                <span>
                  Upload English SRT as a caption track
                  {m.captions.path ? <> <Badge tone="good">SRT ready</Badge></> : <> <Badge tone="warn">No SRT linked</Badge></>}
                </span>
              </label>
            </Field>

            <Field label="Made for kids" hint="A legal declaration under COPPA. Never inferred.">
              <select className="select" value={madeForKids ? 'yes' : 'no'}
                onChange={(e) => setMadeForKids(e.target.value === 'yes')}>
                <option value="no">No — not made for kids</option>
                <option value="yes">Yes — made for kids</option>
              </select>
            </Field>

            <Field label="Altered or synthetic content"
              hint="A policy judgement about this specific content. Deliberately unset until you choose.">
              <select className="select" value={synthetic} onChange={(e) => setSynthetic(e.target.value as any)}>
                <option value="unset">— not declared —</option>
                <option value="no">No realistic synthetic content</option>
                <option value="yes">Yes — contains altered or synthetic content</option>
              </select>
            </Field>

            <button className="btn ghost" onClick={saveSettings} disabled={busy}>Save settings</button>
          </Card>

          <Card title="Approval">
            {approved ? (
              <>
                <Notice tone="good" title="Approved">
                  Bound to asset <span className="mono">{m.approval.assetHash?.slice(7, 19)}</span> and this exact metadata.
                  Changing any material field revokes it.
                </Notice>
                <div className="row" style={{ marginTop: 12 }}>
                  <button className="btn danger" disabled={busy}
                    onClick={() => api.post(`/content/${id}/revoke`).then(() => envQ.reload())}>
                    Revoke approval
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="muted" style={{ marginTop: 0, fontSize: 12.5 }}>
                  Approving authorises <strong>this exact video with this exact metadata</strong>, not a policy.
                </p>
                <button className="btn accent" onClick={approve} disabled={busy || !env.readiness.ready}>
                  Approve for upload
                </button>
              </>
            )}
          </Card>

          <Card title="Upload">
            <button className="btn" onClick={requestUpload} disabled={busy || !approved}>
              Upload private
            </button>
            <button className="btn ghost" style={{ marginLeft: 8 }} disabled title={caps?.SCHEDULED_PUBLISHING?.blockedReason ?? ''}>
              Schedule on YouTube — blocked
            </button>
            <p className="muted" style={{ fontSize: 11.5, marginBottom: 0, marginTop: 10 }}>
              Upload requires an explicit confirmation every time. There is no "don't ask again".
            </p>
          </Card>
        </div>
      </div>

      {confirm && (
        <div className="dialog-backdrop" onClick={() => setConfirm(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Confirm private upload</h2>
            <dl className="dl">
              <dt>Channel</dt><dd>{confirm.channel}</dd>
              <dt>Video</dt><dd>{confirm.contentId}</dd>
              <dt>Title</dt><dd>{confirm.title}</dd>
              <dt>Privacy</dt><dd><Badge tone="good">{confirm.privacy}</Badge></dd>
              <dt>Asset hash</dt><dd className="mono">{confirm.assetHashShort}</dd>
              <dt>Duration</dt><dd>{fmtDuration(confirm.durationSeconds)}</dd>
            </dl>
            <Notice tone="info">
              This uploads to YouTube as <strong>private</strong>. It will not be visible to anyone
              until you publish it yourself.
            </Notice>
            <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="btn accent" onClick={doUpload} disabled={busy}>Upload private</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
