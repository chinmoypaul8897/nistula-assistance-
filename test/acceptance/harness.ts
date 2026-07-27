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
 * mirror created_at) use REAL now, while business logic reads FAKE_NOW_IST.
 * `setClockAtHour(hhmm)` picks the NEXT IST hh:mm at/after real-now — which may
 * be tomorrow's IST date — so FAKE always lands inside (real-now, real-now+24h):
 * a real-now message stays both "old" (debounce processes it) and inside the 24h
 * window (the reply sends). Scenarios that set FAKE assert only clock-BAND facts
 * (night vs day, a due send), never an ordering between two FAKE stamps and a
 * real one; date-relative scenarios seed dates relative to today and leave the
 * clock real.
 */
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
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
import { DEFAULT_QUIET_STALE_MINUTES } from '../../src/ops/watchdog.js';
import { isStaffPhone } from '../../src/staff/roster.js';
import { atISTHour, istCalendarDay, nowIST, shiftDay } from '../../src/lib/time.js';
import { createWaClient } from '../../src/wa/client.js';
import { createTestBoss, waitUntil, TEST_URL } from '../helpers/boss.js';
import { buildWaApp, signBody } from '../helpers/wa.js';
import { buildAdminApp, TEST_ADMIN_TOKEN } from '../helpers/admin.js';
import { acceptanceRoster } from './seed.js';
import { fixtureEzee, fixtureWebsite, txt, type DoorState, B3_ROOM_ID } from './support.js';

const GRAPH = 'https://graph.test.invalid/v23.0';
const PHONE_ID = '000000000000000';
const DISPLAY = '917700900003';
/**
 * Short debounce windows — same code paths, CI-fast time (golden-path's rig).
 * Deliberately NOT as tight as they could be: at quietMs 500 / 15s waits the
 * suite flaked under machine load (a turn that misses its window cascades — the
 * task is never raised, so the SLA nudge and every later assertion fail too).
 * A green-forever gate must not be load-sensitive, so the margins buy headroom
 * without changing a single code path or assertion.
 */
const WINDOWS = { quietMs: 1_000, maxWaitMs: 4_000, sweepAfterMs: 6_000, sweepIntervalCron: '*/2 * * * *' };
/** Generous ceiling for a turn to settle — only ever reached on a loaded box. */
const SETTLE_TIMEOUT_MS = 40_000;
/** Far past, so every freshly-inserted mirror row clears the epoch gate; the
 * OTA/date negatives exercise the OTHER gates on purpose. */
export const EPOCH = new Date('2000-01-01T00:00:00Z');

export interface CapturedSend {
  to: string;
  type: string;
  body: string;
  /** Which wa client dispatched it — the two share one capture array. */
  mode: 'send' | 'simulate';
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
  /** One lifecycle sender tick in dev-`simulate` mode (today's Railway default):
   * a closed-window send DEFERS instead of dispatching — the fail-closed reality. */
  runSenderSimulateNow(): ReturnType<typeof runSender>;
  /** One SLA-nudger tick at the current clock. */
  runSlaNow(): ReturnType<typeof runSlaNudger>;
  /** One morning-digest run at the current clock. */
  runDigestNow(): ReturnType<typeof runMorningDigest>;
  /** The dev human-takeover seam (POST /admin/simulate-human-reply). */
  simulateHumanReply(phone: string, text: string): Promise<{ status: number }>;
  /** POST a raw smb_message_echoes webhook (S4's staff→staff no-op check). */
  echo(recipientPhone: string, body: string, opts?: { wamid?: string }): Promise<void>;
  /**
   * Set the business clock to the NEXT IST HH:MM at or after real-now. This lands
   * in the requested hour-band (S4 day 12:15, S5 night 23:05) AND stays inside
   * (real-now, real-now+24h) — so a message stamped at real-now is still both
   * "old" (debounce processes it) and inside the 24h window (the reply sends),
   * whatever wall-clock hour the suite happens to run at.
   */
  setClockAtHour(hhmm: string): void;
  /** Clear the business clock back to real time. */
  clearClock(): void;
  /** The concatenated system-prompt text of the LAST model turn — so a scenario
   * can assert what the model actually SAW (e.g. block [5] carried a fact). */
  lastSystemText(): string;
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
  // A silent logger (no vitest dependency, so the CLI can run under tsx) — the
  // harness never asserts on logs; SYS outcomes are read from the DB and sends.
  const noop = () => undefined;
  const log = { info: noop, warn: noop, error: noop };
  const roster = acceptanceRoster();
  const door: DoorState = { roomId: B3_ROOM_ID, currentStatus: 'Confirmed' };

  const sends: CapturedSend[] = [];
  // Tagged per client: both write to ONE capture, so without `mode` a future
  // count assertion would silently conflate the send-mode and simulate-mode
  // transports (a round-2 review flagged the latent trap).
  const makeCapture =
    (mode: CapturedSend['mode']) =>
    async (_url: string, options?: { body?: string }): Promise<Response> => {
      const payload = JSON.parse(options?.body ?? '{}') as Record<string, unknown>;
      const to = String(payload.to ?? '');
      const type = String(payload.type ?? 'text');
      const body =
        type === 'text'
          ? String((payload.text as { body?: string } | undefined)?.body ?? '')
          : JSON.stringify(payload.template ?? {});
      sends.push({ to, type, body, mode, payload });
      return new Response(JSON.stringify({ messages: [{ id: `wamid.OUT-${sends.length}` }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
  const waDeps = {
    db,
    log,
    graphBaseUrl: GRAPH,
    phoneNumberId: PHONE_ID,
    accessToken: 'test-token',
    now: () => nowIST(),
  };
  // Two clients on ONE capture: 'send' (the post-cutover production path) dispatches
  // a closed-window lifecycle/staff message as a real captured template; 'simulate'
  // (today's Railway default — WA_TEMPLATE_MODE unset) DEFERS a closed-window send,
  // because a simulated template is physically free-form and cannot enter a shut
  // window. S2 asserts BOTH: the send-mode confirmation goes, and the simulate-mode
  // confirmation defers (the fail-closed reality holding back real people).
  const wa = createWaClient({ ...waDeps, templateMode: 'send', httpImpl: makeCapture('send') });
  const waSimulate = createWaClient({
    ...waDeps,
    templateMode: 'simulate',
    httpImpl: makeCapture('simulate'),
  });

  // The scripted model: a FIFO of turn-rounds. Each guest/staff turn calls
  // converse once per tool round; script() replaces the queue so a turn that
  // called fewer times than scripted cannot leak rounds into the next.
  let scriptQueue: ConverseResult[] = [];
  let lastSystem = '';
  const converse: ConverseFn = async (input: ConverseInput) => {
    lastSystem = input.system.map((b) => b.text).join('\n');
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
    // A SEPARATE summariser client (fixed summary text), so a background summarise
    // — which shares deps.converse by default — can never shift() a scripted round
    // meant for the next guest turn. No scenario builds a >=20-msg thread today, so
    // this is a footgun latch, not a live bug.
    converseLight: async () => txt('Earlier: the guest and the assistant spoke; nothing outstanding.'),
    toolRegistry: buildToolRegistry(),
    quietStaleMinutes: DEFAULT_QUIET_STALE_MINUTES,
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
    }, 'every webhook fully ingested (enqueue landed)', SETTLE_TIMEOUT_MS);
  }

  async function waitQueueQuiescent(queue: string): Promise<void> {
    await waitUntil(async () => {
      const rows = await db.execute<{ pending: number | string }>(sql`
        SELECT count(*)::int AS pending FROM pgboss.job
        WHERE name = ${queue} AND state::text IN ('created', 'retry', 'active')`);
      return Number(rows[0]?.pending) === 0;
    }, `${queue} quiescent`, SETTLE_TIMEOUT_MS);
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
      lastSystem = '';
      // raw_events is truncated here, so the ingest counter must reset with it —
      // otherwise waitIngested waits for a cumulative count the fresh table can
      // never reach (S3 timed out on exactly this).
      postedCount = 0;
      // A clock a prior scenario set must never leak into the next.
      delete process.env.FAKE_NOW_IST;
      // The mutable BKG-03 door handle resets to a live confirmed B3 (a scenario
      // that flips it to void/cancelled must not bleed into the next).
      door.roomId = B3_ROOM_ID;
      door.currentStatus = 'Confirmed';
    },

    setClockAtHour(hhmm) {
      const realNow = new Date();
      const todayAt = atISTHour(realNow, hhmm);
      const day =
        todayAt.getTime() >= realNow.getTime()
          ? istCalendarDay(realNow)
          : shiftDay(istCalendarDay(realNow), 1);
      process.env.FAKE_NOW_IST = `${day}T${hhmm}`;
    },

    clearClock() {
      delete process.env.FAKE_NOW_IST;
    },

    lastSystemText() {
      return lastSystem;
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
      const jobId = await boss.send(queue, { reservationNo });
      // Wait for THIS job to settle, not for the queue to look quiescent. The
      // queue-quiescence check raced a cold worker: with the boss just started
      // (S2 run in isolation, or reordered scenarios) the poll could read zero
      // in-flight before the worker picked the job up, and the scenario ran on
      // an unprocessed booking. Keying on the job id is exact.
      await waitUntil(async () => {
        if (jobId === null) return true;
        const rows = await db.execute<{ state: string }>(
          sql`SELECT state::text AS state FROM pgboss.job WHERE id = ${jobId}`,
        );
        const state = rows[0]?.state;
        return state === undefined || !['created', 'active', 'retry'].includes(state);
      }, `booking job settled: ${kind} ${reservationNo}`, SETTLE_TIMEOUT_MS);
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

    runSenderSimulateNow() {
      return runSender({
        db,
        log,
        wa: waSimulate,
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
