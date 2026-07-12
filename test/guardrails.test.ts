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
import { kbPriceWhitelist } from '../src/brain/knowledge.js';
import { PHRASEBOOK } from '../src/brain/prompt.js';
import { extractKbFees } from '../src/brain/rupees.js';
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

  it('a draft with no ₹ passes trivially; an unbacked figure is blocked with no whitelist', () => {
    expect(checkPriceIntegrity('Happy to help with your stay.', [quoteRun]).ok).toBe(true);
    expect(checkPriceIntegrity('The deposit is ₹10,000.', [quoteRun]).ok).toBe(false);
  });

  it('a fractional tool figure matches whether the model floors OR rounds it', () => {
    // averagePerNight = 50000 / 3 = 16666.67 — a real derived average.
    const fractional: ToolRun = {
      name: 'get_quote',
      input: {},
      result: { ok: true, data: { total: 50000, averagePerNight: 50000 / 3, nights: 3 } },
    };
    expect(checkPriceIntegrity('About ₹16,667 a night.', [fractional]).ok).toBe(true); // rounded
    expect(checkPriceIntegrity('About ₹16,666 a night.', [fractional]).ok).toBe(true); // floored
    expect(checkPriceIntegrity('₹50,000 total.', [fractional]).ok).toBe(true);
  });
});

/**
 * The kb fee EXEMPTION is context-BOUND (§6.5: "stay prices and per-night figures
 * must still come from tool JSON"). These cases are the reason: a flat number[]
 * whitelist would let the model launder a published fee amount into a fabricated
 * room rate. The whitelist is derived from kb/policies.md by extractKbFees, so
 * these use the REAL shipped fees rather than invented ones.
 */
describe('guardrail 1 — the kb fee exemption is context-bound', () => {
  const kbFees = kbPriceWhitelist();

  it('derives each fee bound to the fee terms of its own sentence', () => {
    expect(kbFees).toEqual(
      expect.arrayContaining([
        { amount: 1000, cues: expect.arrayContaining(['early check-in']) },
        { amount: 1500, cues: expect.arrayContaining(['extra adult']) },
        { amount: 750, cues: expect.arrayContaining(['extra child']) },
      ]),
    );
    // Every published fee must carry at least one cue, or it can never be stated.
    for (const fee of kbFees) expect(fee.cues.length).toBeGreaterThan(0);
  });

  it('ALLOWS a published fee stated in its own fee context, with no tool call', () => {
    // The headline CH-06 behaviour: the AI can answer "what is an extra adult?"
    // from the KB alone. Before CH-06 this was blocked and escalated.
    expect(checkPriceIntegrity('An extra adult is ₹1,500 per night.', [], kbFees).ok).toBe(true);
    expect(checkPriceIntegrity('Early check-in is ₹1,000 per hour.', [], kbFees).ok).toBe(true);
    expect(checkPriceIntegrity('An extra child under 12 is ₹750 per night.', [], kbFees).ok).toBe(true);
  });

  it('BLOCKS a fee amount laundered into a fabricated STAY price (the money rule)', () => {
    // ₹1,500 IS a published fee, but never a room rate. Without the cue binding,
    // a flat whitelist would send this — a hallucinated nightly rate.
    const r = checkPriceIntegrity('Villa B3 is ₹1,500 per night for those dates.', [], kbFees);
    expect(r.ok).toBe(false);
    expect(r.unbacked).toEqual([1500]);
    expect(checkPriceIntegrity('That works out to ₹750 a night for the villa.', [], kbFees).ok).toBe(false);
  });

  it("BLOCKS a fee amount restated as a DIFFERENT fee (block [4] forbids deposits)", () => {
    // ₹1,000 is the early-check-in rate; it must not become a deposit figure.
    expect(checkPriceIntegrity('The refundable security deposit is ₹1,000.', [], kbFees).ok).toBe(false);
  });

  it('stays safe when the content pass lands a deposit figure (OQ-04 forward guard)', () => {
    // The trap this design exists to prevent: a future policies.md with a deposit
    // must NOT make ₹10,000 statable as a nightly rate.
    const withDeposit = extractKbFees('A refundable security deposit of ₹10,000 is collected at check-in.');
    expect(withDeposit).toEqual([{ amount: 10000, cues: expect.arrayContaining(['security deposit']) }]);
    expect(checkPriceIntegrity('The security deposit is ₹10,000.', [], withDeposit).ok).toBe(true);
    expect(checkPriceIntegrity('Villa C3 is ₹10,000 per night.', [], withDeposit).ok).toBe(false);
  });

  it('never exempts a figure whose sentence names no fee (fail-closed)', () => {
    // A ₹ figure with no fee subject gets no cues, so nothing can license it.
    expect(extractKbFees('The villa costs ₹18,000.')).toEqual([]);
    expect(checkPriceIntegrity('The villa costs ₹18,000.', [], extractKbFees('The villa costs ₹18,000.')).ok).toBe(false);
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

  it('does NOT nuke descriptive "offer(s)" — permitted hospitality copy', () => {
    for (const clean of [
      'Villa C3 offers three bedrooms and a private pool.',
      'We offer breakfast with the CP plan.',
      'May I offer you the booking link.',
    ]) {
      expect(applyNegotiationLock(clean).changed).toBe(false);
    }
  });

  it('still catches a bargain-noun "special/festive offer"', () => {
    expect(applyNegotiationLock('A special offer just for you.').changed).toBe(true);
    expect(applyNegotiationLock('Our festive offer this season.').changed).toBe(true);
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
