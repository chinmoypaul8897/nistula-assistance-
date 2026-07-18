/**
 * CH-15 · marketing consent — STOP (opt-out) and the post-stay YES (opt-in),
 * both DETERMINISTIC and driven through the REAL worker so the compliance path
 * (never the model) is what is proven.
 *
 * 🚨 STOP must opt the guest out even under a human takeover — compliance is not
 * gated on a human. The opt-out is FLAG-driven in the claim tx; only the
 * confirmation line follows the directive.
 */
import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { scheduledMessages, guests } from '../src/db/schema.js';
import {
  cancelPendingMarketingRows,
  captureInChatOptIn,
  countRecentLeadFollowups,
  hasRecentPoststay,
  setMarketingOptOut,
} from '../src/db/consent.js';
import { isAffirmative } from '../src/brain/inbound.js';
import { DEBOUNCE_WINDOWS } from '../src/brain/debounce.js';
import { PHRASEBOOK } from '../src/brain/prompt.js';
import { processConversation, type WorkerDeps } from '../src/brain/worker.js';
import { MARKETING_KINDS } from '../src/lifecycle/templates.js';
import { createWaClient } from '../src/wa/client.js';
import { noToolDeps, textResult } from './helpers/brain.js';
import { seedConversation, seedGuestMessage } from './helpers/seed.js';
import { TEST_URL } from './helpers/boss.js';

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
    sql`TRUNCATE scheduled_messages, phone_windows, guest_stays, bookings_mirror, messages, conversations, guests, raw_events CASCADE`,
  );
});

async function insertScheduled(
  guestId: string,
  kind: (typeof scheduledMessages.$inferInsert)['kind'],
  over: Partial<typeof scheduledMessages.$inferInsert> = {},
): Promise<void> {
  await db.insert(scheduledMessages).values({
    guestId,
    bookingId: null,
    kind,
    templateName: `nst_${kind}_vX`,
    params: { firstName: 'Rahul' },
    sendAt: new Date(),
    dedupeKey: `${kind}:${guestId}:${randomUUID()}`,
    ...over,
  });
}

function rig(reply = 'Lovely — I have you noted.') {
  const wa = createWaClient({
    db,
    log,
    graphBaseUrl: 'https://graph.test.invalid/v23.0',
    phoneNumberId: '1',
    accessToken: 't',
    httpImpl: async () =>
      new Response(JSON.stringify({ messages: [{ id: `wamid.C-${randomUUID()}` }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  });
  const deps: WorkerDeps = {
    db,
    wa,
    log,
    windows: DEBOUNCE_WINDOWS,
    converse: async () => textResult(reply),
    ...noToolDeps(log),
    nightStart: '20:00',
    nightEnd: '10:00',
    enqueue: async () => {},
  };
  return deps;
}

const getGuest = (id: string) => db.select().from(guests).where(eq(guests.id, id)).then((r) => r[0]);
const aiOut = (conversationId: string) =>
  db
    .select({ body: schema.messages.body })
    .from(schema.messages)
    .where(
      and(
        eq(schema.messages.conversationId, conversationId),
        eq(schema.messages.direction, 'out'),
        eq(schema.messages.sender, 'ai'),
      ),
    );

// ── pure lexicons ────────────────────────────────────────────────────────────

describe('isAffirmative', () => {
  it.each(['yes', 'yes please', 'sure, go ahead', 'haan', 'zaroor', 'absolutely'])(
    'accepts %j',
    (t) => expect(isAffirmative(t)).toBe(true),
  );
  it.each(['no thanks', 'not now', 'maybe later', 'what are the rates'])(
    'rejects %j',
    (t) => expect(isAffirmative(t)).toBe(false),
  );
});

// ── consent DB helpers ───────────────────────────────────────────────────────

describe('consent DB helpers', () => {
  const seedGuest = async (over: Partial<typeof guests.$inferInsert> = {}) => {
    const [g] = await db
      .insert(guests)
      .values({ phone: `+91770090${Math.floor(1000 + Math.random() * 8999)}`, firstName: 'Rahul', ...over })
      .returning({ id: guests.id });
    return g!.id;
  };

  it('captureInChatOptIn flips a fresh guest and is a no-op once in or out', async () => {
    const fresh = await seedGuest();
    expect(await captureInChatOptIn(db, fresh, new Date())).toBe(true);
    expect((await getGuest(fresh))?.marketingOptIn).toBe(true);
    expect((await getGuest(fresh))?.marketingOptInSource).toBe('in_chat');
    // A second call does nothing (already in).
    expect(await captureInChatOptIn(db, fresh, new Date())).toBe(false);

    const optedOut = await seedGuest({ optOutMarketing: true });
    // An explicit opt-out is NEVER overridden by a later "yes".
    expect(await captureInChatOptIn(db, optedOut, new Date())).toBe(false);
    expect((await getGuest(optedOut))?.marketingOptIn).toBe(false);
  });

  it('setMarketingOptOut clears opt-in and sets the durable flag', async () => {
    const g = await seedGuest({ marketingOptIn: true, marketingOptInSource: 'in_chat' });
    await setMarketingOptOut(db, g);
    const row = await getGuest(g);
    expect(row?.marketingOptIn).toBe(false);
    expect(row?.optOutMarketing).toBe(true);
  });

  it('cancelPendingMarketingRows cancels the marketing FAMILY, never utility or sent rows', async () => {
    const g = await seedGuest();
    await insertScheduled(g, 'winback', { status: 'pending' });
    await insertScheduled(g, 'lead_followup', { status: 'pending' });
    await insertScheduled(g, 'prearrival', { status: 'pending' }); // utility — must survive
    await insertScheduled(g, 'winback', { status: 'sent' }); // already sent — history

    const n = await cancelPendingMarketingRows(db, g, MARKETING_KINDS);
    expect(n).toBe(2); // the two pending marketing rows

    const rows = await db.select().from(scheduledMessages).where(eq(scheduledMessages.guestId, g));
    const byKindStatus = Object.fromEntries(rows.map((r) => [`${r.kind}:${r.status}`, r.skipReason]));
    expect(byKindStatus['winback:cancelled']).toBe('opted_out');
    expect(byKindStatus['lead_followup:cancelled']).toBe('opted_out');
    expect(byKindStatus['prearrival:pending']).toBeDefined(); // untouched
    expect(byKindStatus['winback:sent']).toBeDefined(); // untouched
  });

  it('hasRecentPoststay and countRecentLeadFollowups read the window correctly', async () => {
    const g = await seedGuest();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 6 * 86_400_000);
    const longAgo = new Date(now.getTime() - 60 * 86_400_000);

    await insertScheduled(g, 'poststay', { status: 'sent', updatedAt: weekAgo });
    expect(await hasRecentPoststay(db, g, new Date(now.getTime() - 7 * 86_400_000))).toBe(true);
    expect(await hasRecentPoststay(db, g, new Date(now.getTime() - 3 * 86_400_000))).toBe(false);

    await insertScheduled(g, 'lead_followup', { status: 'sent', createdAt: weekAgo });
    await insertScheduled(g, 'lead_followup', { status: 'pending', createdAt: longAgo });
    expect(await countRecentLeadFollowups(db, g, new Date(now.getTime() - 30 * 86_400_000))).toBe(1);
  });
});

// ── STOP through the worker ──────────────────────────────────────────────────

describe('STOP through the real worker', () => {
  async function seedWithMarketing(phone: string, over: Partial<typeof guests.$inferInsert> = {}) {
    const { guest, conversation } = await seedConversation(db, phone);
    await db.update(guests).set({ marketingOptIn: true, ...over }).where(eq(guests.id, guest.id));
    await insertScheduled(guest.id, 'winback', { status: 'pending' });
    await insertScheduled(guest.id, 'lead_followup', { status: 'pending' });
    await insertScheduled(guest.id, 'prearrival', { status: 'pending' });
    return { guest, conversation };
  }

  it('opts out, cancels the marketing family, keeps utility, and confirms once', async () => {
    const { guest, conversation } = await seedWithMarketing('+917700900601');
    await seedGuestMessage(db, conversation.id, 'STOP', 30);

    await processConversation(rig(), conversation.id);

    const g = await getGuest(guest.id);
    expect(g?.marketingOptIn).toBe(false);
    expect(g?.optOutMarketing).toBe(true);

    const rows = await db.select().from(scheduledMessages).where(eq(scheduledMessages.guestId, guest.id));
    const status = Object.fromEntries(rows.map((r) => [r.kind, r.status]));
    expect(status.winback).toBe('cancelled');
    expect(status.lead_followup).toBe('cancelled');
    expect(status.prearrival).toBe('pending'); // service continues

    const out = await aiOut(conversation.id);
    expect(out).toHaveLength(1);
    expect(out[0]?.body).toBe(PHRASEBOOK.marketingStopConfirm);
  });

  it('opts out EVEN under a human takeover — no line, but the write still fires', async () => {
    const { guest, conversation } = await seedWithMarketing('+917700900602');
    await db
      .update(schema.conversations)
      .set({ status: 'human_active' })
      .where(eq(schema.conversations.id, conversation.id));
    await seedGuestMessage(db, conversation.id, 'unsubscribe please', 30);

    await processConversation(rig(), conversation.id);

    const g = await getGuest(guest.id);
    expect(g?.optOutMarketing).toBe(true); // compliance is not gated on a human
    const [winback] = await db
      .select()
      .from(scheduledMessages)
      .where(and(eq(scheduledMessages.guestId, guest.id), eq(scheduledMessages.kind, 'winback')));
    expect(winback?.status).toBe('cancelled');
    // The AI stays silent during a takeover — no confirmation line.
    expect(await aiOut(conversation.id)).toHaveLength(0);
  });

  it('a bare "stop" inside a complaint does NOT opt out (homograph guard)', async () => {
    const { guest, conversation } = await seedWithMarketing('+917700900603');
    await seedGuestMessage(db, conversation.id, 'please stop, the AC is broken and filthy', 30);

    await processConversation(rig(), conversation.id);

    const g = await getGuest(guest.id);
    expect(g?.optOutMarketing).toBe(false);
    const [winback] = await db
      .select()
      .from(scheduledMessages)
      .where(and(eq(scheduledMessages.guestId, guest.id), eq(scheduledMessages.kind, 'winback')));
    expect(winback?.status).toBe('pending'); // not cancelled
  });
});

// ── YES opt-in through the worker ────────────────────────────────────────────

describe('post-stay YES opt-in through the real worker', () => {
  it('captures consent for a YES within 7 days of a sent poststay', async () => {
    const { guest, conversation } = await seedConversation(db, '+917700900611');
    await insertScheduled(guest.id, 'poststay', { status: 'sent' }); // updatedAt = now
    await seedGuestMessage(db, conversation.id, 'yes please, do keep in touch', 30);

    await processConversation(rig(), conversation.id);

    const g = await getGuest(guest.id);
    expect(g?.marketingOptIn).toBe(true);
    expect(g?.marketingOptInSource).toBe('in_chat');
    expect(g?.marketingOptInAt).not.toBeNull();
  });

  it('does NOT capture a YES with no recent poststay', async () => {
    const { guest, conversation } = await seedConversation(db, '+917700900612');
    await seedGuestMessage(db, conversation.id, 'yes sure', 30);

    await processConversation(rig(), conversation.id);
    expect((await getGuest(guest.id))?.marketingOptIn).toBe(false);
  });

  it('does NOT re-opt-in a guest who explicitly opted out', async () => {
    const { guest, conversation } = await seedConversation(db, '+917700900613');
    await db.update(guests).set({ optOutMarketing: true }).where(eq(guests.id, guest.id));
    await insertScheduled(guest.id, 'poststay', { status: 'sent' });
    await seedGuestMessage(db, conversation.id, 'yes ok', 30);

    await processConversation(rig(), conversation.id);
    expect((await getGuest(guest.id))?.marketingOptIn).toBe(false);
  });
});
