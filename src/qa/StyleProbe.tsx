/**
 * StyleProbe.tsx — QA-only. Proves the V2 stylizer works before anything is built on it.
 *
 * Shows every Rough.js primitive at every roughness token, every fill strategy, and every
 * perfect-freehand pen, side by side. If the sketch language is wrong, it is wrong here —
 * and fixing it here costs seconds instead of rebuilding 27 assets.
 */

import React from 'react';
import { Stage } from '../components/Stage';
import { RoughShapes } from '../assets/RoughAsset';
import { freehandPath, arcPoints, wobblyLine, scribblePoints, quadPoints } from '../freehand/stroke';
import { PALETTE, FONTS, ROUGH, FREEHAND } from '../style/tokens';
import type { Shape } from '../assets/shapes';
import { ring, spoke, roundedRect } from '../assets/shapes';

const ROUGH_TOKENS = Object.keys(ROUGH) as (keyof typeof ROUGH)[];
const PENS = Object.keys(FREEHAND) as (keyof typeof FREEHAND)[];

const label = (x: number, y: number, t: string, size = 20) => (
  <text x={x} y={y} fontFamily={FONTS.hand} fontSize={size} fill={PALETTE.inkSoft} textAnchor="middle">
    {t}
  </text>
);

/** A clean semantic clock — the same geometry drawn at each roughness token. */
function clockShapes(fill: string): Shape[] {
  return [
    { k: 'circle', cx: 0, cy: 0, r: 34, fill, stroke: PALETTE.ink },
    ...Array.from({ length: 12 }, (_, i) => ({
      ...spoke(0, 0, 26, 32, i * 30),
      rough: 'detail' as const,
      single: true,
    })),
    { k: 'line', x1: 0, y1: 0, x2: 0, y2: -20, rough: 'detail', sw: 4 },
    { k: 'line', x1: 0, y1: 0, x2: 15, y2: 8, rough: 'detail', sw: 4 },
    { k: 'circle', cx: 0, cy: 0, r: 3, fill: PALETTE.ink, rough: 'detail' },
  ];
}

export const StyleProbe: React.FC = () => {
  return (
    <Stage>
      <>
        <text x={30} y={54} fontFamily={FONTS.display} fontSize={44} fill={PALETTE.ink}>
          V2 STYLE PROBE — ROUGH.JS + PERFECT-FREEHAND
        </text>

        {/* ---- row 1: the same clock at every roughness token ---- */}
        {label(540, 100, 'same clean geometry, one token per column', 22)}
        {ROUGH_TOKENS.map((tok, i) => {
          const cx = 110 + i * 172;
          return (
            <g key={tok}>
              <g transform={`translate(${cx} 200) scale(1.35)`}>
                <RoughShapes
                  id={`probe-clock-${tok}`}
                  shapes={clockShapes(PALETTE.paper).map((s) => ({
                    ...s,
                    rough: s.rough === 'detail' ? tok : tok,
                  }))}
                />
              </g>
              {label(cx, 285, tok)}
            </g>
          );
        })}

        {/* ---- row 2: primitives ---- */}
        {label(540, 340, 'primitives', 22)}
        <g transform="translate(0 30)">
          <RoughShapes
            id="probe-prims"
            shapes={[
              { k: 'rect', x: 60, y: 360, w: 140, h: 90, fill: PALETTE.gold },
              roundedRect(240, 360, 140, 90, 22) as Shape,
              { k: 'ellipse', cx: 490, cy: 405, rx: 72, ry: 45, fill: PALETTE.teal },
              { k: 'polygon', pts: [[620, 450], [690, 355], [760, 450]], fill: PALETTE.coral },
              { k: 'arc', cx: 890, cy: 410, rx: 62, ry: 55, start: 20, stop: 320, closed: true, fill: PALETTE.violet },
            ]}
          />
        </g>
        {label(130, 500, 'rect')}
        {label(310, 500, 'roundedRect (path)')}
        {label(490, 500, 'ellipse')}
        {label(690, 500, 'polygon')}
        {label(890, 500, 'arc')}

        {/* ---- row 3: fill strategies ---- */}
        {label(540, 560, 'fill strategies — solid is the house default', 22)}
        <RoughShapes
          id="probe-fills"
          shapes={[
            { k: 'rect', x: 70, y: 590, w: 190, h: 120, fill: PALETTE.gold, fillStyle: 'solid' },
            { k: 'rect', x: 300, y: 590, w: 190, h: 120, fill: PALETTE.gold, fillStyle: 'hachure' },
            { k: 'rect', x: 530, y: 590, w: 190, h: 120, fill: PALETTE.gold, fillStyle: 'crossHatch' },
            { k: 'rect', x: 760, y: 590, w: 190, h: 120, fill: PALETTE.gold, fillStyle: 'sparse' },
          ]}
        />
        {label(165, 740, 'solid')}
        {label(395, 740, 'hachure')}
        {label(625, 740, 'cross-hatch')}
        {label(855, 740, 'sparse')}

        {/* ---- row 4: perfect-freehand pens ---- */}
        {label(540, 810, 'perfect-freehand pens — gesture, not structure', 22)}
        {PENS.map((pen, i) => {
          const x0 = 70 + i * 195;
          const pts = quadPoints([x0, 900], [x0 + 80, 840], [x0 + 160, 900], 18);
          return (
            <g key={pen}>
              <path d={freehandPath(pts, pen, `probe-pen-${pen}`)} fill={PALETTE.ink} />
              {label(x0 + 80, 950, pen)}
            </g>
          );
        })}

        {/* ---- row 5: gestural marks ---- */}
        {label(540, 1010, 'gestural marks', 22)}
        <path d={freehandPath(arcPoints(180, 1100, 70, 40, 180, 360), 'face', 'probe-arc')} fill={PALETTE.ink} />
        {label(180, 1180, 'arc (mouth / brow)')}

        <path d={freehandPath(wobblyLine([330, 1100], [520, 1100], 'probe-wob', 5), 'accent', 'probe-wobl')} fill={PALETTE.ink} />
        {label(425, 1180, 'wobbly line')}

        <path d={freehandPath(scribblePoints(680, 1090, 130, 90, 'probe-scrib', 4), 'scribble', 'probe-scribs')} fill={PALETTE.inkSoft} />
        {label(680, 1180, 'scribble')}

        <path
          d={freehandPath(
            [[880, 1140], [910, 1060], [940, 1120], [975, 1050], [1005, 1110]],
            'accent',
            'probe-zig',
          )}
          fill={PALETTE.coral}
        />
        {label(940, 1180, 'zigzag accent')}

        {/* ---- row 6: determinism proof ---- */}
        {label(540, 1250, 'determinism — same id renders identically, different id differs', 22)}
        {['alpha', 'alpha', 'alpha', 'beta', 'gamma'].map((id, i) => (
          <g key={i} transform={`translate(${140 + i * 190} 1370)`}>
            <RoughShapes
              id={`probe-det-${id}`}
              shapes={[{ k: 'rect', x: -70, y: -55, w: 140, h: 110, fill: PALETTE.teal, rough: 'prop' }]}
            />
            {label(0, 95, id)}
          </g>
        ))}
        {label(540, 1500, 'first three are byte-identical; last two differ', 20)}

        {/* ---- row 7: ring helper + background token ---- */}
        {label(540, 1570, 'ring() helper + background token (thin, loose, recedes)', 22)}
        <RoughShapes
          id="probe-ring"
          shapes={[
            ...ring(300, 1710, 90, 9).map((p) => ({
              k: 'circle' as const,
              cx: p[0],
              cy: p[1],
              r: 13,
              fill: PALETTE.gold,
              rough: 'detail' as const,
            })),
            { k: 'rect', x: 560, y: 1620, w: 400, h: 180, rough: 'background', stroke: PALETTE.greyDeep },
            { k: 'line', x1: 560, y1: 1710, x2: 960, y2: 1710, rough: 'background', stroke: PALETTE.greyDeep },
          ]}
        />
      </>
    </Stage>
  );
};
