/**
 * Metadata Studio — where copy is written, checked and chosen.
 *
 * Every judgement shown here was computed by the backend: scores, lint issues, grammar
 * family, novelty. The page renders them. Duplicating any of that logic in React would give
 * two answers to the same question and guarantee they eventually disagree.
 *
 * The linter is ADVISORY. Errors are shown loudly and never block editing or selection — a
 * tool that refuses a line the creator wants is a tool that gets switched off.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useQuery, type ContentRow, type LintResult, type ManifestEnvelope } from '../api';
import { Badge, Card, Empty, ErrorState, Field, Loading, Notice } from '../components/ui';

type Provider = { id: string; label: string; configured: boolean; note: string };
type GenResult = {
  provider: Provider;
  brief: { coreObject: string; coreQuestion: string; actualReveal: string; payoff: string; beatCount: number };
  titles: LintResult[];
  description: string;
  descriptionLint: LintResult;
  tags: string[];
  history: string[];
};

export default function MetadataStudio() {
  const { id } = useParams();
  const nav = useNavigate();
  const content = useQuery<ContentRow[]>('/content');

  if (!id) {
    return (
      <>
        <div className="page-head"><div><h1>Metadata Studio</h1><p className="sub">Choose an episode to work on.</p></div></div>
        {content.loading && <Card><Loading /></Card>}
        <div className="grid c3">
          {(content.data ?? []).map((r) => (
            <Card key={r.content_id} className="tight">
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{r.selected_title ?? r.topic}</div>
              <div className="row between">
                <Badge tone={r.stateMeta.tone}>{r.stateMeta.label}</Badge>
                <button className="btn sm" onClick={() => nav(`/metadata/${r.content_id}`)}>Open</button>
              </div>
            </Card>
          ))}
        </div>
      </>
    );
  }
  return <Studio id={id} />;
}

function Studio({ id }: { id: string }) {
  const manifestQ = useQuery<ManifestEnvelope>(`/content/${id}/manifest`, [id]);
  const [gen, setGen] = useState<GenResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [lint, setLint] = useState<LintResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const m = manifestQ.data?.manifest;
    if (!m) return;
    setTitle(m.metadata.selectedTitle ?? '');
    setDescription(m.metadata.description ?? '');
    setTags((m.metadata.tags ?? []).join(', '));
  }, [manifestQ.data]);

  // Live lint, debounced. The backend is the only place that knows the rules.
  useEffect(() => {
    if (!title && !description) { setLint(null); return; }
    const t = setTimeout(() => {
      api.post<LintResult>(`/content/${id}/metadata/lint`, {
        title, description, tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
      }).then(setLint).catch(() => setLint(null));
    }, 320);
    return () => clearTimeout(t);
  }, [id, title, description, tags]);

  const generate = async () => {
    setGenerating(true); setErr(null);
    try { setGen(await api.post<GenResult>(`/content/${id}/metadata/generate`, {})); }
    catch (e: any) { setErr(e?.wire?.title ?? 'Generation failed'); }
    finally { setGenerating(false); }
  };

  const save = async () => {
    setSaving(true); setErr(null); setSaved(null);
    try {
      await api.patch(`/content/${id}/manifest`, {
        metadata: {
          selectedTitle: title,
          description,
          tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
        },
      });
      manifestQ.reload();
      setSaved('Draft saved.');
    } catch (e: any) { setErr(e?.wire?.detail ?? e?.wire?.title ?? 'Save failed'); }
    finally { setSaving(false); }
  };

  // Grammar-family mix across the channel's recent titles — the repetition signal.
  const familyMix = useMemo(() => {
    if (!gen) return [];
    const counts: Record<string, number> = {};
    for (const t of gen.titles) counts[t.family] = (counts[t.family] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [gen]);

  if (manifestQ.loading) return <Card><Loading what="Loading manifest" /></Card>;
  if (manifestQ.error) return <ErrorState error={manifestQ.error} onRetry={manifestQ.reload} />;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="sub"><Link to={`/videos/${id}`}>{id}</Link></p>
          <h1>Metadata Studio</h1>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={generate} disabled={generating}>
            {generating ? 'Generating…' : gen ? 'Regenerate' : 'Generate candidates'}
          </button>
          <button className="btn" onClick={save} disabled={saving || !title}>
            {saving ? 'Saving…' : 'Save draft'}
          </button>
        </div>
      </div>

      {err && <div style={{ marginBottom: 14 }}><Notice tone="bad" title="Problem">{err}</Notice></div>}
      {saved && <div style={{ marginBottom: 14 }}><Notice tone="good">{saved}</Notice></div>}

      {gen && !gen.provider.configured && (
        <div style={{ marginBottom: 16 }}>
          <Notice tone="info" title="AI generation provider not configured">{gen.provider.note}</Notice>
        </div>
      )}

      <div className="grid c2">
        {/* ------------------------------------------------ left: candidates */}
        <div className="stack">
          {gen && (
            <Card title="Editorial brief">
              <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
                Derived from this episode's own transcript and storyboard — not from the topic name.
              </p>
              <div className="dl">
                <dt>Core object</dt><dd>{gen.brief.coreObject}</dd>
                <dt>Core question</dt><dd style={{ fontWeight: 400 }}>{gen.brief.coreQuestion}</dd>
                <dt>Actual reveal</dt><dd style={{ fontWeight: 400 }}>{gen.brief.actualReveal}</dd>
                <dt>Payoff</dt><dd style={{ fontWeight: 400 }}>{gen.brief.payoff}</dd>
                <dt>Beats</dt><dd>{gen.brief.beatCount}</dd>
              </div>
            </Card>
          )}

          <Card
            title="Title candidates"
            actions={familyMix.length > 0 && (
              <div className="row" style={{ gap: 4 }}>
                {familyMix.map(([f, n]) => <Badge key={f} tone="neutral">{f} ×{n}</Badge>)}
              </div>
            )}
          >
            {!gen && (
              <Empty title="No candidates yet" mood="thinking">
                Generate candidates from the episode's transcript, storyboard and the channel's
                recent titles. You can also just type a title on the right.
              </Empty>
            )}
            {gen?.titles.map((c, i) => (
              <Candidate key={i} c={c} selected={c.title === title} onSelect={() => setTitle(c.title)} />
            ))}
          </Card>

          {gen && gen.history.length > 0 && (
            <Card title="Recent channel titles">
              <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
                Candidates are checked against these for repeated grammar, repeated openers and
                overall similarity.
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.8 }}>
                {gen.history.slice(0, 8).map((h, i) => <li key={i} className="muted">{h}</li>)}
              </ul>
            </Card>
          )}
        </div>

        {/* --------------------------------------------------- right: editor */}
        <div className="stack">
          <Card title="Editor">
            <Field label="Title" hint={`${title.length}/70 characters recommended for Shorts`}>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Write or select a title…" />
            </Field>

            <Field label="Description" hint="Shorts descriptions work best at 1–3 useful sentences.">
              <textarea className="textarea" rows={5} value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Reinforce the question and the reveal. No greetings, no SEO filler." />
            </Field>

            <Field label="Tags" hint="Comma separated. Spelling variants and the technical term — not a growth lever.">
              <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
            </Field>

            {gen && (
              <div className="row">
                <button className="btn sm ghost" onClick={() => setDescription(gen.description)}>
                  Use suggested description
                </button>
                <button className="btn sm ghost" onClick={() => setTags(gen.tags.join(', '))}>
                  Use suggested tags
                </button>
              </div>
            )}
          </Card>

          <Card title="Linter">
            {!lint && <p className="muted" style={{ margin: 0 }}>Start typing to lint.</p>}
            {lint && <LintPanel lint={lint} />}
          </Card>
        </div>
      </div>
    </>
  );
}

function Candidate({ c, selected, onSelect }: { c: LintResult; selected: boolean; onSelect: () => void }) {
  const errs = c.issues.filter((i) => i.severity === 'error');
  const warns = c.issues.filter((i) => i.severity === 'warn');
  return (
    <div className={`candidate${selected ? ' selected' : ''}${errs.length ? ' has-error' : ''}`}>
      <div className="candidate-title">{c.title}</div>

      <div className="score-row">
        <span className="score-big">{Math.round(c.score.overall * 100)}</span>
        <span className="muted" style={{ fontSize: 12 }}>Editorial Score</span>
        <Badge tone="neutral">{c.family}</Badge>
      </div>

      <div className="subscores">
        <div className="subscore"><span>Clarity</span><b>{(c.score.clarity * 10).toFixed(1)}</b></div>
        <div className="subscore"><span>Curiosity</span><b>{(c.score.curiosity * 10).toFixed(1)}</b></div>
        <div className="subscore"><span>Specificity</span><b>{(c.score.specificity * 10).toFixed(1)}</b></div>
        <div className="subscore"><span>Truthfulness</span><b>{(c.score.truthfulness * 10).toFixed(1)}</b></div>
        <div className="subscore"><span>Channel fit</span><b>{(c.score.channelFit * 10).toFixed(1)}</b></div>
        <div className="subscore"><span>Novelty</span><b>{(c.score.novelty * 10).toFixed(1)}</b></div>
      </div>

      {errs.length === 0 && warns.length === 0 && (
        <>
          <div className="lint-item ok">✓ fact supported by the episode's own material</div>
          <div className="lint-item ok">✓ no stock AI phrasing</div>
          <div className="lint-item ok">✓ distinct from recent titles</div>
        </>
      )}
      {c.issues.map((is, i) => (
        <div key={i}>
          <div className={`lint-item ${is.severity}`}>
            <span>{is.severity === 'error' ? '✗' : '⚠'}</span>
            <span><strong>{is.code.replace(/_/g, ' ').toLowerCase()}</strong> — {is.message}</span>
          </div>
          {is.hint && <div className="lint-hint">{is.hint}</div>}
        </div>
      ))}

      <button className="btn sm" style={{ marginTop: 10 }} onClick={onSelect} disabled={selected}>
        {selected ? 'Selected' : 'Select'}
      </button>
    </div>
  );
}

function LintPanel({ lint }: { lint: LintResult }) {
  return (
    <>
      <div className="row" style={{ marginBottom: 10 }}>
        <Badge tone={lint.errors ? 'bad' : lint.warnings ? 'warn' : 'good'}>
          {lint.errors ? `${lint.errors} error${lint.errors > 1 ? 's' : ''}` : lint.warnings ? `${lint.warnings} warning${lint.warnings > 1 ? 's' : ''}` : 'Clean'}
        </Badge>
        {lint.family && <Badge tone="neutral">{lint.family}</Badge>}
        <Badge tone="neutral">novelty {(lint.novelty * 100).toFixed(0)}%</Badge>
      </div>
      {lint.issues.length === 0
        ? <p className="muted" style={{ margin: 0 }}>No problems found.</p>
        : lint.issues.map((is, i) => (
          <div key={i}>
            <div className={`lint-item ${is.severity}`}>
              <span>{is.severity === 'error' ? '✗' : '⚠'}</span>
              <span><strong>{is.code.replace(/_/g, ' ').toLowerCase()}</strong> — {is.message}</span>
            </div>
            {is.hint && <div className="lint-hint">{is.hint}</div>}
          </div>
        ))}
      <p className="muted" style={{ fontSize: 11.5, marginTop: 12, marginBottom: 0 }}>
        Advisory. Nothing here blocks you — the creator has the final say.
      </p>
    </>
  );
}
