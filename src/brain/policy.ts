/**
 * Deterministic pre-model conversation policies (plan.md §6.7, CH-07 step 1).
 * Some behaviour must be CODE, not model judgment: human requests, complaint
 * routing, the §3.3 rate-limit cool-off, media fallbacks, and human-takeover
 * silence. `decidePolicy` is pure; the in-memory rate window is an injected
 * singleton (the CH-05 DegradedTracker precedent) fed by the worker; and
 * `settlePlanFor` maps a directive to the worker's settlement plan so
 * worker.ts stays the skeleton.
 *
 * Directive order is §6.7's: cool-off is "handled before any of this", then
 * human-active silence, then the special routes, else NORMAL. Type-only
 * imports keep this module runtime-light (debounce.ts precedent).
 */
import type { Conversation, Message } from '../db/repos.js';
import { guestTextOf, locationTextOf, sanitiseTail } from './inbound.js';
import type { Stage } from './stayView.js';
import type { PolicyRule } from './telemetry.js';

// §3.3: per phone, 20 messages / 5 min — module constants, not env (CH-03 D4
// precedent: the literals ARE the spec; promotion to env is a planning call).
export const RATE_LIMIT = { maxMessages: 20, windowMs: 5 * 60_000 } as const;

export interface RateWindow {
  /** Idempotent, id-keyed feed: pg-boss retries / re-checks / sweeper wakes
   * re-deliver the SAME messages — keying by message id makes a re-feed a
   * no-op, so a retried batch can never double-count a guest into a false
   * cool-off (review finding). */
  feed(phone: string, entries: ReadonlyArray<{ id: string; createdAt: Date }>, now: Date): void;
  isOverLimit(phone: string, now: Date): boolean;
}

/** In-memory sliding window — restart loss is acceptable per the plan's own
 * decision (no table); a restart forgives the flood and the next turn's
 * under-limit count restores the conversation. Single-replica assumption. */
export function createRateWindow(): RateWindow {
  const byPhone = new Map<string, Map<string, number>>();

  function prune(phone: string, now: Date): Map<string, number> {
    const entries = byPhone.get(phone) ?? new Map<string, number>();
    const cutoff = now.getTime() - RATE_LIMIT.windowMs;
    for (const [id, at] of entries) if (at < cutoff) entries.delete(id);
    if (entries.size === 0) byPhone.delete(phone);
    else byPhone.set(phone, entries);
    return entries;
  }

  return {
    feed(phone, incoming, now) {
      const entries = byPhone.get(phone) ?? new Map<string, number>();
      for (const { id, createdAt } of incoming) entries.set(id, createdAt.getTime());
      byPhone.set(phone, entries);
      prune(phone, now);
    },
    isOverLimit(phone, now) {
      return prune(phone, now).size > RATE_LIMIT.maxMessages;
    },
  };
}

// --- detection regexes --------------------------------------------------------

// Identity questions ("are you a bot?") are guardrail 5's business, not an
// escalation — the 'human' inside them must not trip HUMAN_REQUEST, so the
// policy text is stripped of bot-question matches before the human set runs.
const BOT_QUESTION_SRC =
  String.raw`(?:are|r)\s+(?:you|u)\s+(?:a\s+|an\s+)?(?:bot|robot|chat\s?bot|machine|ai|human|real(?:\s+person)?)` +
  String.raw`|is\s+this\s+(?:a\s+|an\s+)?(?:bot|robot|chat\s?bot|machine|ai|automated)` +
  String.raw`|am\s+i\s+(?:talking|chatting|speaking)\s+(?:to|with)\s+(?:a\s+|an\s+)?(?:bot|robot|machine|ai|human|real\s+person)` +
  String.raw`|(?:bot|robot|ai|machine)\s+(?:or|ya)\s+(?:a\s+)?(?:human|person|insaan)` +
  String.raw`|(?:human|person|insaan)\s+(?:or|ya)\s+(?:a\s+)?(?:bot|robot|ai|machine)`;
/** Guardrail 5's inbound flag (CH-07 step 3) — exported for the pipeline. */
export const BOT_QUESTION = new RegExp(`\\b(?:${BOT_QUESTION_SRC})\\b`, 'i');
const BOT_QUESTION_STRIP = new RegExp(`\\b(?:${BOT_QUESTION_SRC})\\b`, 'gi');

// §6.7's token list ("human|agent|manager|call me|baat|kisi se baat|
// representative"), tightened WITHIN its letter (recorded deviation): bare
// \bbaat\b is not shipped — "koi baat nahi" is a happy guest — and manager /
// call-me / agent only match in ask-shaped contexts.
const HUMAN_REQUEST_RES = [
  /\bhumans?\b/i, // runs on bot-question-stripped text only
  /(?<!travel\s)\bagents?\b/i,
  /\b(?:speak|talk|call|connect|complain|escalate|get|want|need|give)\w*\b[^.?!\n]{0,24}\bmanager\b/i,
  /\byour\s+manager\b/i,
  /\bmanager\s+(?:please|pls|now)\b/i,
  /\bcall\s+me\s+(?:back|now|please|pls|asap|urgently|on|at)\b/i,
  /\b(?:please|pls|plz|can\s+(?:you|u)|could\s+you)\b[^.?!\n]{0,16}\bcall\s+me\b/i,
  /\bcall\s+me\s*[.!?]*\s*$/im,
  /\bkisi?\s*se\s+baat\b/i,
  /\bbaat\s+kar(?:o|a|ao|wa|na|ni|ana|aiye|wao)\w*/i,
  /\brepresentatives?\b/i,
];

// Negative-sentiment word list (§6.7 complaint heuristics).
//
// CH-11 DELIBERATE DEVIATION — do NOT "finish" this by AND-ing the stay flag.
// §6.7 words the heuristic as "negative + stay context" and the CH-07 TODO that
// stood here told the next session to AND them. Read literally that makes an
// existing safety guard NARROWER: a guest is only `inhouse` if their booking is
// LINKED, and linking is phone-only — an OTA-masked number (Airbnb, Booking.com
// — the bulk of this property's sources) can never link, and neither can a guest
// messaging from a second handset. So an angry in-house guest whose booking we
// cannot see would STOP being escalated, and CH-11 would make the single
// highest-stakes conversation we handle worse than it is today.
//
// The rule that ships instead: stay context may only ever ADD urgency, never
// remove it. Sentiment alone still escalates; `stayContext` rides the directive
// so the ops card and block [6] can say WHERE the guest is. (Paul-approved.)
const COMPLAINT_RE =
  /\b(?:dirty|filthy|broken|not\s+work\w*|doesn'?t\s+work|stopped\s+working|worst|terrible|awful|horrible|disappoint\w*|unacceptable|angry|furious|refund|complain\w*|pathetic|rude|smell(?:y|s|ing)?|stink\w*|leak(?:s|y|ing)?|no\s+(?:water|power|electricity|wifi)|ac\s+(?:is\s+)?(?:not|isn'?t|nahi)|disgusting|unhygienic|cockroach\w*|bahut\s+kharab|kharab)\b/i;

// --- the directive ------------------------------------------------------------

export type DirectiveKind =
  | 'COOL_OFF'
  | 'HUMAN_ACTIVE'
  | 'HUMAN_REQUEST'
  | 'COMPLAINT_SUSPECT'
  | 'MEDIA_FALLBACK'
  | 'NORMAL';

export interface PolicyFlags {
  /** The batch asked "are you a bot?" — guardrail 5's trigger. */
  botQuestion: boolean;
  /** Ops-triage flags for the cool-off alert: a flood that is actually a
   * distressed guest reads differently from abuse (§3.3 "ops alerted"). */
  containsHumanRequest: boolean;
  containsComplaint: boolean;
  /** Batch carries media the model cannot view (mixed-batch situation note). */
  hasMedia: boolean;
}

export interface Directive {
  kind: DirectiveKind;
  flags: PolicyFlags;
  /** Sanitised tail of the guest's text — the ops card must carry the ask
   * ("they have the full picture" must be honest). */
  guestTextTail: string;
}

export interface PolicyInput {
  /** The unprocessed guest batch, oldest first. */
  messages: Message[];
  conversation: Pick<Conversation, 'status' | 'humanActiveUntil'>;
  now: Date;
  overLimit: boolean;
  /** CH-11 stay context, derived ONCE in the worker and passed in — policy.ts
   * stays a pure leaf that never touches the DB. Only ever RAISES urgency
   * (see the COMPLAINT_RE note); defaults keep every existing caller valid. */
  stayContext?: StayContext;
}

/** What the worker knows about this guest's bookings when policy runs. */
export interface StayContext {
  stage: Stage;
  /** A booking exists that we may not describe (cancelled-but-live, multi-room)
   * — a human must look at it. Kept apart from the stage on purpose. */
  needsHuman: boolean;
}

/** The §6.7 pre-model pass. Pure — feed the rate window before calling. */
export function decidePolicy(input: PolicyInput): Directive {
  const texts = input.messages.map((m) => guestTextOf(m)).filter((t): t is string => t !== null);
  const batchText = texts.join('\n');
  const stripped = batchText.replace(BOT_QUESTION_STRIP, ' ');
  const hasLocation = input.messages.some((m) => locationTextOf(m) !== null);
  const flags: PolicyFlags = {
    botQuestion: BOT_QUESTION.test(batchText),
    containsHumanRequest: HUMAN_REQUEST_RES.some((re) => re.test(stripped)),
    containsComplaint: COMPLAINT_RE.test(batchText),
    hasMedia: input.messages.some((m) => m.type !== 'text' && m.type !== 'location'),
  };
  // The WHOLE batch rides the ops card (audit fix: a burst of "what's the
  // rate?" + "call me back" must not drop the rate ask — "they have the full
  // picture" has to be honest). sanitiseTail keeps the newest 200 chars.
  const guestTextTail = sanitiseTail(texts.join(' | '));
  const kind = decideKind(input, flags, batchText, hasLocation);
  return { kind, flags, guestTextTail };
}

function decideKind(
  input: PolicyInput,
  flags: PolicyFlags,
  batchText: string,
  hasLocation: boolean,
): DirectiveKind {
  if (input.overLimit) return 'COOL_OFF';
  if (isHumanActive(input.conversation, input.now)) return 'HUMAN_ACTIVE';
  if (flags.containsHumanRequest) return 'HUMAN_REQUEST';
  if (flags.containsComplaint) return 'COMPLAINT_SUSPECT';
  // Media-only: nothing typed anywhere (no body, no caption) and no location —
  // a captioned photo or a shared pin flows to the model instead (§6.7).
  if (batchText === '' && !hasLocation) return 'MEDIA_FALLBACK';
  return 'NORMAL';
}

/** §6.7 line 1. The TTL wins when present (CH-14's resume reads it); the
 * status column alone counts only while no TTL is set. Dormant until CH-14
 * writes either — but correct now so CH-14 never reopens this file. */
function isHumanActive(
  conversation: Pick<Conversation, 'status' | 'humanActiveUntil'>,
  now: Date,
): boolean {
  if (conversation.humanActiveUntil !== null) {
    return conversation.humanActiveUntil.getTime() > now.getTime();
  }
  return conversation.status === 'human_active';
}

// --- directive settlement (what the worker executes) ---------------------------

export type EscalationReason =
  | 'price'
  | 'human_request'
  | 'complaint'
  | 'media'
  | 'leak'
  | 'promise'
  // The model referred the guest to the team ("let me bring them in") with no
  // escalation planned — the fix is to MAKE the referral true (guardrail 2).
  | 'referral'
  // CH-11: a reference claim was REFUSED (§6.4 "any partial mismatch → escalate
  // for human approval"). Someone quoting a reservation number that is not
  // theirs is precisely the event a human must see — it may be an honest typo,
  // and it may be an identity probe.
  | 'booking_reference'
  // CH-11: the guest holds a booking the AI may not describe (a live
  // cancellation, a multi-room reservation) — the stay view fails closed and a
  // person picks it up.
  | 'booking_undescribable';

/** Phrasebook KEY, not text — policy.ts stays a leaf that never imports
 * prompt.ts (CH-06 cycle lesson); the worker resolves key → PHRASEBOOK. */
export type FixedLine = 'coolOff' | 'humanRequest' | 'mediaFallback';

export interface TurnPlan {
  modelRuns: boolean;
  /** §6.7 complaint flow: injected into block [6]; guardrail 2 asserts the
   * escalation actually happens at pipeline end. */
  mustEscalate: boolean;
  send: FixedLine | null;
  /** Guarded CASE transition riding the claim UPDATE (one atomic statement —
   * a separate status write would reopen the concurrency race). */
  statusTransition: { from: 'ai_active' | 'cooloff'; to: 'ai_active' | 'cooloff' } | null;
  /** True: the send + telemetry fire only when the claim REPORTS the from→to
   * edge — the once-only cool-off line, race-safe under the claim CAS. */
  announceOnTransition: boolean;
  escalate: EscalationReason | null;
  telemetry: PolicyRule | null;
}

const STORE_ONLY: TurnPlan = {
  modelRuns: false,
  mustEscalate: false,
  send: null,
  statusTransition: null,
  announceOnTransition: false,
  escalate: null,
  telemetry: null,
};

/** Maps a directive to the worker's settlement plan (pure). */
export function settlePlanFor(directive: Directive, status: Conversation['status']): TurnPlan {
  // Any processed turn that finds the conversation cooled off and is NOT
  // over-limit restores ai_active in the same claim (the window cleared).
  const restore =
    status === 'cooloff' ? ({ from: 'cooloff', to: 'ai_active' } as const) : null;
  switch (directive.kind) {
    case 'NORMAL':
      return { ...STORE_ONLY, modelRuns: true, statusTransition: restore };
    case 'COMPLAINT_SUSPECT':
      return {
        ...STORE_ONLY,
        modelRuns: true,
        mustEscalate: true,
        statusTransition: restore,
        escalate: 'complaint',
        telemetry: 'complaint_suspect',
      };
    case 'HUMAN_REQUEST':
      return {
        ...STORE_ONLY,
        send: 'humanRequest',
        statusTransition: restore,
        escalate: 'human_request',
        telemetry: 'human_request',
      };
    case 'MEDIA_FALLBACK':
      // TODO(CH-13): replace the interim ops notify with a real frontdesk
      // task (§6.7's "graceful fallback line + frontdesk task").
      return {
        ...STORE_ONLY,
        send: 'mediaFallback',
        statusTransition: restore,
        escalate: 'media',
        telemetry: 'media_fallback',
      };
    case 'HUMAN_ACTIVE':
      // §6.7 line 1: store only; never touch status during a takeover (CH-14).
      return STORE_ONLY;
    case 'COOL_OFF':
      // Over-limit during a takeover or while already cooled off: silent
      // store-only — the one polite line belongs to the ai_active→cooloff edge.
      if (status !== 'ai_active') return STORE_ONLY;
      return {
        ...STORE_ONLY,
        send: 'coolOff',
        statusTransition: { from: 'ai_active', to: 'cooloff' },
        announceOnTransition: true,
        telemetry: 'cool_off',
      };
  }
}
