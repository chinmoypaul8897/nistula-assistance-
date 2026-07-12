/**
 * Conversation-memory repositories (CH-08): the context builder's evidence and
 * window-gap reads now; the summariser's range/candidate/apply helpers join in
 * the same chunk. Split from repos.ts purely for the ~300-line rule (the
 * rupees.ts precedent) — same conventions: cursors travel as created_at::text
 * (the CH-03 microsecond trap), tuple comparisons keep tie-order deterministic,
 * and boundary rows are resolved SERVER-side (an id-join), never through a JS
 * Date round-trip.
 */
import { sql } from 'drizzle-orm';
import type { Db } from './client.js';
import type { MessageCursor } from './repos.js';

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
