/**
 * CH-19 acceptance harness (plan.md §8 CH-19) — the in-process replay rig.
 *
 * It boots the REAL pipeline exactly as `test/golden-path.test.ts` does — real
 * Postgres, real pg-boss workers, the real webhook→worker→guardrails→send hot
 * path and the real lifecycle/staff/escalation code — and stubs ONLY the four
 * external boundaries deterministically: Claude (scripted turns), the website
 * quote API (fixture QuoteView), eZee BKG-03 door reads (fixture RoomID), and
 * WhatsApp sends (captured, never dispatched). Every SYS assertion the scenarios
 * make therefore proves the system, not the script.
 *
 * Clock rule (see the per-scenario notes): DB timestamps (message created_at,
 * mirror created_at) use REAL now, while business logic reads FAKE_NOW_IST. To
 * keep the two consistent, a scenario that sets FAKE_NOW keeps its DATE = today
 * and varies only the HOUR (S5's night/morning); date-relative scenarios seed
 * dates relative to today and leave the clock real.
 */
import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { vi } from 'vitest';
import type { PgBoss } from 'pg-boss';
import type { ConverseFn, ConverseInput, ConverseResult } from '../../src/brain/claude.js';
import { createDegradedTracker } from '../../src/brain/tools/degraded.js';
import { buildToolRegistry } from '../../src/brain/tools/index.js';
import { loadKnowledge } from '../../src/brain/knowledge.js';
import { createRateWindow } from '../../src/brain/policy.js';
import type { Db } from '../../src/db/client.js';
import * as schema from '../../src/db/schema.js';
import {
  BOOKING_EVENT_QUEUES,
  CONVERSATION_PROCESS_QUEUE,
  STAFF_COMMAND_QUEUE,
  makeEnqueue,
  registerJobs,
  type Jobs,
} from '../../src/jobs/index.js';
import type { BookingEventKind } from '../../src/lifecycle/scheduler.js';
import { runSender } from '../../src/lifecycle/sender.js';
import { runSlaNudger } from '../../src/staff/sla.js';
import { runMorningDigest } from '../../src/staff/digest.js';
import { isStaffPhone } from '../../src/staff/roster.js';
import { istCalendarDay, nowIST } from '../../src/lib/time.js';
import { createWaClient } from '../../src/wa/client.js';
import { createTestBoss, waitUntil, TEST_URL } from '../helpers/boss.js';
import { buildWaApp, signBody } from '../helpers/wa.js';
import { buildAdminApp, TEST_ADMIN_TOKEN } from '../helpers/admin.js';
import { acceptanceRoster } from './seed.js';
import { fixtureEzee, fixtureWebsite, txt, type DoorState, B3_ROOM_ID } from './support.js';

const GRAPH = 'https://graph.test.invalid/v23.0';
const PHONE_ID = '000000000000000';
const DISPLAY = '917700900003';
/** Short debounce windows — same code paths, CI-fast time (golden-path's rig). */
const WINDOWS = { quietMs: 500, maxWaitMs: 2_000, sweepAfterMs: 3_000, sweepIntervalCron: '*/2 * * * *' };
/** Far past, so every freshly-inserted mirror row clears the epoch gate; the
 * OTA/date negatives exercise the OTHER gates on purpose. */
export const EPOCH = new Date('2000-01-01T00:00:00Z');

export interface CapturedSend {
  to: string;
  type: string;
  body: string;
  payload: Record<string, unknown>;
}

export interface Harness {
  db: Db;
  boss: PgBoss;
  jobs: Jobs;
  sends: CapturedSend[];
  door: DoorState;
  /** Reset all app tables + the captured sends between scenarios. */
  reset(): Promise<void>;
  /** Register the model rounds the NEXT guest/staff turn will pop, in order. */
  script(...rounds: ConverseResult[]): void;
  /** POST one signed guest webhook and wait until the turn has fully settled. */
  sendGuest(phone: string, body: string, opts?: { name?: string }): Promise<void>;
  /** POST a rapid burst from one guest → the debounce yields ONE turn. */
  sendGuestBurst(phone: string, bodies: string[], opts?: { name?: string }): Promise<void>;
  /** POST one signed staff webhook (DONE/TASKS/AI ON-OFF) and wait for settle. */
  sendStaff(phone: string, body: string): Promise<void>;
  /** Wake the REAL booking event path (processBookingJob) and wait for settle. */
  driveBooking(kind: BookingEventKind, reservationNo: string): Promise<void>;
  /** One lifecycle sender tick (mode 'send' → templates captured). */
  runSenderNow(): ReturnType<typeof runSender>;
  /** One SLA-nudger tick at the current clock. */
  runSlaNow(): ReturnType<typeof runSlaNudger>;
  /** One morning-digest run at the current clock. */
  runDigestNow(): ReturnType<typeof runMorningDigest>;
  /** The dev human-takeover seam (POST /admin/simulate-human-reply). */
  simulateHumanReply(phone: string, text: string): Promise<{ status: number }>;
  /** POST a raw smb_message_echoes webhook (S4's staff→staff no-op check). */
  echo(recipientPhone: string, body: string, opts?: { wamid?: string }): Promise<void>;
  close(): Promise<void>;
}

const TRUNCATE = sql`TRUNCATE
  messages, conversations, raw_events, guests, cost_events,
  bookings_mirror, guest_stays, guest_facts, tasks, scheduled_messages,
  drafts, phone_windows, reference_attempts CASCADE`;

export async function buildHarness(): Promise<Harness> {
  const client = postgres(TEST_URL, { max: 6, onnotice: () => {} });
  const db: Db = drizzle(client, { schema });
  const boss = await createTestBoss();
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const roster = acceptanceRoster();
  const door: DoorState = { roomId: B3_ROOM_ID, currentStatus: 'Confirmed' };

  const sends: CapturedSend[] = [];
  const wa = createWaClient({
    db,
    log,
    graphBaseUrl: GRAPH,
    phoneNumberId: PHONE_ID,
    accessToken: 'test-token',
    // 'send' so a closed-window lifecycle/staff message dispatches as a real
    // (captured) template — the production path. The simulate-defer reality is
    // asserted explicitly in S2, and is covered by lifecycle-sender.test.ts.
    templateMode: 'send',
    now: () => nowIST(),
    httpImpl: async (_url, options) => {
      const payload = JSON.parse(options?.body ?? '{}') as Record<string, unknown>;
      const to = String(payload.to ?? '');
      const type = String(payload.type ?? 'text');
      const body =
        type === 'text'
          ? String((payload.text as { body?: string } | undefined)?.body ?? '')
          : JSON.stringify(payload.template ?? {});
      sends.push({ to, type, body, payload });
      return new Response(JSON.stringify({ messages: [{ id: `wamid.OUT-${sends.length}` }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  // The scripted model: a FIFO of turn-rounds. Each guest/staff turn calls
  // converse once per tool round; script() replaces the queue so a turn that
  // called fewer times than scripted cannot leak rounds into the next.
  let scriptQueue: ConverseResult[] = [];
  const converse: ConverseFn = async (input: ConverseInput) => {
    const next = scriptQueue.shift();
    if (process.env.ACC_DEBUG === '1') {
      const lastUser = [...input.messages].reverse().find((m) => m.role === 'user');
      const body = typeof lastUser?.content === 'string' ? lastUser.content.slice(-60) : '[blocks]';
      process.stderr.write(`\nCONVERSE queue=${scriptQueue.length} scripted=${next !== undefined} last="${body}"\n`);
    }
    return next ?? txt('(unscripted turn — the harness registered no model round)');
  };

  const jobs = await registerJobs({
    boss,
    db,
    wa,
    log,
    converse,
    toolRegistry: buildToolRegistry(),
    website: fixtureWebsite(),
    websiteBaseUrl: 'https://website.test.invalid',
    degraded: createDegradedTracker({ log }),
    knowledge: loadKnowledge(),
    rateWindow: createRateWindow(),
    opsNumbers: roster.opsNumbers.slice(),
    nightStart: '20:00',
    nightEnd: '10:00',
    windows: WINDOWS,
    pollingIntervalSeconds: 0.5,
    ezee: { client: fixtureEzee(door), pollerEnabled: false },
    lifecycle: { gates: { epoch: EPOCH, sources: ['walk-in', 'internet booking engine'] }, sendEnabled: true },
    staff: { roster },
    draftMode: false,
    autoSendTypes: [],
  });

  const waApp = await buildWaApp(db, undefined, {
    enqueue: makeEnqueue(boss, WINDOWS),
    staff: {
      isStaffPhone: (phone) => isStaffPhone(roster, phone),
      enqueueCommand: jobs.enqueueStaffCommand,
    },
    coexistence: jobs.coexistence,
  });
  const adminApp = await buildAdminApp(db, undefined, TEST_ADMIN_TOKEN, jobs.coexistence);

  let wamidSeq = 0;
  const nextWamid = () => `wamid.ACC-${String(++wamidSeq).padStart(5, '0')}`;

  function guestPayload(phone: string, body: string, wamid: string, name: string): string {
    const from = phone.replace(/^\+/, '');
    return JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: PHONE_ID,
          changes: [
            {
              field: 'messages',
              value: {
                contacts: [{ wa_id: from, profile: { name } }],
                messages: [
                  {
                    id: wamid,
                    from,
                    text: { body },
                    type: 'text',
                    timestamp: String(Math.floor(Date.now() / 1000)),
                  },
                ],
                metadata: { phone_number_id: PHONE_ID, display_phone_number: DISPLAY },
                messaging_product: 'whatsapp',
              },
            },
          ],
        },
      ],
    });
  }

  // The webhook acks FIRST, then ingests async, and only sets raw_events.processed
  // AFTER the enqueue — so a processed=true count that matches the POSTs is the
  // reliable "every webhook fully ingested (enqueue included)" signal. Checking
  // the message row instead raced the enqueue (0 replies, intermittently).
  let postedCount = 0;

  async function post(app: Awaited<ReturnType<typeof buildWaApp>>, payload: string): Promise<void> {
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/whatsapp',
      payload,
      headers: { 'content-type': 'application/json', 'x-hub-signature-256': signBody(payload) },
    });
    if (res.statusCode !== 200) throw new Error(`webhook POST ${res.statusCode}: ${res.body}`);
    postedCount += 1;
  }

  async function waitIngested(): Promise<void> {
    await waitUntil(async () => {
      const rows = await db
        .select({ processed: schema.rawEvents.processed })
        .from(schema.rawEvents)
        .where(eq(schema.rawEvents.source, 'whatsapp'));
      return rows.length >= postedCount && rows.every((r) => r.processed);
    }, 'every webhook fully ingested (enqueue landed)');
  }

  async function waitQueueQuiescent(queue: string): Promise<void> {
    await waitUntil(async () => {
      const rows = await db.execute<{ pending: number | string }>(sql`
        SELECT count(*)::int AS pending FROM pgboss.job
        WHERE name = ${queue} AND state::text IN ('created', 'retry', 'active')`);
      return Number(rows[0]?.pending) === 0;
    }, `${queue} quiescent`);
  }

  const harness: Harness = {
    db,
    boss,
    jobs,
    sends,
    door,

    async reset() {
      await db.execute(TRUNCATE);
      sends.length = 0;
      scriptQueue = [];
      // raw_events is truncated here, so the ingest counter must reset with it —
      // otherwise waitIngested waits for a cumulative count the fresh table can
      // never reach (S3 timed out on exactly this).
      postedCount = 0;
    },

    script(...rounds) {
      scriptQueue = rounds;
    },

    async sendGuest(phone, body, opts) {
      await post(waApp, guestPayload(phone, body, nextWamid(), opts?.name ?? 'Guest'));
      await waitIngested();
      await waitQueueQuiescent(CONVERSATION_PROCESS_QUEUE);
    },

    async sendGuestBurst(phone, bodies, opts) {
      for (const body of bodies) {
        await post(waApp, guestPayload(phone, body, nextWamid(), opts?.name ?? 'Guest'));
      }
      await waitIngested();
      await waitQueueQuiescent(CONVERSATION_PROCESS_QUEUE);
    },

    async sendStaff(phone, body) {
      await post(waApp, guestPayload(phone, body, nextWamid(), 'Staff'));
      await waitIngested();
      await waitQueueQuiescent(STAFF_COMMAND_QUEUE);
    },

    async driveBooking(kind, reservationNo) {
      const queue = BOOKING_EVENT_QUEUES[kind];
      await boss.send(queue, { reservationNo });
      await waitQueueQuiescent(queue);
    },

    runSenderNow() {
      return runSender({
        db,
        log,
        wa,
        gates: { sources: ['walk-in', 'internet booking engine'], today: istCalendarDay(nowIST()) },
        enabled: true,
        now: () => nowIST(),
      });
    },

    runSlaNow() {
      return runSlaNudger({ db, log, wa, roster, opsNumbers: roster.opsNumbers.slice(), now: () => nowIST() });
    },

    runDigestNow() {
      return runMorningDigest({
        db,
        log,
        wa,
        roster,
        opsNumbers: roster.opsNumbers.slice(),
        nightStart: '20:00',
        now: () => nowIST(),
      });
    },

    async simulateHumanReply(phone, text) {
      const res = await adminApp.inject({
        method: 'POST',
        url: '/admin/simulate-human-reply',
        payload: JSON.stringify({ phone, text }),
        headers: { 'content-type': 'application/json', authorization: `Bearer ${TEST_ADMIN_TOKEN}` },
      });
      return { status: res.statusCode };
    },

    async echo(recipientPhone, body, opts) {
      const wamid = opts?.wamid ?? nextWamid();
      const to = recipientPhone.replace(/^\+/, '');
      const payload = JSON.stringify({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: PHONE_ID,
            changes: [
              {
                field: 'smb_message_echoes',
                value: {
                  metadata: { phone_number_id: PHONE_ID, display_phone_number: DISPLAY },
                  message_echoes: [
                    { id: wamid, to, text: { body }, type: 'text', timestamp: String(Math.floor(Date.now() / 1000)) },
                  ],
                  messaging_product: 'whatsapp',
                },
              },
            ],
          },
        ],
      });
      await post(waApp, payload);
      await waitIngested();
      await waitQueueQuiescent(CONVERSATION_PROCESS_QUEUE);
    },

    async close() {
      await waApp.close();
      await adminApp.close();
      await boss.stop({ graceful: false });
      await client.end();
    },
  };

  return harness;
}
