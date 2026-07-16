/**
 * CH-12 · round 7 — THE TENTH INSTANCE, and the proof that was deleted.
 *
 * The recurring class: A RULE WRITTEN FROM THE SHAPE OF THE DATA RATHER THAN THE
 * CONTRACT IT STANDS FOR. Round 6 correctly made every planned instant immutable
 * (derived from a fact of the booking, never from `now`) so the staleness clock
 * would be real. It then judged EVERY kind by that one clock — and `send_at` is
 * only a measure of a message's truth for a body whose planned moment IS the
 * event it narrates.
 *
 * The pre-arrival's moment is anchored three days BEFORE the arrival it talks
 * about. So a booking made inside that window was BORN 50 hours "stale" and was
 * skipped on the sender's first tick — permanently, since a skip is terminal.
 * Every last-minute booking, the valuable ones, silently lost the only message
 * that asks for an arrival time or promises the location pin. plan.md §8 ("send
 * now instead") and runbook.md ("otherwise the last-minute bookings … would be
 * the ones silently skipped") both mandate the opposite.
 *
 * The suite stayed green through all of it, because the test that proved this
 * exact behaviour was deleted in the same commit and replaced with one asserting
 * only that `sendAt < NOW` — DUE-ness, not outcome. Due, yes; sent, no. Its
 * fixture sat at 31.5h, just under the 36h line. So these tests assert the
 * OUTCOME, and drive handleBookingEvent — the real event path production uses.
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
import { handleBookingEvent, type SchedulerDeps } from '../src/lifecycle/scheduler.js';
import { runSender, type SenderDeps } from '../src/lifecycle/sender.js';
import { createWaClient } from '../src/wa/client.js';
import { TEST_URL } from './helpers/boss.js';

/**
 * ONE FIXED INSTANT at a civil hour, and every fixture derived from it — so the
 * suite cannot pass or fail by the hour it happens to run (round 7's other
 * finding: the guest-quiet window turned main red every night from ten).
 */
const NOW = new Date('2026-07-16T06:30:00Z'); // 12:00 IST, 16 Jul
const TODAY = '2026-07-16';
const hoursBefore = (n: number): string =>
  new Date(NOW.getTime() - n * 3_600_000).toISOString();

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

function makeWa() {
  const sent: { body: string }[] = [];
  const wa = createWaClient({
    db,
    log: { error: vi.fn(), warn: vi.fn() },
    graphBaseUrl: 'https://graph.test.invalid/v23.0',
    phoneNumberId: '000000000000000',
    accessToken: 'test-token',
    templateMode: 'simulate',
    httpImpl: async (_u, o) => {
      const parsed = JSON.parse(o?.body ?? '{}') as { text?: { body?: string } };
      sent.push({ body: parsed.text?.body ?? '' });
      return new Response(JSON.stringify({ messages: [{ id: `wamid.R3-${sent.length}` }] }), {
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
      roomTypeName: 'Nistula Villa',
      checkIn: '2026-12-20',
      checkOut: '2026-12-22',
      status: 'confirmed',
      source: 'Internet Booking Engine',
      raw: {},
      syncedAt: NOW,
      createdAt: NOW, // the booking lands in the mirror at the suite's clock
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

const rowOf = async (kind: string) =>
  (await db.select().from(scheduledMessages).where(sql`kind = ${kind}`))[0];

/* ── 🚨 THE TENTH INSTANCE ─────────────────────────────────────────────────── */

describe('🚨 a LAST-MINUTE booking still gets its pre-arrival (the deleted proof, restored)', () => {
  it('books 16 Jul for a 17 Jul arrival: the pre-arrival is SENT, not skipped stale', async () => {
    // T−3 was 14 Jul — 50 hours before this booking existed. Its planned moment
    // is therefore born in the past, and a plan-age rule called it stale on the
    // first tick. But "we are looking forward to welcoming you on Friday" is
    // entirely TRUE on the Thursday, and that is the only question that matters.
    await handleBookingEvent(
      deps(),
      'created',
      await seed({ checkIn: '2026-07-17', checkOut: '2026-07-19' }),
    );
    await openWindow();
    const { wa, sent } = makeWa();

    await runSender(senderDeps(wa));

    const prearrival = await rowOf('prearrival');
    expect(prearrival?.status).toBe('sent'); // the OUTCOME — not merely "due"
    expect(prearrival?.skipReason).not.toBe('stale');
    expect(sent.some((s) => s.body.includes('looking forward to welcoming you'))).toBe(true);
  });

  it('books ON the arrival morning: the welcome is SENT', async () => {
    await handleBookingEvent(
      deps(),
      'created',
      await seed({ checkIn: TODAY, checkOut: '2026-07-18' }),
    );
    await openWindow();
    const { wa, sent } = makeWa();

    await runSender(senderDeps(wa));

    expect((await rowOf('welcome'))?.status).toBe('sent');
    expect(sent.some((s) => s.body.includes('is ready for you today'))).toBe(true);
  });
});

/* ── the other half of the contract: an UNTRUE message must still be refused ── */

describe('a body IS refused once its own claim has expired', () => {
  /** Arrived on the 10th, leaving on the 20th: mid-stay. The stay-over backstop
   * (check_out < today) CANNOT catch this — only each body's own claim can. */
  async function midStay(): Promise<void> {
    await handleBookingEvent(
      deps(),
      'created',
      await seed({ checkIn: '2026-07-17', checkOut: '2026-07-19' }),
    );
    await db.execute(
      sql`UPDATE bookings_mirror SET check_in = '2026-07-10', check_out = '2026-07-20'`,
    );
    await db.execute(sql`UPDATE scheduled_messages SET send_at = ${hoursBefore(1)}`);
    await openWindow();
  }

  it('"looking forward to welcoming you" is NOT SENT once the guest has arrived', async () => {
    await midStay();
    const { wa, sent } = makeWa();

    await runSender(senderDeps(wa));

    const prearrival = await rowOf('prearrival');
    expect(sent.some((s) => s.body.includes('looking forward to welcoming you'))).toBe(false);
    // DEFERRED, not skipped: check_in is mutable, so "they have arrived" is a
    // fact that can be taken back — and a terminal verdict could not be.
    expect(prearrival?.status).toBe('pending');
    expect(prearrival?.skipReason).toBe('guest_already_arrived');
  });

  it('"ready for you today" is NOT SENT once the arrival day has passed', async () => {
    await midStay();
    const { wa, sent } = makeWa();

    await runSender(senderDeps(wa));

    const welcome = await rowOf('welcome');
    expect(sent.some((s) => s.body.includes('is ready for you today'))).toBe(false);
    expect(welcome?.status).toBe('pending');
    expect(welcome?.skipReason).toBe('arrival_day_passed');
  });

  it('...and once the stay is WHOLLY past, they are terminally skipped (the bound)', async () => {
    // The fact that cannot come back. Deferring on check_in would otherwise leave
    // these rows pending for ever — `stay_over` is what resolves them for real,
    // and it is checked ABOVE TRUTH precisely so it can.
    await handleBookingEvent(
      deps(),
      'created',
      await seed({ checkIn: '2026-07-17', checkOut: '2026-07-19' }),
    );
    await db.execute(
      sql`UPDATE bookings_mirror SET check_in = '2026-07-01', check_out = '2026-07-03'`,
    );
    await db.execute(sql`UPDATE scheduled_messages SET send_at = ${hoursBefore(1)}`);
    await openWindow();
    const { wa } = makeWa();

    await runSender(senderDeps(wa));

    expect((await rowOf('prearrival'))?.status).toBe('skipped');
    expect((await rowOf('prearrival'))?.skipReason).toBe('stay_over');
  });

  it('the CONFIRMATION still goes stale at 36h — round 6’s guard is intact', async () => {
    await handleBookingEvent(deps(), 'created', await seed());
    await openWindow();
    await db.execute(
      sql`UPDATE scheduled_messages SET send_at = ${hoursBefore(40)} WHERE kind = 'confirmation'`,
    );
    const { wa } = makeWa();

    await runSender(senderDeps(wa));

    const confirmation = await rowOf('confirmation');
    expect(confirmation?.status).toBe('skipped');
    expect(confirmation?.skipReason).toBe('stale');
  });
});

/* ── 🚨 THE ELEVENTH INSTANCE ──────────────────────────────────────────────── */

describe('🚨 a MISTYPED arrival date, corrected, must not have destroyed anything', () => {
  it('a check_in typo that lived for one tick does not cost the guest their pre-arrival', async () => {
    // The front desk amends the arrival and fat-fingers it into the past.
    // check_in is a MIRROR_DIFF_FIELD, so the poller mirrors it within 60s and
    // emits booking.modified; the re-plan drags prearrival/welcome send_at into
    // the past and the sender picks them up on the next minutely tick — long
    // before any human notices. check_out is untouched, so the stay_over
    // backstop cannot fire. A TERMINAL verdict here was unrecoverable: the
    // correcting event is a no-op, because the upsert only touches 'pending'.
    const no = await seed({ checkIn: '2026-08-01', checkOut: '2026-08-05' });
    await handleBookingEvent(deps(), 'created', no);
    await openWindow();

    await db.execute(sql`UPDATE bookings_mirror SET check_in = '2026-07-01'`); // the typo
    await handleBookingEvent(deps(), 'modified', no);
    const { wa: wa1 } = makeWa();
    await runSender(senderDeps(wa1)); // the tick that used to kill them

    expect((await rowOf('prearrival'))?.status).toBe('pending');
    expect((await rowOf('welcome'))?.status).toBe('pending');

    // The desk fixes it. The rows must still be alive to hear about it.
    await db.execute(sql`UPDATE bookings_mirror SET check_in = '2026-08-01'`);
    await handleBookingEvent(deps(), 'modified', no);

    const prearrival = await rowOf('prearrival');
    expect(prearrival?.status).toBe('pending');
    // Re-planned back onto its true instant: check-in −3d = 29 Jul, 10:00 IST.
    expect(prearrival?.sendAt.toISOString()).toBe('2026-07-29T04:30:00.000Z');
    expect((await rowOf('welcome'))?.sendAt.toISOString()).toBe('2026-08-01T03:30:00.000Z');
  });
});

/* ── the win-back: consent governs it, never the age of the plan ───────────── */

describe('the win-back has NO plan-age bound', () => {
  it('a win-back whose planned moment is 100 days past still sends to an opted-in guest', async () => {
    // Planned check-out +75d and deliberately unhurried: nothing about "the
    // season is turning in Goa" expires. A plan-age rule here could only ever
    // destroy a perfectly valid win-back — consent and the 2-per-365d cap are
    // what govern it.
    await handleBookingEvent(deps(), 'created', await seed());
    await openWindow();
    await db.execute(sql`UPDATE guests SET marketing_opt_in = true`);
    await db.execute(
      sql`UPDATE scheduled_messages SET send_at = ${hoursBefore(24 * 100)} WHERE kind = 'winback'`,
    );
    const { wa } = makeWa();

    await runSender(senderDeps(wa));

    const winback = await rowOf('winback');
    expect(winback?.skipReason).not.toBe('stale');
    expect(winback?.status).toBe('sent');
  });
});
