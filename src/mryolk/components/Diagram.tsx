/**
 * Diagram.tsx — the economics, drawn.
 *
 * These are the components stock footage cannot supply. There is no photograph of "a bank
 * creating a deposit by lending", and searching for an infographic of one and pasting it in
 * would import somebody else's visual language into the middle of this film. So the mechanism
 * gets drawn here, in the same black-on-white hand as the character.
 *
 * The governing idea is that a diagram must EVOLVE, not appear. A static balance sheet held
 * for eight seconds is a slide; the same balance sheet where the asset lands, then the
 * liability lands, then the two are bracketed together, is an explanation. So every component
 * takes a `delay` and reveals in a deliberate order, and the order matches the sentence.
 *
 * Money is represented by a TOKEN that physically travels between nodes. Arrows say a
 * relationship exists; a token moving along the arrow says which way the value went, and that
 * is the single most common thing an explainer gets wrong.
 */

import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT } from '../theme';
import { DrawPath, seeded } from './Motion';

export type Pt = { x: number; y: number };

/* ------------------------------------------------------------------ nodes */

/**
 * A labelled box in a flow diagram — HOUSEHOLD, BANK, GOVERNMENT.
 *
 * Deliberately plain. The nodes are the grammar of the diagram; the tokens moving between
 * them are the sentence, and a node with its own decoration steals attention from the motion
 * that carries the meaning.
 */
export const Node: React.FC<{
  at: Pt; label: string; sub?: string; width?: number; height?: number;
  tone?: string; delay?: number; fill?: string; size?: number;
}> = ({ at, label, sub, width = 260, height = 108, tone = C.ink, delay = 0, fill = C.paper, size = 30 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 13, mass: 0.6 }, durationInFrames: 20 });
  // Diagram labels are written for meaning, not for length; the box shrinks the type to fit
  // rather than letting "LENDERS DEMAND HIGHER RATES" hang outside its own border.
  const room = width - 22;
  const est = label.length * (size * 0.62);
  const shown = est > room ? Math.max(13, size * (room / est)) : size;
  return (
    <div style={{
      position: 'absolute',
      left: at.x - width / 2,
      top: at.y - height / 2,
      width,
      height,
      background: fill,
      border: `4px solid ${tone}`,
      borderRadius: 16,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONT.sans,
      fontWeight: 800,
      fontSize: shown,
      color: tone,
      letterSpacing: 0.6,
      textAlign: 'center',
      transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})`,
      opacity: interpolate(s, [0, 0.35], [0, 1], { extrapolateRight: 'clamp' }),
      boxSizing: 'border-box',
      padding: '0 10px',
    }}
    >
      <div>{label}</div>
      {sub && <div style={{ fontSize: shown * 0.58, fontWeight: 700, color: C.inkSoft, marginTop: 4 }}>{sub}</div>}
    </div>
  );
};

/* ----------------------------------------------------------------- arrows */

/** Quadratic control point offset perpendicular to a→b, so arrows can bow apart. */
const control = (a: Pt, b: Pt, bow: number): Pt => {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: mx + (-dy / len) * bow, y: my + (dx / len) * bow };
};

export const arrowPath = (a: Pt, b: Pt, bow = 0): string => {
  const c = control(a, b, bow);
  return `M ${a.x} ${a.y} Q ${c.x} ${c.y} ${b.x} ${b.y}`;
};

/** Point and tangent at parameter t along the same quadratic, for placing a token on it. */
export const alongArrow = (a: Pt, b: Pt, bow: number, t: number): Pt => {
  const c = control(a, b, bow);
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
};

export const Arrow: React.FC<{
  from: Pt; to: Pt; bow?: number; delay?: number; frames?: number;
  color?: string; width?: number; dashed?: boolean; label?: string; head?: boolean;
}> = ({
  from, to, bow = 0, delay = 0, frames = 20, color = C.ink, width = 6, dashed = false, label, head = true,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delay, [0, frames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tip = alongArrow(from, to, bow, 0.999);
  const back = alongArrow(from, to, bow, 0.955);
  const ang = Math.atan2(tip.y - back.y, tip.x - back.x);
  const h = width * 2.6;
  const mid = alongArrow(from, to, bow, 0.5);

  return (
    <>
      <svg style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} width={1920} height={1080}>
        <DrawPath d={arrowPath(from, to, bow)} delay={delay} frames={frames} stroke={color} width={width} dashed={dashed} />
        {head && p > 0.94 && (
          <polygon
            points={`${tip.x},${tip.y} ${tip.x - h * Math.cos(ang - 0.42)},${tip.y - h * Math.sin(ang - 0.42)} ${tip.x - h * Math.cos(ang + 0.42)},${tip.y - h * Math.sin(ang + 0.42)}`}
            fill={color}
            opacity={interpolate(p, [0.94, 1], [0, 1])}
          />
        )}
      </svg>
      {label && (
        <div style={{
          position: 'absolute',
          left: mid.x - 150,
          top: mid.y - 42,
          width: 300,
          textAlign: 'center',
          fontFamily: FONT.sans,
          fontWeight: 800,
          fontSize: 26,
          color,
          opacity: interpolate(frame - delay, [frames * 0.6, frames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
        >
          {label}
        </div>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ money */

/**
 * A value token travelling from one node to another.
 *
 * `repeat` sends several in sequence, which is what turns a single transfer into a visible
 * FLOW — the difference between "money went there once" and "money keeps going there", which
 * matters a great deal in the circulation and rollover sections.
 */
export const MoneyToken: React.FC<{
  from: Pt; to: Pt; bow?: number; delay?: number; frames?: number; label?: string;
  color?: string; repeat?: number; gap?: number; size?: number;
}> = ({
  from, to, bow = 0, delay = 0, frames = 34, label = '$', color = C.green, repeat = 1, gap = 12, size = 54,
}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: repeat }, (_, i) => {
        const t0 = delay + i * gap;
        const local = frame - t0;
        if (local < 0 || local > frames) return null;
        const t = local / frames;
        const eased = t * t * (3 - 2 * t);
        const p = alongArrow(from, to, bow, eased);
        // Fade at both ends so a token is never seen popping out of or into a node's edge.
        const fade = Math.min(1, t / 0.12, (1 - t) / 0.12);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: p.x - size / 2,
              top: p.y - size / 2,
              width: size,
              height: size,
              borderRadius: '50%',
              background: color,
              border: `3px solid ${C.ink}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FONT.sans,
              fontWeight: 900,
              fontSize: size * 0.46,
              color: C.paper,
              opacity: fade,
              boxSizing: 'border-box',
            }}
          >
            {label}
          </div>
        );
      })}
    </>
  );
};

/* ---------------------------------------------------------- balance sheet */

/**
 * A two-column balance sheet with matched entries.
 *
 * Built as a pair rather than as two independent lists, because the entire point of the bank
 * money-creation section is that the asset and the liability are created BY THE SAME ACT. A
 * component that could show one without the other would make it easy to draw the misleading
 * version — a bank conjuring an asset out of nothing — which is the single most common way
 * this topic gets explained wrongly.
 */
export const BalanceSheet: React.FC<{
  x: number; y: number; width?: number; title?: string;
  rows: { asset: string; liability: string; delay: number; tone?: string }[];
  delay?: number;
}> = ({ x, y, width = 1120, title = 'BANK', rows, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = spring({ frame: frame - delay, fps, config: { damping: 14 }, durationInFrames: 20 });
  const rowH = 96;
  const height = 128 + rows.length * rowH;
  const colW = (width - 12) / 2;

  return (
    <div style={{
      position: 'absolute',
      left: x - width / 2,
      top: y - height / 2,
      width,
      height,
      opacity: interpolate(head, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }),
      transform: `scale(${interpolate(head, [0, 1], [0.9, 1])})`,
      fontFamily: FONT.sans,
    }}
    >
      <div style={{
        textAlign: 'center', fontWeight: 900, fontSize: 40, color: C.ink,
        letterSpacing: 2, marginBottom: 12,
      }}
      >
        {title}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        {(['ASSETS', 'LIABILITIES'] as const).map((headLabel, col) => (
          <div key={headLabel} style={{ width: colW }}>
            <div style={{
              border: `4px solid ${C.ink}`,
              borderRadius: 14,
              background: col === 0 ? C.greenSoft : C.blueSoft,
              padding: '10px 0',
              textAlign: 'center',
              fontWeight: 900,
              fontSize: 28,
              letterSpacing: 1.4,
              color: C.ink,
            }}
            >
              {headLabel}
            </div>
            {rows.map((r, i) => {
              const s = spring({
                frame: frame - delay - r.delay, fps,
                config: { damping: 12, mass: 0.6 }, durationInFrames: 20,
              });
              return (
                <div
                  key={i}
                  style={{
                    marginTop: 12,
                    height: rowH - 12,
                    border: `4px solid ${C.ink}`,
                    borderRadius: 14,
                    background: C.paper,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 30,
                    color: r.tone ?? C.ink,
                    textAlign: 'center',
                    opacity: interpolate(s, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }),
                    transform: `translateX(${interpolate(s, [0, 1], [col === 0 ? -40 : 40, 0])}px)`,
                    boxSizing: 'border-box',
                    padding: '0 12px',
                  }}
                >
                  {col === 0 ? r.asset : r.liability}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

/* --------------------------------------------------------------- timeline */

/** A horizontal time axis with marked years — the mortgage and the factory both need one. */
export const Timeline: React.FC<{
  x: number; y: number; width: number; ticks: { at: number; label: string; tone?: string }[];
  delay?: number; frames?: number; caption?: string;
}> = ({ x, y, width, ticks, delay = 0, frames = 28, caption }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const x0 = x - width / 2;
  return (
    <>
      <svg style={{ position: 'absolute', left: 0, top: 0 }} width={1920} height={1080}>
        <DrawPath d={`M ${x0} ${y} L ${x0 + width} ${y}`} delay={delay} frames={frames} stroke={C.ink} width={6} />
      </svg>
      {ticks.map((t, i) => {
        const tx = x0 + width * t.at;
        const s = spring({
          frame: frame - delay - frames * 0.5 - i * 5, fps,
          config: { damping: 13, mass: 0.5 }, durationInFrames: 18,
        });
        const o = interpolate(s, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });
        return (
          <React.Fragment key={i}>
            <div style={{
              position: 'absolute', left: tx - 3, top: y - 20, width: 6, height: 40,
              background: t.tone ?? C.ink, opacity: o, borderRadius: 3,
            }}
            />
            <div style={{
              position: 'absolute', left: tx - 130, top: y + 30, width: 260, textAlign: 'center',
              fontFamily: FONT.sans, fontWeight: 800, fontSize: 30, color: t.tone ?? C.ink,
              opacity: o, transform: `translateY(${interpolate(s, [0, 1], [10, 0])}px)`,
            }}
            >
              {t.label}
            </div>
          </React.Fragment>
        );
      })}
      {caption && (
        <div style={{
          position: 'absolute', left: x - 500, top: y - 92, width: 1000, textAlign: 'center',
          fontFamily: FONT.sans, fontWeight: 800, fontSize: 32, color: C.inkSoft,
          opacity: interpolate(frame - delay, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
        >
          {caption}
        </div>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ graph */

/** A line graph that draws itself. Used for house prices, and for the crash. */
export const LineGraph: React.FC<{
  x: number; y: number; width: number; height: number;
  points: number[]; delay?: number; frames?: number; color?: string; label?: string;
}> = ({ x, y, width, height, points, delay = 0, frames = 40, color = C.green, label }) => {
  const x0 = x - width / 2;
  const y0 = y - height / 2;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const d = points
    .map((p, i) => {
      const px = x0 + (width * i) / (points.length - 1);
      const py = y0 + height - ((p - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
    })
    .join(' ');

  return (
    <>
      <svg style={{ position: 'absolute', left: 0, top: 0 }} width={1920} height={1080}>
        <rect x={x0} y={y0} width={width} height={height} fill={C.paper} stroke={C.ink} strokeWidth={4} rx={12} />
        <DrawPath d={d} delay={delay} frames={frames} stroke={color} width={8} />
      </svg>
      {label && (
        <div style={{
          position: 'absolute', left: x0, top: y0 - 52, width, textAlign: 'center',
          fontFamily: FONT.sans, fontWeight: 900, fontSize: 32, color: C.ink, letterSpacing: 1,
        }}
        >
          {label}
        </div>
      )}
    </>
  );
};

/* ---------------------------------------------------------------- network */

/**
 * The closing image: everyone owing everyone.
 *
 * Edges appear progressively and then keep a slow travelling token, because the thesis is not
 * "here are some connections" — it is that obligations are constantly flowing in every
 * direction at once. A still web says the first thing; only motion says the second.
 */
export const NetworkGraph: React.FC<{
  nodes: { at: Pt; label: string }[];
  edges: [number, number][];
  delay?: number;
  edgeStep?: number;
  nodeWidth?: number;
  showTokens?: boolean;
}> = ({ nodes, edges, delay = 0, edgeStep = 3, nodeWidth = 210, showTokens = true }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {edges.map(([a, b], i) => {
        const bow = (seeded(`edge${i}`) - 0.5) * 90;
        return (
          <Arrow
            key={`e${i}`}
            from={nodes[a].at}
            to={nodes[b].at}
            bow={bow}
            delay={delay + 14 + i * edgeStep}
            frames={16}
            color={C.inkFaint}
            width={3}
            head={false}
          />
        );
      })}
      {showTokens && edges.map(([a, b], i) => {
        const bow = (seeded(`edge${i}`) - 0.5) * 90;
        const period = 96;
        const offset = Math.floor(seeded(`tok${i}`) * period);
        const local = (frame - delay - 40 + offset) % period;
        if (frame < delay + 40 || local < 0) return null;
        return (
          <MoneyToken
            key={`t${i}`}
            from={nodes[a].at}
            to={nodes[b].at}
            bow={bow}
            delay={frame - local}
            frames={period}
            size={26}
            label=""
            color={C.yolk}
          />
        );
      })}
      {nodes.map((n, i) => (
        <Node
          key={`n${i}`}
          at={n.at}
          label={n.label}
          width={nodeWidth}
          height={72}
          size={24}
          delay={delay + i * 4}
        />
      ))}
    </>
  );
};
