/**
 * Text.tsx — on-screen words and numbers.
 *
 * Type here is a VISUAL ELEMENT, not a transcript. The subtitle already carries every word
 * the narrator says; repeating it in large letters gives the viewer two copies of the same
 * information and zero copies of the thing the sentence is about. So on-screen text is
 * reserved for the handful of tokens the eye should catch and hold: $300,000. 2047 ME. TRUST.
 * CREDIT DISAPPEARS.
 *
 * Numbers get their own component because in this video the arithmetic IS the argument. The
 * leverage section only lands if the viewer watches $10 become $100 and then watches the $10
 * disappear, and a number that simply cuts to its new value does not read as a change.
 */

import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, T } from '../theme';

export type TextTone = 'ink' | 'inkSoft' | 'green' | 'red' | 'blue' | 'violet' | 'yolk';

const TONE: Record<TextTone, string> = {
  ink: C.ink, inkSoft: C.inkSoft, green: C.green, red: C.red,
  blue: C.blue, violet: C.violet, yolk: C.yolkDeep,
};

/**
 * Rough rendered width of a string, in px, for the house face.
 *
 * An estimate, not a measurement — a Remotion component cannot measure text before it commits
 * to a layout, and the alternative (guessing a width and hoping) is what produced a run of
 * frames where a headline wrapped onto a second line and landed on top of the subtitle
 * underneath it. The coefficient is deliberately generous: over-estimating shrinks type
 * slightly, which is invisible, while under-estimating collides, which is not.
 */
const estimateWidth = (text: string, size: number, weight: number, caps: boolean, track: number) => {
  const perChar = (caps ? 0.62 : 0.53) + (weight >= 900 ? 0.03 : 0);
  return text.length * (size * perChar + track);
};

/** Split on authored line breaks, so a two-line label is measured as two lines. */
const splitLines = (s: string): string[] => s.split('\n');

const flatten = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flatten).join('');
  if (React.isValidElement(node)) return flatten((node.props as { children?: React.ReactNode }).children);
  return '';
};

export const Label: React.FC<{
  children: React.ReactNode; x: number; y: number; size?: number; tone?: TextTone;
  weight?: number; align?: 'center' | 'left' | 'right'; caps?: boolean; width?: number;
  track?: number; opacity?: number; rotate?: number; lineHeight?: number;
  /**
   * Keep the text on the number of lines it was written with, shrinking it to fit rather than
   * wrapping. Use for anything whose position was chosen relative to something else on screen.
   */
  fit?: boolean;
}> = ({
  children, x, y, size = T.label, tone = 'ink', weight = 800, align = 'center',
  caps = false, width = 900, track = 0, opacity = 1, rotate = 0, lineHeight = 1.15, fit = false,
}) => {
  let shown = size;
  if (fit) {
    const lines = splitLines(flatten(children));
    const widest = Math.max(...lines.map((l) => estimateWidth(l.trim(), size, weight, caps, track)));
    if (widest > width) shown = Math.max(14, size * (width / widest));
  }
  return (
    <div style={{
      position: 'absolute',
      left: align === 'center' ? x - width / 2 : align === 'right' ? x - width : x,
      top: y - shown * 0.72,
      width,
      textAlign: align,
      fontFamily: FONT.sans,
      fontWeight: weight,
      fontSize: shown,
      lineHeight,
      color: TONE[tone],
      letterSpacing: track,
      textTransform: caps ? 'uppercase' : 'none',
      opacity,
      transform: rotate ? `rotate(${rotate}deg)` : undefined,
      whiteSpace: fit ? 'pre' : 'pre-line',
    }}
    >
      {children}
    </div>
  );
};

/** A single dominant word. The frame is the word; nothing else competes. */
export const HeroWord: React.FC<{
  children: React.ReactNode; y?: number; delay?: number; tone?: TextTone; size?: number;
}> = ({ children, y = 540, delay = 0, tone = 'ink', size = T.hero }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 13, mass: 0.7 }, durationInFrames: 26 });
  return (
    <Label
      x={960}
      y={y}
      size={size}
      tone={tone}
      weight={900}
      caps
      fit
      width={1700}
      track={size * 0.02}
      opacity={interpolate(s, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' })}
    >
      <span style={{ display: 'inline-block', transform: `scale(${interpolate(s, [0, 1], [0.78, 1])})` }}>
        {children}
      </span>
    </Label>
  );
};

/**
 * A money/percentage figure that ANIMATES to its value.
 *
 * `from`→`to` over `frames`, with the digits changing. This is deliberately not a fade
 * between two strings: the viewer needs to perceive the quantity moving, especially in the
 * leverage section where the entire point is that the same 10% does two very different
 * things depending on what it is 10% of.
 */
export const Figure: React.FC<{
  x: number; y: number; from?: number; to: number; delay?: number; frames?: number;
  prefix?: string; suffix?: string; size?: number; tone?: TextTone; decimals?: number;
  weight?: number;
}> = ({
  x, y, from = 0, to, delay = 0, frames = 26, prefix = '', suffix = '',
  size = T.figure, tone = 'ink', decimals = 0, weight = 900,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: frames });
  const v = interpolate(s, [0, 1], [from, to]);
  const shown = decimals > 0
    ? v.toFixed(decimals)
    : Math.round(v).toLocaleString('en-US');
  const pop = spring({ frame: frame - delay, fps, config: { damping: 10, mass: 0.5 }, durationInFrames: 18 });
  return (
    <Label
      x={x}
      y={y}
      size={size}
      tone={tone}
      weight={weight}
      width={900}
      opacity={interpolate(pop, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' })}
    >
      <span style={{
        display: 'inline-block',
        transform: `scale(${interpolate(pop, [0, 1], [0.7, 1])})`,
        fontVariantNumeric: 'tabular-nums',
      }}
      >
        {prefix}{shown}{suffix}
      </span>
    </Label>
  );
};

/**
 * A word or figure inside a drawn box — the "this is a labelled thing" device.
 *
 * The box is a rounded rect with the same black outline weight as the artwork, so a label
 * belongs to the same drawing as the character rather than looking like a UI chip pasted
 * over it.
 */
export const Plate: React.FC<{
  children: React.ReactNode; x: number; y: number; width: number; height: number;
  size?: number; tone?: TextTone; fill?: string; delay?: number; sub?: string;
  outline?: string; radius?: number;
}> = ({
  children, x, y, width, height, size = T.label, tone = 'ink',
  fill = C.paper, delay = 0, sub, outline = C.ink, radius = 18,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 12, mass: 0.6 }, durationInFrames: 20 });
  /*
   * The box is a fixed size and the label inside it is not, so the label yields. Without this
   * a long caption simply overflows the border it is supposed to sit inside, which reads as a
   * broken layout rather than as a long caption.
   */
  const lines = splitLines(flatten(children));
  const widest = Math.max(...lines.map((l) => estimateWidth(l.trim(), size, 800, false, 0)));
  const room = width - 34;
  const shown = widest > room ? Math.max(13, size * (room / widest)) : size;
  return (
    <div style={{
      position: 'absolute',
      left: x - width / 2,
      top: y - height / 2,
      width,
      height,
      background: fill,
      border: `4px solid ${outline}`,
      borderRadius: radius,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONT.sans,
      fontWeight: 800,
      fontSize: shown,
      color: TONE[tone],
      transform: `scale(${interpolate(s, [0, 1], [0.72, 1])})`,
      opacity: interpolate(s, [0, 0.35], [0, 1], { extrapolateRight: 'clamp' }),
      textAlign: 'center',
      lineHeight: 1.1,
      padding: '0 14px',
      boxSizing: 'border-box',
    }}
    >
      <div style={{ whiteSpace: 'pre-line' }}>{children}</div>
      {sub && (
        <div style={{ fontSize: shown * 0.46, fontWeight: 700, color: C.inkSoft, marginTop: 6 }}>
          {sub}
        </div>
      )}
    </div>
  );
};

/** A struck-through word — "gone", "not safe", the crossed-out promise. */
export const StrikeWord: React.FC<{
  children: React.ReactNode; x: number; y: number; size?: number; delay?: number; tone?: TextTone;
}> = ({ children, x, y, size = T.label, delay = 0, tone = 'ink' }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delay, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const w = size * String(children).length * 0.56;
  return (
    <>
      <Label x={x} y={y} size={size} tone={tone} width={900}>{children}</Label>
      <svg style={{ position: 'absolute', left: 0, top: 0 }} width={1920} height={1080}>
        <line
          x1={x - w / 2} y1={y - size * 0.22}
          x2={x - w / 2 + w * p} y2={y - size * 0.22 - size * 0.06}
          stroke={C.red} strokeWidth={7} strokeLinecap="round"
        />
      </svg>
    </>
  );
};
