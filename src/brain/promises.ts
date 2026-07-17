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

/**
 * C5 is CH-13a's split out of C1, and the reason is the failure class again.
 *
 * C1 was one 9-verb class covering `informed|notified|told|alerted` AND
 * `arranged|booked|sent|dispatched|confirmed|resolved`. Registering
 * `create_staff_task → C1` therefore licensed EVERY C1 verb off one towels
 * task — reproduced: "The airport transfer has been booked.", "I've arranged a
 * late checkout for you.", "Your refund has been logged." all shipped. That is
 * CH-11's D2 hazard re-opened by the back door: D2 refused to register
 * `get_booking` because "C1's regex packs `confirmed` in with `informed`", and
 * CH-13a then registered a tool for C1 without narrowing it.
 *
 * The split is by the claim's OBJECT, which is what the class system was always
 * for:
 *  - C1 TEAM-TOLD    — "the team has been informed", "housekeeping knows",
 *                      "I've passed it on". The object is the TEAM. A delivered
 *                      task makes these true.
 *  - C5 THING-DONE   — "the transfer has been booked", "I've arranged a late
 *                      checkout", "that's sorted". The object is a SPECIFIC
 *                      OUTCOME, and telling the team about a request does NOT
 *                      make one true. Only `task_done` licenses C5: a human
 *                      finished the work and said so.
 * Nothing else licenses C5, so an unbacked "I've arranged it" regenerates and
 * then defers — fail-closed, which is the right default for a class whose whole
 * content is "a specific thing is now true".
 */
export type ClaimClass = 'C1' | 'C2' | 'C3' | 'C4' | 'C5';

// Phrases that are never claims: availability statements and the like.
const EXEMPT = /\bfully\s+booked\b|\bbooked\s+out\b|\bsold\s+out\b/gi;

const LEXICON: ReadonlyArray<{ cls: ClaimClass; re: RegExp }> = [
  // C1 — TEAM-TOLD. The object is the team; a delivered task makes these true.
  { cls: 'C1', re: /\b(?:has|have|had)\s+been\s+(?:informed|notified|told|alerted|escalated|raised|logged)\b/i },
  { cls: 'C1', re: /\b(?:i|we)(?:'ve|\s+have)?(?:\s+just|\s+already)?\s+(?:informed|notified|told|alerted|nudged|messaged|pinged|updated)\s+(?:the\s+)?(?:team|housekeeping|front\s?desk|staff|maintenance|villa\s+team)\b/i },
  { cls: 'C1', re: /\b(?:i|we)(?:'ve|\s+have)\s+(?:raised|logged|escalated)\b/i },
  { cls: 'C1', re: /\b(?:i|we)(?:'ve|\s+have|\s+had)?\s+passed\s+(?:it|this|that)\s+on\b/i },
  // Subject-anchored: "daily housekeeping is taken care of" must NOT match.
  { cls: 'C1', re: /\b(?:the\s+)?(?:team|housekeeping|front\s?desk|staff|maintenance|villa\s+team)\s+(?:knows|(?:is|are)\s+aware|(?:is|are)\s+looking\s+into|(?:is|are)\s+on\s+(?:it|this|that))\b/i },
  // C5 — THING-DONE. The object is a specific OUTCOME. Telling the team about a
  // request does NOT make one true; only a human finishing the work does, which
  // is why ONLY `task_done` licenses this class.
  { cls: 'C5', re: /\b(?:has|have|had)\s+been\s+(?:arranged|booked|sent|dispatched|resolved|confirmed|delivered|fixed|sorted)\b/i },
  { cls: 'C5', re: /\b(?:i|we)(?:'ve|\s+have)\s+(?:arranged|organised|organized|booked|sent|delivered|fixed|sorted)\b/i },
  { cls: 'C5', re: /\bconsider\s+it\s+(?:done|sorted|arranged)\b/i },
  { cls: 'C5', re: /\b(?:that|this|it)(?:'s|\s+is|\s+has\s+been)\s+(?:sorted|done|arranged|taken\s+care\s+of)\b/i },
  // C2 — dispatch in motion.
  //
  // 🚨 WIDENED BY CH-13a's PRE-PUSH REVIEW, and the reason is the whole lesson:
  // the three original literals were a DENYLIST NARROWER THAN THEIR OWN
  // CONTRACT. Block [4] states the contract in plain words — "never say
  // anything was logged, passed on, arranged, OR THAT ANYONE IS COMING" — which
  // is tense-free. The lexicon implemented three present-tense idioms, so every
  // FUTURE-tense dispatch walked through: "someone will bring them up shortly",
  // "housekeeping will be with you shortly", "they'll be up shortly".
  //
  // This was not hypothetical. On CH-13a's live local demo, with the task card
  // UNDELIVERED and guardrail 2 correctly refusing "on their way", the real
  // model shipped: "I'm bringing the team in now — someone will be with you
  // shortly with those towels." The C3 half ("bringing the team in") was
  // licensed by a real escalation and carried the unlicensed dispatch half out
  // of the door in the same sentence. Nobody had been told about the towels.
  //
  // HONEST LIMIT: this is still a denylist, and the cure for the class is to
  // invert the guard (a person/goods subject + a motion-toward-guest predicate
  // is C2 unless licensed). That is a bigger change with real false-positive
  // risk on the defer path, and this repo's own record is that five of CH-12's
  // nine review rounds introduced the next blocker via exactly that kind of hot
  // fix. Widened here to cover what the model demonstrably writes; the
  // inversion is logged in progress.md. Every pattern below is pinned by a test
  // in BOTH directions.
  { cls: 'C2', re: /\bon\s+(?:their|its|his|her|the)\s+way\b/i },
  { cls: 'C2', re: /\bsend(?:ing)?\s+(?:someone|somebody)\b/i },
  // The \s+ used to sit BEFORE the group, so the 's branch could only match a
  // literal space-then-apostrophe — i.e. three of these four verbs were
  // unreachable via the contraction a model actually writes. C1's line above
  // gets the identical shape right; this is now consistent with it.
  { cls: 'C2', re: /\bsomeone(?:'s|’s|\s+is)\s+(?:coming|being\s+sent|on\s+the\s+way|headed)\b/i },
  // Future-tense dispatch: a person/goods subject + a motion-toward-guest verb.
  { cls: 'C2', re: /\b(?:someone|somebody|housekeeping|maintenance|the\s+team|they)\s*(?:'ll|’ll|\s+will|\s+is\s+going\s+to|\s+are\s+going\s+to)\s+(?:be\s+with\s+you|be\s+up\b|be\s+right\s+(?:up|over)|bring|come\s+(?:up|by|round|over)|drop|pop\s+(?:up|by|round))/i },
  { cls: 'C2', re: /\b(?:will|'ll|’ll)\s+be\s+with\s+you\b/i },
  { cls: 'C2', re: /\b(?:i|we)(?:'ll|’ll|\s+will)\s+have\s+someone\b/i },
  { cls: 'C2', re: /\b(?:i|we)(?:'ll|’ll|\s+will)\s+get\s+(?:those|them|it|that|these)\s+(?:to|up\s+to)\s+you\b/i },
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
  // A human FINISHED the work and said so: the team plainly knows (C1), and the
  // specific thing is genuinely done (C5). This is the only C5 licence there is.
  task_done: ['C1', 'C5'],
  sla_nudge: ['C1'],
};

/**
 * Which tool's FAILURE is positive evidence that a class is FALSE. (CH-13a's
 * pre-push review, finding F4 — a real hole, reproduced.)
 *
 * The bug: an evidence ROW licenses by class for a whole turn, and `covered()`
 * checks it BEFORE it ever looks at tool runs. So this shipped —
 *   1. towels task delivered → housekeeper types DONE → `task_done` row.
 *   2. the close line asks "Anything else we can help with?" (it SOLICITS this).
 *   3. guest: "yes, a bathrobe please".
 *   4. the bathrobe's card fails → create_staff_task returns NOT_NOTIFIED.
 *   5. model: "The team has been informed." → C1 → covered by step 1's STALE
 *      row → SHIPS, with nobody informed about the bathrobe.
 * `promises.ts` claimed CH-12's blocker #5 "cannot recur here by construction".
 * It recurred, because the construction it named (ok-gated tool runs) is not
 * the only door into `covered()`.
 *
 * The rule, and it is the honest one: a tool we ran THIS TURN that came back
 * NOT_NOTIFIED is not merely an absence of evidence — it is EVIDENCE OF
 * ABSENCE, and it is fresher than any stored row. The freshest fact wins, so it
 * VETOES the classes that tool would have licensed. Absence of a run vetoes
 * nothing: a turn that never tried is still free to lean on the row.
 */
const VETO_ON_FAILURE: ReadonlyMap<string, ReadonlySet<ClaimClass>> = new Map([
  ['create_staff_task', new Set<ClaimClass>(['C1', 'C2', 'C5'])],
]);

/** The classes THIS TURN's own failed actions prove false. */
export function vetoedByFailures(toolRuns: readonly ToolRun[]): Set<ClaimClass> {
  const vetoed = new Set<ClaimClass>();
  for (const run of toolRuns) {
    if (run.result.ok) continue;
    // Only a DEMONSTRATED failure to reach a human vetoes. A REFUSED gate (bad
    // stage, a house in the summary) means we never tried, and an INVALID input
    // means the model fumbled the call — neither is evidence about the world.
    if (run.result.error !== 'NOT_NOTIFIED') continue;
    for (const cls of VETO_ON_FAILURE.get(run.name) ?? []) vetoed.add(cls);
  }
  return vetoed;
}

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
  // FIRST, and before every other channel: a thing we tried THIS TURN and
  // demonstrably failed to do is not licensed by anything — not a stale
  // context row, not an escalation, not another tool. Evidence of absence
  // outranks absence of evidence (CH-13a review, F4).
  if (vetoedByFailures(evidence.toolRuns).has(cls)) return false;
  if (evidence.systemEvidence.has(cls)) return true;
  if (cls === 'C3' && evidence.escalationPlanned) return true;
  const toolClaims = evidence.toolClaims ?? TOOL_CLAIMS;
  for (const run of evidence.toolRuns) {
    if (run.result.ok && toolClaims.get(run.name)?.has(cls) === true) return true;
  }
  return false;
}
