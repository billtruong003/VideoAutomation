/**
 * Batches.tsx — the production factory: import scripts, watch each stage, review takes.
 *
 * The screen is organised around the STAGE BARRIER, because that is how the batch actually
 * behaves. Each stage is a row showing how many episodes have cleared it and a button that
 * runs that stage for the whole batch. There is deliberately no single "do everything" button:
 * a hundred scripts through six stages is hours of API work, and one opaque control hides
 * which of the six is failing.
 *
 * The API key never reaches this file. Everything ElevenLabs happens behind the localhost
 * backend; the frontend asks for health, voices and progress, and gets answers with no secret
 * in them.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, useQuery } from '../api';
import { Badge, Card, Empty, ErrorState, Field, Loading, Notice } from '../components/ui';

type KeyInfo = {
  present: boolean; source: string | null; storageMode: string | null;
  dpapiAvailable: boolean; warning: string | null;
};
type Health = {
  key: KeyInfo; connected: boolean;
  subscription?: { tier: string; status: string; characterCount: number; characterLimit: number; charactersRemaining: number; nextResetIso: string | null; concurrencyHint: number };
  models?: { modelId: string; name: string; canDoTextToSpeech: boolean }[];
  defaultVoice?: { voiceId: string; name: string; category: string; labels: Record<string, string>; verifiedLanguages: string[]; highQualityModelIds: string[] } | null;
  voiceError?: { code: string; message: string } | null;
  error?: { code: string; message: string };
};
type BatchRow = { batch_id: string; stage: string; episodes: number; excluded: number; created_at: string; voiceLock: { voiceId: string; modelId: string; voiceName: string } | null };
type Take = {
  id: number; label: string; state: string; duration_s: number | null; score: number | null;
  cache_hit: number; audio_hash: string | null; seed: number | null;
  gates: { passed: boolean; gates: { id: string; pass: boolean; detail: string | null }[] } | null;
  analysis: Record<string, number> | null;
};
type Episode = {
  episode_id: string; title: string; content: string; state: string; excluded: number;
  winning_take: string | null; selection_method: string | null; selection_reason: string | null;
  selection_score: number | null; alignment_method: string | null; issues: { code: string; severity?: string; message: string }[];
  takes: Take[];
};
type Batch = {
  batchId: string; stage: string; defaults: Record<string, unknown>;
  voiceLock: { voiceId: string; voiceName: string; modelId: string; modelWasFallback: boolean; modelReason: string } | null;
  episodes: Episode[];
  counts: { total: number; included: number; excluded: number; characters: number };
  progress: Record<string, number>;
  advance: { ok: boolean; reason?: string };
};

const STAGES = [
  { key: 'tts', label: 'TTS', action: 'tts', blurb: 'Two takes for every script.' },
  { key: 'selected', label: 'Voice review', action: 'review', blurb: 'Best delivery chosen per episode.' },
  { key: 'processed', label: 'Voice processing', action: 'process', blurb: 'The existing conditioning chain.' },
  { key: 'stt', label: 'Transcription', action: 'stt', blurb: 'Scribe hears the processed audio.' },
  { key: 'aligned', label: 'Alignment + SRT', action: 'align', blurb: 'Known words located in the audio.' },
  { key: 'srt', label: 'Subtitles validated', action: null, blurb: 'Canonical text, real timing.' },
];

export default function Batches() {
  const health = useQuery<Health>('/factory/health');
  const batches = useQuery<BatchRow[]>('/factory/batches');
  const [selected, setSelected] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Production batches</h1>
          <p className="sub">
            Scripts in, narration and subtitles out. Each stage runs for the whole batch before
            the next one starts.
          </p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setShowImport((v) => !v)}>
            {showImport ? 'Close import' : 'Import scripts'}
          </button>
        </div>
      </div>

      <ElevenLabsHealth health={health} />

      {showImport && (
        <ScriptImport onImported={(id) => { setShowImport(false); batches.reload(); setSelected(id); }} />
      )}

      {batches.loading && <Card><Loading what="Reading batches" /></Card>}
      {batches.error && <ErrorState error={batches.error} onRetry={batches.reload} />}

      {!batches.loading && (batches.data?.length ?? 0) === 0 && !showImport && (
        <Card>
          <Empty title="No batches yet" mood="thinking">
            Import a JSON batch, or add scripts one at a time. Each needs a title to identify it
            and the narration content itself.
          </Empty>
        </Card>
      )}

      {!!batches.data?.length && (
        <Card title="Batches">
          <table className="table">
            <thead>
              <tr><th>Batch</th><th>Stage</th><th style={{ textAlign: 'right' }}>Episodes</th><th>Voice</th><th /></tr>
            </thead>
            <tbody>
              {batches.data.map((b) => (
                <tr key={b.batch_id}>
                  <td style={{ fontWeight: 500 }}>{b.batch_id}</td>
                  <td><Badge tone={b.stage === 'AUDIO_READY' ? 'good' : 'neutral'}>{b.stage.replace(/_/g, ' ').toLowerCase()}</Badge></td>
                  <td style={{ textAlign: 'right' }}>
                    {b.episodes}{b.excluded ? <span className="muted"> ({b.excluded} excluded)</span> : null}
                  </td>
                  <td className="muted" style={{ fontSize: 12 }}>
                    {b.voiceLock ? `${b.voiceLock.voiceName} · ${b.voiceLock.modelId}` : 'not locked'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn sm" onClick={() => setSelected(b.batch_id)}>Open</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {selected && <BatchDetail batchId={selected} onChanged={() => batches.reload()} />}
    </>
  );
}

/* ============================================================ health */

function ElevenLabsHealth({ health }: { health: ReturnType<typeof useQuery<Health>> }) {
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState(false);
  const h = health.data;

  const save = async () => {
    setSaving(true);
    try { await api.post('/factory/key', { apiKey: key }); setKey(''); health.reload(); }
    finally { setSaving(false); }
  };

  if (health.loading) return <Card><Loading what="Checking ElevenLabs" /></Card>;

  if (!h?.key.present) {
    return (
      <div style={{ marginBottom: 16 }}>
        <Card title="ElevenLabs">
          <Notice tone="warn" title="No API key configured">
            The key is stored on this machine, encrypted with Windows DPAPI where available. It
            is never sent to this page, written to a log, or committed.
          </Notice>
          <div className="row" style={{ marginTop: 12 }}>
            <input className="input" type="password" value={key} placeholder="ElevenLabs API key"
              onChange={(e) => setKey(e.target.value)} style={{ flex: 1 }} />
            <button className="btn" onClick={save} disabled={saving || key.length < 10}>
              {saving ? 'Saving…' : 'Save key'}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const s = h.subscription;
  return (
    <div style={{ marginBottom: 16 }}>
      <Card
        title="ElevenLabs"
        actions={<Badge tone={h.connected ? 'good' : 'bad'}>{h.connected ? 'Connected' : 'Not reachable'}</Badge>}
      >
        {h.error && <Notice tone="bad" title={h.error.code}>{h.error.message}</Notice>}
        {h.key.warning && <div style={{ marginBottom: 10 }}><Notice tone="warn">{h.key.warning}</Notice></div>}

        {s && (
          <div className="grid c4" style={{ marginBottom: 12 }}>
            <div className="kpi"><div className="kpi-label">Plan</div><div className="kpi-value">{s.tier}</div><div className="kpi-note">{s.status}</div></div>
            <div className="kpi"><div className="kpi-label">Characters used</div><div className="kpi-value">{s.characterCount.toLocaleString()}</div><div className="kpi-note">of {s.characterLimit.toLocaleString()}</div></div>
            <div className="kpi"><div className="kpi-label">Remaining</div><div className="kpi-value" style={{ color: 'var(--teal)' }}>{s.charactersRemaining.toLocaleString()}</div><div className="kpi-note">resets {s.nextResetIso?.slice(0, 10) ?? '—'}</div></div>
            <div className="kpi"><div className="kpi-label">Concurrency</div><div className="kpi-value">{s.concurrencyHint}</div><div className="kpi-note">starting ceiling</div></div>
          </div>
        )}

        {h.voiceError && (
          <Notice tone="bad" title="DEFAULT VOICE UNAVAILABLE">
            {h.voiceError.message} — generation will not start with a substitute voice.
          </Notice>
        )}
        {h.defaultVoice && (
          <div className="dl">
            <dt>Default voice</dt>
            <dd>
              {h.defaultVoice.name} <Badge tone="good">Bill Finds Out default</Badge>
              <div className="muted" style={{ fontSize: 11 }}>{h.defaultVoice.voiceId}</div>
            </dd>
            <dt>Labels</dt>
            <dd style={{ fontWeight: 400 }}>
              {Object.entries(h.defaultVoice.labels ?? {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}
            </dd>
            <dt>Models</dt>
            <dd style={{ fontWeight: 400 }}>
              {(h.models ?? []).filter((m) => m.canDoTextToSpeech).map((m) => m.modelId).join(', ') || '—'}
            </dd>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ============================================================ import */

function ScriptImport({ onImported }: { onImported: (batchId: string) => void }) {
  const [mode, setMode] = useState<'json' | 'form'>('json');
  const [batchId, setBatchId] = useState('batch-002');
  const [text, setText] = useState('');
  const [rows, setRows] = useState([{ id: 'episode-001', title: '', content: '' }]);
  const [validation, setValidation] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed = useMemo(() => {
    if (mode === 'form') {
      return { schemaVersion: 1, batch: { id: batchId }, episodes: rows.filter((r) => r.title || r.content) };
    }
    try { return text.trim() ? JSON.parse(text) : null; } catch { return null; }
  }, [mode, text, rows, batchId]);

  const validate = useCallback(async () => {
    if (!parsed) { setErr('That is not valid JSON.'); setValidation(null); return; }
    setErr(null);
    try { setValidation(await api.post('/factory/validate', { input: parsed })); }
    catch (e: any) { setErr(e?.wire?.detail ?? 'Validation failed'); }
  }, [parsed]);

  useEffect(() => { const t = setTimeout(() => { if (parsed) validate(); }, 400); return () => clearTimeout(t); }, [parsed, validate]);

  const doImport = async () => {
    setBusy(true); setErr(null);
    try {
      const r: any = await api.post('/factory/batches', { batchId, input: parsed });
      onImported(r.batchId);
    } catch (e: any) { setErr(e?.wire?.detail ?? e?.wire?.title ?? 'Import failed'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <Card
        title="Import scripts"
        actions={(
          <div className="row" style={{ gap: 6 }}>
            <button className={`btn sm${mode === 'json' ? '' : ' ghost'}`} onClick={() => setMode('json')}>Paste JSON</button>
            <button className={`btn sm${mode === 'form' ? '' : ' ghost'}`} onClick={() => setMode('form')}>Add manually</button>
          </div>
        )}
      >
        <Notice tone="info" title="Only the content is spoken">
          <strong>Title</strong> identifies the episode and is never narrated.{' '}
          <strong>Content</strong> is the narration, exactly as the voice will say it. Notes,
          metadata and pronunciation hints are never spoken either.
        </Notice>

        <div style={{ marginTop: 12 }}>
          <Field label="Batch id"><input className="input" value={batchId} onChange={(e) => setBatchId(e.target.value)} /></Field>
        </div>

        {mode === 'json' ? (
          <Field label="Batch JSON" hint="An array of episodes, or an object with an episodes array. JSONL also works.">
            <textarea className="textarea" rows={12} value={text} onChange={(e) => setText(e.target.value)}
              placeholder={'{\n  "schemaVersion": 1,\n  "batch": { "id": "batch-002" },\n  "episodes": [\n    { "id": "episode-001", "title": "Why Airplane Windows Have That Tiny Hole", "content": "Look closely at an airplane window..." }\n  ]\n}'} />
          </Field>
        ) : (
          <>
            {rows.map((r, i) => (
              <Card key={i} className="tight">
                <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                  <input className="input" style={{ flex: '0 0 180px' }} value={r.id} placeholder="episode id"
                    onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, id: e.target.value } : x)))} />
                  <input className="input" style={{ flex: 1 }} value={r.title} placeholder="Title — not spoken"
                    onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                </div>
                <textarea className="textarea" rows={4} value={r.content} placeholder="Narration content — this is what the voice says"
                  onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, content: e.target.value } : x)))} />
              </Card>
            ))}
            <button className="btn sm ghost" style={{ marginTop: 8 }}
              onClick={() => setRows([...rows, { id: `episode-${String(rows.length + 1).padStart(3, '0')}`, title: '', content: '' }])}>
              + Add script
            </button>
          </>
        )}

        {err && <div style={{ marginTop: 10 }}><Notice tone="bad">{err}</Notice></div>}

        {validation && (
          <div style={{ marginTop: 12 }}>
            <div className="row" style={{ gap: 8, marginBottom: 8 }}>
              <Badge tone="neutral">{validation.summary.total} scripts</Badge>
              <Badge tone="good">{validation.summary.valid} valid</Badge>
              {validation.summary.invalid > 0 && <Badge tone="bad">{validation.summary.invalid} invalid</Badge>}
              {validation.summary.warnings > 0 && <Badge tone="warn">{validation.summary.warnings} with warnings</Badge>}
              <span className="muted" style={{ fontSize: 12 }}>
                {validation.summary.totalCharacters.toLocaleString()} characters of narration
              </span>
            </div>
            {validation.episodes.filter((e: any) => e.issues.length).slice(0, 8).map((e: any) => (
              <div key={e.index} className="lint-item warn">
                <span>{e.valid ? '⚠' : '✗'}</span>
                <span><strong>{e.id || `#${e.index + 1}`}</strong> — {e.issues.map((i: any) => i.message).join(' ')}</span>
              </div>
            ))}
            <button className="btn" style={{ marginTop: 10 }} disabled={busy || !validation.summary.valid} onClick={doImport}>
              {busy ? 'Importing…' : `Import ${validation.summary.valid} scripts`}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ======================================================== batch detail */

function BatchDetail({ batchId, onChanged }: { batchId: string; onChanged: () => void }) {
  const q = useQuery<Batch>(`/factory/batches/${batchId}`, [batchId]);
  const [pre, setPre] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const run = async (label: string, path: string, body: unknown = {}) => {
    setBusy(label); setErr(null);
    try {
      const r: any = await api.post(`/factory/batches/${batchId}/${path}`, body);
      setLog((l) => [`${label}: ${JSON.stringify(r).slice(0, 200)}`, ...l].slice(0, 8));
      q.reload(); onChanged();
    } catch (e: any) {
      setErr(`${label} failed — ${e?.wire?.detail ?? e?.wire?.title ?? 'unknown error'}`);
    } finally { setBusy(null); }
  };

  const loadPreflight = async () => {
    setBusy('preflight'); setErr(null);
    try { setPre(await api.get(`/factory/batches/${batchId}/preflight`)); }
    catch (e: any) { setErr(e?.wire?.detail ?? 'Preflight failed'); }
    finally { setBusy(null); }
  };

  if (q.loading) return <Card><Loading what="Loading batch" /></Card>;
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  const b = q.data!;

  return (
    <div style={{ marginTop: 16 }}>
      <Card
        title={`Batch ${b.batchId}`}
        actions={(
          <div className="row" style={{ gap: 6 }}>
            <Badge tone={b.stage === 'AUDIO_READY' ? 'good' : 'neutral'}>{b.stage.replace(/_/g, ' ').toLowerCase()}</Badge>
            <button className="btn sm ghost" onClick={loadPreflight} disabled={busy !== null}>Preflight</button>
            <button className="btn sm" disabled={busy !== null || !b.advance.ok} onClick={() => run('advance', 'advance')}>
              Advance stage
            </button>
          </div>
        )}
      >
        {err && <div style={{ marginBottom: 10 }}><Notice tone="bad">{err}</Notice></div>}
        {!b.advance.ok && b.advance.reason && (
          <div style={{ marginBottom: 10 }}><Notice tone="warn" title="Stage barrier">{b.advance.reason}</Notice></div>
        )}

        {pre && <PreflightPanel pre={pre} onLock={() => run('lock voice', 'lock-voice', {})} busy={busy !== null} />}

        <table className="table" style={{ marginTop: 12 }}>
          <thead><tr><th>Stage</th><th style={{ width: 220 }}>Progress</th><th style={{ textAlign: 'right' }}>Done</th><th /></tr></thead>
          <tbody>
            {STAGES.map((s) => {
              const done = b.progress[s.key] ?? 0;
              const total = b.counts.included;
              return (
                <tr key={s.key}>
                  <td><strong>{s.label}</strong><div className="muted" style={{ fontSize: 11 }}>{s.blurb}</div></td>
                  <td>
                    <div className="meter"><div className={`meter-fill ${done === total ? 'good' : 'warn'}`} style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
                  </td>
                  <td style={{ textAlign: 'right' }}>{done} / {total}</td>
                  <td style={{ textAlign: 'right' }}>
                    {s.action && (
                      <button className="btn sm ghost" disabled={busy !== null || !b.voiceLock}
                        onClick={() => run(s.label, `stage/${s.action}`)}>
                        {busy === s.label ? 'Running…' : 'Run stage'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {b.progress.takesDone > 0 && (
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            {b.progress.takesDone} of {b.progress.takesExpected} takes generated
            {b.progress.takesCached ? ` · ${b.progress.takesCached} served from cache (no new charge)` : ''}
            {b.progress.takesFailed ? ` · ${b.progress.takesFailed} failed` : ''}
          </p>
        )}

        {log.length > 0 && (
          <details style={{ marginTop: 10 }}>
            <summary className="muted" style={{ fontSize: 12, cursor: 'pointer' }}>Recent stage results</summary>
            {log.map((l, i) => <div key={i} className="muted" style={{ fontSize: 11, fontFamily: 'var(--mono)' }}>{l}</div>)}
          </details>
        )}
      </Card>

      <div style={{ marginTop: 16 }}>
        <Card title={`Episodes · ${b.counts.included}`}>
          {b.episodes.map((e) => <EpisodeRow key={e.episode_id} batchId={batchId} e={e} onChanged={() => q.reload()} />)}
        </Card>
      </div>
    </div>
  );
}

function PreflightPanel({ pre, onLock, busy }: { pre: any; onLock: () => void; busy: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Notice tone={pre.ready ? 'good' : 'warn'} title={pre.ready ? 'Ready to generate' : `Blocked: ${pre.blockers.join(', ')}`}>
        <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
          {pre.plan.episodes} episodes × {pre.plan.takesPerScript} takes ={' '}
          <strong>{pre.plan.plannedTakes} generations</strong>
          {pre.plan.alreadyCached > 0 && <> · {pre.plan.alreadyCached} already cached</>}
          <br />
          Projected characters: <strong>{pre.plan.projectedCharacters.toLocaleString()}</strong> ·
          available: {pre.account.remaining?.toLocaleString() ?? '—'}
          {!pre.credit.sufficient && <> · <strong>short by {pre.credit.shortfall.toLocaleString()}</strong></>}
          <br />
          Model: <strong>{pre.model.chosen ?? 'none'}</strong>
          {pre.model.isFallback && <Badge tone="warn"> fallback</Badge>} — {pre.model.reason}
          {pre.voice && <><br />Voice: <strong>{pre.voice.name}</strong> ({pre.voice.voiceId}){pre.voice.isChannelDefault && <Badge tone="good"> channel default</Badge>}</>}
        </div>
      </Notice>
      {pre.ready && (
        <button className="btn" style={{ marginTop: 8 }} onClick={onLock} disabled={busy}>
          Lock voice and start TTS stage
        </button>
      )}
    </div>
  );
}

/* =========================================================== episode */

function EpisodeRow({ batchId, e, onChanged }: { batchId: string; e: Episode; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);

  const play = (takeId: number) => {
    const el = new Audio(`/api/factory/takes/${takeId}/audio`);
    el.onended = () => setPlaying(null);
    setPlaying(takeId);
    void el.play().catch(() => setPlaying(null));
  };

  const override = async (label: string) => {
    await api.post(`/factory/batches/${batchId}/override`, { episodeId: e.episode_id, take: label });
    onChanged();
  };

  const tone = e.excluded ? 'neutral'
    : e.state.includes('REGEN') || e.state.includes('REVIEW') || e.state === 'FAILED' ? 'bad'
      : e.state === 'SRT_VALIDATED' || e.state === 'AUDIO_READY' ? 'good' : 'neutral';

  return (
    <div className="variant">
      <div className="row between" style={{ cursor: 'pointer' }} onClick={() => setOpen((v) => !v)}>
        <div>
          <strong style={{ fontSize: 13 }}>{e.title}</strong>
          <div className="muted" style={{ fontSize: 11 }}>
            {e.episode_id} · {e.content.length} characters
            {e.winning_take && <> · winner <strong>take {e.winning_take}</strong> ({e.selection_method?.toLowerCase()})</>}
          </div>
        </div>
        <Badge tone={tone}>{e.state.replace(/_/g, ' ').toLowerCase()}</Badge>
      </div>

      {open && (
        <div style={{ marginTop: 10 }}>
          {/* Narration is shown verbatim, and labelled, so it is obvious what will be spoken. */}
          <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>NARRATION (this is what is spoken)</div>
          <div className="variant-text">{e.content}</div>

          {e.issues.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {e.issues.map((i, k) => (
                <div key={k} className={`lint-item ${i.severity === 'warn' ? 'warn' : 'error'}`}>
                  <span>{i.severity === 'warn' ? '⚠' : '✗'}</span><span>{i.message}</span>
                </div>
              ))}
            </div>
          )}

          {e.takes.length > 0 && (
            <table className="table tight" style={{ marginTop: 10 }}>
              <thead><tr><th>Take</th><th>Gates</th><th style={{ textAlign: 'right' }}>Score</th><th style={{ textAlign: 'right' }}>Length</th><th /></tr></thead>
              <tbody>
                {e.takes.map((t) => (
                  <tr key={t.id} className={t.label === e.winning_take ? 'row-imported' : undefined}>
                    <td>
                      <strong>{t.label}</strong>
                      {t.cache_hit ? <Badge tone="neutral">cached</Badge> : null}
                    </td>
                    <td>
                      {t.gates
                        ? t.gates.passed
                          ? <Badge tone="good">all passed</Badge>
                          : <Badge tone="bad">{t.gates.gates.filter((g) => !g.pass).map((g) => g.id.replace(/_/g, ' ').toLowerCase()).join(', ')}</Badge>
                        : <span className="muted">not measured</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>{t.score?.toFixed(1) ?? '—'}</td>
                    <td style={{ textAlign: 'right' }}>{t.duration_s?.toFixed(1) ?? '—'}s</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn sm ghost play" onClick={() => play(t.id)}>{playing === t.id ? '■' : '▶'}</button>
                      <button className="btn sm ghost" onClick={() => override(t.label)}
                        disabled={t.label === e.winning_take}>Select</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {e.selection_reason && (
            <p className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
              {e.selection_reason}
              <br />
              {/* Stated plainly, every time. Nothing here listened to the audio. */}
              <em>Scores come from waveform measurement. No audio was listened to — play both takes above to judge the performance.</em>
            </p>
          )}
          {e.alignment_method && (
            <p className="muted" style={{ fontSize: 11.5 }}>Subtitle timing: {e.alignment_method.replace(/_/g, ' ').toLowerCase()}</p>
          )}
        </div>
      )}
    </div>
  );
}
