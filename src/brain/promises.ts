/**
 * Guardrail 2 — promise integrity (§6.5 #2, CH-07). Pure leaf module.
 *
 * "Never promise what didn't happen" is enforced by claim CLASS, not tense
 * (review decision): what matters is the claim's OBJECT —
 *  - C1 completed actions ("the team has been informed") and
 *  - C2 dispatch-in-motion ("housekeeping is on their way") need HARD
 *    evidence: a successful tool call this turn whose name licenses the class
 *    (TOOL_CLAIMS — `create_staff_task` since CH-13a), or a sender:'system'
 *    context row since the guest's previous message whose raw.contextKind
 *    licenses it (CH-02 D5 opt-in tagging — `task_done`/`sla_nudge` since
 *    CH-13a are how a DONE and an SLA chase, which happen BETWEEN guest turns,
 *    become claimable at all).
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

/**
 * Tool name → claim classes a SUCCESSFUL run licenses.
 *
 * remember_fact → C4 and ONLY C4 (CH-09) — a memory save must never
 * cross-license "the team has been informed". The price tools still back no
 * promise phrase, and get_booking is deliberately registered in NO class
 * (CH-11 D2: C1's regex packs `confirmed` in with `informed`, so registering
 * it would license "the team has been informed" off a booking lookup).
 *
 * create_staff_task → C1+C2 (CH-13a). Scenario 3 blesses "two fresh towels are
 * on their way" after a real task, which is C2, and "the team has been
 * informed", which is C1. The licence is safe ONLY because the tool's `ok`
 * answers "did a human GET this?" and not "did a row get inserted?" — an
 * undelivered card returns ok:false NOT_NOTIFIED, and `covered()` below counts
 * successful runs only. That is the whole mechanism: no framework change, and
 * CH-12's blocker #5 cannot recur here by construction.
 *
 * TODO(CH-14): escalate_to_human → C3.
 */
export const TOOL_CLAIMS: ReadonlyMap<string, ReadonlySet<ClaimClass>> = new Map([
  ['remember_fact', new Set<ClaimClass>(['C4'])],
  ['create_staff_task', new Set<ClaimClass>(['C1', 'C2'])],
]);

/**
 * sender:'system' context-row kinds → the classes they license (§6.5 #2's
 * second evidence channel — how OUT-OF-TURN events become claimable).
 *
 * fact_saved (CH-09 audit): the worker writes it on a winning-claim save so
 * the NEXT turn's truthful "yes, I've noted it" confirmation stays licensed —
 * the evidence window (since the guest's previous message) gives it exactly
 * one turn of life, which is the honest decay.
 *
 * task_done + sla_nudge (CH-13a) are C1 and NOT C2, deliberately:
 *  - `task_done` means a human FINISHED. "It's sorted" is true; "someone is on
 *    their way" is now false — they have been and gone.
 *  - `sla_nudge` means we chased someone. "I've nudged housekeeping" is true —
 *    it is scenario 3's exact line, and this row is the only thing that
 *    licenses it. But a nudge puts NOBODY in motion, so C2 would be a lie.
 * Same reasoning as ops_escalation → C3 only: an ops ping does not put
 * housekeeping in motion either.
 */
export const CONTEXT_KIND_CLAIMS: Readonly<Record<string, readonly ClaimClass[]>> = {
  ops_escalation: ['C3'],
  fact_saved: ['C4'],
  task_done: ['C1'],
  sla_nudge: ['C1'],
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
