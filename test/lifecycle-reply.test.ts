/**
 * CH-12 · plan step 5, which the plan requires to be asserted, not assumed:
 * "Guest replies to any lifecycle message simply flow through the normal
 * pipeline (nothing special needed — assert in test)."
 *
 * The join is silent and easy to break. The scheduler creates the guest from
 * bookings_mirror.guest_phone; the webhook resolves the sender by
 * normalizePhone(message.from). If those two ever disagree, the reply lands in a
 * SECOND conversation, the confirmation we just sent is not in its transcript,
 * and the AI answers "when is my check-in?" as though it had never met them.
 * Nothing else in the suite pins that they agree.
 */
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import type { GateContext } from '../src/lifecycle/gates.js';
import { scheduleForBooking, type SchedulerDeps } from '../src/lifecycle/scheduler.js';
import { runSender, type SenderDeps } from '../src/lifecycle/sender.js';
import { touchPhoneWindow } from '../src/db/windows.js';
import { createWaClient } from '../src/wa/client.js';
import { TEST_URL, waitUntil } from './helpers/boss.js';
import { buildWaApp, signBody } from './helpers/wa.js';

/** The number as eZee gives it to us (no plus, no formatting) vs E.164. */
const EZEE_PHONE = '+917700900601';
const WA_FROM = '917700900601';

const GATES: GateContext = {
  epoch: new Date('2026-07-14T00:00:00Z'),
  today: '2026-07-14',
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
    sql`TRUNCATE scheduled_messages, phone_windows, raw_events, guest_stays, bookings_mirror, messages, conversations, guests CASCADE`,
  );
});

describe('a guest replying to a lifecycle message', () => {
  it('threads into the SAME conversation and wakes the normal worker', async () => {
    // 1. A booking arrives and the lifecycle schedules + sends the confirmation.
    await db.insert(schema.bookingsMirror).values({
      ezeeReservationNo: '953',
      guestName: 'Rahul Mehta',
      guestPhone: EZEE_PHONE,
      roomTypeName: 'Nistula Villa',
      checkIn: '2026-12-20',
      checkOut: '2026-12-22',
      status: 'confirmed',
      source: 'Internet Booking Engine',
      raw: {},
      syncedAt: new Date('2026-07-14T13:00:00Z'),
      createdAt: new Date('2026-07-14T13:00:00Z'),
    });
    const deps: SchedulerDeps = { db, log, gates: GATES };
    await scheduleForBooking(deps, '953');

    // The guest has never messaged us, so open a window the honest way — as if
    // they had — otherwise nothing can physically go out in simulate mode.
    await touchPhoneWindow(db, EZEE_PHONE, new Date());
    await db.execute(
      sql`UPDATE conversations SET service_window_expires_at = now() + interval '23 hours'`,
    );

    const wa = createWaClient({
      db,
      log: { error: vi.fn(), warn: vi.fn() },
      graphBaseUrl: 'https://graph.test.invalid/v23.0',
      phoneNumberId: '000000000000000',
      accessToken: 'test-token',
      httpImpl: async () =>
        new Response(JSON.stringify({ messages: [{ id: 'wamid.CONF-1' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    });
    const senderDeps: SenderDeps = {
      db,
      log,
      wa,
      gates: { sources: GATES.sources },
      enabled: true,
    };
    expect(await runSender(senderDeps)).toMatchObject({ sent: 1 });

    const [conversation] = await db.select().from(schema.conversations);
    const conversationId = conversation?.id as string;

    // 2. The guest replies to it, over the real webhook, with a real signature.
    const enqueued: string[] = [];
    const app = await buildWaApp(db, undefined, {
      enqueue: async (id) => {
        enqueued.push(id);
      },
    });
    const payload = JSON.stringify({
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                contacts: [{ wa_id: WA_FROM, profile: { name: 'Rahul' } }],
                messages: [
                  {
                    id: 'wamid.GUEST-REPLY-1',
                    from: WA_FROM,
                    type: 'text',
                    timestamp: '1783000000',
                    text: { body: 'lovely, thank you — what time is check-in?' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/whatsapp',
      payload,
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': signBody(payload),
      },
    });
    expect(res.statusCode).toBe(200);
    // The webhook ACKS FIRST and ingests after (§2.2 "200 in <1s") — so the row
    // is not there the instant inject() returns. Waiting for it is the honest
    // test; asserting immediately would just be racing our own design.
    await waitUntil(async () => {
      const [row] = await db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.waMessageId, 'wamid.GUEST-REPLY-1'));
      return row;
    }, 'the guest reply to be ingested');
    await app.close();

    // 3. THE ASSERTION: one guest, one conversation, and the reply sits in the
    //    same thread as the confirmation — so the AI sees what it just said.
    expect(await db.select().from(schema.guests)).toHaveLength(1);
    expect(await db.select().from(schema.conversations)).toHaveLength(1);

    const messages = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, conversationId))
      .orderBy(schema.messages.createdAt);
    expect(messages).toHaveLength(2);
    expect(messages[0]?.direction).toBe('out'); // our confirmation
    expect(messages[0]?.body).toContain('your booking with Nistula is confirmed');
    expect(messages[1]?.direction).toBe('in'); // their reply, same thread
    expect(messages[1]?.body).toContain('what time is check-in');

    // 4. ...and the normal debounced worker was woken for that conversation.
    expect(enqueued).toEqual([conversationId]);

    // 5. Their reply holds the 24h window open. It does NOT move it backwards to
    //    Meta's older timestamp — greatest() keeps the freshest inbound, which is
    //    exactly the guard that stops a redelivered old webhook from re-opening a
    //    window Meta has already closed.
    const [window] = await db
      .select()
      .from(schema.phoneWindows)
      .where(eq(schema.phoneWindows.phone, EZEE_PHONE));
    expect(window).toBeDefined();
    expect(window?.lastInboundAt.getTime()).toBeGreaterThanOrEqual(1783000000 * 1000);
  });
});
