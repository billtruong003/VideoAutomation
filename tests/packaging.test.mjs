/**
 * packaging.test.mjs — description, tags and the audio risk model.
 *
 * These cover the three rules that are easy to get quietly wrong and expensive to discover
 * late: the real YouTube tag budget, the description limits the API enforces, and the
 * filename heuristics that decide whether a borrowed sound is safe to put in a video.
 *
 * The tag budget and the risk model each have a bug baked into a regression test below,
 * because both were actually wrong the first time.
 */

import { describe, expect, it } from 'vitest';

import { budgetOf, dedupeTags, generateTags, lintTags, TAG_CHAR_BUDGET } from '../src/youtube/domain/tags.mjs';
import { generateDescriptions, lintDescription, pickCta, CTA_VARIANTS } from '../src/youtube/domain/description.mjs';
import { classify, assessRisk, RISK } from '../src/youtube/audio/classify.mjs';
import { publishReadiness, buildManifest } from '../src/youtube/domain/manifest.mjs';

const BRIEF = {
  coreObject: 'Airplane Window Hole',
  coreQuestion: 'That tiny hole in your airplane window is supposed to be there.',
  actualReveal: 'It helps manage the pressure between the layers.',
  payoff: 'The thing you assumed was a defect is load-bearing.',
};
const TRANSCRIPT = 'That tiny hole in your airplane window is supposed to be there. That little '
  + 'breather hole sits in one of the inner panes and manages pressure between the layers.';

/* ============================================================== tag budget */

describe('tag budget', () => {
  it('counts the implicit quotes around a tag containing a space', () => {
    // "Foo Baz" costs 7 characters plus the 2 quotes YouTube adds around it.
    expect(budgetOf(['Foo Baz'])).toBe(9);
    expect(budgetOf(['Foo-Baz'])).toBe(7);
  });

  it('counts the separating commas', () => {
    expect(budgetOf(['abc', 'def'])).toBe(7); // 3 + 3 + one comma
  });

  it('is empty for an empty list rather than negative', () => {
    expect(budgetOf([])).toBe(0);
  });

  it('is strictly larger than a naive join for multi-word tags', () => {
    const tags = ['airplane window hole', 'breather hole', 'how things work'];
    expect(budgetOf(tags)).toBe(tags.join(',').length + 6); // two quotes per spaced tag
  });

  it('flags an over-budget list as an error, not a warning', () => {
    const many = Array.from({ length: 40 }, (_, i) => 'a-fairly-long-tag-number-' + i);
    const lint = lintTags(many);
    expect(budgetOf(many)).toBeGreaterThan(TAG_CHAR_BUDGET);
    expect(lint.errors).toBeGreaterThan(0);
    expect(lint.issues.some((i) => i.code === 'TAG_BUDGET_EXCEEDED')).toBe(true);
  });
});

describe('tag normalisation', () => {
  it('collapses word-order and plural variants onto one tag', () => {
    const { kept, dropped } = dedupeTags([
      'airplane window hole', 'airplane windows hole', 'hole airplane window',
    ]);
    expect(kept).toHaveLength(1);
    expect(dropped).toHaveLength(2);
    expect(dropped.every((d) => d.reason.includes('duplicate'))).toBe(true);
  });

  it('keeps genuinely different tags', () => {
    expect(dedupeTags(['airplane window', 'breather hole', 'air pressure']).kept).toHaveLength(3);
  });

  it('blocks generic filler with a warning', () => {
    const lint = lintTags(['viral', 'fyp', 'trending', 'airplane window hole', 'breather hole']);
    const filler = lint.issues.find((i) => i.code === 'FILLER_TAG');
    expect(filler).toBeDefined();
    expect(filler.message).toContain('viral');
    expect(lint.errors).toBe(0); // advisory, never blocking
  });
});

describe('tag generation', () => {
  const { candidates } = generateTags(BRIEF, { transcript: TRANSCRIPT });

  it('only emits mechanism tags the transcript actually contains', () => {
    const mech = candidates.filter((c) => c.type === 'MECHANISM').map((c) => c.text);
    expect(mech).toContain('breather hole');
    for (const m of mech) expect(TRANSCRIPT.toLowerCase()).toContain(m);
  });

  it('stays inside the budget for a normal episode', () => {
    expect(budgetOf(candidates.map((c) => c.text))).toBeLessThan(TAG_CHAR_BUDGET);
  });

  it('produces no duplicates', () => {
    const texts = candidates.map((c) => c.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('marks each candidate with a relevance the UI can sort by', () => {
    for (const c of candidates) expect(['HIGH', 'MEDIUM', 'LOW']).toContain(c.relevance);
  });
});

/* ============================================================= description */

describe('description generation', () => {
  const variants = generateDescriptions(BRIEF, { ctaHistory: [] });

  it('offers several distinct shapes', () => {
    expect(variants.length).toBeGreaterThanOrEqual(3);
    expect(new Set(variants.map((v) => v.text)).size).toBe(variants.length);
  });

  it('never asserts anything outside the episode material', () => {
    const source = (BRIEF.coreQuestion + ' ' + BRIEF.actualReveal + ' ' + BRIEF.payoff).toLowerCase();
    for (const v of variants) {
      const body = v.text.split('\n\n')[0].toLowerCase(); // drop any CTA
      for (const sentence of body.split(/(?<=[.!?])\s+/)) {
        if (sentence.trim()) expect(source).toContain(sentence.trim().replace(/\.$/, '').slice(0, 40));
      }
    }
  });

  it('offers at least one variant with no CTA at all', () => {
    const ctas = CTA_VARIANTS.filter(Boolean);
    expect(variants.some((v) => !ctas.some((c) => v.text.includes(c)))).toBe(true);
  });
});

describe('CTA rotation', () => {
  it('drops the CTA entirely after two in a row', () => {
    expect(pickCta([CTA_VARIANTS[0], CTA_VARIANTS[1]])).toBeNull();
  });

  it('prefers the least recently used variant', () => {
    expect(pickCta([CTA_VARIANTS[0], null, CTA_VARIANTS[0], CTA_VARIANTS[0]])).not.toBe(CTA_VARIANTS[0]);
  });
});

describe('description lint', () => {
  it('rejects a description past the API byte limit', () => {
    const lint = lintDescription('x'.repeat(5001));
    expect(lint.errors).toBeGreaterThan(0);
    expect(lint.issues.some((i) => i.code === 'DESC_TOO_LONG_API')).toBe(true);
  });

  it('measures bytes rather than characters', () => {
    // An emoji is one character but four bytes; the API counts bytes.
    const lint = lintDescription('\u{1F600}');
    expect(lint.chars).toBeLessThan(lint.bytes);
  });

  it('rejects angle brackets, which the API will not accept', () => {
    expect(lintDescription('a <b> c').issues.some((i) => i.code === 'DESC_INVALID_CHAR')).toBe(true);
  });

  it('flags channel boilerplate', () => {
    expect(lintDescription('Hey guys, welcome back to the channel!')
      .issues.some((i) => i.code === 'BOILERPLATE')).toBe(true);
  });

  it('does not report the same phrase twice', () => {
    // "ever wondered" is both a stock phrase and boilerplate; say it once.
    const lint = lintDescription('Ever wondered why?');
    const mentions = lint.issues.filter((i) => i.message.toLowerCase().includes('ever wondered'));
    expect(mentions).toHaveLength(1);
  });

  it('accepts a description that quotes the reveal verbatim', () => {
    // Quoting the accurate sentence is correct; paraphrasing risks changing the fact.
    const lint = lintDescription(BRIEF.actualReveal, { transcript: TRANSCRIPT });
    expect(lint.issues.some((i) => i.code === 'TRANSCRIPT_DUMP')).toBe(false);
  });

  it('flags a description that is almost entirely lifted script', () => {
    const lint = lintDescription(TRANSCRIPT, { transcript: TRANSCRIPT });
    expect(lint.issues.some((i) => i.code === 'TRANSCRIPT_DUMP')).toBe(true);
  });

  it('flags hashtag stuffing', () => {
    expect(lintDescription('The hole equalises pressure. #a #b #c #d #e')
      .issues.some((i) => i.code === 'HASHTAG_STUFFING')).toBe(true);
  });
});

/* ============================================================== readiness */

describe('publish readiness', () => {
  const base = () => {
    const m = buildManifest({ contentId: 'x', topic: 'x' });
    m.asset.videoPath = 'out/x.mp4';
    m.asset.sha256 = 'sha256:abc';
    m.metadata.selectedTitle = 'A perfectly ordinary title';
    m.youtube.containsSyntheticMedia = false;
    m.youtube.privacy = 'private';
    return m;
  };

  it('blocks an over-budget tag list before a quota unit is spent', () => {
    const m = base();
    m.metadata.tags = Array.from({ length: 40 }, (_, i) => 'a-fairly-long-tag-number-' + i);
    const r = publishReadiness(m);
    expect(r.ready).toBe(false);
    expect(r.blockers.some((b) => b.includes('500 characters'))).toBe(true);
  });

  it('only warns about an empty description', () => {
    const r = publishReadiness(base());
    expect(r.warnings.some((w) => w.includes('Description is empty'))).toBe(true);
    expect(r.blockers.some((b) => /description/i.test(b))).toBe(false);
  });

  it('does not block on an editorially weak but legal description', () => {
    const m = base();
    m.metadata.description = 'Hey guys, welcome back! Do not forget to subscribe!';
    m.metadata.tags = ['viral', 'fyp'];
    const r = publishReadiness(m);
    // The studio linter complains loudly; readiness must not overrule the creator.
    expect(r.blockers.some((b) => /description|tag/i.test(b))).toBe(false);
  });
});

/* ============================================================= audio risk */

describe('audio risk model', () => {
  const at = (filename, duration = 2, pack = 'meme-sfx') =>
    assessRisk({ filename, pack, duration }, classify({ filename, pack, duration, rmsDb: -20 }));

  it('matches tokens across underscores', () => {
    // `\b` does not match between "_" and a letter, because "_" is itself a word
    // character. Testing /\bmeme\b/ against "Explosion_meme_sound" therefore fails, and
    // that single mistake let a large number of meme clips through on the first pass.
    expect(at('0450_Explosion_meme_sound_effect.mp3').risk).toBe(RISK.AVOID);
    expect(at('0263_Ah_Shit,_Here_We_Go_Again.mp3').risk).toBe(RISK.AVOID);
  });

  it('rejects recognisable franchise audio', () => {
    for (const f of ['0659_Creeper_Explosion_Sound.mp3', '1272_TF2_Explosion.mp3', '0282_Duolingo_Correct.mp3']) {
      expect(at(f).risk).toBe(RISK.AVOID);
    }
  });

  it('rejects clips long enough to be music or speech', () => {
    expect(at('0429_Riser_302.mp3', 40).risk).toBe(RISK.AVOID);
  });

  it('accepts a plain abstract sound effect', () => {
    expect(at('0358_Simple_whoosh.mp3', 0.6).risk).toBe(RISK.USABLE);
    expect(at('0208_Mouse_Click.mp3', 1.4).risk).toBe(RISK.USABLE);
  });

  it('leaves an unrecognised filename for review rather than guessing it safe', () => {
    expect(at('0579_ogolilem_jaja.mp3', 3).risk).toBe(RISK.REVIEW);
  });

  it('treats the music pack as review, never as automatically usable', () => {
    // Its licence is unverified like everything else; it is simply not disqualified.
    expect(at('Sneaky_Tiptoe.wav', 33, 'BG_SneakyMusic').risk).toBe(RISK.REVIEW);
  });

  it('always gives a reason when it declines a sound', () => {
    expect(at('1272_TF2_Explosion.mp3').reasons.length).toBeGreaterThan(0);
  });
});

describe('tag generation traps', () => {
  it('does not match a mechanism term inside a longer word', () => {
    // "eventually" contains "vent", and a plain includes() tagged an episode about jeans
    // pockets as being about ventilation.
    const { candidates } = generateTags(
      { coreObject: 'Jeans Watch Pocket' },
      { transcript: 'The pocket eventually stopped being used for a watch.' });
    expect(candidates.map((c) => c.text)).not.toContain('vent');
  });

  it('still matches a mechanism term that is genuinely present', () => {
    const { candidates } = generateTags(
      { coreObject: 'Microwave Door Mesh' },
      { transcript: 'The mesh blocks the wavelength while letting light through.' });
    expect(candidates.map((c) => c.text)).toContain('wavelength');
  });

  it('matches a plural mention of a mechanism term', () => {
    const { candidates } = generateTags(
      { coreObject: 'Manhole Covers' },
      { transcript: 'Round covers cannot fall in, unlike square vents.' });
    expect(candidates.map((c) => c.text)).toContain('vent');
  });

  it('never pluralises a leading adjective into the subject', () => {
    // "old book smell" produced "why olds have book smell".
    const { candidates } = generateTags({ coreObject: 'Old Book Smell' }, { transcript: '' });
    const texts = candidates.map((c) => c.text);
    expect(texts.some((t) => t.startsWith('why olds'))).toBe(false);
    expect(texts).toContain('what causes old book smell');
  });

  it('keeps the possessive frame when the object leads with a noun', () => {
    const { candidates } = generateTags({ coreObject: 'Jeans Watch Pocket' }, { transcript: '' });
    expect(candidates.map((c) => c.text)).toContain('why jeans have watch pocket');
  });
});

describe('borrowed audio at publish time', () => {
  const base = () => {
    const m = buildManifest({ content_id: 'airplane-window-hole', topic: 'x' });
    m.asset.videoPath = 'out/x.mp4';
    m.asset.sha256 = 'sha256:abc';
    m.metadata.selectedTitle = 'A perfectly ordinary title';
    m.youtube.containsSyntheticMedia = false;
    m.youtube.privacy = 'private';
    return m;
  };

  /** A manifest whose plan borrows one bed with unverifiable rights. */
  const withBorrowedBed = () => {
    const m = base();
    m.audio = {
      recorded: true,
      music: [{ id: 'tiptoe', provenance: 'USER_PROVIDED_UNKNOWN_LICENSE' }],
      sfx: [],
    };
    return m;
  };

  it('reads the exported plan rather than assuming nothing was borrowed', () => {
    // The plan exists and was read. What it CONTAINS is a production decision that changes
    // between batches, so this asserts the reading, not the contents.
    expect(base().audio.recorded).toBe(true);
  });

  it('warns that a bed licence is unverified, naming it', () => {
    /*
     * Exercised against an inline plan rather than whatever batch 001 happens to use. These
     * assertions used to read the real manifest, so removing the unlicensed music for the
     * release broke them -- a test of the WARNING should not depend on there being something
     * to warn about that day.
     */
    const w = publishReadiness(withBorrowedBed()).warnings.find((x) => /unverified licence/.test(x));
    expect(w).toBeDefined();
    expect(w).toContain('tiptoe');
  });

  it('stays silent when nothing was borrowed', () => {
    // Batch 001 publishes with no music at all, and that must not read as a licence problem.
    const m = base();
    m.audio = { recorded: true, music: [], sfx: [{ file: 'sfx/pop.wav', provenance: 'GENERATED' }] };
    expect(publishReadiness(m).warnings.some((x) => /unverified licence/.test(x))).toBe(false);
  });

  it('does not block on it — the licence call is the creator\'s', () => {
    // Against a manifest that DOES borrow a bed — otherwise this passes trivially, because a
    // manifest with no music has nothing to warn about in the first place.
    const r = publishReadiness(withBorrowedBed());
    expect(r.warnings.some((w) => /unverified licence/.test(w))).toBe(true);
    expect(r.blockers.some((b) => /licence/i.test(b))).toBe(false);
  });

  it('says so when no plan has been exported, rather than reporting nothing borrowed', () => {
    // An empty list would read as "nothing was borrowed", which is a very different and
    // much more dangerous claim than "not recorded yet".
    const m = buildManifest({ content_id: 'no-such-episode', topic: 'x' });
    expect(m.audio.recorded).toBe(false);
    m.asset.videoPath = 'out/x.mp4';
    m.asset.sha256 = 'sha256:abc';
    m.metadata.selectedTitle = 'Title';
    m.youtube.containsSyntheticMedia = false;
    m.youtube.privacy = 'private';
    expect(publishReadiness(m).warnings.some((w) => /No audio plan recorded/.test(w))).toBe(true);
  });
});
