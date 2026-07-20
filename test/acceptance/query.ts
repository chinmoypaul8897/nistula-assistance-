/**
 * CH-19 assertion helpers — small typed reads of what the REAL pipeline
 * produced, shared across the scenario modules. Guest-facing text is asserted
 * off the CAPTURED wire sends (harness.sends); structural outcomes (tasks,
 * scheduled rows, facts) off the DB.
 */
import { and, desc, eq, like } from 'drizzle-orm';
import type { Db } from '../../src/db/client.js';
import * as schema from '../../src/db/schema.js';
import type { CapturedSend, Harness } from './harness.js';

/** Free-form (text) wire sends to a number. */
export function textSendsTo(h: Harness, phone: string): CapturedSend[] {
  return h.sends.filter((s) => s.to === phone && s.type === 'text');
}

/** Template wire sends to a number (lifecycle + closed-window staff cards). */
export function templateSendsTo(h: Harness, phone: string): CapturedSend[] {
  return h.sends.filter((s) => s.to === phone && s.type === 'template');
}

/** Every wire send (any vehicle) to a number. */
export function allSendsTo(h: Harness, phone: string): CapturedSend[] {
  return h.sends.filter((s) => s.to === phone);
}

export async function guestByPhone(db: Db, phone: string) {
  const [g] = await db.select().from(schema.guests).where(eq(schema.guests.phone, phone));
  return g ?? null;
}

/** The AI's outbound reply rows on a guest's thread, newest last. */
export async function aiReplies(db: Db, conversationId: string) {
  return db
    .select()
    .from(schema.messages)
    .where(
      and(
        eq(schema.messages.conversationId, conversationId),
        eq(schema.messages.direction, 'out'),
        eq(schema.messages.sender, 'ai'),
      ),
    )
    .orderBy(schema.messages.createdAt);
}

export async function conversationFor(db: Db, guestId: string) {
  const [c] = await db.select().from(schema.conversations).where(eq(schema.conversations.guestId, guestId));
  return c ?? null;
}

/** Scheduled lifecycle rows whose dedupe key ends in this reference base. */
export async function scheduledForBase(db: Db, base: string) {
  return db
    .select()
    .from(schema.scheduledMessages)
    .where(like(schema.scheduledMessages.dedupeKey, `%:${base}`));
}

export async function tasksAll(db: Db) {
  return db.select().from(schema.tasks).orderBy(desc(schema.tasks.createdAt));
}

export async function factsFor(db: Db, guestId: string) {
  return db.select().from(schema.guestFacts).where(eq(schema.guestFacts.guestId, guestId));
}

/** The `sender:'system'` evidence rows on a thread — the guardrail-2 channel
 * (SLA nudge, DONE closure) that licenses "I've nudged / the team has…". */
export async function systemEvidence(db: Db, conversationId: string) {
  return db
    .select()
    .from(schema.messages)
    .where(and(eq(schema.messages.conversationId, conversationId), eq(schema.messages.sender, 'system')));
}
