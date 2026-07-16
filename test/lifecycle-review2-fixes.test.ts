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
import {
  handleBookingEvent,
  scheduleForBooking,
  type SchedulerDeps,
} from '../src/lifecycle/scheduler.js';
import { runSender, type SenderDeps } from '../src/lifecycle/sender.js';
import { createWaClient, type TemplateMode } from '../src/wa/client.js';
import { TEST_URL } from './helpers/boss.js';

/**
 * ONE FIXED INSTANT, and every fixture time derived from it.
 *
 * blockedBy judges the guest-quiet window (22:00-08:00 IST) by the sender's
 * clock, so a suite that let that clock read real time passed or failed BY THE
 * HOUR IT WAS RUN: green at 6 p.m., red every night from ten. The 1235-green
 * that cleared round 6 was partly an artifact of the hour. Fixture times in SQL
 * `now()` cannot mix with an injected clock either, so both move here.
 */
const NOW = new Date('2026-07-16T06:30:00Z'); // 12:00 IST — a civil hour
/** Fixture instants relative to the suite's clock. ISO, because the driver
 * binds a timestamptz as a string, not a Date. */
const hoursBefore = (n: number): string =>
  new Date(NOW.getTime() - n * 3_600_000).toISOString();
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
const senderDeps = (wa: ReturnType<typeof makeWa>, now: () => Date = () => NOW): SenderDeps => ({
  db,
  log,
  wa,
  gates: { sources: GATES.sources, today: GATES.today },
  enabled: true,
  now,
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
      syncedAt: NOW,
      createdAt: NOW,
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

  it.each([130429, 131048, 131056, 80007, 4, 613, 99999])(
    'a non-permanent HTTP 400 + code %s DEFERS — retry is the DEFAULT now (incl. code 4 and codes we have never met)',
    async (code) => {
      // Meta returns messaging-tier / throughput caps as HTTP 400 with the reason
      // in the error CODE. Classifying by httpStatus alone burned these.
      await scheduleForBooking(deps(), await seed());
      await openWindow();
      const wa = makeWa('simulate', async () => graphErr(400, code));
      const result = await runSender(senderDeps(wa));

      expect(result).toMatchObject({ deferred: 1, failed: 0 });
      const [row] = await db.select().from(scheduledMessages).where(sql`kind = 'confirmation'`);
      expect(row?.status).toBe('pending'); // survives the cap; retries when it resets
    },
  );

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
    await db.execute(sql`UPDATE scheduled_messages SET deferred_until = ${hoursBefore(1)}`);
    const second = await runSender(senderDeps(wa)); // now succeeds

    expect(second).toMatchObject({ sent: 1 });
    const [row] = await db.select().from(scheduledMessages).where(sql`kind = 'confirmation'`);
    expect(row?.status).toBe('sent');
  });
});

/* ── the REAL production path: a closed window + a real template ───────────── */

describe('the closed-window TEMPLATE send (WA_TEMPLATE_MODE=send) — the production path', () => {
  it('sends a real Meta template Graph payload to a guest who never messaged us', async () => {
    // The whole premise of lifecycle: the guest has a CLOSED window. In
    // production (mode=send) that means a real approved template. The dev test
    // number cannot prove this path (no approved templates), and the tests must.
    await scheduleForBooking(deps(), await seed());
    // NO openWindow() — the guest has never written to us.
    const sent: unknown[] = [];
    const wa = makeWa('send', async (_url, options) => {
      sent.push(JSON.parse(options?.body ?? '{}'));
      return new Response(JSON.stringify({ messages: [{ id: 'wamid.TPL' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const result = await runSender(senderDeps(wa));

    expect(result).toMatchObject({ sent: 1 });
    // A real TEMPLATE payload (not free-form text) went on the wire.
    expect(sent[0]).toMatchObject({ type: 'template', template: { name: 'nst_confirmation_v1' } });
    const [row] = await db.select().from(scheduledMessages).where(sql`kind = 'confirmation'`);
    expect(row?.status).toBe('sent');
    // ...and Meta will bill it, so a wa_template cost event is metered.
    const [cost] = await db.select().from(schema.costEvents);
    expect(cost?.kind).toBe('wa_template');
  });
});

/* ── nothing lands on a guest's phone in the small hours ───────────────────── */

describe('quiet hours are enforced at SEND time (planned instants stay immutable)', () => {
  const at2am = () => new Date('2026-07-16T20:30:00Z'); // 02:00 IST next day

  it('a past-due pre-arrival that comes due at 2 a.m. waits for a civil hour', async () => {
    // check-in 19 Jul => pre-arrival planned 16 Jul 10:00 IST, which is ~16h
    // before the injected 02:00 IST clock: past-due (so it IS picked up) but not
    // yet stale (so the quiet guard, not the stale guard, is what stops it).
    await scheduleForBooking(deps(), await seed({ checkIn: '2026-07-19', checkOut: '2026-07-21' }));
    await openWindow();
    const sent: unknown[] = [];
    const wa = makeWa('simulate', async (_u, o) => {
      sent.push(JSON.parse(o?.body ?? '{}'));
      return new Response(JSON.stringify({ messages: [{ id: 'w' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    // Only the pre-arrival is under test: resolve the confirmation out of the way.
    await db.execute(sql`UPDATE scheduled_messages SET status = 'sent' WHERE kind = 'confirmation'`);

    await runSender(senderDeps(wa, at2am));

    const [row] = await db.select().from(scheduledMessages).where(sql`kind = 'prearrival'`);
    expect(row?.status).toBe('pending');
    expect(row?.skipReason).toBe('quiet_hours');
    expect(sent).toHaveLength(0);
  });

  it('...but the CONFIRMATION is exempt — the guest just pressed Book and is waiting', async () => {
    await scheduleForBooking(deps(), await seed());
    await openWindow();
    const sent: unknown[] = [];
    const wa = makeWa('simulate', async (_u, o) => {
      sent.push(JSON.parse(o?.body ?? '{}'));
      return new Response(JSON.stringify({ messages: [{ id: 'w' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    await runSender(senderDeps(wa, at2am));

    const [row] = await db.select().from(scheduledMessages).where(sql`kind = 'confirmation'`);
    expect(row?.status).toBe('sent');
    expect(sent).toHaveLength(1);
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
      sql`UPDATE scheduled_messages SET send_at = ${hoursBefore(40)}, deferred_until = ${hoursBefore(1)} WHERE kind = 'confirmation'`,
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
    await db.execute(sql`UPDATE scheduled_messages SET send_at = ${hoursBefore(1)}`);

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

/* ── 🚨 THE 8th INSTANCE: a real arrival must not destroy the lifecycle ─────── */

describe('🚨 a stay that ACTUALLY HAPPENS keeps its lifecycle — through the REAL event path', () => {
  // The bug this pins was invisible because the test that claimed to cover it
  // (lifecycle-review-fixes "a stay that actually HAPPENS...") mutated the mirror
  // and called runSender DIRECTLY — proving the door that was fixed and skipping
  // the door in front of it. These drive handleBookingEvent, as production does.
  it.each(['checked_in', 'checked_out'] as const)(
    'eZee marking the booking %s emits booking.modified — the rows must SURVIVE',
    async (status) => {
      const no = await seed();
      await handleBookingEvent(deps(), 'created', no);
      expect(await db.select().from(scheduledMessages)).toHaveLength(5);

      // The guest arrives. eZee sets Arrived/Checked Out; `status` is a diff
      // field, so the poller emits booking.modified — guaranteed, not hypothetical.
      await db.execute(sql`UPDATE bookings_mirror SET status = ${status}`);
      await handleBookingEvent(deps(), 'modified', no);

      const rows = await db.select().from(scheduledMessages);
      // NOT cancelled. A booking that has been LIVED is still a booking.
      expect(rows.filter((r) => r.status === 'cancelled')).toHaveLength(0);
      expect(rows.filter((r) => r.status === 'pending')).toHaveLength(5);
    },
  );

  it('a modify AFTER check-in has passed (a folio tweak) must not destroy poststay/winback', async () => {
    const no = await seed();
    await handleBookingEvent(deps(), 'created', no);
    // The stay is now in the past — but `amount` is a diff field, so any folio
    // adjustment emits booking.modified and re-runs the gates (stay_in_past).
    await db.execute(sql`UPDATE bookings_mirror SET check_in = '2026-07-01', check_out = '2026-07-03'`);
    await handleBookingEvent(deps(), 'modified', no);

    const rows = await db.select().from(scheduledMessages);
    expect(rows.filter((r) => r.status === 'cancelled')).toHaveLength(0);
    // The thank-you and win-back are the whole point of a completed stay.
    expect(rows.find((r) => r.kind === 'poststay')?.status).toBe('pending');
    expect(rows.find((r) => r.kind === 'winback')?.status).toBe('pending');
  });

  it('🚨 a phone corrected AFTER check-in re-points the rows — the schedule is not frozen', async () => {
    // The regression the contract fix introduced: gate-fail RETURNED before the
    // guest re-binding, so once a booking was checked_in a corrected phone left
    // the thank-you and win-back aimed at the old (wrong) number for 75+ days,
    // and the sweep (confirmed|modified only) could never heal it.
    const no = await seed();
    await handleBookingEvent(deps(), 'created', no);
    const [first] = await db.select().from(schema.guests);

    // The guest arrives AND the front desk fixes the typo'd number. Both status
    // and guest_phone are diff fields, so one booking.modified carries both.
    await db.execute(
      sql`UPDATE bookings_mirror SET status = 'checked_in', guest_phone = '+917700900999'`,
    );
    await handleBookingEvent(deps(), 'modified', no);

    const corrected = (await db.select().from(schema.guests)).find(
      (g) => g.phone === '+917700900999',
    );
    expect(corrected).toBeDefined();
    const rows = await db.select().from(scheduledMessages);
    expect(rows.filter((r) => r.status === 'cancelled')).toHaveLength(0); // still alive
    // ...and every surviving row now belongs to the CORRECTED guest.
    for (const r of rows) expect(r.guestId).toBe(corrected?.id);
    expect(rows.every((r) => r.guestId !== first?.id)).toBe(true);
  });

  it('a check-out extended mid-stay re-plans the thank-you (not frozen on the old date)', async () => {
    const no = await seed();
    await handleBookingEvent(deps(), 'created', no);
    const before = (await db.select().from(scheduledMessages)).find((r) => r.kind === 'poststay');

    // Guest is in-house and extends: checked_in + a later check-out.
    await db.execute(
      sql`UPDATE bookings_mirror SET status = 'checked_in', check_out = '2026-12-29'`,
    );
    await handleBookingEvent(deps(), 'modified', no);

    const after = (await db.select().from(scheduledMessages)).find((r) => r.kind === 'poststay');
    expect(after?.id).toBe(before?.id); // same row, re-planned
    // check_out 29 Dec + 1d at 11:00 IST = 30 Dec 05:30 UTC — NOT the old date.
    expect(after?.sendAt.toISOString()).toBe('2026-12-30T05:30:00.000Z');
    expect(after?.sendAt.getTime()).toBeGreaterThan(before!.sendAt.getTime());
  });

  it('an "unknown" (flapping hold) must not revoke either', async () => {
    const no = await seed();
    await handleBookingEvent(deps(), 'created', no);
    await db.execute(sql`UPDATE bookings_mirror SET status = 'unknown'`);
    await handleBookingEvent(deps(), 'modified', no);
    const rows = await db.select().from(scheduledMessages);
    expect(rows.filter((r) => r.status === 'cancelled')).toHaveLength(0);
  });

  it('...but a booking that is business-FINAL still revokes (cancelled / no_show only)', async () => {
    // Only an irreversible business fact destroys a schedule. A retyped source or
    // a phone cleared mid-correction must NOT — the sender refuses those instead.
    for (const [field, value] of [
      ['status', 'cancelled'],
      ['status', 'no_show'],
    ] as const) {
      await db.execute(
        sql`TRUNCATE scheduled_messages, guest_stays, bookings_mirror, messages, conversations, guests CASCADE`,
      );
      const no = await seed();
      await handleBookingEvent(deps(), 'created', no);
      await db.execute(sql`UPDATE bookings_mirror SET ${sql.raw(field)} = ${value}`);
      await handleBookingEvent(deps(), 'modified', no);

      const rows = await db.select().from(scheduledMessages);
      expect(rows.every((r) => r.status === 'cancelled')).toBe(true);
    }
  });

  it('🚨 a phone cleared mid-correction PAUSES the lifecycle — it does not destroy it', async () => {
    // The 9th instance: no_phone is a mutable, human-edited field, but revocation
    // is irreversible. A front desk clearing the field for a moment must not
    // permanently kill a real guest's welcome, thank-you and win-back.
    const no = await seed();
    await handleBookingEvent(deps(), 'created', no);
    await db.execute(sql`UPDATE bookings_mirror SET guest_phone = NULL`);
    await handleBookingEvent(deps(), 'modified', no);

    let rows = await db.select().from(scheduledMessages);
    expect(rows.every((r) => r.status === 'pending')).toBe(true); // paused, alive

    // ...and when the number is retyped, the lifecycle simply resumes.
    await db.execute(sql`UPDATE bookings_mirror SET guest_phone = ${PHONE}`);
    await handleBookingEvent(deps(), 'modified', no);
    rows = await db.select().from(scheduledMessages);
    expect(rows.filter((r) => r.status === 'cancelled')).toHaveLength(0);
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
