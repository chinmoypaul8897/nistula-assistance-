/**
 * CH-16 · OK/EDIT/NO through the REAL handleStaffCommand (assert the OUTCOME —
 * what the guest received and the draft's final state — driving the real command
 * path, never internals).
 */
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/db/client.js';
import { expireStaleDrafts, findDraftByShortId, insertDraft } from '../src/db/drafts.js';
import * as schema from '../src/db/schema.js';
import { touchPhoneWindow } from '../src/db/windows.js';
import { handleStaffCommand, type StaffCommandDeps } from '../src/staff/commands.js';
import type { Roster } from '../src/staff/roster.js';
import { createWaClient } from '../src/wa/client.js';
import { seedConversation } from './helpers/seed.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';
const GUEST = '+917700900851';
const OPS = '+917700900858';
const HOUSEKEEPER = '+917700900857';

const ROSTER: Roster = {
  members: [{ name: 'Anita', phone: HOUSEKEEPER, role: 'housekeeping', villas: [] }],
  opsNumbers: [OPS],
};

const REPLY = 'Good evening — our 3BHK is lovely. Shall I share the link?';

let client: ReturnType<typeof postgres>;
let db: Db;
let conversationId: string;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema }) as unknown as Db;
}, 30_000);

beforeEach(async () => {
  await db.execute(sql`TRUNCATE drafts, messages, conversations, guests, phone_windows CASCADE`);
  const { conversation } = await seedConversation(db, GUEST);
  conversationId = conversation.id;
  // Open the guest's 24h window (a direct approval reply is free-form) + the ops
  // window (the ack goes to ops, also window-gated).
  await db.execute(
    sql`UPDATE conversations SET service_window_expires_at = now() + interval '23 hours' WHERE id = ${conversationId}`,
  );
  await touchPhoneWindow(db, OPS, new Date());
});

afterAll(async () => {
  await client?.end();
});

function mkDeps(): { d: StaffCommandDeps; log: { info: ReturnType<typeof vi.fn> } } {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
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
  return { d: { db, now: () => new Date(), log, wa, roster: ROSTER }, log };
}

const guestReplies = async () =>
  [
    ...(await db.execute(
      sql`SELECT body FROM messages WHERE conversation_id = ${conversationId} AND sender = 'ai' ORDER BY created_at`,
    )),
  ] as { body: string }[];

const opsAcks = async () =>
  [
    ...(await db.execute(
      sql`SELECT body FROM messages WHERE conversation_id IS NULL AND sender = 'system' ORDER BY created_at`,
    )),
  ] as { body: string }[];

const makeDraft = () =>
  insertDraft(db, { conversationId, replyType: 'presales', proposedBody: REPLY, contextNote: null });

describe('OK', () => {
  it('sends the drafted reply to the guest and marks the draft approved', async () => {
    const draft = await makeDraft();
    await handleStaffCommand(mkDeps().d, { phone: OPS, body: `OK ${draft.shortId}` });

    const replies = await guestReplies();
    expect(replies.map((r) => r.body)).toEqual([REPLY]);
    expect((await findDraftByShortId(db, draft.shortId))?.status).toBe('approved');
    expect((await opsAcks()).some((a) => a.body.includes('Sent'))).toBe(true);
  });

  it('is honoured from OPS numbers only — a housekeeper cannot approve', async () => {
    const draft = await makeDraft();
    await handleStaffCommand(mkDeps().d, { phone: HOUSEKEEPER, body: `OK ${draft.shortId}` });

    expect(await guestReplies()).toHaveLength(0);
    expect((await findDraftByShortId(db, draft.shortId))?.status).toBe('pending');
  });

  it('lets only one of two concurrent OKs reach the guest', async () => {
    const draft = await makeDraft();
    await Promise.all([
      handleStaffCommand(mkDeps().d, { phone: OPS, body: `OK ${draft.shortId}` }),
      handleStaffCommand(mkDeps().d, { phone: OPS, body: `OK ${draft.shortId}` }),
    ]);
    expect(await guestReplies()).toHaveLength(1);
  });

  it('an OK racing expiry sends nothing and says already expired', async () => {
    const draft = await makeDraft();
    await expireStaleDrafts(db, new Date(Date.now() + 60_000)); // cutoff in the future ⇒ expire it now
    await handleStaffCommand(mkDeps().d, { phone: OPS, body: `OK ${draft.shortId}` });

    expect(await guestReplies()).toHaveLength(0);
    expect((await opsAcks()).some((a) => a.body.toLowerCase().includes('expired'))).toBe(true);
  });
});

describe('EDIT', () => {
  it('sends the human words (not the draft) and stores them, even if the leak scan trips (advisory)', async () => {
    const draft = await makeDraft();
    const edited = 'You can reach the other guest at +919812345678.';
    const { d, log } = mkDeps();
    await handleStaffCommand(d, { phone: OPS, body: `EDIT ${draft.shortId} ${edited}` });

    expect((await guestReplies()).map((r) => r.body)).toEqual([edited]);
    const stored = await findDraftByShortId(db, draft.shortId);
    expect(stored?.status).toBe('edited');
    expect(stored?.finalBody).toBe(edited);
    // The leak scan ran and logged (advisory) but did not block the send.
    expect(log.info).toHaveBeenCalledWith(
      expect.objectContaining({ hits: expect.any(Array) }),
      expect.stringContaining('leak scan'),
    );
  });
});

describe('NO', () => {
  it('drops the draft and sends the guest nothing', async () => {
    const draft = await makeDraft();
    await handleStaffCommand(mkDeps().d, { phone: OPS, body: `NO ${draft.shortId}` });

    expect(await guestReplies()).toHaveLength(0);
    expect((await findDraftByShortId(db, draft.shortId))?.status).toBe('rejected');
  });
});

describe('an unknown id', () => {
  it('tells the approver there is no such draft', async () => {
    await handleStaffCommand(mkDeps().d, { phone: OPS, body: 'OK ZZZZZZ' });
    expect((await opsAcks()).some((a) => a.body.includes('no draft'))).toBe(true);
  });
});
