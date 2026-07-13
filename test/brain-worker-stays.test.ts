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
import { sql } from 'drizzle-orm';
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
    expect(prompt).toContain('no booking with us yet'); // stage: lead
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
});
