/**
 * Conversation-memory repositories (CH-08): the context builder's evidence and
 * window-gap reads now; the summariser's range/candidate/apply helpers join in
 * the same chunk. Split from repos.ts purely for the ~300-line rule (the
 * rupees.ts precedent) — same conventions: cursors travel as created_at::text
 * (the CH-03 microsecond trap), tuple comparisons keep tie-order deterministic,
 * and boundary rows are resolved SERVER-side (an id-join), never through a JS
 * Date round-trip.
 */
import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import type { Db } from './client.js';
import type { Message, MessageCursor } from './repos.js';
import { conversations, messages } from './schema.js';

/**
 * Guardrail-2 evidence (§6.5 #2's second channel), decoupled from the
 * transcript fetch: claimable sender:'system' context kinds since the guest's
 * previous message. WHY its own query (CH-08 review finding): the old
 * shared-fetch filter only saw the last N rows, so a ≥N-message burst between
 * turns silently pushed evidence out of sight — a C3 licence lost means a
 * duplicate ops escalation. `sinceIso` is the claim cursor's created_at::text
 * (µs-exact); null means no previous message, so every claimable row counts.
 */
export async function getSystemContextKinds(
  db: Db,
  conversationId: string,
  sinceIso: string | null,
): Promise<string[]> {
  const rows = await db.execute<{ kind: string | null }>(sql`
    SELECT m.raw->>'contextKind' AS kind
    FROM messages m
    WHERE m.conversation_id = ${conversationId}
      AND m.sender = 'system'
      AND (${sinceIso}::timestamptz IS NULL OR m.created_at >= ${sinceIso}::timestamptz)
  `);
  return [...rows].map((row) => row.kind).filter((kind): kind is string => kind !== null);
}

/**
 * Messages that would be INVISIBLE to the model this turn: older than the
 * transcript window's first row AND not covered by the rolling summary — the
 * §6.3 overflow signal that triggers an on-demand summarise. System rows are
 * excluded (they never render; the summariser cursor still advances over
 * them). The window boundary is an id-JOIN — comparing against a JS Date
 * would ms-truncate and misclassify same-millisecond boundary rows (CH-03,
 * caught live). A null summaryCursor (no summary yet, or a dangling pointer
 * degraded by the caller) means NOTHING is covered — fail toward summarising.
 */
export async function countUncoveredMessages(
  db: Db,
  args: {
    conversationId: string;
    /** The id of the OLDEST message inside this turn's transcript window. */
    windowStartId: string;
    summaryCursor: MessageCursor | null;
  },
): Promise<number> {
  const coveredGuard =
    args.summaryCursor === null
      ? sql`TRUE`
      : sql`(m.created_at, m.id) > (${args.summaryCursor.createdAtIso}::timestamptz, ${args.summaryCursor.id}::uuid)`;
  const rows = await db.execute<{ n: number }>(sql`
    SELECT count(*)::int AS n
    FROM messages m
    JOIN messages w ON w.id = ${args.windowStartId}
    WHERE m.conversation_id = ${args.conversationId}
      AND m.sender <> 'system'
      AND (m.created_at, m.id) < (w.created_at, w.id)
      AND ${coveredGuard}
  `);
  return [...rows][0]?.n ?? 0;
}

/** The summariser's view of a conversation: the stored notes + the RAW cursor
 * value (dangling or not — the CAS compares against what is stored). */
export async function getConversationMemory(
  db: Db,
  conversationId: string,
): Promise<{ summary: string | null; summaryUptoMessageId: string | null } | null> {
  const [row] = await db
    .select({
      summary: conversations.summary,
      summaryUptoMessageId: conversations.summaryUptoMessageId,
    })
    .from(conversations)
    .where(eq(conversations.id, conversationId));
  return row ?? null;
}

/**
 * The summariser's input range: every message (ANY sender — the cursor must
 * advance over system rows too, or a system-only stretch would re-qualify
 * forever) strictly after the summary cursor and strictly BEFORE the window
 * boundary row, oldest-first, capped for backfill safety (first run and the
 * CH-18b history import may face months of thread in one go — the next wake
 * continues from the advanced cursor). Boundary rows resolve server-side.
 */
export async function getSummarisableMessages(
  db: Db,
  args: {
    conversationId: string;
    afterCursor: MessageCursor | null;
    /** The id of the oldest message the live window WILL show — everything
     * summarised stays strictly older (coverage without overlap, §6.3). */
    beforeId: string;
    limit: number;
  },
): Promise<Message[]> {
  const afterGuard =
    args.afterCursor === null
      ? undefined
      : sql`(${messages.createdAt}, ${messages.id}) > (${args.afterCursor.createdAtIso}::timestamptz, ${args.afterCursor.id}::uuid)`;
  return db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, args.conversationId),
        sql`(${messages.createdAt}, ${messages.id}) < (SELECT w.created_at, w.id FROM messages w WHERE w.id = ${args.beforeId}::uuid)`,
        // THE SUMMARY IS WHAT THE GUEST ACTUALLY SAW — the same rule as the live
        // window (getRecentMessages), and it must be applied HERE too or the fix
        // is only half done: a failed send excluded from the window would still
        // be compacted into [EARLIER CONTEXT] and become PERMANENT, letting the
        // AI tell a real guest "as I mentioned, I've sent your confirmation"
        // about a message that never left. Inbound is always real.
        or(
          eq(messages.direction, 'in'),
          inArray(messages.status, ['sent', 'delivered', 'read']),
        ),
        afterGuard,
      ),
    )
    .orderBy(messages.createdAt, messages.id)
    .limit(args.limit);
}

/**
 * Nightly candidates (plan.md CH-08 step 2): idle > the threshold (newest
 * message of ANY sender vs the DB clock) with more than `minUnsummarised`
 * non-system messages past the summary cursor. The LEFT JOIN makes a dangling
 * cursor degrade to "nothing covered" — a candidate, never invisible (the
 * findStaleConversations convention).
 */
export async function findSummariserCandidates(
  db: Db,
  args: { idleSeconds: number; minUnsummarised: number },
): Promise<string[]> {
  const rows = await db.execute<{ id: string }>(sql`
    SELECT c.id
    FROM conversations c
    LEFT JOIN messages p ON p.id = c.summary_upto_message_id
    WHERE NOT EXISTS (
      SELECT 1 FROM messages newer
      WHERE newer.conversation_id = c.id
        AND newer.created_at > now() - make_interval(secs => ${args.idleSeconds})
    )
    AND (
      SELECT count(*) FROM messages m
      WHERE m.conversation_id = c.id
        AND m.sender <> 'system'
        AND (p.id IS NULL OR (m.created_at, m.id) > (p.created_at, p.id))
    ) > ${args.minUnsummarised}
  `);
  return [...rows].map((row) => row.id);
}

/**
 * The summary write — a CAS like claimConversationTurn: expectedPointer is the
 * STORED summary_upto_message_id read at the start of the run (the raw value,
 * even when dangling), so two concurrent runs can advance the cursor exactly
 * once; the loser's model output is discarded, never double-compacted.
 */
export async function applyConversationSummary(
  db: Db,
  args: {
    conversationId: string;
    expectedPointer: string | null;
    newPointer: string;
    /** Null preserves "no notes yet" when only the cursor advances (a
     * system-only stretch — the summariser's model-free path). */
    summary: string | null;
  },
): Promise<boolean> {
  const rows = await db
    .update(conversations)
    .set({ summary: args.summary, summaryUptoMessageId: args.newPointer })
    .where(
      and(
        eq(conversations.id, args.conversationId),
        args.expectedPointer === null
          ? isNull(conversations.summaryUptoMessageId)
          : eq(conversations.summaryUptoMessageId, args.expectedPointer),
      ),
    )
    .returning({ id: conversations.id });
  return rows.length > 0;
}

/**
 * CH-18b out-of-order safety. The summariser cursor is FORWARD-ONLY, so if a
 * history chunk lands messages OLDER than the conversation's current cursor, that
 * cursor now sits AHEAD of un-summarised rows the forward-only passes will never
 * revisit — they would be invisible to the model for ever. Rewind: clear the
 * summary + pointer so the next pass re-compacts from the earliest row. A no-op
 * unless the cursor's OWN message is at or after the oldest newly-imported row
 * (i.e. something really did land behind it).
 */
export async function resetSummaryIfBackfilledBehind(
  db: Db,
  conversationId: string,
  oldestNewCreatedAt: Date,
): Promise<void> {
  await db.execute(sql`
    UPDATE conversations c
    SET summary = NULL, summary_upto_message_id = NULL, updated_at = now()
    FROM messages p
    WHERE c.id = ${conversationId}
      AND p.id = c.summary_upto_message_id
      AND p.created_at >= ${oldestNewCreatedAt.toISOString()}::timestamptz
  `);
}
