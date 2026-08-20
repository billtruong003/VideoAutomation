/**
 * Analytics — channel performance from the real YouTube Analytics API.
 *
 * The rule this page exists to honour: `views` and `engagedViews` are NOT the same metric and
 * are never presented as interchangeable. Since July 2025 a Shorts view counts every start or
 * replay with no minimum watch time, while an engaged view counts only those that continued
 * past the opening seconds. The gap between them is informative, so both are always shown.
 */

import { useState } from 'react';
import { useQuery } from '../api';
import { Card, Empty, ErrorState, Kpi, Loading, Notice, fmtNum } from '../components/ui';

type Report = {
  range: string; startDate?: string; endDate?: string;
  availability: 'OK' | 'NO_DATA' | 'ERROR';
  metrics: Record<string, string> | null;
  note: string | null; error?: string;
};

const RANGES = [
  { id: '7d', label: '7 days' },
  { id: '28d', label: '28 days' },
  { id: '90d', label: '90 days' },
  { id: 'lifetime', label: 'Lifetime' },
];

const HELP: Record<string, string> = {
  views: 'Every time a Short starts or replays. No minimum watch time since July 2025.',
  engagedViews: 'Views that continued past the opening seconds. Not the same as views.',
  estimatedMinutesWatched: 'Total minutes watched.',
  averageViewDuration: 'Average seconds watched per playback.',
  averageViewPercentage: 'Average share of the video watched per playback.',
  likes: 'Positive ratings.',
  comments: 'Comments left on the video.',
  shares: 'Shares via the Share button.',
  subscribersGained: 'Subscriptions attributed to this content.',
  subscribersLost: 'Unsubscribes attributed to this content.',
};

const LABEL: Record<string, string> = {
  views: 'Views', engagedViews: 'Engaged Views', estimatedMinutesWatched: 'Minutes Watched',
  averageViewDuration: 'Avg View Duration', averageViewPercentage: 'Avg % Viewed',
  likes: 'Likes', comments: 'Comments', shares: 'Shares',
  subscribersGained: 'Subs Gained', subscribersLost: 'Subs Lost',
};

export default function Analytics() {
  const [range, setRange] = useState('28d');
  const { data, error, loading, reload } = useQuery<Report>(`/analytics/channel?range=${range}`, [range]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Analytics</h1>
          <p className="sub">YouTube Analytics API · owner reports for this channel.</p>
        </div>
        <div className="tabs" style={{ border: 'none', margin: 0 }}>
          {RANGES.map((r) => (
            <button key={r.id} className={`tab${range === r.id ? ' active' : ''}`} onClick={() => setRange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <Card><Loading what="Querying YouTube Analytics" /></Card>}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data?.availability === 'ERROR' && (
        <Notice tone="bad" title="Analytics query failed">{data.note ?? data.error}</Notice>
      )}

      {data?.availability === 'NO_DATA' && (
        <>
          <Empty title="NO ANALYTICS DATA YET">
            The query was authorised and structurally valid — YouTube simply has nothing to
            report. This channel has no published videos, so there is nothing to measure.
          </Empty>
          <div style={{ marginTop: 16 }}>
            <Notice tone="info" title="Why this is not a failure">
              The filters, date ranges and metric set all work. Figures appear here as soon as a
              video is published and viewers watch it. Nothing is fabricated in the meantime.
            </Notice>
          </div>
        </>
      )}

      {data?.availability === 'OK' && data.metrics && (
        <>
          <p className="sub" style={{ marginBottom: 14 }}>{data.startDate} → {data.endDate}</p>
          <div className="grid c4">
            {Object.entries(data.metrics).map(([k, v]) => (
              <div key={k} title={HELP[k] ?? ''}>
                <Kpi
                  label={LABEL[k] ?? k}
                  value={k.startsWith('average') ? Number(v).toFixed(1) : fmtNum(Number(v))}
                  note={HELP[k]}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18 }}>
            <Notice tone="info" title="Views and Engaged Views are different metrics">
              A view counts every start or replay. An engaged view counts only playbacks that
              continued past the opening seconds. They are never interchangeable here.
            </Notice>
          </div>
        </>
      )}
    </>
  );
}
