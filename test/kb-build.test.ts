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

const kbRoot = new URL('../kb/', import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, kbRoot), 'utf8');
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
    // Villa B3: type + Assagao + occupancy (maxAdults 7 from roomtypes) + pool.
    expect(villas).toContain('### Villa B3');
    expect(villas).toContain('3-bedroom villa in Assagao · sleeps up to 7 · Private pool');
    // Siolim carries no pool line (OQ-09 unconfirmed → nothing definitive).
    expect(villas).toContain('4-bedroom villa in Siolim · sleeps up to 8.');
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
  it('derives the guardrail-1 whitelist from the fee figures in kb/policies.md', () => {
    const kb = loadKnowledge();
    expect([...kb.whitelist].sort((a, b) => a - b)).toEqual([750, 1000, 1500]);
  });

  it('ships the placeholder quirk and stays within budget', () => {
    const kb = loadKnowledge();
    expect(kb.quirksPresent).toBe(true);
    expect(kb.knowledge).toContain('Villa quirks (practical');
    expect(kb.tokens).toBeLessThanOrEqual(KB_TOKEN_BUDGET);
  });
});
