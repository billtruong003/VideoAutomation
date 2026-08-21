/**
 * Stage.tsx — the white page every scene is drawn on, and the transitions between scenes.
 *
 * `Stage` exists so no scene ever paints its own background. If each did, the first one to
 * forget would show whatever was underneath it, and a single-frame flash of the previous
 * scene is the kind of defect that survives review because it is invisible at any speed a
 * person actually watches.
 *
 * Chapter cards are used SPARINGLY — at the few points where a long-form viewer benefits from
 * knowing a new idea has started. Titling all seventeen chapters would turn the video into a
 * lecture with slides, and would interrupt the argument exactly where it is flowing best.
 */

import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT } from '../theme';

export const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ backgroundColor: C.paper }}>{children}</AbsoluteFill>
);

/**
 * A chapter title that wipes on and clears out.
 *
 * The bar sweeps rather than fades, so it reads as a deliberate act of punctuation. It clears
 * completely — a title card that lingers under a diagram is just clutter with a job title.
 */
export const ChapterCard: React.FC<{
  title: string; sub?: string; frames?: number; tone?: string;
}> = ({ title, sub, frames = 62, tone = C.ink }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 16, mass: 0.7 }, durationInFrames: 20 });
  const exit = interpolate(frame, [frames - 14, frames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const wipe = interpolate(enter, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <div style={{
        position: 'absolute',
        left: 0,
        top: 430,
        width: 1920,
        height: 220,
        overflow: 'hidden',
      }}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          background: C.paper,
          borderTop: `6px solid ${tone}`,
          borderBottom: `6px solid ${tone}`,
          transform: `scaleX(${wipe})`,
          transformOrigin: 'left center',
        }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT.sans,
          opacity: interpolate(enter, [0.55, 1], [0, 1], { extrapolateLeft: 'clamp' }),
          transform: `translateY(${interpolate(enter, [0.55, 1], [16, 0], { extrapolateLeft: 'clamp' })}px)`,
        }}
        >
          <div style={{ fontWeight: 900, fontSize: 76, color: tone, letterSpacing: 2, textTransform: 'uppercase' }}>
            {title}
          </div>
          {sub && (
            <div style={{ fontWeight: 700, fontSize: 32, color: C.inkSoft, marginTop: 8 }}>{sub}</div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * A white flash-wipe between two visual worlds.
 *
 * White rather than black because black would be the only dark frame in a bright film and
 * reads as a dropout rather than as a cut.
 */
export const FlashCut: React.FC<{ at: number; frames?: number }> = ({ at, frames = 8 }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > frames) return null;
  const o = Math.sin((t / frames) * Math.PI);
  return <AbsoluteFill style={{ background: C.paper, opacity: o }} />;
};
