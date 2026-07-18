/**
 * CH-16 · draft mode end to end through the REAL worker (the CH-12 lesson: drive
 * `processConversation`, assert the OUTCOME — a drafts row + a card and NO guest
 * send, or a direct send and NO draft — never a precondition).
 */
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConverseFn } from '../src/brain/claude.js';
import { DEBOUNCE_WINDOWS } from '../src/brain/debounce.js';
import { processConversation, type WorkerDeps } from '../src/brain/worker.js';
import type { ReplyType } from '../src/config.js';
import type { Db } from '../src/db/client.js';
import { upsertMirrorRow, type MirrorRowInput } from '../src/db/bookings.js';
import { insertDraft } from '../src/db/drafts.js';
import * as schema from '../src/db/schema.js';
import { touchPhoneWindow } from '../src/db/windows.js';
import { notifyDraft } from '../src/staff/draftNotify.js';
import { createWaClient } from '../src/wa/client.js';
import { noToolDeps, textResult } from './helpers/brain.js';
import { seedConversation, seedGuestMessage } from './helpers/seed.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';
const GUEST = '+917700900841';
const OPS = '+917700900849';

let client: ReturnType<typeof postgres>;
let db: Db;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema }) as unknown as Db;
}, 30_000);

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE drafts, tasks, guest_stays, bookings_mirror, messages, conversations, guests, raw_events, phone_windows CASCADE`,
  );
});

afterAll(async () => {
  await client?.end();
});

const CLEAN_REPLY = 'Good evening. Our 3BHK duplex villas in Assagao are lovely — shall I share the link?';

function rig(options: { draftMode: boolean; autoSendTypes?: ReplyType[]; reply?: string }) {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const carded: { to: string; key: string; params: Record<string, string> }[] = [];
  const converse: ConverseFn = async () => textResult(options.reply ?? CLEAN_REPLY);
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
  const waSpy = {
    ...wa,
    sendTemplated: async (
      to: Parameters<typeof wa.sendTemplated>[0],
      send: Parameters<typeof wa.sendTemplated>[1],
      opts: Parameters<typeof wa.sendTemplated>[2],
    ) => {
      carded.push({ to, key: send.key, params: send.params });
      return wa.sendTemplated(to, send, opts);
    },
  };
  const deps: WorkerDeps = {
    db,
    wa: waSpy,
    log,
    windows: DEBOUNCE_WINDOWS,
    converse,
    ...noToolDeps(log),
    opsNumbers: [OPS],
    draftMode: options.draftMode,
    autoSendTypes: options.autoSendTypes ?? [],
    drafts: {
      create: (tx, input) => insertDraft(tx, input),
      notify: (opsNumbers, card) => notifyDraft({ log, wa: waSpy }, opsNumbers, card),
    },
    nightStart: '20:00',
    nightEnd: '10:00',
    enqueue: async () => {},
  };
  return { deps, carded };
}

const guestOutbound = async (conversationId: string) =>
  [
    ...(await db.execute(
      sql`SELECT body, sender FROM messages WHERE conversation_id = ${conversationId} AND direction = 'out' AND sender = 'ai' ORDER BY created_at`,
    )),
  ] as { body: string; sender: string }[];

const draftRows = async () =>
  [...(await db.execute(sql`SELECT short_id, reply_type, status, proposed_body FROM drafts`))] as {
    short_id: string;
    reply_type: string;
    status: string;
    proposed_body: string;
  }[];

const mirrorInput = (over: Partial<MirrorRowInput>): MirrorRowInput => {
  const iso = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
  return {
    ezeeReservationNo: '990',
    ezeeBookingTranId: 't1',
    guestName: 'Rahul',
    guestPhone: GUEST,
    guestEmail: null,
    roomTypeId: '5220300000000000001',
    roomTypeName: 'Nistula Apartment',
    physicalRoomLabel: null,
    rateplanId: null,
    checkIn: iso(5),
    checkOut: iso(8),
    adults: 2,
    children: 0,
    status: 'confirmed',
    source: 'Internet Booking Engine',
    amount: null,
    currency: 'INR',
    raw: {},
    ...over,
  };
};

describe('draft mode routing through the worker', () => {
  it('drafts a lead reply for ops approval — a card lands, the GUEST gets nothing yet', async () => {
    const { conversation } = await seedConversation(db, GUEST);
    await touchPhoneWindow(db, OPS, new Date());
    await seedGuestMessage(db, conversation.id, 'is a 3bhk free next month?', 20);
    const { deps, carded } = rig({ draftMode: true, autoSendTypes: [] });

    await processConversation(deps, conversation.id);

    const drafts = await draftRows();
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.reply_type).toBe('presales');
    expect(drafts[0]?.status).toBe('pending');
    expect(drafts[0]?.proposed_body).toBe(CLEAN_REPLY);

    // A card went to ops with the same short id...
    expect(carded).toHaveLength(1);
    expect(carded[0]?.to).toBe(OPS);
    expect(carded[0]?.key).toBe('draft_card');
    expect(carded[0]?.params.shortId).toBe(drafts[0]?.short_id);

    // ...and the guest received NOTHING (the whole point of draft mode).
    expect(await guestOutbound(conversation.id)).toHaveLength(0);
  });

  it('sends direct (no draft) when the type is unlocked in AUTO_SEND_TYPES', async () => {
    const { conversation } = await seedConversation(db, GUEST);
    await seedGuestMessage(db, conversation.id, 'is a 3bhk free next month?', 20);
    const { deps, carded } = rig({ draftMode: true, autoSendTypes: ['presales'] });

    await processConversation(deps, conversation.id);

    expect(await draftRows()).toHaveLength(0);
    expect(carded).toHaveLength(0);
    const out = await guestOutbound(conversation.id);
    expect(out).toHaveLength(1);
    expect(out[0]?.body).toBe(CLEAN_REPLY);
  });

  it('drafts anyway when needsHuman, even though the type is unlocked', async () => {
    const { guest, conversation } = await seedConversation(db, GUEST);
    await touchPhoneWindow(db, OPS, new Date());
    // A cancellation for next week: not describable (so stage stays lead/presales)
    // but needsHuman — a booking a person must look at. Auto-send must not fire.
    await upsertMirrorRow(db, mirrorInput({ status: 'cancelled' }));
    await db.insert(schema.guestStays).values({
      guestId: guest.id,
      bookingId: (await db.select().from(schema.bookingsMirror))[0]!.id,
      matchedBy: 'phone',
    });
    await seedGuestMessage(db, conversation.id, 'is a 3bhk free next month?', 20);
    const { deps } = rig({ draftMode: true, autoSendTypes: ['presales'] });

    await processConversation(deps, conversation.id);

    // Unlocked type, but needsHuman FORCED the draft — the guest got nothing.
    expect(await draftRows()).toHaveLength(1);
    expect(await guestOutbound(conversation.id)).toHaveLength(0);
  });

  it('sends a deterministic policy line direct even in draft mode (human-request)', async () => {
    const { conversation } = await seedConversation(db, GUEST);
    await seedGuestMessage(db, conversation.id, 'please connect me to a human', 20);
    const { deps } = rig({ draftMode: true, autoSendTypes: [] });

    await processConversation(deps, conversation.id);

    // A human-request skips the model (turn === null); the phrasebook line is
    // pre-vetted and time-sensitive, so it goes DIRECT — never held for approval.
    expect(await draftRows()).toHaveLength(0);
    const out = await guestOutbound(conversation.id);
    expect(out).toHaveLength(1);
    expect(out[0]?.body.length).toBeGreaterThan(0);
  });
});
