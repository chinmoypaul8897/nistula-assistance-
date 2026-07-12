/**
 * Save-time screens for remember_fact (CH-09 step 2) — pure leaf module.
 *
 * The CH-07 red-team principle applies: the tool DESCRIPTION also carries the
 * refuse-and-skip list, but description guidance counts for nothing against a
 * complying model — these deterministic screens alone must stop a poisoned or
 * sensitive save (Paul-approved strengthening of the plan letter, 2026-07-12).
 *
 * Three arms, checked in order (first hit names the reason):
 *  - sensitive: health/religion/politics/caste/sexuality — the plan's NEVER
 *    list. Deliberate boundaries (recorded): plain food preferences pass
 *    (vegetarian, vegan, no onion); religious-dietary terms do NOT (halal,
 *    kosher, jain food) — they encode religion. "shellfish allergy" is
 *    REFUSED per the plan's letter ("NEVER health") — open question filed
 *    for the planning chat, not improvised here.
 *  - instruction: imperative/prompt-shaped content — facts describe, they
 *    never direct. Includes the block-header shape so a fact can never
 *    smuggle a [SITUATION]-style marker toward the prompt.
 *  - entitlement: discounts, rates, upgrades, identity/authority claims.
 *    ANY ₹/Rs amount inside a fact is an entitlement by construction — a
 *    fact is the one place a rate claim could outlive guardrail 1's
 *    turn-scoped tool evidence, so none may enter.
 */
import { sanitiseInline } from './prompt.js';

/** "One sentence" (§4 guest_facts.content) made concrete; zod caps the tool
 * input at the same figure so the model sees a clean validation error. */
export const FACT_CONTENT_MAX = 200;

export type FactScreenReason = 'sensitive' | 'instruction' | 'entitlement' | 'empty';

export type FactScreenVerdict =
  | { ok: true; content: string }
  | { ok: false; reason: FactScreenReason };

const SENSITIVE_RES: readonly RegExp[] = [
  // Health / medical (incl. allergies — plan letter).
  /\ballerg\w*/i,
  /\bdiabet\w*/i,
  /\bmedicat\w*|\bmedicine\b/i,
  /\basthma\b/i,
  /\bdisab\w*/i,
  /\bwheelchair\b/i,
  /\bpregnan\w*/i,
  /\bsurger\w*/i,
  /\btherap\w*/i,
  /\bdepress\w*/i,
  /\banxiety\b/i,
  /\bblood\s+pressure\b/i,
  /\bheart\s+condition\b/i,
  /\bdoctor\b|\bhospital\b|\bclinic\b/i,
  /\bdisease\b/i,
  /\bhiv\b/i,
  // Religion — identity terms and religious-dietary/observance terms.
  /\bhindu\w*/i,
  /\bmuslim\w*|\bislam\w*/i,
  /\bchristian\w*|\bcatholic\w*/i,
  /\bsikh\w*/i,
  /\bbuddhis\w*/i,
  // "jain" alone is a common surname — only the dietary form is religious.
  /\bjain\s+(?:food|meal|diet|thali)\b/i,
  /\bhalal\b|\bkosher\b/i,
  /\bnamaz\b|\bpuja\b|\bvrat\b|\bramadan\b|\beid\b/i,
  /\bchurch\b|\btemple\b|\bmosque\b|\bgurudwara\b/i,
  // Politics / caste.
  /\bpolitic\w*/i,
  /\belection\w*/i,
  /\bvot(?:e|es|er|ers|ing)\b/i,
  /\bbjp\b|\bcongress\s+party\b/i,
  /\bcaste\b|\bbrahmin\b|\bdalit\b/i,
  // Sexuality.
  /\bgay\b|\blesbian\b|\bbisexual\b|\btransgender\b|\blgbt\w*/i,
];

const INSTRUCTION_RES: readonly RegExp[] = [
  // Leading imperative — a fact opens with a subject, an instruction with a verb.
  /^(?:always|never|please|kindly|ensure|make\s+sure|remember\s+to|from\s+now\s+on|note\s*:)/i,
  /\b(?:ignore|disregard|override)\b[\s\S]{0,24}\b(?:rules?|instructions?|guidelines?|prompts?)\b/i,
  /\byou\s+(?:must|should|will|have\s+to)\b/i,
  // Block-header shape: [ANYTHING IN CAPS] can never ride inside a fact.
  /\[[A-Z][A-Z ]{2,}\]/,
];

const ENTITLEMENT_RES: readonly RegExp[] = [
  /\b(?:gets?|deserves?|entitled\s+to|eligible\s+for|qualifies\s+for|(?:was|were|is|are)\s+promised)\b[\s\S]{0,40}\b(?:free|discount\w*|upgrade\w*|complimentary|waive\w*|refund\w*|special\s+rate|lower\s+rate|vip)\b/i,
  /\bdiscount\w*/i,
  /\b\d{1,3}\s?%/,
  // Any rupee amount — see the module header.
  /₹/,
  /\brs\.?\s?\d/i,
  /\binr\s?\d/i,
  /\brupees?\b/i,
  /\bfree\s+(?:upgrade|night|stay|breakfast|meal)\b/i,
  // Identity / authority claims — never facts, always leverage.
  /\b(?:is\s+the\s+owner|owner'?s\s+(?:friend|family)|works?\s+(?:for|at|with)\s+nistula|is\s+(?:a\s+)?(?:staff|manager|employee|vip))\b/i,
];

/** Sanitises then screens fact content; returns the clean string to store. */
export function screenFactContent(raw: string): FactScreenVerdict {
  const content = sanitiseInline(raw, FACT_CONTENT_MAX);
  if (content === '') return { ok: false, reason: 'empty' };
  if (SENSITIVE_RES.some((re) => re.test(content))) return { ok: false, reason: 'sensitive' };
  if (INSTRUCTION_RES.some((re) => re.test(content))) return { ok: false, reason: 'instruction' };
  if (ENTITLEMENT_RES.some((re) => re.test(content))) return { ok: false, reason: 'entitlement' };
  return { ok: true, content };
}
