/**
 * CH-08 conversation-memory repositories + the summariser handler, against
 * real Postgres. The µs cases use defaultNow() rows ON PURPOSE: seeded
 * JS-Date rows carry µs=000 and can never reproduce the CH-03 truncation
 * class, so boundary discipline is asserted on genuine DB-clock timestamps.
 */
import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { insertMessage, resolveMessageCursor, type Message } from '../src/db/repos.js';
import {
  applyConversationSummary,
  countUncoveredMessages,
  findSummariserCandidates,
  getSummarisableMessages,
  getSystemContextKinds,
} from '../src/db/summaries.js';
import { seedConversation, seedGuestMessage, seedOutboundMessage } from './helpers/seed.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

let client: ReturnType<typeof postgres>;
let db: Db;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
  await db.execute(sql`TRUNCATE messages, conversations, raw_events, guests, cost_events CASCADE`);
}, 30_000);

afterAll(async () => {
  await client?.end();
});

/** A DB-clock row (defaultNow() → real timestamptz microseconds). */
async function dbClockMessage(
  conversationId: string,
  sender: Message['sender'],
  body: string,
): Promise<Message> {
  const { message } = await insertMessage(db, {
    conversationId,
    direction: sender === 'guest' ? 'in' : 'out',
    sender,
    type: 'text',
    body,
    status: sender === 'guest' ? 'received' : 'sent',
  });
  if (message === null) throw new Error('unreachable: unconditional insert conflicted');
  return message;
}

describe('getSystemContextKinds (the decoupled guardrail-2 evidence read)', () => {
  it('returns claimable kinds regardless of transcript-fetch horizons; since filters µs-exactly', async () => {
    const { conversation } = await seedConversation(db, '+917700900061');
    const old = await seedOutboundMessage(db, conversation.id, 'system', 'ops escalated: price', 500, {
      contextKind: 'ops_escalation',
    });
    // A 45-row burst AFTER the evidence — bigger than the whole transcript fetch.
    for (let i = 0; i < 45; i++) {
      await seedGuestMessage(db, conversation.id, `burst ${i}`, 400 - i);
    }
    await seedOutboundMessage(db, conversation.id, 'system', 'untagged system row', 100);

    const all = await getSystemContextKinds(db, conversation.id, null);
    expect(all).toEqual(['ops_escalation']); // untagged rows contribute nothing

    // since = the evidence row's own µs-exact created_at::text → >= keeps it…
    const { cursor } = await resolveMessageCursor(db, old.id);
    expect(await getSystemContextKinds(db, conversation.id, cursor!.createdAtIso)).toEqual([
      'ops_escalation',
    ]);
    // …while a since strictly after it excludes it.
    const later = new Date(old.createdAt.getTime() + 1000).toISOString();
    expect(await getSystemContextKinds(db, conversation.id, later)).toEqual([]);
  });
});

describe('countUncoveredMessages + getSummarisableMessages — µs boundary discipline', () => {
  it('id-joined boundaries stay exact on defaultNow() rows (the CH-03 truncation class)', async () => {
    const { conversation } = await seedConversation(db, '+917700900062');
    // Three DB-clock rows in tight succession: possibly the same millisecond,
    // always distinct microseconds — a JS-Date comparison would misclassify.
    const a = await dbClockMessage(conversation.id, 'guest', 'a');
    const b = await dbClockMessage(conversation.id, 'ai', 'b');
    const c = await dbClockMessage(conversation.id, 'guest', 'c');

    // Window starts at the newest row → exactly a and b are invisible.
    expect(
      await countUncoveredMessages(db, {
        conversationId: conversation.id,
        windowStartId: c.id,
        summaryCursor: null,
      }),
    ).toBe(2);

    const range = await getSummarisableMessages(db, {
      conversationId: conversation.id,
      afterCursor: null,
      beforeId: c.id,
      limit: 100,
    });
    expect(range.map((m) => m.id)).toEqual([a.id, b.id]);

    // A summary covering up to `a` leaves exactly `b` uncovered.
    const { cursor } = await resolveMessageCursor(db, a.id);
    expect(
      await countUncoveredMessages(db, {
        conversationId: conversation.id,
        windowStartId: c.id,
        summaryCursor: cursor,
      }),
    ).toBe(1);
    const tail = await getSummarisableMessages(db, {
      conversationId: conversation.id,
      afterCursor: cursor,
      beforeId: c.id,
      limit: 100,
    });
    expect(tail.map((m) => m.id)).toEqual([b.id]);
  });

  it('system rows are not COUNTED as uncovered but ARE in the summarisable range (cursor advances over them)', async () => {
    const { conversation } = await seedConversation(db, '+917700900063');
    const g1 = await seedGuestMessage(db, conversation.id, 'first ask', 300);
    const s1 = await seedOutboundMessage(db, conversation.id, 'system', 'ops escalated: media', 250, {
      contextKind: 'ops_escalation',
    });
    const g2 = await seedGuestMessage(db, conversation.id, 'newest', 100);

    expect(
      await countUncoveredMessages(db, {
        conversationId: conversation.id,
        windowStartId: g2.id,
        summaryCursor: null,
      }),
    ).toBe(1); // g1 only — the system row never renders, so it is never "missing"

    const range = await getSummarisableMessages(db, {
      conversationId: conversation.id,
      afterCursor: null,
      beforeId: g2.id,
      limit: 100,
    });
    expect(range.map((m) => m.id)).toEqual([g1.id, s1.id]); // both — the cursor must clear them
  });

  it('the limit caps a backfill-sized range (oldest first — the next run continues)', async () => {
    const { conversation } = await seedConversation(db, '+917700900064');
    for (let i = 0; i < 8; i++) await seedGuestMessage(db, conversation.id, `m${i}`, 800 - i * 10);
    const newest = await seedGuestMessage(db, conversation.id, 'window start', 10);
    const range = await getSummarisableMessages(db, {
      conversationId: conversation.id,
      afterCursor: null,
      beforeId: newest.id,
      limit: 3,
    });
    expect(range.map((m) => m.body)).toEqual(['m0', 'm1', 'm2']);
  });
});

describe('applyConversationSummary — the advance-once CAS', () => {
  it('advances exactly once per expected pointer; a stale expectation loses cleanly', async () => {
    const { conversation } = await seedConversation(db, '+917700900065');
    const m1 = await seedGuestMessage(db, conversation.id, 'one', 300);
    const m2 = await seedGuestMessage(db, conversation.id, 'two', 200);

    // First apply: expected null (no summary yet).
    expect(
      await applyConversationSummary(db, {
        conversationId: conversation.id,
        expectedPointer: null,
        newPointer: m1.id,
        summary: '- Guest opened the thread.',
      }),
    ).toBe(true);
    // A concurrent racer that ALSO read null must lose — cursor advances once.
    expect(
      await applyConversationSummary(db, {
        conversationId: conversation.id,
        expectedPointer: null,
        newPointer: m2.id,
        summary: '- The racer version (must never land).',
      }),
    ).toBe(false);

    const [row] = await db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.id, conversation.id));
    expect(row?.summaryUptoMessageId).toBe(m1.id);
    expect(row?.summary).toBe('- Guest opened the thread.');

    // Append-compaction step: expected = the current pointer → advances.
    expect(
      await applyConversationSummary(db, {
        conversationId: conversation.id,
        expectedPointer: m1.id,
        newPointer: m2.id,
        summary: '- Guest opened the thread.\n- Asked about dates.',
      }),
    ).toBe(true);
  });
});

describe('findSummariserCandidates (idle > threshold AND > minUnsummarised non-system)', () => {
  it('selects only idle conversations with enough unsummarised messages; the cursor resets the count', async () => {
    // Idle + 5 unsummarised → candidate at min 3, not at min 10.
    const eligible = await seedConversation(db, '+917700900066');
    for (let i = 0; i < 5; i++) {
      await seedGuestMessage(db, eligible.conversation.id, `e${i}`, 600 - i);
    }
    // Active thread (newest message is fresh) → never a candidate.
    const active = await seedConversation(db, '+917700900067');
    for (let i = 0; i < 5; i++) await seedGuestMessage(db, active.conversation.id, `a${i}`, i === 4 ? 1 : 600 - i);
    // Idle but mostly system rows → below the non-system threshold.
    const systemish = await seedConversation(db, '+917700900068');
    await seedGuestMessage(db, systemish.conversation.id, 'only one real ask', 600);
    for (let i = 0; i < 5; i++) {
      await seedOutboundMessage(db, systemish.conversation.id, 'system', `sys${i}`, 500 - i);
    }

    const found = await findSummariserCandidates(db, { idleSeconds: 60, minUnsummarised: 3 });
    expect(found).toContain(eligible.conversation.id);
    expect(found).not.toContain(active.conversation.id);
    expect(found).not.toContain(systemish.conversation.id);

    expect(await findSummariserCandidates(db, { idleSeconds: 60, minUnsummarised: 10 })).not.toContain(
      eligible.conversation.id,
    );

    // A summary covering all but the last message drops it below the bar.
    const rows = await db
      .select()
      .from(schema.messages)
      .where(
        and(
          eq(schema.messages.conversationId, eligible.conversation.id),
          eq(schema.messages.sender, 'guest'),
        ),
      )
      .orderBy(schema.messages.createdAt, schema.messages.id);
    const uptoFourth = rows[3];
    await applyConversationSummary(db, {
      conversationId: eligible.conversation.id,
      expectedPointer: null,
      newPointer: uptoFourth!.id,
      summary: '- Early thread compacted.',
    });
    expect(await findSummariserCandidates(db, { idleSeconds: 60, minUnsummarised: 3 })).not.toContain(
      eligible.conversation.id,
    );
  });
});
