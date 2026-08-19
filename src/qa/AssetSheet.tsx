/**
 * AssetSheet.tsx — QA-only contact sheet for the whole prop + FX library.
 *
 * Same reasoning as CharacterSheet: assets built independently only stay consistent if
 * they are reviewed side by side. Line weight drift, scale drift, and off-palette colour
 * jump out here and are invisible when checked one scene at a time. Not part of the episode.
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Stage } from '../components/Stage';
import { FONTS, PALETTE } from '../lib/style';

import * as Time from '../props/time';
import * as World from '../props/world';
import * as Casino from '../props/casino';
import * as Money from '../props/money';
import * as Marks from '../fx/marks';

type Entry = { name: string; el: (f: number) => React.ReactNode; scale?: number };

const ENTRIES: Entry[] = [
  { name: 'WallClock', el: (f) => <Time.WallClock frame={f} hourAngle={300} minuteAngle={60} /> },
  { name: 'ClockHands', el: (f) => <Time.ClockHands frame={f} hourAngle={40} minuteAngle={200} /> },
  { name: 'Wristwatch', el: (f) => <Time.Wristwatch frame={f} /> },
  { name: 'HugeWallClock', el: (f) => <Time.HugeWallClock frame={f} />, scale: 0.55 },
  { name: 'Window (day)', el: (f) => <World.Window frame={f} daylight /> },
  { name: 'Window (dull)', el: (f) => <World.Window frame={f} /> },
  { name: 'Sun', el: (f) => <World.Sun frame={f} /> },
  { name: 'Moon', el: (f) => <World.Moon frame={f} /> },
  { name: 'CeilingLight', el: (f) => <World.CeilingLight frame={f} lit /> },
  { name: 'Door', el: (f) => <World.Door frame={f} />, scale: 0.6 },
  { name: 'Plant', el: (f) => <World.Plant frame={f} /> },
  { name: 'ComfyChair', el: (f) => <World.ComfyChair frame={f} /> },
  { name: 'DrinkCup', el: (f) => <World.DrinkCup frame={f} /> },
  { name: 'SlotMachine', el: (f) => <Casino.SlotMachine frame={f} lit />, scale: 0.55 },
  { name: 'SlotMachineRow', el: (f) => <Casino.SlotMachineRow frame={f} lit />, scale: 0.3 },
  { name: 'CasinoChip', el: (f) => <Casino.CasinoChip frame={f} /> },
  { name: 'ChipStack', el: (f) => <Casino.ChipStack frame={f} /> },
  { name: 'RouletteTable', el: (f) => <Casino.RouletteTable frame={f} />, scale: 0.5 },
  { name: 'PlayingCards', el: (f) => <Casino.PlayingCards frame={f} fanned /> },
  { name: 'Dice', el: (f) => <Casino.Dice frame={f} pips={5} /> },
  { name: 'CasinoSign', el: (f) => <Casino.CasinoSign frame={f} lit />, scale: 0.5 },
  { name: 'CeilingLightRow', el: (f) => <Casino.CeilingLightRow frame={f} lit />, scale: 0.45 },
  { name: 'Wallet', el: (f) => <Money.Wallet frame={f} /> },
  { name: 'EmptyWallet', el: (f) => <Money.EmptyWallet frame={f} /> },
  { name: 'Cash', el: (f) => <Money.Cash frame={f} count={3} /> },
  { name: 'Receipt', el: (f) => <Money.Receipt frame={f} /> },
  { name: 'EmptyCup', el: (f) => <Money.EmptyCup frame={f} /> },
  { name: 'TrashPile', el: (f) => <Money.TrashPile frame={f} /> },
  { name: 'QuestionMark', el: (f) => <Marks.QuestionMark frame={f} /> },
  { name: 'ExclamationMark', el: (f) => <Marks.ExclamationMark frame={f} /> },
  { name: 'Arrow', el: (f) => <Marks.Arrow frame={f} curved /> },
  { name: 'Sparkles', el: (f) => <Marks.Sparkles frame={f} /> },
  { name: 'AttentionLines', el: (f) => <Marks.AttentionLines frame={f} />, scale: 0.7 },
  { name: 'MotionLines', el: (f) => <Marks.MotionLines frame={f} /> },
  { name: 'ImpactStar', el: (f) => <Marks.ImpactStar frame={f} />, scale: 0.6 },
  { name: 'SweatDrops', el: (f) => <Marks.SweatDrops frame={f} /> },
  { name: 'DizzySpiral', el: (f) => <Marks.DizzySpiral frame={f} /> },
  { name: 'ThoughtCloud', el: (f) => <Marks.ThoughtCloud frame={f} />, scale: 0.7 },
];

const COLS = 5;
const MARGIN = 26;
const CELL_W = (1080 - MARGIN * 2) / COLS;
const CELL_H = 210;
const TOP = 84;

export const AssetSheet: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Stage>
      <>
        <text x={MARGIN} y={54} fontFamily={FONTS.display} fontSize={44} fill={PALETTE.ink}>
          PROP + FX LIBRARY ({ENTRIES.length})
        </text>
        {ENTRIES.map((e, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const x0 = MARGIN + col * CELL_W;
          const y0 = TOP + row * CELL_H;
          return (
            <g key={e.name}>
              <rect
                x={x0 + 4}
                y={y0 + 4}
                width={CELL_W - 8}
                height={CELL_H - 8}
                fill="none"
                stroke={PALETTE.grey}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                rx={10}
              />
              <g transform={`translate(${x0 + CELL_W / 2} ${y0 + (CELL_H - 40) / 2}) scale(${e.scale ?? 1})`}>
                {e.el(frame)}
              </g>
              <text
                x={x0 + CELL_W / 2}
                y={y0 + CELL_H - 12}
                textAnchor="middle"
                fontFamily={FONTS.hand}
                fontSize={20}
                fill={PALETTE.inkSoft}
              >
                {e.name}
              </text>
            </g>
          );
        })}
      </>
    </Stage>
  );
};
