/**
 * KB compiler tests (plan.md CH-06). Pure — runs with Postgres down. Covers the
 * four guarantees the chunk rests on: the committed kb/*.md are reproducible
 * from the sources (golden), the block [3] token budget is enforced (build
 * FAILS over budget), quirks appear only when the file has real notes, and the
 * guardrail-1 whitelist is exactly the fee figures in kb/policies.md.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildKb, type KbSources } from '../scripts/kb-build.js';
import { KB_TOKEN_BUDGET, concatKnowledge, loadKnowledge } from '../src/brain/knowledge.js';
import { extractRupeeAmounts } from '../src/brain/rupees.js';

const kbRoot = new URL('../kb/', import.meta.url);
// Newline-agnostic: .gitattributes pins LF, but a stray CRLF checkout must not
// masquerade as a hand-edit of a generated file in the golden comparison below.
const read = (rel: string): string => readFileSync(new URL(rel, kbRoot), 'utf8').replace(/\r\n/g, '\n');
const readJson = <T>(rel: string): T => JSON.parse(read(rel)) as T;

function realSources(): KbSources {
  return {
    villas: readJson('source/website-content/villas.json'),
    roomTypes: readJson('source/roomtypes.json'),
    policies: read('source/website-content/policies.md'),
    faq: read('source/website-content/faq.md'),
    quirks: read('quirks.md'),
  };
}

describe('buildKb', () => {
  it('compiles kb/*.md byte-for-byte matching the committed files (golden)', () => {
    const built = buildKb(realSources());
    expect(built.files['villas.md']).toBe(read('villas.md'));
    expect(built.files['policies.md']).toBe(read('policies.md'));
    expect(built.files['faq.md']).toBe(read('faq.md'));
  });

  it('renders villa facts from the identity map + occupancy join', () => {
    const villas = buildKb(realSources()).files['villas.md'];
    // Apartment 09: type + Assagao + occupancy (maxAdults 5 from roomtypes) + pool.
    // Was Villa B3 until CH-20 retired the three-bedroom houses (2026-07-24).
    expect(villas).toContain('### Apartment 09');
    expect(villas).toContain('2-bedroom apartment in Assagao · sleeps up to 5 · Shared pool');
    // 🚨 And the departed houses are GONE from the block the model reads. This
    // is the assertion that matters: block [3] is the AI's source of truth for
    // villa facts, so a leftover "### Villa B3" would let it describe — warmly,
    // in detail, from "knowledge" — a house Nistula no longer lets.
    for (const gone of ['Villa B1', 'Villa B3', 'Villa C1', 'Villa C3']) {
      expect(villas).not.toContain(gone);
    }
  });

  it('makes NO pool claim for Siolim anywhere in the file (OQ-09 unconfirmed)', () => {
    // Regression guard for a real defect: a blanket "swimming pool" in the shared-
    // amenities paragraph silently asserted a pool for Siolim, defeating the whole
    // point of villas.json's pool:null. A per-villa toContain() could not catch it —
    // only a negative assertion over the surrounding prose can.
    const villas = buildKb(realSources()).files['villas.md'];
    const siolim = villas.slice(villas.indexOf('### Siolim'));
    expect(siolim).not.toMatch(/pool/i);
    const shared = villas.slice(0, villas.indexOf('### Apartment 11'));
    expect(shared).not.toMatch(/pool/i);
  });

  it('states no ₹ figure anywhere outside policies.md, and FAILS the build if one appears', () => {
    // Guardrail 1 only exempts fees published in policies.md, so a ₹ figure in
    // villas/faq/quirks is KB truth the guardrail would always reject. quirks.md is
    // the one file the villa team edits — fail the build, not the guest turn.
    // The invariant is no ₹ AMOUNT (a bare "₹" in a maintainer note is harmless —
    // it is stripped before the model, and carries no figure to whitelist).
    const built = buildKb(realSources());
    expect(extractRupeeAmounts(built.files['villas.md'])).toEqual([]);
    expect(extractRupeeAmounts(built.files['faq.md'])).toEqual([]);

    const poisoned: KbSources = { ...realSources(), quirks: '## Villa B3\n- The barbecue setup is ₹2,000.' };
    expect(() => buildKb(poisoned)).toThrow(/kb\/quirks\.md contains ₹ figure\(s\) \[2000\]/);
  });

  it('keeps compiled block [3] within the token budget, with a stable version', () => {
    const built = buildKb(realSources());
    expect(built.tokens).toBeLessThanOrEqual(KB_TOKEN_BUDGET);
    expect(built.version).toMatch(/^[0-9a-f]{8}$/);
  });

  it('FAILS the build when block [3] exceeds the token budget', () => {
    const oversized: KbSources = { ...realSources(), policies: 'A long policy sentence. '.repeat(3000) };
    expect(() => buildKb(oversized)).toThrow(/over the 6000-token budget/);
  });
});

describe('concatKnowledge', () => {
  const base = { villas: 'V', policies: 'P', faq: 'F' };
  const templateOnly = '# Villa quirks\n<!-- fill me in -->\n## Villa B3\n## Apartment 11';

  it('omits the quirks section when the file is template-only (headings/comments)', () => {
    expect(concatKnowledge({ ...base, quirks: templateOnly })).not.toContain('Villa quirks (practical');
  });

  it('includes the quirks section once the file carries a real note', () => {
    const withNote = `${templateOnly}\n- The second-bedroom AC runs strong at night.`;
    const out = concatKnowledge({ ...base, quirks: withNote });
    expect(out).toContain('Villa quirks (practical');
    expect(out).toContain('AC runs strong at night');
  });
});

describe('loadKnowledge (committed kb/)', () => {
  it('derives the guardrail-1 fee exemption from kb/policies.md, each bound to its cues', () => {
    const kb = loadKnowledge();
    // The amounts AND their cue binding. The ₹-symbol coupling is the fragile part:
    // a fee rewritten as "INR 750" would silently vanish from this set, so pin it.
    expect([...kb.whitelist].map((f) => f.amount).sort((a, b) => a - b)).toEqual([750, 750, 1000, 1500]);
    expect(kb.whitelist).toEqual(
      expect.arrayContaining([
        { amount: 1000, cues: expect.arrayContaining(['early check-in']) },
        { amount: 1500, cues: expect.arrayContaining(['extra adult']) },
      ]),
    );
  });

  // Paul, 2026-07-13: the two DEMO PLACEHOLDER quirks were PULLED. Their
  // PLACEHOLDER markers were HTML comments, which concatKnowledge strips — so
  // the model received two INVENTED facts about real houses ("the second-bedroom
  // AC in B3 can feel a little weak") and stated them to guests as truth. That is
  // the fabrication class this entire system exists to prevent, and it was live.
  //
  // The file is now empty of notes. This test pins the honest state: no quirks
  // reach the model at all, so the AI says it will check with the team — which is
  // true. It flips back the day the villa team fills the template (OQ-01).
  it('ships NO quirks while the villa team has not filled the template', () => {
    const kb = loadKnowledge();
    expect(kb.quirksPresent).toBe(false);
    expect(kb.knowledge).not.toContain('Villa quirks');
    // …and specifically, neither invented note can reach the model.
    expect(kb.knowledge).not.toMatch(/second-bedroom AC|Morning sun fills the balcony/i);
    expect(kb.tokens).toBeLessThanOrEqual(KB_TOKEN_BUDGET);
  });

  it('leaks NO internal engineering prose into the cached system head', () => {
    // block [3] ships inside the system prompt. Maintainer notes, generated-file
    // headers, PLACEHOLDER markers and repo paths are for humans — every one of
    // these strings was present in the model's knowledge until review caught it.
    const { knowledge } = loadKnowledge();
    for (const leak of [
      '<!--',
      'GENERATED',
      'PLACEHOLDER',
      'MAINTAINER',
      'nistula-kb-export',
      'guardrail',
      'kb-build',
      'Last reviewed',
    ]) {
      expect(knowledge).not.toContain(leak);
    }
  });

  it('is byte-identical regardless of CRLF checkout (kbVersion is stable)', () => {
    // core.autocrlf=true on Windows materialises kb/*.md as CRLF; without folding
    // it, block [3] bytes — and therefore kbVersion — would differ per platform.
    const parts = { villas: 'A\r\n', policies: 'B\r\n', faq: 'C\r\n', quirks: '' };
    expect(concatKnowledge(parts)).toBe(concatKnowledge({ villas: 'A\n', policies: 'B\n', faq: 'C\n', quirks: '' }));
    expect(concatKnowledge(parts)).not.toContain('\r');
  });
});
