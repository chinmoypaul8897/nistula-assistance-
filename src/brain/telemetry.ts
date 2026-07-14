/**
 * Guardrail/policy hit telemetry (plan.md §6.5 closing line + CH-07 step 4).
 * Every hit persists to raw_events for the weekly review — the data the CH-16
 * draft-mode quality bar reads. Best-effort by construction (the logCost
 * pattern): telemetry must never block or fail a guest reply.
 *
 * Payload contract (Paul-approved 2026-07-12): the FULL draft text ships in the
 * jsonb payload (§6.5 "logged with the draft"; §3.3 sanctions bodies in
 * Postgres), while log lines carry only ids + draftHash. guestPhone rides
 * along as CH-18's DELETE_GUEST scrub key — the phone-keyed raw_events scrub
 * blanks draft + guestPhone and keeps rule/action/draftHash/details, so
 * aggregate quality history survives erasure.
 */
import { createHash } from 'node:crypto';
import type { Db } from '../db/client.js';
import { insertRawEvent } from '../db/repos.js';
import { summarizeError } from '../lib/logger.js';

export type GuardrailRule =
  | 'price_integrity'
  | 'promise_integrity'
  // CH-11: the draft asserted a booking this guest does not hold.
  | 'stay_integrity'
  // CH-11/OQ-19: the draft named a specific HOUSE as this guest's. eZee only
  // guessed it, so this hit is the one signal that the AI tried to hand a guest
  // a house that may not be theirs — it must be visible in the weekly review.
  | 'unit_integrity'
  | 'negotiation_lock'
  | 'window'
  | 'identity'
  | 'length_format'
  | 'leak_scan';

export type PolicyRule = 'human_request' | 'complaint_suspect' | 'cool_off' | 'media_fallback';

export type HitAction =
  | 'regenerated'
  | 'substituted'
  | 'deferred'
  | 'blocked'
  | 'clamped'
  | 'sent_after_regen'
  | 'routed';

/** One post-model guardrail hit (carries the draft) or pre-model policy hit. */
export interface TelemetryHit {
  kind: 'guardrail' | 'policy';
  rule: GuardrailRule | PolicyRule;
  action: HitAction;
  /** Full draft text — what §6.5's weekly review actually reviews. DB only. */
  draft?: string;
  /** Rule-specific, PII-free extras (unbacked figures, matched patterns…). */
  details?: Record<string, unknown>;
}

export type RecordHit = (hit: TelemetryHit) => Promise<void>;

export interface TelemetryLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
}

/** Short stable digest — the log↔row correlation key (logs never carry bodies, §3.3). */
export function draftHashOf(draft: string): string {
  return createHash('sha256').update(draft, 'utf8').digest('hex').slice(0, 16);
}

/** Binds one conversation's identity into a best-effort raw_events recorder. */
export function createHitRecorder(
  db: Db,
  log: TelemetryLogger,
  ctx: { conversationId: string; guestPhone: string },
): RecordHit {
  return async (hit) => {
    const draftHash = hit.draft === undefined ? undefined : draftHashOf(hit.draft);
    log.info(
      {
        telemetry: hit.kind,
        rule: hit.rule,
        action: hit.action,
        draftHash,
        conversationId: ctx.conversationId,
      },
      'brain telemetry hit',
    );
    try {
      await insertRawEvent(db, {
        source: 'system',
        eventType: hit.kind,
        // WHY true: the processed=false set is CH-18b's webhook re-drive set
        // (CH-02 D6) — a telemetry row must never be re-driven as an event.
        processed: true,
        payload: {
          rule: hit.rule,
          action: hit.action,
          ...(draftHash === undefined ? {} : { draftHash, draft: hit.draft }),
          conversationId: ctx.conversationId,
          guestPhone: ctx.guestPhone,
          details: hit.details ?? {},
        },
      });
    } catch (error) {
      log.warn({ err: summarizeError(error) }, 'telemetry insert failed (telemetry only)');
    }
  };
}
