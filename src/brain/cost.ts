/**
 * Token-spend pricing (plan.md CH-04 step 6, §5.5). Estimates are APPROXIMATE
 * by design: list prices are hardcoded per MODEL_ID and INR/USD is a flat
 * constant — the goal is a daily cost signal (CH-17), not an invoice.
 * If MODEL_ID changes, update MODEL_PRICES_USD_PER_MTOK below.
 */

/** Flat conversion — real rate drifts; a fixed constant keeps estimates stable. */
export const INR_PER_USD = 90;

/** claude-sonnet-4-5 list prices, USD per million tokens (as of 2026-07).
 * cacheRead = 0.1x input; cacheWrite = 1.25x input (5-minute ephemeral). */
export const MODEL_PRICES_USD_PER_MTOK = {
  input: 3,
  output: 15,
  cacheRead: 0.3,
  cacheWrite: 3.75,
} as const;

/** The four Anthropic token buckets a single AI call reports (§5.5). */
export interface ConverseUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export type CostEventKind =
  | 'anthropic_input'
  | 'anthropic_output'
  | 'anthropic_cache_read'
  | 'anthropic_cache_write';

/** quantity/inrEstimate are strings — the cost_events columns are pg `numeric`,
 * which drizzle maps to string to avoid float rounding. */
export interface CostRow {
  kind: CostEventKind;
  quantity: string;
  inrEstimate: string;
}

const PER_TOKEN_INR: Record<CostEventKind, number> = {
  anthropic_input: (MODEL_PRICES_USD_PER_MTOK.input * INR_PER_USD) / 1_000_000,
  anthropic_output: (MODEL_PRICES_USD_PER_MTOK.output * INR_PER_USD) / 1_000_000,
  anthropic_cache_read: (MODEL_PRICES_USD_PER_MTOK.cacheRead * INR_PER_USD) / 1_000_000,
  anthropic_cache_write: (MODEL_PRICES_USD_PER_MTOK.cacheWrite * INR_PER_USD) / 1_000_000,
};

/**
 * One cost row per NON-ZERO token bucket (a cache-cold first call has no read
 * tokens; a cache-warm call has no write tokens — empty buckets are dropped so
 * the meter stays readable). inr_estimate is fixed to 4 dp; paise precision on
 * a token estimate is noise.
 */
export function costEventsFor(usage: ConverseUsage): CostRow[] {
  const buckets: [CostEventKind, number][] = [
    ['anthropic_input', usage.inputTokens],
    ['anthropic_output', usage.outputTokens],
    ['anthropic_cache_read', usage.cacheReadTokens],
    ['anthropic_cache_write', usage.cacheWriteTokens],
  ];
  const rows: CostRow[] = [];
  for (const [kind, quantity] of buckets) {
    if (quantity <= 0) continue;
    rows.push({
      kind,
      quantity: String(quantity),
      inrEstimate: (quantity * PER_TOKEN_INR[kind]).toFixed(4),
    });
  }
  return rows;
}
