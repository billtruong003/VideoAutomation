/**
 * transcript.mjs — compare what we asked for against what the audio actually says.
 *
 * WHY TRANSCRIBE AUDIO WE WROTE THE SCRIPT FOR. Because knowing the words we SENT tells us
 * nothing about the words that came back. TTS mispronounces, elides, and occasionally drops a
 * clause; "vanillin" comes out as "vanilla", "diaphragm" as "diagram". Scribe is the only
 * independent witness in the pipeline, and it is deliberately given no hint of the script on
 * the first pass -- a transcript told what to expect is a worse witness.
 *
 * Normalisation is the hard part. Case and punctuation differences are noise. "1800s" against
 * "eighteen hundreds" is the same words spoken. But "diagram" against "diaphragm" is a real
 * defect wearing a similar-looking coat, and collapsing it away to make the numbers look good
 * would defeat the entire check.
 */

/** Small words whose absence from a transcript rarely means anything went wrong. */
const FUNCTION_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'so', 'of', 'to', 'in', 'on', 'at', 'is', 'it',
  'that', 'this', 'as', 'for', 'with', 'by', 'from',
]);

const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
};

/**
 * Reduce a word to what it means for comparison.
 *
 * Contractions expand, numerals become words, possessives drop. This is applied to BOTH sides,
 * so it can only hide differences that were never meaningful.
 */
export function normaliseWord(w) {
  let t = String(w ?? '').toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9']/g, '')
    .replace(/'s$/, '')
    .replace(/^'+|'+$/g, '');
  const CONTRACTIONS = {
    dont: 'donot', doesnt: 'doesnot', didnt: 'didnot', cant: 'cannot', wont: 'willnot',
    isnt: 'isnot', arent: 'arenot', wasnt: 'wasnot', werent: 'werenot', its: 'it',
    youre: 'youare', theyre: 'theyare', thats: 'thatis', whats: 'whatis', heres: 'hereis',
    youve: 'youhave', ive: 'ihave', youll: 'youwill', well: 'well',
  };
  t = t.replace(/'/g, '');
  if (CONTRACTIONS[t]) t = CONTRACTIONS[t];
  // A bare integer and its spelled form are the same spoken thing.
  if (/^\d+$/.test(t)) {
    const n = Number(t);
    for (const [word, val] of Object.entries(NUMBER_WORDS)) if (val === n) return word;
  }
  return t;
}

/**
 * Split into comparable words.
 *
 * A HYPHEN IS A WORD BOUNDARY HERE, because it is not one in speech. Scribe writes
 * "passenger-side" where the script says "passenger side"; both were spoken identically. Left
 * joined, `normaliseWord` strips the hyphen and produces "passengerside", which matches
 * neither word, so a perfectly pronounced compound is reported as a MISSING word and the
 * episode is held for a pronunciation defect that does not exist. Splitting on the hyphen
 * makes the two spellings compare equal, which is the only honest answer.
 */
export const tokenise = (text) => String(text ?? '')
  .split(/[\s‐-―−-]+/).map(normaliseWord).filter(Boolean);

/** Classic edit distance over word arrays, with the operations kept for reporting. */
function align(a, b) {
  const n = a.length; const m = b.length;
  const d = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = 0; i <= n; i++) d[i][0] = i;
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      d[i][j] = a[i - 1] === b[j - 1]
        ? d[i - 1][j - 1]
        : 1 + Math.min(d[i - 1][j - 1], d[i - 1][j], d[i][j - 1]);
    }
  }
  const ops = [];
  let i = n; let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) { i--; j--; continue; }
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) { ops.push({ type: 'substitute', expected: a[i - 1], heard: b[j - 1], at: i - 1 }); i--; j--; }
    else if (i > 0 && d[i][j] === d[i - 1][j] + 1) { ops.push({ type: 'missing', expected: a[i - 1], at: i - 1 }); i--; }
    else { ops.push({ type: 'extra', heard: b[j - 1], at: j - 1 }); j--; }
  }
  return { distance: d[n][m], ops: ops.reverse() };
}

/**
 * Compare the script against what Scribe heard.
 *
 * `criticalTerms` are the words worth stopping for -- technical vocabulary and proper nouns.
 * A dropped "the" is noise; a "diaphragm" heard as "diagram" is a pronunciation defect that
 * will end up in a published video.
 */
export function compareTranscript(canonicalText, heardText, { criticalTerms = [] } = {}) {
  const canonical = tokenise(canonicalText);
  const heard = tokenise(heardText);
  const { distance, ops } = align(canonical, heard);

  const wer = canonical.length ? distance / canonical.length : 0;

  const substantive = ops.filter((o) => {
    const w = o.expected ?? o.heard;
    return !FUNCTION_WORDS.has(w);
  });

  const critical = new Set(criticalTerms.map(normaliseWord).filter(Boolean));
  const criticalIssues = ops.filter((o) => o.expected && critical.has(o.expected));

  /*
   * Runs of consecutive missing words matter more than the same count scattered around: three
   * missing words in a row is a dropped clause, three spread through a paragraph is ASR noise.
   */
  const missingRuns = [];
  let run = null;
  for (const o of ops) {
    if (o.type === 'missing') {
      if (run && o.at === run.end + 1) { run.end = o.at; run.words.push(o.expected); }
      else { if (run) missingRuns.push(run); run = { start: o.at, end: o.at, words: [o.expected] }; }
    } else if (run) { missingRuns.push(run); run = null; }
  }
  if (run) missingRuns.push(run);
  const longestMissingRun = missingRuns.reduce((n, r) => Math.max(n, r.words.length), 0);

  /*
   * The verdict is deliberately conservative about what counts as a failure. A high WER on
   * clean synthetic narration means something real happened; a couple of function words did
   * not.
   */
  const issues = [];
  if (wer > 0.15) issues.push({ code: 'HIGH_WER', severity: 'error', message: `${(wer * 100).toFixed(1)}% word error rate.` });
  else if (wer > 0.05) issues.push({ code: 'ELEVATED_WER', severity: 'warn', message: `${(wer * 100).toFixed(1)}% word error rate.` });

  if (longestMissingRun >= 3) {
    issues.push({
      code: 'POSSIBLE_TRUNCATION', severity: 'error',
      message: `${longestMissingRun} consecutive words not heard — a clause may be missing.`,
    });
  }
  for (const c of criticalIssues) {
    issues.push({
      code: 'POSSIBLE_PRONUNCIATION_ERROR', severity: 'error',
      message: c.type === 'substitute'
        ? `"${c.expected}" was heard as "${c.heard}".`
        : `"${c.expected}" was not heard at all.`,
      // Named so a keyterm-assisted retry can target exactly this.
      term: c.expected,
    });
  }

  return {
    canonicalWords: canonical.length,
    heardWords: heard.length,
    distance,
    wer: Math.round(wer * 10000) / 10000,
    substantiveDifferences: substantive.length,
    missingRuns: missingRuns.map((r) => r.words),
    longestMissingRun,
    criticalIssues,
    issues,
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warn').length,
    ok: issues.every((i) => i.severity !== 'error'),
    // Terms worth sending as keyterms on a retry -- small and targeted, not the whole glossary.
    suggestedKeyterms: [...new Set(criticalIssues.map((c) => c.expected))].slice(0, 20),
  };
}

/**
 * Words in the script that are worth protecting.
 *
 * Capitalised mid-sentence (proper nouns), long, or rare. This is what feeds `criticalTerms`
 * and a keyterm retry -- deriving it from the script means it costs nothing and stays specific
 * to the episode.
 */
export function criticalTermsOf(text, extraHints = []) {
  const words = String(text ?? '').split(/\s+/);
  const out = new Set(extraHints.map((h) => String(h).trim()).filter(Boolean));

  for (const [i, raw] of words.entries()) {
    const w = raw.replace(/[^A-Za-z'-]/g, '');
    if (!w) continue;

    /*
     * A capitalised word is only evidence of a proper noun if it is not sitting where every
     * word is capitalised anyway. "Mid-sentence" means mid-ARRAY, which is not the same
     * thing: the first word after a full stop is mid-array and capitalised for grammar, not
     * because it names anything. Without this, "The", "Curving" and "Hit" were collected as
     * proper nouns, sent as transcription keyterms, and reported as pronunciation errors when
     * an ASR pass rendered them differently.
     */
    const prev = i > 0 ? words[i - 1] : null;
    const startsSentence = i === 0 || (prev && /[.!?:][")\]]?$/.test(prev));
    if (!startsSentence && /^[A-Z][a-z]{2,}/.test(w)) out.add(w);   // proper noun mid-sentence
    if (w.length >= 9 && /^[a-z]+$/.test(w)) out.add(w);            // long technical word
  }
  return [...out];
}
