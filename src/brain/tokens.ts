/**
 * Shared token estimator (CH-08 step 3 — hoisted from knowledge.ts, which
 * promised exactly this move). chars/3.6 ≈ tokens holds for this repo's
 * English-with-₹ prompt text (calibrated against the live head: 1655 measured
 * tokens ≈ 5.9k chars, CH-04). Heuristic BY DESIGN — budgets gate on it,
 * nothing bills on it; exact counts arrive per call in ConverseResult.usage.
 *
 * Direction of error matters for a budget gate (audit fix — the original note
 * here had it inverted): chars/3.6 OVER-counts plain English (≈4 chars/token,
 * trims a little early — safe) but UNDER-counts dense scripts and emoji
 * (Devanagari runs ~1-2 chars/token), which would pack MORE real tokens than
 * the budget, i.e. trim LATE. High code units are weighted up so a
 * Hinglish/emoji-heavy thread cannot silently blow the §6.3 envelope; the
 * weight makes those texts trim early instead, the safe side.
 * Pure leaf: no imports, so knowledge.ts and contextBuilder.ts both sit on it
 * without cycle risk (the CH-06 prompt→knowledge→guardrails lesson).
 */
export function estimateTokens(text: string): number {
  let weighted = 0;
  for (let i = 0; i < text.length; i++) {
    // 0x0900 (Devanagari onwards, incl. CJK and surrogate halves): ~1.5
    // chars/token real ⇒ weight 2.4 so /3.6 lands there. Latin, digits and
    // common punctuation stay weight 1.
    weighted += text.charCodeAt(i) >= 0x0900 ? 2.4 : 1;
  }
  return Math.ceil(weighted / 3.6);
}
