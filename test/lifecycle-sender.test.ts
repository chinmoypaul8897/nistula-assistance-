/**
 * CH-12 · the sender and the hourly sweep.
 *
 * Two things are proven here that nothing else can prove:
 *
 *  1. THE SWEEP DOES NOT RE-DERIVE HISTORY. It reads bookings_mirror, which
 *     holds 123 historical bookings CH-11's reconcile hydrated into it. Purging
 *     the queued booking.* jobs does NOT protect anyone from that — the sweep
 *     would recreate the work within the hour. The gates are the only defence
 *     that survives it, so the sweep is tested against a mirror shaped like the
 *     real one.
 *
 *  2. THE SEND IS ATOMIC. The message row is committed 'queued' BEFORE the Graph
 *     call, in the same transaction that claims the scheduled row — so a crash
 *     can neither lose a message nor send one twice.
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
import { runReconcile } from '../src/lifecycle/reconcile.js';
import { scheduleForBooking, type SchedulerDeps } from '../src/lifecycle/scheduler.js';
import { runSender, type SenderDeps } from '../src/lifecycle/sender.js';
import { createWaClient, type TemplateMode } from '../src/wa/client.js';
import { TEST_URL } from './helpers/boss.js';

const TODAY = '2026-07-14';
const EPOCH = new Date('2026-07-14T00:00:00Z');
const GATES: GateContext = {
  epoch: EPOCH,
  today: TODAY,
  sources: ['internet booking engine', 'walk-in'],
};
const PHONE = '+917700900501';

let client: ReturnType<typeof postgres>;
let db: Db;
const logged: Record<string, unknown>[] = [];
const log = {
  info: (o: Record<string, unknown>) => logged.push(o),
  warn: (o: Record<string, unknown>) => logged.push(o),
  error: (o: Record<string, unknown>) => logged.push(o),
};

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema }) as unknown as Db;
}, 30_000);

afterAll(async () => {
  await client?.end();
});

beforeEach(async () => {
  logged.length = 0;
  await db.execute(
    sql`TRUNCATE scheduled_messages, phone_windows, cost_events, guest_stays, bookings_mirror, messages, conversations, guests CASCADE`,
  );
});

const schedulerDeps = (): SchedulerDeps => ({ db, log, gates: GATES });

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
      return new Response(JSON.stringify({ messages: [{ id: `wamid.LC-${sent.length}` }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });
  return { wa, sent };
}

const senderDeps = (wa: ReturnType<typeof makeWa>['wa'], enabled = true): SenderDeps => ({
  db,
  log,
  wa,
  enabled,
});

async function seedBooking(over: Partial<BookingMirror> = {}): Promise<string> {
  const r = {
    ezeeReservationNo: '953',
    guestName: 'Rahul Mehta',
    guestPhone: PHONE,
    roomTypeName: 'Nistula Villa',
    checkIn: '2026-12-20',
    checkOut: '2026-12-22',
    adults: 4,
    status: 'confirmed' as const,
    source: 'Internet Booking Engine',
    amount: '13854.75',
    raw: {},
    syncedAt: new Date('2026-07-14T13:00:00Z'),
    createdAt: new Date('2026-07-14T13:00:00Z'),
    ...over,
  };
  const [row] = await db.insert(schema.bookingsMirror).values(r).returning();
  if (row === undefined) throw new Error('seed failed');
  return row.ezeeReservationNo;
}

/** The guest wrote to us at some point — so the window is open and a simulated
 * template can physically go out (the dev test number's real constraint). */
async function openWindow(): Promise<void> {
  await touchPhoneWindow(db, PHONE, new Date());
  await db.execute(sql`UPDATE conversations SET service_window_expires_at = now() + interval '23 hours'`);
}

describe('runSender', () => {
  it('sends the due confirmation and records it as sent', async () => {
    await scheduleForBooking(schedulerDeps(), await seedBooking());
    await openWindow();
    const { wa, sent } = makeWa();

    const result = await runSender(senderDeps(wa));

    expect(result).toMatchObject({ sent: 1, failed: 0 });
    expect(sent).toHaveLength(1); // only the confirmation is due; the rest are future
    const rows = await db.select().from(scheduledMessages);
    const confirmation = rows.find((r) => r.kind === 'confirmation');
    expect(confirmation?.status).toBe('sent');
    expect(confirmation?.sentMessageId).not.toBeNull();

    // The message landed IN the guest's conversation, so their reply threads.
    const [msg] = await db.select().from(schema.messages);
    expect(msg?.status).toBe('sent');
    expect(msg?.conversationId).not.toBeNull();
    expect(msg?.body).toContain('your booking with Nistula is confirmed');
  });

  it('SENDS NOTHING when LIFECYCLE_SEND_ENABLED=0 — rows just wait', async () => {
    await scheduleForBooking(schedulerDeps(), await seedBooking());
    await openWindow();
    const { wa, sent } = makeWa();

    const result = await runSender(senderDeps(wa, false));

    expect(result).toEqual({ attempted: 0, sent: 0, skipped: 0, failed: 0 });
    expect(sent).toHaveLength(0);
    const rows = await db.select().from(scheduledMessages);
    expect(rows.every((r) => r.status === 'pending')).toBe(true); // still deliverable
  });

  it('commits the queued message row BEFORE the Graph call (§3.4)', async () => {
    await scheduleForBooking(schedulerDeps(), await seedBooking());
    await openWindow();
    let midCall: { status: string; waMessageId: string | null } | undefined;
    const wa = createWaClient({
      db,
      log: { error: vi.fn(), warn: vi.fn() },
      graphBaseUrl: 'https://graph.test.invalid/v23.0',
      phoneNumberId: '000000000000000',
      accessToken: 'test-token',
      templateMode: 'simulate',
      httpImpl: async () => {
        const [row] = await db
          .select({ status: schema.messages.status, waMessageId: schema.messages.waMessageId })
          .from(schema.messages);
        midCall = row;
        return new Response(JSON.stringify({ messages: [{ id: 'wamid.ORDER' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    await runSender(senderDeps(wa));
    expect(midCall).toEqual({ status: 'queued', waMessageId: null });
  });

  it('re-reads the MIRROR and refuses to send for a booking cancelled since', async () => {
    const no = await seedBooking();
    await scheduleForBooking(schedulerDeps(), no);
    await openWindow();
    // The booking dies WITHOUT any cancel event reaching us — the sender is the
    // last line of defence, and this is the case it exists for.
    await db.execute(sql`UPDATE bookings_mirror SET status = 'cancelled'`);

    const { wa, sent } = makeWa();
    const result = await runSender(senderDeps(wa));

    expect(sent).toHaveLength(0);
    expect(result).toMatchObject({ skipped: 1, sent: 0 });
    const [row] = await db.select().from(scheduledMessages).where(sql`kind = 'confirmation'`);
    expect(row?.status).toBe('skipped');
    expect(row?.skipReason).toBe('booking_cancelled');
  });

  it('never sends a win-back to a guest who has not opted in', async () => {
    const no = await seedBooking();
    await scheduleForBooking(schedulerDeps(), no);
    await openWindow();
    // Make the win-back due now.
    await db.execute(sql`UPDATE scheduled_messages SET send_at = now() - interval '1 minute'`);

    const { wa } = makeWa();
    await runSender(senderDeps(wa));

    const [winback] = await db.select().from(scheduledMessages).where(sql`kind = 'winback'`);
    expect(winback?.status).toBe('skipped');
    expect(winback?.skipReason).toBe('no_marketing_opt_in');
  });

  it('sends the win-back once the guest HAS opted in (checked at send time)', async () => {
    const no = await seedBooking();
    await scheduleForBooking(schedulerDeps(), no);
    await openWindow();
    // Consent arrives ~74 days after the row was scheduled — which is exactly
    // why opt-in is judged now and not back then.
    await db.execute(sql`UPDATE guests SET marketing_opt_in = true`);
    await db.execute(
      sql`UPDATE scheduled_messages SET send_at = now() - interval '1 minute' WHERE kind = 'winback'`,
    );

    const { wa } = makeWa();
    await runSender(senderDeps(wa));

    const [winback] = await db.select().from(scheduledMessages).where(sql`kind = 'winback'`);
    expect(winback?.status).toBe('sent');
  });

  it('meters a wa_template cost event ONLY when a template was the vehicle', async () => {
    await scheduleForBooking(schedulerDeps(), await seedBooking());
    await openWindow(); // window OPEN ⇒ free-form ⇒ not billable
    const { wa } = makeWa('send');
    await runSender(senderDeps(wa));
    expect(await db.select().from(schema.costEvents)).toHaveLength(0);
  });

  it('meters wa_template when the window is shut and a real template goes', async () => {
    await scheduleForBooking(schedulerDeps(), await seedBooking());
    // No window at all.
    const { wa, sent } = makeWa('send');
    await runSender(senderDeps(wa));

    expect(sent[0]).toMatchObject({ type: 'template' });
    const [cost] = await db.select().from(schema.costEvents);
    expect(cost?.kind).toBe('wa_template');
  });

  it('leaves a row PENDING when the window is shut and templates are simulated', async () => {
    // The dev reality: nothing can reach a closed window. The row must survive
    // to be delivered the moment the guest writes — not be burned as failed.
    await scheduleForBooking(schedulerDeps(), await seedBooking());
    const { wa, sent } = makeWa('simulate');

    const result = await runSender(senderDeps(wa));

    expect(sent).toHaveLength(0);
    expect(result).toMatchObject({ skipped: 1, sent: 0, failed: 0 });
    const [row] = await db.select().from(scheduledMessages).where(sql`kind = 'confirmation'`);
    expect(row?.status).toBe('pending'); // still deliverable
  });

  it('does not send the same row twice across two ticks', async () => {
    await scheduleForBooking(schedulerDeps(), await seedBooking());
    await openWindow();
    const { wa, sent } = makeWa();

    await runSender(senderDeps(wa));
    await runSender(senderDeps(wa));

    expect(sent).toHaveLength(1);
  });
});

describe('runReconcile — the sweep that must never re-derive history', () => {
  it('🚨 schedules NOTHING for a mirror full of historical bookings', async () => {
    // The shape of production after CH-11's --apply reconcile: 124 checked_out
    // rows and a pile of cancels, arrivals going back months. If the sweep were
    // ungated, every one of these guests would be told we look forward to
    // welcoming them.
    for (let i = 0; i < 5; i += 1) {
      await seedBooking({
        ezeeReservationNo: `hist-${i}`,
        status: 'checked_out',
        checkIn: '2026-03-01',
        checkOut: '2026-03-04',
        createdAt: new Date('2026-07-13T05:00:00Z'), // pre-epoch too
      });
    }
    const result = await runReconcile(schedulerDeps());

    expect(result).toEqual({ considered: 0, scheduled: 0, skipped: 0 });
    expect(await db.select().from(scheduledMessages)).toHaveLength(0);
  });

  it('🚨 schedules NOTHING for the 12 real OTA guests already in the mirror', async () => {
    await seedBooking({ ezeeReservationNo: 'air-1', source: 'Airbnb', checkIn: '2026-07-20' });
    await seedBooking({ ezeeReservationNo: 'bkg-1', source: 'Booking.com', checkIn: '2026-08-02' });

    const result = await runReconcile(schedulerDeps());
    expect(result.considered).toBe(0);
    expect(await db.select().from(scheduledMessages)).toHaveLength(0);
  });

  it('DOES schedule a booking whose events were lost (the atomicity net)', async () => {
    // A real, in-epoch, direct booking whose booking.created job never ran —
    // purged, aged out, or dropped by a deploy. This is what the sweep is FOR.
    await seedBooking({ ezeeReservationNo: 'lost-1' });
    expect(await db.select().from(scheduledMessages)).toHaveLength(0);

    const result = await runReconcile(schedulerDeps());

    expect(result).toMatchObject({ considered: 1, scheduled: 1 });
    expect(await db.select().from(scheduledMessages)).toHaveLength(5);
  });

  it('is idempotent — a second sweep adds nothing', async () => {
    await seedBooking({ ezeeReservationNo: 'lost-2' });
    await runReconcile(schedulerDeps());
    await runReconcile(schedulerDeps());
    expect(await db.select().from(scheduledMessages)).toHaveLength(5);
  });

  it('FAILS CLOSED with no epoch — "no cutover" can never mean "everything"', async () => {
    await seedBooking({ ezeeReservationNo: 'clean-1' });
    const result = await runReconcile({ db, log, gates: { ...GATES, epoch: undefined } });
    expect(result).toEqual({ considered: 0, scheduled: 0, skipped: 0 });
  });
});
