/**
 * DELETE_GUEST — the DPDP right-to-erasure action (plan.md §3.3 "an admin
 * DELETE_GUEST action erases a guest's rows"; CH-18 step 1). One guest, one
 * transaction, every column that holds their words or their number.
 *
 * SHAPE = anonymise-in-place, not bottom-up delete. No FK in this schema is
 * ON DELETE CASCADE, and four children hold NOT NULL FKs to guests
 * (conversations, guest_facts, guest_stays, scheduled_messages) — so deleting
 * the guest row would need a fragile bottom-up ordering. Blanking the PII
 * columns keeps referential integrity and matches §3.3's "anonymised" wording.
 *
 * SCOPE — guard by the CONTRACT ("is this the guest's own data?"), verified by
 * the residue-sweep test (no phone/name survives in any in-scope column), never
 * by trusting this list to stay complete:
 *   - IN: guests, conversations, messages, guest_facts, guest_stays,
 *     scheduled_messages, drafts, tasks, reference_attempts, phone_windows, and
 *     raw_events rows sourced 'whatsapp' (the guest's own messages) or 'system'
 *     (telemetry keyed to them).
 *   - OUT, by the schema's stated decision (schema.ts bookings_mirror header):
 *     reservation-keyed data — bookings_mirror AND raw_events source='ezee' (a
 *     poll batch holds many reservations at once) — is controlled by
 *     data-minimisation at the eZee boundary, not by DELETE_GUEST. cost_events
 *     carries no PII.
 *
 * `tasks` are UNLINKED and their body SCRUBBED (not merely "retained unlinked"
 * per §4): summary/detail are the guest's own words and, unlike guest_facts,
 * are deliberately NOT screened for sensitive content (schema.ts tasks header).
 *
 * Full erasure completes as the encrypted backups age out of their 30-day
 * retention (backups land in CH-18a-2); the LIVE database is erased now.
 */
import { and, count, eq, or, sql, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { Db } from './client.js';
import { deleteGuestFacts, getGuestByPhone } from './guestMemory.js';
import { deleteGuestStays, deleteReferenceAttempts } from './stays.js';
import { deletePhoneWindow } from './windows.js';
import {
  conversations,
  drafts,
  guestFacts,
  guestStays,
  guests,
  messages,
  phoneWindows,
  rawEvents,
  referenceAttempts,
  scheduledMessages,
  tasks,
} from './schema.js';

const REDACTED = '[redacted]';
const ERASED = '[erased]';

export interface EraseReport {
  /** uuid, not PII — safe to log/return. The phone is never echoed. */
  guestId: string;
  /** true = counts are what WOULD change; nothing was written. */
  dryRun: boolean;
  /** Rows anonymised/scrubbed/deleted per table (would-change on a dry run). */
  tables: Record<string, number>;
  /** Reservation-keyed / no-PII tables left intact by design. */
  untouched: string[];
}

async function countWhere(db: Db, table: PgTable, where: SQL | undefined): Promise<number> {
  const [row] = await db.select({ n: count() }).from(table).where(where);
  return row?.n ?? 0;
}

/**
 * Recursively redact a webhook payload: replace every occurrence of the guest's
 * phone (in either the '+E.164' or the bare-wire-digits form Meta sends) and
 * blank any message `body`/`caption` (the guest's words). Runs only on rows
 * already matched to this guest, so blanking a body wholesale cannot touch
 * another guest's data unless a single webhook batched them — in which case
 * erring toward MORE erasure of an audit envelope is the safe direction.
 */
export function redactPayload(value: unknown, reps: readonly string[]): unknown {
  if (typeof value === 'string') {
    let out = value;
    for (const rep of reps) if (rep !== '') out = out.split(rep).join(REDACTED);
    return out;
  }
  if (Array.isArray(value)) return value.map((v) => redactPayload(v, reps));
  if (value !== null && typeof value === 'object') {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      obj[k] = k === 'body' || k === 'caption' ? null : redactPayload(v, reps);
    }
    return obj;
  }
  return value;
}

/**
 * Erase one guest by their E.164 phone (already normalised by the caller).
 * `confirm:false` gathers the counts and returns them, touching nothing — the
 * preview an operator sees before committing. Returns null when no such guest
 * exists (so a re-run by the original phone, now tombstoned, is a 404 — the
 * erasure is idempotent from the caller's view).
 */
export async function eraseGuestByPhone(
  db: Db,
  phone: string,
  opts: { confirm: boolean },
): Promise<EraseReport | null> {
  const guest = await getGuestByPhone(db, phone);
  if (guest === null) return null;
  const guestId = guest.id;
  const digits = phone.replace(/[^0-9]/g, '');
  const reps = [phone, digits] as const; // '+E.164' first, then bare wire digits

  const [conv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.guestId, guestId));
  const convId = conv?.id ?? null;
  const taskWhere: SQL | undefined =
    convId === null
      ? eq(tasks.guestId, guestId)
      : or(eq(tasks.guestId, guestId), eq(tasks.conversationId, convId));

  // The guest's own inbound/status webhook rows: phone lives only inside the
  // jsonb, unindexed, so this is a text scan (bounded — low traffic per guest).
  const waRows = [
    ...(await db.execute<{ id: string; payload: unknown }>(
      sql`SELECT id, payload FROM raw_events WHERE source = 'whatsapp' AND payload::text LIKE ${'%' + digits + '%'}`,
    )),
  ];
  const [sysRow] = [
    ...(await db.execute<{ n: number }>(
      sql`SELECT count(*)::int AS n FROM raw_events WHERE source = 'system' AND payload->>'guestPhone' = ${phone}`,
    )),
  ];

  const tables: Record<string, number> = {
    guests: 1,
    conversations: convId === null ? 0 : 1,
    messages: convId === null ? 0 : await countWhere(db, messages, eq(messages.conversationId, convId)),
    guest_facts: await countWhere(db, guestFacts, eq(guestFacts.guestId, guestId)),
    guest_stays: await countWhere(db, guestStays, eq(guestStays.guestId, guestId)),
    scheduled_messages: await countWhere(db, scheduledMessages, eq(scheduledMessages.guestId, guestId)),
    drafts: convId === null ? 0 : await countWhere(db, drafts, eq(drafts.conversationId, convId)),
    tasks: await countWhere(db, tasks, taskWhere),
    reference_attempts: await countWhere(db, referenceAttempts, eq(referenceAttempts.phone, phone)),
    phone_windows: await countWhere(db, phoneWindows, eq(phoneWindows.phone, phone)),
    raw_events_whatsapp: waRows.length,
    raw_events_system: sysRow?.n ?? 0,
  };

  const report: EraseReport = {
    guestId,
    dryRun: !opts.confirm,
    tables,
    untouched: ['bookings_mirror', 'cost_events', 'raw_events(ezee)'],
  };
  if (!opts.confirm) return report;

  await db.transaction(async (tx) => {
    if (convId !== null) {
      await tx
        .update(messages)
        .set({ body: null, raw: null, waMessageId: null, mediaId: null })
        .where(eq(messages.conversationId, convId));
      await tx.update(conversations).set({ summary: null }).where(eq(conversations.id, convId));
      await tx
        .update(drafts)
        .set({
          proposedBody: ERASED,
          finalBody: sql`CASE WHEN ${drafts.finalBody} IS NULL THEN NULL ELSE ${ERASED} END`,
          contextNote: null,
        })
        .where(eq(drafts.conversationId, convId));
    }
    await deleteGuestFacts(tx, guestId);
    await deleteGuestStays(tx, guestId);
    await tx.update(scheduledMessages).set({ params: {} }).where(eq(scheduledMessages.guestId, guestId));
    await tx
      .update(scheduledMessages)
      .set({ status: 'cancelled', skipReason: 'guest_erased' })
      .where(and(eq(scheduledMessages.guestId, guestId), eq(scheduledMessages.status, 'pending')));
    await tx
      .update(tasks)
      .set({ guestId: null, conversationId: null, bookingId: null, summary: ERASED, detail: null })
      .where(taskWhere);
    await deleteReferenceAttempts(tx, phone);
    await deletePhoneWindow(tx, phone);

    for (const row of waRows) {
      await tx
        .update(rawEvents)
        .set({ payload: redactPayload(row.payload, reps) })
        .where(eq(rawEvents.id, row.id));
    }
    // System telemetry: keep the aggregate quality history (rule/action/draftHash/
    // details), blank only the guest-identifying draft + guestPhone (telemetry.ts).
    await tx.execute(
      sql`UPDATE raw_events SET payload = payload || '{"draft":null,"guestPhone":null}'::jsonb WHERE source = 'system' AND payload->>'guestPhone' = ${phone}`,
    );

    // LAST: tombstone the identity root. Phone → a unique non-PII marker (keeps
    // the UNIQUE NOT NULL constraint and makes the guest unfindable by phone);
    // opt_out so a resurrected row could never be marketed.
    await tx
      .update(guests)
      .set({
        phone: `erased:${guestId}`,
        waProfileName: null,
        firstName: null,
        lastName: null,
        notes: null,
        optOutMarketing: true,
      })
      .where(eq(guests.id, guestId));
  });

  return report;
}
