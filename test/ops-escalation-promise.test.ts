/**
 * CH-12 · "the team has been informed" must be TRUE.
 *
 * escalateToOps used to fire-and-forget: it called sendText, discarded the
 * SendResult, and wrote the `ops_escalation` evidence row regardless. That row is
 * what licenses guardrail 2 (promises.ts maps contextKind 'ops_escalation' → C3)
 * to let the model tell the guest "I'm bringing the team in".
 *
 * CH-12 turned an occasional failure into a certain one: the chokepoint now
 * refuses a free-form send to an ops number whose own 24h window is shut, and
 * phone_windows is EMPTY on deploy. So every escalation would have been refused
 * locally — and every guest still told a human was coming.
 *
 * That is the hard rule, verbatim: NEVER PROMISE WHAT DIDN'T HAPPEN.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { escalateToOps } from '../src/brain/opsEscalation.js';
import type { Db } from '../src/db/client.js';
import { getOrCreateConversation, upsertGuestByPhone } from '../src/db/repos.js';
import * as schema from '../src/db/schema.js';
import { touchPhoneWindow } from '../src/db/windows.js';
import { createWaClient } from '../src/wa/client.js';
import { TEST_URL } from './helpers/boss.js';

const OPS = '+917700900950';
let client: ReturnType<typeof postgres>;
let db: Db;
const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema }) as unknown as Db;
}, 30_000);
afterAll(async () => {
  await client?.end();
});
beforeEach(async () => {
  vi.clearAllMocks();
  await db.execute(sql`TRUNCATE phone_windows, messages, conversations, guests CASCADE`);
});

function realClient() {
  const sent: unknown[] = [];
  const wa = createWaClient({
    db,
    log: { error: vi.fn(), warn: vi.fn() },
    graphBaseUrl: 'https://graph.test.invalid/v23.0',
    phoneNumberId: '000000000000000',
    accessToken: 'test-token',
    httpImpl: async (_url, options) => {
      sent.push(JSON.parse(options?.body ?? '{}'));
      return new Response(JSON.stringify({ messages: [{ id: 'wamid.OPS-1' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });
  return { wa, sent };
}

async function guestThread(): Promise<string> {
  const guest = await upsertGuestByPhone(db, '+917700900222', 'Guest');
  const convo = await getOrCreateConversation(db, guest.id);
  return convo.id;
}

/** The evidence row guardrail 2 reads to license "the team has been informed". */
async function evidenceRows() {
  const all = await db.select().from(schema.messages);
  return all.filter(
    (m) => (m.raw as { contextKind?: string } | null)?.contextKind === 'ops_escalation',
  );
}

describe('escalateToOps', () => {
  it('writes the claimable evidence row when the card actually reaches ops', async () => {
    const conversationId = await guestThread();
    await touchPhoneWindow(db, OPS, new Date()); // ops messaged the line: window open
    const { wa, sent } = realClient();

    await escalateToOps({ db, log, wa, opsNumbers: [OPS] }, conversationId, 'human_request', 'help');

    expect(sent).toHaveLength(1);
    expect(await evidenceRows()).toHaveLength(1);
  });

  it('🚨 writes NO evidence row when every ops send was refused', async () => {
    // phone_windows is empty — exactly the state of production on deploy day.
    const conversationId = await guestThread();
    const { wa, sent } = realClient();

    await escalateToOps({ db, log, wa, opsNumbers: [OPS] }, conversationId, 'human_request', 'help');

    expect(sent).toHaveLength(0); // the chokepoint refused it, correctly
    // ...and therefore guardrail 2 will REFUSE to let the AI say the team is
    // coming. The guest gets an honest line instead of a lie.
    expect(await evidenceRows()).toHaveLength(0);
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ opsAlert: 'ops_escalation_undelivered' }),
      expect.stringContaining('[OPS-ALERT]'),
    );
  });

  it('with NO ops number configured, the alert log IS the ops channel (CH-02 D4)', async () => {
    // "Nobody is configured" and "everybody was unreachable" are different facts.
    // Only the second makes the promise a lie. Dev runs with OPS_NUMBERS unset.
    const conversationId = await guestThread();
    const { wa, sent } = realClient();

    await escalateToOps({ db, log, wa, opsNumbers: [] }, conversationId, 'complaint', 'unhappy');

    expect(sent).toHaveLength(0);
    expect(await evidenceRows()).toHaveLength(1);
  });

  it('one reachable ops number out of two is enough to make the claim true', async () => {
    const conversationId = await guestThread();
    await touchPhoneWindow(db, OPS, new Date());
    const { wa } = realClient();

    await escalateToOps(
      { db, log, wa, opsNumbers: ['+917700900951', OPS] },
      conversationId,
      'complaint',
      'unhappy',
    );

    expect(await evidenceRows()).toHaveLength(1);
  });
});
