/**
 * ui.tsx — the shared primitives every page uses.
 *
 * Small, dumb components. All of them render results the backend already computed — none
 * recreates a business rule. `Badge` takes a tone the domain layer chose; `ErrorState`
 * renders the normalised error envelope rather than deciding what an error means.
 */

import type { ReactNode } from 'react';
import type { WireError } from '../api';

export function Badge({ tone = 'neutral', children, title }: { tone?: string; children: ReactNode; title?: string }) {
  return <span className={`badge ${tone}`} title={title}>{children}</span>;
}

export function Card({ title, children, actions, className = '' }: {
  title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="row between" style={{ marginBottom: 12 }}>
          {title ? <h2 style={{ margin: 0 }}>{title}</h2> : <span />}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Kpi({ label, value, note, muted }: {
  label: string; value: ReactNode; note?: ReactNode; muted?: boolean;
}) {
  return (
    <div className="card tight">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value${muted ? ' muted' : ''}`}>{value}</div>
      {note && <div className="kpi-note">{note}</div>}
    </div>
  );
}

export function Loading({ what = 'Loading' }: { what?: string }) {
  return <div className="loading"><span className="spinner" /> {what}…</div>;
}

/**
 * Bill, drawn with the canonical identity anchors only: rounded-square head, silver mop,
 * black rectangular glasses. Used at small sizes in empty states, never as page decoration.
 */
export function BillMark({ size = 74, mood = 'curious' }: { size?: number; mood?: 'curious' | 'thinking' }) {
  return (
    <svg className="bill" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect x="18" y="20" width="64" height="58" rx="16" fill="#F6DCBE" stroke="#23201D" strokeWidth="4" />
      <path d="M16 40 Q18 16 50 16 Q82 16 84 40 Q78 30 68 34 Q62 24 50 26 Q38 24 32 34 Q22 30 16 40 Z"
        fill="#C9C6C2" stroke="#23201D" strokeWidth="4" strokeLinejoin="round" />
      <rect x="24" y="44" width="22" height="17" rx="4" fill="none" stroke="#23201D" strokeWidth="4" />
      <rect x="54" y="44" width="22" height="17" rx="4" fill="none" stroke="#23201D" strokeWidth="4" />
      <line x1="46" y1="52" x2="54" y2="52" stroke="#23201D" strokeWidth="4" />
      <circle cx="35" cy="52" r="3" fill="#23201D" />
      <circle cx="65" cy="52" r="3" fill="#23201D" />
      {mood === 'curious'
        ? <ellipse cx="50" cy="69" rx="3.5" ry="4.5" fill="#23201D" />
        : <path d="M44 70 Q50 66 56 70" fill="none" stroke="#23201D" strokeWidth="3.5" strokeLinecap="round" />}
    </svg>
  );
}

export function Empty({ title, children, mood }: { title: string; children?: ReactNode; mood?: 'curious' | 'thinking' }) {
  return (
    <div className="empty">
      <BillMark mood={mood} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

/**
 * Normalised error rendering.
 *
 * The user reads a title and a sentence they can act on. `GaxiosError: invalid_grant` and any
 * stack trace live behind the disclosure, for whoever is actually debugging.
 */
export function ErrorState({ error, onRetry }: { error: WireError; onRetry?: () => void }) {
  return (
    <div className="notice bad" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div>
        <strong>{error.title}</strong>
        {error.body}
      </div>
      {(onRetry || error.action) && (
        <div className="row" style={{ marginTop: 10 }}>
          {onRetry && <button className="btn sm ghost" onClick={onRetry}>Retry</button>}
        </div>
      )}
      {error.detail && (
        <details className="raw">
          <summary>Technical detail</summary>
          <pre>{error.code}{'\n\n'}{error.detail}</pre>
        </details>
      )}
    </div>
  );
}

export function Notice({ tone = 'info', title, children }: { tone?: string; title?: string; children: ReactNode }) {
  return (
    <div className={`notice ${tone}`}>
      <div>
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export const fmtDuration = (s: number | null | undefined) =>
  s == null ? '—' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export const fmtBytes = (b: number | null | undefined) =>
  b == null ? '—' : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1e3).toFixed(0)} KB`;

export const fmtNum = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('en-US');

export const fmtDate = (s: string | null | undefined) =>
  !s ? '—' : new Date(s).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
