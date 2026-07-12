/**
 * Shared token estimator (CH-08 step 3 — hoisted from knowledge.ts, which
 * promised exactly this move). chars/3.6 ≈ tokens holds for this repo's
 * English-with-₹ prompt text (calibrated against the live head: 1655 measured
 * tokens ≈ 5.9k chars, CH-04). Heuristic BY DESIGN — budgets gate on it,
 * nothing bills on it; exact counts arrive per call in ConverseResult.usage.
 * It under-counts Hinglish and emoji-heavy text slightly, which is safe for a
 * budget gate (we trim a little early, never late).
 * Pure leaf: no imports, so knowledge.ts and contextBuilder.ts both sit on it
 * without cycle risk (the CH-06 prompt→knowledge→guardrails lesson).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.6);
}
