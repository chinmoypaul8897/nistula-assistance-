/**
 * Thin typed repositories (plan.md CH-01 step 3). Deliberately boring: each
 * helper is one statement or an upsert-then-read; business logic lives in the
 * feature modules, never here.
 */
import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import type { Db, DbLike } from './client.js';
import { conversations, costEvents, guests, messages, rawEvents } from './schema.js';

export type Guest = typeof guests.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type RawEvent = typeof rawEvents.$inferSelect;
export type NewRawEvent = typeof rawEvents.$inferInsert;
export type NewCostEvent = typeof costEvents.$inferInsert;

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

/**
 * Creates (or finds) a guest from BOOKING data — CH-12's scheduler, explicitly
 * superseding CH-10's no-auto-creation rule (plan CH-12 step 3).
 *
 * WHY it exists alongside upsertGuestByPhone: a guest who booked on the website
 * has never messaged us, so nobody else would ever create their row — and the
 * name we have is eZee's, not a WhatsApp profile name. The two sources are kept
 * strictly apart: this writes first_name/last_name, and NEVER wa_profile_name,
 * because the WhatsApp pushname is attacker-chosen and §6.4 forbids matching on
 * it. Existing names are not overwritten — a name the guest gave us themselves
 * outranks the one an OTA typed for them.
 */
export async function upsertGuestFromBooking(
  db: DbLike,
  guest: { phone: string; firstName: string | null; lastName: string | null },
): Promise<Guest> {
  const [row] = await db
    .insert(guests)
    .values({ phone: guest.phone, firstName: guest.firstName, lastName: guest.lastName })
    .onConflictDoUpdate({
      target: guests.phone,
      set: {
        firstName: sql`coalesce(${guests.firstName}, excluded.first_name)`,
        lastName: sql`coalesce(${guests.lastName}, excluded.last_name)`,
        updatedAt: new Date(),
      },
    })
    .returning();
  if (row === undefined) throw new Error('guest upsert (from booking) returned no row');
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

// --- CH-03 conversation-cursor repositories --------------------------------

// created_at travels as Postgres TEXT, never a JS Date: timestamptz holds
// MICROSECONDS, Date only milliseconds — a truncated cursor makes the newest
// message match its own "newer than" query and the re-check loops forever
// (caught live by the golden-path test).
export type MessageCursor = { createdAtIso: string; id: string };

/**
 * Resolves the conversation's processed-pointer into a (created_at, id)
 * cursor. dangling=true (pointed-to row missing) means "process all", never
 * "nothing to do" — a scalar subquery here would compare against NULL and
 * silently wedge the conversation while ALSO blinding the sweeper, which
 * shares this resolution (CH-03 review finding).
 */
export async function resolveMessageCursor(
  db: Db,
  messageId: string | null,
): Promise<{ cursor: MessageCursor | null; dangling: boolean }> {
  if (messageId === null) return { cursor: null, dangling: false };
  const [row] = await db
    .select({
      createdAtIso: sql`${messages.createdAt}::text`.mapWith(String),
      id: messages.id,
    })
    .from(messages)
    .where(eq(messages.id, messageId));
  return row === undefined ? { cursor: null, dangling: true } : { cursor: row, dangling: false };
}

/**
 * Guest messages strictly after the cursor, oldest first. (created_at, id)
 * tuple comparison keeps ordering deterministic under equal timestamps.
 */
export async function getUnprocessedGuestMessages(
  db: Db,
  conversationId: string,
  cursor: MessageCursor | null,
): Promise<Message[]> {
  // Text param, not a Date object: raw-sql params skip drizzle's column
  // mapping (a Date crashes postgres.js serialization) and the ::text
  // round-trip keeps the microseconds a JS Date would truncate.
  const afterCursor =
    cursor === null
      ? undefined
      : sql`(${messages.createdAt}, ${messages.id}) > (${cursor.createdAtIso}::timestamptz, ${cursor.id}::uuid)`;
  return db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.direction, 'in'),
        eq(messages.sender, 'guest'),
        afterCursor,
      ),
    )
    .orderBy(messages.createdAt, messages.id);
}

/**
 * The most recent TRANSCRIPT messages of a conversation (guest/ai/human),
 * returned OLDEST-first for the Claude transcript (CH-04). System rows are
 * excluded at the query since CH-08's audit: they never render (mapTranscript
 * skips them) and guardrail-2 evidence has its own query now — fetching them
 * only let them crowd the window's fetch slack (a CH-13 evidence-volume trap).
 * Fetched newest-first with a limit, then reversed — the (created_at, id)
 * tuple keeps ties deterministic.
 */
export async function getRecentMessages(
  db: Db,
  conversationId: string,
  limit = 30,
): Promise<Message[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), ne(messages.sender, 'system')))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(limit);
  return rows.reverse();
}

/** Records token/message spend (CH-04, §5.5). Best-effort caller: telemetry
 * never blocks a reply. No-op on an empty batch. */
export async function insertCostEvents(db: Db, rows: NewCostEvent[]): Promise<void> {
  if (rows.length === 0) return;
  await db.insert(costEvents).values(rows);
}

export type ConversationStatus = Conversation['status'];

export interface ClaimResult {
  claimed: boolean;
  /** The post-claim status (null when the claim lost). CH-07's once-only
   * cool-off line gates on this: announce only when it equals the requested
   * transition's `to`. */
  status: ConversationStatus | null;
}

/**
 * The optimistic turn claim (CH-03 decision D2): pointer + window columns in
 * ONE guarded UPDATE. `claimed: false` means a concurrent run claimed past our
 * read — the caller must NOT send. DbLike: commits in the same transaction as
 * the send-intent row. Window columns derive from the newest guest MESSAGE
 * time, never now() — a sweeper-recovered run must not fabricate a fresh
 * window. CH-07's optional statusTransition rides the SAME statement as a
 * guarded CASE — a separate status write would reopen the concurrency race,
 * and the guard means a cool-off flip can never clobber human_active (CH-14).
 */
export async function claimConversationTurn(
  db: DbLike,
  args: {
    conversationId: string;
    expectedPointer: string | null;
    newPointer: string;
    lastGuestMsgAt: Date;
    statusTransition?: { from: ConversationStatus; to: ConversationStatus };
  },
): Promise<ClaimResult> {
  const transition = args.statusTransition;
  const rows = await db
    .update(conversations)
    .set({
      lastProcessedMessageId: args.newPointer,
      lastGuestMsgAt: args.lastGuestMsgAt,
      serviceWindowExpiresAt: new Date(args.lastGuestMsgAt.getTime() + 24 * 60 * 60 * 1000),
      ...(transition === undefined
        ? {}
        : {
            status: sql`CASE WHEN ${conversations.status} = ${transition.from}::conversation_status THEN ${transition.to}::conversation_status ELSE ${conversations.status} END`,
          }),
    })
    .where(
      and(
        eq(conversations.id, args.conversationId),
        args.expectedPointer === null
          ? isNull(conversations.lastProcessedMessageId)
          : eq(conversations.lastProcessedMessageId, args.expectedPointer),
      ),
    )
    .returning({ id: conversations.id, status: conversations.status });
  const row = rows[0];
  return row === undefined ? { claimed: false, status: null } : { claimed: true, status: row.status };
}

/**
 * Conversation + guest phone/name + DB clock in one read — the worker's turn
 * context. now() from Postgres keeps every debounce age on the DB clock
 * (job eligibility `start_after < now()` is DB-clock too). guestName feeds
 * block [5]-lite (CH-08): a set first name wins over the WA profile name
 * (guest-typed either way — prompt.ts sanitises before rendering).
 */
export async function getConversationTurnContext(
  db: Db,
  conversationId: string,
): Promise<{
  conversation: Conversation;
  guestPhone: string;
  guestName: string | null;
  registerPref: Guest['registerPref'];
  langPref: Guest['langPref'];
  dbNow: Date;
} | null> {
  const [row] = await db
    .select({
      conversation: conversations,
      guestPhone: guests.phone,
      guestFirstName: guests.firstName,
      guestProfileName: guests.waProfileName,
      // Block [5] tone inputs (CH-09) — same joined read, zero extra query.
      registerPref: guests.registerPref,
      langPref: guests.langPref,
      // Raw sql fields bypass the driver's type mapping and arrive as
      // strings (observed on drizzle 0.45 + postgres.js) — map explicitly.
      dbNow: sql`now()`.mapWith((value: unknown) => new Date(value as string)),
    })
    .from(conversations)
    .innerJoin(guests, eq(guests.id, conversations.guestId))
    .where(eq(conversations.id, conversationId));
  if (row === undefined) return null;
  return {
    conversation: row.conversation,
    guestPhone: row.guestPhone,
    guestName: row.guestFirstName ?? row.guestProfileName,
    registerPref: row.registerPref,
    langPref: row.langPref,
    dbNow: row.dbNow,
  };
}

/**
 * Conversations owed a processing pass: oldest unprocessed guest message
 * older than the threshold (CH-03 sweeper). LEFT JOIN on the pointer row
 * makes a dangling pointer degrade to "everything unprocessed" — the same
 * fallback as resolveMessageCursor.
 */
export async function findStaleConversations(
  db: Db,
  olderThanSeconds: number,
): Promise<string[]> {
  const rows = await db.execute<{ id: string }>(sql`
    SELECT c.id
    FROM conversations c
    LEFT JOIN messages p ON p.id = c.last_processed_message_id
    WHERE EXISTS (
      SELECT 1 FROM messages m
      WHERE m.conversation_id = c.id
        AND m.direction = 'in'
        AND m.sender = 'guest'
        AND m.created_at < now() - make_interval(secs => ${olderThanSeconds})
        AND (p.id IS NULL OR (m.created_at, m.id) > (p.created_at, p.id))
    )
  `);
  return [...rows].map((row) => row.id);
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
