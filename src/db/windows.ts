/**
 * The 24h service window — Meta's rule, enforced in code rather than vibes
 * (§5.3, CH-12).
 *
 * There are two kinds of counterparty and they keep their window in different
 * places, which is the whole reason this module exists:
 *
 *   - a GUEST has a conversation, and CH-03's turn claim already maintains
 *     conversations.service_window_expires_at = last_guest_msg_at + 24h;
 *   - a STAFF or OPS number has no conversation at all (their message rows carry
 *     conversation_id = null by §4), but Meta's window binds them exactly the
 *     same. Their window lives in phone_windows, written on every inbound.
 *
 * Forgetting the second kind is the classic version of this bug: the task card
 * that "just doesn't arrive" for the housekeeper who has not messaged the
 * business line since Tuesday.
 */
import { eq, sql } from 'drizzle-orm';
import type { Db, DbLike } from './client.js';
import { conversations, phoneWindows } from './schema.js';

const WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Meta sends `timestamp` as unix seconds. A missing/garbled one falls back to
 * now — tolerant parsing per §5.3, and the greatest() guard below keeps the
 * fallback from ever shrinking a live window.
 */
export function inboundTimestamp(raw: string | undefined): Date {
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0) return new Date();
  return new Date(seconds * 1000);
}

/** Records an inbound from ANY number — guest, staff or ops. Cheap, idempotent,
 * and called on every inbound: a number can be both a guest and on the roster,
 * and we would rather hold a window we never read than miss one we need. */
export async function touchPhoneWindow(db: DbLike, phone: string, at: Date): Promise<void> {
  await db
    .insert(phoneWindows)
    .values({ phone, lastInboundAt: at })
    .onConflictDoUpdate({
      target: phoneWindows.phone,
      // Never move a window BACKWARDS: webhooks arrive out of order (CH-02 D3),
      // and an old redelivery must not shrink a live window.
      set: { lastInboundAt: sql`greatest(${phoneWindows.lastInboundAt}, excluded.last_inbound_at)` },
    });
}

export type WindowState = { open: boolean; source: 'conversation' | 'phone_window' | 'none' };

/**
 * Is a free-form send allowed to this counterparty right now?
 *
 * Fails CLOSED in every unknown: no conversation row, no phone window, a null
 * expiry — all mean "we have no evidence they messaged us in the last day", and
 * the honest reading of no evidence is no.
 */
export async function windowStateFor(
  db: Db,
  target: { conversationId: string | null; phone: string },
  now: Date,
): Promise<WindowState> {
  if (target.conversationId !== null) {
    const [row] = await db
      .select({ expiresAt: conversations.serviceWindowExpiresAt })
      .from(conversations)
      .where(eq(conversations.id, target.conversationId));
    const expiresAt = row?.expiresAt ?? null;
    return {
      open: expiresAt !== null && expiresAt.getTime() > now.getTime(),
      source: 'conversation',
    };
  }

  const [row] = await db
    .select({ lastInboundAt: phoneWindows.lastInboundAt })
    .from(phoneWindows)
    .where(eq(phoneWindows.phone, target.phone));
  if (row === undefined) return { open: false, source: 'none' };
  return {
    open: row.lastInboundAt.getTime() + WINDOW_MS > now.getTime(),
    source: 'phone_window',
  };
}
