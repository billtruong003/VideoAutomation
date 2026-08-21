/**
 * Stock.tsx — real-world footage, made safe to put a doodle in front of.
 *
 * The failure this file exists to prevent: a black-outlined character dropped onto a dark
 * photograph, where the outline that defines him disappears into the background and the whole
 * frame turns to mud. It happens the moment stock is treated as "just a background image".
 *
 * So a stock plate is never used raw when something sits on top of it. `readability` applies,
 * in this order:
 *
 *   1. a slight desaturation and lift, so the photo stops competing on colour
 *   2. an optional small blur, which pushes it behind the foreground plane
 *   3. a WHITE veil, because white is this video's ground and fading toward it keeps the
 *      photo inside the film's world instead of turning it into a separate dark rectangle
 *   4. a soft white vignette at the edges, so the plate dissolves into the page rather than
 *      ending at a hard rectangle border
 *
 * Full-frame stock with nothing on top uses `readability="none"` and stays exactly as shot —
 * those are the reset moments, and the whole point of them is that the real world arrives
 * undiluted.
 *
 * `OffthreadVideo` rather than `Video`: it decodes with ffmpeg off the main thread, which is
 * what makes 28 clips across fourteen minutes render without the browser holding every one of
 * them in memory at once.
 */

import React from 'react';
import { Img, OffthreadVideo, interpolate, useCurrentFrame } from 'remotion';
import { stock, stockSrc } from '../assets';
import { C } from '../theme';

export type Readability = 'none' | 'light' | 'strong';

const VEIL: Record<Readability, { blur: number; veil: number; saturate: number; brightness: number }> = {
  none: { blur: 0, veil: 0, saturate: 1, brightness: 1 },
  light: { blur: 1.5, veil: 0.2, saturate: 0.82, brightness: 1.06 },
  strong: { blur: 5, veil: 0.46, saturate: 0.6, brightness: 1.12 },
};

type PlateProps = {
  id: string;
  readability?: Readability;
  /** Slow scale over the clip. A static photo held for six seconds reads as a slideshow. */
  kenBurns?: number;
  /** Direction of the drift, in px across the whole span. */
  driftX?: number;
  driftY?: number;
  frames?: number;
  /** Rounded window instead of full bleed. */
  inset?: { left: number; top: number; width: number; height: number; radius?: number };
  /** Fade the plate's own edges into the white page. Only meaningful full-bleed. */
  featherEdges?: boolean;
  startFrom?: number;
};

export const StockPlate: React.FC<PlateProps> = ({
  id, readability = 'light', kenBurns = 0.06, driftX = 0, driftY = 0,
  frames = 180, inset, featherEdges = true, startFrom = 0,
}) => {
  const entry = stock(id);
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, frames], [0, 1], { extrapolateRight: 'clamp' });
  const cfg = VEIL[readability];

  const box: React.CSSProperties = inset
    ? {
      position: 'absolute',
      left: inset.left,
      top: inset.top,
      width: inset.width,
      height: inset.height,
      borderRadius: inset.radius ?? 26,
      overflow: 'hidden',
    }
    : { position: 'absolute', inset: 0, overflow: 'hidden' };

  const media: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    transform: `scale(${1 + kenBurns * t}) translate(${driftX * t}px, ${driftY * t}px)`,
    filter: `saturate(${cfg.saturate}) brightness(${cfg.brightness})${cfg.blur ? ` blur(${cfg.blur}px)` : ''}`,
  };

  return (
    <div style={box}>
      {entry.kind === 'video' ? (
        /*
         * Played straight through, never looped at render time.
         *
         * The repeat that makes a short clip cover a long beat happens once, in ffmpeg, when
         * the proxy is built — see `tools/mryolk/make-proxies.mjs`. Doing it here instead,
         * with Remotion's `<Loop>`, is what killed two complete renders: the compositor kept
         * being asked for a frame slightly past the end of the file and failed the whole job
         * with "No frame found at position ...". A clip that is simply longer than the beat
         * cannot produce that request at all.
         */
        <OffthreadVideo src={stockSrc(id)} style={media} muted startFrom={startFrom} />
      ) : (
        <Img src={stockSrc(id)} style={media} />
      )}

      {cfg.veil > 0 && (
        <div style={{ position: 'absolute', inset: 0, background: C.paper, opacity: cfg.veil }} />
      )}

      {featherEdges && !inset && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background:
            `radial-gradient(120% 100% at 50% 50%, rgba(255,255,255,0) 55%, ${C.paper} 100%)`,
          opacity: readability === 'none' ? 0.35 : 0.75,
        }}
        />
      )}

      {inset && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: inset.radius ?? 26,
          boxShadow: `inset 0 0 0 5px ${C.ink}`,
        }}
        />
      )}
    </div>
  );
};

/**
 * A framed window of real footage sitting on the white page, sized like a drawn prop.
 *
 * This is the workhorse for "make the abstract thing concrete for two seconds" — it grounds a
 * claim without abandoning the film's white world the way a full-bleed cut does.
 */
export const StockWindow: React.FC<{
  id: string; x: number; y: number; width: number; height: number;
  frames?: number; readability?: Readability; label?: string; startFrom?: number;
}> = ({ id, x, y, width, height, frames = 150, readability = 'none', label, startFrom = 0 }) => (
  <>
    <StockPlate
      id={id}
      readability={readability}
      frames={frames}
      startFrom={startFrom}
      kenBurns={0.07}
      inset={{ left: x - width / 2, top: y - height / 2, width, height, radius: 22 }}
    />
    {label && (
      <div style={{
        position: 'absolute',
        left: x - width / 2,
        top: y + height / 2 + 14,
        width,
        textAlign: 'center',
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontWeight: 700,
        fontSize: 28,
        color: C.inkSoft,
        letterSpacing: 0.4,
      }}
      >
        {label}
      </div>
    )}
  </>
);
