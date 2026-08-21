/**
 * stock-plan.mjs — what real-world footage this specific video needs, and where.
 *
 * Every entry exists because a NAMED moment in the narration asks for it. That constraint is
 * the point. Searching "debt" once and taking fifty results is how an explainer turns into
 * eleven minutes of anonymous men shaking hands in an office — footage that illustrates
 * nothing, because it was never chosen against anything.
 *
 * Stock is the MINORITY partner here. Mr.Yolk and the diagrams carry the explanation; real
 * footage is used only where it does something drawing cannot:
 *
 *   scale        a real factory is enormous in a way a doodle factory never is
 *   grounding    "cities borrow to build roads" lands harder over an actual interchange
 *   reset        after ninety seconds of white-background diagram the eye needs a window
 *
 * `slots` is how many finalists to keep for a query, not how many to download blindly.
 */

export const STOCK_QUERIES = [
  /* ch1 — the disappearance */
  { id: 'bank-exterior', query: 'classical bank building columns facade', kinds: ['photo'], slots: 2, beat: 'banks start breaking' },
  { id: 'construction-frozen', query: 'construction site crane skyline', kinds: ['photo', 'video'], slots: 2, beat: 'construction projects freeze' },
  { id: 'airplane-detail', query: 'passenger jet flying sky', kinds: ['photo'], slots: 2, beat: 'removing the screws from an airplane' },

  /* ch2 — the mortgage */
  { id: 'suburban-houses', query: 'suburban neighbourhood houses aerial', kinds: ['photo', 'video'], slots: 2, beat: 'you want a house' },
  { id: 'house-keys-door', query: 'front door of a house', kinds: ['photo'], slots: 1, beat: 'that is a mortgage' },

  /* ch3 — borrowing to build */
  { id: 'factory-industrial', query: 'industrial factory interior machinery', kinds: ['photo', 'video'], slots: 2, beat: 'businesses borrow to build factories' },
  { id: 'airliner-airport', query: 'commercial airliner at airport gate', kinds: ['photo', 'video'], slots: 2, beat: 'airlines borrow to buy planes' },
  { id: 'farm-tractor', query: 'tractor harvesting field farm', kinds: ['photo', 'video'], slots: 2, beat: 'farmers borrow to buy equipment' },
  { id: 'highway-interchange', query: 'highway interchange aerial city', kinds: ['photo', 'video'], slots: 2, beat: 'cities borrow to build roads' },

  /* ch4 — banks create money */
  { id: 'bank-vault', query: 'bank vault door steel', kinds: ['photo'], slots: 2, beat: 'a giant vault, very Scrooge McDuck' },

  /* ch6 — government debt */
  { id: 'government-building', query: 'government parliament building facade', kinds: ['photo'], slots: 2, beat: 'take government debt' },
  { id: 'city-financial-district', query: 'financial district skyscrapers city', kinds: ['photo', 'video'], slots: 2, beat: 'banks, pension funds, insurers buy them' },

  /* ch9 — leverage */
  { id: 'trading-screens', query: 'stock market trading screens charts', kinds: ['photo', 'video'], slots: 2, beat: 'the investment goes up ten percent' },
  { id: 'luxury-yacht', query: 'luxury yacht ocean', kinds: ['photo', 'video'], slots: 2, beat: 'you begin researching yachts' },

  /* ch11-12 — crisis and 2008 */
  { id: 'market-crash-screen', query: 'financial crisis stock market decline', kinds: ['photo', 'video'], slots: 2, beat: 'credit crises move fast' },
  { id: 'housing-development', query: 'housing development construction rows', kinds: ['photo'], slots: 2, beat: 'huge amounts of mortgage debt' },
  { id: 'for-sale-sign', query: 'house for sale sign yard', kinds: ['photo'], slots: 2, beat: 'housing prices fell' },

  /* ch13-14 — the counterfactual, and recession */
  { id: 'empty-shop', query: 'closed empty shop street', kinds: ['photo'], slots: 2, beat: 'people spend less' },
  { id: 'bridge-infrastructure', query: 'large bridge infrastructure engineering', kinds: ['photo', 'video'], slots: 2, beat: 'infrastructure requires immediate taxation' },

  /* ch16-17 — the network, and the close */
  { id: 'city-night-aerial', query: 'city at night aerial lights', kinds: ['photo', 'video'], slots: 2, beat: 'mostly we owe it to each other' },
  { id: 'crowd-people', query: 'busy pedestrian crossing crowd', kinds: ['photo', 'video'], slots: 2, beat: 'a gigantic network of promises' },
  { id: 'sunrise-skyline', query: 'city skyline sunrise', kinds: ['photo', 'video'], slots: 2, beat: 'tomorrow will be productive enough' },
];

/**
 * Candidates seen, judged, and refused — by provider id, with the reason.
 *
 * Automated search cannot tell that a photo of a butterfly is a poor illustration of aircraft
 * fasteners; it only knows the query matched some tags. So the shortlister is filtered by an
 * explicit reject list rather than by tightening thresholds, because the failures here are
 * SEMANTIC and no resolution or aspect rule would catch a single one of them.
 *
 * Written down rather than fixed by hand-editing the download folder, so re-running the
 * research reproduces the same library instead of quietly re-admitting everything rejected.
 */
export const STOCK_REJECTS = {
  'pixabay:10382130': 'a butterfly on a flower, returned for "airplane wing rivets"',
  'pixabay:5738714': 'dark industrial interior; reads as nothing, certainly not a bank',
  'pexels:8419700': 'night aerial so underexposed it is nearly black at 1080p',
  'pexels:4122942': 'out-of-focus bokeh lights, not a crowd',
  'pexels:38234800': 'foreground is a named company sign — real branding this video has no business showing',
  'pixabay:88697': 'a GREEN RISING chart, retrieved for "market crash" — the opposite of the beat it would illustrate',
  'pexels:37524012': 'boat is a handful of pixels in open water; no read at all as "yacht"',
  'pexels:37510096': 'black-and-white aerial; every neighbouring shot is colour and the cut would jar',
  'pixabay:2857712': 'a CRASHED airliner in a field — for a light gag about loose screws this reads as a disaster',
  'pixabay:4360': 'an anatomical heart on an ECG grid, returned for "falling stock chart"',
  'pexels:11533613': 'second near-black night aerial; nothing is legible once graded under a caption',
  'pexels:38709836': 'airliner in a real, identifiable airline livery — the screw gag must not attach itself to a named carrier',
  'pexels:9305219': 'third near-black night shot; one good night aerial is enough for this video',
};
