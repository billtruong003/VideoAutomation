/**
 * machines.tsx — the everyday machines these episodes take apart.
 *
 *      DESIGN CLEANLY.  RENDER IMPERFECTLY.
 *
 * Half of this file is objects (a pump, a microwave, a manhole cover) and half is CUTAWAYS.
 * The cutaways are the reason the file exists: a nozzle shutting itself off and a mesh
 * blocking a wavelength are both invisible events, and an explainer that cannot draw its own
 * mechanism is just a voice over a photograph.
 *
 * Rules the diagrams follow, learned from the first pass:
 *   - flat side-on, never perspective; a 2-unit sensing hole in perspective is nothing
 *   - the part being spoken about is the only saturated thing on screen; everything else
 *     drops to grey, because on a phone "look here" has to be done with contrast
 *   - anything that moves per frame is a PROP, not new geometry, so the Rough.js cache holds
 */

import React from 'react';
import { RoughAsset } from '../assets/RoughAsset';
import { PropFrame, type PropArgs } from '../assets/PropFrame';
import { PALETTE } from '../style/tokens';
import { TINY, roundedRect, type AssetDef, type Shape } from '../assets/shapes';
import { wobblyLine } from '../lib/pathpoints';

const focusColor = (on: boolean, colour: string) => (on ? colour : PALETTE.grey);

// ---------------------------------------------------------------------------
// fuel
// ---------------------------------------------------------------------------

/** A forecourt pump: cabinet, screen, hose, nozzle in its holster. Origin on the ground. */
const gasPumpDef = (display: string): AssetDef => ({
  id: 'prop-gas-pump',
  size: { w: 120, h: 210 },
  shapes: [
    { ...roundedRect(-52, -200, 104, 200, 12), fill: PALETTE.paperShade, stroke: PALETTE.ink },
    { ...roundedRect(-38, -184, 76, 52, 6), fill: display === 'FULL' ? PALETTE.gold : PALETTE.grey, stroke: PALETTE.ink },
    // two readout bars — a screen, without committing to numbers that would need a font
    { k: 'line', x1: -28, y1: -168, x2: 22, y2: -168, rough: 'detail', sw: 3.4, single: true },
    { k: 'line', x1: -28, y1: -152, x2: 6, y2: -152, rough: 'detail', sw: 3.4, single: true },
    // holster
    { ...roundedRect(30, -120, 26, 40, 5), fill: PALETTE.greyDeep, stroke: PALETTE.ink, rough: 'detail', sw: 2.8 },
    { k: 'line', x1: -52, y1: -6, x2: 52, y2: -6, rough: 'background', sw: 3.4 },
  ],
});

export const GasPump: React.FC<PropArgs & { display?: string }> = ({
  display = '',
  seed = 'gas-pump',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={gasPumpDef(display)} variant={`${seed}:${display}`} />
  </PropFrame>
);

/**
 * A car in side profile, with an open filler flap. Origin on the ground at its centre.
 *
 * The forecourt scenes were staged around "Bill filling a car" and there was no car in them —
 * the nozzle hung in mid-air beside his head and read as an accessory rather than as a thing
 * plugged into something. A vehicle is what makes the nozzle's position mean anything.
 */
const carSideDef = (body: string, flapOpen: boolean): AssetDef => ({
  id: 'prop-car-side',
  size: { w: 420, h: 170 },
  shapes: [
    // body: a long lozenge with a cabin bubble on top
    { ...roundedRect(-200, -84, 400, 84, 22), fill: body, stroke: PALETTE.ink },
    { k: 'path', d: 'M -110 -84 Q -70 -150 30 -150 Q 110 -148 140 -84 Z', fill: PALETTE.paperShade, stroke: PALETTE.ink },
    { k: 'line', x1: 16, y1: -148, x2: 16, y2: -84, rough: 'detail', sw: 3, single: true },
    // wheels
    { k: 'circle', cx: -118, cy: 0, r: 40, fill: PALETTE.ink, stroke: PALETTE.ink },
    { k: 'circle', cx: -118, cy: 0, r: 17, fill: PALETTE.grey, stroke: PALETTE.ink, rough: 'detail', sw: 2.6 },
    { k: 'circle', cx: 118, cy: 0, r: 40, fill: PALETTE.ink, stroke: PALETTE.ink },
    { k: 'circle', cx: 118, cy: 0, r: 17, fill: PALETTE.grey, stroke: PALETTE.ink, rough: 'detail', sw: 2.6 },
    // the filler flap, on the rear quarter
    {
      ...roundedRect(-190, -66, 34, 34, 5),
      fill: flapOpen ? PALETTE.paper : body,
      stroke: PALETTE.ink,
      rough: 'detail',
      sw: 2.8,
    },
    ...(flapOpen
      ? ([{ k: 'circle', cx: -173, cy: -49, r: 11, fill: PALETTE.ink, stroke: PALETTE.ink, rough: 'detail', sw: 2, ...TINY }] as Shape[])
      : []),
  ],
});

/** A car, side on — the thing the nozzle is actually plugged into. */
export const CarSide: React.FC<PropArgs & { body?: string; flapOpen?: boolean }> = ({
  body = PALETTE.teal,
  flapOpen = true,
  seed = 'car-side',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={carSideDef(body, flapOpen)} variant={`${seed}:${flapOpen}`} />
  </PropFrame>
);

/** The nozzle itself, held. Origin at the grip so a hand can carry it. */
const NOZZLE: AssetDef = {
  id: 'prop-fuel-nozzle',
  size: { w: 96, h: 54 },
  shapes: [
    { ...roundedRect(-34, -16, 44, 30, 8), fill: PALETTE.coral, stroke: PALETTE.ink },
    { k: 'polygon', pts: [[10, -12], [56, -7], [56, 3], [10, 10]], fill: PALETTE.greyDeep, stroke: PALETTE.ink },
    // trigger
    { k: 'line', x1: -18, y1: 14, x2: -8, y2: 26, sw: 3.6 },
    { k: 'line', x1: -34, y1: 6, x2: -46, y2: 12, sw: 3.6 },
  ],
};

export const FuelNozzle: React.FC<PropArgs> = ({ seed = 'fuel-nozzle', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={NOZZLE} variant={seed} />
  </PropFrame>
);

/**
 * The nozzle in section, inside the filler neck — the money diagram of the gas-pump episode.
 *
 *   fuelLevel   0..1 how far the fuel has risen up the neck (1 covers the sensing hole)
 *   holeLit     the sensing hole is the subject right now
 *   passageLit  the air passage is the subject right now
 *   valveShut   the shutoff has fired
 *
 * The sensing hole is drawn at 6 units — far bigger than life — for the same reason the
 * airplane breather hole is: an honest one would be invisible at phone size.
 */
const nozzleCutawayDef = (
  fuelLevel: number,
  holeLit: boolean,
  passageLit: boolean,
  valveShut: boolean,
): AssetDef => {
  const neckTop = -120;
  const neckBottom = 90;
  const fuelY = neckBottom - fuelLevel * (neckBottom - neckTop) * 0.72;

  return {
    id: 'prop-nozzle-cutaway',
    size: { w: 260, h: 240 },
    shapes: [
      // filler neck walls
      { k: 'rect', x: -74, y: neckTop, w: 16, h: neckBottom - neckTop, fill: PALETTE.grey, stroke: PALETTE.ink },
      { k: 'rect', x: 58, y: neckTop, w: 16, h: neckBottom - neckTop, fill: PALETTE.grey, stroke: PALETTE.ink },
      // fuel in the neck
      { k: 'rect', x: -58, y: fuelY, w: 116, h: neckBottom - fuelY, fill: PALETTE.gold, stroke: PALETTE.ink, rough: 'background', opacity: 0.9 },
      // the nozzle spout, down the middle
      { k: 'rect', x: -22, y: neckTop - 44, w: 44, h: 150, fill: PALETTE.paperShade, stroke: PALETTE.ink },
      // the air passage, running up the spout wall
      {
        k: 'rect',
        x: -18,
        y: neckTop - 40,
        w: 9,
        h: 142,
        fill: focusColor(passageLit, PALETTE.teal),
        stroke: PALETTE.ink,
        rough: 'detail',
        sw: 2.2,
        opacity: passageLit ? 1 : 0.6,
      },
      // THE SENSING HOLE — where the passage opens to the outside, near the tip
      {
        k: 'circle',
        cx: -13.5,
        cy: 92,
        r: 6,
        fill: fuelLevel >= 1 ? PALETTE.gold : focusColor(holeLit, PALETTE.coral),
        stroke: PALETTE.ink,
        rough: 'detail',
        sw: 2.2,
        ...TINY,
      },
      // the diaphragm chamber at the top of the passage
      { k: 'ellipse', cx: 0, cy: neckTop - 60, rx: 30, ry: 18, fill: PALETTE.paperShade, stroke: PALETTE.ink },
      {
        k: 'stroke',
        pts: wobblyLine([-26, neckTop - 60 + (valveShut ? 8 : 0)], [26, neckTop - 60 + (valveShut ? 8 : 0)], 'nozzle-diaphragm', 1.4, 12),
        pen: 'limb',
        size: 4,
        color: valveShut ? PALETTE.coral : PALETTE.ink,
      },
      // the valve plate, down when shut
      {
        k: 'rect',
        x: -20,
        y: valveShut ? -14 : -40,
        w: 40,
        h: 10,
        fill: valveShut ? PALETTE.coral : PALETTE.greyDeep,
        stroke: PALETTE.ink,
        rough: 'detail',
        sw: 2.6,
      },
    ],
  };
};

export const NozzleCutaway: React.FC<
  PropArgs & { fuelLevel?: number; holeLit?: boolean; passageLit?: boolean; valveShut?: boolean }
> = ({
  fuelLevel = 0,
  holeLit = false,
  passageLit = false,
  valveShut = false,
  seed = 'nozzle-cutaway',
  ...rest
}) => {
  // Quantise the level so a 30 fps rise mints ~16 cache entries rather than 900.
  const q = Math.round(Math.min(1, Math.max(0, fuelLevel)) * 16) / 16;
  return (
    <PropFrame seed={seed} {...rest}>
      <RoughAsset
        def={nozzleCutawayDef(q, holeLit, passageLit, valveShut)}
        variant={`${seed}:${q}:${holeLit}${passageLit}${valveShut}`}
      />
    </PropFrame>
  );
};

// ---------------------------------------------------------------------------
// microwave
// ---------------------------------------------------------------------------

/** A countertop microwave: body, door with mesh window, control strip. Origin on the counter. */
const microwaveDef = (lit: boolean, glasses: boolean): AssetDef => ({
  id: 'prop-microwave',
  size: { w: 240, h: 130 },
  shapes: [
    { ...roundedRect(-120, -126, 240, 126, 8), fill: PALETTE.paperShade, stroke: PALETTE.ink },
    // door window
    { ...roundedRect(-108, -114, 156, 102, 5), fill: lit ? PALETTE.gold : PALETTE.greyDeep, stroke: PALETTE.ink },
    // the plate inside
    { k: 'ellipse', cx: -30, cy: -34, rx: 40, ry: 12, fill: PALETTE.paper, stroke: PALETTE.ink, rough: 'detail', sw: 2.4 },
    // control strip
    { ...roundedRect(56, -114, 56, 102, 4), fill: PALETTE.grey, stroke: PALETTE.ink, rough: 'detail', sw: 2.6 },
    { k: 'circle', cx: 84, cy: -88, r: 13, fill: PALETTE.paperShade, stroke: PALETTE.ink, rough: 'detail', sw: 2.4 },
    ...[-52, -38, -24].map((y): Shape => ({
      k: 'line', x1: 66, y1: y, x2: 102, y2: y, rough: 'detail', sw: 2.4, single: true, opacity: 0.7,
    })),
    // the gag: nerdy glasses land on the door
    ...(glasses
      ? ([
          { k: 'rect', x: -104, y: -84, w: 60, h: 34, fill: PALETTE.paper, stroke: PALETTE.ink, rough: 'detail', sw: 4 },
          { k: 'rect', x: -34, y: -84, w: 60, h: 34, fill: PALETTE.paper, stroke: PALETTE.ink, rough: 'detail', sw: 4 },
          { k: 'line', x1: -44, y1: -70, x2: -34, y2: -70, sw: 4 },
        ] as Shape[])
      : []),
  ],
});

export const Microwave: React.FC<PropArgs & { lit?: boolean; glasses?: boolean }> = ({
  lit = true,
  glasses = false,
  seed = 'microwave',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={microwaveDef(lit, glasses)} variant={`${seed}:${lit}${glasses}`} />
  </PropFrame>
);

/**
 * The mesh, filling frame.
 *
 * A real microwave screen is a punched sheet of round holes; this draws a honeycomb because
 * at Shorts size a hex grid reads as "deliberate engineered screen" where circles read as
 * "polka dots". The distinction the episode needs is hole-versus-metal, and hexagons carry it
 * with fewer marks.
 */
const meshDef = (cols: number, rows: number, cell: number, lit: boolean): AssetDef => {
  const shapes: Shape[] = [
    { k: 'rect', x: -cols * cell * 0.5 - 8, y: -rows * cell * 0.44 - 8, w: cols * cell + 16, h: rows * cell * 0.88 + 16, fill: PALETTE.ink, stroke: PALETTE.ink },
  ];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * cell + (r % 2 ? cell / 2 : 0);
      const y = (r - (rows - 1) / 2) * cell * 0.88;
      const rr = cell * 0.36;
      shapes.push({
        k: 'polygon',
        pts: [
          [x + rr, y], [x + rr / 2, y + rr * 0.87], [x - rr / 2, y + rr * 0.87],
          [x - rr, y], [x - rr / 2, y - rr * 0.87], [x + rr / 2, y - rr * 0.87],
        ],
        fill: lit ? PALETTE.teal : PALETTE.paperShade,
        stroke: PALETTE.ink,
        rough: 'detail',
        sw: 1.6,
        ...TINY,
      });
    }
  }
  return { id: 'prop-microwave-mesh', size: { w: cols * cell, h: rows * cell }, shapes };
};

export const MeshPanel: React.FC<
  PropArgs & { cols?: number; rows?: number; cell?: number; lit?: boolean }
> = ({ cols = 9, rows = 9, cell = 34, lit = false, seed = 'mesh', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={meshDef(cols, rows, cell, lit)} variant={`${seed}:${lit}`} />
  </PropFrame>
);

// ---------------------------------------------------------------------------
// car
// ---------------------------------------------------------------------------

/**
 * The instrument cluster, close up: fuel gauge, pump icon, and the arrow the episode is about.
 *
 * `arrow` is 'none' | 'left' | 'right'. The arrow is drawn oversized relative to the icon,
 * because the joke is that something this findable was never found — and a truthfully tiny
 * arrow would prove the wrong point by being unreadable here too.
 */
const dashboardDef = (arrow: 'none' | 'left' | 'right', iconLit: boolean, dim: boolean): AssetDef => {
  const grey = dim ? 0.25 : 1;
  const shapes: Shape[] = [
    { ...roundedRect(-150, -96, 300, 192, 20), fill: PALETTE.paperShade, stroke: PALETTE.ink },
    // gauge arc + needle
    { k: 'arc', cx: 0, cy: 30, rx: 92, ry: 92, start: Math.PI, stop: Math.PI * 2, fill: PALETTE.paper, stroke: PALETTE.ink, opacity: grey },
    { k: 'line', x1: 0, y1: 30, x2: -52, y2: -34, sw: 5, opacity: grey },
    { k: 'line', x1: -92, y1: 30, x2: -76, y2: 30, rough: 'detail', sw: 3.4, opacity: grey },
    { k: 'line', x1: 76, y1: 30, x2: 92, y2: 30, rough: 'detail', sw: 3.4, opacity: grey },
    // the little fuel pump icon
    { ...roundedRect(-16, -14, 24, 32, 3), fill: iconLit ? PALETTE.gold : PALETTE.ink, stroke: PALETTE.ink, rough: 'detail', sw: 2.4 },
    { k: 'line', x1: 8, y1: -6, x2: 17, y2: -6, rough: 'detail', sw: 2.6, single: true },
    { k: 'line', x1: 17, y1: -6, x2: 17, y2: 10, rough: 'detail', sw: 2.6, single: true },
  ];

  if (arrow !== 'none') {
    const s = arrow === 'left' ? -1 : 1;
    const x0 = arrow === 'left' ? -26 : 18;
    shapes.push({
      k: 'polygon',
      pts: [[x0 + s * 22, 2], [x0, -12], [x0, 16]],
      fill: PALETTE.coral,
      stroke: PALETTE.ink,
      rough: 'detail',
      sw: 2.6,
    });
  }

  return { id: 'prop-dashboard', size: { w: 300, h: 192 }, shapes };
};

export const DashboardCluster: React.FC<
  PropArgs & { arrow?: 'none' | 'left' | 'right'; iconLit?: boolean; dim?: boolean }
> = ({ arrow = 'none', iconLit = false, dim = false, seed = 'dashboard', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={dashboardDef(arrow, iconLit, dim)} variant={`${seed}:${arrow}${iconLit}${dim}`} />
  </PropFrame>
);

/** A car from above, with a fuel door on one side. Origin at the car's centre. */
const carTopDef = (door: 'left' | 'right', doorOpen: boolean, body: string): AssetDef => {
  const s = door === 'left' ? -1 : 1;
  return {
    id: 'prop-car-top',
    size: { w: 110, h: 200 },
    shapes: [
      { ...roundedRect(-52, -96, 104, 192, 26), fill: body, stroke: PALETTE.ink },
      // windscreen + rear screen, so it reads as a car and has a front
      { ...roundedRect(-38, -62, 76, 34, 10), fill: PALETTE.paperShade, stroke: PALETTE.ink, rough: 'detail', sw: 2.6 },
      { ...roundedRect(-38, 26, 76, 30, 10), fill: PALETTE.paperShade, stroke: PALETTE.ink, rough: 'detail', sw: 2.6 },
      { k: 'line', x1: -40, y1: -12, x2: 40, y2: -12, rough: 'detail', sw: 2.4, single: true, opacity: 0.6 },
      // the fuel door
      {
        ...roundedRect(s * 46 - (door === 'left' ? 8 : 0), 38, 14, 24, 4),
        fill: doorOpen ? PALETTE.teal : PALETTE.greyDeep,
        stroke: PALETTE.ink,
        rough: 'detail',
        sw: 2.4,
      },
    ],
  };
};

export const CarTop: React.FC<
  PropArgs & { door?: 'left' | 'right'; doorOpen?: boolean; body?: string }
> = ({ door = 'left', doorOpen = false, body = PALETTE.teal, seed = 'car-top', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={carTopDef(door, doorOpen, body)} variant={`${seed}:${door}${doorOpen}`} />
  </PropFrame>
);

// ---------------------------------------------------------------------------
// street
// ---------------------------------------------------------------------------

/**
 * A manhole cover, round or square, seen flat or in section.
 *
 * Both shapes come from one definition so the episode's whole argument — same object, one
 * property changed — is literally one prop switching a flag.
 */
const manholeCoverDef = (shape: 'round' | 'square'): AssetDef => ({
  id: `prop-manhole-${shape}`,
  size: { w: 130, h: 130 },
  shapes:
    shape === 'round'
      ? [
          { k: 'circle', cx: 0, cy: 0, r: 62, fill: PALETTE.greyDeep, stroke: PALETTE.ink },
          { k: 'circle', cx: 0, cy: 0, r: 50, fill: 'none', stroke: PALETTE.ink, rough: 'detail', sw: 2.6 },
          ...Array.from({ length: 8 }, (_, i): Shape => {
            const a = (i / 8) * Math.PI * 2;
            return {
              k: 'line',
              x1: Math.cos(a) * 20, y1: Math.sin(a) * 20,
              x2: Math.cos(a) * 44, y2: Math.sin(a) * 44,
              rough: 'detail', sw: 2.4, single: true, opacity: 0.75,
            };
          }),
        ]
      : [
          { k: 'rect', x: -58, y: -58, w: 116, h: 116, fill: PALETTE.greyDeep, stroke: PALETTE.ink },
          { k: 'rect', x: -46, y: -46, w: 92, h: 92, fill: 'none', stroke: PALETTE.ink, rough: 'detail', sw: 2.6 },
          ...[-24, 0, 24].map((y): Shape => ({
            k: 'line', x1: -36, y1: y, x2: 36, y2: y, rough: 'detail', sw: 2.4, single: true, opacity: 0.75,
          })),
        ],
});

export const ManholeCover: React.FC<PropArgs & { shape?: 'round' | 'square' }> = ({
  shape = 'round',
  seed = 'manhole-cover',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={manholeCoverDef(shape)} variant={`${seed}:${shape}`} />
  </PropFrame>
);

/** The opening in section: a rim and a shaft dropping into the dark. Origin at road level. */
const SHAFT: AssetDef = {
  id: 'prop-manhole-shaft',
  size: { w: 160, h: 220 },
  shapes: [
    { k: 'rect', x: -78, y: 0, w: 16, h: 200, fill: PALETTE.grey, stroke: PALETTE.ink },
    { k: 'rect', x: 62, y: 0, w: 16, h: 200, fill: PALETTE.grey, stroke: PALETTE.ink },
    { k: 'rect', x: -62, y: 0, w: 124, h: 200, fill: PALETTE.nightWall, stroke: 'none' },
    // the rim the cover rests on — the ledge that makes a circle safe
    { k: 'line', x1: -92, y1: 0, x2: -62, y2: 0, sw: 5 },
    { k: 'line', x1: 62, y1: 0, x2: 92, y2: 0, sw: 5 },
  ],
};

export const ManholeShaft: React.FC<PropArgs> = ({ seed = 'manhole-shaft', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={SHAFT} variant={seed} />
  </PropFrame>
);
