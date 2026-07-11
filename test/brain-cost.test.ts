/**
 * Cost/INR math (CH-04). Pure — runs with Postgres down. The estimate is
 * approximate by design (§5.5); these tests pin the SHAPE and the per-kind
 * rate ratios, not a live price.
 */
import { describe, expect, it } from 'vitest';
import { costEventsFor, INR_PER_USD, MODEL_PRICES_USD_PER_MTOK } from '../src/brain/cost.js';

/** The exact per-token INR the module should charge for a bucket. */
function inr(usdPerMtok: number, qty: number): string {
  return (((usdPerMtok * INR_PER_USD) / 1_000_000) * qty).toFixed(4);
}

describe('costEventsFor', () => {
  it('prices a single bucket at its per-MTok rate', () => {
    const rows = costEventsFor({
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    expect(rows).toEqual([
      {
        kind: 'anthropic_input',
        quantity: '1000000',
        inrEstimate: (MODEL_PRICES_USD_PER_MTOK.input * INR_PER_USD).toFixed(4),
      },
    ]);
  });

  it('drops zero buckets and prices each kind independently', () => {
    const rows = costEventsFor({
      inputTokens: 50,
      outputTokens: 40,
      cacheReadTokens: 0,
      cacheWriteTokens: 1200,
    });
    expect(rows).toEqual([
      { kind: 'anthropic_input', quantity: '50', inrEstimate: inr(MODEL_PRICES_USD_PER_MTOK.input, 50) },
      {
        kind: 'anthropic_output',
        quantity: '40',
        inrEstimate: inr(MODEL_PRICES_USD_PER_MTOK.output, 40),
      },
      {
        kind: 'anthropic_cache_write',
        quantity: '1200',
        inrEstimate: inr(MODEL_PRICES_USD_PER_MTOK.cacheWrite, 1200),
      },
    ]);
  });

  it('emits a cache_read row only when cached reads occurred', () => {
    const rows = costEventsFor({
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 900,
      cacheWriteTokens: 0,
    });
    expect(rows).toEqual([
      {
        kind: 'anthropic_cache_read',
        quantity: '900',
        inrEstimate: inr(MODEL_PRICES_USD_PER_MTOK.cacheRead, 900),
      },
    ]);
  });

  it('returns nothing when every bucket is zero', () => {
    expect(
      costEventsFor({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }),
    ).toEqual([]);
  });

  it('holds the cache ratios: read = 0.1x input, write = 1.25x input', () => {
    expect(MODEL_PRICES_USD_PER_MTOK.cacheRead).toBeCloseTo(MODEL_PRICES_USD_PER_MTOK.input * 0.1, 6);
    expect(MODEL_PRICES_USD_PER_MTOK.cacheWrite).toBeCloseTo(
      MODEL_PRICES_USD_PER_MTOK.input * 1.25,
      6,
    );
  });
});
