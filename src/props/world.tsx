/**
 * world.tsx — the set dressing that tells you where you are and what time it is.
 *
 * Windows, daylight, lamps, a door, and the soft-furnishing props for the "comfortable
 * modern venue" beat. All drawn in character units. Floor-standing props put their local
 * origin on the ground at their centre so a scene can place them on a floor line; wall
 * and sky props are centred on themselves; the pendant lamp hangs from its origin.
 */

import React from 'react';
import { PALETTE, STROKE, HAND_STROKE } from '../lib/style';
import { DoodleProp, type DoodlePropProps } from '../components/DoodleProp';

/** Every prop takes the standard placement contract; children come from the art itself. */
type PropArt = Omit<DoodlePropProps, 'children'>;

// ---------------------------------------------------------------------------
// window + sky
// ---------------------------------------------------------------------------

const WINDOW_GLASS =
  'M -44 -37 C -20 -39 20 -39.5 44.5 -37.5 C 46 -12 45.5 12 44 38 ' +
  'C 20 39.5 -20 40 -44.5 38.5 C -46 12.5 -45.5 -12 -44 -37 Z';

/** A four-pane window — the one honest clock in a room that has hidden all the others. */
export const Window: React.FC<PropArt & { viewColor?: string; daylight?: boolean }> = ({
  viewColor,
  daylight = false,
  seed = 'window',
  ...rest
}) => {
  const glass = viewColor ?? (daylight ? PALETTE.teal : PALETTE.grey);
  return (
    <DoodleProp seed={seed} {...rest}>
      <path d={WINDOW_GLASS} fill={glass} transform="translate(2.6 2.2)" />
      <path d={WINDOW_GLASS} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} strokeLinejoin="round" />
      {/* mullions — neither one is straight, and they don't cross at dead centre */}
      <path d="M 0.8 -38 C -0.6 -13 0.6 13 -0.4 39" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} {...HAND_STROKE} />
      <path d="M -44.5 1 C -20 -0.4 20 0.8 44.5 -0.6" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} {...HAND_STROKE} />
      {/* sill, overshooting the frame on the left the way a quick line does */}
      <path d="M -51 41.5 C -20 43 20 43.5 49.5 42" stroke={PALETTE.ink} strokeWidth={STROKE.prop} {...HAND_STROKE} />
      {daylight && (
        <>
          <path d="M -34 24 L -12 -28" stroke={PALETTE.gold} strokeWidth={STROKE.propFine} {...HAND_STROKE} opacity={0.8} />
          <path d="M -23 26 L -4 -20" stroke={PALETTE.gold} strokeWidth={STROKE.fine} {...HAND_STROKE} opacity={0.65} />
        </>
      )}
    </DoodleProp>
  );
};

const SUN_DISC =
  'M -15.5 -2 C -16 -11 -9 -16.5 0.5 -16 C 10 -15.5 16.5 -9.5 16 0.5 ' +
  'C 15.5 9.5 9 16 -0.5 15.5 C -10 15 -15 9 -15.5 -2 Z';

/** Sun — the outside world, used mainly to prove how much of it got missed. */
export const Sun: React.FC<PropArt & { rayLength?: number }> = ({
  rayLength = 12,
  seed = 'sun',
  ...rest
}) => {
  const jitter = [0.9, -1.6, 1.3, -0.6, 1.7, -1.2, 0.4, -1.8];
  const rays = jitter
    .map((j, i) => {
      const a = ((i * 45 + j * 3.2) * Math.PI) / 180;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const r0 = 21 + j * 0.8;
      const r1 = r0 + rayLength + j * 1.4;
      return `M ${(c * r0).toFixed(2)} ${(s * r0).toFixed(2)} L ${(c * r1).toFixed(2)} ${(s * r1).toFixed(2)}`;
    })
    .join(' ');
  return (
    <DoodleProp seed={seed} {...rest}>
      <path d={SUN_DISC} fill={PALETTE.gold} transform="translate(2.2 1.8)" />
      <path d={SUN_DISC} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} strokeLinejoin="round" />
      <path d={rays} stroke={PALETTE.ink} strokeWidth={STROKE.propFine} {...HAND_STROKE} />
    </DoodleProp>
  );
};

const MOON_D =
  'M 6 -18 C -8 -19 -18 -10 -17.5 1 C -17 12 -6 20 7 18.5 ' +
  'C -2 12.5 -6.5 6 -6 -0.5 C -5.5 -7.5 -1 -13.5 6 -18 Z';

/** Crescent moon — the "it is somehow this late again" prop. */
export const Moon: React.FC<PropArt> = ({ seed = 'moon', ...rest }) => (
  <DoodleProp seed={seed} {...rest}>
    <path d={MOON_D} fill={PALETTE.gold} transform="translate(2.2 1.8)" />
    <path d={MOON_D} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} strokeLinejoin="round" />
  </DoodleProp>
);

// ---------------------------------------------------------------------------
// interior
// ---------------------------------------------------------------------------

const SHADE_D =
  'M -3.5 44 C -9 51 -16.5 61 -20.5 67 C -7 71 8 70.5 20 66.5 ' +
  'C 15.5 60.5 8.5 50.5 3 44.5 Z';

/** Hanging pendant lamp — the only light source in a room with no windows. */
export const CeilingLight: React.FC<PropArt & { lit?: boolean }> = ({
  lit = true,
  seed = 'ceiling-light',
  ...rest
}) => (
  <DoodleProp seed={seed} {...rest}>
    <path d="M 0 0 C -1.8 14 1.8 30 -0.6 44.5" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} {...HAND_STROKE} />
    <path d={SHADE_D} fill={lit ? PALETTE.gold : PALETTE.grey} transform="translate(2.4 2)" />
    <path d={SHADE_D} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} strokeLinejoin="round" />
    {/* the bulb, and a flat highlight instead of any glow */}
    <path
      d="M -5 68 C -6 74 -2 77.5 2 76.5 C 6 75.5 6.5 71 4.5 67.5 Z"
      fill={lit ? PALETTE.gold : PALETTE.greyDeep}
      stroke={PALETTE.ink}
      strokeWidth={STROKE.fine}
      strokeLinejoin="round"
    />
    {lit && (
      <path
        d="M -27 76 L -33 85 M -0.5 82 L -1.5 93 M 25 75 L 32 84"
        stroke={PALETTE.gold}
        strokeWidth={STROKE.propFine}
        {...HAND_STROKE}
      />
    )}
  </DoodleProp>
);

const DOOR_D =
  'M -34.5 0 C -36 -50 -35 -100 -33.5 -147 C -12 -149.5 12 -149.5 33.5 -148 ' +
  'C 35 -100 35.5 -50 34.5 -0.5 Z';

/** A plain doorway — the exit, mostly used for how far away it looks. */
export const Door: React.FC<PropArt & { panelColor?: string }> = ({
  panelColor = PALETTE.grey,
  seed = 'door',
  ...rest
}) => (
  <DoodleProp seed={seed} {...rest}>
    <path d={DOOR_D} fill={panelColor} transform="translate(2.6 -2.2)" />
    <path d={DOOR_D} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} strokeLinejoin="round" />
    {/* inset panel, not centred and not square */}
    <path
      d="M -22 -18 C -23 -55 -22.5 -95 -21 -131 C -7 -132.5 8 -132.5 21.5 -131.5 C 22.5 -95 22 -55 21 -18.5 C 7 -17 -8 -17 -22 -18 Z"
      stroke={PALETTE.ink}
      strokeWidth={STROKE.fine}
      {...HAND_STROKE}
    />
    <circle cx={25.5} cy={-71} r={3.6} fill={PALETTE.ink} />
    <path d="M -41 1.5 C -12 3 14 3 41.5 1" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} {...HAND_STROKE} />
  </DoodleProp>
);

const POT_D = 'M -15.5 -1 C -14 -12 -12.5 -20 -11.5 -25 L 11 -25.5 C 12 -20 13.5 -12 15 -1.5 Z';

/** Potted plant — shorthand for "this room wants you to feel comfortable". */
export const Plant: React.FC<PropArt & { leafColor?: string }> = ({
  leafColor = PALETTE.teal,
  seed = 'plant',
  ...rest
}) => (
  <DoodleProp seed={seed} {...rest}>
    {/* leaves first, so the pot overlaps them at the rim */}
    <path
      d="M -1 -26 C -14 -33 -21 -43 -18 -50 C -10 -50 -3 -38 -1 -27 Z"
      fill={leafColor}
      stroke={PALETTE.ink}
      strokeWidth={STROKE.propFine}
      strokeLinejoin="round"
    />
    <path
      d="M 0 -26 C 13 -34 20.5 -42 17.5 -49.5 C 9.5 -48.5 2.5 -37 0.5 -27 Z"
      fill={leafColor}
      stroke={PALETTE.ink}
      strokeWidth={STROKE.propFine}
      strokeLinejoin="round"
    />
    <path
      d="M -0.5 -27 C -8 -40 -7.5 -53 -1.5 -60 C 4.5 -53.5 5.5 -40 1 -27 Z"
      fill={leafColor}
      stroke={PALETTE.ink}
      strokeWidth={STROKE.propFine}
      strokeLinejoin="round"
    />
    <path d="M -0.5 -25 C -1.5 -34 -0.5 -44 -1.5 -53" stroke={PALETTE.ink} strokeWidth={STROKE.fine} {...HAND_STROKE} />
    <path d={POT_D} fill={PALETTE.greyDeep} transform="translate(2.2 -1.8)" />
    <path d={POT_D} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} strokeLinejoin="round" />
    <path d="M -13 -25.5 C -3 -27 6 -27 12.5 -25.5" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} {...HAND_STROKE} />
  </DoodleProp>
);

const CHAIR_BACK =
  'M -30 -30 C -32 -48 -31 -62 -29 -71 C -8 -73.5 14 -73 30.5 -70 ' +
  'C 32 -60 32.5 -46 31 -29.5 Z';
const CHAIR_SEAT =
  'M -41 -30 C -20 -33 20 -33 41.5 -29.5 C 43 -22 42.5 -14 41 -8 ' +
  'C 18 -5.5 -19 -5 -40.5 -7.5 C -42 -14 -42.5 -22 -41 -30 Z';

/** Armchair — the "comfortable modern venue" beat, where nothing hurts and nothing ends. */
export const ComfyChair: React.FC<PropArt & { fabricColor?: string }> = ({
  fabricColor = PALETTE.violet,
  seed = 'comfy-chair',
  ...rest
}) => (
  <DoodleProp seed={seed} {...rest}>
    <path d={CHAIR_BACK} fill={fabricColor} transform="translate(2.6 -2)" />
    <path d={CHAIR_BACK} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} strokeLinejoin="round" />
    <path d={CHAIR_SEAT} fill={fabricColor} transform="translate(2.6 -2)" />
    <path d={CHAIR_SEAT} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} strokeLinejoin="round" />
    {/* arms — the near one sits lower, which is all the 3/4 angle we need */}
    <path
      d="M -41 -31 C -44 -42 -43.5 -50 -41.5 -55 C -35 -56.5 -29 -56 -26.5 -54 C -28 -46 -28.5 -38 -28.5 -31 Z"
      fill={fabricColor}
      stroke={PALETTE.ink}
      strokeWidth={STROKE.propFine}
      strokeLinejoin="round"
    />
    <path
      d="M 29.5 -30 C 29 -37 29.5 -45 31 -52 C 34 -54 40 -54.5 43.5 -52.5 C 45 -47 44.5 -39 42 -29.5 Z"
      fill={fabricColor}
      stroke={PALETTE.ink}
      strokeWidth={STROKE.propFine}
      strokeLinejoin="round"
    />
    <path d="M -33 -7 C -33.5 -3.5 -34 -1 -35 0.5" stroke={PALETTE.ink} strokeWidth={STROKE.prop} {...HAND_STROKE} />
    <path d="M 33 -6.5 C 34 -3 34.5 -1 35.5 0" stroke={PALETTE.ink} strokeWidth={STROKE.prop} {...HAND_STROKE} />
    <path d="M -6 -32 C -7 -22 -6.5 -13 -7.5 -6" stroke={PALETTE.ink} strokeWidth={STROKE.fine} {...HAND_STROKE} opacity={0.7} />
  </DoodleProp>
);

const CUP_D =
  'M -11 -1 C -12.5 -14 -13.5 -27 -14.5 -39.5 C -5 -41.5 5.5 -41.5 14 -39.5 ' +
  'C 13 -27 12 -14 11.5 -0.5 C 4 1.5 -4 1.5 -11 -1 Z';
const LID_D = 'M -16.5 -40 C -6 -42 5 -42 16 -40.5 C 15.5 -45 15 -47.5 14.5 -49 C 4 -50.5 -6 -50.5 -15.5 -49 Z';

/** Takeaway cup — the free drink that keeps you seated, with a straw. */
export const DrinkCup: React.FC<PropArt & { cupColor?: string }> = ({
  cupColor = PALETTE.paperShade,
  seed = 'drink-cup',
  ...rest
}) => (
  <DoodleProp seed={seed} {...rest}>
    <path d="M 5 -49 C 7 -58 9 -64 10.5 -68.5" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} {...HAND_STROKE} />
    <path d={CUP_D} fill={cupColor} transform="translate(2.2 -1.8)" />
    <path d={CUP_D} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} strokeLinejoin="round" />
    <path d={LID_D} fill={PALETTE.greyDeep} transform="translate(2 -1.6)" />
    <path d={LID_D} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} strokeLinejoin="round" />
    {/* sleeve band, drifting downhill because it was drawn in one go */}
    <path d="M -12.5 -20 C -3 -21.5 5 -21 12.5 -22.5" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} {...HAND_STROKE} />
    <path d="M -12 -12 C -3 -13.5 5 -13 12 -14" stroke={PALETTE.ink} strokeWidth={STROKE.fine} {...HAND_STROKE} opacity={0.6} />
  </DoodleProp>
);
