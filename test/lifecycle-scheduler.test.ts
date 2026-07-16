/**
 * CH-12 · the scheduler — the §2.3 timing matrix and the idempotency contract.
 *
 * planSends is pure (booking + now → send instants), so the timing matrix needs
 * no database and no fake clock. The DB half proves the one thing a pure
 * function cannot: that a modified booking RESCHEDULES its pending rows rather
 * than duplicating them, and that a cancellation clears what has not gone yet.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { project, type DescribedStay } from '../src/brain/stayView.js';
import type { BookingMirror } from '../src/db/bookings.js';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { scheduledMessages } from '../src/db/schema.js';
import type { GateContext } from '../src/lifecycle/gates.js';
import {
  cancelForBooking,
  planSends,
  scheduleForBooking,
  type SchedulerDeps,
} from '../src/lifecycle/scheduler.js';
import { TEST_URL } from './helpers/boss.js';

const TODAY = '2026-07-14';
const NOW = new Date('2026-07-14T12:00:00Z'); // 17:30 IST
const EPOCH = new Date('2026-07-14T00:00:00Z');
const GATES: GateContext = {
  epoch: EPOCH,
  today: TODAY,
  sources: ['internet booking engine', 'walk-in'],
};

function row(over: Partial<BookingMirror> = {}): BookingMirror {
  return {
    id: 'b0000000-0000-4000-8000-000000000001',
    ezeeReservationNo: '953',
    ezeeBookingTranId: '5220300000000000900',
    guestName: 'Rahul Mehta',
    guestPhone: '+917700900501',
    guestEmail: 'rahul@example.test',
    roomTypeId: '5220300000000000003',
    roomTypeName: 'Nistula Villa',
    physicalRoomLabel: 'Villa B3', // present, and NEVER spoken (OQ-19)
    rateplanId: '5220300000000000006',
    checkIn: '2026-12-20',
    checkOut: '2026-12-22',
    adults: 4,
    children: 0,
    status: 'confirmed',
    source: 'Internet Booking Engine',
    amount: '13854.75',
    currency: 'INR',
    raw: {},
    syncedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  } as BookingMirror;
}

const stayOf = (r: BookingMirror): DescribedStay => {
  const v = project(r, [r], TODAY);
  if (!v.describable) throw new Error(`fixture is undescribable: ${v.reason}`);
  return v;
};

const plan = (r: BookingMirror) => planSends(r, stayOf(r));
const byKind = (r: BookingMirror) => Object.fromEntries(plan(r).sends.map((s) => [s.kind, s]));

describe('planSends — the §2.3 timing matrix (pure)', () => {
  it('schedules all five kinds', () => {
    expect(plan(row()).sends.map((s) => s.kind)).toEqual([
      'confirmation',
      'prearrival',
      'welcome',
      'poststay',
      'winback',
    ]);
  });

  it("confirmation's moment is when the booking entered our mirror — NOT `now`", () => {
    // Immutable: a re-plan (every hourly sweep) must compute the same instant, or
    // the staleness clock resets for ever and the 36h guard can never fire.
    expect(byKind(row()).confirmation?.sendAt).toEqual(NOW); // the fixture's createdAt
    expect(byKind(row({ createdAt: new Date('2026-07-14T04:00:00Z') })).confirmation?.sendAt).toEqual(
      new Date('2026-07-14T04:00:00Z'),
    );
  });

  it('is IDEMPOTENT — re-planning the same booking yields identical instants', () => {
    const r = row();
    const a = plan(r).sends.map((s) => s.sendAt.toISOString());
    const b = plan(r).sends.map((s) => s.sendAt.toISOString());
    expect(a).toEqual(b); // nothing is derived from `now`
  });

  it('pre-arrival is check-in −3d at 10:00 IST (= 04:30 UTC)', () => {
    // check-in 20 Dec → 17 Dec 10:00 IST → 17 Dec 04:30 UTC.
    expect(byKind(row()).prearrival?.sendAt.toISOString()).toBe('2026-12-17T04:30:00.000Z');
  });

  it('welcome is check-in day at 09:00 IST (= 03:30 UTC)', () => {
    expect(byKind(row()).welcome?.sendAt.toISOString()).toBe('2026-12-20T03:30:00.000Z');
  });

  it('thank-you is check-out +1d at 11:00 IST (= 05:30 UTC)', () => {
    expect(byKind(row()).poststay?.sendAt.toISOString()).toBe('2026-12-23T05:30:00.000Z');
  });

  it('win-back is check-out +75d at 11:00 IST', () => {
    // 22 Dec 2026 + 75d = 7 Mar 2027.
    expect(byKind(row()).winback?.sendAt.toISOString()).toBe('2027-03-07T05:30:00.000Z');
  });

  it('a booking made INSIDE the 3-day window keeps its TRUE pre-arrival moment (already past)', () => {
    // Books on 14 Jul for a 16 Jul arrival: T−3 was 13 Jul, already gone. The
    // instant is NOT rewritten to `now` — the sender's `send_at <= now` query
    // makes it due immediately anyway, and keeping the true moment is what lets
    // the stale guard know how late it is. (Rewriting it reset the clock and
    // let a guest receive the whole pre-stay sequence at once, days late.)
    const r = row({ checkIn: '2026-07-16', checkOut: '2026-07-18' });
    expect(byKind(r).prearrival?.sendAt.toISOString()).toBe('2026-07-13T04:30:00.000Z');
    expect(byKind(r).prearrival!.sendAt.getTime()).toBeLessThan(NOW.getTime()); // due now
  });

  it('a booking made ON the arrival morning keeps the 09:00 welcome moment', () => {
    const r = row({ checkIn: TODAY, checkOut: '2026-07-16' });
    expect(byKind(r).welcome?.sendAt.toISOString()).toBe('2026-07-14T03:30:00.000Z');
  });

  it('dedupe keys are kind:reference, on the reference BASE', () => {
    // A multi-room cancel arrives as 877-1/-2/-3; all must key to one booking.
    const r = row({ ezeeReservationNo: '877-2' });
    expect(byKind(r).confirmation?.dedupeKey).toBe('confirmation:877');
    expect(byKind(r).welcome?.dedupeKey).toBe('welcome:877');
  });

  it('NEVER puts the house in the params — the type only (OQ-19)', () => {
    // The fixture's mirror row carries physical_room_label 'Villa B3'.
    const params = plan(row()).sends.flatMap((s) => Object.values(s.params));
    expect(params).not.toContain('Villa B3');
    expect(byKind(row()).confirmation?.params.villaType).toBe('Nistula Villa');
    expect(byKind(row()).confirmation?.params.locality).toBe('Assagao');
  });

  it('NEVER puts a ₹ figure in the params', () => {
    const params = plan(row()).sends.flatMap((s) => Object.values(s.params)).join(' ');
    expect(params).not.toContain('₹');
    expect(params).not.toContain('13854'); // the amount is on the row, and stays there
  });

  it('locates Siolim in Siolim and Assagao in Assagao', () => {
    const siolim = row({ roomTypeName: 'Nistula 4BHK Siolim' });
    expect(byKind(siolim).confirmation?.params.locality).toBe('Siolim');
  });

  it('refuses to guess a locality for an unknown villa type', () => {
    const odd = row({ roomTypeName: 'Mystery Suite' });
    expect(plan(odd)).toEqual({ sends: [], issue: 'unknown_villa_type' });
  });

  it('refuses to schedule a booking with no guest name — nothing to address', () => {
    expect(plan(row({ guestName: null }))).toEqual({ sends: [], issue: 'no_guest_name' });
  });
});

/* ── the DB half ─────────────────────────────────────────────────────────── */

describe('scheduleForBooking / cancelForBooking', () => {
  let client: ReturnType<typeof postgres>;
  let db: Db;
  let deps: SchedulerDeps;
  const logged: Record<string, unknown>[] = [];

  beforeAll(async () => {
    client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
    db = drizzle(client, { schema }) as unknown as Db;
    deps = {
      db,
      gates: GATES,
      log: {
        info: (o) => logged.push(o),
        warn: (o) => logged.push(o),
        error: (o) => logged.push(o),
      },
    };
  }, 30_000);

  afterAll(async () => {
    await client?.end();
  });

  beforeEach(async () => {
    logged.length = 0;
    await db.execute(
      sql`TRUNCATE scheduled_messages, guest_stays, bookings_mirror, messages, conversations, guests CASCADE`,
    );
  });

  /** Put a real mirror row in the DB and return its reservation number. */
  async function seedBooking(over: Partial<BookingMirror> = {}): Promise<string> {
    const r = row(over);
    const [inserted] = await db
      .insert(schema.bookingsMirror)
      .values({
        ezeeReservationNo: r.ezeeReservationNo,
        guestName: r.guestName,
        guestPhone: r.guestPhone,
        roomTypeName: r.roomTypeName,
        physicalRoomLabel: r.physicalRoomLabel,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        adults: r.adults,
        status: r.status,
        source: r.source,
        amount: r.amount,
        raw: r.raw,
        syncedAt: r.syncedAt,
        createdAt: r.createdAt,
      })
      .returning();
    if (inserted === undefined) throw new Error('seed failed');
    return inserted.ezeeReservationNo;
  }

  const rows = async () =>
    db.select().from(scheduledMessages).orderBy(scheduledMessages.dedupeKey);

  it('schedules five rows and creates the guest from mirror data', async () => {
    const res = await scheduleForBooking(deps, await seedBooking());
    expect(res).toEqual({ scheduled: 5, skipped: null });

    const scheduled = await rows();
    expect(scheduled).toHaveLength(5);
    expect(scheduled.every((s) => s.status === 'pending')).toBe(true);

    // The guest never messaged us — the scheduler is the only thing that could
    // have created them (superseding CH-10's no-auto-creation).
    const [guest] = await db.select().from(schema.guests);
    expect(guest?.phone).toBe('+917700900501');
    expect(guest?.firstName).toBe('Rahul');
    expect(guest?.waProfileName).toBeNull(); // never from a booking

    // ...and they have a conversation, so their reply threads normally.
    const [convo] = await db.select().from(schema.conversations);
    expect(convo?.guestId).toBe(guest?.id);
  });

  it('is idempotent — a repeat event does not duplicate rows', async () => {
    const no = await seedBooking();
    await scheduleForBooking(deps, no);
    await scheduleForBooking(deps, no);
    expect(await rows()).toHaveLength(5);
  });

  it('RESCHEDULES a pending row when the dates move — never duplicates it', async () => {
    const no = await seedBooking();
    await scheduleForBooking(deps, no);
    const before = (await rows()).find((r) => r.kind === 'prearrival');
    expect(before?.sendAt.toISOString()).toBe('2026-12-17T04:30:00.000Z');

    // The guest moves the stay a week later; the poller mirrors it.
    await db
      .update(schema.bookingsMirror)
      .set({ checkIn: '2026-12-27', checkOut: '2026-12-29', status: 'modified' })
      .where(sql`ezee_reservation_no = ${no}`);
    await scheduleForBooking(deps, no);

    const after = await rows();
    expect(after).toHaveLength(5); // still five
    const prearrival = after.find((r) => r.kind === 'prearrival');
    expect(prearrival?.id).toBe(before?.id); // the same row...
    expect(prearrival?.sendAt.toISOString()).toBe('2026-12-24T04:30:00.000Z'); // ...moved
  });

  it('never resurrects a row that has already been sent', async () => {
    const no = await seedBooking();
    await scheduleForBooking(deps, no);
    await db
      .update(scheduledMessages)
      .set({ status: 'sent' })
      .where(sql`kind = 'confirmation'`);

    await scheduleForBooking(deps, no); // a modify arrives afterwards
    const confirmation = (await rows()).find((r) => r.kind === 'confirmation');
    expect(confirmation?.status).toBe('sent'); // stays sent; not re-queued
  });

  it('cancels every pending send when the booking is cancelled', async () => {
    const no = await seedBooking();
    await scheduleForBooking(deps, no);
    await db.update(scheduledMessages).set({ status: 'sent' }).where(sql`kind = 'confirmation'`);

    const { cancelled } = await cancelForBooking(deps, no);
    expect(cancelled).toBe(4); // the four still pending

    const after = await rows();
    expect(after.find((r) => r.kind === 'confirmation')?.status).toBe('sent'); // un-sendable
    expect(after.filter((r) => r.status === 'cancelled')).toHaveLength(4);
    expect(after.find((r) => r.kind === 'welcome')?.skipReason).toBe('booking_cancelled');
  });

  it('a multi-room cancel (877-1) clears the rows scheduled under the base 877', async () => {
    const no = await seedBooking({ ezeeReservationNo: '877' });
    await scheduleForBooking(deps, no);
    // eZee delivers the full cancel as suffixed entries with no bare entry.
    const { cancelled } = await cancelForBooking(deps, '877-2');
    expect(cancelled).toBe(5);
  });

  it('THE GATES HOLD through the real code path: an Airbnb guest gets nothing', async () => {
    const no = await seedBooking({ source: 'Airbnb', guestPhone: '+917700900777' });
    expect(await scheduleForBooking(deps, no)).toEqual({
      scheduled: 0,
      skipped: 'source_not_allowed',
    });
    expect(await rows()).toHaveLength(0);
    expect(await db.select().from(schema.guests)).toHaveLength(0); // not even a guest row
  });

  it('a historical booking gets nothing, even though it is confirmed', async () => {
    const no = await seedBooking({
      createdAt: new Date('2026-07-13T05:00:00Z'), // pre-epoch
      checkIn: '2026-03-01',
      checkOut: '2026-03-04',
    });
    expect((await scheduleForBooking(deps, no)).skipped).toBe('before_epoch');
    expect(await rows()).toHaveLength(0);
  });

  it('a booking with no phone gets nothing, and says so', async () => {
    const no = await seedBooking({ guestPhone: null });
    expect((await scheduleForBooking(deps, no)).skipped).toBe('no_phone');
    expect(logged.some((l) => l.opsAlert === 'lifecycle_no_phone')).toBe(true);
  });

  it('a booking stayView will not describe gets nothing rather than a guess', async () => {
    const no = await seedBooking({ raw: { BookingTran: [{ a: 1 }, { b: 2 }] } }); // multi-room
    expect((await scheduleForBooking(deps, no)).skipped).toBe('undescribable:multi_room');
    expect(await rows()).toHaveLength(0);
  });

  it('a missing mirror row is a warning, not a crash', async () => {
    expect(await scheduleForBooking(deps, 'nope')).toEqual({
      scheduled: 0,
      skipped: 'no_mirror_row',
    });
  });
});
