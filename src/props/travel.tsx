/**
 * travel.tsx — aircraft cabin and escalator hardware.
 *
 *      DESIGN CLEANLY.  RENDER IMPERFECTLY.
 *
 * Every shape here is authored as what the object IS. An airplane window is a rounded
 * rectangle with a rounded rectangle inside it; an escalator is a stair of parallelograms
 * beside a flat panel. Not one path tries to look hand-drawn — all of that arrives in
 * `RoughAsset`, identically for every asset in the channel.
 *
 * Two of these props exist to be CUT AWAY rather than looked at. `WindowPaneStack` and
 * `EscalatorSeam` are diagrams: their job is to make an invisible mechanism legible in about
 * a second, on a phone. They are drawn side-on and flat, with no perspective, because
 * perspective on a 3-unit gap is how you lose the only thing the episode is about.
 *
 * Coordinates are character units (Bill is ~185 tall, his head ~96 across). Floor-standing
 * props put their origin on the ground at their centre; wall props are centred on themselves.
 */

import React from 'react';
import { RoughAsset } from '../assets/RoughAsset';
import { PropFrame, type PropArgs } from '../assets/PropFrame';
import { PALETTE } from '../style/tokens';
import { TINY, roundedRect, type AssetDef, type Shape } from '../assets/shapes';
import { wobblyLine } from '../lib/pathpoints';

// ---------------------------------------------------------------------------
// airplane window
// ---------------------------------------------------------------------------

const WIN_W = 84;
const WIN_H = 112;

/**
 * A passenger window: the cabin surround, the rounded pane, and the breather hole.
 *
 * The hole is deliberately drawn at a size that reads on a phone rather than at true scale —
 * a real 3 mm hole on an 84-unit pane would be sub-pixel at Shorts resolution, which would
 * make the whole episode invisible. It carries the `TINY` roughness override, because Rough.js
 * roughness is in ABSOLUTE units: at default settings a 4-unit circle wanders further than
 * its own radius and renders as a smear.
 */
const airplaneWindowDef = (viewColor: string, holeLit: boolean): AssetDef => ({
  id: 'prop-airplane-window',
  size: { w: WIN_W + 26, h: WIN_H + 26 },
  shapes: [
    // cabin surround
    { ...roundedRect(-WIN_W / 2 - 13, -WIN_H / 2 - 13, WIN_W + 26, WIN_H + 26, 34), fill: PALETTE.grey, stroke: PALETTE.ink },
    // the pane itself
    { ...roundedRect(-WIN_W / 2, -WIN_H / 2, WIN_W, WIN_H, 28), fill: viewColor, stroke: PALETTE.ink },
    // a single highlight streak — glass, in one mark
    {
      k: 'stroke',
      pts: wobblyLine([-22, -34], [-30, 18], 'prop-airplane-window-glint', 1.1, 12),
      pen: 'accent',
      size: 2.6,
      color: PALETTE.paper,
      opacity: 0.55,
    },
    // the breather hole, low on the pane where it actually sits
    {
      k: 'circle',
      cx: 0,
      cy: WIN_H / 2 - 22,
      r: 5,
      fill: holeLit ? PALETTE.coral : PALETTE.ink,
      stroke: PALETTE.ink,
      rough: 'detail',
      sw: 2.2,
      ...TINY,
    },
  ],
});

export const AirplaneWindow: React.FC<
  PropArgs & { viewColor?: string; holeLit?: boolean }
> = ({ viewColor = PALETTE.teal, holeLit = false, seed = 'airplane-window', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={airplaneWindowDef(viewColor, holeLit)} variant={`${seed}:${holeLit}`} />
  </PropFrame>
);

/**
 * The window in section: three panes, the gap between them, and the hole in the inner one.
 *
 * `focus` dims the panes that are not being talked about, which is the only reliable way to
 * point at one layer of three on a phone screen. `bow` bends the outer pane under pressure —
 * a few units is plenty; more reads as broken glass rather than as load.
 */
const paneStackDef = (focus: 'none' | 'outer' | 'middle' | 'inner', bow: number): AssetDef => {
  const dim = (which: 'outer' | 'middle' | 'inner') =>
    focus === 'none' || focus === which ? 1 : 0.28;
  const paneColor = (which: 'outer' | 'middle' | 'inner') =>
    focus === which ? (which === 'outer' ? PALETTE.coral : PALETTE.teal) : PALETTE.grey;

  return {
    id: 'prop-window-pane-stack',
    size: { w: 260, h: 240 },
    shapes: [
      // OUTER pane — the structural one. Bows toward the cabin under pressure.
      {
        k: 'path',
        d: `M -104 -114 Q ${-104 + bow} 0 -104 114 L -78 114 Q ${-78 + bow} 0 -78 -114 Z`,
        fill: paneColor('outer'),
        stroke: PALETTE.ink,
        opacity: dim('outer'),
      },
      // MIDDLE pane — the one with the hole in it
      {
        k: 'rect',
        x: -13,
        y: -114,
        w: 26,
        h: 228,
        fill: paneColor('middle'),
        stroke: PALETTE.ink,
        opacity: dim('middle'),
      },
      // INNER pane — the scratch pane you actually touch
      {
        k: 'rect',
        x: 78,
        y: -114,
        w: 22,
        h: 228,
        fill: paneColor('inner'),
        stroke: PALETTE.ink,
        opacity: dim('inner'),
      },
      // the breather hole, punched clean through the middle pane
      {
        k: 'rect',
        x: -14,
        y: 46,
        w: 28,
        h: 26,
        fill: PALETTE.paper,
        stroke: PALETTE.paper,
        rough: 'detail',
        sw: 1.4,
      },
      { k: 'circle', cx: 0, cy: 59, r: 12, fill: PALETTE.coral, stroke: PALETTE.ink, rough: 'detail', sw: 2.4, ...TINY },
    ],
  };
};

/**
 * Where each pane lands, in the prop's own units, so a scene can put a label on one without
 * guessing. Exported because a label that misses its pane is worse than no label — the first
 * pass had all three off by 150 px and the diagram read as three unnamed bars.
 */
export const PANE_X = { outer: -91, middle: 0, inner: 89 } as const;
/** Vertical centre of the breather hole, same units. */
export const PANE_HOLE_Y = 59;

export const WindowPaneStack: React.FC<
  PropArgs & { focus?: 'none' | 'outer' | 'middle' | 'inner'; bow?: number }
> = ({ focus = 'none', bow = 0, seed = 'pane-stack', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={paneStackDef(focus, bow)} variant={`${seed}:${focus}`} />
  </PropFrame>
);

/**
 * An aircraft in SIDE profile. Origin at the centre of the fuselage.
 *
 * This started life as a head-on cross-section — a circle with two window dots and a floor
 * line — and it rendered as a face: two eyes and a mouth, on a channel whose whole visual
 * language is faces. Nobody read it as an aeroplane. Side profile has a nose, a tail and a
 * wing, so it is unmistakable at a glance, which is the only thing a two-second cutaway shot
 * needs to be.
 */
const PLANE_SIDE: AssetDef = {
  id: 'prop-plane-side',
  size: { w: 400, h: 150 },
  shapes: [
    // fuselage: blunt nose left, tapering to a raised tail right
    {
      k: 'path',
      d: 'M -186 0 Q -186 -38 -140 -42 L 120 -42 Q 168 -40 196 -62 L 186 -18 Q 186 34 130 38 L -132 38 Q -186 34 -186 0 Z',
      fill: PALETTE.paperShade,
      stroke: PALETTE.ink,
    },
    // window row — many small ones, so they read as windows and never as eyes
    ...Array.from({ length: 11 }, (_, i): Shape => ({
      k: 'circle',
      cx: -150 + i * 28,
      cy: -12,
      r: 5.5,
      fill: PALETTE.teal,
      stroke: PALETTE.ink,
      rough: 'detail',
      sw: 1.6,
      ...TINY,
    })),
    // wing, swept back
    { k: 'polygon', pts: [[-30, 24], [66, 24], [116, 84], [26, 78]], fill: PALETTE.grey, stroke: PALETTE.ink },
    // tail fin
    { k: 'polygon', pts: [[132, -40], [172, -104], [196, -100], [188, -40]], fill: PALETTE.grey, stroke: PALETTE.ink },
    // tailplane
    { k: 'polygon', pts: [[150, -34], [206, -50], [210, -38], [156, -24]], fill: PALETTE.grey, stroke: PALETTE.ink, rough: 'detail', sw: 2.6 },
    // engine under the wing
    { ...roundedRect(-6, 30, 60, 26, 13), fill: PALETTE.greyDeep, stroke: PALETTE.ink, rough: 'detail', sw: 2.8 },
  ],
};

export const PlaneSection: React.FC<PropArgs> = ({ seed = 'plane-side', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={PLANE_SIDE} variant={seed} />
  </PropFrame>
);

/** A cloud: three overlapping lumps with a flat base. Origin at its centre. */
const CLOUD: AssetDef = {
  id: 'prop-cloud',
  size: { w: 120, h: 54 },
  shapes: [
    { k: 'ellipse', cx: -30, cy: 4, rx: 26, ry: 18, fill: PALETTE.paper, stroke: PALETTE.ink, rough: 'background' },
    { k: 'ellipse', cx: 4, cy: -6, rx: 32, ry: 24, fill: PALETTE.paper, stroke: PALETTE.ink, rough: 'background' },
    { k: 'ellipse', cx: 36, cy: 6, rx: 24, ry: 16, fill: PALETTE.paper, stroke: PALETTE.ink, rough: 'background' },
  ],
};

export const Cloud: React.FC<PropArgs> = ({ seed = 'cloud', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={CLOUD} variant={seed} />
  </PropFrame>
);

// ---------------------------------------------------------------------------
// escalator
// ---------------------------------------------------------------------------

/**
 * An escalator, three-quarter on: a rising stair, a solid balustrade, and the handrail.
 *
 * `stepPhase` (0..1) slides the treads up the incline. The steps are drawn as one repeating
 * unit offset by the phase and clipped by the balustrade, which is what sells motion without
 * animating any geometry — the phase is a transform on the OUTPUT, so the cache holds.
 */
const escalatorDef = (stepPhase: number): AssetDef => {
  const RISE = 26;
  const RUN = 34;
  const steps: Shape[] = [];
  for (let i = -1; i < 7; i++) {
    const p = i + stepPhase;
    const x = -150 + p * RUN;
    const y = 90 - p * RISE;
    steps.push({
      k: 'polygon',
      pts: [[x, y], [x + RUN, y], [x + RUN, y + 12], [x, y + 12]],
      fill: PALETTE.grey,
      stroke: PALETTE.ink,
      rough: 'detail',
      sw: 2.6,
    });
  }

  return {
    id: 'prop-escalator',
    size: { w: 340, h: 230 },
    shapes: [
      /*
       * ORDER IS THE WHOLE PROP. The first pass drew the balustrade last, over the treads, and
       * the escalator rendered as a plain grey diagonal bar with no steps in it at all — the
       * one feature that identifies the object was painted out by its own handrail.
       *
       * So the balustrade goes FIRST and sits behind and slightly above the step run, the way
       * the far side of a real escalator does, and the treads draw on top of it where they can
       * actually be seen.
       */
      // far balustrade, behind everything
      { k: 'polygon', pts: [[-158, 62], [178, -114], [178, -58], [-158, 118]], fill: PALETTE.grey, stroke: PALETTE.ink },
      // the truss the steps ride on
      { k: 'polygon', pts: [[-160, 110], [180, -66], [180, 130], [-160, 130]], fill: PALETTE.paperShade, stroke: PALETTE.ink },
      // treads, on top, where they read
      { k: 'group', shapes: steps, id: 'escalator-treads' },
      // near skirt panel — low, so it frames the steps rather than hiding them
      { k: 'polygon', pts: [[-160, 122], [180, -54], [180, -22], [-160, 154]], fill: PALETTE.greyDeep, stroke: PALETTE.ink },
      // handrail, riding the far balustrade
      { k: 'line', x1: -160, y1: 56, x2: 180, y2: -120, sw: 7 },
    ],
  };
};

export const Escalator: React.FC<PropArgs & { stepPhase?: number }> = ({
  stepPhase = 0,
  seed = 'escalator',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    {/* the phase quantises to 12 positions so the cache holds a small, finite set */}
    <RoughAsset def={escalatorDef(Math.round(stepPhase * 12) / 12)} variant={seed} />
  </PropFrame>
);

/**
 * The seam, in close-up: moving step on the left, fixed panel on the right, gap between.
 *
 * This is the whole episode in one drawing, so the gap is drawn WIDE — about 14 units where
 * life would give it two. Honest scale here would be a hairline that vanishes on a phone,
 * and a diagram nobody can see explains nothing.
 */
const seamDef = (gapLit: boolean, brushBend: number): AssetDef => ({
  id: 'prop-escalator-seam',
  size: { w: 200, h: 220 },
  shapes: [
    // the moving step
    { k: 'rect', x: -110, y: -60, w: 96, h: 150, fill: PALETTE.grey, stroke: PALETTE.ink },
    // tread grooves — what makes it read as an escalator step and not a box
    ...[-92, -76, -60, -44, -28].map((x): Shape => ({
      k: 'line', x1: x, y1: -56, x2: x, y2: 86, rough: 'detail', sw: 2.2, single: true, opacity: 0.75,
    })),
    // THE GAP
    {
      k: 'rect',
      x: -14,
      y: -60,
      w: 15,
      h: 150,
      fill: gapLit ? PALETTE.coral : PALETTE.ink,
      stroke: PALETTE.ink,
      rough: 'detail',
      sw: 2.4,
    },
    // the stationary side panel
    { k: 'rect', x: 1, y: -96, w: 100, h: 186, fill: PALETTE.greyDeep, stroke: PALETTE.ink },
    // the brush strip, bristles bending by `brushBend`
    { k: 'rect', x: 1, y: 28, w: 16, h: 26, fill: PALETTE.ink, stroke: PALETTE.ink, rough: 'detail', sw: 2.2 },
    ...Array.from({ length: 7 }, (_, i): Shape => ({
      k: 'stroke',
      pts: wobblyLine([1, 32 + i * 3.2], [-14 - brushBend, 34 + i * 3.2], `seam-bristle-${i}`, 0.8, 6),
      pen: 'hair',
      size: 1.9,
      color: PALETTE.ink,
    })),
  ],
});

export const EscalatorSeam: React.FC<
  PropArgs & { gapLit?: boolean; brushBend?: number }
> = ({ gapLit = false, brushBend = 0, seed = 'escalator-seam', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset
      def={seamDef(gapLit, Math.round(brushBend))}
      variant={`${seed}:${gapLit}`}
    />
  </PropFrame>
);

/** A single loose shoelace — the thing that gets eaten. A gesture, so: pen strokes. */
const laceDef = (pull: number): AssetDef => ({
  id: 'prop-shoelace',
  shapes: [
    {
      k: 'stroke',
      pts: wobblyLine([-40, 0], [30 + pull, 18 + pull * 0.4], 'prop-lace-a', 2.4, 18),
      pen: 'limb',
      size: 3.4,
      color: PALETTE.paper,
    },
    {
      k: 'stroke',
      pts: wobblyLine([-38, 8], [26 + pull, 30 + pull * 0.4], 'prop-lace-b', 2.4, 18),
      pen: 'limb',
      size: 3.4,
      color: PALETTE.paper,
    },
  ],
});

export const Shoelace: React.FC<PropArgs & { pull?: number }> = ({
  pull = 0,
  seed = 'shoelace',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={laceDef(Math.round(pull / 4) * 4)} variant={seed} />
  </PropFrame>
);
