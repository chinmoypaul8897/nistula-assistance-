/**
 * Guardrail 2 — promise integrity (§6.5 #2, CH-07). Pure leaf module.
 *
 * "Never promise what didn't happen" is enforced by claim CLASS, not tense
 * (review decision): what matters is the claim's OBJECT —
 *  - C1 completed actions ("the team has been informed") and
 *  - C2 dispatch-in-motion ("housekeeping is on their way") need HARD
 *    evidence: a successful tool call this turn whose name licenses the class
 *    (TOOL_CLAIMS — empty until CH-13/14 register their tools), or a
 *    sender:'system' context row since the guest's previous message whose
 *    raw.contextKind licenses it (CH-02 D5 opt-in tagging).
 *  - C3 team-referrals ("let me bring the team in") are the model doing what
 *    block [4] TELLS it to do — the fix for an unlicensed C3 is to MAKE it
 *    true (escalate), never to regenerate the model away from escalating.
 *    An escalation already planned this turn licenses C3 — and ONLY C3: an
 *    ops ping does not put housekeeping in motion.
 *  - C4 memory promises ("I'll remember that", "I've made a note" — CH-09,
 *    Paul-approved) need a successful remember_fact run this turn. A
 *    duplicate skip licenses too (ok:true — the fact IS on file); a REFUSED
 *    screen (ok:false) never does. Memory is the product's moat: promising
 *    it falsely is exactly the class this guardrail exists for.
 */
import type { ToolRun } from './tools/registry.js';

export type ClaimClass = 'C1' | 'C2' | 'C3' | 'C4';

// Phrases that are never claims: availability statements and the like.
const EXEMPT = /\bfully\s+booked\b|\bbooked\s+out\b|\bsold\s+out\b/gi;

const LEXICON: ReadonlyArray<{ cls: ClaimClass; re: RegExp }> = [
  // C1 — completed actions.
  { cls: 'C1', re: /\b(?:has|have|had)\s+been\s+(?:informed|notified|told|alerted|arranged|booked|sent|dispatched|escalated|raised|logged|resolved|confirmed)\b/i },
  { cls: 'C1', re: /\b(?:i|we)(?:'ve|\s+have)?(?:\s+just|\s+already)?\s+(?:informed|notified|told|alerted|nudged|messaged|pinged|updated)\s+(?:the\s+)?(?:team|housekeeping|front\s?desk|staff|maintenance|villa\s+team)\b/i },
  { cls: 'C1', re: /\b(?:i|we)(?:'ve|\s+have)\s+(?:arranged|organised|organized|booked|sent|raised|logged|escalated)\b/i },
  { cls: 'C1', re: /\b(?:i|we)(?:'ve|\s+have|\s+had)?\s+passed\s+(?:it|this|that)\s+on\b/i },
  { cls: 'C1', re: /\bconsider\s+it\s+(?:done|sorted|arranged)\b/i },
  // Subject-anchored: "daily housekeeping is taken care of" must NOT match.
  { cls: 'C1', re: /\b(?:that|this|it)(?:'s|\s+is|\s+has\s+been)\s+(?:sorted|done|arranged|taken\s+care\s+of)\b/i },
  // Staff-awareness claims: any staff subject, incl. British plural agreement
  // ("the team are looking into it") — audit fix: "housekeeping knows" and
  // "the team is looking into it" shipped unbacked before this widening.
  { cls: 'C1', re: /\b(?:the\s+)?(?:team|housekeeping|front\s?desk|staff|maintenance|villa\s+team)\s+(?:knows|(?:is|are)\s+aware|(?:is|are)\s+looking\s+into|(?:is|are)\s+on\s+(?:it|this|that))\b/i },
  // C2 — dispatch in motion.
  { cls: 'C2', re: /\bon\s+(?:their|its|his|her|the)\s+way\b/i },
  { cls: 'C2', re: /\bsend(?:ing)?\s+(?:someone|somebody)\b/i },
  { cls: 'C2', re: /\bsomeone\s+(?:is|'s)\s+(?:coming|being\s+sent|on\s+the\s+way|headed)\b/i },
  // C3 — team referral (block [4]'s own approved phrasing family).
  { cls: 'C3', re: /\bbring(?:ing)?\s+(?:the\s+)?(?:team|front\s?desk|villa\s+team|them)\s+in\b/i },
  { cls: 'C3', re: /\bloop(?:ing)?\s+(?:them|the\s+team)?\s?in\b/i },
  { cls: 'C3', re: /\bsomeone\s+will\s+(?:reply|be)\s+(?:right\s+)?here\s+(?:shortly|soon)\b/i },
  { cls: 'C3', re: /\b(?:i|we)(?:'ll|\s+will)\s+(?:pass|send|flag|raise)\s+(?:it|this|that)\s+(?:on|to|along)\b/i },
  // C4 — memory promises (CH-09). Narrow on purpose: recall statements
  // ("I remember you liked…") are backed by block [5] itself, and a bare
  // "Noted —" is ordinary speech; only PROMISES of remembering match.
  // Widened by the pre-push audit: nine natural dodges ("I won't forget",
  // "put that on file", "on record now", "saved with us") shipped unbacked.
  { cls: 'C4', re: /\b(?:i|we)(?:'ll|\s+will|\s+shall)(?:\s+be\s+sure\s+to)?\s+remember\b/i },
  { cls: 'C4', re: /\b(?:i|we)\s+(?:won'?t|will\s+not|shall\s+not)\s+forget\b/i },
  { cls: 'C4', re: /\b(?:i|we)\b[^.!?]{0,12}\b(?:made|make)\s+a\s+note\b/i },
  { cls: 'C4', re: /\b(?:i|we)(?:'ll|\s+will|\s+shall)\s+note\s+(?:that|this|it)\s+down\b/i },
  { cls: 'C4', re: /\b(?:i|we)(?:'ve|\s+have)\s+noted\b/i },
  { cls: 'C4', re: /\b(?:i|we)(?:'ll|\s+will)\s+keep\s+(?:that|this|it)\s+in\s+mind\b/i },
  { cls: 'C4', re: /\b(?:saved|added)\s+(?:that|this|it)\s+to\s+your\s+(?:profile|preferences|notes|file)\b/i },
  { cls: 'C4', re: /\bput\s+(?:that|this|it)\s+on\s+(?:your\s+|the\s+)?file\b/i },
  { cls: 'C4', re: /\b(?:that'?s|it'?s|this\s+is|is\s+now|now)\s+(?:gone\s+into|in|on)\s+(?:your|our|the)\s+(?:file|notes?|records?)\b/i },
  { cls: 'C4', re: /\b(?:saved|stored|recorded|logged)\s+with\s+us\b/i },
  { cls: 'C4', re: /\b(?:have|has)\s+(?:that|this|it)\s+on\s+record\b|\bon\s+record\s+now\b/i },
  { cls: 'C4', re: /\bnoted\s+for\s+(?:next\s+time|your\s+next\s+(?:stay|visit|trip))\b/i },
];

/** Tool name → claim classes a SUCCESSFUL run licenses. First registration
 * (CH-09): remember_fact → C4 and ONLY C4 — a memory save must never
 * cross-license "the team has been informed". The price tools still back no
 * promise phrase.
 * TODO(CH-13): register create_staff_task → C1+C2 (scenario 3 blesses "on
 * their way" after a real task). TODO(CH-14): escalate_to_human → C3. */
export const TOOL_CLAIMS: ReadonlyMap<string, ReadonlySet<ClaimClass>> = new Map([
  ['remember_fact', new Set<ClaimClass>(['C4'])],
]);

/** sender:'system' context-row kinds → the classes they license (§6.5 #2's
 * second evidence channel). TODO(CH-13): task_done + sla_nudge → C1.
 * fact_saved (CH-09 audit): the worker writes it on a winning-claim save so
 * the NEXT turn's truthful "yes, I've noted it" confirmation stays licensed —
 * the evidence window (since the guest's previous message) gives it exactly
 * one turn of life, which is the honest decay. */
export const CONTEXT_KIND_CLAIMS: Readonly<Record<string, readonly ClaimClass[]>> = {
  ops_escalation: ['C3'],
  fact_saved: ['C4'],
};

/** Collapses claimable context-row kinds into the licensed class set. */
export function classesFromContextKinds(kinds: readonly string[]): Set<ClaimClass> {
  const classes = new Set<ClaimClass>();
  for (const kind of kinds) for (const cls of CONTEXT_KIND_CLAIMS[kind] ?? []) classes.add(cls);
  return classes;
}

export interface PromiseEvidence {
  /** This turn's tool runs — only successful ones count. */
  toolRuns: ToolRun[];
  /** Classes licensed by claimable system rows since the guest's previous message. */
  systemEvidence: ReadonlySet<ClaimClass>;
  /** An escalation WILL fire this turn before dispatch — licenses C3 only. */
  escalationPlanned: boolean;
  /** Test seam / CH-13 registration point; defaults to TOOL_CLAIMS. */
  toolClaims?: ReadonlyMap<string, ReadonlySet<ClaimClass>>;
}

export interface PromiseScan {
  /** C1/C2 claims with no covering evidence — the regenerate-class violations. */
  violations: string[];
  /** The draft refers the guest to the team with no escalation planned — the
   * caller must PLAN one (escalate), never regenerate. */
  referral: boolean;
}

/** Scans a draft for action claims and checks each against the evidence. */
export function scanPromises(draft: string, evidence: PromiseEvidence): PromiseScan {
  const masked = draft.replace(EXEMPT, ' ');
  const violations: string[] = [];
  let referral = false;
  for (const { cls, re } of LEXICON) {
    const match = re.exec(masked);
    if (match === null) continue;
    if (covered(cls, evidence)) continue;
    if (cls === 'C3') referral = true;
    else violations.push(match[0]);
  }
  return { violations, referral };
}

function covered(cls: ClaimClass, evidence: PromiseEvidence): boolean {
  if (evidence.systemEvidence.has(cls)) return true;
  if (cls === 'C3' && evidence.escalationPlanned) return true;
  const toolClaims = evidence.toolClaims ?? TOOL_CLAIMS;
  for (const run of evidence.toolRuns) {
    if (run.result.ok && toolClaims.get(run.name)?.has(cls) === true) return true;
  }
  return false;
}
