/**
 * CH-13b · the media-fallback frontdesk task (§6.7), against real Postgres.
 * A captionless media turn becomes a TRACKED task, not a fire-and-forget ops
 * ping — and it fails closed exactly like every other card.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { raiseMediaFrontdeskTask, type MediaTaskDeps } from '../src/staff/mediaTask.js';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { getOrCreateConversation, upsertGuestByPhone } from '../src/db/repos.js';
import { assignFor, type Roster } from '../src/staff/roster.js';
import { notifyTask } from '../src/staff/notifier.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';
const NOW = new Date('2026-07-17T09:50:00Z');
const GUEST = '+917700900911';
const MEERA = '+917700900912';

const ROSTER: Roster = {
  members: [{ name: 'Meera', phone: MEERA, role: 'frontdesk', villas: [] }],
  opsNumbers: [],
};

let client: ReturnType<typeof postgres>;
let db: Db;
let guestId: string;
let conversationId: string;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 4, onnotice: () => {} });
  db = drizzle(client, { schema }) as unknown as Db;
}, 30_000);

beforeEach(async () => {
  await db.execute(sql`TRUNCATE tasks, messages, conversations, guests, raw_events CASCADE`);
  const guest = await upsertGuestByPhone(db, GUEST, 'Rahul Mehta');
  guestId = guest.id;
  conversationId = (await getOrCreateConversation(db, guest.id)).id;
});

afterAll(async () => {
  await client?.end();
});

function deps(roster: Roster = ROSTER): { deps: MediaTaskDeps; carded: string[] } {
  const carded: string[] = [];
  const sendTemplated = vi.fn(async (to: string) => {
    carded.push(to);
    return { ok: true as const, messageId: 'wamid.x', usedTemplate: false, retryable: false };
  });
  const log = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
  const wa = { sendTemplated } as never;
  return {
    carded,
    deps: {
      db,
      assign: (kind, villa) => assignFor(roster, kind, villa),
      notify: (task, name, mode) => notifyTask({ db, log, wa }, task, name, mode),
      now: NOW,
    },
  };
}

const ctx = () => ({
  conversationId,
  guestId,
  guestFirstName: 'Rahul',
  sourceMessageId: 'm-1',
});

const rows = async () =>
  [...(await db.execute(sql`SELECT kind, villa_label, assigned_phone, status FROM tasks`))] as {
    kind: string;
    villa_label: string | null;
    assigned_phone: string | null;
    status: string;
  }[];

describe('raiseMediaFrontdeskTask', () => {
  it('raises a frontdesk task and delivers the card', async () => {
    const { deps: d, carded } = deps();
    const { task, delivered } = await raiseMediaFrontdeskTask(d, ctx());
    expect(delivered).toBe(true);
    expect(carded).toEqual([MEERA]);
    const [row] = await rows();
    expect(row).toMatchObject({ kind: 'frontdesk', assigned_phone: MEERA, status: 'open' });
    // A media sender may be a lead with no booking, so no house is named.
    expect(row?.villa_label).toBeNull();
    expect(task.conversationId).toBe(conversationId);
  });

  it('is idempotent per media turn — a redelivery collides on the request key', async () => {
    const { deps: d } = deps();
    await raiseMediaFrontdeskTask(d, ctx());
    // Same source message id ⇒ same request key ⇒ the insert unique blocks it.
    await expect(raiseMediaFrontdeskTask(d, ctx())).rejects.toThrow();
    expect(await rows()).toHaveLength(1);
  });

  it('an EMPTY roster still tracks the task but fails closed (notify_failed)', async () => {
    const { deps: d, carded } = deps({ members: [], opsNumbers: [] });
    const { delivered } = await raiseMediaFrontdeskTask(d, ctx());
    expect(delivered).toBe(false);
    expect(carded).toHaveLength(0);
    const [row] = await rows();
    expect(row?.assigned_phone).toBeNull();
    expect(row?.status).toBe('notify_failed');
  });
});
