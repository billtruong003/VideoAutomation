/**
 * RetentionChart — YouTube's normalised curve with our own production beats overlaid.
 *
 * The whole point of the system, rendered.
 *
 * Two rules it obeys absolutely:
 *
 *   1. It NEVER draws a curve that does not exist. With no retention data it draws the
 *      production timeline alone and says so. A plausible-looking fake curve would be worse
 *      than an empty state, because it would be acted on.
 *
 *   2. It never alters YouTube's values. The beats are a separate overlay layer drawn on top;
 *      nothing is smoothed, normalised or "corrected".
 */

import { Badge, Empty, Notice } from './ui';

type Beat = { scene: string; beat_index: number; t_seconds: number; ratio: number; label: string | null; action: string };
type Point = { elapsedRatio: number; audienceWatchRatio: number; relativeRetentionPerformance: number };

type Props = {
  data: {
    contentId: string; videoId: string | null;
    availability: 'OK' | 'NO_DATA' | 'NOT_PUBLISHED' | 'ERROR';
    curve: Point[]; beats: Beat[]; note?: string | null;
  } | null;
};

const W = 900;
const H = 260;
const PAD = { l: 44, r: 16, t: 16, b: 34 };

export default function RetentionChart({ data }: Props) {
  if (!data) return null;
  const { curve, beats, availability } = data;
  const hasCurve = availability === 'OK' && curve.length > 0;

  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const x = (r: number) => PAD.l + r * plotW;
  const y = (v: number) => PAD.t + plotH - Math.min(1.2, v) / 1.2 * plotH;

  const path = hasCurve
    ? curve.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.elapsedRatio).toFixed(1)} ${y(p.audienceWatchRatio).toFixed(1)}`).join(' ')
    : '';

  /**
   * Label only where the beat TYPE changes.
   *
   * Labelling every labelled beat produced "HOOK HOOK HOOK MECHANISM MECHANISM MECHANISM…"
   * stacked on top of each other — unreadable, and it buried the thing worth seeing. What
   * matters on a retention chart is where one kind of beat gives way to another, so a label
   * is drawn at the START of each run and suppressed for the rest of it. Adjacent labels are
   * additionally spaced apart so two quick transitions cannot collide.
   */
  const labelled = beats.reduce<Beat[]>((acc, b) => {
    if (!b.label) return acc;
    const prev = acc[acc.length - 1];
    if (prev && prev.label === b.label) return acc;
    if (prev && b.ratio - prev.ratio < 0.06) return acc;
    acc.push(b);
    return acc;
  }, []);

  return (
    <div className="stack">
      {!hasCurve && (
        <Notice tone="info" title={availability === 'NOT_PUBLISHED' ? 'Not published yet' : 'No retention data yet'}>
          {data.note ?? 'Retention becomes available once this video is published and accumulates watch data.'}
          {' '}The production timeline below is ours and is shown regardless.
        </Notice>
      )}

      <div className="card">
        <div className="row between" style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Audience retention</h2>
          <div className="row">
            <Badge tone={hasCurve ? 'good' : 'neutral'}>
              {hasCurve ? `${curve.length} points` : 'no curve'}
            </Badge>
            <Badge tone="info">{beats.length} production beats</Badge>
          </div>
        </div>

        {beats.length === 0 && !hasCurve ? (
          <Empty title="Nothing to plot" mood="thinking">
            No storyboard beats were indexed for this content.
          </Empty>
        ) : (
          <div className="retention-wrap" style={{ overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 620, display: 'block' }}>
              {/* grid */}
              {[0, 0.25, 0.5, 0.75, 1].map((g) => (
                <g key={g}>
                  <line x1={PAD.l} x2={W - PAD.r} y1={y(g)} y2={y(g)} stroke="#E2DBCA" strokeWidth="1" />
                  <text x={PAD.l - 8} y={y(g) + 4} textAnchor="end" fontSize="10" fill="#857D70">
                    {(g * 100).toFixed(0)}%
                  </text>
                </g>
              ))}

              {/* beat markers — the production overlay, drawn under the curve */}
              {beats.map((b) => (
                <line
                  key={b.beat_index}
                  x1={x(b.ratio)} x2={x(b.ratio)} y1={PAD.t} y2={PAD.t + plotH}
                  stroke={b.label ? '#7B5BA6' : '#C9C2B4'}
                  strokeWidth="1"
                  strokeDasharray={b.label ? '4 3' : '2 4'}
                  opacity={b.label ? 0.6 : 0.35}
                >
                  <title>{`${b.t_seconds.toFixed(1)}s · ${b.label ?? b.scene}\n${b.action}`}</title>
                </line>
              ))}

              {/* the curve, exactly as YouTube reported it */}
              {hasCurve && (
                <>
                  <path d={`${path} L ${x(1)} ${PAD.t + plotH} L ${PAD.l} ${PAD.t + plotH} Z`} fill="#F2B33D" opacity="0.16" />
                  <path d={path} fill="none" stroke="#23201D" strokeWidth="2.2" strokeLinejoin="round" />
                </>
              )}

              {/* x axis */}
              <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + plotH} y2={PAD.t + plotH} stroke="#23201D" strokeWidth="1.5" />
              {[0, 0.25, 0.5, 0.75, 1].map((g) => (
                <text key={g} x={x(g)} y={H - 14} textAnchor="middle" fontSize="10" fill="#857D70">
                  {(g * 100).toFixed(0)}%
                </text>
              ))}

              {/* labelled beats get text; unlabelled ones stay as ticks */}
              {labelled.map((b, i) => (
                <text
                  key={b.beat_index}
                  x={x(b.ratio)} y={PAD.t + 10 + (i % 3) * 11}
                  textAnchor="middle" fontSize="9" fill="#7B5BA6" fontWeight="600"
                >
                  {b.label}
                </text>
              ))}
            </svg>
          </div>
        )}

        <p className="muted" style={{ fontSize: 11.5, marginBottom: 0 }}>
          Dashed violet lines are our storyboard beats, positioned by <span className="mono">t ÷ duration</span> so they
          align with YouTube's <span className="mono">elapsedVideoTimeRatio</span>. YouTube's values are never modified.
        </p>
      </div>

      {beats.length > 0 && (
        <div className="card">
          <h2>Production timeline</h2>
          <table className="table">
            <thead>
              <tr><th style={{ width: 60 }}>At</th><th style={{ width: 62 }}>Ratio</th><th style={{ width: 130 }}>Beat</th><th>Action</th></tr>
            </thead>
            <tbody>
              {beats.map((b) => (
                <tr key={b.beat_index}>
                  <td className="mono muted">{b.t_seconds.toFixed(1)}s</td>
                  <td>{(b.ratio * 100).toFixed(0)}%</td>
                  <td>{b.label ? <Badge tone="info">{b.label}</Badge> : <span className="muted">{b.scene}</span>}</td>
                  <td style={{ fontSize: 12 }}>{b.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
