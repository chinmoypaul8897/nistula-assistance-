/**
 * CH-16 · the draft-expiry sweep runner — expires drafts older than 30 min and
 * pages ops for each. (expireStaleDrafts itself is exercised in drafts-repo.)
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/db/client.js';
import { findDraftByShortId, insertDraft } from '../src/db/drafts.js';
import * as schema from '../src/db/schema.js';
import { DRAFT_EXPIRY_MINUTES, runDraftExpiry } from '../src/staff/draftExpiry.js';
import { seedConversation } from './helpers/seed.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';
const GUEST = '+917700900881';

let client: ReturnType<typeof postgres>;
let db: Db;
let conversationId: string;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema }) as unknown as Db;
}, 30_000);

beforeEach(async () => {
  await db.execute(sql`TRUNCATE drafts, messages, conversations, guests CASCADE`);
  conversationId = (await seedConversation(db, GUEST)).conversation.id;
});

afterAll(async () => {
  await client?.end();
});

describe('runDraftExpiry', () => {
  it('expires a draft older than 30 min, keeps a fresh one, and pages ops for the lapse', async () => {
    await db.insert(schema.drafts).values({
      conversationId,
      shortId: 'STALE1',
      replyType: 'presales',
      proposedBody: 'x',
      createdAt: new Date(Date.now() - (DRAFT_EXPIRY_MINUTES + 5) * 60_000),
    });
    const fresh = await insertDraft(db, {
      conversationId,
      replyType: 'instay',
      proposedBody: 'y',
      contextNote: null,
    });
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const { expired } = await runDraftExpiry({ db, log, now: () => new Date() });

    expect(expired).toBe(1);
    expect((await findDraftByShortId(db, 'STALE1'))?.status).toBe('expired');
    expect((await findDraftByShortId(db, fresh.shortId))?.status).toBe('pending');
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ shortId: 'STALE1' }),
      expect.stringContaining('expired'),
    );
  });
});
