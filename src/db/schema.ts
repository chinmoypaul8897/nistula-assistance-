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
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
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
export const rawEventSourceEnum = pgEnum('raw_event_source', ['whatsapp', 'ezee']);
// §4 lists four kinds; `anthropic_cache_write` is a CH-04 addition (Paul-approved)
// so CH-17's meter can separate the 1.25x cache-write premium from base input.
export const costEventKindEnum = pgEnum('cost_event_kind', [
  'anthropic_input',
  'anthropic_output',
  'anthropic_cache_read',
  'anthropic_cache_write',
  'wa_template',
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
