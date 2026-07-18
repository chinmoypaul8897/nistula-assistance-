/**
 * CH-16 · the drafts repo against real Postgres (a fake db cannot falsify a
 * guarded UPDATE or a unique index — CH-13a's lesson). Proves the concurrency
 * contract (one winner), the not-found/decided distinction, expiry anchored on
 * created_at, and the report tallies.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.js';
import {
  claimDraftDecision,
  countExpiredDraftsSince,
  draftStatsSince,
  expireStaleDrafts,
  findDraftByShortId,
  insertDraft,
} from '../src/db/drafts.js';
import * as schema from '../src/db/schema.js';
import { seedConversation } from './helpers/seed.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';
const GUEST = '+917700900861';

let client: ReturnType<typeof postgres>;
let db: Db;
let conversationId: string;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema }) as unknown as Db;
}, 30_000);

beforeEach(async () => {
  await db.execute(sql`TRUNCATE drafts, messages, conversations, guests CASCADE`);
  const { conversation } = await seedConversation(db, GUEST);
  conversationId = conversation.id;
});

afterAll(async () => {
  await client?.end();
});

const newDraft = () => ({
  conversationId,
  replyType: 'presales' as const,
  proposedBody: 'Good evening — our 3BHK is ₹42,000 all-inclusive.',
  contextNote: 'lead · tools: get_quote',
});

describe('insertDraft', () => {
  it('commits a pending draft with a 6-char short id', async () => {
    const draft = await insertDraft(db, newDraft());
    expect(draft.status).toBe('pending');
    expect(draft.shortId).toMatch(/^[0-9A-HJKMNP-TV-Z]{6}$/);
    expect(draft.proposedBody).toContain('₹42,000');
  });
});

describe('claimDraftDecision', () => {
  it('lets exactly ONE of two concurrent approvers win', async () => {
    const draft = await insertDraft(db, newDraft());
    const [a, b] = await Promise.all([
      db.transaction((tx) => claimDraftDecision(tx, draft.shortId, 'approved', '+911', new Date())),
      db.transaction((tx) => claimDraftDecision(tx, draft.shortId, 'approved', '+912', new Date())),
    ]);
    const winners = [a, b].filter((r) => r !== null);
    expect(winners).toHaveLength(1);
    const stored = await findDraftByShortId(db, draft.shortId);
    expect(stored?.status).toBe('approved');
  });

  it('is case-insensitive on the short id and stores the edit body', async () => {
    const draft = await insertDraft(db, newDraft());
    const row = await claimDraftDecision(
      db,
      draft.shortId.toLowerCase(),
      'edited',
      '+919',
      new Date(),
      'Human-edited reply.',
    );
    expect(row?.status).toBe('edited');
    expect(row?.finalBody).toBe('Human-edited reply.');
    expect(row?.decidedBy).toBe('+919');
  });

  it('returns null for an already-decided draft (a replay never re-sends)', async () => {
    const draft = await insertDraft(db, newDraft());
    await claimDraftDecision(db, draft.shortId, 'rejected', '+911', new Date());
    const again = await claimDraftDecision(db, draft.shortId, 'approved', '+911', new Date());
    expect(again).toBeNull();
  });
});

describe('findDraftByShortId', () => {
  it('distinguishes an unknown id (null) from a decided one', async () => {
    expect(await findDraftByShortId(db, 'ZZZZZZ')).toBeNull();
    const draft = await insertDraft(db, newDraft());
    expect((await findDraftByShortId(db, draft.shortId))?.status).toBe('pending');
  });
});

describe('expireStaleDrafts', () => {
  it('expires a pending draft past the cutoff and leaves a fresh one, keyed on created_at', async () => {
    const now = new Date();
    const oldCreated = new Date(now.getTime() - 40 * 60_000);
    // A backdated pending draft (the sweep's target) + a fresh one.
    await db.insert(schema.drafts).values({
      conversationId,
      shortId: 'OLD001',
      replyType: 'presales',
      proposedBody: 'stale',
      createdAt: oldCreated,
    });
    const fresh = await insertDraft(db, newDraft());

    const cutoff = new Date(now.getTime() - 30 * 60_000);
    const expired = await expireStaleDrafts(db, cutoff);

    expect(expired.map((d) => d.shortId)).toEqual(['OLD001']);
    expect((await findDraftByShortId(db, 'OLD001'))?.status).toBe('expired');
    expect((await findDraftByShortId(db, fresh.shortId))?.status).toBe('pending');
  });

  it('never expires an already-approved draft (guarded on pending)', async () => {
    const draft = await insertDraft(db, newDraft());
    await claimDraftDecision(db, draft.shortId, 'approved', '+911', new Date());
    // Backdate it well past the cutoff — still must not flip; it is not pending.
    await db.execute(
      sql`UPDATE drafts SET created_at = now() - interval '2 hours' WHERE short_id = ${draft.shortId}`,
    );
    const expired = await expireStaleDrafts(db, new Date());
    expect(expired).toHaveLength(0);
    expect((await findDraftByShortId(db, draft.shortId))?.status).toBe('approved');
  });
});

describe('draftStatsSince + countExpiredDraftsSince', () => {
  it('tallies by reply_type and status', async () => {
    const since = new Date(Date.now() - 60_000);
    const rows: (typeof schema.drafts.$inferInsert)[] = [
      { conversationId, shortId: 'S00001', replyType: 'presales', proposedBody: 'a', status: 'approved' },
      { conversationId, shortId: 'S00002', replyType: 'presales', proposedBody: 'b', status: 'edited' },
      { conversationId, shortId: 'S00003', replyType: 'instay', proposedBody: 'c', status: 'expired' },
      { conversationId, shortId: 'S00004', replyType: 'instay', proposedBody: 'd', status: 'pending' },
    ];
    await db.insert(schema.drafts).values(rows);

    const stats = await draftStatsSince(db, since);
    const total = stats.reduce((n, r) => n + r.count, 0);
    expect(total).toBe(4);
    const presalesApproved = stats.find((r) => r.replyType === 'presales' && r.status === 'approved');
    expect(presalesApproved?.count).toBe(1);

    // countExpiredDraftsSince is keyed on updated_at (the expiry flip). The seed
    // above set status='expired' at insert, so updated_at is now → counted.
    expect(await countExpiredDraftsSince(db, since)).toBe(1);
  });
});
