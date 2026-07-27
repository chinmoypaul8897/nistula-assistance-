/**
 * CH-12 · the defects a five-lens adversarial review found, each pinned so it
 * cannot come back.
 *
 * Every test here corresponds to a bug that WOULD HAVE REACHED A REAL GUEST and
 * that the original suite happily passed. They are grouped by the lie the old
 * code told.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { project } from '../src/brain/stayView.js';
import type { BookingMirror } from '../src/db/bookings.js';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { scheduledMessages } from '../src/db/schema.js';
import { inboundTimestamp, touchPhoneWindow } from '../src/db/windows.js';
import type { GateContext } from '../src/lifecycle/gates.js';
import { planSends, scheduleForBooking, type SchedulerDeps } from '../src/lifecycle/scheduler.js';
import { runSender, type SenderDeps } from '../src/lifecycle/sender.js';
import { renderTemplate } from '../src/lifecycle/templates.js';
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
const NOW = new Date('2026-07-14T06:30:00Z'); // 12:00 IST — a civil hour
/** Fixture instants relative to the suite's clock. ISO, because the driver
 * binds a timestamptz as a string, not a Date. */
const hoursBefore = (n: number): string =>
  new Date(NOW.getTime() - n * 3_600_000).toISOString();
const hoursAfter = (n: number): string => hoursBefore(-n);
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

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
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

const deps = (): SchedulerDeps => ({ db, log, gates: GATES });

function makeWa(templateMode: TemplateMode = 'simulate') {
  const sent: unknown[] = [];
  const wa = createWaClient({
    db,
    log: { error: vi.fn(), warn: vi.fn() },
    graphBaseUrl: 'https://graph.test.invalid/v23.0',
    phoneNumberId: '000000000000000',
    accessToken: 'test-token',
    templateMode,
    httpImpl: async (_url, options) => {
      sent.push(JSON.parse(options?.body ?? '{}'));
      return new Response(JSON.stringify({ messages: [{ id: `wamid.R-${sent.length}` }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });
  return { wa, sent };
}
const senderDeps = (wa: ReturnType<typeof makeWa>['wa']): SenderDeps => ({
  db,
  log,
  wa,
  gates: { sources: GATES.sources, today: GATES.today },
  enabled: true,
  now: () => NOW,
});

async function seed(over: Partial<BookingMirror> = {}): Promise<string> {
  const [row] = await db
    .insert(schema.bookingsMirror)
    .values({
      ezeeReservationNo: '953',
      guestName: 'Rahul Mehta',
      guestPhone: PHONE,
      roomTypeName: 'Nistula Apartment',
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

async function openWindow(phone = PHONE): Promise<void> {
  await touchPhoneWindow(db, phone, new Date());
  await db.execute(
    sql`UPDATE conversations SET service_window_expires_at = now() + interval '23 hours'`,
  );
}

const rows = async () => db.select().from(scheduledMessages).orderBy(scheduledMessages.kind);

/* ────────────────────────────────────────────────────────────────────────── */

describe('🚨 the booking is sent to the number CURRENTLY on it', () => {
  it('a corrected phone number re-points the pending rows to the new guest', async () => {
    const no = await seed();
    await scheduleForBooking(deps(), no);
    const [first] = await db.select().from(schema.guests);

    // The front desk fixes a typo'd number in eZee. guest_phone is in
    // MIRROR_DIFF_FIELDS, so the poller mirrors it and emits booking.modified.
    await db.execute(sql`UPDATE bookings_mirror SET guest_phone = '+917700900777'`);
    await scheduleForBooking(deps(), no);

    const guests = await db.select().from(schema.guests);
    expect(guests).toHaveLength(2);
    const corrected = guests.find((g) => g.phone === '+917700900777');

    // Every pending row now belongs to the CORRECTED guest. Before the fix they
    // stayed pinned to the first guest row, so the booking's name, villa, dates
    // and reference went to a number no longer on the booking — and the real
    // guest got nothing, for ever, because the dedupe key was taken.
    const scheduled = await rows();
    expect(scheduled).toHaveLength(5);
    for (const row of scheduled) expect(row.guestId).toBe(corrected?.id);
    expect(scheduled.every((r) => r.guestId !== first?.id)).toBe(true);
  });
});

describe('🚨 a booking re-sourced to an OTA is never MESSAGED (but not destroyed)', () => {
  it('the rows survive a re-source — the SENDER is what refuses (revocation is irreversible)', async () => {
    const no = await seed();
    await scheduleForBooking(deps(), no);
    expect(await rows()).toHaveLength(5);

    // eZee re-sources it. `source` is in MIRROR_DIFF_FIELDS — this really happens.
    await db.execute(sql`UPDATE bookings_mirror SET source = 'Airbnb'`);
    await scheduleForBooking(deps(), no);

    // NOT destroyed. `source` is a mutable, human-edited free-text field, and
    // revocation can never be undone — so a retyped source must not permanently
    // kill a real guest's lifecycle (the 9th-instance fix). The guarantee that
    // no OTA guest is messaged lives in the SENDER, which re-reads the mirror
    // before every send. Refusing to send is reversible; destroying is not.
    const scheduled = await rows();
    expect(scheduled).toHaveLength(5);
    expect(scheduled.every((r) => r.status === 'pending')).toBe(true);
  });

  it('and the SENDER is the one that refuses it — no OTA guest is messaged', async () => {
    const no = await seed();
    await scheduleForBooking(deps(), no);
    await openWindow();
    // Re-source WITHOUT re-running the scheduler — simulating a lost event.
    await db.execute(sql`UPDATE bookings_mirror SET source = 'Airbnb'`);

    const { wa, sent } = makeWa();
    const result = await runSender(senderDeps(wa));

    expect(sent).toHaveLength(0); // THE guarantee: nothing reaches the OTA guest
    expect(result).toMatchObject({ deferred: 1, sent: 0 });
    const [row] = await db.select().from(scheduledMessages).where(sql`kind = 'confirmation'`);
    expect(row?.skipReason).toBe('source_not_allowed');
    expect(row?.status).toBe('pending'); // deferred, not burned — the field may be corrected
  });
});

describe('🚨 a stay that actually HAPPENS still gets its welcome and thank-you', () => {
  // The original code re-used the SCHEDULING allowlist (confirmed|modified) at
  // send time, so the moment a real stay advanced to checked_in / checked_out —
  // which is what happens to every stay that occurs — the welcome, thank-you and
  // win-back were all killed. Permanently: `skipped` is terminal.
  it.each(['checked_in', 'checked_out'] as const)('sends for a %s booking', async (status) => {
    const no = await seed();
    await scheduleForBooking(deps(), no);
    await openWindow();
    await db.execute(sql`UPDATE bookings_mirror SET status = ${status}`);

    const { wa, sent } = makeWa();
    const result = await runSender(senderDeps(wa));

    expect(result).toMatchObject({ sent: 1, skipped: 0 });
    expect(sent).toHaveLength(1);
  });

  it.each(['cancelled', 'no_show'] as const)('but NOT for a %s booking', async (status) => {
    const no = await seed();
    await scheduleForBooking(deps(), no);
    await openWindow();
    await db.execute(sql`UPDATE bookings_mirror SET status = ${status}`);

    const { wa, sent } = makeWa();
    expect(await runSender(senderDeps(wa))).toMatchObject({ skipped: 1, sent: 0 });
    expect(sent).toHaveLength(0);
  });

  it('an "unknown" status DEFERS — a flapping hold must not burn the confirmation', async () => {
    const no = await seed();
    await scheduleForBooking(deps(), no);
    await openWindow();
    await db.execute(sql`UPDATE bookings_mirror SET status = 'unknown'`);

    const { wa } = makeWa();
    expect(await runSender(senderDeps(wa))).toMatchObject({ deferred: 1, skipped: 0 });

    const [row] = await db.select().from(scheduledMessages).where(sql`kind = 'confirmation'`);
    expect(row?.status).toBe('pending'); // still deliverable when eZee re-confirms
  });
});

describe('🚨 a transient fault must never destroy a message', () => {
  it('a Graph failure marks the row failed, alerts, and does not pretend it sent', async () => {
    const no = await seed();
    await scheduleForBooking(deps(), no);
    await openWindow();
    const wa = createWaClient({
      db,
      log: { error: vi.fn(), warn: vi.fn() },
      graphBaseUrl: 'https://graph.test.invalid/v23.0',
      phoneNumberId: '000000000000000',
      accessToken: 'test-token',
      templateMode: 'simulate',
      httpImpl: async () =>
        new Response(JSON.stringify({ error: { message: 'busy', code: 131026 } }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }),
    });

    const result = await runSender(senderDeps(wa));

    expect(result).toMatchObject({ failed: 1, sent: 0 });
    const [row] = await db.select().from(scheduledMessages).where(sql`kind = 'confirmation'`);
    expect(row?.status).toBe('failed'); // NOT 'skipped' — the counters and the DB agree
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ opsAlert: 'lifecycle_send_failed' }),
      expect.stringContaining('[OPS-ALERT]'),
    );
  });

  it('a thrown error DEFERS the row rather than resolving it', async () => {
    const no = await seed();
    await scheduleForBooking(deps(), no);
    await openWindow();
    const wa = {
      planTemplatedSend: () => {
        throw new Error('pool exhausted');
      },
      dispatchTemplated: vi.fn(),
      createSendIntent: vi.fn(),
    } as unknown as ReturnType<typeof makeWa>['wa'];

    const result = await runSender(senderDeps(wa));

    expect(result).toMatchObject({ deferred: 1, sent: 0, skipped: 0 });
    const [row] = await db.select().from(scheduledMessages).where(sql`kind = 'confirmation'`);
    // A database wobble is not a decision that this guest must not be messaged.
    expect(row?.status).toBe('pending');
    expect(row?.skipReason).toBe('transient_error');
  });

  it('a message too old to be true is skipped, not delivered late', async () => {
    const no = await seed();
    await scheduleForBooking(deps(), no);
    await openWindow();
    // ONLY the confirmation: its planned moment IS the booking event, so age is
    // what makes it untrue. A pre-arrival's is anchored 3 days BEFORE the
    // arrival it narrates, so age says nothing about it — see TRUTH.
    await db.execute(
      sql`UPDATE scheduled_messages SET send_at = ${hoursBefore(40)} WHERE kind = 'confirmation'`,
    );

    const { wa, sent } = makeWa();
    const result = await runSender(senderDeps(wa));

    expect(sent).toHaveLength(0);
    expect(result.skipped).toBeGreaterThan(0);
    const [row] = await db.select().from(scheduledMessages).where(sql`kind = 'confirmation'`);
    expect(row?.skipReason).toBe('stale');
  });
});

describe('🚨 a human holding the thread pauses the lifecycle too', () => {
  it('defers while human_active_until is in the future', async () => {
    const no = await seed();
    await scheduleForBooking(deps(), no);
    await openWindow();
    await db.execute(
      sql`UPDATE conversations SET human_active_until = ${hoursAfter(2)}, status = 'human_active'`,
    );

    const { wa, sent } = makeWa();
    const result = await runSender(senderDeps(wa));

    expect(sent).toHaveLength(0);
    expect(result).toMatchObject({ deferred: 1, sent: 0 });
    const [row] = await db.select().from(scheduledMessages).where(sql`kind = 'confirmation'`);
    expect(row?.status).toBe('pending');
    expect(row?.skipReason).toBe('human_active');
  });
});

describe('the win-back cap (§2.3: fewer than 2 in the trailing 365 days)', () => {
  it('refuses a third win-back inside the year', async () => {
    const no = await seed();
    await scheduleForBooking(deps(), no);
    await openWindow();
    await db.execute(sql`UPDATE guests SET marketing_opt_in = true`);
    const [guest] = await db.select().from(schema.guests);

    // Two already sent this year.
    for (const n of [1, 2]) {
      await db.insert(scheduledMessages).values({
        guestId: guest?.id as string,
        kind: 'winback',
        templateName: 'nst_winback_v1',
        params: {},
        sendAt: new Date(),
        status: 'sent',
        dedupeKey: `winback:old-${n}`,
      });
    }
    await db.execute(
      sql`UPDATE scheduled_messages SET send_at = ${hoursBefore(1)} WHERE kind = 'winback' AND dedupe_key = 'winback:953'`,
    );

    const { wa } = makeWa();
    await runSender(senderDeps(wa));

    const [row] = await db
      .select()
      .from(scheduledMessages)
      .where(sql`dedupe_key = 'winback:953'`);
    expect(row?.status).toBe('skipped');
    expect(row?.skipReason).toBe('winback_cap_reached');
  });
});

describe('guest-facing text', () => {
  it('the welcome offers no breakfast — the tariff is accommodation only', () => {
    const body = renderTemplate('welcome', { firstName: 'Rahul', villaType: 'Nistula Villa' });
    expect(body.toLowerCase()).not.toContain('breakfast');
  });

  it('a ₹ figure in a PARAM is refused — the money rule, in the slot', () => {
    // The body-level test scans the {{1}} skeleton and could never catch this.
    expect(() =>
      renderTemplate('welcome', { firstName: '₹5,000', villaType: 'Nistula Villa' }),
    ).toThrow();
  });

  it('a HOUSE name in a PARAM is refused (OQ-19), even if eZee renames a room type', () => {
    expect(() =>
      renderTemplate('welcome', { firstName: 'Rahul', villaType: 'Nistula Villa B1' }),
    ).toThrow();
  });

  it('a URL in a param is refused', () => {
    expect(() =>
      renderTemplate('welcome', { firstName: 'https://evil.test', villaType: 'Nistula Villa' }),
    ).toThrow();
  });

  it('does not say "Nistula 4BHK Siolim in Siolim"', () => {
    const row = {
      ezeeReservationNo: '999',
      guestName: 'Rahul Mehta',
      roomTypeName: 'Nistula 4BHK Siolim',
      checkIn: '2026-12-20',
      checkOut: '2026-12-22',
      status: 'confirmed',
      raw: {},
      physicalRoomLabel: null,
    } as unknown as BookingMirror;
    const stay = project(row, [row], TODAY);
    if (!stay.describable) throw new Error('fixture undescribable');
    const { sends } = planSends(row, stay);
    const confirmation = sends.find((s) => s.kind === 'confirmation');
    expect(confirmation?.params.villaType).toBe('Nistula 4BHK');
    expect(confirmation?.params.locality).toBe('Siolim');
  });

  it('title-cases a SHOUTING OTA name and refuses a placeholder one', () => {
    const base = {
      ezeeReservationNo: '999',
      roomTypeName: 'Nistula Apartment',
      checkIn: '2026-12-20',
      checkOut: '2026-12-22',
      status: 'confirmed',
      raw: {},
      physicalRoomLabel: null,
    };
    const shouting = { ...base, guestName: 'RAJESH KUMAR' } as unknown as BookingMirror;
    const stay = project(shouting, [shouting], TODAY);
    if (!stay.describable) throw new Error('undescribable');
    expect(planSends(shouting, stay).sends[0]?.params.firstName).toBe('Rajesh');

    const placeholder = { ...base, guestName: 'Walk in guest' } as unknown as BookingMirror;
    expect(planSends(placeholder, stay).issue).toBe('no_guest_name');
  });

});

describe('phone_windows', () => {
  it('uses Metas own timestamp, so a redelivered old webhook cannot re-open a window', () => {
    const meta = inboundTimestamp('1783000000');
    expect(meta.getTime()).toBe(1783000000 * 1000);
    expect(inboundTimestamp(undefined).getTime()).toBeGreaterThan(0); // tolerant fallback
    expect(inboundTimestamp('nonsense').getTime()).toBeGreaterThan(0);
  });
});
