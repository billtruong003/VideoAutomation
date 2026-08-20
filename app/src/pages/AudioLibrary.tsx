/**
 * AudioLibrary.tsx — search 3,395 borrowed sounds and find the ones you can actually use.
 *
 * The packs are read-only source libraries sitting outside the repository; this page is a
 * view over the index of them, and previews stream from the original files. Nothing here
 * copies anything into git — that is a deliberate command-line act, because a 465 MB library
 * should never be one accidental click away from a commit.
 *
 * RISK LEADS THE PAGE, and it has to. The honest headline is that of 3,395 unique sounds only
 * 53 clear every filter: these are meme libraries, so most of what is in them is recognisable
 * IP, recorded music, or human speech that would fight the narration. A library UI that
 * opened on "3,395 sounds!" would be lying by omission about what is really here.
 *
 * Provenance is shown on every row and is never anything but unknown. Indexing a file records
 * where it came from; it does not establish a right to use it, and the interface should not
 * imply otherwise.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { api, useQuery } from '../api';
import { Badge, Card, Empty, ErrorState, Loading, Notice } from '../components/ui';

type Facet = { k: string; n: number };
type Facets = {
  risk: Facet[]; category: Facet[]; pack: Facet[];
  totals: { total_indexed: number; unique_sounds: number; duplicates: number; imported: number };
};
type Sound = {
  id: number; pack: string; filename: string; ext: string; bytes: number;
  duration_s: number; sample_rate: number; channels: number;
  peak_db: number; rms_db: number;
  category: string | null; subcategory: string | null; tags: string[];
  risk: 'USABLE' | 'REVIEW' | 'AVOID'; riskReasons: string[];
  provenance: string; dup_of: number | null; imported_id: string | null;
};
type SearchResult = { total: number; offset: number; items: Sound[] };
type Asset = {
  id: string; type: string; category: string | null; rel_path: string;
  duration_s: number; source_pack: string; source_filename: string;
  provenance: string; uses: number;
};

const RISK_TONE: Record<string, string> = { USABLE: 'good', REVIEW: 'warn', AVOID: 'bad' };
const RISK_NOTE: Record<string, string> = {
  USABLE: 'Abstract, short, nothing recognisable in the name.',
  REVIEW: 'Might be fine. Listen before using it.',
  AVOID: 'Recognisable IP, music, speech or profanity.',
};

export default function AudioLibrary() {
  const facets = useQuery<Facets>('/audio/facets');
  const assets = useQuery<Asset[]>('/audio/assets');

  const [q, setQ] = useState('');
  const [risk, setRisk] = useState('USABLE');
  const [category, setCategory] = useState('');
  const [pack, setPack] = useState('');
  const [includeDupes, setIncludeDupes] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [playing, setPlaying] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      const p = new URLSearchParams({ q, risk, category, pack, limit: '150' });
      if (includeDupes) p.set('includeDupes', 'true');
      api.get<SearchResult>(`/audio/search?${p}`)
        .then((r) => { setResult(r); setErr(null); })
        .catch((e: any) => setErr(e?.wire?.title ?? 'Search failed'))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, risk, category, pack, includeDupes]);

  // Only one sound plays at a time. A library where clicking three rows gives you three
  // overlapping sounds is a library nobody auditions anything in.
  const play = (id: number) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (playing === id) { setPlaying(null); return; }
    const el = new Audio(`/api/audio/${id}/preview`);
    el.volume = 0.7;
    el.onended = () => setPlaying(null);
    el.onerror = () => { setErr('That file could not be played from its pack.'); setPlaying(null); };
    audioRef.current = el;
    setPlaying(id);
    void el.play().catch(() => setPlaying(null));
  };
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const t = facets.data?.totals;
  const usable = facets.data?.risk.find((r) => r.k === 'USABLE')?.n ?? 0;

  const activeFilters = useMemo(
    () => [risk && `risk ${risk}`, category && category, pack && pack, q && `"${q}"`].filter(Boolean),
    [risk, category, pack, q]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Audio Library</h1>
          <p className="sub">
            Four downloaded packs, indexed in place. The originals are never modified and
            nothing is copied into the repository from this page.
          </p>
        </div>
      </div>

      {facets.error && <ErrorState error={facets.error} onRetry={facets.reload} />}
      {facets.loading && <Card><Loading what="Reading the index" /></Card>}

      {t && (
        <>
          <div className="grid c4" style={{ marginBottom: 16 }}>
            <Card className="tight kpi">
              <div className="kpi-label">Indexed</div>
              <div className="kpi-value">{t.total_indexed.toLocaleString()}</div>
              <div className="kpi-note">{t.duplicates} exact or near duplicates</div>
            </Card>
            <Card className="tight kpi">
              <div className="kpi-label">Unique sounds</div>
              <div className="kpi-value">{t.unique_sounds.toLocaleString()}</div>
              <div className="kpi-note">after deduplication</div>
            </Card>
            <Card className="tight kpi">
              <div className="kpi-label">Clear every filter</div>
              <div className="kpi-value" style={{ color: 'var(--teal)' }}>{usable}</div>
              <div className="kpi-note">
                {((usable / Math.max(1, t.unique_sounds)) * 100).toFixed(1)}% of the library
              </div>
            </Card>
            <Card className="tight kpi">
              <div className="kpi-label">Imported</div>
              <div className="kpi-value">{t.imported}</div>
              <div className="kpi-note">actually in the repository</div>
            </Card>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Notice tone="warn" title="Every file here has an unknown licence">
              These packs arrived without licence metadata, so nothing in this index is marked
              as cleared and nothing here can be. Risk answers a narrower question — how
              recognisable a sound is, and whether it would collide with narration. It is a
              guide for what to audition, not permission to publish.
            </Notice>
          </div>
        </>
      )}

      <div style={{ marginBottom: 16 }}>
      <Card className="tight">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ flex: '1 1 260px' }}
            placeholder="Search filenames and tags…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="input" style={{ flex: '0 0 150px' }} value={risk}
            onChange={(e) => setRisk(e.target.value)}>
            <option value="">Any risk</option>
            {facets.data?.risk.map((r) => (
              <option key={r.k} value={r.k}>{r.k} ({r.n})</option>
            ))}
          </select>
          <select className="input" style={{ flex: '0 0 170px' }} value={category}
            onChange={(e) => setCategory(e.target.value)}>
            <option value="">Any category</option>
            {facets.data?.category.map((c) => (
              <option key={c.k} value={c.k === 'UNKNOWN' ? '' : c.k} disabled={c.k === 'UNKNOWN'}>
                {c.k} ({c.n})
              </option>
            ))}
          </select>
          <select className="input" style={{ flex: '0 0 190px' }} value={pack}
            onChange={(e) => setPack(e.target.value)}>
            <option value="">Any pack</option>
            {facets.data?.pack.map((p) => <option key={p.k} value={p.k}>{p.k} ({p.n})</option>)}
          </select>
          <label className="row" style={{ gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" checked={includeDupes}
              onChange={(e) => setIncludeDupes(e.target.checked)} />
            Show duplicates
          </label>
        </div>
        {risk && (
          <p className="muted" style={{ fontSize: 12, margin: '10px 0 0' }}>
            <strong>{risk}</strong> — {RISK_NOTE[risk]}
          </p>
        )}
      </Card>
      </div>

      {err && <div style={{ marginBottom: 14 }}><Notice tone="bad">{err}</Notice></div>}

      <Card
        title="Sounds"
        actions={result && (
          <span className="muted" style={{ fontSize: 12 }}>
            {result.items.length < result.total
              ? `showing ${result.items.length} of ${result.total.toLocaleString()}`
              : `${result.total.toLocaleString()} match${result.total === 1 ? '' : 'es'}`}
            {activeFilters.length > 0 && ` · ${activeFilters.join(' · ')}`}
          </span>
        )}
      >
        {loading && <Loading what="Searching" />}
        {!loading && result && result.items.length === 0 && (
          <Empty title="Nothing matches" mood="thinking">
            Try a wider risk level — most of this library needs a listen before it can be used.
          </Empty>
        )}
        {!loading && result && result.items.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 38 }} />
                <th>Sound</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Length</th>
                <th>Risk</th>
                <th>Pack</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((s) => (
                <tr key={s.id} className={s.imported_id ? 'row-imported' : undefined}>
                  <td>
                    <button
                      className="btn sm ghost play"
                      onClick={() => play(s.id)}
                      aria-label={playing === s.id ? 'Stop' : `Play ${s.filename}`}
                    >
                      {playing === s.id ? '■' : '▶'}
                    </button>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{s.filename}</div>
                    {s.imported_id && (
                      <div style={{ fontSize: 11, color: 'var(--teal)' }}>
                        imported as {s.imported_id}
                      </div>
                    )}
                    {s.riskReasons.length > 0 && (
                      <div className="muted" style={{ fontSize: 11 }}>{s.riskReasons.join(' · ')}</div>
                    )}
                  </td>
                  <td className="muted">
                    {s.category ?? '—'}
                    {s.subcategory && <span style={{ fontSize: 11 }}> / {s.subcategory}</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>{s.duration_s?.toFixed(1)}s</td>
                  <td><Badge tone={RISK_TONE[s.risk] ?? 'neutral'}>{s.risk}</Badge></td>
                  <td className="muted" style={{ fontSize: 11.5 }}>{s.pack}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div style={{ marginTop: 16 }}>
        <Card
          title="In the repository"
          actions={<span className="muted" style={{ fontSize: 12 }}>
            imported deliberately, via tools/audio-import.mjs
          </span>}
        >
          {assets.loading && <Loading />}
          {assets.data?.length === 0 && (
            <Empty title="Nothing imported yet" mood="thinking">
              Importing is a command-line action on purpose — a 465 MB library should not be
              one click away from a commit.
            </Empty>
          )}
          {!!assets.data?.length && (
            <table className="table">
              <thead>
                <tr>
                  <th>Asset</th><th>Type</th><th style={{ textAlign: 'right' }}>Length</th>
                  <th style={{ textAlign: 'right' }}>Used</th><th>From</th><th>Provenance</th>
                </tr>
              </thead>
              <tbody>
                {assets.data.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 500 }}>{a.id}</td>
                    <td className="muted">{a.type}</td>
                    <td style={{ textAlign: 'right' }}>{a.duration_s?.toFixed(1)}s</td>
                    <td style={{ textAlign: 'right' }}>
                      {a.uses === 0
                        ? <span className="muted">unused</span>
                        : a.uses}
                    </td>
                    <td className="muted" style={{ fontSize: 11.5 }}>{a.source_pack}</td>
                    <td>
                      <Badge tone="warn">unknown licence</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
