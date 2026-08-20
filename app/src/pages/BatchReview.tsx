/**
 * BatchReview.tsx — the ten titles as a feed, not as ten separate decisions.
 *
 * This screen exists because per-episode review cannot show the failure that actually matters
 * when a launch batch goes out together. Every title can be individually strong while the set
 * reads as one template applied ten times, and nobody notices until it is published.
 *
 * So repetition is what is foregrounded: how the grammar families are distributed, which
 * opening word repeats, which distinctive nouns recur, and which pairs are closest. The
 * per-episode scores are here too, but they are the thing you check second.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, type BatchReview as Review } from '../api';
import { Badge, Card, Empty, ErrorState, Loading, Notice } from '../components/ui';

const scoreTone = (n: number | null) =>
  n == null ? 'neutral' : n >= 85 ? 'good' : n >= 75 ? 'warn' : 'bad';

export default function BatchReviewPage() {
  const q = useQuery<Review>('/batch/review');

  const health = q.data?.health ?? null;
  const picks = q.data?.picks ?? [];

  /*
   * Highlight a family or opening only when it is genuinely concentrated. Colouring every
   * repeat would light up the whole table -- two of ten sharing a grammar is fine and
   * expected, four is the thing worth looking at.
   */
  const overused = useMemo(() => {
    const fam = new Set<string>();
    const open = new Set<string>();
    if (health) {
      for (const [f, n] of health.familyDistribution) if (n >= 3) fam.add(f);
      for (const [o, n] of health.openingDistribution) if (n >= 3) open.add(o);
    }
    return { fam, open };
  }, [health]);

  if (q.loading) return <Card><Loading what="Reading the batch" /></Card>;
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Batch Review</h1>
          <p className="sub">
            All ten Shorts together. Individually strong titles can still make a repetitive
            feed, and that is only visible here.
          </p>
        </div>
      </div>

      {health && (
        <>
          <div className="grid c4" style={{ marginBottom: 16 }}>
            <Card className="tight kpi">
              <div className="kpi-label">Average score</div>
              <div className="kpi-value">{health.averageScore}</div>
              <div className="kpi-note">min {health.minScore} · max {health.maxScore}</div>
            </Card>
            <Card className="tight kpi">
              <div className="kpi-label">Grammar families</div>
              <div className="kpi-value" style={{ color: health.familyDiversity >= 5 ? 'var(--teal)' : 'var(--coral)' }}>
                {health.familyDiversity}
              </div>
              <div className="kpi-note">across {health.count} titles</div>
            </Card>
            <Card className="tight kpi">
              <div className="kpi-label">Opens with "Why"</div>
              <div className="kpi-value">{health.whyCount}</div>
              <div className="kpi-note">the attractor to ration</div>
            </Card>
            <Card className="tight kpi">
              <div className="kpi-label">Uses "tiny"</div>
              <div className="kpi-value">{health.tinyCount}</div>
              <div className="kpi-note">avg title {health.averageTitleLength} chars</div>
            </Card>
          </div>

          {(health.spoilerWarnings.length > 0 || health.aiStyleWarnings.length > 0) && (
            <div style={{ marginBottom: 16 }}>
              <Notice tone="warn" title="Worth a second look">
                {health.spoilerWarnings.length > 0 && (
                  <div>Spoiler penalty applied: {health.spoilerWarnings.map((s) => s.contentId).join(', ')}</div>
                )}
                {health.aiStyleWarnings.length > 0 && (
                  <div>Generated-style penalty applied: {health.aiStyleWarnings.map((s) => s.contentId).join(', ')}</div>
                )}
              </Notice>
            </div>
          )}
        </>
      )}

      <Card title="The feed">
        {picks.length === 0 && <Empty title="Nothing generated yet" mood="thinking">Run the finalise step.</Empty>}
        {picks.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 28 }}>#</th>
                <th>Title</th>
                <th>Family</th>
                <th style={{ textAlign: 'right' }}>Score</th>
                <th style={{ textAlign: 'right' }}>Desc</th>
                <th style={{ textAlign: 'right' }}>Tags</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {picks.map((p) => {
                const opening = (p.title ?? '').split(/\s+/)[0]?.toLowerCase() ?? '';
                return (
                  <tr key={p.contentId}>
                    <td className="muted">{p.episodeNumber}</td>
                    <td>
                      <Link to={`/metadata/${p.contentId}`} style={{ fontWeight: 500 }}>
                        {/* The opening word is marked inline, where the repetition is legible. */}
                        <span className={overused.open.has(opening) ? 'repeat-mark' : undefined}>
                          {(p.title ?? '').split(/\s+/)[0]}
                        </span>{' '}
                        {(p.title ?? '').split(/\s+/).slice(1).join(' ')}
                      </Link>
                      <div className="muted" style={{ fontSize: 11 }}>{p.contentId}</div>
                      {p.penalties.length > 0 && (
                        <div className="muted" style={{ fontSize: 11 }}>
                          {p.penalties.map((x) => `${x.label} −${x.points}`).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td>
                      <Badge tone={overused.fam.has(p.family ?? '') ? 'warn' : 'neutral'}>
                        {(p.family ?? '—').replace(/_/g, ' ').toLowerCase()}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Badge tone={scoreTone(p.score)}>{p.score ?? '—'}</Badge>
                    </td>
                    <td style={{ textAlign: 'right' }} className={p.descriptionChars > 250 ? 'over' : undefined}>
                      {p.descriptionChars}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {p.tagCount}
                      <span className="muted" style={{ fontSize: 11 }}> / {p.tagBudget}ch</span>
                    </td>
                    <td>
                      <Badge tone={p.state === 'METADATA_LOCKED' ? 'good' : 'neutral'}>
                        {p.state.replace(/_/g, ' ').toLowerCase()}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {health && (
        <div className="grid c2" style={{ marginTop: 16 }}>
          <Card title="Distribution">
            <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
              No family should hold more than about four of ten, and no opening word more than
              three. Both are marked in the table above when they do.
            </p>
            <div className="dl">
              <dt>Grammar</dt>
              <dd style={{ fontWeight: 400 }}>
                {health.familyDistribution.map(([f, n]) => `${f.replace(/_/g, ' ').toLowerCase()} ×${n}`).join(', ')}
              </dd>
              <dt>Openings</dt>
              <dd style={{ fontWeight: 400 }}>
                {health.openingDistribution.map(([o, n]) => `${o} ×${n}`).join(', ')}
              </dd>
              <dt>Repeated nouns</dt>
              <dd style={{ fontWeight: 400 }}>
                {health.repeatedKeywords.length
                  ? health.repeatedKeywords.map(([k, n]) => `${k} ×${n}`).join(', ')
                  : 'none'}
              </dd>
            </div>
          </Card>

          <Card title="Closest pairs">
            <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
              Character-trigram similarity. Anything above roughly 0.45 starts to read as the
              same title twice.
            </p>
            <table className="table tight">
              <tbody>
                {health.mostSimilarPairs.map((pair, i) => (
                  <tr key={i}>
                    <td>{pair.a}</td>
                    <td>{pair.b}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Badge tone={pair.similarity > 0.45 ? 'bad' : pair.similarity > 0.3 ? 'warn' : 'good'}>
                        {pair.similarity.toFixed(2)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </>
  );
}
