/**
 * CH-12 · round 2 — the defects a SECOND multi-agent review found (1 blocker,
 * concerns), each pinned so it cannot come back. The first suite proved the
 * first review's fixes; this proves the second's.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BookingMirror } from '../src/db/bookings.js';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { scheduledMessages } from '../src/db/schema.js';
import { touchPhoneWindow } from '../src/db/windows.js';
import type { GateContext } from '../src/lifecycle/gates.js';
import { scheduleForBooking, type SchedulerDeps } from '../src/lifecycle/scheduler.js';
import { runSender, type SenderDeps } from '../src/lifecycle/sender.js';
import { createWaClient, type TemplateMode } from '../src/wa/client.js';
import { TEST_URL } from './helpers/boss.js';

const TODAY = '2026-07-14';
const GATES: GateContext = {
  epoch: new Date('2026-07-14T00:00:00Z'),
  today: TODAY,
  sources: ['internet booking engine', 'walk-in'],
};
const PHONE = '+917700900501';

let client: ReturnType<typeof postgres>;
let db: Db;
const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const deps = (): SchedulerDeps => ({ db, log, gates: GATES });

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 6, onnotice: () => {} });
  db = drizzle(client, { schema }) as unknown as Db;
}, 30_000);
afterAll(async () => {
  await client?.end();
});
beforeEach(async () => {
  vi.clearAllMocks();
  await db.execute(
    sql`TRUNCATE scheduled_messages, phone_windows, cost_events, guest_stays, bookings_mirror, messages, conversations, guests CASCADE`,
  );
});

function makeWa(
  templateMode: TemplateMode,
  httpImpl: Parameters<typeof createWaClient>[0]['httpImpl'],
) {
  return createWaClient({
    db,
    log: { error: vi.fn(), warn: vi.fn() },
    graphBaseUrl: 'https://graph.test.invalid/v23.0',
    phoneNumberId: '000000000000000',
    accessToken: 'test-token',
    templateMode,
    httpImpl,
  });
}
const senderDeps = (wa: ReturnType<typeof makeWa>): SenderDeps => ({
  db,
  log,
  wa,
  gates: { sources: GATES.sources, today: GATES.today },
  enabled: true,
});

async function seed(over: Partial<BookingMirror> = {}): Promise<string> {
  const [row] = await db
    .insert(schema.bookingsMirror)
    .values({
      ezeeReservationNo: '953',
      guestName: 'Rahul Mehta',
      guestPhone: PHONE,
      roomTypeName: 'Nistula Villa',
      checkIn: '2026-12-20',
      checkOut: '2026-12-22',
      status: 'confirmed',
      source: 'Internet Booking Engine',
      raw: {},
      syncedAt: new Date('2026-07-14T13:00:00Z'),
      createdAt: new Date('2026-07-14T13:00:00Z'),
      ...over,
    })
    .returning();
  if (row === undefined) throw new Error('seed failed');
  return row.ezeeReservationNo;
}
async function openWindow(): Promise<void> {
  await touchPhoneWindow(db, PHONE, new Date());
  await db.execute(sql`UPDATE conversations SET service_window_expires_at = now() + interval '23 hours'`);
}
const graphErr = (status: number, code?: number) =>
  new Response(JSON.stringify({ error: { message: 'x', code: code ?? status } }), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/* ── THE BLOCKER: a transient Graph failure must not burn the message ──────── */

describe('🚨 a transient Graph failure DEFERS and retries — it does not burn the message', () => {
  it.each([429, 500, 503])('HTTP %s -> deferred, row stays pending, re-armed on deferred_until', async (status) => {
    await scheduleForBooking(deps(), await seed());
    await openWindow();
    const wa = makeWa('simulate', async () => graphErr(status));

    const result = await runSender(senderDeps(wa));

    expect(result).toMatchObject({ deferred: 1, sent: 0, failed: 0 });
    const [row] = await db.select().from(scheduledMessages).where(sql`kind = 'confirmation'`);
    // NOT terminal — the confirmation for a real paying guest survives a rate-limit.
    expect(row?.status).toBe('pending');
    expect(row?.sentMessageId).toBeNull(); // the claim was un-done
    expect(row?.deferredUntil).not.toBeNull();
    expect(row?.deferredUntil!.getTime()).toBeGreaterThan(Date.now());
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ opsAlert: 'lifecycle_send_deferred' }),
      expect.anything(),
    );
  });

  it('a network error (no HTTP response) also defers', async () => {
    await scheduleForBooking(deps(), await seed());
    await openWindow();
    const wa = makeWa('simulate', async () => {
      throw new TypeError('fetch failed');
    });
    const result = await runSender(senderDeps(wa));
    expect(result).toMatchObject({ deferred: 1, failed: 0 });
    const [row] = await db.select().from(scheduledMessages).where(sql`kind = 'confirmation'`);
    expect(row?.status).toBe('pending');
  });

  it('a PERMANENT failure (4xx param rejection) still resolves terminally', async () => {
    await scheduleForBooking(deps(), await seed());
    await openWindow();
    const wa = makeWa('simulate', async () => graphErr(400, 131009)); // bad param
    const result = await runSender(senderDeps(wa));

    expect(result).toMatchObject({ failed: 1, deferred: 0 });
    const [row] = await db.select().from(scheduledMessages).where(sql`kind = 'confirmation'`);
    expect(row?.status).toBe('failed');
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ opsAlert: 'lifecycle_send_failed' }),
      expect.anything(),
    );
  });

  it('a deferred-after-429 row actually re-sends on the next tick (recovery, end to end)', async () => {
    await scheduleForBooking(deps(), await seed());
    await openWindow();
    let attempt = 0;
    const wa = makeWa('simulate', async () => {
      attempt += 1;
      return attempt === 1
        ? graphErr(429)
        : new Response(JSON.stringify({ messages: [{ id: 'wamid.RETRY' }] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
    });

    await runSender(senderDeps(wa)); // 429 -> deferred
    // clear the backoff so the row is due again (simulates 15 min later)
    await db.execute(sql`UPDATE scheduled_messages SET deferred_until = now() - interval '1 minute'`);
    const second = await runSender(senderDeps(wa)); // now succeeds

    expect(second).toMatchObject({ sent: 1 });
    const [row] = await db.select().from(scheduledMessages).where(sql`kind = 'confirmation'`);
    expect(row?.status).toBe('sent');
  });
});

/* ── the stale guard is no longer defeated by defer ────────────────────────── */

describe('the 36h stale guard survives repeated deferral', () => {
  it('a row whose PLANNED time is >36h past goes stale even after being deferred', async () => {
    await scheduleForBooking(deps(), await seed());
    await openWindow();
    const okWa = makeWa('simulate', async () =>
      new Response(JSON.stringify({ messages: [{ id: 'w' }] }), { status: 200, headers: { 'content-type': 'application/json' } }),
    );

    // The confirmation's planned time is 40h in the past, and it has been deferred
    // (deferred_until set) — but now due again. Because defer never touched
    // send_at, the age is measured true and it is stale.
    await db.execute(
      sql`UPDATE scheduled_messages SET send_at = now() - interval '40 hours', deferred_until = now() - interval '1 minute' WHERE kind = 'confirmation'`,
    );

    const result = await runSender(senderDeps(okWa));
    expect(result.skipped).toBeGreaterThan(0);
    const [row] = await db.select().from(scheduledMessages).where(sql`kind = 'confirmation'`);
    expect(row?.status).toBe('skipped');
    expect(row?.skipReason).toBe('stale');
  });
});

/* ── the stay-over backstop ─────────────────────────────────────────────────── */

describe('a pre-stay message is skipped once the stay is entirely over', () => {
  it('welcome is skipped stay_over; poststay still sends', async () => {
    // Schedule with FUTURE dates (the date gate blocks a past booking outright),
    // then amend the mirror entirely into the past — the case the send-time
    // backstop exists for (an eZee date amendment the sweep never revokes).
    const no = await seed();
    await scheduleForBooking(deps(), no);
    await openWindow();
    await db.execute(sql`UPDATE bookings_mirror SET check_in = '2026-07-01', check_out = '2026-07-03'`);
    await db.execute(sql`UPDATE scheduled_messages SET send_at = now() - interval '1 minute'`);

    const okWa = makeWa('simulate', async () =>
      new Response(JSON.stringify({ messages: [{ id: 'w' }] }), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    await runSender(senderDeps(okWa));

    const [welcome] = await db.select().from(scheduledMessages).where(sql`kind = 'welcome'`);
    expect(welcome?.skipReason).toBe('stay_over');
    const [poststay] = await db.select().from(scheduledMessages).where(sql`kind = 'poststay'`);
    expect(poststay?.status).toBe('sent'); // post-stay is meant to fire after checkout
  });
});

/* ── undescribable regression revokes ──────────────────────────────────────── */

describe('a booking that becomes undescribable withdraws its pending rows', () => {
  it('a second multi-room sibling makes it multi_room -> pending rows cancelled', async () => {
    // 877-1 arrives first, is scheduled (single room, describable).
    const no = await seed({ ezeeReservationNo: '877-1' });
    await scheduleForBooking(deps(), no);
    expect(await db.select().from(scheduledMessages)).toHaveLength(5);

    // 877-2 arrives — now referenceBase 877 has two siblings => multi_room.
    await db.insert(schema.bookingsMirror).values({
      ezeeReservationNo: '877-2',
      guestName: 'Rahul Mehta',
      guestPhone: PHONE,
      roomTypeName: 'Nistula Villa',
      checkIn: '2026-12-20',
      checkOut: '2026-12-22',
      status: 'confirmed',
      source: 'Internet Booking Engine',
      raw: {},
      syncedAt: new Date('2026-07-14T13:05:00Z'),
      createdAt: new Date('2026-07-14T13:05:00Z'),
    });
    const res = await scheduleForBooking(deps(), '877-1');

    expect(res.skipped).toContain('undescribable');
    // The single-room lifecycle is WITHDRAWN, not left running.
    const rows = await db.select().from(scheduledMessages);
    const pending = rows.filter((r) => r.status === 'pending');
    expect(pending).toHaveLength(0);
    expect(rows.filter((r) => r.status === 'cancelled').length).toBeGreaterThan(0);
  });
});

/* ── the concurrent claim race (atomicity, not just sequential) ────────────── */

describe('two senders racing the same due row send exactly once', () => {
  it('the claim-loser does not double-send', async () => {
    await scheduleForBooking(deps(), await seed());
    await openWindow();
    // Only the confirmation is due; make one sender slow so both overlap on it.
    const sent: unknown[] = [];
    const wa = makeWa('simulate', async (_url, options) => {
      sent.push(JSON.parse(options?.body ?? '{}'));
      await new Promise((r) => setTimeout(r, 50));
      return new Response(JSON.stringify({ messages: [{ id: `wamid.${sent.length}` }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const [a, b] = await Promise.all([runSender(senderDeps(wa)), runSender(senderDeps(wa))]);

    // Exactly one Graph call, exactly one 'sent' scheduled row.
    expect(sent).toHaveLength(1);
    expect((a.sent ?? 0) + (b.sent ?? 0)).toBe(1);
    const [row] = await db.select().from(scheduledMessages).where(sql`kind = 'confirmation'`);
    expect(row?.status).toBe('sent');
  });
});
