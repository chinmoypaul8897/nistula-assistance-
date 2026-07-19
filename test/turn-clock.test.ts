/**
 * The turn clock honours FAKE_NOW_IST (CH-19). The conversation turn reads its
 * "now" from getConversationTurnContext.dbNow — historically `SELECT now()` from
 * the DB, which silently ignored the sanctioned dev/test clock and left the
 * hottest path (night/day escalation, cost-day, stage-by-date, the 24h window)
 * un-drivable in an acceptance replay. This pins the fix: FAKE set ⇒ dbNow is
 * the fake instant; FAKE unset ⇒ dbNow is the DB clock (~real now), unchanged.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { getConversationTurnContext } from '../src/db/repos.js';
import { istWallClockToInstant } from '../src/lib/time.js';
import { seedConversation } from './helpers/seed.js';
import { TEST_URL } from './helpers/boss.js';

let client: ReturnType<typeof postgres>;
let db: Db;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 3, onnotice: () => {} });
  db = drizzle(client, { schema });
  await db.execute(sql`TRUNCATE messages, conversations, guests CASCADE`);
}, 30_000);

afterEach(() => {
  delete process.env.FAKE_NOW_IST;
});

afterAll(async () => {
  await client?.end();
});

describe('getConversationTurnContext dbNow (CH-19 clock)', () => {
  it('returns the FAKE_NOW_IST instant when the dev/test clock is set', async () => {
    const { conversation } = await seedConversation(db, '+917700900301');
    process.env.FAKE_NOW_IST = '2026-12-20T23:05';
    const ctx = await getConversationTurnContext(db, conversation.id);
    expect(ctx?.dbNow.getTime()).toBe(istWallClockToInstant('2026-12-20T23:05').getTime());
  });

  it('returns the DB clock (~real now) when FAKE_NOW_IST is unset', async () => {
    const { conversation } = await seedConversation(db, '+917700900302');
    const ctx = await getConversationTurnContext(db, conversation.id);
    const drift = Math.abs((ctx?.dbNow.getTime() ?? 0) - Date.now());
    expect(drift).toBeLessThan(60_000);
  });
});
