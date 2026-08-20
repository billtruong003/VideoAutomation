/**
 * Branding.tsx — the channel's avatar and banner, composed from the canonical cast.
 *
 * WHY THIS IS CODE AND NOT A PHOTOSHOP FILE
 *
 * Bill is not a picture in this repository; he is a component. The sheets in
 * `qa/characters/` were RENDERED FROM `DoodleCharacter`, so cropping Bill out of a
 * 1080x1920 PNG and masking its cream background would be working from a downstream copy —
 * lower resolution than the source, with matte fringing around every hair spike, and a hard
 * ceiling on how large he can appear on a 2560px banner.
 *
 * Composing from the component instead means the branding uses the exact same geometry,
 * palette, stylizer and seeds as the sheets and as all ten episodes. Nothing is redrawn,
 * nothing is approximated, no generative model touches the character, and the assets stay
 * reproducible from source. Change the character definition and the branding follows.
 *
 * WHAT IS FIXED HERE AND MUST NOT DRIFT
 *
 *   - Bill's proportions, hair, glasses, palette: untouched, straight from the registry
 *   - the pose and expression are NAMES from his canonical libraries, not one-off geometry
 *   - every colour is a token from `style/tokens.ts` — no hex literals in this file
 *
 * The avatar is HEAD-AND-SHOULDERS on purpose. `qa/characters/phone-size-test.png` shows the
 * full-body figure dissolving into an unreadable smudge at thumbnail scale; the head — the
 * rounded square, the silver mop, the black rectangles — is the entire identity, so at 48 px
 * the head is the only thing worth spending pixels on.
 */

import React from 'react';
import { AbsoluteFill } from 'remotion';

import { DoodleCharacter } from '../components/DoodleCharacter';
import { PaperTexture } from '../components/Paper';
import { RoughShapes } from '../assets/RoughAsset';
import type { Shape } from '../assets/shapes';
import { PALETTE, CAST, FONTS } from '../style/tokens';
import { QuestionMark } from '../fx/marks';
import { ManholeCover, MeshPanel, FuelNozzle, Microwave } from '../props/machines';
import { Pen, PocketWatch } from '../props/objects';
import { AirplaneWindow } from '../props/travel';

// ===========================================================================
// avatar — 1024 x 1024, displayed as a circle
// ===========================================================================

const AV = 1024;
/** YouTube crops the square to a circle; everything essential lives inside this. */
const SAFE_D = 800;

export const ChannelAvatar: React.FC = () => {
  /**
   * Bill's placement, derived from the rig rather than eyeballed.
   *
   * The rig puts the HIP at the origin and the head centre at y=-100, with the head 96x86
   * and the hair reaching to about y=-152. A portrait therefore means pushing the hip far
   * below the frame and letting the legs run off canvas — which is what a portrait crop is.
   *
   * The visible block runs from the top of the hair (-152) to mid-torso (-10), so it is
   * centred on y=-81 in character units. At scale 4.7 that block is 667 px tall — 65% of the
   * 1024 circle YouTube actually shows, and comfortably inside the conservative 800 px zone.
   *
   * The first pass used 6.2 and clipped the top of his hair straight off the canvas, which
   * removed the chunky spiked silhouette that is half of his recognisability.
   */
  const SCALE = 5.5;
  const HAIR_TOP = -152;
  const CROP_BOTTOM = -10;
  const HIP_Y = AV / 2 - ((HAIR_TOP + CROP_BOTTOM) / 2) * SCALE;
  /** Nudged left so the curiosity mark has clean cream to sit in on the right. */
  const BILL_X = AV / 2 - 32;

  /**
   * The backdrop: a cream disc and a gold rim, and nothing else.
   *
   * An earlier pass added twelve radial curiosity ticks. They were fine while Bill was small,
   * but at the size he needs to be in order to survive 48 px they crowded the hair — and at
   * 48 px they are sub-pixel noise regardless. The avatar's stated primary goal is instant
   * recognition when tiny, and every mark that is not Bill works against it.
   */
  const backdrop: Shape[] = [
    { k: 'circle', cx: AV / 2, cy: AV / 2, r: 504, fill: PALETTE.paperShade, stroke: 'none', rough: 'background' },
    // r=478, not 492: the stylizer wobbles a stroke by several units, and at 492 the rim
    // wandered past the 512 px crop radius and came back with bites taken out of it.
    { k: 'circle', cx: AV / 2, cy: AV / 2, r: 478, fill: 'none', stroke: CAST.billShirt, sw: 9, rough: 'background' },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.paper }}>
      <PaperTexture grain={0.5} />
      <AbsoluteFill>
        <svg width={AV} height={AV} viewBox={`0 0 ${AV} ${AV}`} style={{ display: 'block' }}>
          <RoughShapes shapes={backdrop} id="avatar-backdrop" />

          {/* the canonical character, unmodified — pose and expression are library names */}
          <DoodleCharacter
            character="bill"
            pose="neutral"
            expression="curious"
            gaze={[0.34, -0.26]}
            x={BILL_X}
            y={HIP_Y}
            scale={SCALE}
            frame={0}
            seed="brand-avatar"
            wobbleAmount={0}
          />

          {/*
            There is deliberately NO question mark here.

            Two passes tried one. At the scale Bill needs in order to survive 48 px there is no
            clean cream left inside the circle for it — every position that reads at 1024 px
            sits against the hair spikes and turns into a stray curl. It is invisible at 48 px
            either way, the brief calls it secondary, and the `curious` expression already
            carries the idea. The face does the work.
          */}
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ===========================================================================
// banner — 2560 x 1440, with a 1546 x 423 centred safe area
// ===========================================================================

const BW = 2560;
const BH = 1440;
/** YouTube shows only this rectangle on every device. Everything that matters is inside it. */
const SAFE_W = 1546;
const SAFE_H = 423;
const SAFE_X = (BW - SAFE_W) / 2;
const SAFE_Y = (BH - SAFE_H) / 2;

/** Text baseline geometry, all derived from the safe area rather than eyeballed. */
const TITLE_X = SAFE_X + 560;
const BILL_SIZE = 208;
const FINDS_SIZE = 132;
const TAG_SIZE = 46;

/**
 * Bill's placement on the banner, solved rather than nudged.
 *
 * His drawn extent runs from the top of his hair (-152 units) to the bottom of his foot
 * ellipse (+41.8 = feet at 36 plus footRy 5.8). That is 193.8 units. At 1.98 it comes to
 * 384 px inside a 423 px safe band, which centres with ~19 px of clearance top and bottom.
 *
 * Every other element that has to agree with him — the ground line, Mochi's seat — is
 * derived from these two constants, so none of them can drift out of alignment again.
 */
const BILL_SCALE = 1.98;
const BILL_HIP = SAFE_Y + 321;
const GROUND_Y = BILL_HIP + 36 * BILL_SCALE;

export const ChannelBanner: React.FC = () => {
  /**
   * Doodle Easter eggs.
   *
   * These live OUTSIDE the safe rectangle by construction — they are the reward for seeing
   * the banner on a wide desktop, and their absence on a phone costs nothing. Low opacity
   * keeps them from competing with Bill or the title, which is the whole brief for them.
   */
  const wing = 0.17;

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.paper }}>
      <PaperTexture grain={0.45} />
      <AbsoluteFill>
        <svg width={BW} height={BH} viewBox={`0 0 ${BW} ${BH}`} style={{ display: 'block' }}>
          {/*
            A ground line, not a decorative underline.

            It sits at Bill's FEET (hip + 36 units at his scale) so he stands on it, the way
            the character sheets put their cast on a dashed baseline. The first pass placed it
            26 px above the safe edge, which put it across his ankles and made him look like he
            was wading through it.
          */}
          <RoughShapes
            id="banner-rule"
            shapes={[
              {
                k: 'line',
                x1: SAFE_X - 40,
                y1: GROUND_Y,
                x2: SAFE_X + SAFE_W + 40,
                y2: GROUND_Y,
                stroke: CAST.billShirt,
                sw: 7,
                rough: 'background',
                opacity: 0.85,
              },
            ]}
          />

          {/*
            ---- the everyday objects, faint, and entirely outside the safe rectangle ----

            Placement is constrained: nothing may sit inside x 507..2053 AND y 508..931, or it
            competes with the lockup on a phone. That leaves the two side wings and the bands
            above and below, which is exactly where these belong — a reward for a wide screen,
            costing nothing when cropped away.

            The first pass used only four and left the top and bottom bands empty, so the full
            2560x1440 canvas read as unfinished on a TV even though every crop was fine.
          */}
          <g opacity={wing}>
            {/* side wings */}
            <AirplaneWindow x={238} y={470} scale={2.0} frame={0} seed="brand-win" holeLit />
            {/* a whole pen, not a bare cap: at this size an isolated cap read as a thermos */}
            <Pen x={300} y={1060} scale={1.5} frame={0} seed="brand-pen" capped rotate={-12} />
            <ManholeCover x={2318} y={1076} scale={1.9} frame={0} seed="brand-manhole" />
            <AirplaneWindow x={2280} y={420} scale={1.5} frame={0} seed="brand-win2" />

            {/* upper band, above the safe area */}
            <MeshPanel x={760} y={250} scale={0.9} frame={0} seed="brand-mesh" cols={5} rows={4} />
            <FuelNozzle x={1720} y={236} scale={1.9} frame={0} seed="brand-nozzle" rotate={-8} />

            {/* lower band, below the safe area */}
            {/* a pocket watch, not a lane dash: a lone rectangle carried no meaning at all */}
            <PocketWatch x={960} y={1210} scale={2.2} frame={0} seed="brand-watch" chain />
            <Microwave x={1640} y={1290} scale={0.85} frame={0} seed="brand-mw" lit={false} />
          </g>

          {/* A couple of marks just inside the safe edge, quieter still. Both are kept off the
              cast — the second one used to sit on Mochi's tail and read as a smudge on her. */}
          <g opacity={0.13}>
            <QuestionMark x={SAFE_X + 74} y={SAFE_Y + 88} scale={2.6} frame={0} seed="brand-q1" color={PALETTE.ink} />
            <QuestionMark x={SAFE_X + SAFE_W - 290} y={SAFE_Y + 74} scale={2.0} frame={0} seed="brand-q2" color={PALETTE.ink} />
          </g>

          {/*
            Bill: the mascot, left of the lockup and ENTIRELY inside the safe area.

            The numbers come from the rig, not from taste. He spans 188 units from the top of
            his hair (-152) to his feet (+36); at scale 2.05 that is 386 px inside a 423 px
            safe band, leaving ~18 px of margin top and bottom. The first pass used 2.15 with
            the hip 17 px higher and sheared the top off his hair — on a phone, where the safe
            area is the whole banner.
          */}
          {/*
            POSE: `pointUp`, not `thinking`.

            `thinking` was the obvious pick for a curiosity brand and it failed on inspection.
            Its raised hand sits directly under the mouth, and at banner scale the thick black
            noodle arm behind it read as a GOATEE — Bill has no facial hair, so the pose was
            quietly changing the character. `pointUp` keeps the whole face clear, gives a much
            cleaner silhouette, points straight at the question mark, and says "finds out"
            rather than merely "wonders".
          */}
          <DoodleCharacter
            character="bill"
            pose="pointUp"
            expression="curious"
            gaze={[0.5, -0.35]}
            x={SAFE_X + 250}
            y={BILL_HIP}
            scale={BILL_SCALE}
            frame={0}
            seed="brand-banner-bill"
            wobbleAmount={0}
          />

          {/* the thing he is finding out about — his raised finger points at it */}
          <g opacity={0.9}>
            <QuestionMark x={SAFE_X + 452} y={SAFE_Y + 78} scale={2.2} frame={0} seed="brand-q3" color={CAST.billShirt} />
          </g>

          {/* ---- title lockup ---- */}
          <text
            x={TITLE_X}
            y={SAFE_Y + 176}
            fontFamily={FONTS.display}
            fontSize={BILL_SIZE}
            fill={CAST.billShirt}
            stroke={PALETTE.ink}
            strokeWidth={11}
            strokeLinejoin="round"
            paintOrder="stroke"
            style={{ letterSpacing: '0.02em' }}
          >
            BILL
          </text>

          <text
            x={TITLE_X}
            y={SAFE_Y + 306}
            fontFamily={FONTS.display}
            fontSize={FINDS_SIZE}
            fill={PALETTE.ink}
            style={{ letterSpacing: '0.035em' }}
          >
            FINDS OUT
          </text>

          <text
            x={TITLE_X + 6}
            y={SAFE_Y + 372}
            fontFamily={FONTS.hand}
            fontSize={TAG_SIZE}
            fill={PALETTE.inkSoft}
            style={{ letterSpacing: '0.01em' }}
          >
            Hidden reasons behind everyday things.
          </text>

          {/*
            Mochi: one silent gag, well clear of the text and fully inside the safe area.

            Her origin is the body centre and her tail reaches ~46 units to the right, so she
            needs real clearance from the edge — the first pass put her 96 px in and the phone
            crop took her tail and one ear off.
          */}
          <DoodleCharacter
            character="mochi"
            pose="sit"
            expression="curious"
            x={SAFE_X + SAFE_W - 168}
            /* seated ON the ground line: her paws sit 42 units below her body centre */
            y={GROUND_Y - 42 * 1.15}
            scale={1.15}
            frame={0}
            seed="brand-mochi"
            wobbleAmount={0}
          />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Geometry the QA tool needs, exported so the preview cannot disagree with the render. */
export const BANNER_SAFE = { x: SAFE_X, y: SAFE_Y, w: SAFE_W, h: SAFE_H };
export const AVATAR_SAFE_DIAMETER = SAFE_D;
