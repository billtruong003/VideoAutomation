/**
 * episode-nouns.mjs — how to talk about each episode's object, in grammatical English.
 *
 * WHY THIS FILE EXISTS.
 *
 * The generator originally decomposed the slug: last word is the feature, the rest is the
 * subject. That is right for `airplane-window-hole` and wrong for most of the batch, and the
 * failures are not subtle -- it produced "How Does an Escalator Brushes Actually Work?",
 * "That Tiny Covers on a Round Manhole" and "The Hidden Reason Highway Lanes Have That Lines".
 *
 * Three different problems, none fixable by a better split:
 *
 *   - number. `brushes`, `lines` and `covers` are plural nouns; templates written for a
 *     singular feature produce agreement errors.
 *   - constituency. `round-manhole-covers` is not (round manhole)+(covers); the object is a
 *     manhole cover and `round` is the PROPERTY the episode is about. `jeans-watch-pocket` is
 *     (jeans)+(watch pocket), not (jeans watch)+(pocket).
 *   - salience. `gas-pump-shutoff` names an event, not a visible part. The thing a viewer
 *     recognises is the nozzle clicking off, not "the shutoff".
 *
 * So each episode carries a small spec, authored by reading its FACTS and script rather than
 * its filename. Everything here is traceable to the episode's own material -- the `evidence`
 * field quotes the line it came from -- and the hard gates still check every generated title
 * against the transcript, so a wrong spec produces a rejected candidate rather than a false
 * claim.
 *
 * Episodes without a spec fall back to slug decomposition, and the grammar gate rejects the
 * agreement errors that fallback produces.
 */

/**
 * @typedef {object} EpisodeNouns
 * @property {{one: string, many: string}} subject   the thing itself
 * @property {{one: string, many: string, plural: boolean}} feature  the odd part
 * @property {'PART'|'PROPERTY'|'PHENOMENON'} kind   a physical part, a designed quality of
 *   the whole object, or something the object does that nobody designed
 * @property {string} [property]        for PROPERTY episodes: the quality ("round")
 * @property {string} [owned]           natural second-person form, or absent if forced
 * @property {boolean} [small]          the feature is genuinely small.
 *
 * `small` gates the "That Tiny ..." templates. Without it the generator produced "That Tiny
 * Nozzle on a Gas Pump" and scored it ABOVE the honest alternative, because "tiny" earns
 * oddity points -- a fuel nozzle is not tiny, and a title should not win on an inaccurate
 * adjective. Each flag below is set from whether the source itself calls the thing small.
 * @property {string} evidence          the source line this was read from
 * @property {string[]} [angles]        episode-specific candidates.
 *
 * `angles` exists because some episodes have a hook no generic template can reach. The
 * highway episode is about lane lines being far LONGER than they look -- not about what they
 * are for -- and the gas-pump episode is about the pump knowing when to stop. A template
 * library built around "what is this part for" cannot express either. These are authored from
 * the episode's own hook line and go through the identical hard gates.
 */

/** @type {Record<string, EpisodeNouns>} */
export const EPISODE_NOUNS = {
  'airplane-window-hole': {
    subject: { one: 'airplane window', many: 'airplane windows' },
    feature: { one: 'hole', many: 'holes', plural: false },
    kind: 'PART',
    owned: 'your airplane window',
    small: true,
    evidence: 'That tiny hole in your airplane window is supposed to be there.',
  },

  'escalator-brushes': {
    subject: { one: 'escalator', many: 'escalators' },
    // Plural in the source and plural in ordinary speech. Nobody says "an escalator brush".
    feature: { one: 'brush', many: 'brushes', plural: true },
    kind: 'PART',
    small: false,
    evidence: 'Those brushes on the side of an escalator are not there to clean your shoes.',
  },

  'gas-pump-shutoff': {
    /*
     * The slug names the event. The episode is about the pump knowing when to stop, and the
     * part that does it is the nozzle -- so the feature is the nozzle and the interesting
     * claim is what it knows.
     */
    subject: { one: 'gas pump', many: 'gas pumps' },
    feature: { one: 'nozzle', many: 'nozzles', plural: false },
    kind: 'PART',
    owned: 'your tank',
    small: false,
    evidence: 'Your gas pump knows when your tank is full without talking to your car.',
    angles: [
      'How a Gas Pump Knows Your Tank Is Full',
      'How Does a Gas Pump Know When to Stop?',
      'Your Gas Pump Knows When to Stop, Without Any Electronics',
      'Nothing in a Gas Pump Is Talking to Your Car',
      'How Gas Pumps Know When to Stop',
    ],
  },

  'microwave-door-mesh': {
    subject: { one: 'microwave door', many: 'microwave doors' },
    feature: { one: 'mesh', many: 'meshes', plural: false },
    kind: 'PART',
    owned: 'your microwave door',
    small: false,
    evidence: 'Because that black metal mesh is doing something clever.',
  },

  'jeans-watch-pocket': {
    // (jeans) + (watch pocket). The slug's middle word belongs to the feature, not the subject.
    subject: { one: 'pair of jeans', many: 'jeans' },
    feature: { one: 'tiny pocket', many: 'tiny pockets', plural: false },
    kind: 'PART',
    owned: 'your jeans',
    small: true,
    evidence: 'Your jeans have a pocket designed for a gadget from the 1800s.',
  },

  'highway-lane-lines': {
    /*
     * The episode is not about what lane lines are FOR -- everyone knows that. It is about
     * how much LONGER they are than they look. That is an UNEXPECTED_FACT hook, and the
     * generic part templates ("What Are Those Lane Lines For?") answer a question the viewer
     * never had.
     */
    subject: { one: 'highway', many: 'highways' },
    feature: { one: 'lane line', many: 'lane lines', plural: true },
    kind: 'PART',
    small: true,
    evidence: 'Those tiny dashed lines on the highway are much bigger than your brain thinks.',
    angles: [
      'Highway Lane Lines Are Way Longer Than They Look',
      'Those Dashes on the Highway Are Way Bigger Than You Think',
      'You Have No Idea How Long a Lane Line Is',
      'Highway Lane Lines Are Much Bigger Than Your Brain Thinks',
      'Your Sense of Scale on a Highway Is Completely Wrong',
    ],
  },

  'fuel-door-arrow': {
    subject: { one: 'fuel gauge', many: 'fuel gauges' },
    feature: { one: 'arrow', many: 'arrows', plural: false },
    kind: 'PART',
    owned: 'your car',
    small: true,
    evidence: 'Manufacturers don\'t all put fuel doors on the same side, so this tiny symbol saves you from guessing.',
  },

  'round-manhole-covers': {
    /*
     * PROPERTY, not PART. The episode is about the shape of the whole object -- there is no
     * sub-part called a "cover" on a "round manhole". Treating it as a part is what produced
     * "That Tiny Covers on a Round Manhole".
     */
    subject: { one: 'manhole cover', many: 'manhole covers' },
    feature: { one: 'round shape', many: 'round shapes', plural: false },
    kind: 'PROPERTY',
    property: 'round',
    evidence: 'A round manhole cover can do something surprisingly important: stay above the manhole.',
  },

  'pen-cap-hole': {
    subject: { one: 'pen cap', many: 'pen caps' },
    feature: { one: 'hole', many: 'holes', plural: false },
    kind: 'PART',
    owned: 'your pen cap',
    small: true,
    evidence: 'That tiny hole in some pen caps can serve a much more serious purpose than you\'d expect.',
  },

  'old-book-smell': {
    /*
     * PHENOMENON. The smell is neither a part of the book nor a quality chosen by a designer;
     * it is something the book DOES as it decays. Both other kinds ask what a thing is FOR,
     * and nothing here is for anything -- so those templates produce nonsense. Forcing it
     * through PROPERTY produced "That That Smell Old Book Is Doing a Job".
     */
    subject: { one: 'old book', many: 'old books' },
    feature: { one: 'smell', many: 'smells', plural: false },
    kind: 'PHENOMENON',
    owned: 'your old books',
    angles: [
      'That Old Book Smell Is the Book Falling Apart',
      'What Old Book Smell Actually Is',
      'The Smell of an Old Book Is the Book Breaking Down',
    ],
    evidence: 'That amazing old book smell is literally the smell of the book slowly breaking down.',
  },
  /* ------------------------------------------------------------ batch 002
   *
   * Same reason as above, and the tag generator proved it again: without a spec these fell
   * back to slug decomposition and produced "why revolvings have door", "why tactiles have
   * paving" and "why thermals have receipt fade" as search tags. The title gate rejects that
   * grammar; the tag generator had no such gate, so the nonsense would have shipped on twenty
   * videos. Every entry below is read from the episode's own script, quoted in `evidence`.
   */

  'tactile-paving': {
    subject: { one: 'tactile paving tile', many: 'tactile paving tiles' },
    feature: { one: 'bump', many: 'bumps', plural: true },
    kind: 'PART',
    small: false,
    evidence: 'Those bumpy tiles at the edge of a train platform are a language.',
  },

  'thermal-receipt-fade': {
    /* PHENOMENON: fading is something the paper does, not a part someone added. */
    subject: { one: 'receipt', many: 'receipts' },
    feature: { one: 'fading', many: 'fading', plural: false },
    kind: 'PHENOMENON',
    owned: 'your receipt',
    small: false,
    evidence: 'A receipt left in a wallet slowly goes blank, because there was never any ink on it.',
  },

  'tape-measure-hook': {
    subject: { one: 'tape measure', many: 'tape measures' },
    feature: { one: 'hook', many: 'hooks', plural: false },
    kind: 'PART',
    owned: 'your tape measure',
    small: false,
    evidence: 'The metal hook on the end of a tape measure wobbles.',
  },

  'foil-shiny-dull': {
    /* PROPERTY: the two faces are a quality of the sheet, not a component of it. */
    subject: { one: 'aluminum foil', many: 'aluminum foil' },
    feature: { one: 'shiny side', many: 'shiny sides', plural: false },
    kind: 'PROPERTY',
    property: 'shiny',
    small: false,
    evidence: 'One side of aluminum foil is shiny and the other side is dull.',
  },

  'airplane-ashtray': {
    subject: { one: 'airplane bathroom', many: 'airplane bathrooms' },
    feature: { one: 'ashtray', many: 'ashtrays', plural: false },
    kind: 'PART',
    small: false,
    evidence: 'There is still an ashtray built into the airplane bathroom door.',
  },

  'ferrite-choke': {
    subject: { one: 'charger cable', many: 'charger cables' },
    feature: { one: 'lump', many: 'lumps', plural: false },
    kind: 'PART',
    owned: 'your charger cable',
    small: false,
    evidence: 'There is a hard lump molded around your laptop charger cable.',
  },

  'beer-bottle-brown-glass': {
    subject: { one: 'beer bottle', many: 'beer bottles' },
    feature: { one: 'brown glass', many: 'brown glass', plural: false },
    kind: 'PROPERTY',
    property: 'brown',
    small: false,
    evidence: 'Beer almost always comes in brown glass, because light physically breaks beer.',
  },

  'sneaker-lace-lock': {
    subject: { one: 'sneaker', many: 'sneakers' },
    feature: { one: 'extra lace hole', many: 'extra lace holes', plural: false },
    kind: 'PART',
    owned: 'your sneakers',
    small: true,
    evidence: 'Almost every sneaker has one extra lace hole at the top that nobody uses.',
  },

  'revolving-door': {
    /*
     * PROPERTY of the whole door. Slug decomposition read this as (revolving)+(door) and
     * produced "why revolvings have door" -- there is no part called a "door" on a
     * "revolving".
     */
    subject: { one: 'revolving door', many: 'revolving doors' },
    feature: { one: 'airlock', many: 'airlocks', plural: false },
    kind: 'PROPERTY',
    property: 'revolving',
    small: false,
    evidence: 'A revolving door never actually opens.',
  },

  'third-brake-light': {
    subject: { one: 'car', many: 'cars' },
    feature: { one: 'third brake light', many: 'third brake lights', plural: false },
    kind: 'PART',
    owned: 'your car',
    small: false,
    evidence: 'Somewhere in the back window of every car sits a third brake light.',
  },

  'windshield-frit-dots': {
    subject: { one: 'windshield', many: 'windshields' },
    feature: { one: 'black dot', many: 'black dots', plural: true },
    kind: 'PART',
    owned: 'your windshield',
    small: true,
    evidence: 'A black border that breaks into a scatter of dots before it fades out.',
  },

  'toilet-seat-gap': {
    subject: { one: 'public toilet seat', many: 'public toilet seats' },
    feature: { one: 'gap', many: 'gaps', plural: false },
    kind: 'PART',
    small: false,
    evidence: 'Public toilet seats have a gap at the front.',
  },

  'coin-reeded-edges': {
    subject: { one: 'coin', many: 'coins' },
    feature: { one: 'ridged edge', many: 'ridged edges', plural: true },
    kind: 'PART',
    small: false,
    evidence: 'Run your thumb around the edge of a quarter and you will feel ridges.',
  },

  'convex-mirror-warning': {
    subject: { one: 'car mirror', many: 'car mirrors' },
    feature: { one: 'warning', many: 'warnings', plural: false },
    kind: 'PART',
    owned: 'your car mirror',
    small: false,
    evidence: 'Only the curved one carries a warning printed on the glass.',
  },

  'soda-can-neck': {
    subject: { one: 'soda can', many: 'soda cans' },
    feature: { one: 'narrow top', many: 'narrow tops', plural: false },
    kind: 'PROPERTY',
    property: 'narrower at the top',
    small: false,
    evidence: 'The top of a soda can is visibly narrower than the rest of it.',
  },

  'railway-ballast': {
    subject: { one: 'train track', many: 'train tracks' },
    feature: { one: 'gravel', many: 'gravel', plural: false },
    kind: 'PART',
    small: false,
    evidence: 'Train tracks sit on a bed of sharp, angular gravel.',
  },

  'cabin-lights-dim': {
    /* PHENOMENON: the dimming is an action the crew takes, not a part of the cabin. */
    subject: { one: 'airplane cabin', many: 'airplane cabins' },
    feature: { one: 'dimming', many: 'dimming', plural: false },
    kind: 'PHENOMENON',
    small: false,
    evidence: 'The cabin lights go down before a night landing.',
  },

  'brick-holes': {
    subject: { one: 'brick', many: 'bricks' },
    feature: { one: 'hole', many: 'holes', plural: true },
    kind: 'PART',
    small: false,
    evidence: 'A brick has holes punched straight through the middle.',
  },

  'chip-bag-nitrogen': {
    subject: { one: 'chip bag', many: 'chip bags' },
    feature: { one: 'nitrogen', many: 'nitrogen', plural: false },
    kind: 'PART',
    small: false,
    evidence: 'The bag gets flushed with nitrogen, which is inert and does nothing to food.',
  },

  'padlock-drain-hole': {
    subject: { one: 'padlock', many: 'padlocks' },
    feature: { one: 'hole', many: 'holes', plural: false },
    kind: 'PART',
    small: true,
    evidence: 'Flip a padlock over and there is a small hole in the bottom of it.',
  },
};

export const nounsFor = (contentId) => EPISODE_NOUNS[contentId] ?? null;
