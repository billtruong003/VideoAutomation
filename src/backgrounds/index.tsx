/**
 * backgrounds/index.tsx — the six rooms this channel keeps returning to.
 *
 * Backgrounds are FULL STAGE: they draw into the same `0 0 1080 1920` SVG coordinate
 * space `Stage.tsx` sets up, so every component here returns a `<g>` sized for the whole
 * frame and a scene just drops it in behind its foreground art.
 *
 * They are deliberately under-drawn. The character and the captions are the story; a
 * background that competes for ink makes both harder to read. So: thin strokes
 * (`STROKE.propFine`), muted colour, big flat shapes, and nothing detailed enough to
 * look at twice. Every architecture reads as "a place", never as a particular venue —
 * no real names, no logos, no recognisable buildings.
 *
 * Anything a scene needs to change (`lit`, `intensity`, hung wall items) is a prop.
 */

import React from 'react';
import { PALETTE, STROKE, HAND_STROKE } from '../lib/style';
import { hashString, rand01, valueNoise, wobble } from '../lib/rand';

/** Shared contract: every background can breathe with the frame and fade as a whole. */
export type BackgroundProps = {
  frame?: number;
  opacity?: number;
};

/** Deterministic [0,1) from a seed plus a key. */
const r01 = (seed: string, key: string): number => rand01(hashString(`${seed}:${key}`));

/** Deterministic [-1,1]. */
const rSigned = (seed: string, key: string): number => r01(seed, key) * 2 - 1;

/**
 * A whole-background sway of about a pixel. Backgrounds should feel drawn on the same
 * shaky page as the character, but they must never draw attention by moving.
 */
const sway = (seed: string, frame: number, amp = 1.4): number =>
  wobble(seed, frame, 0.028, amp);

/** A closed lumpy blob — the honest way to draw anything round in this style. */
function blob(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: string,
  bumps = 9,
): string {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < bumps; i++) {
    const a = (i / bumps) * Math.PI * 2 + rSigned(seed, `a${i}`) * 0.18;
    const k = 0.87 + r01(seed, `k${i}`) * 0.24;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < bumps; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % bumps];
    const mx = (p[0] + q[0]) / 2;
    const my = (p[1] + q[1]) / 2;
    const ox = mx - cx;
    const oy = my - cy;
    const len = Math.hypot(ox, oy) || 1;
    const push = 0.3 * Math.hypot(q[0] - p[0], q[1] - p[1]);
    d +=
      ` Q ${(mx + (ox / len) * push).toFixed(1)} ${(my + (oy / len) * push).toFixed(1)}` +
      ` ${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
  }
  return `${d} Z`;
}

/** A wonky box, drawn corner by corner with every corner a unit or two off true. */
function box(x: number, y: number, w: number, h: number, seed: string): string {
  const j = (k: string) => rSigned(seed, k) * 3.4;
  return (
    `M ${(x + j('a')).toFixed(1)} ${(y + j('b')).toFixed(1)} ` +
    `L ${(x + w + j('c')).toFixed(1)} ${(y + j('d')).toFixed(1)} ` +
    `L ${(x + w + j('e')).toFixed(1)} ${(y + h + j('f')).toFixed(1)} ` +
    `L ${(x + j('g')).toFixed(1)} ${(y + h + j('h')).toFixed(1)} Z`
  );
}

/** A never-quite-straight line between two points. */
function wonkyLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: string,
  bow = 6,
): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const nx = -(y2 - y1);
  const ny = x2 - x1;
  const len = Math.hypot(nx, ny) || 1;
  const b = rSigned(seed, 'bow') * bow;
  return (
    `M ${x1.toFixed(1)} ${y1.toFixed(1)} ` +
    `Q ${(mx + (nx / len) * b).toFixed(1)} ${(my + (ny / len) * b).toFixed(1)} ` +
    `${x2.toFixed(1)} ${y2.toFixed(1)}`
  );
}

// ---------------------------------------------------------------------------

/** The way in: a generic entrance seen head-on, with an unbranded sign over the door. */
export const CasinoEntrance: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => {
  const s = 'entrance';
  const dx = sway(`${s}:dx`, frame);

  const facade =
    'M 96 296 C 340 276 742 282 986 300 L 1000 1516 L 82 1516 Z';
  const doorway =
    'M 392 1512 L 398 1022 C 452 942 640 938 690 1016 L 698 1512 Z';
  const sign =
    'M 340 600 C 500 584 598 586 742 604 C 752 662 750 716 740 750 ' +
    'C 590 764 492 762 344 748 C 334 706 332 650 340 600 Z';

  const bulbs = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    return {
      key: i,
      cx: 356 + t * 372 + rSigned(s, `bx${i}`) * 5,
      cy: (i % 2 === 0 ? 580 : 772) + rSigned(s, `by${i}`) * 5,
      r: 8 + r01(s, `br${i}`) * 3,
    };
  });

  return (
    <g opacity={opacity} transform={`translate(${dx.toFixed(2)} 0)`}>
      {/* exterior: a strip of open air above the roofline, and the pavement below */}
      <path d={box(-20, -20, 1120, 320, `${s}:sky`)} fill={PALETTE.grey} opacity={0.3} />
      <path d={box(-20, 1500, 1120, 460, `${s}:pave`)} fill={PALETTE.paperShade} opacity={0.85} />

      {/* facade */}
      <path d={facade} fill={PALETTE.paperShade} transform="translate(3 3)" />
      <path
        d={facade}
        fill="none"
        stroke={PALETTE.greyDeep}
        strokeWidth={STROKE.propFine}
        strokeLinejoin="round"
      />

      {/* doorway — the only dark hole in the wall, so the eye goes straight in */}
      <path d={doorway} fill={PALETTE.nightWall} transform="translate(3 2.6)" opacity={0.9} />
      <path
        d={doorway}
        fill="none"
        stroke={PALETTE.ink}
        strokeWidth={STROKE.propFine}
        strokeLinejoin="round"
      />
      <path
        d={wonkyLine(544, 1008, 540, 1506, `${s}:split`, 4)}
        stroke={PALETTE.greyDeep}
        strokeWidth={STROKE.fine}
        {...HAND_STROKE}
      />

      {/* generic sign — squiggles instead of words, so it never names anything */}
      <path d={sign} fill={PALETTE.gold} transform="translate(3 2.6)" opacity={0.85} />
      <path
        d={sign}
        fill="none"
        stroke={PALETTE.ink}
        strokeWidth={STROKE.propFine}
        strokeLinejoin="round"
      />
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={wonkyLine(390 + i * 14, 650 + i * 34, 690 - i * 26, 652 + i * 34, `${s}:txt${i}`, 5)}
          stroke={PALETTE.inkSoft}
          strokeWidth={STROKE.propFine}
          opacity={0.5}
          {...HAND_STROKE}
        />
      ))}
      {bulbs.map((b) => (
        <path
          key={b.key}
          d={blob(b.cx, b.cy, b.r, b.r * 0.92, `${s}:bulb${b.key}`, 7)}
          fill={PALETTE.gold}
          stroke={PALETTE.ink}
          strokeWidth={STROKE.fine}
          strokeLinejoin="round"
          opacity={0.8}
        />
      ))}

      {/* ground line + a step, to sit the building on something */}
      <path
        d={wonkyLine(-20, 1514, 1100, 1508, `${s}:ground`, 9)}
        stroke={PALETTE.greyDeep}
        strokeWidth={STROKE.propFine}
        {...HAND_STROKE}
      />
      <path
        d={wonkyLine(300, 1590, 800, 1584, `${s}:step`, 7)}
        stroke={PALETTE.greyDeep}
        strokeWidth={STROKE.fine}
        opacity={0.7}
        {...HAND_STROKE}
      />
    </g>
  );
};

/** The old-school floor: sealed box, low ceiling, no windows, nothing to tell time by. */
export const TraditionalFloor: React.FC<
  BackgroundProps & { wallItems?: React.ReactNode }
> = ({ frame = 0, opacity = 1, wallItems }) => {
  const s = 'trad-floor';
  const dx = sway(`${s}:dx`, frame, 1.1);

  const ceiling = 'M -20 -20 L 1100 -20 L 1100 300 C 720 322 356 318 -20 296 Z';
  const wall = 'M -20 296 C 356 318 720 322 1100 300 L 1100 1250 L -20 1258 Z';
  const floor = 'M -20 1258 L 1100 1250 L 1100 1940 L -20 1940 Z';

  return (
    <g opacity={opacity} transform={`translate(${dx.toFixed(2)} 0)`}>
      {/* the ceiling is drawn LOW and dark on purpose — that is the whole point of the room */}
      <path d={floor} fill={PALETTE.nightFloor} />
      <path d={wall} fill={PALETTE.nightWall} />
      <path d={ceiling} fill={PALETTE.nightWall} opacity={0.95} />
      <path
        d={wonkyLine(-20, 298, 1100, 300, `${s}:soffit`, 8)}
        stroke={PALETTE.nightFloor}
        strokeWidth={STROKE.prop}
        {...HAND_STROKE}
      />

      {/* corners: the walls close in slightly, so the room reads as enclosed */}
      <path
        d={wonkyLine(74, 302, 46, 1256, `${s}:cornerL`, 7)}
        stroke={PALETTE.nightFloor}
        strokeWidth={STROKE.propFine}
        opacity={0.8}
        {...HAND_STROKE}
      />
      <path
        d={wonkyLine(1006, 300, 1036, 1252, `${s}:cornerR`, 7)}
        stroke={PALETTE.nightFloor}
        strokeWidth={STROKE.propFine}
        opacity={0.8}
        {...HAND_STROKE}
      />

      {/* two dim ceiling fittings — light exists, daylight does not */}
      {[318, 762].map((cx, i) => (
        <g key={i}>
          <path
            d={blob(cx + i * 4, 190, 92, 26, `${s}:lamp${i}`, 8)}
            fill={PALETTE.greyDeep}
            opacity={0.35}
          />
          <path
            d={blob(cx + i * 4, 190, 92, 26, `${s}:lamp${i}`, 8)}
            fill="none"
            stroke={PALETTE.nightFloor}
            strokeWidth={STROKE.propFine}
            strokeLinejoin="round"
          />
        </g>
      ))}
      {[1000, 470].map((cx, i) => (
        <path
          key={i}
          d={blob(cx - i * 40, 178, 74, 22, `${s}:lampb${i}`, 8)}
          fill={PALETTE.greyDeep}
          opacity={0.22}
        />
      ))}

      {/* floor: a few converging seams, nothing more */}
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={wonkyLine(-40 + i * 380, 1930, 300 + i * 170, 1262, `${s}:seam${i}`, 10)}
          stroke={PALETTE.nightWall}
          strokeWidth={STROKE.propFine}
          opacity={0.7}
          {...HAND_STROKE}
        />
      ))}
      <path
        d={wonkyLine(-20, 1256, 1100, 1250, `${s}:base`, 8)}
        stroke={PALETTE.nightWall}
        strokeWidth={STROKE.propFine}
        {...HAND_STROKE}
      />

      {/* whatever the scene wants hung on that wall — a clock, or pointedly nothing */}
      {wallItems}
    </g>
  );
};

/** A bank of machines receding into the room, with a run of ceiling lights over it. */
export const SlotArea: React.FC<BackgroundProps & { lit?: boolean }> = ({
  frame = 0,
  opacity = 1,
  lit = true,
}) => {
  const s = 'slot-area';
  const dx = sway(`${s}:dx`, frame, 1.2);
  const glow = lit ? PALETTE.gold : PALETTE.greyDeep;

  const rows = 5;
  const machines = Array.from({ length: rows * 2 }, (_, n) => {
    const i = n % rows;
    const side = n < rows ? -1 : 1;
    const k = 1 - i * 0.15;
    const w = 168 * k;
    const h = 430 * k;
    const baseY = 1560 - i * 82 + rSigned(s, `y${n}`) * 6;
    const x = side < 0 ? 26 + i * 92 : 1054 - i * 92 - w;
    return { key: n, x, y: baseY - h, w, h, k };
  }).sort((a, b) => b.h - a.h);

  const lights = Array.from({ length: 6 }, (_, i) => ({
    key: i,
    cx: 120 + i * 170 + rSigned(s, `lx${i}`) * 8,
    cy: 176 + rSigned(s, `ly${i}`) * 10,
    rx: 56 - i * 1.5,
  }));

  return (
    <g opacity={opacity} transform={`translate(${dx.toFixed(2)} 0)`}>
      <path d={box(-20, -20, 1120, 1300, `${s}:room`)} fill={PALETTE.nightWall} opacity={0.92} />
      <path d={box(-20, 1260, 1120, 700, `${s}:floor`)} fill={PALETTE.nightFloor} opacity={0.95} />

      {/* ceiling run */}
      {lights.map((l) => (
        <g key={l.key}>
          <path
            d={blob(l.cx, l.cy, l.rx, 20, `${s}:light${l.key}`, 8)}
            fill={glow}
            opacity={lit ? 0.6 : 0.3}
          />
          <path
            d={blob(l.cx, l.cy, l.rx, 20, `${s}:light${l.key}`, 8)}
            fill="none"
            stroke={PALETTE.nightFloor}
            strokeWidth={STROKE.fine}
            strokeLinejoin="round"
          />
        </g>
      ))}

      {/* the bank — silhouettes only, deep enough that the eye reads "rows and rows" */}
      {machines.map((m) => {
        const body = box(m.x, m.y, m.w, m.h, `${s}:m${m.key}`);
        const screen = box(
          m.x + m.w * 0.18,
          m.y + m.h * 0.18,
          m.w * 0.64,
          m.h * 0.3,
          `${s}:s${m.key}`,
        );
        return (
          <g key={m.key} opacity={0.55 + m.k * 0.35}>
            <path d={body} fill={PALETTE.nightWall} transform="translate(3 3)" />
            <path
              d={body}
              fill="none"
              stroke={PALETTE.nightFloor}
              strokeWidth={STROKE.propFine}
              strokeLinejoin="round"
            />
            <path d={screen} fill={glow} opacity={lit ? 0.55 : 0.22} />
            <path
              d={wonkyLine(
                m.x + m.w * 0.2,
                m.y + m.h * 0.62,
                m.x + m.w * 0.8,
                m.y + m.h * 0.62,
                `${s}:sh${m.key}`,
                4,
              )}
              stroke={PALETTE.nightFloor}
              strokeWidth={STROKE.fine}
              {...HAND_STROKE}
            />
          </g>
        );
      })}

      {/* the aisle running away from camera */}
      <path
        d={wonkyLine(430, 1930, 512, 1180, `${s}:aisleL`, 12)}
        stroke={PALETTE.nightWall}
        strokeWidth={STROKE.propFine}
        opacity={0.8}
        {...HAND_STROKE}
      />
      <path
        d={wonkyLine(660, 1930, 574, 1180, `${s}:aisleR`, 12)}
        stroke={PALETTE.nightWall}
        strokeWidth={STROKE.propFine}
        opacity={0.8}
        {...HAND_STROKE}
      />
    </g>
  );
};

/** No room at all: a violet field of warped rings, for when time stops behaving. */
export const TimeDistortionVoid: React.FC<BackgroundProps & { intensity?: number }> = ({
  frame = 0,
  opacity = 1,
  intensity = 0.6,
}) => {
  const s = 'time-void';
  const amt = Math.max(0, Math.min(1, intensity));
  const cx = 540;
  const cy = 920;
  const key = hashString(s);

  const ring = (radius: number, ri: number): string => {
    const n = 30;
    const pts: string[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      // the warp: each ring breathes on its own slow noise, more so at high intensity
      const warp =
        valueNoise(i * 0.5 + ri * 3.7 + frame * 0.022, key + ri * 131) *
        (14 + radius * 0.16) *
        (0.35 + amt);
      const rr = radius + warp;
      pts.push(
        `${(cx + Math.cos(a) * rr * 1.05).toFixed(1)} ${(cy + Math.sin(a) * rr * 0.84).toFixed(1)}`,
      );
    }
    return `M ${pts.join(' L ')} Z`;
  };

  const rings = Array.from({ length: 9 }, (_, i) => ({
    key: i,
    d: ring(110 + i * 118, i),
    o: (0.14 + i * 0.028) * (0.4 + amt * 0.6),
  }));

  // a couple of loose spiral arcs, so the field swirls instead of just pulsing
  const swirls = Array.from({ length: 3 }, (_, i) => {
    const steps = 46;
    const pts: string[] = [];
    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      const a = t * Math.PI * 2.4 + i * 2.1 + frame * 0.006;
      const rr = 140 + t * 640 * (0.8 + r01(s, `sw${i}`) * 0.35);
      pts.push(
        `${(cx + Math.cos(a) * rr * 1.02).toFixed(1)} ${(cy + Math.sin(a) * rr * 0.82).toFixed(1)}`,
      );
    }
    return { key: i, d: `M ${pts.join(' L ')}` };
  });

  return (
    <g opacity={opacity}>
      <path d={box(-20, -20, 1120, 1960, `${s}:field`)} fill={PALETTE.violet} opacity={0.14 + amt * 0.14} />
      {rings.map((r) => (
        <path
          key={r.key}
          d={r.d}
          stroke={PALETTE.violet}
          strokeWidth={STROKE.propFine}
          opacity={r.o}
          {...HAND_STROKE}
        />
      ))}
      {swirls.map((sw) => (
        <path
          key={sw.key}
          d={sw.d}
          stroke={PALETTE.violet}
          strokeWidth={STROKE.fine}
          opacity={0.16 + amt * 0.2}
          {...HAND_STROKE}
        />
      ))}
    </g>
  );
};

/** The opposite room: high ceiling, open floor, and daylight coming in through glass. */
export const ModernCasino: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => {
  const s = 'modern';
  const dx = sway(`${s}:dx`, frame, 1.1);

  const windows = [0, 1, 2].map((i) => {
    const w = 268;
    const x = 84 + i * 316 + rSigned(s, `wx${i}`) * 6;
    return { key: i, x, y: 316 + rSigned(s, `wy${i}`) * 8, w, h: 520 };
  });

  return (
    <g opacity={opacity} transform={`translate(${dx.toFixed(2)} 0)`}>
      {/* everything stays close to paper value — this room is about air, not ink */}
      <path d={box(-20, -20, 1120, 1500, `${s}:wall`)} fill={PALETTE.paper} opacity={0.9} />
      <path d={box(-20, 1440, 1120, 520, `${s}:floor`)} fill={PALETTE.paperShade} opacity={0.9} />

      {/* the ceiling is drawn HIGH and light, with two long beams running back */}
      <path
        d={wonkyLine(-20, 176, 1100, 168, `${s}:ceil`, 10)}
        stroke={PALETTE.greyDeep}
        strokeWidth={STROKE.propFine}
        opacity={0.7}
        {...HAND_STROKE}
      />
      {[0, 1].map((i) => (
        <path
          key={i}
          d={wonkyLine(120 + i * 640, 178, 400 + i * 250, 262, `${s}:beam${i}`, 6)}
          stroke={PALETTE.greyDeep}
          strokeWidth={STROKE.fine}
          opacity={0.5}
          {...HAND_STROKE}
        />
      ))}

      {/* big daylit glass */}
      {windows.map((wn) => {
        const d = box(wn.x, wn.y, wn.w, wn.h, `${s}:win${wn.key}`);
        return (
          <g key={wn.key}>
            <path d={d} fill={PALETTE.teal} opacity={0.24} transform="translate(3 3)" />
            <path
              d={d}
              fill="none"
              stroke={PALETTE.greyDeep}
              strokeWidth={STROKE.propFine}
              strokeLinejoin="round"
            />
            <path
              d={wonkyLine(wn.x + 6, wn.y + wn.h * 0.52, wn.x + wn.w - 6, wn.y + wn.h * 0.5, `${s}:mull${wn.key}`, 5)}
              stroke={PALETTE.greyDeep}
              strokeWidth={STROKE.fine}
              opacity={0.6}
              {...HAND_STROKE}
            />
          </g>
        );
      })}

      {/* daylight falling in — two faint slants, no gradient, no glow */}
      {[0, 1].map((i) => (
        <path
          key={i}
          d={wonkyLine(200 + i * 470, 850, 380 + i * 470, 1440, `${s}:ray${i}`, 8)}
          stroke={PALETTE.teal}
          strokeWidth={STROKE.propFine}
          opacity={0.22}
          {...HAND_STROKE}
        />
      ))}

      {/* low, sparse furniture in the distance — the floor is mostly empty space */}
      {[0, 1, 2].map((i) => {
        const cx = 200 + i * 340 + rSigned(s, `tx${i}`) * 20;
        return (
          <g key={i} opacity={0.55}>
            <path d={blob(cx, 1352, 96 - i * 8, 24, `${s}:table${i}`, 8)} fill={PALETTE.grey} />
            <path
              d={blob(cx, 1352, 96 - i * 8, 24, `${s}:table${i}`, 8)}
              fill="none"
              stroke={PALETTE.greyDeep}
              strokeWidth={STROKE.propFine}
              strokeLinejoin="round"
            />
          </g>
        );
      })}

      <path
        d={wonkyLine(-20, 1444, 1100, 1436, `${s}:base`, 9)}
        stroke={PALETTE.greyDeep}
        strokeWidth={STROKE.propFine}
        opacity={0.75}
        {...HAND_STROKE}
      />
    </g>
  );
};

/** Daylight and ordinary life outside — the world that shrinks while you are in there. */
export const OutsideWorld: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => {
  const s = 'outside';
  const dx = sway(`${s}:dx`, frame, 1.3);
  const horizon = 1190;

  const buildings = [
    { key: 0, x: 120, y: 690, w: 250, h: horizon - 690 },
    { key: 1, x: 392, y: 856, w: 196, h: horizon - 856 },
  ];

  return (
    <g opacity={opacity} transform={`translate(${dx.toFixed(2)} 0)`}>
      {/* sky and ground: two flat bands, the simplest possible outdoors */}
      <path d={box(-20, -20, 1120, horizon + 20, `${s}:sky`)} fill={PALETTE.teal} opacity={0.16} />
      <path d={box(-20, horizon, 1120, 1960 - horizon, `${s}:ground`)} fill={PALETTE.grey} opacity={0.5} />
      <path
        d={wonkyLine(-20, horizon, 1100, horizon - 6, `${s}:horizon`, 10)}
        stroke={PALETTE.greyDeep}
        strokeWidth={STROKE.propFine}
        {...HAND_STROKE}
      />

      {/* sun: a lopsided potato, never a circle */}
      <path d={blob(858, 268, 76, 70, `${s}:sun`, 9)} fill={PALETTE.gold} opacity={0.6} />
      <path
        d={blob(858, 268, 76, 70, `${s}:sun`, 9)}
        fill="none"
        stroke={PALETTE.greyDeep}
        strokeWidth={STROKE.propFine}
        strokeLinejoin="round"
        opacity={0.8}
      />

      {/* a couple of ordinary buildings */}
      {buildings.map((b) => {
        const d = box(b.x, b.y, b.w, b.h, `${s}:b${b.key}`);
        return (
          <g key={b.key}>
            <path d={d} fill={PALETTE.paperShade} transform="translate(3 3)" />
            <path
              d={d}
              fill="none"
              stroke={PALETTE.greyDeep}
              strokeWidth={STROKE.propFine}
              strokeLinejoin="round"
            />
            {Array.from({ length: 6 }, (_, i) => {
              const col = i % 2;
              const row = Math.floor(i / 2);
              return (
                <path
                  key={i}
                  d={box(
                    b.x + 42 + col * (b.w * 0.42),
                    b.y + 62 + row * 116,
                    b.w * 0.24,
                    62,
                    `${s}:w${b.key}${i}`,
                  )}
                  fill={PALETTE.greyDeep}
                  opacity={0.35}
                />
              );
            })}
          </g>
        );
      })}

      {/* one tree, so the outside reads as somewhere you would actually want to be */}
      <g>
        <path
          d="M 806 1188 C 812 1120 808 1060 800 1010 C 796 986 802 968 812 960"
          stroke={PALETTE.ink}
          strokeWidth={STROKE.prop}
          opacity={0.6}
          {...HAND_STROKE}
        />
        <path
          d="M 806 1092 C 782 1070 764 1058 748 1052"
          stroke={PALETTE.ink}
          strokeWidth={STROKE.propFine}
          opacity={0.55}
          {...HAND_STROKE}
        />
        <path d={blob(806, 908, 122, 96, `${s}:canopy`, 11)} fill={PALETTE.teal} opacity={0.35} />
        <path
          d={blob(806, 908, 122, 96, `${s}:canopy`, 11)}
          fill="none"
          stroke={PALETTE.greyDeep}
          strokeWidth={STROKE.propFine}
          strokeLinejoin="round"
        />
      </g>

      {/* two path scratches on the ground, nothing else */}
      {[0, 1].map((i) => (
        <path
          key={i}
          d={wonkyLine(120 + i * 520, 1340 + i * 120, 700 + i * 320, 1300 + i * 130, `${s}:pth${i}`, 14)}
          stroke={PALETTE.greyDeep}
          strokeWidth={STROKE.fine}
          opacity={0.45}
          {...HAND_STROKE}
        />
      ))}
    </g>
  );
};
