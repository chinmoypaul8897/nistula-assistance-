/**
 * Guardrails v1 (plan.md §6.5, CH-05 step 5). Pure functions, unit-tested hard.
 * Guardrail 1 (price integrity) is the CH-05 done-when: a poisoned ₹ figure not
 * in any tool result must be blocked.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  applyNegotiationLock,
  checkPriceIntegrity,
  extractRupeeAmounts,
  runGuardrails,
} from '../src/brain/guardrails.js';
import { PHRASEBOOK } from '../src/brain/prompt.js';
import type { ToolRun } from '../src/brain/tools/registry.js';

const quoteRun: ToolRun = {
  name: 'get_quote',
  input: {},
  result: {
    ok: true,
    data: {
      total: 34000,
      averagePerNight: 17000,
      perNight: [
        { date: '2026-12-20', amount: 17000 },
        { date: '2026-12-21', amount: 17000 },
      ],
      nights: 2,
    },
  },
};

describe('extractRupeeAmounts', () => {
  it('normalises ₹/comma/space formatting to integers', () => {
    expect(extractRupeeAmounts('That is ₹34,000 all in.').sort()).toEqual([34000]);
    expect(extractRupeeAmounts('₹ 34,000 or 34000 or 34,000').sort()).toEqual([34000]);
    expect(extractRupeeAmounts('no prices here')).toEqual([]);
  });
});

describe('guardrail 1 — price integrity', () => {
  it('passes when every ₹ appears in a tool result', () => {
    const r = checkPriceIntegrity('₹34,000 total, about ₹17,000 a night.', [quoteRun]);
    expect(r.ok).toBe(true);
    expect(r.unbacked).toEqual([]);
  });

  it('BLOCKS a poisoned ₹ figure absent from the tool JSON (the done-when)', () => {
    const r = checkPriceIntegrity('A special rate of ₹99,000 for you.', [quoteRun]);
    expect(r.ok).toBe(false);
    expect(r.unbacked).toEqual([99000]);
  });

  it('a draft with no ₹ passes trivially; kb figures are blocked (empty whitelist)', () => {
    expect(checkPriceIntegrity('Happy to help with your stay.', [quoteRun]).ok).toBe(true);
    // A deposit figure not in tool JSON is blocked until CH-06 wires the whitelist.
    expect(checkPriceIntegrity('The deposit is ₹10,000.', [quoteRun]).ok).toBe(false);
    expect(checkPriceIntegrity('The deposit is ₹10,000.', [quoteRun], [10000]).ok).toBe(true);
  });
});

describe('guardrail 3 — negotiation lock', () => {
  it('substitutes the discount phrasebook line on any negotiation language', () => {
    const r = applyNegotiationLock('I can offer a 10% discount if you book now.');
    expect(r.changed).toBe(true);
    expect(r.text).toBe(PHRASEBOOK.discountAsk);
    expect(r.hits.length).toBeGreaterThan(0);
  });

  it('leaves a clean draft untouched', () => {
    const r = applyNegotiationLock('C3 wraps around its own pool. Here is the link.');
    expect(r.changed).toBe(false);
    expect(r.text).toBe('C3 wraps around its own pool. Here is the link.');
  });
});

describe('runGuardrails — pipeline', () => {
  const log = { info: vi.fn() };

  it('sends a clean, backed draft as-is (no regenerate)', async () => {
    const regenerate = vi.fn();
    const out = await runGuardrails(
      { draft: '₹34,000 for the two nights.', toolRuns: [quoteRun] },
      { regenerate, log },
    );
    expect(out.action).toBe('send');
    expect(regenerate).not.toHaveBeenCalled();
  });

  it('regenerates once on a price violation, then sends the clean retry', async () => {
    const regenerate = vi.fn(async () => ({ draft: '₹34,000 for the two nights.', toolRuns: [quoteRun] }));
    const out = await runGuardrails(
      { draft: 'A special ₹99,000 rate.', toolRuns: [quoteRun] },
      { regenerate, log },
    );
    expect(regenerate).toHaveBeenCalledTimes(1);
    expect(out.action).toBe('send');
    if (out.action === 'send') expect(out.text).toContain('34,000');
  });

  it('defers + escalates when price integrity fails twice — never sends the figure', async () => {
    const regenerate = vi.fn(async () => ({ draft: 'Still ₹99,000, promise.', toolRuns: [quoteRun] }));
    const out = await runGuardrails(
      { draft: 'A special ₹99,000 rate.', toolRuns: [quoteRun] },
      { regenerate, log },
    );
    expect(out.action).toBe('defer');
    if (out.action === 'defer') {
      expect(out.escalate).toBe(true);
      expect(out.text).toBe(PHRASEBOOK.quoteApiDown);
      expect(out.text).not.toContain('99,000');
    }
  });

  it('negotiation language is substituted first, clearing the price check', async () => {
    const regenerate = vi.fn();
    const out = await runGuardrails(
      { draft: 'A discount of ₹99,000 just for you.', toolRuns: [quoteRun] },
      { regenerate, log },
    );
    // The whole draft becomes the phrasebook line (no ₹), so price integrity passes.
    expect(out.action).toBe('send');
    if (out.action === 'send') expect(out.text).toBe(PHRASEBOOK.discountAsk);
    expect(regenerate).not.toHaveBeenCalled();
  });
});
