/**
 * CH-13a · staff tasks end to end through the REAL worker.
 *
 * Proves what the unit tests only prove in pieces, and it is the CH-12 lesson
 * applied: drive the REAL path (`processConversation` → the real tool loop →
 * the real guardrail pipeline), and assert the OUTCOME — what the guest was
 * told, and whether a row exists — never a precondition.
 *
 * Phone decade 8xx is CH-13a's claim in the test-number ledger.
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
import { closeTaskByShortId } from '../src/db/tasks.js';
import * as schema from '../src/db/schema.js';
import { touchPhoneWindow } from '../src/db/windows.js';
import { createWaClient } from '../src/wa/client.js';
import { buildStaffTaskDeps } from '../src/staff/index.js';
import type { Roster } from '../src/staff/roster.js';
import { noToolDeps, textResult } from './helpers/brain.js';
import { seedConversation, seedGuestMessage } from './helpers/seed.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';
const GUEST = '+917700900821';
const ANITA = '+917700900822';
const MEERA = '+917700900823';

const ROSTER: Roster = {
  members: [
    { name: 'Anita', phone: ANITA, role: 'housekeeping', villas: ['Apartment 06'] },
    { name: 'Meera', phone: MEERA, role: 'frontdesk', villas: [] },
  ],
  opsNumbers: [],
};

let client: ReturnType<typeof postgres>;
let db: Db;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema }) as unknown as Db;
}, 30_000);

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE tasks, guest_stays, bookings_mirror, messages, conversations, guests, raw_events, phone_windows CASCADE`,
  );
});

afterAll(async () => {
  await client?.end();
});

/** An in-house stay in Apartment 06 — the scenario-3 precondition. */
const mirrorInput = (over: Partial<MirrorRowInput> = {}): MirrorRowInput => {
  const today = new Date();
  const iso = (offsetDays: number) =>
    new Date(today.getTime() + offsetDays * 86_400_000).toISOString().slice(0, 10);
  return {
    ezeeReservationNo: '972',
    ezeeBookingTranId: 't1',
    guestName: 'Rahul',
    guestPhone: GUEST,
    guestEmail: null,
    roomTypeId: '5220300000000000001',
    roomTypeName: 'Nistula Apartment',
    // The MIRROR's label is deliberately WRONG/stale here — the fresh BKG-03
    // read is what the card must use.
    physicalRoomLabel: 'Villa B3',
    rateplanId: null,
    checkIn: iso(-1),
    checkOut: iso(2),
    adults: 2,
    children: 0,
    status: 'confirmed',
    source: 'Internet Booking Engine',
    amount: null,
    currency: 'INR',
    raw: { BookingTran: [{ RoomID: '5220300000000000008' }] },
    ...over,
  };
};

/**
 * A rig whose model calls create_staff_task (round 1) then proses (round 2) —
 * the REAL tool loop, so the gates, the door read, the card and the guardrail
 * pipeline all actually run.
 */
function rig(options: {
  door?: { resolved: true; label: string; roomId: string } | { resolved: false; reason: 'unreadable' };
  cardOk?: boolean;
  reply?: string;
  summary?: string;
}) {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const converseCalls: ConverseInput[] = [];
  const carded: { to: string; params: Record<string, string> }[] = [];
  let round = 0;
  const converse: ConverseFn = async (input) => {
    converseCalls.push(input);
    round += 1;
    if (round === 1) {
      const use = {
        id: 'tu_1',
        name: 'create_staff_task',
        input: { kind: 'housekeeping', summary: options.summary ?? '2 extra towels' },
      };
      return {
        text: '',
        toolUses: [use],
        stopReason: 'tool_use' as const,
        assistantContent: [
          { type: 'tool_use' as const, id: use.id, name: use.name, input: use.input },
        ],
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      };
    }
    return textResult(options.reply ?? 'Two fresh towels are on their way up.');
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
  // Wrap the real client so the card's params are observable without faking
  // the window logic away.
  const waSpy = {
    ...wa,
    sendTemplated: async (
      to: Parameters<typeof wa.sendTemplated>[0],
      send: Parameters<typeof wa.sendTemplated>[1],
      opts: Parameters<typeof wa.sendTemplated>[2],
    ) => {
      carded.push({ to, params: send.params });
      if (options.cardOk === false) {
        return {
          ok: false as const,
          messageId: null,
          error: 'WINDOW_CLOSED_SIMULATED',
          usedTemplate: false,
          retryable: true,
        };
      }
      return wa.sendTemplated(to, send, opts);
    },
  };
  const staff = buildStaffTaskDeps({
    db,
    log,
    wa: waSpy,
    roster: ROSTER,
    ezee: {
      fetchSingleBooking: async () => ({
        status: 'ok' as const,
        reservations:
          options.door === undefined || options.door.resolved
            ? [
                {
                  UniqueID: '972',
                  BookingTran: [
                    {
                      CurrentStatus: 'Confirmed Reservation',
                      RoomID: options.door?.resolved
                        ? options.door.roomId
                        : '5220300000000000008',
                    },
                  ],
                },
              ]
            : [],
        cancels: [],
        raw: {},
      }),
    } as never,
  });
  const deps: WorkerDeps = {
    db,
    wa: waSpy,
    log,
    windows: DEBOUNCE_WINDOWS,
    converse,
    ...noToolDeps(log),
    tasks: options.door !== undefined && !options.door.resolved ? { ...staff, resolveDoor: async () => ({ resolved: false, reason: 'unreadable' }) } : staff,
    nightStart: '20:00',
    nightEnd: '10:00',
    enqueue: async () => {},
  };
  return { deps, converseCalls, carded, log };
}

const outbound = async (conversationId: string) =>
  [
    ...(await db.execute(
      sql`SELECT body, sender, status FROM messages WHERE conversation_id = ${conversationId} AND direction = 'out' ORDER BY created_at`,
    )),
  ] as { body: string; sender: string; status: string }[];

async function seedInHouseGuest() {
  const { guest, conversation } = await seedConversation(db, GUEST);
  await upsertMirrorRow(db, mirrorInput());
  await db.insert(schema.guestStays).values({
    guestId: guest.id,
    bookingId: (await db.select().from(schema.bookingsMirror))[0]!.id,
    matchedBy: 'phone',
  });
  return { guest, conversation };
}

/**
 * 🚨 The staff 24h window, and it is not test scaffolding — it is the world.
 *
 * A card to a staff number whose window is SHUT cannot go: Meta treats it as
 * business-initiated exactly like a guest send, and in dev `WA_TEMPLATE_MODE`
 * is `simulate`, so the "template" is physically free-form and is refused too.
 * The card only lands because the housekeeper has written to the line inside
 * the last 24 hours — which is precisely why the DoD needs the second number to
 * message us first, and why plan.md:727 says that buys 24 hours, NOT for ever.
 *
 * My first cut of this suite omitted this and the test failed with
 * notify_failed. That failure was the code being right.
 */
async function openStaffWindows() {
  await touchPhoneWindow(db, ANITA, new Date());
  await touchPhoneWindow(db, MEERA, new Date());
}

describe('🚨 scenario 3, end to end through the real worker', () => {
  it('an in-house guest asking for towels gets a task, a card at the FRESH door, and the promise', async () => {
    const { conversation } = await seedInHouseGuest();
    await openStaffWindows();
    await seedGuestMessage(db, conversation.id, 'hi, can we get 2 extra towels', 20);
    const { deps, carded } = rig({});

    await processConversation(deps, conversation.id);

    // The task exists, routed off the FRESH BKG-03 read (Apartment 06) — NOT
    // the mirror's stale 'Villa B3'.
    const tasks = [...(await db.execute(sql`SELECT villa_label, kind, status, assigned_phone FROM tasks`))];
    expect(tasks).toEqual([
      {
        villa_label: 'Apartment 06',
        kind: 'housekeeping',
        status: 'open',
        assigned_phone: ANITA,
      },
    ]);
    // The card went to the housekeeper whose round has that house.
    expect(carded[0]?.to).toBe(ANITA);
    expect(carded[0]?.params.villa).toBe('Apartment 06');

    // And the guest was told — the promise guardrail 2 licensed off the task.
    const out = await outbound(conversation.id);
    expect(out[0]?.body).toContain('on their way');
  });

  it('🚨 the guest reply names NO house, even though the card does', async () => {
    // product-picture S3: the card MAY name the house (it is the door);
    // the REPLY may not (OQ-15). Two audiences, two contracts, one turn.
    const { conversation } = await seedInHouseGuest();
    await openStaffWindows();
    await seedGuestMessage(db, conversation.id, 'can we get 2 extra towels', 20);
    const { deps, carded } = rig({ reply: 'Two fresh towels are on their way up.' });

    await processConversation(deps, conversation.id);

    expect(carded[0]?.params.villa).toBe('Apartment 06');
    const out = await outbound(conversation.id);
    expect(out[0]?.body).not.toMatch(/Apartment|Villa B3/i);
  });

  it('🚨 an UNDELIVERED card means the guest is NOT promised anything', async () => {
    // The whole chain in one assertion: the card fails → the tool returns
    // ok:false NOT_NOTIFIED → covered() counts successful runs only → the
    // "on their way" draft is a guardrail-2 violation → it never ships.
    const { conversation } = await seedInHouseGuest();
    await openStaffWindows();
    await seedGuestMessage(db, conversation.id, 'can we get 2 extra towels', 20);
    const { deps } = rig({ cardOk: false, reply: 'Two fresh towels are on their way up.' });

    await processConversation(deps, conversation.id);

    // The task is REAL — a real ask from a real guest, recorded as a hole.
    const tasks = [...(await db.execute(sql`SELECT status FROM tasks`))];
    expect(tasks).toEqual([{ status: 'notify_failed' }]);

    const out = await outbound(conversation.id);
    const said = out.map((m) => m.body).join(' ');
    expect(said).not.toMatch(/on their way/i);
  });

  it('a guest with no stay gets no task at all — the stage gate, on the real path', async () => {
    const { conversation } = await seedConversation(db, GUEST);
    await seedGuestMessage(db, conversation.id, 'can we get 2 extra towels', 20);
    const { deps, carded } = rig({});

    await processConversation(deps, conversation.id);

    expect([...(await db.execute(sql`SELECT count(*)::int AS n FROM tasks`))]).toEqual([{ n: 0 }]);
    expect(carded).toHaveLength(0);
  });

  it('an unreadable door still raises the task, on the villa TYPE, to the front desk', async () => {
    const { conversation } = await seedInHouseGuest();
    await openStaffWindows();
    await seedGuestMessage(db, conversation.id, 'can we get 2 extra towels', 20);
    const { deps, carded } = rig({ door: { resolved: false, reason: 'unreadable' } });

    await processConversation(deps, conversation.id);

    const tasks = [...(await db.execute(sql`SELECT villa_label, assigned_phone FROM tasks`))];
    // The TYPE plus an unmistakable "not confirmed", never the mirror's stale
    // 'Villa B3'; and a human who can look it up. A guest's towels do not
    // depend on eZee being reachable.
    expect(tasks).toEqual([
      {
        villa_label: 'Nistula Apartment — house not confirmed, check eZee',
        assigned_phone: MEERA,
      },
    ]);
    expect(carded[0]?.to).toBe(MEERA);
  });
});

describe('🚨 the staff 24h window binds too — and it bites CH-13 first', () => {
  it('a COLD housekeeper cannot be reached, so the guest is promised NOTHING', async () => {
    // No openStaffWindows() here, deliberately: this is the DEFAULT state of a
    // staff number that has not written to the line in a day, and in simulate
    // mode there is no template to fall back to. plan.md:727 — the runbook's
    // "every staff number messages the line once" buys 24 HOURS, not for ever.
    // The system's answer is honest rather than convenient: the ask is
    // recorded, ops is paged, and the AI does not claim a person is moving.
    const { conversation } = await seedInHouseGuest();
    await seedGuestMessage(db, conversation.id, 'can we get 2 extra towels', 20);
    const { deps } = rig({ reply: 'Two fresh towels are on their way up.' });

    await processConversation(deps, conversation.id);

    expect([...(await db.execute(sql`SELECT status FROM tasks`))]).toEqual([
      { status: 'notify_failed' },
    ]);
    const said = (await outbound(conversation.id)).map((m) => m.body).join(' ');
    expect(said).not.toMatch(/on their way/i);
  });
});

describe('🚨 red team — the model tries to supply a house', () => {
  it('a summary naming the guest’s own guess is refused, and no card goes out', async () => {
    // The attack this tool is shaped against: the guest says "I'm in Apartment
    // 09", the model helpfully repeats it, and housekeeping walks to the wrong
    // door. The schema has no villa argument at all; this is the summary path.
    const { conversation } = await seedInHouseGuest();
    await seedGuestMessage(db, conversation.id, "I'm in Apartment 09, can we get towels", 20);
    const { deps, carded } = rig({
      summary: '2 extra towels for Apartment 09',
      reply: 'Two fresh towels are on their way up.',
    });

    await processConversation(deps, conversation.id);

    expect([...(await db.execute(sql`SELECT count(*)::int AS n FROM tasks`))]).toEqual([{ n: 0 }]);
    expect(carded).toHaveLength(0);
    // And with no successful task, the promise cannot ship either.
    const said = (await outbound(conversation.id)).map((m) => m.body).join(' ');
    expect(said).not.toMatch(/on their way/i);
  });
});

describe('🚨 CH-13a · the retry key survives the batch growing (real worker)', () => {
  it('a retry whose batch gained a message raises ONE card, not two', async () => {
    // THE DEFECT, reproduced end to end. The tool loop runs PRE-claim, so a
    // failure anywhere after it — a 529 on the prosing round, here — leaves the
    // cursor unmoved and pg-boss retries the WHOLE function. If the guest typed
    // again in between, attempt 2's batch is BIGGER. Keyed on the batch's
    // NEWEST message, that is a different key: GATE 0 missed, and the
    // housekeeper's phone buzzed a second time for one request.
    //
    // Asserts the OUTCOME (how many cards a human actually received), never
    // that the keys match — the CH-12 lesson: a test on the precondition is
    // how the last one shipped.
    const { conversation } = await seedInHouseGuest();
    await openStaffWindows();
    await touchPhoneWindow(db, GUEST, new Date());
    const first = await seedGuestMessage(db, conversation.id, 'can we get 2 extra towels', 60);

    // Attempt 1: the tool succeeds, THEN the turn dies.
    const a1 = rig({});
    let round = 0;
    a1.deps.converse = async () => {
      round += 1;
      if (round === 1) {
        const use = {
          id: 'tu_1',
          name: 'create_staff_task',
          input: { kind: 'housekeeping', summary: '2 extra towels' },
        };
        return {
          text: '',
          toolUses: [use],
          stopReason: 'tool_use' as const,
          assistantContent: [
            { type: 'tool_use' as const, id: use.id, name: use.name, input: use.input },
          ],
          usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
        };
      }
      throw new Error('overloaded_error'); // the card is out; the turn is not
    };
    await expect(processConversation(a1.deps, conversation.id)).rejects.toThrow();
    expect(a1.carded).toHaveLength(1);
    const afterFirst = [...(await db.execute(sql`SELECT id FROM tasks`))];
    expect(afterFirst).toHaveLength(1);

    // The guest types again while pg-boss waits, so the retry's batch is
    // [first, second] where attempt 1 saw only [first].
    const second = await seedGuestMessage(db, conversation.id, 'and some still water please', 30);
    expect(second.id).not.toBe(first.id);

    // Attempt 2: a retry is a fresh sample of a stochastic model, so it phrases
    // the same request differently — far enough apart that similar() cannot
    // rescue us and GATE 0 alone has to answer.
    const a2 = rig({ summary: 'guest would like more bath towels sent up' });
    await processConversation(a2.deps, conversation.id);

    expect([...(await db.execute(sql`SELECT id FROM tasks`))]).toHaveLength(1);
    expect(a2.carded).toHaveLength(0); // the replay re-cards nobody
  });
});

describe('🚨 CH-13a · a failed APPEND must not kill the live task (real worker, round-3 BLOCKER)', () => {
  it('the original task the housekeeper is holding stays OPEN and closable', async () => {
    // THE BLOCKER, three lenses found it. Turn 1 delivers a card; turn 2's
    // follow-up ("more towels") appends to the same task but its card fails
    // (a shut staff window, the DEFAULT state in simulate mode, or any Graph
    // 5xx). The append used to run markNotifyFailed on the ORIGINAL task —
    // flipping live work to the terminal notify_failed, so the DONE answered
    // "already closed" and the guest was never told the towels arrived.
    //
    // Asserts the OUTCOME a housekeeper reaches for: the task is still open and
    // DONE still closes it. With the bug the status is notify_failed and the
    // close returns null.
    const { conversation } = await seedInHouseGuest();
    await openStaffWindows();

    // Turn 1 — the card lands, the task is live and delivered.
    await seedGuestMessage(db, conversation.id, 'can we get 2 extra towels', 40);
    await processConversation(rig({}).deps, conversation.id);
    const afterOne = [...(await db.execute(sql`SELECT short_id, status FROM tasks`))];
    expect(afterOne).toHaveLength(1);
    expect(afterOne[0]?.status).toBe('open');
    const shortId = afterOne[0]?.short_id as string;

    // Turn 2 — a follow-up that GATE 3 appends (same kind + same door +
    // similar summary), and this time the card does NOT reach anyone.
    await seedGuestMessage(db, conversation.id, 'sorry, could we get more extra towels', 20);
    await processConversation(rig({ cardOk: false, summary: 'more extra towels' }).deps, conversation.id);

    // ONE row still — an append never inserts — and it is STILL LIVE.
    const afterTwo = [...(await db.execute(sql`SELECT status FROM tasks`))];
    expect(afterTwo).toHaveLength(1);
    expect(afterTwo[0]?.status).toBe('open'); // 🚨 NOT notify_failed

    // And the housekeeper can still close it — the DONE will not lie.
    const closed = await closeTaskByShortId(db, shortId, ANITA, new Date());
    expect(closed?.status).toBe('done');
  });
});

describe('🚨 CH-13b · a captionless media turn becomes a frontdesk TASK, not an ops ping', () => {
  it('raises a frontdesk task on the guest conversation and sends the fallback line', async () => {
    const { conversation } = await seedInHouseGuest();
    await openStaffWindows();
    await touchPhoneWindow(db, GUEST, new Date());
    // A photo with no caption ⇒ batchText '' ⇒ MEDIA_FALLBACK (policy path, no
    // model turn). rig()'s converse is never called here.
    await seedGuestMessage(db, conversation.id, null, 20, 'image');

    await processConversation(rig({}).deps, conversation.id);

    // The NEW behaviour: a tracked frontdesk task, routed to the frontdesk lead.
    const tasks = [...(await db.execute(sql`SELECT kind, assigned_phone, status FROM tasks`))];
    expect(tasks).toEqual([{ kind: 'frontdesk', assigned_phone: MEERA, status: 'open' }]);

    // The guest still gets the §6.7 line.
    const out = await outbound(conversation.id);
    expect(out.some((m) => m.body.includes('mind typing it'))).toBe(true);
  });
});
