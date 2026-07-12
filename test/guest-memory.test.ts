/**
 * CH-09 guest_facts repo tests — real Postgres (globalSetup provisions the
 * test DB). Phone decade: CH-09 owns +9177009003xx (cross-file reuse makes
 * workers silently no-op — the CH-08 lesson).
 */
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { upsertGuestByPhone } from '../src/db/repos.js';
import { buildToolRegistry } from '../src/brain/tools/index.js';
import {
  FACTS_PER_GUEST_CAP,
  deleteGuestFacts,
  getActiveGuestFacts,
  getAllGuestFacts,
  getGuestByPhone,
  insertGuestFactGuarded,
  isSimilarFact,
  normaliseFactContent,
  updateGuestPrefs,
  type GuestFactKind,
} from '../src/db/guestMemory.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

let client: ReturnType<typeof postgres>;
let db: Db;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
  await db.execute(sql`TRUNCATE guest_facts, messages, conversations, raw_events, guests CASCADE`);
}, 30_000);

afterAll(async () => {
  await client?.end();
});

async function seedGuest(phone: string) {
  return upsertGuestByPhone(db, phone, 'Memory Guest');
}

/** Direct insert bypassing the guard — for seeding eviction/expiry scenarios. */
async function seedFact(
  guestId: string,
  kind: GuestFactKind,
  content: string,
  opts: { ageSeconds?: number; expiredAgoSeconds?: number } = {},
) {
  const createdAt = new Date(Date.now() - (opts.ageSeconds ?? 0) * 1000);
  const expiresAt =
    opts.expiredAgoSeconds === undefined
      ? null
      : new Date(Date.now() - opts.expiredAgoSeconds * 1000);
  const [row] = await db
    .insert(schema.guestFacts)
    .values({ guestId, kind, content, createdAt, expiresAt })
    .returning();
  if (row === undefined) throw new Error('seed fact insert failed');
  return row;
}

describe('normaliseFactContent / isSimilarFact', () => {
  it('normalises case, punctuation and whitespace', () => {
    expect(normaliseFactContent('Loved the early check-in!')).toBe('loved the early check in');
  });

  it('matches exact-normalised and containment forms', () => {
    expect(isSimilarFact('Loved the early check-in!', 'loved the early check in')).toBe(true);
    expect(isSimilarFact('Loved the early check-in', 'They loved the early check-in a lot')).toBe(
      true,
    );
  });

  it('matches high word-overlap only when both sides have >=4 tokens', () => {
    expect(
      isSimilarFact('guest loved the early check in', 'the guest loved early check in truly'),
    ).toBe(true);
    // Short facts must match exactly — one shared word is not similarity.
    expect(isSimilarFact('loves tea', 'loves dogs')).toBe(false);
  });

  it('treats different subjects as different facts', () => {
    expect(
      isSimilarFact('prefers the corner room upstairs', 'travels with two young children'),
    ).toBe(false);
  });
});

describe('insertGuestFactGuarded', () => {
  it('saves a fact with kind, content and source message id', async () => {
    const guest = await seedGuest('+917700900301');
    const sourceMessageId = '00000000-0000-4000-8000-000000000001';
    const result = await insertGuestFactGuarded(db, {
      guestId: guest.id,
      kind: 'preference',
      content: 'Loved the early check-in last time',
      sourceMessageId,
    });
    expect(result.outcome).toBe('saved');
    if (result.outcome !== 'saved') return;
    expect(result.fact.kind).toBe('preference');
    expect(result.fact.sourceMessageId).toBe(sourceMessageId);
  });

  it('skips a same-kind similar fact as duplicate', async () => {
    const guest = await seedGuest('+917700900302');
    await insertGuestFactGuarded(db, {
      guestId: guest.id,
      kind: 'preference',
      content: 'Loved the early check-in last time',
      sourceMessageId: null,
    });
    const dup = await insertGuestFactGuarded(db, {
      guestId: guest.id,
      kind: 'preference',
      content: 'loved the early check in, last time!',
      sourceMessageId: null,
    });
    expect(dup.outcome).toBe('duplicate');
    const rows = await getAllGuestFacts(db, guest.id);
    expect(rows).toHaveLength(1);
  });

  it('saves the same words under a DIFFERENT kind (dedupe is per-kind)', async () => {
    const guest = await seedGuest('+917700900303');
    await insertGuestFactGuarded(db, {
      guestId: guest.id,
      kind: 'context',
      content: 'Anniversary trip in December',
      sourceMessageId: null,
    });
    const other = await insertGuestFactGuarded(db, {
      guestId: guest.id,
      kind: 'celebration',
      content: 'Anniversary trip in December',
      sourceMessageId: null,
    });
    expect(other.outcome).toBe('saved');
  });

  it('does not dedupe against an EXPIRED sibling', async () => {
    const guest = await seedGuest('+917700900304');
    await seedFact(guest.id, 'preference', 'prefers a late checkout', { expiredAgoSeconds: 60 });
    const again = await insertGuestFactGuarded(db, {
      guestId: guest.id,
      kind: 'preference',
      content: 'prefers a late checkout',
      sourceMessageId: null,
    });
    expect(again.outcome).toBe('saved');
  });

  it('at the cap evicts the oldest lowest-value fact (context first)', async () => {
    const guest = await seedGuest('+917700900305');
    // Oldest row is a past_issue; the context row is NEWER but lower value —
    // eviction must take the context row, not the oldest row.
    await seedFact(guest.id, 'past_issue', 'seeded issue number zero', { ageSeconds: 5000 });
    await seedFact(guest.id, 'context', 'seeded context number one', { ageSeconds: 4000 });
    for (let i = 2; i < FACTS_PER_GUEST_CAP; i += 1) {
      await seedFact(guest.id, 'past_issue', `seeded issue number ${String(i)}`, {
        ageSeconds: 3000 - i,
      });
    }
    const result = await insertGuestFactGuarded(db, {
      guestId: guest.id,
      kind: 'preference',
      content: 'wants sparkling water in the fridge',
      sourceMessageId: null,
    });
    expect(result.outcome).toBe('saved');
    const rows = await getAllGuestFacts(db, guest.id);
    expect(rows).toHaveLength(FACTS_PER_GUEST_CAP);
    expect(rows.some((r) => r.content === 'seeded context number one')).toBe(false);
    expect(rows.some((r) => r.content === 'seeded issue number zero')).toBe(true);
  });

  it('evicts EXPIRED facts before live ones regardless of kind', async () => {
    const guest = await seedGuest('+917700900306');
    await seedFact(guest.id, 'past_issue', 'expired issue to drop first', {
      ageSeconds: 10,
      expiredAgoSeconds: 60,
    });
    await seedFact(guest.id, 'context', 'live context that must survive', { ageSeconds: 5000 });
    for (let i = 2; i < FACTS_PER_GUEST_CAP; i += 1) {
      await seedFact(guest.id, 'preference', `seeded preference number ${String(i)}`, {
        ageSeconds: 3000 - i,
      });
    }
    const result = await insertGuestFactGuarded(db, {
      guestId: guest.id,
      kind: 'celebration',
      content: 'tenth wedding anniversary in December',
      sourceMessageId: null,
    });
    expect(result.outcome).toBe('saved');
    const rows = await getAllGuestFacts(db, guest.id);
    expect(rows.some((r) => r.content === 'expired issue to drop first')).toBe(false);
    expect(rows.some((r) => r.content === 'live context that must survive')).toBe(true);
  });
});

describe('getActiveGuestFacts', () => {
  it('returns newest-first, filters expired, respects the limit', async () => {
    const guest = await seedGuest('+917700900307');
    await seedFact(guest.id, 'preference', 'older live fact', { ageSeconds: 300 });
    await seedFact(guest.id, 'preference', 'newer live fact', { ageSeconds: 100 });
    await seedFact(guest.id, 'past_issue', 'expired fact', { ageSeconds: 50, expiredAgoSeconds: 5 });
    const active = await getActiveGuestFacts(db, guest.id);
    expect(active.map((f) => f.content)).toEqual(['newer live fact', 'older live fact']);
    const limited = await getActiveGuestFacts(db, guest.id, 1);
    expect(limited.map((f) => f.content)).toEqual(['newer live fact']);
  });

  it('is strictly guest-scoped — another guest sees nothing (CH-09 leak pin)', async () => {
    const owner = await seedGuest('+917700900308');
    const stranger = await seedGuest('+917700900309');
    await seedFact(owner.id, 'celebration', 'honeymoon suite decorated last visit');
    expect(await getActiveGuestFacts(db, stranger.id)).toHaveLength(0);
    expect(await getAllGuestFacts(db, stranger.id)).toHaveLength(0);
  });
});

describe('deleteGuestFacts / updateGuestPrefs / getGuestByPhone', () => {
  it('deleteGuestFacts wipes only that guest (CH-18 hook)', async () => {
    const a = await seedGuest('+917700900310');
    const b = await seedGuest('+917700900311');
    await seedFact(a.id, 'preference', 'fact for guest a');
    await seedFact(b.id, 'preference', 'fact for guest b');
    await deleteGuestFacts(db, a.id);
    expect(await getAllGuestFacts(db, a.id)).toHaveLength(0);
    expect(await getAllGuestFacts(db, b.id)).toHaveLength(1);
  });

  it('updateGuestPrefs applies a partial patch and no-ops on empty', async () => {
    const guest = await seedGuest('+917700900312');
    await updateGuestPrefs(db, guest.id, { registerPref: 'formal_sir_maam' });
    let [row] = await db.select().from(schema.guests).where(eq(schema.guests.id, guest.id));
    expect(row?.registerPref).toBe('formal_sir_maam');
    expect(row?.langPref).toBe('unknown');
    await updateGuestPrefs(db, guest.id, { langPref: 'hinglish' });
    await updateGuestPrefs(db, guest.id, {});
    [row] = await db.select().from(schema.guests).where(eq(schema.guests.id, guest.id));
    expect(row?.registerPref).toBe('formal_sir_maam');
    expect(row?.langPref).toBe('hinglish');
  });

  it('getGuestByPhone returns the row or null', async () => {
    const guest = await seedGuest('+917700900313');
    expect((await getGuestByPhone(db, '+917700900313'))?.id).toBe(guest.id);
    expect(await getGuestByPhone(db, '+917700900399')).toBeNull();
  });
});

describe('remember_fact through the registry (DB integration)', () => {
  const registry = buildToolRegistry();

  function toolCtx(guestId: string, saves = { count: 0 }) {
    const memory = {
      db,
      guestId,
      conversationId: '00000000-0000-4000-8000-0000000000cc',
      sourceMessageId: '00000000-0000-4000-8000-0000000000dd',
      saves,
    };
    return {
      ctx: {
        website: {
          getQuote: async () => {
            throw new Error('no website in this test');
          },
          getAvailability: async () => {
            throw new Error('no website in this test');
          },
        },
        websiteBaseUrl: 'https://website.test.invalid',
        degraded: { record: () => {} },
        log: { error: () => {} },
        memory,
      } as unknown as import('../src/brain/tools/registry.js').ToolContext,
      memory,
    };
  }

  it('saves via the registry: row lands with provenance, counter increments', async () => {
    const guest = await seedGuest('+917700900314');
    const { ctx, memory } = toolCtx(guest.id);
    const res = await registry.run(
      'remember_fact',
      { kind: 'preference', content: 'Loved the early check-in last time' },
      ctx,
    );
    expect(res).toMatchObject({ ok: true, data: { saved: true, kind: 'preference' } });
    expect(memory.saves.count).toBe(1);
    const rows = await getAllGuestFacts(db, guest.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sourceMessageId).toBe('00000000-0000-4000-8000-0000000000dd');
  });

  it('a re-save is ok:true saved:false duplicate and does NOT increment', async () => {
    const guest = await seedGuest('+917700900315');
    const saves = { count: 0 };
    const { ctx } = toolCtx(guest.id, saves);
    const input = { kind: 'celebration', content: 'Tenth anniversary on 21 December' };
    await registry.run('remember_fact', input, ctx);
    const dup = await registry.run('remember_fact', input, ctx);
    expect(dup).toMatchObject({ ok: true, data: { saved: false, reason: 'duplicate' } });
    expect(saves.count).toBe(1);
    expect(await getAllGuestFacts(db, guest.id)).toHaveLength(1);
  });

  it('saved data never echoes content or numbers (guardrail-1 laundering pin)', async () => {
    const guest = await seedGuest('+917700900316');
    const { ctx } = toolCtx(guest.id);
    const res = await registry.run(
      'remember_fact',
      { kind: 'context', content: 'Group of 6 adults visiting for 3 nights' },
      ctx,
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      const json = JSON.stringify(res.data);
      expect(json).not.toMatch(/adults|nights|[0-9]/);
    }
  });

  it('a screened save stores NOTHING (the done-when sensitive probe)', async () => {
    const guest = await seedGuest('+917700900317');
    const { ctx } = toolCtx(guest.id);
    const res = await registry.run(
      'remember_fact',
      { kind: 'context', content: 'Guest is diabetic, keep insulin in the fridge' },
      ctx,
    );
    expect(res).toMatchObject({ ok: false, error: 'REFUSED' });
    expect(await getAllGuestFacts(db, guest.id)).toHaveLength(0);
  });
});
