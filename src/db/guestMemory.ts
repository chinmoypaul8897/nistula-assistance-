/**
 * Long-term memory repositories (CH-09) — guest_facts plus the first
 * guests.register_pref/lang_pref writers. Split from repos.ts per the
 * ~300-line rule (summaries.ts precedent). Deliberately boring: the guarded
 * insert owns dedupe + cap-eviction so every save path shares one policy;
 * content SCREENING lives in brain/factScreens.ts, never here.
 *
 * Time: expiry comparisons use the DB clock (now()) — the CH-03 doctrine;
 * no JS Date ever rides a raw sql fragment (postgres.js serialization trap).
 */
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Db } from './client.js';
import { guestFacts, guests } from './schema.js';
import type { Guest } from './repos.js';

export type GuestFact = typeof guestFacts.$inferSelect;
export type GuestFactKind = GuestFact['kind'];

/** §8 CH-09 security: facts capped per guest — oldest low-value evicted. */
export const FACTS_PER_GUEST_CAP = 50;
/** Block [5] renders at most this many facts (plan step 3). */
export const PROFILE_FACTS_LIMIT = 15;

// Eviction priority when the cap bites ("oldest low-value" made concrete,
// recorded in progress.md): expired rows go first, then by kind — context is
// cheapest to lose; past issues and celebrations are the service moat.
const KIND_EVICTION_PRIORITY = sql`CASE ${guestFacts.kind}
  WHEN 'context' THEN 0
  WHEN 'preference' THEN 1
  WHEN 'celebration' THEN 2
  ELSE 3 END`;

const notExpired = sql`(${guestFacts.expiresAt} IS NULL OR ${guestFacts.expiresAt} > now())`;

/** Lowercases and strips everything but letters/digits so trivial rewording
 * ("Loved the early check-in!" vs "loved the early check in") compares equal. */
export function normaliseFactContent(content: string): string {
  return content
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Naive similarity per the plan's letter ("naive normalised-string similarity
 * is fine"): equal or one-contains-other always match; the word-overlap arm
 * (|A∩B| / min ≥ 0.8) only fires when BOTH sides have ≥4 UNIQUE tokens, so
 * short facts must match exactly rather than colliding on one shared word.
 * Containment is TOKEN-BOUNDARY (audit fix): raw substring made 'loved villa
 * B' swallow 'loved villa B3' — unit labels are this product's vocabulary,
 * and a swallowed save is then C4-licensed as "on file" when it is not.
 */
export function isSimilarFact(a: string, b: string): boolean {
  const na = normaliseFactContent(a);
  const nb = normaliseFactContent(b);
  if (na.length === 0 || nb.length === 0) return na === nb;
  if (na === nb || ` ${na} `.includes(` ${nb} `) || ` ${nb} `.includes(` ${na} `)) return true;
  const setA = new Set(na.split(' '));
  const setB = new Set(nb.split(' '));
  // Audit fix: the floor counts UNIQUE tokens — an array-length floor let
  // "tea tea tea tea" ride the overlap arm with a one-token set.
  if (setA.size < 4 || setB.size < 4) return false;
  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared += 1;
  return shared / Math.min(setA.size, setB.size) >= 0.8;
}

export type SaveFactOutcome = { outcome: 'saved'; fact: GuestFact } | { outcome: 'duplicate' };

/**
 * The ONE fact-save path: dedupe against same-kind live facts, evict past the
 * cap, insert. Plain check-then-insert, no tx — conversation.process is a
 * stately queue (≤1 active per conversation) and guest↔conversation is 1:1,
 * so concurrent saves for one guest are already excluded at the queue layer;
 * a theoretical overshoot self-corrects on the next save's eviction.
 */
export async function insertGuestFactGuarded(
  db: Db,
  args: { guestId: string; kind: GuestFactKind; content: string; sourceMessageId: string | null },
): Promise<SaveFactOutcome> {
  const siblings = await db
    .select({ content: guestFacts.content })
    .from(guestFacts)
    .where(and(eq(guestFacts.guestId, args.guestId), eq(guestFacts.kind, args.kind), notExpired));
  if (siblings.some((row) => isSimilarFact(row.content, args.content))) {
    return { outcome: 'duplicate' };
  }

  const [counted] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(guestFacts)
    .where(eq(guestFacts.guestId, args.guestId));
  const excess = (counted?.count ?? 0) - (FACTS_PER_GUEST_CAP - 1);
  // Evict + insert in ONE tx (audit): atomicity is a different property from
  // concurrency — a crash between the two must not lose evicted rows with no
  // new fact landing.
  const fact = await db.transaction(async (tx) => {
    if (excess > 0) {
      await tx.execute(sql`DELETE FROM ${guestFacts} WHERE ${guestFacts.id} IN (
        SELECT ${guestFacts.id} FROM ${guestFacts}
        WHERE ${guestFacts.guestId} = ${args.guestId}
        ORDER BY (${guestFacts.expiresAt} IS NOT NULL AND ${guestFacts.expiresAt} <= now()) DESC,
          ${KIND_EVICTION_PRIORITY} ASC, ${guestFacts.createdAt} ASC
        LIMIT ${excess})`);
    }
    const [row] = await tx
      .insert(guestFacts)
      .values({
        guestId: args.guestId,
        kind: args.kind,
        content: args.content,
        sourceMessageId: args.sourceMessageId,
      })
      .returning();
    if (row === undefined) throw new Error('guest fact insert returned no row');
    return row;
  });
  return { outcome: 'saved', fact };
}

/** Block [5]'s read: live (non-expired) facts, newest first. expires_at has
 * no writer in CH-09 — this filter is where a future writer takes effect. */
export async function getActiveGuestFacts(
  db: Db,
  guestId: string,
  limit: number = PROFILE_FACTS_LIMIT,
): Promise<GuestFact[]> {
  return db
    .select()
    .from(guestFacts)
    .where(and(eq(guestFacts.guestId, guestId), notExpired))
    .orderBy(desc(guestFacts.createdAt))
    .limit(limit);
}

/** Admin peek: everything on file, newest first, expired included. */
export async function getAllGuestFacts(db: Db, guestId: string): Promise<GuestFact[]> {
  return db
    .select()
    .from(guestFacts)
    .where(eq(guestFacts.guestId, guestId))
    .orderBy(desc(guestFacts.createdAt));
}

/** TODO(CH-18): the DELETE_GUEST erasure flow calls this (facts hold guest
 * words — they must go with the guest, like conversations.summary). */
export async function deleteGuestFacts(db: Db, guestId: string): Promise<void> {
  await db.delete(guestFacts).where(eq(guestFacts.guestId, guestId));
}

/** First register_pref/lang_pref writer (CH-09 step 4) — partial patch;
 * detection heuristics decide WHAT to write, this only persists it. */
export async function updateGuestPrefs(
  db: Db,
  guestId: string,
  patch: { registerPref?: Guest['registerPref']; langPref?: Guest['langPref'] },
): Promise<void> {
  if (patch.registerPref === undefined && patch.langPref === undefined) return;
  await db.update(guests).set(patch).where(eq(guests.id, guestId));
}

/** Admin guest-lookup read (phone already E.164-normalised by the caller). */
export async function getGuestByPhone(db: Db, phone: string): Promise<Guest | null> {
  const [row] = await db.select().from(guests).where(eq(guests.phone, phone));
  return row ?? null;
}
