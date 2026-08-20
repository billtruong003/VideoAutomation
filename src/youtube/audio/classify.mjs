/**
 * classify.mjs — put a sound into a production category.
 *
 * Filename-driven, because that is the only description these packs carry. Meme-pack
 * filenames are surprisingly informative ("record-scratch", "bruh", "vine-boom",
 * "swoosh-transition"), and where they are not, duration and level give a weak signal.
 *
 * The taxonomy is built for STORY BEATS, not for sound-design theory. A category earns its
 * place only if it answers "where in a Short would I use this?".
 *
 * Confidence matters more than coverage. A sound whose filename says nothing is left
 * UNKNOWN rather than guessed into a category — a wrong label is worse than no label,
 * because it silently pollutes every future search.
 */

/**
 * Ordered rules: first match wins, so specific patterns precede general ones.
 * `sub` is the sub-category; `tags` are free-text search terms.
 */
const RULES = [
  // ---- comedy / meme, checked first because these names are unambiguous -------
  { re: /record[\s_-]?scratch|scratch[\s_-]?stop/i, cat: 'COMEDY', sub: 'record-scratch', tags: ['stop', 'interrupt', 'wrong'] },
  { re: /vine[\s_-]?boom|boom[\s_-]?vine/i, cat: 'COMEDY', sub: 'vine-boom', tags: ['impact', 'dramatic', 'meme'] },
  { re: /bruh/i, cat: 'COMEDY', sub: 'bruh', tags: ['deadpan', 'reaction', 'meme'] },
  { re: /bonk/i, cat: 'COMEDY', sub: 'bonk', tags: ['hit', 'cartoon'] },
  { re: /fail|wrong|error|buzzer|incorrect/i, cat: 'COMEDY', sub: 'fail', tags: ['wrong', 'negative'] },
  { re: /sad[\s_-]?(violin|trombone)|womp|wah[\s_-]?wah/i, cat: 'COMEDY', sub: 'sad-trombone', tags: ['fail', 'disappoint'] },
  { re: /crickets|awkward/i, cat: 'COMEDY', sub: 'awkward', tags: ['silence', 'pause'] },
  { re: /cartoon|boing|spring|slide[\s_-]?whistle|pop[\s_-]?cartoon/i, cat: 'COMEDY', sub: 'cartoon', tags: ['bouncy', 'silly'] },
  { re: /drum[\s_-]?roll/i, cat: 'COMEDY', sub: 'drumroll', tags: ['anticipation', 'build'] },
  { re: /rimshot|ba[\s_-]?dum/i, cat: 'COMEDY', sub: 'rimshot', tags: ['punchline', 'joke'] },

  // ---- reveal ----------------------------------------------------------------
  { re: /ding|chime|bell|correct|success|achievement|level[\s_-]?up|unlock/i, cat: 'REVEAL', sub: 'ding', tags: ['correct', 'positive', 'answer'] },
  { re: /sparkle|magic|shimmer|twinkle|glitter|fairy/i, cat: 'REVEAL', sub: 'sparkle', tags: ['magic', 'shine'] },
  { re: /reveal|reveal[\s_-]?sting|discovery|tada|ta[\s_-]?da/i, cat: 'REVEAL', sub: 'reveal-sting', tags: ['reveal', 'answer'] },

  // ---- transition ------------------------------------------------------------
  { re: /whoosh|woosh|swoosh|swish|swipe|whip/i, cat: 'TRANSITION', sub: 'whoosh', tags: ['move', 'cut', 'transition'] },
  { re: /riser|rise[\s_-]?up|build[\s_-]?up|uplifter/i, cat: 'TRANSITION', sub: 'riser', tags: ['build', 'tension'] },
  { re: /transition|transit/i, cat: 'TRANSITION', sub: 'transition', tags: ['cut'] },

  // ---- impact ----------------------------------------------------------------
  { re: /punch|slam|smash|crash|bang|thud|hit(?![\s_-]?hat)/i, cat: 'IMPACT', sub: 'hit', tags: ['impact', 'strong'] },
  { re: /boom|explosion|blast/i, cat: 'IMPACT', sub: 'boom', tags: ['impact', 'big'] },
  { re: /\bpop\b|popping/i, cat: 'IMPACT', sub: 'pop', tags: ['appear', 'small'] },
  { re: /\bthump\b|\bstomp\b/i, cat: 'IMPACT', sub: 'thump', tags: ['low', 'weight'] },

  // ---- reaction --------------------------------------------------------------
  { re: /gasp|surprise|shock|wow|woah|whoa/i, cat: 'REACTION', sub: 'surprise', tags: ['surprise', 'shock'] },
  { re: /confus|huh|what|question|hmm/i, cat: 'REACTION', sub: 'confused', tags: ['confused', 'question'] },
  { re: /laugh|giggle|chuckle|haha/i, cat: 'REACTION', sub: 'laugh', tags: ['funny'] },
  { re: /scream|yell|shout|aaah/i, cat: 'REACTION', sub: 'scream', tags: ['loud', 'panic'] },
  { re: /disgust|ew+\b|yuck|gross/i, cat: 'REACTION', sub: 'disgust', tags: ['negative'] },
  { re: /applause|clap|cheer|yay/i, cat: 'REACTION', sub: 'applause', tags: ['positive', 'crowd'] },
  { re: /suspense|dramatic|tension|ominous/i, cat: 'REACTION', sub: 'dramatic', tags: ['tension', 'serious'] },

  // ---- mechanical / UI — the most useful family for this channel --------------
  { re: /click|tick|switch|toggle|button/i, cat: 'MECHANICAL', sub: 'click', tags: ['ui', 'mechanism', 'small'] },
  { re: /beep|blip|bloop|notification|alert/i, cat: 'MECHANICAL', sub: 'beep', tags: ['ui', 'electronic'] },
  { re: /metal|clank|clang|steel|wrench/i, cat: 'MECHANICAL', sub: 'metal', tags: ['metal', 'hard'] },
  { re: /machine|motor|engine|pump|gear|mechanic/i, cat: 'MECHANICAL', sub: 'machine', tags: ['machine', 'motor'] },
  { re: /door|creak|latch|lock|hinge/i, cat: 'MECHANICAL', sub: 'door', tags: ['door'] },
  { re: /paper|page|book|rustle/i, cat: 'MECHANICAL', sub: 'paper', tags: ['paper'] },
  { re: /air|hiss|steam|pressure|valve/i, cat: 'MECHANICAL', sub: 'air', tags: ['air', 'pressure'] },
  { re: /keyboard|typing|type/i, cat: 'MECHANICAL', sub: 'typing', tags: ['ui'] },

  // ---- ambience --------------------------------------------------------------
  { re: /ambien|room[\s_-]?tone|atmos|background[\s_-]?noise|crowd|street|rain|wind/i, cat: 'AMBIENCE', sub: 'ambience', tags: ['bed', 'background'] },
];

/** Music is decided by pack and duration rather than by filename keyword. */
const MUSIC_SUBS = [
  { re: /sneak|spy|tip[\s_-]?toe|suspicious/i, sub: 'sneaky', tags: ['sneaky', 'quirky', 'curious'] },
  { re: /quirk|funny|silly|playful|comic/i, sub: 'quirky', tags: ['playful', 'light'] },
  { re: /curious|myster|wonder|think/i, sub: 'curious', tags: ['curious', 'thinking'] },
  { re: /tension|suspense|dark|dramatic/i, sub: 'tension', tags: ['tension'] },
  { re: /happy|upbeat|bright|cheer/i, sub: 'playful', tags: ['upbeat'] },
];

/**
 * @param {{filename: string, pack: string, duration: number, rmsDb: number}} f
 * @returns {{category: string|null, subcategory: string|null, tags: string[]}}
 */
export function classify(f) {
  const name = f.filename ?? '';

  // Anything long is a bed, whatever it is called. 20 s is well past any meme sting.
  const looksMusical = f.duration >= 20 || /BG_|music|track|loop|theme|bgm/i.test(`${f.pack} ${name}`);
  if (looksMusical) {
    const hit = MUSIC_SUBS.find((m) => m.re.test(name));
    return {
      category: 'MUSIC',
      subcategory: hit?.sub ?? (/sneak/i.test(f.pack) ? 'sneaky' : null),
      tags: [...new Set([...(hit?.tags ?? []), 'bed', 'music'])],
    };
  }

  for (const r of RULES) {
    if (r.re.test(name)) {
      return { category: r.cat, subcategory: r.sub, tags: [...new Set([...r.tags, ...words(name)])].slice(0, 8) };
    }
  }

  /*
   * No keyword matched. Duration alone is a weak signal, and it is used only to separate
   * "a very short transient" from "everything else" — never to invent a semantic category.
   * Everything else stays UNKNOWN so a search result is always something we actually know.
   */
  if (f.duration > 0 && f.duration < 0.35) {
    return { category: 'IMPACT', subcategory: null, tags: [...words(name), 'short'].slice(0, 8) };
  }
  return { category: null, subcategory: null, tags: words(name).slice(0, 8) };
}

/** Filename words, usable as free-text search terms. */
function words(name) {
  return name
    .replace(/\.[a-z0-9]+$/i, '')
    .split(/[\s_\-()[\]0-9.]+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 2 && !/^(the|and|for|mp3|wav|sound|sfx|effect|audio|free|download)$/.test(w));
}

export const CATEGORIES = [
  'REACTION', 'IMPACT', 'TRANSITION', 'COMEDY', 'REVEAL', 'MECHANICAL', 'AMBIENCE', 'MUSIC',
];

/* -------------------------------------------------------------------------
 * RISK
 *
 * The scan proved why this matters. These packs are meme libraries: of 3,395
 * unique sounds, hundreds name a franchise outright (Mario, Zelda, SpongeBob,
 * FNAF), hundreds more are recognisable recorded music, and a large majority
 * are human speech clips. None of that is usable on a narrated explainer
 * channel — speech fights the narration, and recognisable IP invites a claim.
 *
 * So risk is assessed separately from category, and it is assessed
 * CONSERVATIVELY. A sound is only ever marked USABLE when it clears every
 * filter. Anything ambiguous becomes REVIEW, which keeps it searchable and
 * previewable while keeping it out of any automatic shortlist.
 *
 * This never asserts that a file IS licensed. Provenance stays
 * USER_PROVIDED_UNKNOWN_LICENSE for every row. Risk answers a narrower and
 * answerable question: "how recognisable is this, and would it collide with a
 * voiceover?"
 * ------------------------------------------------------------------------- */

/** Franchises, characters, platforms and brands whose audio is owned by someone. */
const IP_TOKENS = /mario|luigi|yoshi|zelda|pokemon|pikachu|sonic|minecraft|creeper|roblox|fortnite|spongebob|patrick|shrek|fnaf|fnf|five nights|friday night|disney|pixar|marvel|spider ?man|batman|star wars|grogu|mandalorian|thanos|among us|amogus|undertale|nintendo|sega|playstation|xbox|steam|windows|apple|samsung|iphone|nokia|instagram|facebook|messenger|whatsapp|tiktok|discord|netflix|hbo|duolingo|taco bell|google|paypal|mcdonald|john cena|rick ?roll|gangnam|coffin dance|barbie|simpson|family guy|naruto|dragon ball|\bdbz\b|one piece|jojo|killer queen|anime|squid game|skibidi|quandale|belle delphine|markiplier|\bmlg\b|metal gear|nanomachines|\btf2\b|team fortress|halo|\bgta\b|\bcj\b|call of duty|\bmw2\b|crash bandicoot|\bwii\b|tetris|pac ?man|thomas the tank|larva|brainrot|mr ?beast|peppa|smash bros|price is right|schwinn|vine\b|\bbts\b|jungkook|junglook|dodgeball|flashbang|\bfbi\b/i;

/** Words that mark a clip as spoken words or singing rather than a sound. */
const SPEECH_TOKENS = /voice|says?|saying|talk|speech|quote|\bline\b|dialog|scream|yell|shout|shut|laugh|sing|song|\brap\b|vocal|announcer|narrat|lyric|\bguys\b|\bman\b|\bboy\b|\bpeople\b|\bhere\b|\bgo again\b|anyway|jokes on you|what up|hello|\buncle\b|gentleman|\bhey+\b|\bwow\b|\bok boomer\b/i;

/** Profanity — an explainer channel cannot carry these. */
const PROFANITY = /f+u+c+k|shit|bitch|ass ?hole|\bdick\b|cunt|nigg|\bfag|pussy|whore|slut|motherf|\bmf\b|\bwtf\b|\bstfu\b|\bdamn\b|\bsuck\b|\bhoe\b|\bcrap\b/i;

/** Bodily-noise humour. Off-brand for this channel regardless of licence. */
// Elongated spellings ("Faaaaaart") are the norm in these packs, so vowels repeat freely.
const CRUDE = /f+a+r+t|p+o+o+p|\bpee\b|\bpiss|\bburp|s+n+e+z+e|sneeze|\bvomit|\bpuke|\btoilet|\bbutt\b|\bnut\b|gachi|\bthicc\b|\bsus+\b|goofy ?a+h+/i;

/** Non-Latin script in a filename usually means a spoken clip in another language. */
const NON_LATIN = /[\u0400-\u04FF\u0600-\u06FF\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/;

/**
 * Filenames in these packs are underscore-separated, and `\b` does NOT match between an
 * underscore and a letter because `_` is itself a word character. Testing `\bmeme\b`
 * against "Explosion_meme_sound" therefore fails, which silently let a large number of
 * meme clips through the filter on the first pass. Separators are flattened to spaces
 * before any test runs.
 */
const flatten = (s) => (s ?? '')
  .replace(/\.[a-z0-9]+$/i, '')
  .replace(/^\d+[_\s-]*/, '')
  .replace(/[_\-.,()\[\]!?+]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const RISK = {
  USABLE: 'USABLE',   // abstract, short, nothing recognisable — safe to shortlist
  REVIEW: 'REVIEW',   // may be fine, but a human must listen and decide
  AVOID: 'AVOID',     // recognisable IP, music, or profanity — do not use
};

/**
 * Assess how safe a sound is to drop into a narrated Short.
 *
 * @param {{filename: string, pack: string, duration: number, silenceRatio?: number}} f
 * @param {{category: string|null}} c  result of `classify`
 * @returns {{risk: string, reasons: string[]}}
 */
export function assessRisk(f, c) {
  const name = flatten(f.filename);
  const reasons = [];

  if (IP_TOKENS.test(name)) reasons.push('names a franchise, platform or brand');
  if (PROFANITY.test(name)) reasons.push('profanity in the filename');
  if (CRUDE.test(name)) reasons.push('crude humour, off-brand for this channel');
  if (NON_LATIN.test(f.filename ?? '')) reasons.push('non-Latin filename, likely a spoken clip');
  if (SPEECH_TOKENS.test(name)) reasons.push('looks like recorded speech or singing');
  if (/\bmemes?\b/i.test(name)) reasons.push('explicitly a meme clip');
  if (/[A-Z]{4,}/.test(f.filename ?? '')) reasons.push('shouted filename, typical of a voice clip');

  /*
   * The music pack is judged before length, because length is exactly what a music bed is
   * supposed to have. Checking the other way round -- as this did at first -- marked every
   * single bed in the library AVOID for the crime of being longer than a sting.
   *
   * Its licence is still unverified, so it is REVIEW rather than USABLE. It is simply not
   * disqualified for being what it is.
   */
  const isMusicPack = /BG_|music/i.test(f.pack ?? '');
  if (isMusicPack) {
    if (reasons.length) return { risk: RISK.AVOID, reasons };
    return { risk: RISK.REVIEW, reasons: ['music bed -- confirm the pack licence before publishing'] };
  }

  // Length. Past a few seconds a sound stops being punctuation and becomes content --
  // usually a song or a spoken bit.
  if (f.duration >= 15) reasons.push(`${f.duration.toFixed(1)}s -- long enough to be music or a spoken clip`);
  else if (f.duration >= 8) reasons.push(`${f.duration.toFixed(1)}s -- long for a sound effect`);

  // Music from anywhere other than the dedicated music pack is a recorded track.
  if (c.category === 'MUSIC') reasons.push('musical, but not from the music pack');

  const hard = reasons.some((r) => /franchise|profanity|crude|non-Latin|speech|meme clip|shouted|not from the music pack|long enough to be/.test(r));
  if (hard) return { risk: RISK.AVOID, reasons };

  const ABSTRACT = new Set(['MECHANICAL', 'TRANSITION', 'IMPACT', 'REVEAL', 'AMBIENCE']);
  if (!ABSTRACT.has(c.category)) {
    return { risk: RISK.REVIEW, reasons: [c.category ? `${c.category} needs a listen` : 'unrecognised filename'] };
  }
  if (reasons.length) return { risk: RISK.REVIEW, reasons };
  return { risk: RISK.USABLE, reasons: [] };
}
