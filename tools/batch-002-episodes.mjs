#!/usr/bin/env node
/**
 * batch-002-episodes.mjs — author the twenty episode configs for Batch 002.
 *
 *   node tools/batch-002-episodes.mjs [--check]
 *
 * `episodes/<slug>/episode.json` is the one AUTHORED artefact between locked narration and a
 * storyboard: the scene split, the keyword anchors visuals hang off, and the beat plan. It is
 * generated here rather than typed twenty times because the two things that actually break it
 * are mechanical, and a generator can refuse them:
 *
 *   - a scene marker that does not appear in the narration, or appears BEFORE the previous
 *     scene's marker, which silently reorders the episode
 *   - a keyword whose tokens are not spoken, which fails much later inside remap-timing with
 *     a message about a word rather than about the scene that wanted it
 *
 * Both are checked here against the real script text, so a mistake surfaces while the fix is
 * still one line of data.
 *
 * The beat ACTIONS are editorial and hand-written. What is generated is the plumbing.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = process.cwd();
const SCRIPTS = JSON.parse(
  await import('node:fs').then((fs) => fs.readFileSync(join(ROOT, 'data/batch-002-scripts.json'), 'utf8')),
);

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9']/g, '');

/**
 * Scene and beat plan, one entry per episode.
 *
 * `from` is the opening word marker, matched against the spoken narration. `kw` beats are
 * anchored to a keyword id declared in the same episode's `keywords` list. `at` beats are
 * relative to their own scene's start and exist mostly to close pacing gaps, because the
 * storyboard builder flags any stretch over 2.2s without a beat as a slideshow.
 */
const PLAN = {
  'tape-measure-hook': {
    hook: 'The most familiar tool in the drawer has a part everyone thinks is broken.',
    cast: { lead: 'bill', support: [], note: 'Bill is a person mildly betrayed by an object, then quietly impressed by it.' },
    scenes: [
      { id: 'hook', from: 'The metal hook', background: 'OldWorkshop', cast: ['bill'],
        note: 'The wobble is the hook of the episode. Show it moving before anyone explains it.',
        beats: [
          { at: 0, action: 'Bill holds a tape measure; the end hook visibly rattles as he shakes it' },
          { kw: 'wobbles', action: 'camera punches onto the hook; it slides back and forth on its rivets' },
          { at: 3.2, action: 'Bill turns the tape over, frowning at it', sync: 'secondary action — closes a pacing gap' },
          { kw: 'worn-out', action: 'a WORN OUT? label lands beside the hook, then gets crossed out' },
        ] },
      { id: 'slides', from: 'It slides exactly', background: 'SchematicVoid', cast: [],
        note: 'Clean measurement diagram. The travel distance and the hook thickness are drawn as the SAME dimension.',
        beats: [
          { at: 0, action: 'the hook isolates on a schematic field, drawn in section' },
          { kw: 'slides', action: 'the hook travels its full play; a dimension line measures the travel' },
          { kw: 'thick', action: 'a second dimension line measures the metal thickness — the two are identical and snap together' },
        ] },
      { id: 'outside', from: 'Hook it over', background: 'SchematicVoid', cast: [],
        note: 'Outside measurement. The hook pulls OUT and the gap it leaves is exactly its own thickness.',
        beats: [
          { at: 0, action: 'a board edge appears; the tape hooks over it' },
          { kw: 'pulls', action: 'the hook slides outward against the board; the tape body moves back by the hook thickness' },
          { kw: 'adding', action: 'the added thickness highlights teal against the ruler scale' },
        ] },
      { id: 'inside', from: 'Push it into', background: 'SchematicVoid', cast: [],
        note: 'Inside measurement — the mirror of the previous scene. Same hook, opposite direction.',
        beats: [
          { at: 0, action: 'the board becomes an inside corner; the tape pushes against it' },
          { kw: 'corner', action: 'the hook compresses flat against the wall, sliding inward' },
          { kw: 'away', action: 'the same thickness highlights coral and is subtracted from the scale' },
        ] },
      { id: 'payoff', from: 'Either way the tape', background: 'OldWorkshop', cast: ['bill'],
        note: 'Both diagrams collapse into one reading. Sincere, not smug. Hard cut on the last word.',
        beats: [
          { kw: 'zero', action: 'both measurements resolve to the same TRUE ZERO mark; the two diagrams overlay perfectly' },
          { fromEnd: 1.2, action: 'Bill wiggles the hook once more, now approvingly', sync: 'secondary action — closes a pacing gap' },
          { kw: 'honest', action: 'Bill clips the tape back on his belt; hard cut' },
        ] },
    ],
    keywords: [
      ['wobbles', ['wobbles'], 0], ['worn-out', ['worn', 'out'], 0],
      ['slides', ['slides'], 0], ['thick', ['thick'], 0],
      ['pulls', ['pulls'], 0], ['adding', ['adding'], 0],
      ['corner', ['corner'], 0], ['away', ['away'], 0],
      ['zero', ['zero'], 0], ['honest', ['honest'], 0],
    ],
  },

  'windshield-frit-dots': {
    hook: 'A black border you have looked past ten thousand times is holding the glass on.',
    cast: { lead: 'bill', support: [], note: 'Bill is a passenger noticing the edge of the glass for the first time.' },
    scenes: [
      { id: 'hook', from: 'Look along the top', background: 'CarInterior', cast: ['bill'],
        note: 'Start INSIDE the car looking up at the glass edge, which is where a viewer has actually seen this.',
        beats: [
          { at: 0, action: 'view up at a windshield top edge from inside; the black band runs across frame' },
          { kw: 'border', action: 'the solid band highlights; camera tracks along it' },
          { kw: 'dots', action: 'the band breaks into its dot gradient; each dot pops in along the fade' },
          { at: 4.6, action: 'Bill leans in from the passenger seat, nose near the glass', sync: 'secondary action — closes a pacing gap' },
        ] },
      { id: 'ceramic', from: 'That border is ceramic', background: 'CutawayVoid', cast: [],
        note: 'Cross-section through the glass edge. Glass, ceramic layer, adhesive, car body — four labelled bands.',
        beats: [
          { at: 0, action: 'the glass edge rotates into cross-section' },
          { kw: 'ceramic', action: 'the ceramic layer fills in black and labels itself' },
          { kw: 'adhesive', action: 'the urethane bead draws in beneath it, gripping the body' },
        ] },
      { id: 'glue', from: 'Sunlight would slowly', background: 'CutawayVoid', cast: [],
        note: 'The UV threat, shown as light that stops at the black layer. Restrained — no drama.',
        beats: [
          { at: 0, action: 'sun rays angle down toward the cross-section' },
          { kw: 'cook', action: 'rays reaching bare adhesive turn it brittle and grey' },
          { kw: 'shields', action: 'the ceramic band blocks the rays; the adhesive under it stays intact' },
        ] },
      { id: 'dots', from: 'The dots are the clever', background: 'SchematicVoid', cast: [],
        note: 'Beat of anticipation. Hold on the dot pattern alone before the reason arrives.',
        beats: [
          { at: 0, action: 'the dot gradient isolates on a plain field, large' },
          { kw: 'clever', action: 'the dots pulse once in sequence, from dense to sparse' },
        ] },
      { id: 'thermal', from: 'Black glass heats', background: 'SchematicVoid', cast: [],
        note: 'Heat map. A HARD edge cracks; the dotted edge does not. Show both, side by side.',
        beats: [
          { at: 0, action: 'two glass panels appear side by side, one hard-edged, one dotted' },
          { kw: 'heats', action: 'heat blooms coral from the black side of both panels' },
          { kw: 'crack', action: 'the hard-edged panel cracks along the boundary line' },
          { kw: 'gradually', action: 'the dotted panel grades smoothly from hot to cool and survives; hard cut' },
        ] },
    ],
    keywords: [
      ['border', ['border'], 0], ['dots', ['dots'], 0],
      ['ceramic', ['ceramic'], 0], ['adhesive', ['adhesive'], 0],
      ['cook', ['cook'], 0], ['shields', ['shields'], 0],
      ['clever', ['clever'], 0], ['heats', ['heats'], 0],
      ['crack', ['crack'], 0], ['gradually', ['gradually'], 0],
    ],
  },

  'coin-reeded-edges': {
    hook: 'A quarter is still carrying an anti-theft device for metal it stopped containing.',
    cast: { lead: 'bill', support: ['gus'], note: 'Gus plays the clipper in silhouette — never comic, never villainous, just a man with shears.' },
    scenes: [
      { id: 'hook', from: 'Run your thumb', background: 'DeskSurface', cast: ['bill'],
        note: 'Tactile opening. The ridges should be felt before they are explained.',
        beats: [
          { at: 0, action: "Bill's thumb runs the edge of an oversized quarter; ridges tick past" },
          { kw: 'ridges', action: 'camera punches to the edge; each ridge draws in teal' },
          { kw: 'stealing', action: 'a NOTHING WORTH STEALING label lands over the coin face' },
        ] },
      { id: 'clipping', from: 'Back when coins', background: 'OldWorkshop', cast: ['gus'],
        note: 'The fraud, shown plainly. Gus shaves a rim. Slivers accumulate. No moralising.',
        beats: [
          { at: 0, action: 'a silver coin on a workbench; Gus enters with shears' },
          { kw: 'shaved', action: 'a thin sliver peels off the rim and drops into a growing pile' },
          { at: 3.4, action: 'the pile of slivers rises another notch', sync: 'secondary action — closes a pacing gap' },
          { kw: 'normal', action: 'the shaved coin sits beside an intact one; they look identical' },
        ] },
      { id: 'grooves', from: 'So mints cut', background: 'SchematicVoid', cast: [],
        note: 'The countermeasure. The reveal is that a shaved reeded coin has an OBVIOUS smooth gap.',
        beats: [
          { at: 0, action: 'a blank coin edge rotates into view' },
          { kw: 'grooves', action: 'reeding cuts into the edge all the way around, tick by tick' },
          { kw: 'ended', action: 'a sliver is shaved off; the ridge pattern stops dead at a smooth flat, circled coral' },
        ] },
      { id: 'newton', from: 'Isaac Newton used', background: 'OldWorkshop', cast: ['gus'],
        note: 'One authority beat. Gus becomes the Mint, stamping. No wig, no caricature.',
        beats: [
          { at: 0, action: 'a mint press descends on a coin blank' },
          { kw: 'newton', action: 'the press stamps; a ROYAL MINT mark lands on the page beside it' },
        ] },
      { id: 'payoff', from: 'The silver is long', background: 'DeskSurface', cast: ['bill'],
        note: 'The reframe: a defence outliving the thing it defended. Ends on the object, not the joke.',
        beats: [
          { kw: 'gone', action: 'the silver drains out of the coin, leaving plain modern metal' },
          { kw: 'stayed', action: 'the ridges remain, drawn in full ink while everything else greys; hard cut' },
        ] },
    ],
    keywords: [
      ['ridges', ['ridges'], 0], ['stealing', ['stealing'], 0],
      ['shaved', ['shaved'], 0], ['normal', ['normal'], 0],
      ['grooves', ['grooves'], 0], ['ended', ['ended'], 0],
      ['newton', ['newton'], 0], ['gone', ['gone'], 0], ['stayed', ['stayed'], 0],
    ],
  },

  'foil-shiny-dull': {
    hook: 'Two sides, one difference, and it happened before the foil was ever a roll.',
    cast: { lead: 'bill', support: [], note: 'Kitchen Bill. Mildly annoyed at a box that will not explain itself.' },
    scenes: [
      { id: 'hook', from: 'One side of aluminum', background: 'KitchenCounter', cast: ['bill'],
        note: 'Both sides in one shot, catching light differently. The question is visual before it is spoken.',
        beats: [
          { at: 0, action: 'Bill pulls a sheet of foil off a roll; it flashes on one face, matte on the other' },
          { kw: 'shiny', action: 'the shiny face catches a highlight and labels itself' },
          { kw: 'dull', action: 'the sheet flips; the matte face labels itself' },
          { kw: 'explains', action: 'Bill turns the box over looking for an answer and finds nothing' },
        ] },
      { id: 'notcoating', from: 'It is not a coating', background: 'KitchenCounter', cast: ['bill'],
        note: 'Kill the two wrong answers fast so the real one has room. Crossed out, not argued with.',
        beats: [
          { at: 0, action: 'a COATING label appears over the sheet and is crossed out' },
          { kw: 'nonstick', action: 'a NONSTICK label appears and is crossed out too' },
        ] },
      { id: 'mill', from: 'Foil gets rolled', background: 'CutawayVoid', cast: [],
        note: 'THE mechanism scene. The two-sheet pass is the whole episode — give it room and show it clearly.',
        beats: [
          { at: 0, action: 'a rolling mill draws in; a thick aluminum ribbon feeds between two polished rollers' },
          { kw: 'thinner', action: 'the ribbon passes through repeatedly, thinning at each pass' },
          { kw: 'tear', action: 'a single ultra-thin sheet enters alone and rips apart; the frame flinches' },
          { kw: 'stacked', action: 'two sheets stack and enter together; they survive the pass' },
        ] },
      { id: 'outer', from: 'The outer faces', background: 'CutawayVoid', cast: [],
        note: 'Cross-section at the roller nip. Outer faces touch steel.',
        beats: [
          { at: 0, action: 'the nip enlarges into cross-section: roller, sheet, sheet, roller' },
          { kw: 'mirror', action: 'the two outer faces glow against the polished steel and come out gleaming' },
        ] },
      { id: 'inner', from: 'The two inner faces', background: 'CutawayVoid', cast: [],
        note: 'The other half of the same frame. Then peel them apart — that is the payoff image.',
        beats: [
          { at: 0, action: 'the two inner faces press together, matte where they meet' },
          { kw: 'inner', action: 'the sheets peel apart, each showing one shiny and one dull face' },
          { kw: 'dull-out', action: 'the pair separates fully and the episode hard cuts on the matched pair' },
        ] },
    ],
    keywords: [
      ['shiny', ['shiny'], 0], ['dull', ['dull'], 0], ['explains', ['explains'], 0],
      ['nonstick', ['nonstick'], 0],
      ['thinner', ['thinner'], 0], ['tear', ['tear'], 0], ['stacked', ['stacked'], 0],
      ['mirror', ['mirror-bright'], 0],
      ['inner', ['inner'], 0], ['dull-out', ['dull'], 1],
    ],
  },

  'tactile-paving': {
    hook: 'A two-symbol alphabet written into the floor of most of the world.',
    cast: { lead: 'bill', support: ['gus'], note: 'Handle with respect. Nobody stumbles, nobody is a punchline. Gus appears once as Miyake — dignified, no caricature.' },
    scenes: [
      { id: 'hook', from: 'Those bumpy tiles', background: 'CityStreet', cast: ['bill'],
        note: 'TONE: this is an accessibility feature, treated seriously. The comedy budget for this episode is zero.',
        beats: [
          { at: 0, action: 'a yellow tactile strip runs along a platform edge; Bill stands beside it' },
          { kw: 'language', action: 'the strip lights teal and the word LANGUAGE stamps beside it' },
          { kw: 'two-words', action: 'two blank symbol cards slide in, waiting to be filled' },
        ] },
      { id: 'domes', from: 'Round domes mean', background: 'SchematicVoid', cast: [],
        note: 'Symbol one. Domes fill the first card. The hazards are drawn as plain icons, not scenes of danger.',
        beats: [
          { at: 0, action: 'a dome-pattern tile fills frame, drawn large' },
          { kw: 'stop', action: 'the first card fills with domes and stamps STOP' },
          { kw: 'drop', action: 'three small icons appear beside it — platform edge, kerb, stair' },
        ] },
      { id: 'bars', from: 'Long parallel bars', background: 'SchematicVoid', cast: [],
        note: 'Symbol two, deliberately mirroring the previous scene so the pair reads as a set.',
        beats: [
          { at: 0, action: 'a bar-pattern tile fills frame in the same framing as the domes' },
          { kw: 'bars', action: 'the second card fills with bars and stamps GO' },
          { kw: 'safe', action: 'a guiding path of bars draws forward across the floor' },
        ] },
      { id: 'readable', from: 'Both are readable', background: 'CityStreet', cast: ['bill'],
        note: 'How it is actually read: through a sole, through a cane tip. Show contact, not a person struggling.',
        beats: [
          { at: 0, action: 'a shoe sole meets the domes; the pattern registers up through it' },
          { kw: 'cane', action: 'a cane tip taps across the bars, each tap ringing a small mark' },
          { kw: 'yellow', action: 'the tile colour saturates to high-contrast yellow against grey paving' },
        ] },
      { id: 'miyake', from: 'An engineer in Japan', background: 'OldWorkshop', cast: ['gus'],
        note: 'The origin. One man, his own money, one friend. Play it straight and let it land.',
        beats: [
          { at: 0, action: 'a drafting desk; Gus sketches a dome tile by hand' },
          { kw: 'miyake', action: 'the name and 1965 letter onto the drawing' },
          { kw: 'blind', action: 'a second figure is sketched beside the first at the drafting table; the two drawings sit together' },
        ] },
      { id: 'payoff', from: 'They are under most', background: 'CityStreet', cast: [],
        note: 'Pull back and multiply. The scale IS the payoff. End on the tile, not on a face.',
        beats: [
          { kw: 'worlds-feet', action: 'the camera pulls back; tactile strips light up across street after street' },
          { fromEnd: 0.15, action: 'the strips continue lighting to the horizon; hard cut', sync: 'final beat' },
        ] },
    ],
    keywords: [
      ['language', ['language'], 0], ['two-words', ['two', 'words'], 0],
      ['stop', ['stop'], 0], ['drop', ['drop'], 0],
      ['bars', ['bars'], 0], ['safe', ['safe'], 0],
      ['cane', ['cane'], 0], ['yellow', ['yellow'], 0],
      ['miyake', ['miyake'], 0], ['blind', ['blind'], 0],
      ['worlds-feet', ["world's", 'feet'], 0],
    ],
  },

  'airplane-ashtray': {
    hook: 'A fixture for a banned activity, kept because somebody will break the rule anyway.',
    cast: { lead: 'bill', support: ['gus'], note: 'Gus is the regulator. Dry, unbothered, correct. The episode is not anti-rule; the rule is the smart one.' },
    scenes: [
      { id: 'hook', from: 'Smoking has been banned', background: 'PlaneCabin', cast: ['bill'],
        note: 'The contradiction up front: a NO SMOKING sign and an ashtray in the same frame.',
        beats: [
          { at: 0, action: 'a lavatory door; a lit NO SMOKING sign above it' },
          { kw: 'banned', action: 'the sign pulses; a BANNED FOR DECADES label lands' },
          { kw: 'ashtray', action: 'camera tilts down to a small metal ashtray set into the door; it circles teal' },
        ] },
      { id: 'notleftover', from: 'It is not a leftover', background: 'PlaneCabin', cast: ['gus'],
        note: 'Gus arrives with a clipboard. The ashtray is required equipment — stamp it, do not joke about it.',
        beats: [
          { at: 0, action: 'a LEFTOVER? label appears over the ashtray and is crossed out' },
          { kw: 'require', action: 'Gus stamps REQUIRED onto a checklist page' },
          { kw: 'ground', action: 'a grounded aircraft icon appears beside the checklist' },
        ] },
      { id: 'reasoning', from: 'The reasoning is bleak', background: 'SchematicVoid', cast: [],
        note: 'A held beat. The tone shifts here from oddity to seriousness.',
        beats: [
          { at: 0, action: 'the frame clears to a plain field; the ashtray sits alone, small' },
          { kw: 'bleak', action: 'the light cools; the ashtray holds still' },
        ] },
      { id: 'cigarette', from: 'Somebody is eventually', background: 'CutawayVoid', cast: [],
        note: 'The unavoidable human. Shown as a hand and a cigarette only — no character breaking the rule on screen.',
        beats: [
          { at: 0, action: 'a lit cigarette appears in the lavatory cross-section' },
          { kw: 'smoke', action: 'a thin smoke curl rises' },
          { kw: 'ends-up', action: 'a question mark hovers over two possible destinations' },
        ] },
      { id: 'bin', from: 'Without an ashtray', background: 'CutawayVoid', cast: [],
        note: 'The bad outcome, stated as a diagram. Restrained — a glow, not a fire.',
        beats: [
          { at: 0, action: 'the cigarette drops toward a paper waste bin' },
          { kw: 'bin', action: 'the bin outlines coral; the paper inside begins to glow' },
          { kw: 'towels', action: 'the alternative draws beside it: the cigarette lands in the metal ashtray and goes out' },
        ] },
      { id: 'payoff', from: 'It is not there for smokers', background: 'PlaneCabin', cast: ['bill'],
        note: 'The reframe. Designing for the person who ignores you is the whole idea. Hard cut.',
        beats: [
          { kw: 'smokers', action: 'the ashtray lights alone as the rest of the door greys out' },
          { fromEnd: 0.15, action: 'Bill glances at it once and moves on down the aisle; hard cut', sync: 'final beat' },
        ] },
    ],
    keywords: [
      ['banned', ['banned'], 0], ['ashtray', ['ashtray'], 0],
      ['require', ['require'], 0], ['ground', ['ground'], 0],
      ['bleak', ['bleak'], 0], ['smoke', ['smoke'], 0], ['ends-up', ['ends', 'up'], 0],
      ['bin', ['bin'], 0], ['towels', ['towels'], 0], ['smokers', ['smokers'], 0],
    ],
  },

  'third-brake-light': {
    hook: 'A third light exists because two lights are genuinely ambiguous.',
    cast: { lead: 'bill', support: [], note: 'Bill is a driver behind the car. The episode is about what he can and cannot read.' },
    scenes: [
      { id: 'hook', from: 'Somewhere in the back window', background: 'HighwayRoad', cast: ['bill'],
        note: 'Establish the triangle: two low and wide, one high and centred.',
        beats: [
          { at: 0, action: 'the rear of a car ahead; three brake lights visible' },
          { kw: 'third', action: 'the high centre light circles teal' },
          { kw: 'centered', action: 'a triangle draws between the three lamps, showing the geometry' },
        ] },
      { id: 'misread', from: 'It exists because', background: 'HighwayRoad', cast: ['bill'],
        note: 'State the problem before the solution: the original pair are hard to read.',
        beats: [
          { at: 0, action: 'the high light dims out, leaving only the original pair' },
          { kw: 'misread', action: 'the two low lamps flicker ambiguously; a question mark rises' },
        ] },
      { id: 'lowwide', from: 'They sit low', background: 'HighwayRoad', cast: [],
        note: 'Three reasons, three marks. The tail lights already being on is the important one.',
        beats: [
          { at: 0, action: 'a LOW dimension line drops from the lamps to the road' },
          { kw: 'apart', action: 'a WIDE dimension line stretches between them' },
          { kw: 'glowing', action: 'the tail lights light in the same coral, blurring into the brake lamps' },
        ] },
      { id: 'single', from: 'A single light up high', background: 'HighwayRoad', cast: ['bill'],
        note: 'The solution scene. The high lamp is DARK until braking — that is why it is unambiguous.',
        beats: [
          { at: 0, action: 'the high light returns, dark and alone above the confusion' },
          { kw: 'brakes', action: 'it snaps on hard; the low pair are ignored entirely' },
          { kw: 'confused', action: "Bill's eye-line snaps straight to the single high lamp" },
        ] },
      { id: 'trials', from: 'Early taxi-fleet trials', background: 'CityStreet', cast: [],
        note: 'The optimistic number. Draw it as a bar so the next scene can shrink it.',
        beats: [
          { at: 0, action: 'a row of taxi icons fills the street' },
          { kw: 'trials', action: 'a bar chart rises to a third; a big optimistic figure stamps beside it' },
        ] },
      { id: 'reality', from: 'Once every car', background: 'CityStreet', cast: ['bill'],
        note: 'HONESTY BEAT. The bar SHRINKS on screen. This is the point of the episode and it must be shown, not hidden.',
        beats: [
          { kw: 'settled', action: 'the bar shrinks down to a small fraction; the optimistic figure is crossed out' },
          { kw: 'thousands', action: 'the small bar multiplies across a grid of cars until the total is large again' },
          { fromEnd: 0.15, action: 'the grid holds, still counting; hard cut', sync: 'final beat' },
        ] },
    ],
    keywords: [
      ['third', ['third'], 0], ['centered', ['centered'], 0],
      ['misread', ['misread'], 0], ['apart', ['apart'], 0], ['glowing', ['glowing'], 0],
      ['brakes', ['brakes'], 0], ['confused', ['confused'], 0],
      ['trials', ['trials'], 0], ['settled', ['settled'], 0], ['thousands', ['thousands'], 0],
    ],
  },

  'sneaker-lace-lock': {
    hook: 'The eyelet nobody uses is the one that stops the blister.',
    cast: { lead: 'bill', support: [], note: 'Bill has walked too far in bad shoes. Physical comedy is allowed here, gently.' },
    scenes: [
      { id: 'hook', from: 'Almost every sneaker', background: 'BedroomFloor', cast: ['bill'],
        note: 'Find the eyelet. It is set BACK from the others — that offset is the visual tell.',
        beats: [
          { at: 0, action: 'a sneaker in profile; laces threaded through every hole but the last' },
          { kw: 'extra', action: 'the unused eyelet circles teal, sitting slightly back from the row' },
          { kw: 'nobody', action: 'a NEVER USED label lands beside it' },
        ] },
      { id: 'thread', from: 'Thread the lace through', background: 'SchematicVoid', cast: [],
        note: 'Instructional and clear. The viewer should be able to copy this.',
        beats: [
          { at: 0, action: 'the shoe isolates on a plain field, laces drawn in bold' },
          { kw: 'thread', action: 'the lace feeds through the extra eyelet on each side' },
          { kw: 'loop', action: 'two small loops form above the ankle and hold' },
        ] },
      { id: 'cross', from: 'Cross the laces', background: 'SchematicVoid', cast: [],
        note: 'The crossing is the mechanism. Show the collar closing, not just the lace moving.',
        beats: [
          { at: 0, action: 'each lace end crosses toward the opposite loop' },
          { kw: 'cross', action: 'the laces thread through the opposing loops' },
          { kw: 'clamps', action: 'the ankle collar cinches closed; arrows show the grip moving from midfoot to ankle' },
        ] },
      { id: 'heel', from: 'Your heel stops', background: 'CutawayVoid', cast: [],
        note: 'Side-by-side cutaway of the heel: lifting versus held. The contrast carries the payoff.',
        beats: [
          { at: 0, action: 'cutaway of a heel inside a shoe, lifting free with each step' },
          { kw: 'lifting', action: 'the locked version draws beside it; the heel stays seated' },
        ] },
      { id: 'blister', from: 'Heel lift is what rubs', background: 'BedroomFloor', cast: ['bill'],
        note: 'Name the consequence, then end on Bill actually using it. No gloating.',
        beats: [
          { at: 0, action: 'friction marks scrub back and forth at the heel of the unlocked shoe' },
          { kw: 'blister', action: 'a coral hotspot blooms at the rub point on the unlocked shoe only' },
          { kw: 'walk', action: 'Bill laces the extra eyelet and walks off; hard cut' },
        ] },
    ],
    keywords: [
      ['extra', ['extra'], 0], ['nobody', ['nobody'], 0],
      ['thread', ['thread'], 0], ['loop', ['loop'], 0],
      ['cross', ['cross'], 0], ['clamps', ['clamps'], 0],
      ['lifting', ['lifting'], 0], ['blister', ['blister'], 0], ['walk', ['walk'], 0],
    ],
  },

  'padlock-drain-hole': {
    hook: 'A hole in a lock, which sounds like a flaw and is a defence.',
    cast: { lead: 'bill', support: [], note: 'Bill inspects the lock like a suspicious customer, then concedes.' },
    scenes: [
      { id: 'hook', from: 'Flip a padlock over', background: 'OldWorkshop', cast: ['bill'],
        note: 'The objection is the hook. Let the viewer think it is a design flaw for a beat.',
        beats: [
          { at: 0, action: 'Bill turns a padlock over in his hand' },
          { kw: 'hole', action: 'the small hole in the base circles teal' },
          { kw: 'water', action: 'a WATER GETS IN? label lands with an arrow pointing inward' },
        ] },
      { id: 'opposite', from: 'It does the opposite', background: 'OldWorkshop', cast: ['bill'],
        note: 'Flip the arrow. One beat, one reversal.',
        beats: [
          { kw: 'opposite', action: 'the inward arrow spins around to point outward; the label crosses out' },
        ] },
      { id: 'moisture', from: 'A padlock left outdoors', background: 'CutawayVoid', cast: [],
        note: 'Water arrives from several directions — the point is that you cannot prevent it.',
        beats: [
          { at: 0, action: 'the padlock hangs on a gate in cross-section' },
          { kw: 'moisture', action: 'droplets arrive from rain, from a hose, from damp air' },
          { kw: 'air', action: 'the droplets collect in the lock body and pool at the bottom' },
        ] },
      { id: 'rust', from: 'Sealed shut', background: 'CutawayVoid', cast: [],
        note: 'The failure this prevents. Springs and pins seizing — mechanical, not dramatic.',
        beats: [
          { at: 0, action: 'a sealed lock body fills with standing water' },
          { kw: 'springs', action: 'the pin stack and springs draw inside, submerged' },
          { kw: 'rust', action: 'the pins corrode and fuse into one solid mass; the key will not turn' },
          { kw: 'freeze', action: 'the water crystallises to ice; the shackle locks solid' },
        ] },
      { id: 'drains', from: 'The hole lets it fall', background: 'CutawayVoid', cast: [],
        note: 'The fix, and it should feel like relief after the previous scene.',
        beats: [
          { kw: 'fall', action: 'the hole opens; the pooled water drains straight out and the pins stay clean' },
        ] },
      { id: 'oil', from: 'It also gives you', background: 'OldWorkshop', cast: ['bill'],
        note: 'Second use, quick. End on Bill hanging the lock back up.',
        beats: [
          { kw: 'oil', action: 'a drop of lubricant enters through the same hole and spreads through the mechanism' },
          { fromEnd: 0.15, action: 'Bill snaps the padlock shut and hangs it back on the gate; hard cut', sync: 'final beat' },
        ] },
    ],
    keywords: [
      ['hole', ['hole'], 0], ['water', ['water'], 0], ['opposite', ['opposite'], 0],
      ['moisture', ['moisture'], 0], ['air', ['air'], 0],
      ['springs', ['springs'], 0], ['rust', ['rust'], 0], ['freeze', ['freeze'], 0],
      ['fall', ['fall'], 0], ['oil', ['oil'], 0],
    ],
  },

  'ferrite-choke': {
    hook: 'A cable is an antenna, and the lump is what shuts it up.',
    cast: { lead: 'bill', support: [], note: 'Desk Bill. The lump has annoyed him for years.' },
    scenes: [
      { id: 'hook', from: 'There is a hard lump', background: 'DeskSurface', cast: ['bill'],
        note: 'Weight sells it. Bill should feel the mass, not just see the shape.',
        beats: [
          { at: 0, action: 'a charger cable snakes across a desk; Bill picks up the moulded lump' },
          { kw: 'lump', action: 'the lump circles teal; camera punches in' },
          { kw: 'heavy', action: 'the cable dips under the lump; a small weight mark drops beside it' },
        ] },
      { id: 'inside', from: 'Inside it is a ring', background: 'CutawayVoid', cast: [],
        note: 'Open it up. A ring around the wire, nothing more complicated than that.',
        beats: [
          { at: 0, action: 'the plastic shell peels away in cross-section' },
          { kw: 'ferrite', action: 'a dark ceramic ring is revealed encircling the cable, labelled' },
        ] },
      { id: 'antenna', from: 'A power cable is a long', background: 'SchematicVoid', cast: [],
        note: 'THE idea of the episode: wire equals antenna. Broadcast waves need to look like a nuisance.',
        beats: [
          { at: 0, action: 'the cable straightens into a plain horizontal wire on a schematic field' },
          { kw: 'antenna', action: 'the wire redraws as an aerial; broadcast arcs radiate off it' },
          { kw: 'noise', action: 'jagged high-frequency squiggles run along the wire in coral' },
          { kw: 'carry', action: 'the arcs reach a nearby radio icon, which fuzzes' },
        ] },
      { id: 'filter', from: 'The ferrite ring lets', background: 'SchematicVoid', cast: [],
        note: 'Selectivity is the mechanism: power passes, noise does not. Show BOTH signals meeting the ring.',
        beats: [
          { at: 0, action: 'the ferrite ring drops onto the wire' },
          { kw: 'power', action: 'a smooth low-frequency wave passes straight through the ring untouched' },
          { kw: 'heat', action: 'the jagged noise hits the ring, is absorbed, and radiates off as small heat marks' },
        ] },
      { id: 'payoff', from: 'It is a filter wrapped', background: 'DeskSurface', cast: ['bill'],
        note: 'Return to the desk. The radio clears. End on the object.',
        beats: [
          { kw: 'filter', action: 'the ring settles back inside its plastic shell on the real cable' },
          { kw: 'transmitting', action: 'the broadcast arcs cut out; the radio icon clears; hard cut' },
        ] },
    ],
    keywords: [
      ['lump', ['lump'], 0], ['heavy', ['heavy'], 0], ['ferrite', ['ferrite'], 0],
      ['antenna', ['antenna'], 0], ['noise', ['noise'], 0], ['carry', ['carry'], 0],
      ['power', ['power'], 1], ['heat', ['heat'], 0],
      ['filter', ['filter'], 0], ['transmitting', ['transmitting'], 0],
    ],
  },

  'brick-holes': {
    hook: 'Holes make a solid object better at being solid.',
    cast: { lead: 'bill', support: [], note: 'Bill on a building site, holding a brick with obvious suspicion.' },
    scenes: [
      { id: 'hook', from: 'A brick has holes', background: 'OldWorkshop', cast: ['bill'],
        note: 'The paradox up front: an object whose job is being solid, full of holes.',
        beats: [
          { at: 0, action: 'Bill holds up a brick; three holes run through it' },
          { kw: 'holes', action: 'camera punches through one hole and out the other side' },
          { kw: 'solid', action: 'a SOLID? label lands over the brick and wavers' },
        ] },
      { id: 'better', from: 'The holes make it better', background: 'OldWorkshop', cast: ['bill'],
        note: 'Short pivot beat. Three numbered slots appear and wait to be filled.',
        beats: [
          { kw: 'better', action: 'three empty numbered slots slide in beside the brick' },
        ] },
      { id: 'mortar', from: 'Mortar squeezes down', background: 'CutawayVoid', cast: [],
        note: 'Reason one. The keying action is the good visual — mortar as a plug, not a glue line.',
        beats: [
          { at: 0, action: 'two brick courses in cross-section with mortar between' },
          { kw: 'mortar', action: 'mortar presses down into the holes and sets, forming plugs' },
          { kw: 'keyed', action: 'the plugs lock the courses together; a flat-glued wall beside it slides apart' },
        ] },
      { id: 'firing', from: 'Wet clay also has to dry', background: 'CutawayVoid', cast: [],
        note: 'Reason two. Heat reaching the middle — a heat map, two bricks compared.',
        beats: [
          { at: 0, action: 'a solid brick and a perforated brick enter a kiln side by side' },
          { kw: 'cracking', action: 'the solid brick heats unevenly and cracks through the middle' },
          { kw: 'faster', action: 'heat travels through the perforated brick from inside and out; it fires evenly' },
        ] },
      { id: 'payoff', from: 'Less clay', background: 'OldWorkshop', cast: ['bill'],
        note: 'Reason three plus the summary. The slots fill in as each phrase lands. Hard cut on the wall.',
        beats: [
          { kw: 'clay', action: 'the first slot fills: LESS CLAY' },
          { kw: 'fuel', action: 'the second slot fills: LESS FUEL' },
          { kw: 'wall', action: 'the third fills: STRONGER WALL; a finished wall builds up behind Bill; hard cut' },
        ] },
    ],
    keywords: [
      ['holes', ['holes'], 0], ['solid', ['solid'], 0], ['better', ['better'], 0],
      ['mortar', ['mortar'], 0], ['keyed', ['keyed'], 0],
      ['cracking', ['cracking'], 0], ['faster', ['faster'], 0],
      ['clay', ['clay'], 1], ['fuel', ['fuel'], 0], ['wall', ['wall'], 0],
    ],
  },

  'railway-ballast': {
    hook: 'Loose stones doing four structural jobs at once.',
    cast: { lead: 'bill', support: [], note: 'Bill trackside. Four jobs, four marks — this episode is a list done visually.' },
    scenes: [
      { id: 'hook', from: 'Train tracks sit on a bed', background: 'HighwayRoadside', cast: ['bill'],
        note: 'Establish the stones as deliberate, not mess. The angularity matters later — show it now.',
        beats: [
          { at: 0, action: 'a track bed in profile; sharp stones packed under the sleepers' },
          { kw: 'gravel', action: 'camera punches into the stones; their sharp edges draw clearly' },
          { kw: 'purpose', action: 'an ON PURPOSE label lands; four empty tally marks appear' },
        ] },
      { id: 'load', from: 'A loaded train puts', background: 'CutawayVoid', cast: [],
        note: 'Job one. A narrow load spreading into a wide cone is the clearest possible drawing of it.',
        beats: [
          { at: 0, action: 'a loaded train presses down on a single rail in cross-section' },
          { kw: 'weight', action: 'a heavy arrow drives down through rail and sleeper' },
          { kw: 'spread', action: 'the force fans out through the stones into a wide cone' },
          { kw: 'sink', action: 'a no-ballast version beside it punches straight into the ground; first tally fills' },
        ] },
      { id: 'interlock', from: 'Because they are angular', background: 'SchematicVoid', cast: [],
        note: 'Job two. Angular versus rounded, side by side. The rounded bed should visibly flow apart.',
        beats: [
          { at: 0, action: 'angular stones and round pebbles fill two panels' },
          { kw: 'lock', action: 'the angular stones wedge against each other and hold' },
          { kw: 'creeping', action: 'the rounded panel rolls apart under a sideways push; second tally fills' },
        ] },
      { id: 'drainage', from: 'Rain drains through', background: 'CutawayVoid', cast: [],
        note: 'Job three. Water falling straight through, versus a mud bed. Quick.',
        beats: [
          { at: 0, action: 'rain falls onto the ballast bed' },
          { kw: 'drains', action: 'water runs through the gaps and away beneath' },
          { kw: 'mud', action: 'a sealed bed beside it turns to mud and sags; third tally fills' },
        ] },
      { id: 'vibration', from: 'And the layer soaks', background: 'HighwayRoadside', cast: ['bill'],
        note: 'Job four. Vibration damped between stones. Fourth tally completes the set — that is the button.',
        beats: [
          { at: 0, action: 'a train passes; vibration rings radiate down into the bed' },
          { kw: 'vibration', action: 'the rings scatter and fade between the stones' },
          { kw: 'shakes', action: 'Bill barely rocks trackside; the fourth tally fills and all four glow; hard cut' },
        ] },
    ],
    keywords: [
      ['gravel', ['gravel'], 0], ['purpose', ['purpose'], 0],
      ['weight', ['weight'], 0], ['spread', ['spread'], 0], ['sink', ['sink'], 0],
      ['lock', ['lock'], 0], ['creeping', ['creeping'], 0],
      ['drains', ['drains'], 0], ['mud', ['mud'], 0],
      ['vibration', ['vibration'], 0], ['shakes', ['shakes'], 0],
    ],
  },

  'chip-bag-nitrogen': {
    hook: 'The air you resent is neither air nor a con.',
    cast: { lead: 'bill', support: [], note: 'Bill starts as the aggrieved customer and is talked round. That arc IS the episode.' },
    scenes: [
      { id: 'hook', from: 'A bag of chips is mostly', background: 'KitchenCounter', cast: ['bill'],
        note: 'Lead with the grievance so the payoff can answer it.',
        beats: [
          { at: 0, action: 'Bill opens a large bag; the chips inside fill a third of it' },
          { kw: 'mostly', action: 'the empty volume shades in and labels itself' },
          { kw: 'not-air', action: 'an AIR label appears over the empty space and crosses out' },
        ] },
      { id: 'oxygen', from: 'Air is a fifth oxygen', background: 'SchematicVoid', cast: [],
        note: 'Oxygen as the villain. Molecules attacking oil is the mechanism — keep it simple and legible.',
        beats: [
          { at: 0, action: 'air separates into labelled molecule groups; the oxygen fifth highlights coral' },
          { kw: 'oxygen', action: 'oxygen molecules drift onto a chip' },
          { kw: 'rancid', action: 'the oil on the chip darkens and dulls; a RANCID mark stamps' },
        ] },
      { id: 'nitrogen', from: 'So the bag gets flushed', background: 'CutawayVoid', cast: [],
        note: 'The swap, shown as a flush: nitrogen in, oxygen out. Teal displaces coral.',
        beats: [
          { at: 0, action: 'a filling nozzle enters the bag' },
          { kw: 'nitrogen', action: 'teal nitrogen floods in; coral oxygen is pushed out of the neck' },
          { kw: 'inert', action: 'nitrogen molecules bounce off the chips without reacting' },
        ] },
      { id: 'freshness', from: 'That is the freshness half', background: 'SchematicVoid', cast: [],
        note: 'Split the frame. Half one is done; half two is coming.',
        beats: [
          { kw: 'freshness', action: 'the frame splits; the first half fills with a FRESHNESS tick' },
        ] },
      { id: 'cushion', from: 'The other half is that chips', background: 'CityStreet', cast: [],
        note: 'The transit case. Crushing is the risk — a bag surviving a stack is the proof.',
        beats: [
          { at: 0, action: 'bags stack high on a pallet; a truck loads them' },
          { kw: 'stacked', action: 'weight presses down; an unpressurised bag crumbles to crumbs' },
          { kw: 'pillow', action: 'the gas-filled bag springs back; the second half fills with a CUSHION tick' },
        ] },
      { id: 'payoff', from: 'You are buying a cushion', background: 'KitchenCounter', cast: ['bill'],
        note: 'Bill concedes. Both halves glow. Ends without smugness.',
        beats: [
          { kw: 'cushion', action: 'both halves glow together over the bag' },
          { kw: 'preservative', action: 'Bill shrugs, accepts it, and eats a chip; hard cut' },
        ] },
    ],
    keywords: [
      ['mostly', ['mostly'], 0], ['not-air', ['air'], 0],
      ['oxygen', ['oxygen'], 0], ['rancid', ['rancid'], 0],
      ['nitrogen', ['nitrogen'], 0], ['inert', ['inert'], 0],
      ['freshness', ['freshness'], 0],
      ['stacked', ['stacked'], 0], ['pillow', ['pillow'], 0],
      ['cushion', ['cushion'], 0], ['preservative', ['preservative'], 0],
    ],
  },

  'toilet-seat-gap': {
    hook: 'An inconsistency between home and public fixtures, explained by a rulebook.',
    cast: { lead: 'bill', support: ['gus'], note: 'Keep it clean and matter-of-fact. Gus is the code official. Nothing here is a toilet joke.' },
    scenes: [
      { id: 'hook', from: 'Public toilet seats have a gap', background: 'MallInterior', cast: ['bill'],
        note: 'TONE: plainly, without smirking. The comparison is the hook, not the subject.',
        beats: [
          { at: 0, action: 'a public restroom stall; the open-front seat draws in clean outline' },
          { kw: 'gap', action: 'the gap at the front circles teal' },
          { kw: 'house', action: 'a closed home seat draws beside it; the two shapes compare directly' },
        ] },
      { id: 'written', from: 'It is written down', background: 'SchematicVoid', cast: [],
        note: 'One beat. A book lands. That is the whole scene.',
        beats: [
          { kw: 'written', action: 'a plain code book drops onto frame and opens' },
        ] },
      { id: 'code', from: 'The plumbing codes', background: 'SchematicVoid', cast: ['gus'],
        note: 'Gus stamps the clause. Note: codes are ADOPTED by jurisdictions, not federal law — the stamp says CODE, not LAW.',
        beats: [
          { at: 0, action: 'a clause highlights on the open page: open-front seats, public use' },
          { kw: 'open-front', action: 'Gus stamps the clause once, hard' },
          { kw: 'fifty', action: 'a date line runs back across five decades behind the page' },
        ] },
      { id: 'hygiene', from: 'The gap keeps the seat clear', background: 'SchematicVoid', cast: [],
        note: 'The functional reason, drawn as a plain contact-zone diagram. No bodies.',
        beats: [
          { at: 0, action: 'the seat outline shows a shaded contact zone' },
          { kw: 'clear', action: 'the gap removes the seat from that zone; the shading pulls back' },
          { kw: 'strangers', action: 'a long queue of figures files past the same seat, one after another' },
        ] },
      { id: 'pool', from: 'It also leaves urine', background: 'SchematicVoid', cast: [],
        note: 'Second function, fast and clinical.',
        beats: [
          { kw: 'pool', action: 'the closed seat shows a low front trough; the open seat has nowhere for it to gather' },
        ] },
      { id: 'payoff', from: 'What reads as cost-cutting', background: 'MallInterior', cast: ['bill'],
        note: 'The reframe: not cheapness, a requirement. Hard cut.',
        beats: [
          { kw: 'cost-cutting', action: 'a CHEAP label appears over the seat and crosses out' },
          { kw: 'rule', action: 'the code stamp lands over it instead; hard cut' },
        ] },
    ],
    keywords: [
      ['gap', ['gap'], 0], ['house', ['house'], 0], ['written', ['written'], 0],
      ['open-front', ['open-front'], 0], ['fifty', ['fifty'], 0],
      ['clear', ['clear'], 0], ['strangers', ['strangers'], 0], ['pool', ['pool'], 0],
      ['cost-cutting', ['cost-cutting'], 0], ['rule', ['rule'], 0],
    ],
  },

  'soda-can-neck': {
    hook: 'A taper worth two hundred million pounds of metal a year.',
    cast: { lead: 'bill', support: [], note: 'Bill with a can. The scale reveal at the end is the whole point.' },
    scenes: [
      { id: 'hook', from: 'The top of a soda can', background: 'KitchenCounter', cast: ['bill'],
        note: 'Make the taper visible — most people have never consciously seen it.',
        beats: [
          { at: 0, action: 'a can stands in profile; the shoulder tapers in toward the lid' },
          { kw: 'narrower', action: 'dimension lines measure body width against lid width' },
          { kw: 'tapering', action: 'the taper highlights teal along the shoulder' },
        ] },
      { id: 'notmouth', from: 'That taper is not shaped', background: 'KitchenCounter', cast: ['bill'],
        note: 'Kill the intuitive wrong answer in one beat.',
        beats: [
          { kw: 'mouth', action: 'a FOR YOUR MOUTH label appears and crosses out' },
        ] },
      { id: 'lid', from: 'The lid has to be much thicker', background: 'CutawayVoid', cast: [],
        note: 'The asymmetry is the mechanism: lid metal is much thicker than wall metal. Show the gauge difference plainly.',
        beats: [
          { at: 0, action: 'the can sections; wall and lid thickness draw at true relative scale' },
          { kw: 'thicker', action: 'the lid gauge highlights, several times the wall gauge' },
          { kw: 'pressure', action: 'internal pressure arrows push outward against the lid' },
          { kw: 'tab', action: 'a finger levers the tab; the lid flexes but holds' },
        ] },
      { id: 'saving', from: 'Thick metal is expensive', background: 'SchematicVoid', cast: [],
        note: 'The comparison that justifies the design: shrink the lid, not the walls.',
        beats: [
          { at: 0, action: 'two strategies draw side by side — thinner walls, or a smaller lid' },
          { kw: 'shrinking', action: 'the lid shrinks; a large metal saving bar fills' },
          { kw: 'shaving', action: 'the wall-shaving option barely moves its bar and is crossed out' },
        ] },
      { id: 'scale', from: 'Six millimeters have come off', background: 'SchematicVoid', cast: ['bill'],
        note: 'SCALE IS THE PAYOFF. Six millimetres, then multiply until the number is absurd. Hard cut.',
        beats: [
          { at: 0, action: 'a 6 mm dimension line draws across the lid rim — almost nothing' },
          { kw: 'millimeters', action: 'the tiny measurement holds alone on screen' },
          { kw: 'pounds', action: 'cans multiply across the frame until they fill it; a vast annual figure stamps; hard cut' },
        ] },
    ],
    keywords: [
      ['narrower', ['narrower'], 0], ['tapering', ['tapering'], 0], ['mouth', ['mouth'], 0],
      ['thicker', ['thicker'], 0], ['pressure', ['pressure'], 0], ['tab', ['tab'], 0],
      ['shrinking', ['shrinking'], 0], ['shaving', ['shaving'], 0],
      ['millimeters', ['millimeters'], 0], ['pounds', ['pounds'], 0],
    ],
  },

  'revolving-door': {
    hook: 'A worse door that solves a problem you cannot see.',
    cast: { lead: 'bill', support: [], note: 'Bill struggles through the door with a box, then understands why it wins anyway.' },
    scenes: [
      { id: 'hook', from: 'A revolving door is slower', background: 'MallInterior', cast: ['bill'],
        note: 'Stack the objections honestly — the episode is stronger if the door genuinely looks worse first.',
        beats: [
          { at: 0, action: 'Bill shuffles through a revolving door carrying an awkward box' },
          { kw: 'slower', action: 'three complaint labels stack up: SLOWER, EXPENSIVE, AWKWARD' },
          { kw: 'installing', action: 'the labels hold while tall buildings rise behind him' },
        ] },
      { id: 'stack', from: 'Warm air inside a tall', background: 'CutawayVoid', cast: [],
        note: 'THE invisible problem. A whole-building section — the scale of the airflow is the reveal.',
        beats: [
          { at: 0, action: 'a tall building sections open from lobby to roof' },
          { kw: 'rises', action: 'warm air columns upward through the building and vents at the top' },
          { kw: 'cold', action: 'cold air rushes in hard at street level to replace it' },
        ] },
      { id: 'windtunnel', from: 'On an ordinary door', background: 'CutawayVoid', cast: ['bill'],
        note: 'The consequence, played for one small laugh — a hinged door as a wind tunnel.',
        beats: [
          { at: 0, action: 'an ordinary hinged door opens at the lobby' },
          { kw: 'wind-tunnel', action: 'air blasts through the opening; papers and hair fly' },
          { kw: 'heating', action: 'warm coral air pours out into the street and dissipates' },
        ] },
      { id: 'neveropens', from: 'A revolving door never', background: 'SchematicVoid', cast: [],
        note: 'The mechanism, from directly overhead. The seal is always closed — that is the whole trick.',
        beats: [
          { at: 0, action: 'top-down view of the revolving door; four compartments rotate' },
          { kw: 'never', action: 'the seal between inside and outside holds continuously as it turns' },
        ] },
      { id: 'payoff', from: 'Only the wedge of air', background: 'MallInterior', cast: ['bill'],
        note: 'The small wedge versus the earlier blast. Contrast carries it. Hard cut.',
        beats: [
          { kw: 'wedge', action: 'one small wedge of air shades in and rotates through with Bill' },
          { fromEnd: 0.15, action: 'the lobby air stays completely still around him; hard cut', sync: 'final beat' },
        ] },
    ],
    keywords: [
      ['slower', ['slower'], 0], ['installing', ['installing'], 0],
      ['rises', ['rises'], 0], ['cold', ['cold'], 0],
      ['wind-tunnel', ['wind', 'tunnel'], 0], ['heating', ['heating'], 0],
      ['never', ['never'], 0], ['wedge', ['wedge'], 0],
    ],
  },

  'convex-mirror-warning': {
    hook: 'A legally required admission that a mirror is lying to you.',
    cast: { lead: 'bill', support: [], note: 'Bill driving. The mirror asymmetry is something he has looked at daily and never questioned.' },
    scenes: [
      { id: 'hook', from: 'On an American car', background: 'CarInterior', cast: ['bill'],
        note: 'The asymmetry is the hook: two mirrors on one car, only one carrying text. US-specific and the script says so.',
        beats: [
          { at: 0, action: 'both wing mirrors draw in side by side, seen from the driver seat' },
          { kw: 'curved', action: 'the passenger mirror bulges visibly; the driver mirror stays flat' },
          { kw: 'warning', action: 'the warning text appears along the bottom of the curved one and circles teal' },
        ] },
      { id: 'curving', from: 'Curving a mirror squeezes', background: 'SchematicVoid', cast: [],
        note: 'The optics, from above. A wider cone entering the same glass — and the blind spot it covers.',
        beats: [
          { at: 0, action: 'top-down: a flat mirror reflects a narrow cone of road' },
          { kw: 'squeezes', action: 'the mirror curves; the cone widens dramatically into the same glass' },
          { kw: 'blind-spot', action: 'a shaded blind spot beside the car is swallowed by the wider cone' },
        ] },
      { id: 'price', from: 'The price is that everything', background: 'CutawayVoid', cast: [],
        note: 'The trade-off. Same car, two mirrors, visibly different size — that comparison is the payoff setup.',
        beats: [
          { at: 0, action: 'one car appears in both mirrors at once, at true relative size' },
          { kw: 'smaller', action: 'the image in the curved mirror shrinks noticeably' },
          { kw: 'further', action: 'a thought bubble reads the small image as distant; the real car is much closer' },
        ] },
      { id: 'payoff', from: 'The warning exists because', background: 'CarInterior', cast: ['bill'],
        note: 'The reframe: the text is an admission, required in writing. End on the etched line.',
        beats: [
          { kw: 'misleading', action: 'the real gap and the perceived gap draw together; the difference shades coral' },
          { kw: 'writing', action: 'the warning text etches permanently into the glass; hard cut' },
        ] },
    ],
    keywords: [
      ['curved', ['curved'], 0], ['warning', ['warning'], 0],
      ['squeezes', ['squeezes'], 0], ['blind-spot', ['blind', 'spot'], 0],
      ['smaller', ['smaller'], 0], ['further', ['further'], 0],
      ['misleading', ['misleading'], 0], ['writing', ['writing'], 0],
    ],
  },

  'beer-bottle-brown-glass': {
    hook: 'Light does not spoil beer by warming it. It breaks it chemically.',
    cast: { lead: 'bill', support: [], note: 'Bill is a curious drinker, not a connoisseur. The chemistry is the star.' },
    scenes: [
      { id: 'hook', from: 'Beer almost always comes', background: 'KitchenCounter', cast: ['bill'],
        note: 'State the claim boldly — light BREAKS beer — then earn it.',
        beats: [
          { at: 0, action: 'brown bottles line up on a counter; Bill picks one up' },
          { kw: 'brown', action: 'the brown glass highlights; a clear bottle appears beside it' },
          { kw: 'breaks', action: 'a beam of light strikes the clear bottle and the liquid visibly shifts' },
        ] },
      { id: 'hops', from: 'Hops leave compounds', background: 'SchematicVoid', cast: [],
        note: 'Establish the stable state so the reaction has something to disrupt.',
        beats: [
          { at: 0, action: 'the liquid magnifies into molecules drifting calmly in darkness' },
          { kw: 'stable', action: 'the hop compounds sit still and label themselves; nothing moves' },
        ] },
      { id: 'riboflavin', from: 'Hit them with blue', background: 'SchematicVoid', cast: [],
        note: 'THE mechanism. Riboflavin is a MIDDLEMAN — it must visibly receive light and pass energy on.',
        beats: [
          { at: 0, action: 'blue and ultraviolet light enters the molecular field' },
          { kw: 'riboflavin', action: 'a riboflavin molecule absorbs the light and brightens' },
          { kw: 'middleman', action: 'it hands the energy across to a hop compound in a visible transfer arc' },
        ] },
      { id: 'shatter', from: 'It absorbs the light', background: 'SchematicVoid', cast: [],
        note: 'The break, then the reveal. The skunk comparison is chemical, not a joke — keep the drawing factual.',
        beats: [
          { at: 0, action: 'the energy arrives at the hop compound and strains it' },
          { kw: 'shatter', action: 'the compound splits apart into fragments' },
          { kw: 'skunk', action: 'the fragment redraws beside a matching molecule labelled from skunk spray; the two are identical' },
          { kw: 'speech', action: 'a NOT A METAPHOR stamp lands beside the pair' },
        ] },
      { id: 'glass', from: 'Brown glass blocks', background: 'KitchenCounter', cast: ['bill'],
        note: 'Three bottles, three outcomes. Brown blocks, green partly, clear not at all. Hard cut.',
        beats: [
          { at: 0, action: 'brown, green and clear bottles line up under the same light' },
          { kw: 'blocks', action: 'light stops at the brown glass; the beer behind stays intact' },
          { kw: 'green', action: 'some light passes the green glass; a little reaction starts inside' },
          { kw: 'imports', action: 'Bill sniffs the green bottle and pulls a face; hard cut' },
        ] },
    ],
    keywords: [
      ['brown', ['brown'], 0], ['breaks', ['breaks'], 0], ['stable', ['stable'], 0],
      ['riboflavin', ['riboflavin'], 0], ['middleman', ['middleman'], 0],
      ['shatter', ['shatter'], 0], ['skunk', ['skunk'], 0], ['speech', ['speech'], 0],
      ['blocks', ['blocks'], 0], ['green', ['green'], 0], ['imports', ['imports'], 0],
    ],
  },

  'cabin-lights-dim': {
    hook: 'A comfort gesture that is actually evacuation preparation.',
    cast: { lead: 'bill', support: [], note: 'TONE: this concerns emergency evacuation. Nobody panics, nothing burns. The diagram stays calm.' },
    scenes: [
      { id: 'hook', from: 'The cabin lights go down', background: 'PlaneCabin', cast: ['bill'],
        note: 'Two wrong explanations offered up front, both of which the viewer probably holds.',
        beats: [
          { at: 0, action: 'the cabin dims for landing; window shades up, night outside' },
          { kw: 'dim-down', action: 'the lights fade; a MOOD LIGHTING label appears' },
          { kw: 'saving', action: 'a SAVING POWER label appears beside it' },
        ] },
      { id: 'neither', from: 'It is neither', background: 'PlaneCabin', cast: ['bill'],
        note: 'One beat. Both labels die together.',
        beats: [
          { kw: 'neither', action: 'both labels cross out at once' },
        ] },
      { id: 'adapt', from: 'Eyes take several minutes', background: 'SchematicVoid', cast: [],
        note: 'Dark adaptation as a timed process. The clock matters — minutes, not instants.',
        beats: [
          { at: 0, action: 'an eye diagram in bright light, pupil small' },
          { kw: 'adapt', action: 'the light drops; the pupil widens slowly against a running clock' },
          { kw: 'evacuation', action: 'takeoff and landing highlight on a flight profile as the risk windows' },
        ] },
      { id: 'blind', from: 'If the cabin were brightly lit', background: 'CutawayVoid', cast: [],
        note: 'The counterfactual, stated calmly. Bright then dark, and nobody can see. No screaming, no fire.',
        beats: [
          { at: 0, action: 'a brightly lit cabin in cross-section, everything clearly visible' },
          { kw: 'power', action: 'the lights cut; the frame goes near-black' },
          { kw: 'blind', action: 'the exits are unreadable in the dark; a clock ticks off the adaptation delay' },
        ] },
      { id: 'payoff', from: 'Dimming early means', background: 'PlaneCabin', cast: ['bill'],
        note: 'The resolution: pre-adapted eyes read the cabin instantly. End on the floor lighting.',
        beats: [
          { at: 0, action: 'the pre-dimmed cabin loses power; the scene stays readable' },
          { kw: 'adjusted', action: 'the floor path lighting and exit signs read clearly and brightly' },
          { kw: 'see', action: 'the exit path glows the full length of the aisle; hard cut' },
        ] },
    ],
    keywords: [
      ['dim-down', ['down'], 0], ['saving', ['saving'], 0], ['neither', ['neither'], 0],
      ['adapt', ['adapt'], 0], ['evacuation', ['evacuation'], 0],
      ['power', ['power'], 1], ['blind', ['blind'], 0],
      ['adjusted', ['adjusted'], 0], ['see', ['see'], 0],
    ],
  },

  'thermal-receipt-fade': {
    hook: 'A print process that never actually finishes.',
    cast: { lead: 'bill', support: [], note: 'Bill finds a blank receipt in a wallet at exactly the wrong moment.' },
    scenes: [
      { id: 'hook', from: 'A receipt left in a wallet', background: 'DeskSurface', cast: ['bill'],
        note: 'The blank receipt is the hook. Everyone has been here.',
        beats: [
          { at: 0, action: 'Bill pulls a receipt from a wallet; the print is almost gone' },
          { kw: 'blank', action: 'the remaining text fades out entirely as he holds it' },
          { kw: 'ink', action: 'a NO INK label lands and holds' },
        ] },
      { id: 'coating', from: 'Receipt paper is coated', background: 'CutawayVoid', cast: [],
        note: 'Two chemicals, side by side, inert. They must look harmless before they react.',
        beats: [
          { at: 0, action: 'the paper sections; a thin surface coating draws on top' },
          { kw: 'dye', action: 'colourless dye particles label themselves within the coating' },
          { kw: 'developer', action: 'developer particles sit beside them, separate and unreacted' },
        ] },
      { id: 'heaters', from: 'The printer has no ink', background: 'CutawayVoid', cast: [],
        note: 'The printer reveal: no cartridge, no ribbon, just heat. Show the absence first.',
        beats: [
          { at: 0, action: 'a receipt printer opens; an empty cartridge slot is circled and crossed out' },
          { kw: 'ribbon', action: 'a RIBBON label crosses out too' },
          { kw: 'heaters', action: 'a row of tiny heating elements draws across the print head, glowing' },
        ] },
      { id: 'reaction', from: 'Wherever it touches', background: 'CutawayVoid', cast: [],
        note: 'The reaction, magnified. Melt, meet, blacken.',
        beats: [
          { at: 0, action: 'a heating element presses onto the coating' },
          { kw: 'melts', action: 'the coating softens under the heat' },
          { kw: 'black', action: 'dye and developer meet and the spot turns black; letters form across the paper' },
        ] },
      { id: 'fade', from: 'The catch is the reaction', background: 'DeskSurface', cast: ['bill'],
        note: 'The flaw: the reaction never locks. Show the same chemistry continuing where it should not.',
        beats: [
          { at: 0, action: 'the printed spot holds, but the two chemicals stay live beneath it' },
          { kw: 'locks', action: 'a LOCKED? label appears over the print and crosses out' },
          { kw: 'dashboard', action: 'sunlight through a windscreen and friction in a pocket drive the reaction onward' },
          { kw: 'vanishes', action: 'the whole receipt darkens over, then empties to blank; hard cut' },
        ] },
    ],
    keywords: [
      ['blank', ['blank'], 0], ['ink', ['ink'], 0],
      ['dye', ['dye'], 0], ['developer', ['developer'], 0],
      ['ribbon', ['ribbon'], 0], ['heaters', ['heaters'], 0],
      ['melts', ['melts'], 0], ['black', ['black'], 0],
      ['locks', ['locks'], 0], ['dashboard', ['dashboard'], 0], ['vanishes', ['vanishes'], 0],
    ],
  },
};

/**
 * Secondary actions, one per pacing gap the storyboard check reported.
 *
 * `[sceneId, tInScene, action]`. The storyboard flags any stretch over 2.2s without a beat as
 * a slideshow, which is a machine-checkable definition of "the picture is standing still while
 * the narration does the work". Every entry below CONTINUES the mechanism already on screen --
 * a beat that says nothing is worse than a still frame, and padding to satisfy the metric would
 * defeat the point of having the metric.
 *
 * Positions are clamped into their scene, so re-processing the narration moves these with
 * everything else instead of stranding them outside their bounds.
 */
const FILLS = {
  'tape-measure-hook': [
    ['inside', 1.73, 'the hook face presses flat against the corner and holds there'],
    ['payoff', 0.73, 'the dimension lines from both diagrams slide together and align'],
  ],
  'windshield-frit-dots': [
    ['ceramic', 4.78, 'the adhesive bead squeezes slightly as the glass seats down onto it'],
    ['hook', 1.30, 'the camera drifts along the black band toward where the dots begin'],
    ['ceramic', 2.10, 'the cross-section rotates slightly so each layer separates clearly'],
    ['glue', 0.10, 'the sun climbs a little higher over the cross-section'],
    ['thermal', 2.57, 'the heat bloom spreads further across both panels'],
    ['thermal', 5.77, 'the crack on the hard-edged panel creeps a little further'],
  ],
  'coin-reeded-edges': [
    ['newton', 1.63, 'the press lifts and the struck coin is swept aside'],
    ['hook', 3.42, 'the coin rotates slowly so the ridged edge runs past the camera'],
    ['clipping', 5.22, 'Gus squares the coin on the bench and repositions the shears'],
    ['grooves', 2.77, 'the reeded edge turns a full rotation, ridges ticking past'],
    ['payoff', 0.10, 'the coin face dulls from bright silver toward plain modern metal'],
  ],
  'foil-shiny-dull': [
    ['mill', 2.17, 'the ribbon emerges thinner and feeds back toward the rollers'],
    ['mill', 4.83, 'the torn single sheet curls away out of frame'],
    ['outer', 2.49, 'the polished roller turns, holding its mirror finish against the sheet'],
    ['mill', 3.50, 'the ribbon makes another pass; the rollers squeeze it thinner again'],
    ['mill', 7.42, 'the paired sheets travel on together through the nip'],
    ['inner', 0.10, 'the two sheets slide apart a few units, still face to face'],
  ],
  'tactile-paving': [
    ['hook', 1.17, 'the yellow strip runs on ahead down the length of the platform'],
    ['domes', 2.48, 'the dome pattern tilts slightly so the rows read in depth'],
    ['miyake', 4.18, 'the drawing is set down; a second sheet is squared beside it'],
  ],
  'airplane-ashtray': [
    ['hook', 1.95, 'the NO SMOKING sign holds lit above the door'],
    ['notleftover', 1.24, 'Gus turns the checklist page and runs a finger down it'],
    ['cigarette', 2.24, 'the smoke curl thickens and drifts against the ceiling'],
  ],
  'third-brake-light': [
    ['trials', 2.37, 'more taxis join the row, each with a high lamp lit'],
    ['lowwide', 2.64, 'the two low lamps and the tail lights pulse together, indistinguishable'],
    ['single', 1.19, 'the high lamp sits dark and steady above the pair'],
    ['reality', 0.10, 'the tall optimistic bar holds on screen a moment longer'],
    ['reality', 2.93, 'the grid of cars keeps extending past the frame edge'],
  ],
  'sneaker-lace-lock': [
    ['hook', 4.11, 'Bill pokes a finger through the unused eyelet'],
    ['cross', 4.46, 'the cinched collar holds; the laces pull a little tighter'],
    ['thread', 0.10, 'the shoe rotates a few degrees so both eyelets read clearly'],
    ['thread', 1.29, 'the lace end feeds through and pulls taut'],
    ['cross', 1.45, 'both lace ends draw across and settle into position'],
    ['heel', 0.10, 'the cutaway shoe rocks once through a full step'],
  ],
  'padlock-drain-hole': [
    ['hook', 3.32, 'Bill tilts the padlock toward the light to see into the hole'],
    ['moisture', 3.39, 'more droplets gather and run down the inside of the body'],
    ['oil', 0.24, 'the oil spreads along the pin stack and the shackle frees'],
  ],
  'ferrite-choke': [
    ['hook', 2.39, 'Bill turns the lump over, weighing it in his palm'],
    ['antenna', 1.74, 'the broadcast arcs pulse outward again, wider'],
    ['antenna', 4.85, 'the radio icon fuzzes harder as the arcs strengthen'],
    ['filter', 3.22, 'more noise arrives at the ring and is absorbed'],
    ['payoff', 1.70, 'the plastic shell closes back over the ring'],
  ],
  'brick-holes': [
    ['mortar', 4.49, 'the keyed courses take weight and stay locked together'],
    ['hook', 2.76, 'Bill turns the brick end over end, looking through the holes'],
    ['mortar', 1.47, 'more mortar presses down and fills the second hole'],
    ['firing', 0.10, 'the kiln door closes over both bricks'],
    ['firing', 1.26, 'heat builds in the kiln; both bricks glow at the edges'],
    ['firing', 3.99, 'the crack in the solid brick widens as it cools'],
  ],
  'railway-ballast': [
    ['hook', 1.11, 'the camera tracks along the sleepers, stones packed between them'],
    ['load', 4.93, 'the force cone widens further down into the bed'],
    ['interlock', 1.13, 'the angular stones settle another notch against each other'],
  ],
  'chip-bag-nitrogen': [
    ['nitrogen', 4.10, 'the last of the coral oxygen is pushed out of the bag neck'],
    ['hook', 1.92, 'Bill tilts the bag; the chips slide to one end and the empty space grows'],
    ['oxygen', 2.00, 'more oxygen molecules drift down onto the chip'],
    ['freshness', 0.10, 'the first half of the frame holds, ticked'],
    ['cushion', 3.41, 'another crate stacks on top of the pallet'],
  ],
  'toilet-seat-gap': [
    ['code', 1.17, 'the page turns to the clause and settles'],
    ['code', 3.68, 'Gus squares the page edge with one finger'],
    ['hygiene', 3.16, 'the shaded contact zone pulses once on the seat outline'],
    ['pool', 0.10, 'the closed seat outline tilts to show its front trough'],
  ],
  'soda-can-neck': [
    ['notmouth', 0.10, 'the can rotates so the taper reads against the lid rim'],
    ['scale', 2.07, 'the cans keep multiplying outward past the frame'],
  ],
  'revolving-door': [
    ['hook', 2.42, 'the door carries Bill round another slow quarter turn'],
    ['hook', 5.00, 'a tall building draws up behind him, revolving door at its base'],
    ['hook', 3.71, 'Bill shuffles another quarter turn, the box catching on the glass'],
    ['stack', 2.65, 'the warm air column keeps rising through the building section'],
    ['windtunnel', 1.67, 'the papers keep tumbling across the lobby floor'],
  ],
  'convex-mirror-warning': [
    ['curving', 5.72, 'the swallowed blind spot shades out entirely'],
    ['hook', 3.78, 'the curved mirror bulges a little further against the flat one'],
    ['curving', 2.68, 'the widened cone sweeps back along the road'],
    ['price', 0.10, 'both mirror images hold side by side for comparison'],
    ['payoff', 0.52, 'the coral gap between real and perceived distance pulses once'],
    ['payoff', 3.21, 'the etched letters finish forming along the glass edge'],
  ],
  'beer-bottle-brown-glass': [
    ['riboflavin', 1.11, 'more light enters the field and finds the riboflavin'],
    ['riboflavin', 3.63, 'the transfer arc brightens as the energy passes across'],
    ['shatter', 1.80, 'the fragments drift apart and settle into their new arrangement'],
  ],
  'cabin-lights-dim': [
    ['payoff', 3.00, 'the exit signs brighten against the dim cabin'],
    ['payoff', 5.62, 'the aisle path glows steadily toward the door'],
    ['hook', 2.20, 'the cabin dims another step; the window darkens'],
    ['adapt', 2.47, 'the pupil widens further as the clock runs on'],
    ['payoff', 4.31, 'the exit path lighting runs further down the aisle'],
  ],
  'thermal-receipt-fade': [
    ['coating', 4.09, 'the dye and developer particles drift, still separate'],
    ['heaters', 0.10, 'the printer housing opens further, showing the empty carriage'],
    ['reaction', 2.80, 'more letters form as the head travels along the paper'],
    ['fade', 4.68, 'the remaining text thins toward nothing'],
  ],
};

/* ------------------------------------------------------------------ build */

const check = process.argv.includes('--check');
const problems = [];
let written = 0;

for (const ep of SCRIPTS.episodes) {
  const plan = PLAN[ep.id];
  if (!plan) { problems.push(`${ep.id}: no plan authored`); continue; }

  const tokens = ep.content.split(/\s+/).map(norm).filter(Boolean);

  /*
   * Scene markers must appear IN ORDER. Searching from a cursor rather than from zero is what
   * makes an out-of-order marker an error instead of a silent reordering of the episode.
   */
  let cursor = 0;
  for (const [i, s] of plan.scenes.entries()) {
    const want = s.from.split(/\s+/).map(norm).filter(Boolean);
    let at = -1;
    for (let k = cursor; k + want.length <= tokens.length; k++) {
      if (want.every((w, j) => tokens[k + j] === w)) { at = k; break; }
    }
    if (at === -1) problems.push(`${ep.id}: scene "${s.id}" marker "${s.from}" not found after word ${cursor}`);
    else if (i === 0 && at !== 0) problems.push(`${ep.id}: first scene "${s.id}" starts at word ${at}, not 0`);
    else cursor = at + 1;
  }

  // Keywords must actually be spoken, at the occurrence requested.
  for (const [id, toks, occurrence = 0] of plan.keywords) {
    let seen = 0; let found = false;
    for (let k = 0; k + toks.length <= tokens.length; k++) {
      if (!toks.every((t, j) => tokens[k + j] === norm(t))) continue;
      if (seen === occurrence) { found = true; break; }
      seen++;
    }
    if (!found) problems.push(`${ep.id}: keyword "${id}" (${toks.join(' ')}#${occurrence}) not spoken`);
  }

  // Every kw beat must reference a declared keyword.
  const declared = new Set(plan.keywords.map(([id]) => id));
  for (const s of plan.scenes) {
    for (const b of s.beats) {
      if (b.kw && !declared.has(b.kw)) problems.push(`${ep.id}: scene "${s.id}" beat references undeclared keyword "${b.kw}"`);
    }
  }

  /*
   * Fold the authored secondary actions into their scenes. Done here rather than typed into
   * the plan so the gap report and its fix sit side by side, and so a fill can never be
   * attached to a scene that does not exist.
   */
  for (const [sceneId, at, action] of FILLS[ep.id] ?? []) {
    const scene = plan.scenes.find((sc) => sc.id === sceneId);
    if (!scene) { problems.push(`${ep.id}: fill targets unknown scene "${sceneId}"`); continue; }
    scene.beats.push({ at, action, sync: 'secondary action — closes a pacing gap' });
    scene.beats.sort((x, y) => (x.at ?? 0) - (y.at ?? 0));
  }

  if (!check) {
    const out = join(ROOT, 'episodes', ep.id, 'episode.json');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify({
      slug: ep.id,
      title: ep.title,
      hook: plan.hook,
      cast: plan.cast,
      audio: { tempo: 1.12, minSilence: 0.08 },
      scenes: plan.scenes,
      keywords: plan.keywords,
    }, null, 2)}\n`);
    written++;
  }
}

if (problems.length) {
  console.error('EPISODE CONFIG PROBLEMS:');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

const scenes = Object.values(PLAN).reduce((n, p) => n + p.scenes.length, 0);
const beats = Object.values(PLAN).reduce((n, p) => n + p.scenes.reduce((m, s) => m + s.beats.length, 0), 0);
const kws = Object.values(PLAN).reduce((n, p) => n + p.keywords.length, 0);
console.log(`${check ? 'checked' : `wrote ${written}`} episode configs · ${scenes} scenes · ${beats} beats · ${kws} keyword anchors`);
