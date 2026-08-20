/**
 * Episode 10 — "Old Book Smell Is The Book Falling Apart"
 *
 * One image carries the whole episode: the scent curls. They start warm gold (the smell you
 * love) and turn sickly green the moment the narration says "breaking down" — the same
 * component, one number moved. That colour shift IS the reveal, so nothing else in the hook
 * is allowed to move while it happens.
 *
 * The narration names Bill at the payoff, and the payoff returns to the exact opening
 * framing. He has learned the fact and enjoys the smell anyway, which is the joke; Mochi
 * sniffs the book once and judges him for it.
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';

import { Stage } from '../../components/Stage';
import { DoodleCharacter } from '../../components/DoodleCharacter';
import { LibraryShelf, CutawayVoid, ConservationLab } from '../../backgrounds/everyday';
import { Book, BookCutaway } from '../../props/objects';
import { ScentCurls, Molecule, CircleIt } from '../../fx/diagram';
import { Sparkles } from '../../fx/marks';
import { usePoseSwap } from '../../animation/PoseSwap';
import { SceneCamera, useCameraPunch, useCameraDolly } from '../../animation/SceneCamera';
import { PALETTE } from '../../style/tokens';
import { clockFor } from '../registry';
import { after, between, ramp, Label, Reveal, SlideIn, StampLabel } from '../../scenes/kit';

const C = clockFor('old-book-smell');

export const HIGHLIGHTS = {
  smell: PALETTE.gold,
  smells: PALETTE.gold,
  breaking: PALETTE.coral,
  chemicals: PALETTE.teal,
  vanillin: PALETTE.gold,
  vanillalike: PALETTE.gold,
  paper: PALETTE.violet,
  chemistry: PALETTE.teal,
  delicious: PALETTE.gold,
};

/** The book sits here in the hook and the payoff. Identical framing is the point. */
const BOOK_X = 640;
const BOOK_Y = 1060;

// ===========================================================================
// hook — bliss, then decay
// ===========================================================================

const S1 = 'hook';

const Hook: React.FC = () => {
  const frame = useCurrentFrame();

  const F_SMELL = C.kwIn(S1, 'smell');
  const F_BREAK = C.kwIn(S1, 'breaking-down');

  // the one number the whole episode turns on
  const decay = ramp(frame, F_BREAK, 14);

  const pose = usePoseSwap(
    [
      { at: 0, pose: 'holdingLarge' },
      { at: F_BREAK, pose: 'shockedBack' },
    ],
    frame,
    2,
  );

  const punch = useCameraPunch(frame, F_BREAK, { amount: 0.12, duration: 15 });

  return (
    <Stage>
      <SceneCamera zoom={punch} originX={BOOK_X} originY={BOOK_Y}>
        <LibraryShelf frame={frame} />

        <Book x={BOOK_X} y={BOOK_Y} scale={2.4} frame={frame} seed="ep10-book" open wear={0.9} />

        {after(frame, F_SMELL - 6) && (
          <ScentCurls
            x={BOOK_X}
            y={BOOK_Y - 160}
            scale={2.2}
            frame={frame}
            seed="ep10-scent"
            count={4}
            height={210}
            decay={decay}
          />
        )}

        {/* the book visibly crumbles at the edges once the truth lands */}
        {decay > 0.3 &&
          [0, 1, 2].map((i) => {
            const t = ((frame - F_BREAK) * 0.02 + i * 0.33) % 1;
            return (
              <rect
                key={i}
                x={BOOK_X - 240 + i * 190}
                y={BOOK_Y + 90 + t * 340}
                width={18}
                height={13}
                rx={4}
                fill={PALETTE.paperShade}
                stroke={PALETTE.ink}
                strokeWidth={2}
                opacity={(1 - t) * 0.9}
                transform={`rotate(${t * 180} ${BOOK_X - 240 + i * 190} ${BOOK_Y + 90 + t * 340})`}
              />
            );
          })}

        <DoodleCharacter
          character="bill"
          pose={pose}
          expression={after(frame, F_BREAK) ? 'shocked' : 'content'}
          x={230}
          y={1290}
          scale={2.4}
          frame={frame}
          seed="bill"
        />

        {after(frame, F_BREAK) && (
          <StampLabel frame={frame} at={F_BREAK} x={540} y={400} text="IT'S DECOMPOSING" size={62} rotate={-4} />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// materials — four things named, four things aged
// ===========================================================================

const S2 = 'materials';

const Materials: React.FC = () => {
  const frame = useCurrentFrame();

  const F_PAPER = C.kwIn(S2, 'paper');
  const F_INK = C.kwIn(S2, 'ink');
  const F_GLUE = C.kwIn(S2, 'glue');
  const F_BIND = C.kwIn(S2, 'bindings');
  const F_CHEM = C.kwIn(S2, 'chemicals');

  const focus = after(frame, F_BIND)
    ? 'bindings'
    : after(frame, F_GLUE)
      ? 'glue'
      : after(frame, F_INK)
        ? 'ink'
        : after(frame, F_PAPER)
          ? 'paper'
          : 'none';

  const spread = ramp(frame, F_PAPER, 24) * 40;
  const dolly = useCameraDolly(frame, { from: 1.25, to: 1.0, start: 0, duration: 18 });

  return (
    <Stage>
      <SceneCamera zoom={dolly} originX={540} originY={900}>
        <CutawayVoid frame={frame} />

        <BookCutaway x={540} y={900} scale={2.5} frame={frame} seed="ep10-cut" spread={spread} focus={focus} />

        {focus !== 'none' && (
          <StampLabel
            frame={frame}
            at={
              focus === 'paper' ? F_PAPER : focus === 'ink' ? F_INK : focus === 'glue' ? F_GLUE : F_BIND
            }
            x={540}
            y={1400}
            text={focus.toUpperCase()}
            size={64}
            rotate={-3}
          />
        )}

        {/* the compounds start leaving */}
        {after(frame, F_CHEM) &&
          [0, 1, 2, 3, 4].map((i) => {
            const t = ((frame - F_CHEM) * 0.018 + i * 0.2) % 1;
            return (
              <g key={i} opacity={(1 - t) * 0.9}>
                <Molecule
                  x={330 + i * 105 + Math.sin(t * 6 + i) * 30}
                  y={800 - t * 520}
                  scale={1.3}
                  frame={frame}
                  seed={`ep10-mol-${i}`}
                />
              </g>
            );
          })}

        {after(frame, F_CHEM) && (
          <Label x={540} y={330} text="VOLATILE COMPOUNDS" size={48} color={PALETTE.teal} opacity={ramp(frame, F_CHEM, 10)} />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// compounds — four smells, four icons
// ===========================================================================

const S3 = 'compounds';

const Compounds: React.FC = () => {
  const frame = useCurrentFrame();

  const F_GRASS = C.kwIn(S3, 'grassy');
  const F_MUST = C.kwIn(S3, 'musty');
  const F_ALM = C.kwIn(S3, 'almond');
  const F_VAN = C.kwIn(S3, 'vanilla');

  const SLOTS: { at: number; x: number; label: string; color: string; icon: React.ReactNode }[] = [
    {
      at: F_GRASS, x: 200, label: 'GRASSY', color: '#7A9A4A',
      icon: <path d="M 0 40 Q -14 0 -4 -44 M 0 40 Q 12 4 22 -34" fill="none" stroke="#7A9A4A" strokeWidth={8} strokeLinecap="round" />,
    },
    {
      at: F_MUST, x: 425, label: 'MUSTY', color: PALETTE.greyDeep,
      icon: <g><ellipse cx={-16} cy={6} rx={26} ry={18} fill={PALETTE.greyDeep} opacity={0.8} /><ellipse cx={16} cy={-6} rx={30} ry={20} fill={PALETTE.greyDeep} opacity={0.6} /></g>,
    },
    {
      at: F_ALM, x: 650, label: 'ALMOND', color: '#B98A5C',
      icon: <ellipse cx={0} cy={0} rx={22} ry={34} fill="#B98A5C" stroke={PALETTE.ink} strokeWidth={5} />,
    },
    {
      at: F_VAN, x: 875, label: 'VANILLA', color: PALETTE.gold,
      icon: <rect x={-9} y={-40} width={18} height={80} rx={9} fill={PALETTE.gold} stroke={PALETTE.ink} strokeWidth={5} />,
    },
  ];

  return (
    <Stage>
      <SceneCamera originX={540} originY={950}>
        <CutawayVoid frame={frame} />

        <Book x={540} y={1450} scale={1.7} frame={frame} seed="ep10-book-sm" open wear={0.9} />

        {SLOTS.map((s) => (
          after(frame, s.at) && (
            <g key={s.label}>
              <ScentCurls
                x={s.x}
                y={1240}
                scale={1.3}
                frame={frame}
                seed={`ep10-curl-${s.label}`}
                count={1}
                height={220}
                decay={0.5}
              />
              <Reveal frame={frame} at={s.at} originX={s.x} originY={880}>
                <g transform={`translate(${s.x} 880)`}>{s.icon}</g>
              </Reveal>
              <Label
                x={s.x}
                y={760}
                text={s.label}
                size={34}
                color={s.color}
                opacity={ramp(frame, s.at + 3, 8)}
              />
            </g>
          )
        ))}

        {after(frame, F_VAN) && (
          <StampLabel frame={frame} at={F_VAN} x={540} y={470} text="ALL FROM ONE BOOK" size={52} color={PALETTE.ink} rotate={-2} />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// vanillin — the one named compound
// ===========================================================================

const S4 = 'vanillin';

const Vanillin: React.FC = () => {
  const frame = useCurrentFrame();

  const F_VAN = C.kwIn(S4, 'vanillin');
  const F_SWEET = C.kwIn(S4, 'sweet');

  const grow = ramp(frame, F_VAN, 14);

  return (
    <Stage>
      <SceneCamera originX={540} originY={900}>
        <CutawayVoid frame={frame} />

        {/* the other three, dimmed and drifting behind */}
        <g opacity={0.22}>
          {[260, 420, 800].map((x, i) => (
            <ScentCurls key={x} x={x} y={1200} scale={1.2} frame={frame} seed={`ep10-dim-${i}`} count={1} height={200} decay={0.5} />
          ))}
        </g>

        <g transform={`translate(560 900) scale(${1 + grow * 1.1})`}>
          <Molecule x={0} y={0} scale={2.4} frame={frame} seed="ep10-vanillin" />
        </g>

        {after(frame, F_VAN) && (
          <StampLabel frame={frame} at={F_VAN} x={540} y={1280} text="VANILLIN" size={78} color={PALETTE.gold} rotate={-3} />
        )}

        {after(frame, F_SWEET) && (
          <>
            <Sparkles x={560} y={900} scale={3.0} frame={frame} count={10} seed="ep10-sweet" />
            <SlideIn frame={frame} at={F_SWEET} fromX={320} frames={12}>
              <DoodleCharacter
                character="mina"
                pose="pointing"
                expression="smallSmile"
                x={880}
                y={1297}
                scale={2.2}
                frame={frame}
                seed="mina"
              />
            </SlideIn>
          </>
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// science — the smell becomes data
// ===========================================================================

const S5 = 'science';

const Science: React.FC = () => {
  const frame = useCurrentFrame();

  const F_EMIT = C.kwIn(S5, 'emissions');
  const F_AGE = C.kwIn(S5, 'aging-paper');

  const collect = ramp(frame, F_EMIT, 22);

  return (
    <Stage>
      <SceneCamera originX={540} originY={1000}>
        <ConservationLab frame={frame} />

        <Book x={430} y={1200} scale={1.6} frame={frame} seed="ep10-book-lab" open wear={0.9} />

        {/* a collection funnel over the book */}
        <g>
          <polygon
            points="330,900 530,900 460,760 400,760"
            fill={PALETTE.paper}
            stroke={PALETTE.ink}
            strokeWidth={6}
          />
          <rect x={400} y={640} width={60} height={124} fill={PALETTE.paper} stroke={PALETTE.ink} strokeWidth={6} />
        </g>

        {after(frame, F_EMIT) && (
          <g opacity={collect}>
            <ScentCurls x={430} y={1080} scale={1.5} frame={frame} seed="ep10-collect" count={2} height={200} decay={0.6} />
          </g>
        )}

        {/* the jar */}
        <g transform="translate(760 900)">
          <rect x={-80} y={-110} width={160} height={220} rx={16} fill={PALETTE.teal} opacity={0.25 + collect * 0.4} stroke={PALETTE.ink} strokeWidth={6} />
          <rect x={-90} y={-130} width={180} height={30} rx={8} fill={PALETTE.grey} stroke={PALETTE.ink} strokeWidth={5} />
        </g>

        {after(frame, F_AGE) && (
          <>
            <Reveal frame={frame} at={F_AGE} originX={760} originY={1220}>
              <g transform="translate(760 1220)">
                <rect x={-120} y={-50} width={240} height={100} rx={10} fill={PALETTE.paper} stroke={PALETTE.ink} strokeWidth={6} />
                <line x1={-96} y1={16} x2={96} y2={16} stroke={PALETTE.greyDeep} strokeWidth={5} />
                <line x1={-96} y1={16} x2={40} y2={-24} stroke={PALETTE.teal} strokeWidth={8} />
              </g>
            </Reveal>
            <Label x={760} y={1330} text="CONDITION" size={38} color={PALETTE.inkSoft} opacity={ramp(frame, F_AGE + 4, 8)} />
          </>
        )}

        <DoodleCharacter
          character="mina"
          pose="clipboard"
          expression={after(frame, F_AGE) ? 'smallSmile' : 'neutral'}
          x={200}
          y={1294}
          scale={2.3}
          frame={frame}
          seed="mina"
        />

        <StampLabel frame={frame} at={F_EMIT} x={540} y={400} text="THEY MEASURE IT" size={56} color={PALETTE.teal} rotate={-2} />
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// payoff — the opening shot again, and Mochi's verdict
// ===========================================================================

const S6 = 'payoff';

const Payoff: React.FC = () => {
  const frame = useCurrentFrame();

  const F_BILL = C.kwIn(S6, 'bill-named');
  const F_100 = C.kwIn(S6, 'hundred-year');
  const F_DEL = C.kwIn(S6, 'delicious');
  const F_SLOW = C.kwIn(S6, 'slow-motion');

  const pose = usePoseSwap(
    [
      { at: 0, pose: 'holdingLarge' },
      { at: F_DEL, pose: 'relaxed' },
    ],
    frame,
    2,
  );

  const mochiIn = ramp(frame, F_SLOW, 24);

  return (
    <Stage>
      <SceneCamera originX={BOOK_X} originY={BOOK_Y}>
        <LibraryShelf frame={frame} />

        <Book x={BOOK_X} y={BOOK_Y} scale={2.4} frame={frame} seed="ep10-book" open wear={0.9} />

        {after(frame, F_BILL) && (
          <ScentCurls
            x={BOOK_X}
            y={BOOK_Y - 160}
            scale={2.2}
            frame={frame}
            seed="ep10-scent"
            count={4}
            height={210}
            decay={0.85}
          />
        )}

        {after(frame, F_100) && (
          <>
            <Reveal frame={frame} at={F_100} originX={BOOK_X} originY={700}>
              <CircleIt x={BOOK_X} y={700} rx={140} ry={70} frame={frame} seed="ep10-age" color={PALETTE.violet} />
            </Reveal>
            <StampLabel frame={frame} at={F_100} x={BOOK_X} y={700} text="100 YEARS" size={58} color={PALETTE.violet} rotate={-4} />
          </>
        )}

        {/* the molecules drift past absurdly slowly */}
        {after(frame, F_SLOW) &&
          [0, 1, 2].map((i) => (
            <Molecule
              key={i}
              x={300 + i * 260}
              y={620 - ((frame - F_SLOW) * 0.5 + i * 40) % 260}
              scale={1.2}
              frame={frame}
              seed={`ep10-slow-${i}`}
            />
          ))}

        <DoodleCharacter
          character="bill"
          pose={pose}
          expression={after(frame, F_DEL) ? 'content' : 'happy'}
          x={230}
          y={1290}
          scale={2.4}
          frame={frame}
          seed="bill"
        />

        {/* one sniff, one verdict, exit */}
        {after(frame, F_SLOW) && (
          <DoodleCharacter
            character="mochi"
            pose={mochiIn < 0.55 ? 'walkA' : 'sit'}
            expression={mochiIn < 0.55 ? 'curious' : 'judging'}
            x={980 - mochiIn * 190}
            y={1314}
            scale={1.7}
            frame={frame}
            seed="mochi"
          />
        )}

        {between(frame, F_DEL, F_SLOW) && (
          <StampLabel frame={frame} at={F_DEL} until={F_SLOW} x={540} y={400} text="STILL SMELLS GREAT" size={58} color={PALETTE.gold} rotate={-3} />
        )}

        {after(frame, F_SLOW) && (
          <StampLabel frame={frame} at={F_SLOW} x={540} y={400} text="CHEMISTRY, VERY SLOWLY" size={52} color={PALETTE.teal} rotate={-2} />
        )}
      </SceneCamera>
    </Stage>
  );
};

export const SCENES: Record<string, React.FC> = {
  hook: Hook,
  materials: Materials,
  compounds: Compounds,
  vanillin: Vanillin,
  science: Science,
  payoff: Payoff,
};
