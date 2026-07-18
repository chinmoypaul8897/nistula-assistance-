/**
 * Human takeover (CH-14a step 2) — the shared core, the prod echo path, the dev
 * sim route, and the resume TTL. Real Postgres. Phone decade 9xx is CH-14's.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import {
  findConversationForTakeover,
  getOrCreateConversation,
  insertMessage,
  setTakeoverState,
  upsertGuestByPhone,
  type Conversation,
} from '../src/db/repos.js';
import { insertTask } from '../src/db/tasks.js';
import { applyHumanTakeover, HUMAN_ACTIVE_TTL_MS } from '../src/staff/humanTakeover.js';
import { decidePolicy } from '../src/brain/policy.js';
import { buildWaApp, signBody } from './helpers/wa.js';
import { buildAdminApp, TEST_ADMIN_TOKEN } from './helpers/admin.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

const GUEST = '+917700900921';
const STAFF = '+917700900922';
const STRANGER = '+917700900923';
const NOW = new Date('2026-07-17T06:00:00Z');

/** The takeover input the coexistence `apply` receives — annotated so the spy's
 * call args are typed (a bare `vi.fn` infers `[]` and the assertions won't compile). */
type TakeoverInput = {
  conversationId: string;
  echo: { waMessageId?: string; body: string | null; raw?: unknown };
};

let client: ReturnType<typeof postgres>;
let db: Db;
let guestId: string;
let conversationId: string;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 4, onnotice: () => {} });
  db = drizzle(client, { schema }) as unknown as Db;
}, 30_000);

afterAll(async () => {
  await client?.end();
});

beforeEach(async () => {
  await db.execute(sql`TRUNCATE tasks, messages, conversations, raw_events, guests CASCADE`);
  const guest = await upsertGuestByPhone(db, GUEST, 'Rahul');
  guestId = guest.id;
  conversationId = (await getOrCreateConversation(db, guest.id)).id;
  // A prior GUEST inbound — findConversationForTakeover requires one.
  await insertMessage(db, {
    conversationId,
    waMessageId: 'wamid.in1',
    direction: 'in',
    sender: 'guest',
    type: 'text',
    body: 'is the villa free next week?',
    status: 'received',
    raw: {},
  });
});

async function conv(): Promise<Conversation> {
  const [row] = await db.select().from(schema.conversations).where(sql`id = ${conversationId}`);
  return row as Conversation;
}

const takeoverDeps = (cancelPending = vi.fn(async () => {})) => ({
  db,
  log: { error: () => {}, info: () => {} },
  now: () => NOW,
  cancelPending,
});

describe('applyHumanTakeover — the shared core', () => {
  it('sets a 2h TTL, stores the human echo, cancels escalations, and cancels the pending job', async () => {
    // An open escalation the takeover must resolve.
    await insertTask(db, {
      conversationId,
      guestId,
      bookingId: null,
      villaLabel: null,
      kind: 'escalation',
      summary: 'needs a person',
      detail: null,
      assignedPhone: STAFF,
      requestKey: null,
      origin: 'guest',
      now: NOW,
    });
    const cancelPending = vi.fn(async () => {});
    await applyHumanTakeover(takeoverDeps(cancelPending), {
      conversationId,
      echo: { waMessageId: 'wamid.echo1', body: 'Front desk here — happy to help.' },
    });

    const c = await conv();
    expect(c.humanActiveUntil?.getTime()).toBe(NOW.getTime() + HUMAN_ACTIVE_TTL_MS);
    // The echo is stored as an OUTBOUND human message.
    const [human] = await db
      .select()
      .from(schema.messages)
      .where(sql`sender = 'human'`);
    expect(human).toMatchObject({ direction: 'out', sender: 'human' });
    // The escalation is cancelled (a human is now on the thread).
    const [task] = await db.select().from(schema.tasks);
    expect(task?.status).toBe('cancelled');
    expect(cancelPending).toHaveBeenCalledWith(conversationId);
  });

  it('🚨 an AI-OFF hold survives a later staff echo + its TTL expiring (review BLOCKER)', async () => {
    // The interaction the review caught: AI OFF sets status='human_active', TTL
    // null (indefinite); the staff member's own reply is an echo that stamps a 2h
    // TTL; 2h later the AI must STILL be held. Before the fix, isHumanActive read
    // the (now-expired) TTL first and resumed the AI on a thread staff locked.
    await setTakeoverState(db, conversationId, 'human_active', null); // AI OFF
    await applyHumanTakeover(takeoverDeps(), {
      conversationId,
      echo: { waMessageId: 'wamid.echo9', body: 'Front desk here, looking into it.' },
    });
    const c = await conv();
    const msg = [
      { id: 'x', conversationId, type: 'text' as const, body: 'still there?', createdAt: NOW },
    ] as unknown as Parameters<typeof decidePolicy>[0]['messages'];
    // Well past the 2h echo TTL — the explicit hold must still silence the AI.
    const wayLater = new Date(NOW.getTime() + HUMAN_ACTIVE_TTL_MS + 3_600_000);
    expect(
      decidePolicy({ messages: msg, conversation: c, now: wayLater, overLimit: false }).kind,
    ).toBe('HUMAN_ACTIVE');
  });

  it('pauses the AI: decidePolicy routes HUMAN_ACTIVE while the TTL holds, then resumes', async () => {
    await applyHumanTakeover(takeoverDeps(), { conversationId });
    const c = await conv();
    const msg = [
      {
        id: 'x',
        conversationId,
        type: 'text' as const,
        body: 'hello?',
        createdAt: NOW,
      },
    ] as unknown as Parameters<typeof decidePolicy>[0]['messages'];

    // During the 2h window → HUMAN_ACTIVE (store-only).
    expect(
      decidePolicy({ messages: msg, conversation: c, now: NOW, overLimit: false }).kind,
    ).toBe('HUMAN_ACTIVE');
    // After the TTL → the AI resumes.
    const after = new Date(NOW.getTime() + HUMAN_ACTIVE_TTL_MS + 1000);
    expect(
      decidePolicy({ messages: msg, conversation: c, now: after, overLimit: false }).kind,
    ).toBe('NORMAL');
  });
});

describe('findConversationForTakeover — find-only, prior-inbound required', () => {
  it('returns the conversation for a guest with prior inbound', async () => {
    expect(await findConversationForTakeover(db, GUEST)).toEqual({ conversationId, guestId });
  });

  it('returns null for an unknown phone (never conjures a conversation)', async () => {
    expect(await findConversationForTakeover(db, STRANGER)).toBeNull();
  });

  it('returns null when the guest exists but never messaged us', async () => {
    const g = await upsertGuestByPhone(db, STRANGER, 'Booking-only');
    await getOrCreateConversation(db, g.id); // a conversation but NO inbound
    expect(await findConversationForTakeover(db, STRANGER)).toBeNull();
  });
});

describe('the prod echo path (smb_message_echoes)', () => {
  const echoBody = (to: string) =>
    JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba',
          changes: [
            {
              field: 'smb_message_echoes',
              value: {
                messaging_product: 'whatsapp',
                message_echoes: [
                  {
                    from: '15551798672',
                    to,
                    id: 'wamid.echo1',
                    timestamp: '1700000000',
                    type: 'text',
                    text: { body: 'Front desk here.' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

  async function postEcho(app: Awaited<ReturnType<typeof buildWaApp>>, to: string) {
    const payload = echoBody(to);
    return app.inject({
      method: 'POST',
      url: '/webhooks/whatsapp',
      payload,
      headers: { 'content-type': 'application/json', 'x-hub-signature-256': signBody(payload) },
    });
  }

  async function waitFor(spy: ReturnType<typeof vi.fn>, calls = 1): Promise<void> {
    for (let i = 0; i < 200; i++) {
      if (spy.mock.calls.length >= calls) return;
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  const coexistence = (apply: ReturnType<typeof vi.fn>) => ({
    findConversation: (phone: string) => findConversationForTakeover(db, phone),
    apply: apply as unknown as (i: TakeoverInput) => Promise<void>,
  });
  const staff = { isStaffPhone: (p: string) => p === STAFF, enqueueCommand: async () => {} };

  it('an echo to a guest with prior inbound applies the takeover', async () => {
    const apply = vi.fn<(i: TakeoverInput) => Promise<void>>();
    const app = await buildWaApp(db, undefined, { staff, coexistence: coexistence(apply) });
    await postEcho(app, '917700900921');
    await waitFor(apply);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply.mock.calls[0]?.[0]).toMatchObject({ conversationId });
    await app.close();
  });

  it('an echo to a ROSTER number is ignored (front desk messaging a colleague)', async () => {
    const apply = vi.fn<(i: TakeoverInput) => Promise<void>>();
    const app = await buildWaApp(db, undefined, { staff, coexistence: coexistence(apply) });
    await postEcho(app, '917700900922'); // STAFF
    await new Promise((r) => setTimeout(r, 150));
    expect(apply).not.toHaveBeenCalled();
    await app.close();
  });

  it('an echo to a number with NO guest thread is ignored (never conjured)', async () => {
    const apply = vi.fn<(i: TakeoverInput) => Promise<void>>();
    const app = await buildWaApp(db, undefined, { staff, coexistence: coexistence(apply) });
    await postEcho(app, '917700900923'); // STRANGER, no inbound
    await new Promise((r) => setTimeout(r, 150));
    expect(apply).not.toHaveBeenCalled();
    await app.close();
  });
});

describe('the dev sim route (POST /admin/simulate-human-reply)', () => {
  const apply = vi.fn<(i: TakeoverInput) => Promise<void>>();
  const coexistence = {
    findConversation: (phone: string) => findConversationForTakeover(db, phone),
    apply: apply as unknown as (i: TakeoverInput) => Promise<void>,
  };

  beforeEach(() => apply.mockClear());

  it('bearer-gated: 401 without a token', async () => {
    const app = await buildAdminApp(db, undefined, undefined, coexistence);
    const res = await app.inject({
      method: 'POST',
      url: '/admin/simulate-human-reply',
      payload: { phone: GUEST, text: 'hi' },
    });
    expect(res.statusCode).toBe(401);
    expect(apply).not.toHaveBeenCalled();
    await app.close();
  });

  it('applies the takeover for a real guest thread', async () => {
    const app = await buildAdminApp(db, undefined, undefined, coexistence);
    const res = await app.inject({
      method: 'POST',
      url: '/admin/simulate-human-reply',
      headers: { authorization: `Bearer ${TEST_ADMIN_TOKEN}` },
      payload: { phone: GUEST, text: 'Front desk here.' },
    });
    expect(res.statusCode).toBe(200);
    expect(apply).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it('404 for a phone with no guest thread', async () => {
    const app = await buildAdminApp(db, undefined, undefined, coexistence);
    const res = await app.inject({
      method: 'POST',
      url: '/admin/simulate-human-reply',
      headers: { authorization: `Bearer ${TEST_ADMIN_TOKEN}` },
      payload: { phone: STRANGER, text: 'hi' },
    });
    expect(res.statusCode).toBe(404);
    expect(apply).not.toHaveBeenCalled();
    await app.close();
  });
});
