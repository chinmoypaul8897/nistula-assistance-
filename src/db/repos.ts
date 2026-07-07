/**
 * Thin typed repositories (plan.md CH-01 step 3). Deliberately boring: each
 * helper is one statement or an upsert-then-read; business logic lives in the
 * feature modules, never here.
 */
import { eq } from 'drizzle-orm';
import type { Db } from './client.js';
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
 */
export async function insertMessage(
  db: Db,
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
