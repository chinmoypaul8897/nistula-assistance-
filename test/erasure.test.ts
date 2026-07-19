/**
 * CH-18a-1 — DELETE_GUEST erasure engine (db/erasure.ts). Real Postgres.
 *
 * The residue sweep is the CONTRACT guard: after a confirmed erasure, the
 * guest's phone (both the +E.164 and the bare-wire-digits form) and their name
 * must appear in NO in-scope column of ANY table — scanned dynamically off
 * information_schema, so a future PII-bearing table is caught automatically
 * rather than trusting a hand-kept list. bookings_mirror and raw_events(ezee)
 * are the documented reservation-keyed carve-outs (schema.ts).
 *
 * Phones from the reserved +91 7700 90xxxx test band (fixture-scrub range).
 */
import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { eraseGuestByPhone, redactPayload } from '../src/db/erasure.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

let client: ReturnType<typeof postgres>;
let db: Db;

// The guest to be erased, and a bystander whose data must survive untouched.
const PHONE = '+917700900450';
const DIGITS = '917700900450'; // the bare-wire form Meta puts in webhook payloads
const FIRST = 'ZqxErase';
const LAST = 'Wraith';
const OTHER_PHONE = '+917700900451';

const TABLES = [
  'guest_facts',
  'guest_stays',
  'messages',
  'conversations',
  'scheduled_messages',
  'drafts',
  'tasks',
  'reference_attempts',
  'phone_windows',
  'raw_events',
  'bookings_mirror',
  'cost_events',
  'guests',
];

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
}, 30_000);

afterAll(async () => {
  await client?.end();
});

beforeEach(async () => {
  await db.execute(sql.raw(`TRUNCATE ${TABLES.join(', ')} CASCADE`));
});

/** Seed one guest with a row in every in-scope table, plus reservation-keyed
 * rows (bookings_mirror + raw_events ezee) that erasure must NOT touch, plus a
 * second guest whose data must survive. Returns the erased guest's id. */
async function seedGuest(): Promise<string> {
  const [guest] = await db
    .insert(schema.guests)
    .values({ phone: PHONE, waProfileName: `${FIRST} ${LAST}`, firstName: FIRST, lastName: LAST, notes: `note about ${FIRST}` })
    .returning();
  const guestId = guest!.id;
  const [conv] = await db.insert(schema.conversations).values({ guestId, summary: `summary mentioning ${FIRST}` }).returning();
  const convId = conv!.id;

  await db.insert(schema.messages).values([
    { conversationId: convId, direction: 'in', sender: 'guest', type: 'text', status: 'received', body: `${FIRST} here, my num ${DIGITS}`, waMessageId: 'wamid.ERASE1', mediaId: 'media-erase-1', raw: { from: DIGITS, text: { body: 'hi' } } },
    { conversationId: convId, direction: 'out', sender: 'ai', type: 'text', status: 'sent', body: 'our reply', waMessageId: 'wamid.ERASE2' },
  ]);
  await db.insert(schema.guestFacts).values({ guestId, kind: 'preference', content: `${FIRST} loves early check-in` });

  const [booking] = await db
    .insert(schema.bookingsMirror)
    .values({ ezeeReservationNo: 'RES-ERASE-1', guestName: `${FIRST} ${LAST}`, guestPhone: PHONE, status: 'confirmed', raw: { Mobile: DIGITS, Name: FIRST }, syncedAt: new Date() })
    .returning();
  const bookingId = booking!.id;
  await db.insert(schema.guestStays).values({ guestId, bookingId, matchedBy: 'phone' });

  await db.insert(schema.scheduledMessages).values([
    { guestId, bookingId, kind: 'confirmation', templateName: 'nst_confirmation_v1', params: { name: FIRST }, sendAt: new Date(), dedupeKey: 'confirmation:RES-ERASE-1', status: 'pending' },
    { guestId, bookingId, kind: 'welcome', templateName: 'nst_welcome_v1', params: { name: FIRST }, sendAt: new Date(), dedupeKey: 'welcome:RES-ERASE-1', status: 'sent' },
  ]);
  await db.insert(schema.drafts).values([
    { conversationId: convId, shortId: 'DRFTA1', replyType: 'instay', proposedBody: `Hello ${FIRST}, number ${DIGITS}`, contextNote: 'stage instay', finalBody: `edited for ${FIRST}` },
    { conversationId: convId, shortId: 'DRFTB2', replyType: 'presales', proposedBody: `Quote for ${FIRST}`, finalBody: null },
  ]);
  const slaDeadline = new Date(Date.now() + 30 * 60_000);
  await db.insert(schema.tasks).values([
    { conversationId: convId, guestId, bookingId, kind: 'housekeeping', shortId: 'TASKA1', summary: `${FIRST} wants towels ${DIGITS}`, detail: 'two towels', slaMinutes: 30, slaDeadline, origin: 'guest' },
    { guestId, kind: 'frontdesk', shortId: 'TASKB2', summary: `verify past issue for ${FIRST}`, slaMinutes: 120, slaDeadline, origin: 'system' },
  ]);
  await db.insert(schema.referenceAttempts).values({ phone: PHONE, claimedReference: 'RES-ERASE-1', outcome: 'refused' });
  await db.insert(schema.phoneWindows).values({ phone: PHONE, lastInboundAt: new Date() });

  await db.insert(schema.rawEvents).values([
    { source: 'whatsapp', eventType: 'message', payload: { entry: [{ changes: [{ value: { contacts: [{ wa_id: DIGITS }], messages: [{ from: DIGITS, text: { body: `${FIRST} secret text` } }] } }] }] } },
    { source: 'whatsapp', eventType: 'status', payload: { entry: [{ changes: [{ value: { statuses: [{ recipient_id: DIGITS, status: 'read' }] } }] }] } },
    { source: 'system', eventType: 'guardrail', processed: true, payload: { rule: 'price_integrity', action: 'blocked', draftHash: 'abc123', draft: `draft for ${FIRST}`, guestPhone: PHONE, details: {} } },
    { source: 'ezee', eventType: 'Bookings', payload: { Reservations: [{ Mobile: DIGITS, Name: FIRST }] } },
  ]);

  // The bystander — a message that must survive erasure of the other guest.
  const [other] = await db.insert(schema.guests).values({ phone: OTHER_PHONE, firstName: 'Keeper' }).returning();
  const [otherConv] = await db.insert(schema.conversations).values({ guestId: other!.id }).returning();
  await db.insert(schema.messages).values({ conversationId: otherConv!.id, direction: 'in', sender: 'guest', type: 'text', status: 'received', body: 'Keeper stays' });

  return guestId;
}

/** Every in-scope column of every table (bookings_mirror excluded; raw_events
 * ezee carved out) that still contains `needle`. Empty = fully erased. */
async function residue(needle: string): Promise<{ table: string; column: string }[]> {
  const cols = [
    ...(await db.execute<{ table_name: string; column_name: string }>(sql`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type IN ('text', 'character varying', 'jsonb')
        AND table_name NOT LIKE '\\_\\_drizzle%'
        AND table_name <> 'bookings_mirror'
    `)),
  ];
  const hits: { table: string; column: string }[] = [];
  for (const c of cols) {
    const carveOut = c.table_name === 'raw_events' ? sql` AND source <> 'ezee'` : sql``;
    const rows = [
      ...(await db.execute<{ n: number }>(sql`
        SELECT count(*)::int AS n FROM ${sql.raw(`"${c.table_name}"`)}
        WHERE ${sql.raw(`"${c.column_name}"`)}::text LIKE ${`%${needle}%`}${carveOut}
      `)),
    ];
    if ((rows[0]?.n ?? 0) > 0) hits.push({ table: c.table_name, column: c.column_name });
  }
  return hits;
}

describe('redactPayload (pure)', () => {
  it('redacts every phone form and blanks message bodies', () => {
    const out = redactPayload(
      { from: DIGITS, note: `call ${PHONE} now`, text: { body: 'secret' }, caption: 'x', nested: [{ n: DIGITS }] },
      [PHONE, DIGITS],
    ) as Record<string, unknown>;
    expect(JSON.stringify(out)).not.toContain(DIGITS);
    expect(JSON.stringify(out)).not.toContain(PHONE);
    expect(out.text).toEqual({ body: null });
    expect(out.caption).toBeNull();
  });
});

describe('eraseGuestByPhone', () => {
  it('dry-run reports counts and changes nothing', async () => {
    await seedGuest();
    const report = await eraseGuestByPhone(db, PHONE, { confirm: false });
    expect(report).not.toBeNull();
    expect(report!.dryRun).toBe(true);
    expect(report!.tables.messages).toBe(2);
    expect(report!.tables.guest_facts).toBe(1);
    expect(report!.tables.tasks).toBe(2);
    expect(report!.tables.raw_events_whatsapp).toBe(2);
    expect(report!.tables.raw_events_system).toBe(1);
    // Nothing was written — the guest is still findable by phone with their name.
    const [g] = await db.select().from(schema.guests).where(eq(schema.guests.phone, PHONE));
    expect(g?.firstName).toBe(FIRST);
    expect(await residue(DIGITS)).not.toEqual([]); // still present pre-erasure
  });

  it('confirm erases every in-scope column — residue sweep is clean', async () => {
    const guestId = await seedGuest();
    const report = await eraseGuestByPhone(db, PHONE, { confirm: true });
    expect(report!.dryRun).toBe(false);

    // THE contract guard: no phone form, no name, anywhere in-scope.
    expect(await residue(DIGITS)).toEqual([]);
    expect(await residue(PHONE)).toEqual([]);
    expect(await residue(FIRST)).toEqual([]);
    expect(await residue(LAST)).toEqual([]);

    // Identity root tombstoned, opted out, unfindable by the original phone.
    const [g] = await db.select().from(schema.guests).where(eq(schema.guests.id, guestId));
    expect(g?.phone).toBe(`erased:${guestId}`);
    expect(g?.firstName).toBeNull();
    expect(g?.waProfileName).toBeNull();
    expect(g?.notes).toBeNull();
    expect(g?.optOutMarketing).toBe(true);

    // Per-table shape: deleted vs scrubbed vs unlinked.
    const facts = await db.select().from(schema.guestFacts).where(eq(schema.guestFacts.guestId, guestId));
    expect(facts).toHaveLength(0);
    const stays = await db.select().from(schema.guestStays).where(eq(schema.guestStays.guestId, guestId));
    expect(stays).toHaveLength(0);
    const refs = await db.select().from(schema.referenceAttempts).where(eq(schema.referenceAttempts.phone, PHONE));
    expect(refs).toHaveLength(0);
    const windows = await db.select().from(schema.phoneWindows).where(eq(schema.phoneWindows.phone, PHONE));
    expect(windows).toHaveLength(0);

    // scheduled_messages: params scrubbed on all; only the pending row cancelled.
    const sched = await db.select().from(schema.scheduledMessages).where(eq(schema.scheduledMessages.guestId, guestId));
    expect(sched.every((s) => JSON.stringify(s.params) === '{}')).toBe(true);
    expect(sched.find((s) => s.kind === 'confirmation')?.status).toBe('cancelled');
    expect(sched.find((s) => s.kind === 'confirmation')?.skipReason).toBe('guest_erased');
    expect(sched.find((s) => s.kind === 'welcome')?.status).toBe('sent');

    // tasks: unlinked (guest/conv/booking null) AND body scrubbed — both origins.
    const tasks = await db.select().from(schema.tasks).where(eq(schema.tasks.shortId, 'TASKA1'));
    expect(tasks[0]).toMatchObject({ guestId: null, conversationId: null, bookingId: null, summary: '[erased]', detail: null });
    const sysTask = await db.select().from(schema.tasks).where(eq(schema.tasks.shortId, 'TASKB2'));
    expect(sysTask[0]).toMatchObject({ guestId: null, summary: '[erased]' });

    // System telemetry KEEPS its aggregate history, blanks only the guest keys.
    const [sysEvent] = await db
      .select()
      .from(schema.rawEvents)
      .where(and(eq(schema.rawEvents.source, 'system'), eq(schema.rawEvents.eventType, 'guardrail')));
    const sysPayload = sysEvent!.payload as Record<string, unknown>;
    expect(sysPayload.rule).toBe('price_integrity');
    expect(sysPayload.draftHash).toBe('abc123');
    expect(sysPayload.draft).toBeNull();
    expect(sysPayload.guestPhone).toBeNull();
  });

  it('leaves reservation-keyed data and the bystander untouched', async () => {
    await seedGuest();
    await eraseGuestByPhone(db, PHONE, { confirm: true });

    // bookings_mirror is the documented carve-out — still holds the guest fields.
    const [mirror] = await db.select().from(schema.bookingsMirror).where(eq(schema.bookingsMirror.ezeeReservationNo, 'RES-ERASE-1'));
    expect(mirror?.guestPhone).toBe(PHONE);
    expect(mirror?.guestName).toBe(`${FIRST} ${LAST}`);

    // raw_events ezee is the same carve-out — untouched.
    const [ezeeEvent] = await db.select().from(schema.rawEvents).where(eq(schema.rawEvents.source, 'ezee'));
    expect(JSON.stringify(ezeeEvent?.payload)).toContain(DIGITS);

    // The bystander survives entirely.
    const [keeper] = await db.select().from(schema.guests).where(eq(schema.guests.phone, OTHER_PHONE));
    expect(keeper?.firstName).toBe('Keeper');
  });

  it('is idempotent — a re-run by the original phone finds nobody', async () => {
    await seedGuest();
    await eraseGuestByPhone(db, PHONE, { confirm: true });
    const again = await eraseGuestByPhone(db, PHONE, { confirm: true });
    expect(again).toBeNull();
  });

  it('returns null for an unknown phone', async () => {
    expect(await eraseGuestByPhone(db, '+917700900999', { confirm: true })).toBeNull();
  });
});
