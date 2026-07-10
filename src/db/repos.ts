/**
 * Thin typed repositories (plan.md CH-01 step 3). Deliberately boring: each
 * helper is one statement or an upsert-then-read; business logic lives in the
 * feature modules, never here.
 */
import { and, eq, sql } from 'drizzle-orm';
import type { Db, DbLike } from './client.js';
import { conversations, guests, messages, rawEvents } from './schema.js';

export type Guest = typeof guests.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type RawEvent = typeof rawEvents.$inferSelect;
export type NewRawEvent = typeof rawEvents.$inferInsert;

/** Insert-or-touch a guest by E.164 phone; profile name updates only when provided. */
export async function upsertGuestByPhone(
  db: Db,
  phone: string,
  profileName?: string,
): Promise<Guest> {
  const set =
    profileName === undefined
      ? { updatedAt: new Date() }
      : { waProfileName: profileName, updatedAt: new Date() };
  const [row] = await db
    .insert(guests)
    .values({ phone, waProfileName: profileName })
    .onConflictDoUpdate({ target: guests.phone, set })
    .returning();
  if (row === undefined) throw new Error('guest upsert returned no row');
  return row;
}

/** The guest's single rolling conversation — created on first contact (§4). */
export async function getOrCreateConversation(db: Db, guestId: string): Promise<Conversation> {
  const [created] = await db
    .insert(conversations)
    .values({ guestId })
    .onConflictDoNothing({ target: conversations.guestId })
    .returning();
  if (created !== undefined) return created;
  const [existing] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.guestId, guestId));
  if (existing === undefined) throw new Error(`conversation missing for guest ${guestId}`);
  return existing;
}

/**
 * Stores a message. Meta retries webhooks, so duplicates on wa_message_id
 * must be no-ops (§3.4): returns isNew=false and no row for a duplicate.
 * DbLike: CH-03's worker inserts the send intent inside its claim transaction.
 */
export async function insertMessage(
  db: DbLike,
  message: NewMessage,
): Promise<{ message: Message | null; isNew: boolean }> {
  if (message.waMessageId === undefined || message.waMessageId === null) {
    const [row] = await db.insert(messages).values(message).returning();
    return { message: row ?? null, isNew: true };
  }
  const [row] = await db
    .insert(messages)
    .values(message)
    .onConflictDoNothing({ target: messages.waMessageId })
    .returning();
  return { message: row ?? null, isNew: row !== undefined };
}

/** Audit-trail insert — every webhook payload lands here before parsing (§2.2). */
export async function insertRawEvent(db: Db, event: NewRawEvent): Promise<RawEvent> {
  const [row] = await db.insert(rawEvents).values(event).returning();
  if (row === undefined) throw new Error('raw event insert returned no row');
  return row;
}

/**
 * Closes out a raw event after intake parsing (CH-02 decision D6): processed
 * means "intake parse/persist completed" and nothing more — worker progress
 * lives on conversations.last_processed_message_id (CH-03). error carries
 * exception text only, never payload excerpts (§3.3 PII discipline).
 */
export async function updateRawEvent(
  db: Db,
  id: string,
  patch: { processed: boolean; error: string | null },
): Promise<void> {
  await db.update(rawEvents).set(patch).where(eq(rawEvents.id, id));
}

/**
 * §4 message_status as a monotonic rank lattice (CH-02 decision D3). Meta
 * delivers status webhooks out of order, duplicated (retries up to 7 days),
 * with `delivered` legitimately skippable — a strict state machine breaks.
 * `failed` ranks BELOW delivered/read: Meta documents the same message
 * getting both (multi-device), and delivery evidence must win.
 * `queued` is §3.4's send-intent state (its word `sending` — same thing).
 */
export const MESSAGE_STATUS_RANK = {
  received: 0,
  queued: 1,
  sent: 2,
  failed: 3,
  delivered: 4,
  read: 5,
} as const;

const OUTBOUND_STATUSES = ['sent', 'delivered', 'read', 'failed'] as const;
export type OutboundStatus = (typeof OUTBOUND_STATUSES)[number];

function isOutboundStatus(value: string): value is OutboundStatus {
  return (OUTBOUND_STATUSES as readonly string[]).includes(value);
}

export type StatusUpdateResult =
  | { outcome: 'applied'; messageId: string; conversationId: string | null }
  | { outcome: 'stale'; currentStatus: Message['status'] }
  | { outcome: 'missing' }
  | { outcome: 'unknown_status' };

/**
 * Applies one delivery-status webhook to its outbound message row via a
 * single rank-guarded UPDATE — atomic and race-safe under READ COMMITTED
 * (row lock + predicate re-evaluation), so any interleaving with the
 * client's own queued→sent write converges on the max rank. failed sets
 * `error`; delivered/read clear it (invariant: error non-null ⇔ failed).
 * CH-12's sender and CH-16's dispatch MUST reuse this helper.
 */
export async function applyStatusUpdate(
  db: Db,
  waMessageId: string,
  next: string,
  errorText?: string,
): Promise<StatusUpdateResult> {
  // Unknown strings ('played', future values) are logged no-ops upstream —
  // §5.3 tolerant parsing; raw_events keeps the full payload either way.
  if (!isOutboundStatus(next)) return { outcome: 'unknown_status' };
  const rank = MESSAGE_STATUS_RANK[next];
  const applied = await db
    .update(messages)
    .set({ status: next, error: next === 'failed' ? (errorText ?? null) : null })
    .where(
      and(
        eq(messages.waMessageId, waMessageId),
        // direction guard: a hostile/buggy status citing an INBOUND wa id
        // must never rewrite a guest message row.
        eq(messages.direction, 'out'),
        sql`CASE ${messages.status}
              WHEN 'received' THEN 0 WHEN 'queued' THEN 1 WHEN 'sent' THEN 2
              WHEN 'failed' THEN 3 WHEN 'delivered' THEN 4 WHEN 'read' THEN 5
            END < ${rank}`,
      ),
    )
    .returning({ id: messages.id, conversationId: messages.conversationId });
  const row = applied[0];
  if (row !== undefined) {
    return { outcome: 'applied', messageId: row.id, conversationId: row.conversationId };
  }
  // 0 rows — one classify SELECT: unknown wa id (dashboard hello_world,
  // staff-app sends) vs a stale/duplicate delivery the rank guard absorbed.
  const [existing] = await db
    .select({ status: messages.status })
    .from(messages)
    .where(and(eq(messages.waMessageId, waMessageId), eq(messages.direction, 'out')));
  return existing === undefined
    ? { outcome: 'missing' }
    : { outcome: 'stale', currentStatus: existing.status };
}
