/**
 * CH-15 · lead follow-up: detection, scheduling, the caps, the send-time gates,
 * and the conversion cleanup — driven through the REAL paths, asserting OUTCOMES
 * (a row scheduled / cancelled / sent), never due-ness (the CH-12 test lesson).
 *
 * 🚨 The born-stale proof (staleByPlanAge anchors on send_at, not created_at) is
 * the load-bearing test of this chunk — a lead planned at T+3d must SEND at T+3d,
 * not be skipped as 72h "stale" on its first tick (the R7 trap).
 *
 * Phone decade 5xx is CH-11's ledger claim; CH-15 reuses 55x within it.
 */
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { scheduledMessages } from '../src/db/schema.js';
import { touchPhoneWindow } from '../src/db/windows.js';
import type { ConverseFn } from '../src/brain/claude.js';
import { DEBOUNCE_WINDOWS } from '../src/brain/debounce.js';
import { processConversation, type WorkerDeps } from '../src/brain/worker.js';
import {
  isRefusal,
  leadQuoteFromToolRuns,
  scheduleLeadFollowup,
} from '../src/lifecycle/leadFollowup.js';
import { runSender, type SenderDeps } from '../src/lifecycle/sender.js';
import { handleBookingEvent, type SchedulerDeps } from '../src/lifecycle/scheduler.js';
import type { GateContext } from '../src/lifecycle/gates.js';
import type { WebsiteClient } from '../src/brain/tools/websiteApi.js';
import type { ToolRun } from '../src/brain/tools/registry.js';
import { createWaClient } from '../src/wa/client.js';
import { noToolDeps, textResult } from './helpers/brain.js';
import { seedConversation, seedGuestMessage } from './helpers/seed.js';
import { TEST_URL } from './helpers/boss.js';

const NOW = new Date('2026-07-14T06:30:00Z'); // 12:00 IST — a civil hour
const TODAY = '2026-07-14';
const GATES: GateContext = {
  epoch: new Date('2026-07-14T00:00:00Z'),
  today: TODAY,
  sources: ['internet booking engine', 'walk-in'],
};

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

/** A guest with explicit marketing flags — the send gate reads these. */
async function seedGuest(
  phone: string,
  over: Partial<typeof schema.guests.$inferInsert> = {},
): Promise<string> {
  const [g] = await db
    .insert(schema.guests)
    .values({ phone, firstName: 'Rahul', ...over })
    .returning({ id: schema.guests.id });
  if (g === undefined) throw new Error('seed guest failed');
  return g.id;
}

async function insertLead(
  guestId: string,
  over: Partial<typeof scheduledMessages.$inferInsert> = {},
): Promise<string> {
  const [r] = await db
    .insert(scheduledMessages)
    .values({
      guestId,
      bookingId: null,
      kind: 'lead_followup',
      templateName: 'nst_lead_followup_v1',
      params: { firstName: 'Rahul', villaType: 'Nistula Villa', dates: '20-22 Dec' },
      sendAt: NOW,
      dedupeKey: `lead_followup:${guestId}:${randomUUID()}`,
      ...over,
    })
    .returning({ id: scheduledMessages.id });
  if (r === undefined) throw new Error('seed lead failed');
  return r.id;
}

function makeWa() {
  const sent: unknown[] = [];
  const wa = createWaClient({
    db,
    log: { error: vi.fn(), warn: vi.fn() },
    graphBaseUrl: 'https://graph.test.invalid/v23.0',
    phoneNumberId: '000000000000000',
    accessToken: 'test-token',
    templateMode: 'simulate',
    httpImpl: async (_url, options) => {
      sent.push(JSON.parse(options?.body ?? '{}'));
      return new Response(JSON.stringify({ messages: [{ id: `wamid.L-${sent.length}` }] }), {
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

const run = (guestId: string, quote = { villaLabel: 'B3', checkIn: '2026-12-20', checkOut: '2026-12-22' }) =>
  scheduleLeadFollowup({ db, now: NOW }, { guestId, quote });

// ── pure detection ───────────────────────────────────────────────────────────

describe('isRefusal', () => {
  it.each([
    'not interested, thanks',
    'we booked elsewhere',
    'already booked somewhere else',
    "no thanks",
    'changed our mind',
    'nahi chahiye',
    'rehne do bhai',
  ])('treats %j as a refusal', (t) => expect(isRefusal(t)).toBe(true));

  it.each([
    'is it not available?',
    'no problem, what are the dates',
    'yes please send the link',
    'the villa looks lovely',
    'can we book for 4 adults',
  ])('does NOT treat %j as a refusal', (t) => expect(isRefusal(t)).toBe(false));
});

describe('leadQuoteFromToolRuns', () => {
  const ok = (villa: string, ci: string, co: string): ToolRun => ({
    name: 'get_quote',
    input: { villa_label: villa, check_in: ci, check_out: co, adults: 2 },
    result: { ok: true, data: {} },
  });
  it('returns the LAST successful get_quote', () => {
    const runs: ToolRun[] = [ok('B3', '2026-12-20', '2026-12-22'), ok('C1', '2027-01-05', '2027-01-08')];
    expect(leadQuoteFromToolRuns(runs)).toEqual({
      villaLabel: 'C1',
      checkIn: '2027-01-05',
      checkOut: '2027-01-08',
    });
  });
  it('ignores failed quotes and other tools', () => {
    const runs: ToolRun[] = [
      { name: 'get_booking', input: {}, result: { ok: true, data: {} } },
      { name: 'get_quote', input: { villa_label: 'B3', check_in: 'x', check_out: 'y' }, result: { ok: false, error: 'UNAVAILABLE' } },
    ];
    expect(leadQuoteFromToolRuns(runs)).toBeNull();
  });
  it('returns null for an empty turn', () => expect(leadQuoteFromToolRuns([])).toBeNull());
});

// ── scheduleLeadFollowup (real DB) ───────────────────────────────────────────

describe('scheduleLeadFollowup', () => {
  it('schedules a booking-less lead row at T+3d 11:00 IST', async () => {
    const guestId = await seedGuest('+917700900551');
    expect(await run(guestId)).toBe('scheduled');

    const [row] = await db.select().from(scheduledMessages);
    expect(row?.kind).toBe('lead_followup');
    expect(row?.bookingId).toBeNull();
    expect(row?.status).toBe('pending');
    expect(row?.templateName).toBe('nst_lead_followup_v1');
    expect(row?.params).toMatchObject({ villaType: 'Nistula Villa', firstName: 'Rahul' });
    // T+3d from 2026-07-14 = 2026-07-17, 11:00 IST = 05:30 UTC.
    expect(row?.sendAt.toISOString()).toBe('2026-07-17T05:30:00.000Z');
    // dedupeKey = lead_followup:<guestId>:<Monday-of-week>; 2026-07-14 is a Tue.
    expect(row?.dedupeKey).toMatch(/^lead_followup:[0-9a-f-]+:2026-07-13$/);
  });

  it('a re-quote within the window makes NO second row (max 1/30d dominates)', async () => {
    const guestId = await seedGuest('+917700900552');
    expect(await run(guestId)).toBe('scheduled');
    // A different villa/dates two days later is still one guest, one window.
    expect(
      await run(guestId, { villaLabel: 'C1', checkIn: '2027-01-05', checkOut: '2027-01-08' }),
    ).toBe('skipped_cap');
    const rows = await db.select().from(scheduledMessages);
    expect(rows).toHaveLength(1);
    // The first nudge stands unchanged (the dedupe key is the idempotency net).
    expect(rows[0]?.params).toMatchObject({ dates: expect.stringContaining('December') });
  });

  it('caps at 1 per 30 days (schedule-time)', async () => {
    const guestId = await seedGuest('+917700900553');
    await insertLead(guestId, { status: 'sent', dedupeKey: `lead_followup:${guestId}:prior` });
    expect(await run(guestId)).toBe('skipped_cap');
    // Only the prior row exists — no new one.
    expect(await db.select().from(scheduledMessages)).toHaveLength(1);
  });

  it('skips an unresolvable villa and a nameless guest', async () => {
    const g1 = await seedGuest('+917700900554');
    expect(await run(g1, { villaLabel: 'zzzz', checkIn: '2026-12-20', checkOut: '2026-12-22' })).toBe(
      'skipped_no_type',
    );
    const g2 = await seedGuest('+917700900555', { firstName: null, waProfileName: null });
    expect(await run(g2)).toBe('skipped_no_name');
    expect(await db.select().from(scheduledMessages)).toHaveLength(0);
  });
});

// ── the sender gates a lead follow-up ────────────────────────────────────────

async function openWindow(guestId: string, phone: string): Promise<void> {
  await getOrCreateConversationRow(guestId);
  await touchPhoneWindow(db, phone, new Date());
  await db.execute(sql`UPDATE conversations SET service_window_expires_at = now() + interval '23 hours'`);
}
async function getOrCreateConversationRow(guestId: string): Promise<void> {
  await db.insert(schema.conversations).values({ guestId }).onConflictDoNothing();
}

describe('the sender gates a lead follow-up', () => {
  it('🚨 SENDS a lead due at its send_at — it is NOT born stale (send_at anchor, not created_at)', async () => {
    const phone = '+917700900556';
    const guestId = await seedGuest(phone, { marketingOptIn: true });
    await openWindow(guestId, phone);
    // Planned 3 days ago, due NOW: plan-age 0. If the stale clock anchored on
    // created_at (also 3d ago) it would skip as 72h stale — it must not.
    await insertLead(guestId, {
      sendAt: NOW,
      createdAt: new Date(NOW.getTime() - 3 * 86_400_000),
    });

    const { wa, sent } = makeWa();
    const result = await runSender(senderDeps(wa));

    expect(result).toMatchObject({ sent: 1, skipped: 0 });
    expect(sent).toHaveLength(1);
    const [row] = await db.select().from(scheduledMessages);
    expect(row?.status).toBe('sent');
  });

  it('skips a lead that sat >36h past its send_at (genuinely stale)', async () => {
    const phone = '+917700900557';
    const guestId = await seedGuest(phone, { marketingOptIn: true });
    await openWindow(guestId, phone);
    await insertLead(guestId, { sendAt: new Date(NOW.getTime() - 40 * 3_600_000) });

    const { wa } = makeWa();
    await runSender(senderDeps(wa));
    const [row] = await db.select().from(scheduledMessages);
    expect(row?.status).toBe('skipped');
    expect(row?.skipReason).toBe('stale');
  });

  it('never sends a lead to a guest who has not opted in', async () => {
    const guestId = await seedGuest('+917700900558'); // opt-in default false
    await insertLead(guestId, { sendAt: NOW });
    const { wa } = makeWa();
    await runSender(senderDeps(wa));
    const [row] = await db.select().from(scheduledMessages);
    expect(row?.status).toBe('skipped');
    expect(row?.skipReason).toBe('no_marketing_opt_in');
  });

  it('never sends a lead to a guest who opted OUT', async () => {
    const guestId = await seedGuest('+917700900559', { marketingOptIn: true, optOutMarketing: true });
    await insertLead(guestId, { sendAt: NOW });
    const { wa } = makeWa();
    await runSender(senderDeps(wa));
    const [row] = await db.select().from(scheduledMessages);
    expect(row?.status).toBe('skipped');
    expect(row?.skipReason).toBe('opted_out');
  });

  it('caps at 1 lead per 30 days (send-time)', async () => {
    const phone = '+917700900560';
    const guestId = await seedGuest(phone, { marketingOptIn: true });
    await openWindow(guestId, phone);
    await insertLead(guestId, { status: 'sent', dedupeKey: `lead_followup:${guestId}:prior` });
    await insertLead(guestId, { sendAt: NOW, dedupeKey: `lead_followup:${guestId}:now` });

    const { wa } = makeWa();
    await runSender(senderDeps(wa));
    const due = await db
      .select()
      .from(scheduledMessages)
      .where(eq(scheduledMessages.dedupeKey, `lead_followup:${guestId}:now`));
    expect(due[0]?.status).toBe('skipped');
    expect(due[0]?.skipReason).toBe('lead_followup_cap_reached');
  });
});

// ── conversion cleanup (real booking event) ──────────────────────────────────

describe('conversion cleanup', () => {
  it('cancels a pending lead follow-up when the guest books', async () => {
    const phone = '+917700900561';
    const guestId = await seedGuest(phone, { marketingOptIn: true });
    await insertLead(guestId, { sendAt: NOW });

    // A real direct booking on the SAME phone arrives → the scheduler links the
    // guest and cancels the lead. Drive the real handler.
    await db.insert(schema.bookingsMirror).values({
      ezeeReservationNo: '953',
      guestName: 'Rahul Mehta',
      guestPhone: phone,
      roomTypeName: 'Nistula Villa',
      checkIn: '2026-12-20',
      checkOut: '2026-12-22',
      adults: 4,
      status: 'confirmed',
      source: 'Internet Booking Engine',
      amount: '13854.75',
      raw: {},
      createdAt: NOW,
      syncedAt: NOW,
    });
    const deps: SchedulerDeps = { db, log, gates: GATES };
    await handleBookingEvent(deps, 'created', '953');

    const [lead] = await db
      .select()
      .from(scheduledMessages)
      .where(eq(scheduledMessages.kind, 'lead_followup'));
    expect(lead?.status).toBe('cancelled');
    expect(lead?.skipReason).toBe('converted');
  });
});

// ── through the real worker (mocked model + fake website) ────────────────────

function fakeWebsite(): WebsiteClient {
  return {
    getQuote: async () => ({
      status: 'ok',
      quote: {
        villaId: '5220300000000000011',
        checkIn: '2026-12-20',
        checkOut: '2026-12-22',
        nights: 2,
        adults: 2,
        children: 0,
        total: 34000,
        averagePerNight: 17000,
        perNight: [{ date: '2026-12-20', amount: 17000 }],
        minNights: { average: 1, meetsRequirement: true },
        available: true,
      },
    }),
    getAvailability: async () => ({ status: 'ok', days: [] }),
  };
}

/** A rig whose model quotes (round 1) then proses (round 2) — the REAL tool loop
 * runs get_quote against a fake website, so turn.toolRuns carries the quote. */
function quotingRig() {
  const wa = createWaClient({
    db,
    log,
    graphBaseUrl: 'https://graph.test.invalid/v23.0',
    phoneNumberId: '1',
    accessToken: 't',
    httpImpl: async () =>
      new Response(JSON.stringify({ messages: [{ id: `wamid.Q-${randomUUID()}` }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  });
  let round = 0;
  const converse: ConverseFn = async () => {
    round += 1;
    if (round === 1) {
      const use = {
        id: 'tu_q',
        name: 'get_quote',
        input: { villa_label: 'B3', check_in: '2026-12-20', check_out: '2026-12-22', adults: 2 },
      };
      return {
        text: '',
        toolUses: [use],
        stopReason: 'tool_use' as const,
        assistantContent: [{ type: 'tool_use' as const, id: use.id, name: use.name, input: use.input }],
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      };
    }
    return textResult('That villa is ₹34,000 for the two nights — here is the link whenever you are ready.');
  };
  const deps: WorkerDeps = {
    db,
    wa,
    log,
    windows: DEBOUNCE_WINDOWS,
    converse,
    ...noToolDeps(log),
    website: fakeWebsite(),
    nightStart: '20:00',
    nightEnd: '10:00',
    enqueue: async () => {},
  };
  return deps;
}

const leadRows = () =>
  db.select().from(scheduledMessages).where(eq(scheduledMessages.kind, 'lead_followup'));

describe('lead detection through the real worker', () => {
  it('schedules a lead follow-up after a quote to a lead-stage guest', async () => {
    const { conversation } = await seedConversation(db, '+917700900571');
    await seedGuestMessage(db, conversation.id, 'how much is B3 for 20-22 dec?', 30);
    await processConversation(quotingRig(), conversation.id);

    const rows = await leadRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.bookingId).toBeNull();
    expect(rows[0]?.sendAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('does NOT schedule after a refusal, even with a quote', async () => {
    const { conversation } = await seedConversation(db, '+917700900572');
    await seedGuestMessage(db, conversation.id, 'how much is B3 for dec? actually we booked elsewhere', 30);
    await processConversation(quotingRig(), conversation.id);
    expect(await leadRows()).toHaveLength(0);
  });

  it('does NOT schedule for a guest who already holds an upcoming booking', async () => {
    const phone = '+917700900573';
    // Mirror a future confirmed booking on this phone → linked → stage prearrival.
    await db.insert(schema.bookingsMirror).values({
      ezeeReservationNo: '961',
      guestName: 'Rahul Mehta',
      guestPhone: phone,
      roomTypeName: 'Nistula Villa',
      checkIn: '2099-01-01',
      checkOut: '2099-01-03',
      adults: 4,
      status: 'confirmed',
      source: 'Internet Booking Engine',
      amount: '13854.75',
      raw: {},
      syncedAt: NOW,
    });
    const { conversation } = await seedConversation(db, phone);
    await seedGuestMessage(db, conversation.id, 'how much for another villa in dec?', 30);
    await processConversation(quotingRig(), conversation.id);
    expect(await leadRows()).toHaveLength(0);
  });

  it('a STOP + quote in one turn opts out and schedules NO lead', async () => {
    const { guest, conversation } = await seedConversation(db, '+917700900574');
    // Trips containsStop (unsubscribe) AND containsComplaint (filthy) → the model
    // runs (COMPLAINT_SUSPECT) and quotes, but a STOP turn must never schedule a
    // fresh marketing nudge for a guest just opted out.
    await seedGuestMessage(
      db,
      conversation.id,
      'unsubscribe, the villa was filthy — but what is the december rate for B3?',
      30,
    );
    await processConversation(quotingRig(), conversation.id);
    expect(await leadRows()).toHaveLength(0);
    const [g] = await db.select().from(schema.guests).where(eq(schema.guests.id, guest.id));
    expect(g?.optOutMarketing).toBe(true);
  });
});
