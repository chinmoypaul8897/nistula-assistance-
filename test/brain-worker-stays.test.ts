/**
 * CH-11 · booking awareness end to end through the REAL worker.
 *
 * Proves the whole path the unit tests only prove in pieces: a mirrored booking
 * on the guest's phone is linked on their first inbound turn, projected once,
 * and reaches the model as block [5] stays + a block [6] stage — with the stay
 * guard gated on the same read.
 *
 * Phone decade 5xx is CH-11's claim in the test-number ledger.
 */
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConverseFn, ConverseInput } from '../src/brain/claude.js';
import { DEBOUNCE_WINDOWS } from '../src/brain/debounce.js';
import { processConversation, type WorkerDeps } from '../src/brain/worker.js';
import type { Db } from '../src/db/client.js';
import { upsertMirrorRow, type MirrorRowInput } from '../src/db/bookings.js';
import { getGuestStays } from '../src/db/stays.js';
import * as schema from '../src/db/schema.js';
import { createWaClient } from '../src/wa/client.js';
import { noToolDeps, textResult } from './helpers/brain.js';
import { seedConversation, seedGuestMessage } from './helpers/seed.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';
const GUEST = '+917700900541';

let client: ReturnType<typeof postgres>;
let db: Db;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
}, 30_000);

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE reference_attempts, guest_stays, bookings_mirror, messages, conversations, guests, raw_events CASCADE`,
  );
});

afterAll(async () => {
  await client?.end();
});

function rig(reply = 'Your stay runs 26-28 Aug.') {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const converseCalls: ConverseInput[] = [];
  const converse: ConverseFn = async (input) => {
    converseCalls.push(input);
    return textResult(reply, { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 });
  };
  const wa = createWaClient({
    db,
    log,
    graphBaseUrl: 'https://graph.test.invalid/v23.0',
    phoneNumberId: '1',
    accessToken: 't',
    httpImpl: async () =>
      new Response(JSON.stringify({ messages: [{ id: `wamid.X-${randomUUID()}` }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  });
  const deps: WorkerDeps = {
    db,
    wa,
    log,
    windows: DEBOUNCE_WINDOWS,
    converse,
    ...noToolDeps(log),
    nightStart: '20:00',
    nightEnd: '10:00',
    enqueue: async () => {},
  };
  return { deps, converseCalls, log };
}

/** A rig whose model calls get_booking with the guest's quoted reference (round
 * 1), then proses (round 2) — the real tool loop, so the reference-claim path
 * and the post-claim strike write actually run. */
function rigWithToolLoop() {
  const base = rig('Let me check that with the team.');
  let round = 0;
  const converse: ConverseFn = async () => {
    round += 1;
    if (round === 1) {
      const use = { id: 'tu_1', name: 'get_booking', input: { reference: '953' } };
      return {
        text: '',
        toolUses: [use],
        stopReason: 'tool_use' as const,
        assistantContent: [{ type: 'tool_use' as const, id: use.id, name: use.name, input: use.input }],
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      };
    }
    return textResult('A colleague is checking on that and will be right back to you.');
  };
  return { ...base, deps: { ...base.deps, converse } };
}

/** The system prompt the model actually received. */
const systemText = (calls: ConverseInput[]): string =>
  (calls[0]?.system ?? []).map((b) => ('text' in b ? b.text : '')).join('\n');

const mirrorInput = (over: Partial<MirrorRowInput> = {}): MirrorRowInput => ({
  ezeeReservationNo: '953',
  ezeeBookingTranId: 't1',
  guestName: 'Rahul Mehta',
  guestPhone: GUEST,
  guestEmail: 'rahul@example.com',
  roomTypeId: '5220300000000000003',
  roomTypeName: 'Nistula Villa',
  physicalRoomLabel: null,
  rateplanId: '5220300000000000006',
  checkIn: '2026-08-26',
  checkOut: '2026-08-28',
  adults: 4,
  children: 0,
  status: 'confirmed',
  source: 'Booking.com',
  amount: '13854.75',
  currency: 'INR',
  raw: { UniqueID: '953' },
  ...over,
});

describe('a mirrored booking reaches the model', () => {
  it('links on the first inbound turn and renders block [5] + the stage', async () => {
    await upsertMirrorRow(db, mirrorInput());
    const { guest, conversation } = await seedConversation(db, GUEST);
    await seedGuestMessage(db, conversation.id, 'when is my check-in?', 60_000);

    const { deps, converseCalls } = rig();
    await processConversation(deps, conversation.id);

    // Linked by the worker (the guest was mirrored before they ever messaged).
    expect(await getGuestStays(db, guest.id)).toHaveLength(1);

    const prompt = systemText(converseCalls);
    expect(prompt).toContain('2026-08-26 to 2026-08-28');
    // Villa TYPE, never a unit — eZee has assigned none (§5.4). Scoped to the
    // STAY line: block [2]'s voice exemplars legitimately name Villa B3.
    const stayLine = prompt.split('\n').find((l) => l.includes('2026-08-26 to 2026-08-28')) ?? '';
    expect(stayLine).toContain('Nistula Villa (villa type');
    expect(stayLine).not.toContain('Villa B3');
    // The stage is the tone anchor. Check-in is future ⇒ prearrival.
    expect(prompt).toContain('has a stay coming up');
    // …and none of the things the projection must never emit.
    expect(prompt).not.toContain('13854');
    expect(prompt).not.toContain('rahul@example.com');
    expect(stayLine).not.toMatch(/\bEP\b|\bCP\b|breakfast/i);
  });

  it('names the UNIT once eZee has assigned one', async () => {
    await upsertMirrorRow(db, mirrorInput({ physicalRoomLabel: 'Villa B3' }));
    const { conversation } = await seedConversation(db, GUEST);
    await seedGuestMessage(db, conversation.id, 'which villa am I in?', 60_000);

    const { deps, converseCalls } = rig();
    await processConversation(deps, conversation.id);

    expect(systemText(converseCalls)).toContain('- Villa B3, 2026-08-26');
  });

  it('tells the model a stranger has no booking', async () => {
    const { conversation } = await seedConversation(db, GUEST);
    await seedGuestMessage(db, conversation.id, 'when is my check-in?', 60_000);

    const { deps, converseCalls } = rig();
    await processConversation(deps, conversation.id);

    const prompt = systemText(converseCalls);
    expect(prompt).toContain('Stays: no booking is linked to this number.');
    expect(prompt).toContain('cannot see a booking on this number'); // stage: lead
  });

  // A cancelled booking keeps its dates and its link. It must never be described
  // — and must not be silently dropped either, or the AI treats a guest with a
  // booking problem as a fresh sales lead.
  it('announces a cancelled booking without detail, and escalates', async () => {
    await upsertMirrorRow(db, mirrorInput({ status: 'cancelled' }));
    const { conversation } = await seedConversation(db, GUEST);
    await seedGuestMessage(db, conversation.id, 'is my booking ok?', 60_000);

    const { deps, converseCalls } = rig();
    await processConversation(deps, conversation.id);

    const prompt = systemText(converseCalls);
    expect(prompt).toContain('may NOT describe');
    expect(prompt).not.toContain('2026-08-26');
  });

  // The gate that matters: the model asserts a booking the guest does not have.
  it('blocks a booking affirmation for a guest with no live stay', async () => {
    const { conversation } = await seedConversation(db, GUEST);
    await seedGuestMessage(db, conversation.id, 'am I booked for december?', 60_000);

    // The model complies with the guest's premise — the deterministic layer must
    // be what stops it.
    const { deps } = rig("Yes, you're all set for 20-22 Dec.");
    await processConversation(deps, conversation.id);

    const [outbound] = await db
      .select({ body: schema.messages.body })
      .from(schema.messages)
      .where(sql`${schema.messages.direction} = 'out' AND ${schema.messages.sender} = 'ai'`);
    expect(outbound?.body).not.toContain('all set');
  });

  it('an in-house guest is staged inhouse, from the DATES not the status', async () => {
    // Status stays 'confirmed' — a front-desk check-in never comes down the
    // queue, so no production row is EVER checked_in.
    const today = new Date().toISOString().slice(0, 10);
    await upsertMirrorRow(db, mirrorInput({ status: 'confirmed', checkIn: today, checkOut: '2099-01-01' }));
    const { conversation } = await seedConversation(db, GUEST);
    await seedGuestMessage(db, conversation.id, 'the AC is not working', 60_000);

    const { deps, converseCalls } = rig();
    await processConversation(deps, conversation.id);

    expect(systemText(converseCalls)).toContain('IN one of our villas right now');
  });

  // Pre-push audit: no production row is ever `checked_out`, so a completed stay
  // stays `confirmed`. `live` keyed on status would read it as upcoming; keyed on
  // DATES it is past — block [5] must mark it so, and the stay guard stays armed.
  it('marks a completed stay (still confirmed) as past, from its DATES', async () => {
    await upsertMirrorRow(
      db,
      mirrorInput({ status: 'confirmed', checkIn: '2026-03-10', checkOut: '2026-03-14' }),
    );
    const { conversation } = await seedConversation(db, GUEST);
    await seedGuestMessage(db, conversation.id, 'hello again', 60_000);

    const { deps, converseCalls } = rig();
    await processConversation(deps, conversation.id);

    const prompt = systemText(converseCalls);
    expect(prompt).toContain('(a past stay)');
    // A returning guest with no upcoming stay is postguest, never a lead.
    expect(prompt).toContain('stayed with us before');
  });
});

// "Stay context may only ever ADD urgency, never remove it" — the deliberate
// §6.7 deviation. We did NOT narrow the complaint trigger; we tell the human
// that the person complaining is standing in one of our villas. If that line is
// absent, the deviation bought nothing and the flag is dead code (pre-merge
// review found exactly that: policy.ts declared it and never read it).
describe('the ops card carries WHERE the guest is', () => {
  it('tells a human that a complaining guest is IN-HOUSE right now', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await upsertMirrorRow(db, mirrorInput({ checkIn: today, checkOut: '2099-01-01' }));
    const { conversation } = await seedConversation(db, GUEST);
    await seedGuestMessage(db, conversation.id, 'the AC is broken and the room is filthy', 60_000);

    const opsSends: string[] = [];
    const { deps } = rig();
    deps.opsNumbers = ['+917700900599'];
    const realSend = deps.wa.sendText.bind(deps.wa);
    deps.wa = {
      ...deps.wa,
      sendText: async (to: string, body: string, opts: never) => {
        opsSends.push(body);
        return realSend(to, body, opts);
      },
    } as typeof deps.wa;

    await processConversation(deps, conversation.id);

    // The complaint still escalates on sentiment alone (never narrowed) …
    expect(opsSends.some((c) => c.includes('appears unhappy'))).toBe(true);
    // … and the card now says WHERE they are.
    expect(opsSends.some((c) => c.includes('IN-HOUSE right now'))).toBe(true);
  });
});

describe('the audit fixes, end to end', () => {
  // Block [5] tells the model "the team is being brought in" for an undescribable
  // booking. The worker MUST make that true — deterministically, whether or not
  // the model used a referral phrase (pre-push audit BLOCKER).
  it('escalates deterministically when the guest holds an undescribable booking', async () => {
    // A cancellation for next week: needsHuman, not describable.
    const soon = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
    await upsertMirrorRow(db, mirrorInput({ status: 'cancelled', checkIn: soon, checkOut: '2099-01-01' }));
    const { conversation } = await seedConversation(db, GUEST);
    await seedGuestMessage(db, conversation.id, 'looking forward to my stay', 60_000);

    // The model replies with NO referral phrase — the deterministic path must
    // still page ops, or block [5]'s promise is unbacked.
    const { deps } = rig('Lovely to hear from you.');
    await processConversation(deps, conversation.id);

    const opsRows = await db
      .select({ body: schema.messages.body })
      .from(schema.messages)
      .where(sql`${schema.messages.sender} = 'system'`);
    expect(opsRows.some((r) => (r.body ?? '').includes('ops escalated: booking_undescribable'))).toBe(
      true,
    );
  });

  // The reference-claim strike is written POST-CLAIM (CH-03 D2): the tool leaves
  // a signal, the worker records it once on the winning claim.
  it('records a refused strike exactly once, post-claim, for a bad reference', async () => {
    await upsertMirrorRow(db, mirrorInput({ guestPhone: null, ezeeReservationNo: '953' }));
    const { conversation } = await seedConversation(db, GUEST);
    await seedGuestMessage(
      db,
      conversation.id,
      'checking booking 953, this is Priya Sharma, 26 Aug',
      60_000,
    );

    // The model, adversarially, calls get_booking with the quoted reference.
    const { deps } = rigWithToolLoop();
    await processConversation(deps, conversation.id);

    const strikes = await db
      .select({ outcome: schema.referenceAttempts.outcome })
      .from(schema.referenceAttempts)
      .where(eq(schema.referenceAttempts.phone, GUEST));
    expect(strikes.filter((s) => s.outcome === 'refused')).toHaveLength(1);
  });
});
