/**
 * Drizzle schema — conversation core (plan.md §4, created in CH-01; the
 * CH-03 migration added conversations.last_processed_message_id).
 * Column definitions copy §4 exactly; booking/lifecycle/task tables arrive
 * with their feature chunks. Changes only via committed migrations.
 */
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const registerPrefEnum = pgEnum('register_pref', [
  'warm_first_name',
  'formal_sir_maam',
  'unknown',
]);
export const langPrefEnum = pgEnum('lang_pref', ['en', 'hinglish', 'unknown']);
export const marketingOptInSourceEnum = pgEnum('marketing_opt_in_source', [
  'website_booking',
  'in_chat',
  'imported',
]);
export const conversationStatusEnum = pgEnum('conversation_status', [
  'ai_active',
  'human_active',
  'cooloff',
]);
export const messageDirectionEnum = pgEnum('message_direction', ['in', 'out']);
export const messageSenderEnum = pgEnum('message_sender', ['guest', 'ai', 'human', 'system']);
export const messageTypeEnum = pgEnum('message_type', [
  'text',
  'image',
  'audio',
  'video',
  'document',
  'location',
  'template',
  'interactive',
  'unsupported',
]);
export const messageStatusEnum = pgEnum('message_status', [
  'received',
  'queued',
  'sent',
  'delivered',
  'read',
  'failed',
]);
// 'system' (CH-07, Paul-approved §4 deviation) marks rows WE emit — guardrail
// and policy telemetry now, CH-16's weekly quality report later. event_type
// discriminates ('guardrail' | 'policy' | …). Appended at the END: mid-list
// insertion makes drizzle-kit emit ADD VALUE BEFORE or a type recreate.
export const rawEventSourceEnum = pgEnum('raw_event_source', ['whatsapp', 'ezee', 'system']);
// §4 lists four kinds; `anthropic_cache_write` is a CH-04 addition (Paul-approved)
// so CH-17's meter can separate the 1.25x cache-write premium from base input.
export const costEventKindEnum = pgEnum('cost_event_kind', [
  'anthropic_input',
  'anthropic_output',
  'anthropic_cache_read',
  'anthropic_cache_write',
  'wa_template',
]);
export const guestFactKindEnum = pgEnum('guest_fact_kind', [
  'preference',
  'past_issue',
  'context',
  'celebration',
]);
// §4 bookings_mirror status vocabulary, exactly as listed. 'modified' is an
// event verb stored as a state — a Modify payload flips a live booking to it;
// CurrentStatus (when present) restores the real state. CH-11's "active stay"
// logic must treat confirmed|modified|checked_in as live.
export const bookingStatusEnum = pgEnum('booking_status', [
  'confirmed',
  'modified',
  'cancelled',
  'no_show',
  'checked_in',
  'checked_out',
  'unknown',
]);
// Named guest_stay_matched_by (not a bare matched_by) — pg enum types share
// one namespace and a generic name would collide with a later table's.
export const guestStayMatchedByEnum = pgEnum('guest_stay_matched_by', [
  'phone',
  'reference_in_chat',
  'manual',
]);

// §4 preamble: every table gets uuid pk + created_at/updated_at timestamptz.
// $onUpdate keeps updated_at honest on every future drizzle UPDATE without
// each call site remembering to set it (client-side, no migration needed).
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

/** One row per WhatsApp number; phone is always E.164 via lib/phone.ts. */
export const guests = pgTable('guests', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').notNull().unique(),
  waProfileName: text('wa_profile_name'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  registerPref: registerPrefEnum('register_pref').notNull().default('unknown'),
  langPref: langPrefEnum('lang_pref').notNull().default('unknown'),
  marketingOptIn: boolean('marketing_opt_in').notNull().default(false),
  marketingOptInSource: marketingOptInSourceEnum('marketing_opt_in_source'),
  marketingOptInAt: timestamp('marketing_opt_in_at', { withTimezone: true }),
  notes: text('notes'),
  ...timestamps,
});

/** One rolling conversation per guest — a state container, not a session (§4). */
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  guestId: uuid('guest_id')
    .notNull()
    .unique()
    .references(() => guests.id),
  status: conversationStatusEnum('status').notNull().default('ai_active'),
  humanActiveUntil: timestamp('human_active_until', { withTimezone: true }),
  lastGuestMsgAt: timestamp('last_guest_msg_at', { withTimezone: true }),
  serviceWindowExpiresAt: timestamp('service_window_expires_at', { withTimezone: true }),
  degradedNotified: boolean('degraded_notified').notNull().default(false),
  summary: text('summary'),
  summaryUptoMessageId: uuid('summary_upto_message_id'),
  // WHY no FK on either message pointer: they are cursors, not relations —
  // §4 marks fks explicitly and deliberately omits them on all three
  // message-id pointers. A missing pointed-to row is handled in code
  // (resolveMessageCursor treats it as "process all"), never by constraint.
  lastProcessedMessageId: uuid('last_processed_message_id'),
  ...timestamps,
});

/** Every message in or out, any sender. conversation_id NULLABLE per §4 —
 * sends to staff/ops numbers are not guest conversations. */
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').references(() => conversations.id),
    waMessageId: text('wa_message_id').unique(), // nullable for internal sends
    direction: messageDirectionEnum('direction').notNull(),
    sender: messageSenderEnum('sender').notNull(),
    type: messageTypeEnum('type').notNull(),
    body: text('body'),
    mediaId: text('media_id'),
    templateName: text('template_name'),
    status: messageStatusEnum('status').notNull(),
    error: text('error'),
    raw: jsonb('raw'),
    ...timestamps,
  },
  (table) => [
    // §4 index list: transcript reads walk a conversation in time order.
    index('messages_conversation_created_idx').on(table.conversationId, table.createdAt),
  ],
);

/** Token + message spend meter (§4). One row per non-zero usage bucket per
 * AI call; `day` is the IST business day for the CH-17 daily rollup. quantity
 * and inr_estimate are numeric (drizzle maps them to strings). */
export const costEvents = pgTable('cost_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  day: date('day').notNull(),
  kind: costEventKindEnum('kind').notNull(),
  quantity: numeric('quantity').notNull(),
  inrEstimate: numeric('inr_estimate').notNull(),
  ...timestamps,
});

/** Every webhook payload as received — audit + replay (§4). */
export const rawEvents = pgTable('raw_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: rawEventSourceEnum('source').notNull(),
  eventType: text('event_type'),
  payload: jsonb('payload').notNull(),
  processed: boolean('processed').notNull().default(false),
  error: text('error'),
  ...timestamps,
});

/**
 * Everything eZee knows, refreshed by the 60s poller (§4, CH-10). Typed
 * columns are TOLERANT — eZee omits/empties fields freely and the poller must
 * never crash (§5.2), and cancel tombstones carry only a reservation number —
 * so only the key, status, raw and synced_at are NOT NULL (recorded §4
 * clarification). raw holds the reservation payload with CC/identity fields
 * stripped at the client boundary: mirror rows are reservation-keyed and sit
 * OUTSIDE CH-18's DELETE_GUEST path, so data minimisation is the only control.
 */
export const bookingsMirror = pgTable(
  'bookings_mirror',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Reservation-level UniqueID verbatim — may be alphanumeric ("B4525"). */
    ezeeReservationNo: text('ezee_reservation_no').notNull().unique(),
    /** First BookingTran's TransactionId; multi-tran → ops note, raw has all. */
    ezeeBookingTranId: text('ezee_booking_tran_id'),
    guestName: text('guest_name'),
    /** E.164 via lib/phone or null — OTA numbers can be masked (§4). */
    guestPhone: text('guest_phone'),
    guestEmail: text('guest_email'),
    // eZee INT(20) ids are 19-digit strings that overflow JS numbers — text.
    roomTypeId: text('room_type_id'),
    roomTypeName: text('room_type_name'),
    physicalRoomLabel: text('physical_room_label'),
    rateplanId: text('rateplan_id'),
    // 'yyyy-mm-dd' strings end to end (mode 'string'): a Date round-trip can
    // shift the IST calendar day — never new Date() an eZee date.
    checkIn: date('check_in', { mode: 'string' }),
    checkOut: date('check_out', { mode: 'string' }),
    adults: integer('adults'),
    children: integer('children'),
    status: bookingStatusEnum('status').notNull(),
    source: text('source'),
    // numeric WITHOUT precision preserves eZee's own scale ('976.00' round-
    // trips untouched; (19,4) would rewrite it '976.0000'). drizzle maps
    // numeric to string — the amount stays verbatim, never computed (§3.4).
    amount: numeric('amount'),
    currency: text('currency'),
    raw: jsonb('raw').notNull(),
    syncedAt: timestamp('synced_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    // §4 index list: guest linking walks by phone, lifecycle by check-in.
    index('bookings_mirror_guest_phone_idx').on(table.guestPhone),
    index('bookings_mirror_check_in_idx').on(table.checkIn),
  ],
);

/** Outcome of a reference claim (CH-11). `refused` covers EVERY failure —
 * unknown reference, wrong name, wrong date, undescribable booking, locked out
 * — because the guest-facing value must be indistinguishable across all of
 * them (an oracle would leak which reservation numbers exist). The distinction
 * lives here, in the ops trail, and nowhere the guest can see. */
export const referenceAttemptOutcomeEnum = pgEnum('reference_attempt_outcome', [
  'linked',
  'refused',
]);

/** Link table guest↔booking (§4, CH-10) — phone match now; reference_in_chat
 * and manual arrive with CH-11/admin. Real relations, so real FKs.
 * TODO(CH-18): DELETE_GUEST must erase a guest's rows here (guest-keyed). */
export const guestStays = pgTable(
  'guest_stays',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookingsMirror.id),
    matchedBy: guestStayMatchedByEnum('matched_by').notNull(),
    ...timestamps,
  },
  (table) => [
    // Idempotent re-poll linking: the second phone-match insert is a no-op
    // (§4 addition, recorded in progress.md — the plan lists no unique here).
    unique('guest_stays_guest_booking_unique').on(table.guestId, table.bookingId),
  ],
);

/** Long-term memory, structured (§4, CH-09) — one durable service-relevant
 * fact per row, saved sparingly via remember_fact. Content is screened at
 * save time (factScreens.ts) and rendered as untrusted DATA in block [5].
 * TODO(CH-18): DELETE_GUEST erases a guest's rows here (deleteGuestFacts). */
export const guestFacts = pgTable(
  'guest_facts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id),
    kind: guestFactKindEnum('kind').notNull(),
    content: text('content').notNull(),
    // WHY no FK: a message-id cursor per the §4 convention (see the
    // conversations pointer note) — provenance, never a relation.
    sourceMessageId: uuid('source_message_id'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    // Profile-block reads walk one guest's facts newest-first (§4 addition,
    // recorded in progress.md — plan lists no index for this table).
    index('guest_facts_guest_created_idx').on(table.guestId, table.createdAt),
  ],
);

/**
 * Reference-claim attempts (CH-11, §6.4 get_booking: "3 failed reference
 * attempts/day → hard escalate + polite refusal"). §4 lists no table for this
 * — recorded addition, Paul-approved.
 *
 * WHY Postgres and not the in-memory window CH-07's cool-off uses: that one
 * guards politeness, this one guards ANOTHER GUEST'S BOOKING. We redeploy on
 * every merge to main, and a process restart would hand an attacker a fresh
 * three guesses at reservation numbers that are short and near-sequential on
 * this property (877, 894, 952, 953 are all real). A security counter may not
 * evaporate on deploy.
 *
 * Keyed by PHONE, not guest id: the phone is the identity an attacker must
 * actually control, and it survives a guest row being erased (CH-18).
 * Successful claims are logged too — the ops trail for "who linked what".
 */
export const referenceAttempts = pgTable(
  'reference_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** E.164, normalised — the claimant, not the booking's owner. */
    phone: text('phone').notNull(),
    /** What they claimed. Stored for the ops trail; never echoed to a guest. */
    claimedReference: text('claimed_reference').notNull(),
    outcome: referenceAttemptOutcomeEnum('outcome').notNull(),
    ...timestamps,
  },
  (table) => [
    // The rolling-24h count walks one phone's recent rows.
    index('reference_attempts_phone_created_idx').on(table.phone, table.createdAt),
  ],
);

/** §4 scheduled_messages vocabulary. `lead_followup` is CH-15's; CH-12 defines
 * it so the enum never needs a second migration. */
export const scheduledMessageKindEnum = pgEnum('scheduled_message_kind', [
  'confirmation',
  'prearrival',
  'welcome',
  'poststay',
  'winback',
  'lead_followup',
]);
export const scheduledMessageStatusEnum = pgEnum('scheduled_message_status', [
  'pending',
  'sent',
  'skipped',
  'cancelled',
  'failed',
]);

/**
 * Lifecycle + follow-up sends (§4, CH-12). A row is an INTENTION, never a
 * promise: the sender re-reads bookings_mirror at send time and skips anything
 * that stopped being true (§3.4 — the mirror is the truth, the schedule is a
 * plan). That is why a cancelled booking is safe even if its cancel event were
 * somehow missed.
 *
 * WHY no 'sending' state (the §4 enum has none): the send-intent pattern puts
 * the atomicity on the MESSAGE row, not here. The sender flips pending→sent and
 * writes the 'queued' message row in ONE transaction, committed BEFORE the
 * Graph call — so a crash mid-send leaves a 'queued' message (CH-17's stale
 * sweep reconciles it) and never a second send. The `WHERE status='pending'`
 * guard on that flip is what makes concurrent senders safe.
 */
export const scheduledMessages = pgTable(
  'scheduled_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id),
    bookingId: uuid('booking_id').references(() => bookingsMirror.id),
    kind: scheduledMessageKindEnum('kind').notNull(),
    templateName: text('template_name').notNull(),
    /** Rendered template params — villa TYPE only, never a house (OQ-19), and
     * never a ₹ figure (§3.4 money rule). */
    params: jsonb('params').notNull(),
    /** The PLANNED moment (§2.3). Immutable except on a genuine reschedule — the
     * staleness guard measures against it, so backoff must NOT live here. */
    sendAt: timestamp('send_at', { withTimezone: true }).notNull(),
    /** Backoff clock, separate from send_at (CH-12 review fix): a transient defer
     * (window shut, a human holding the thread, a Meta 429) parks the row here so
     * it leaves the due batch without moving its planned time — otherwise the
     * 36h stale guard, which reads send_at, could never fire for a row that
     * actually waited. Null once it is genuinely due. */
    deferredUntil: timestamp('deferred_until', { withTimezone: true }),
    status: scheduledMessageStatusEnum('status').notNull().default('pending'),
    /** `${kind}:${referenceBase(reservationNo)}` — the idempotency key. A modify
     * UPDATEs send_at through this while still pending; it never duplicates. */
    dedupeKey: text('dedupe_key').notNull().unique(),
    /** WHY no FK: a message-id cursor per the §4 convention (see conversations). */
    sentMessageId: uuid('sent_message_id'),
    /** §4 addition (recorded): a `skipped` row with no reason is unauditable,
     * and CH-14b's morning digest has to explain itself to a human. */
    skipReason: text('skip_reason'),
    ...timestamps,
  },
  (table) => [
    // §4 index list: the minutely sender scans due pending rows.
    index('scheduled_messages_status_send_at_idx').on(table.status, table.sendAt),
  ],
);

/** §4 tasks vocabulary. `night_queue` and `escalation` are CH-14's; CH-13a
 * defines them so the enum never needs a second migration (the CH-12
 * `lead_followup` precedent). */
export const taskKindEnum = pgEnum('task_kind', [
  'housekeeping',
  'maintenance',
  'frontdesk',
  'escalation',
  'night_queue',
]);

/**
 * §4 lists open/nudged/done/cancelled. `notify_failed` is a CH-13a ADDITION
 * (recorded): a card that never reached a human is neither `open` (nobody is
 * looking at it) nor `done`. It has to be its own fact, because it is the state
 * guardrail 2 keys off — the AI may not say "the team has been informed" about
 * a task nobody received. Without it the SLA nudger would also chase a task no
 * human has ever seen, which is not a nudge, it is noise.
 */
export const taskStatusEnum = pgEnum('task_status', [
  'open',
  'nudged',
  'done',
  'cancelled',
  'notify_failed',
]);

/**
 * Staff work items (§4, CH-13a) — the AI's hands.
 *
 * WHY `villa_label` is nullable and carries no default: it is resolved at task
 * time from a FRESH BKG-03 `tran.RoomID` read (staff/villaRoute.ts), NEVER from
 * `bookings_mirror.physical_room_label` (a snapshot frozen at CH-11's 14 Jul
 * reconcile — only BKG-03 carries a room, the poller never does) and NEVER from
 * a model argument (plan §6.4, decided 2026-07-16 — a model-supplied villa is
 * the model guessing a house, and its likeliest source is the guest's own
 * guess). Null means "we could not establish the physical door" — the card then
 * names the villa TYPE and routes to the frontdesk lead. It is deliberately NOT
 * an error: eZee flaps, and a task must never fail because of it.
 *
 * WHY the villa is stored at all rather than re-read: this column is the record
 * of where we ACTUALLY sent someone, which is an audit fact. Re-reading it later
 * would answer a different question (where eZee thinks they are NOW).
 *
 * 🚨 TODO(CH-18): DELETE_GUEST must reach `summary`/`detail` here, and this is
 * NOT the same erasure as guest_facts'. §4 says "tasks retained unlinked", which
 * was written when a task was assumed to be a bare work item — but `summary` is
 * the GUEST'S OWN WORDS, and it is deliberately NOT screened for sensitive
 * content the way guest_facts is (factScreens refuses "allergic to shellfish";
 * this column would hold it). That is a considered decision, not an oversight —
 * the two predicates differ: guest_facts asks "may we REMEMBER this for ever?",
 * a task asks "does a human need this to do the work NOW?", and a screen here
 * would refuse a wheelchair-ramp request, which is the opposite of safe. But it
 * means unlinking a task is not erasing it: the body must be scrubbed, exactly
 * as CH-07's telemetry payloads are. See progress.md CH-13a's open questions.
 */
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').references(() => conversations.id),
    guestId: uuid('guest_id').references(() => guests.id),
    bookingId: uuid('booking_id').references(() => bookingsMirror.id),
    /** The physical door as eZee reported it AT TASK TIME, or the villa TYPE
     * when we could not resolve one. Never a guest's or a model's claim. */
    villaLabel: text('villa_label'),
    kind: taskKindEnum('kind').notNull(),
    /** 6-char base32, unique — the id a human types back as `DONE <id>`. */
    shortId: text('short_id').notNull().unique(),
    summary: text('summary').notNull(),
    detail: text('detail'),
    status: taskStatusEnum('status').notNull().default('open'),
    assignedPhone: text('assigned_phone'),
    slaMinutes: integer('sla_minutes').notNull(),
    slaDeadline: timestamp('sla_deadline', { withTimezone: true }).notNull(),
    openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    /** E.164 of the staff member who typed DONE — not a name, so it survives a
     * roster edit and stays matchable normalised-vs-normalised (§3.3). */
    closedBy: text('closed_by'),
    ...timestamps,
  },
  (table) => [
    // §4 index list: the 5-minutely nudger scans overdue open tasks.
    index('tasks_status_sla_deadline_idx').on(table.status, table.slaDeadline),
    // Block [5] renders a guest's open tasks on every turn.
    index('tasks_guest_status_idx').on(table.guestId, table.status),
  ],
);

/**
 * 24h-window tracking for NON-guest numbers — staff and ops (§4, §5.3). Guest
 * windows live on conversations.service_window_expires_at; these numbers have
 * no conversation, but Meta's 24h rule applies to them exactly the same, so a
 * task card or digest sent to a cold staff number must go as a template.
 * Written on EVERY inbound (a number may be both a guest and on the roster);
 * read only for sends with conversation_id = null.
 */
export const phoneWindows = pgTable('phone_windows', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').notNull().unique(),
  lastInboundAt: timestamp('last_inbound_at', { withTimezone: true }).notNull(),
  ...timestamps,
});
