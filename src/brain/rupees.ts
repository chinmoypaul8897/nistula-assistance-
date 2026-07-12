/**
 * Rupee-amount parsing (extracted from guardrails.ts in CH-06). Both the
 * guardrail-1 price check (guardrails.ts) AND the kb price whitelist
 * (knowledge.ts) need to read ₹ figures out of text, so the implementation
 * lives here — a pure, import-free leaf module. WHY a separate file: guardrails.ts
 * imports PHRASEBOOK from prompt.ts, so if knowledge.ts pulled the extractor from
 * guardrails.ts we would get prompt → knowledge → guardrails → prompt (a cycle).
 *
 * KNOWN GAP (deferred to CH-07's full guardrail suite): a comma-less, symbol-
 * less bare integer ("30000") matches neither pattern, so a fabricated price in
 * that exact form fails OPEN. The proper fix is context-aware extraction
 * (numbers adjacent to Rs/per-night/total cues) rather than a bare-integer
 * threshold, which would false-positive on years/pincodes/refs and wrongly
 * defer valid replies. Mitigated meanwhile by the system prompt hard-steering
 * ₹-formatting and this being defence-in-depth. Also deferred: the "34k"
 * shorthand. Review-confirmed; tracked in progress.md for CH-07.
 */

// ₹-prefixed amounts ("₹34,000", "₹ 34000") and bare comma-grouped runs
// ("34,000") — a thousands separator is a money tell even without the symbol.
const RUPEE_AMOUNT = /₹\s?\d[\d,]*(?:\.\d+)?/g;
const GROUPED_AMOUNT = /\b\d{1,3}(?:,\d{3})+\b/g;

/** Normalises a matched money string to an integer rupee value. */
function toInt(match: string): number {
  const digits = match.replace(/[₹,\s]/g, '').split('.')[0] ?? '';
  return Number.parseInt(digits, 10);
}

/** Every ₹-looking amount in the text, as integers (deduped). */
export function extractRupeeAmounts(text: string): number[] {
  const found = new Set<number>();
  for (const re of [RUPEE_AMOUNT, GROUPED_AMOUNT]) {
    for (const m of text.matchAll(re)) {
      const n = toInt(m[0]);
      if (Number.isFinite(n)) found.add(n);
    }
  }
  return [...found];
}
