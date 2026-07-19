/**
 * CH-18b coexistence history import (plan §8 CH-18 step 5, §5.3). After the
 * number is onboarded to coexistence, Meta delivers its PAST WhatsApp threads on
 * the `history` field (and possibly `smb_app_state_sync`), in chunks. This stores
 * them idempotently and links them to guests by phone.
 *
 * A history message is an OLD message, not a live turn — and that is the whole
 * design. FIVE contract guards, every one load-bearing:
 *   1. NEVER wakes the brain worker — we do not enqueue a conversation. These are
 *      threads to remember, not messages to answer.
 *   2. Preserves the message's OWN timestamp; a message with no usable timestamp
 *      is SKIPPED, never stamped now() (unlike the live `inboundTimestamp`). A
 *      "now" history row would masquerade as live and slide into the transcript
 *      window, and its 24h implications would be wrong.
 *   3. NEVER touches a phone window — importing months-old history must not
 *      re-open a 24h window Meta itself closed, or the next free-form send 131047s.
 *   4. Roster SKIP — a thread with a staff/ops number never grows a guest thread
 *      (§3.3 roster-wins, the same rule the echo + inbound paths hold).
 *   5. Dedupe on wa_message_id — chunks arrive repeated and out of order; every
 *      insert is idempotent so a re-run is a no-op.
 *
 * Direction is read from the thread, not invented: a thread's `id` IS the
 * contact's wa_id, so a message whose `from` matches it is the guest's ('in' /
 * 'guest'); anything else was sent from the business line ('out' / 'human' — the
 * pre-coexistence app history is all human-typed). PROVISIONAL shapes (§5.3):
 * parsed tolerantly, re-verified at the cutover smoke; an unrecognised shape
 * yields zero threads, never a throw.
 */
import type { Db } from '../db/client.js';
import {
  getOrCreateConversation,
  insertMessage,
  markConversationHistoryProcessed,
  upsertGuestByPhone,
  type NewMessage,
} from '../db/repos.js';
import { resetSummaryIfBackfilledBehind } from '../db/summaries.js';
import { summarizeError } from '../lib/logger.js';
import { normalizePhone } from '../lib/phone.js';
import { mapInboundType, mediaIdOf } from './messageShape.js';
import type { WaInboundMessage, WaValue } from './types.js';

/** The object-first slice of the app logger this module uses (the jobs worker's
 * TurnLogger satisfies it). Ids only ever — never a phone or a body (§3.3). */
interface ImportLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
}

export interface HistoryImportDeps {
  db: Db;
  log: ImportLogger;
  /** Roster-wins: a thread with a staff/ops number is skipped. Absent ⇒ no
   * roster is configured (dev/test) and every thread imports as a guest. */
  isStaffPhone?: (phone: string) => boolean;
  /** CH-08 backfill: compact each imported thread into its rolling summary.
   * Absent ⇒ import only; the nightly 04:00 pass still catches an idle thread. */
  enqueueSummarise?: (conversationId: string) => Promise<void>;
}

export interface HistoryImportReport {
  threads: number;
  importedMessages: number;
  duplicateMessages: number;
  skippedThreads: number;
  skippedMessages: number;
  conversationsTouched: number;
}

interface ImportRow {
  waMessageId: string;
  direction: NewMessage['direction'];
  sender: NewMessage['sender'];
  type: NewMessage['type'];
  body: string | null;
  mediaId: string | null;
  status: NewMessage['status'];
  createdAt: Date;
  raw: unknown;
}

/**
 * Imports one `history` (or `smb_app_state_sync`) webhook value. Idempotent and
 * non-transactional: each message insert dedupes on its own, so a partial run
 * (or a pg-boss retry) simply re-imports what is missing.
 */
export async function importHistory(
  deps: HistoryImportDeps,
  value: WaValue,
): Promise<HistoryImportReport> {
  const report: HistoryImportReport = {
    threads: 0,
    importedMessages: 0,
    duplicateMessages: 0,
    skippedThreads: 0,
    skippedMessages: 0,
    conversationsTouched: 0,
  };
  const touched = new Set<string>();
  // The oldest NEWLY-inserted history time per conversation — so the summary
  // backfill can rewind a cursor a later out-of-order chunk landed messages behind.
  const oldestNew = new Map<string, Date>();
  const nowMs = Date.now();
  const chunks = Array.isArray(value.history) ? value.history : [];
  for (const chunk of chunks) {
    const threads = Array.isArray(chunk?.threads) ? chunk.threads : [];
    for (const thread of threads) {
      report.threads += 1;
      const contactPhone = typeof thread?.id === 'string' ? normalizePhone(thread.id) : null;
      if (contactPhone === null) {
        report.skippedThreads += 1;
        deps.log.info({}, 'history thread has no normalisable contact — skipped, raw stored');
        continue;
      }
      if (deps.isStaffPhone?.(contactPhone) === true) {
        report.skippedThreads += 1;
        deps.log.info({}, 'history thread is a roster/ops number — skipped (roster wins §3.3)');
        continue;
      }

      // Parse EVERY message to an importable row BEFORE creating any guest — a
      // declined-consent / empty thread (no usable messages) must not conjure an
      // empty guest row.
      const messages = Array.isArray(thread?.messages) ? thread.messages : [];
      const rows: ImportRow[] = [];
      for (const message of messages) {
        const row = toImportRow(message, contactPhone, nowMs);
        if (row === null) report.skippedMessages += 1;
        else rows.push(row);
      }
      if (rows.length === 0) {
        report.skippedThreads += 1;
        continue;
      }

      // Guard 4 already passed (not a roster number). Link by phone (§8 step 5).
      // Array.isArray like every other read of this PROVISIONAL value — a non-array
      // `contacts` (`{}`, a string) must not throw `.find is not a function`.
      const contacts = Array.isArray(value.contacts) ? value.contacts : [];
      const profileName =
        typeof thread.id === 'string'
          ? contacts.find((c) => c.wa_id === thread.id)?.profile?.name
          : undefined;
      const guest = await upsertGuestByPhone(deps.db, contactPhone, profileName);
      const conversation = await getOrCreateConversation(deps.db, guest.id);
      // The newest imported time for the thread (new OR duplicate) — the anchor
      // for the cursor advance below; computed from `rows`, not from what THIS run
      // inserted, so a redelivery whose rows are all duplicates still anchors.
      let newestImportedAt = rows[0]!.createdAt;
      let newInThread = 0;
      for (const row of rows) {
        if (row.createdAt > newestImportedAt) newestImportedAt = row.createdAt;
        const { isNew } = await insertMessage(deps.db, {
          conversationId: conversation.id,
          waMessageId: row.waMessageId,
          direction: row.direction,
          sender: row.sender,
          type: row.type,
          body: row.body,
          mediaId: row.mediaId,
          status: row.status,
          raw: row.raw,
          // Guard 2: the message's OWN historical time, never our receipt time.
          createdAt: row.createdAt,
        });
        if (isNew) {
          report.importedMessages += 1;
          newInThread += 1;
          const prev = oldestNew.get(conversation.id);
          if (prev === undefined || row.createdAt < prev) oldestNew.set(conversation.id, row.createdAt);
        } else {
          report.duplicateMessages += 1;
        }
      }
      // GUARD 1 — the SIBLING path. Mark imported history as ALREADY PROCESSED so
      // the always-on every-2-min stale-conversation sweeper never wakes the brain
      // on it (a history message is to remember, not to answer). ALWAYS (not gated
      // on "did I insert new rows?"): a crash / job-expiry redelivery whose rows are
      // now all duplicates must STILL advance the cursor, or it stays null and the
      // sweeper wakes the brain. Forward-only + an OLD anchor keep a live cursor put.
      await markConversationHistoryProcessed(deps.db, conversation.id, newestImportedAt);
      // Only re-summarise a thread that actually gained messages — an all-duplicate
      // redelivery buys no model call.
      if (newInThread > 0) touched.add(conversation.id);
    }
  }

  report.conversationsTouched = touched.size;
  // Backfill LAST, once per touched conversation: the summariser is idempotent and
  // bounded, so re-runs across chunks are cheap. A failed enqueue is swallowed —
  // the nightly pass is the recovery net, exactly as the on-demand path treats it.
  if (deps.enqueueSummarise !== undefined) {
    for (const conversationId of touched) {
      try {
        // Dedupe keeps the MESSAGES table order-safe, but the summariser cursor is
        // FORWARD-ONLY: a chunk that lands messages OLDER than an already-advanced
        // cursor (out-of-order delivery across jobs) would leave them deemed
        // "covered" yet never compacted. Rewind the cursor so the next pass
        // re-covers from the earliest row. (KNOWN MINOR RESIDUAL, progress.md:
        // if the cursor is still NULL because a first summarise is mid model-call
        // when the older chunk lands, this reset no-ops and that one message can be
        // orphaned from the summary — a one-time-import, non-guest-facing gap; the
        // robust fix is a summariser generation guard, deferred.)
        const oldest = oldestNew.get(conversationId);
        if (oldest !== undefined) {
          await resetSummaryIfBackfilledBehind(deps.db, conversationId, oldest);
        }
        await deps.enqueueSummarise(conversationId);
      } catch (error) {
        deps.log.warn(
          { conversationId, err: summarizeError(error) },
          'history summary backfill enqueue failed — nightly pass will recover',
        );
      }
    }
  }
  return report;
}

/**
 * A history message → an importable row, or null to SKIP. Skips (never a throw,
 * never a fallback) protect the guards: no id ⇒ no dedupe key; no usable
 * timestamp ⇒ guard 2 (never stamp now()); no normalisable `from` ⇒ direction is
 * unknowable and a misattributed row would corrupt the summary and erasure match.
 */
function toImportRow(message: WaInboundMessage, contactPhone: string, nowMs: number): ImportRow | null {
  const waMessageId = typeof message?.id === 'string' ? message.id : null;
  if (waMessageId === null) return null;
  const createdAt = historyTimestamp(message?.timestamp, nowMs);
  if (createdAt === null) return null;
  const from = typeof message?.from === 'string' ? normalizePhone(message.from) : null;
  if (from === null) return null;
  const isGuest = from === contactPhone;
  return {
    waMessageId,
    direction: isGuest ? 'in' : 'out',
    // Pre-coexistence business sends were all human-typed (the AI did not run on
    // this number then); a guest send is the guest's.
    sender: isGuest ? 'guest' : 'human',
    type: mapInboundType(message.type),
    // Match the live intake: only text bodies land in `body`; a media caption
    // stays in `raw` (wa/webhook.ts handleInbound does the same).
    body: message.text?.body ?? null,
    mediaId: mediaIdOf(message),
    status: isGuest ? 'received' : 'sent',
    createdAt,
    raw: message,
  };
}

// A real WhatsApp history timestamp is unix SECONDS on or after 2000-01-01.
const MIN_HISTORY_MS = 946_684_800_000;

/**
 * STRICT unix-seconds parse — unlike `inboundTimestamp`, which falls back to
 * now(). Returns null (⇒ a guard-2 SKIP, never a throw, never a stored row) for
 * anything that is not a plausible past history time. The bound is load-bearing:
 * without it a WRONG-UNIT value (ms/µs — the classic seconds-vs-ms slip) either
 * overflows to an Invalid Date whose insert THROWS and poisons the whole batch,
 * or (for ~1.7e12 ms) stores a valid row dated ~year 57000 that sorts as the
 * NEWEST message and poisons the transcript window. A future time is not history.
 */
function historyTimestamp(raw: string | undefined, nowMs: number): Date | null {
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const ms = seconds * 1000;
  if (!Number.isFinite(ms) || ms < MIN_HISTORY_MS || ms > nowMs) return null;
  return new Date(ms);
}
