/**
 * CH-11 · get_booking (§6.4) — real Postgres.
 *
 * The single most valuable assertion in this chunk is the one that proves EVERY
 * failure path returns a byte-identical value: an "unknown reference" that reads
 * differently from a "wrong name" tells a stranger which reservation numbers are
 * real, and which half of the secret they still need. This property's reservation
 * numbers are short and near-sequential (877, 894, 952, 953 are all real).
 *
 * Phone decade 5xx is CH-11's claim in the test-number ledger.
 */
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.js';
import { upsertMirrorRow, type MirrorRowInput } from '../src/db/bookings.js';
import { getGuestStays, linkStaysByPhone, recordReferenceAttempt } from '../src/db/stays.js';
import { upsertGuestByPhone } from '../src/db/repos.js';
import * as schema from '../src/db/schema.js';
import { getBookingTool } from '../src/brain/tools/getBooking.js';
import { projectAll } from '../src/brain/stayView.js';
import type { ToolBookingContext, ToolContext, ToolResult } from '../src/brain/tools/registry.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

const OWNER = '+917700900511';
const STRANGER = '+917700900512';
const TODAY = '2026-07-13';

let client: ReturnType<typeof postgres>;
let db: Db;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
}, 30_000);

beforeEach(async () => {
  await db.execute(sql`TRUNCATE reference_attempts, guest_stays, bookings_mirror, guests CASCADE`);
});

afterAll(async () => {
  await client?.end();
});

function makeInput(over: Partial<MirrorRowInput> = {}): MirrorRowInput {
  return {
    ezeeReservationNo: '953',
    ezeeBookingTranId: '5220300000000000900',
    guestName: 'Rahul Mehta',
    guestPhone: OWNER,
    guestEmail: 'rahul.mehta@example.com',
    roomTypeId: '5220300000000000003',
    roomTypeName: 'Nistula Villa',
    physicalRoomLabel: null,
    rateplanId: '5220300000000000006',
    checkIn: '2026-08-26',
    checkOut: '2026-08-28',
    adults: 4,
    children: 0,
    status: 'confirmed',
    source: 'Internet Booking Engine',
    amount: '13854.75',
    currency: 'INR',
    raw: { UniqueID: '953' },
    ...over,
  };
}

async function ctxFor(
  phone: string,
  guestText: string,
  over: Partial<ToolBookingContext> = {},
): Promise<ToolContext> {
  const guest = await upsertGuestByPhone(db, phone, 'WhatsApp Pushname');
  const stays = projectAll(await getGuestStays(db, guest.id), TODAY);
  const booking: ToolBookingContext = {
    db,
    guestId: guest.id,
    guestPhone: phone,
    guestText,
    stays,
    today: TODAY,
    claim: { refused: false, attempted: null, escalateReason: null, strikeReference: null, linkedReference: null },
    ...over,
  };
  return {
    website: {} as ToolContext['website'],
    websiteBaseUrl: 'https://example.test',
    degraded: { record: () => {} },
    log: { error: () => {}, warn: () => {} },
    booking,
  };
}

const run = (input: unknown, ctx: ToolContext): Promise<ToolResult> =>
  getBookingTool.handler(input, ctx);

/** Rows in the attempt log for a phone (optionally one outcome). */
async function countAttempts(phone: string, outcome?: 'linked' | 'refused'): Promise<number> {
  const rows = await db
    .select({ outcome: schema.referenceAttempts.outcome })
    .from(schema.referenceAttempts)
    .where(eq(schema.referenceAttempts.phone, phone));
  return outcome === undefined ? rows.length : rows.filter((r) => r.outcome === outcome).length;
}

describe('no reference — the guest\'s own linked stays', () => {
  it('returns the linked stay with no money, name, email or meal plan', async () => {
    await upsertMirrorRow(db, makeInput());
    const guest = await upsertGuestByPhone(db, OWNER, 'Pushname');
    await linkStaysByPhone(db, guest.id, OWNER);

    const ctx = await ctxFor(OWNER, 'when is my check-in?');
    const res = await run({}, ctx);

    expect(res.ok).toBe(true);
    const json = JSON.stringify(res);
    expect(json).toContain('2026-08-26');
    expect(json).toContain('Nistula Villa');
    expect(json).not.toContain('13854');
    expect(json).not.toContain('Rahul');
    expect(json).not.toContain('example.com');
    expect(json).not.toMatch(/rateplan|European Plan|breakfast/i);
  });

  it('returns nothing for a guest with no bookings — and never another guest\'s', async () => {
    await upsertMirrorRow(db, makeInput()); // belongs to OWNER
    const ctx = await ctxFor(STRANGER, 'when is my check-in?');
    const res = await run({}, ctx);

    expect(res).toMatchObject({ ok: true });
    expect(JSON.stringify(res)).not.toContain('2026-08-26');
    expect((res as { data: { stays: unknown[] } }).data.stays).toEqual([]);
  });

  it('tells the model an undescribable booking exists, without any detail', async () => {
    await upsertMirrorRow(db, makeInput({ raw: { BookingTran: [{}, {}, {}] } }));
    const guest = await upsertGuestByPhone(db, OWNER, 'Pushname');
    await linkStaysByPhone(db, guest.id, OWNER);

    const res = await run({}, await ctxFor(OWNER, 'my booking?'));
    expect(res).toMatchObject({ ok: true });
    expect((res as { data: { undescribable_booking_exists: boolean } }).data
      .undescribable_booking_exists).toBe(true);
    expect(JSON.stringify(res)).not.toContain('2026-08-26');
  });
});

describe('the reference claim — every failure is the SAME value', () => {
  const CLAIM = 'Hi, Rahul Mehta here, booking 953, checking in 26 Aug.';

  it('links and answers when the guest states the name and check-in date', async () => {
    await upsertMirrorRow(db, makeInput({ guestPhone: null })); // OTA-masked
    const ctx = await ctxFor(STRANGER, CLAIM);
    const res = await run({ reference: '953' }, ctx);

    expect(res.ok).toBe(true);
    expect(JSON.stringify(res)).toContain('2026-08-26');
    const guest = await upsertGuestByPhone(db, STRANGER, 'x');
    expect(await getGuestStays(db, guest.id)).toHaveLength(1);
  });

  // THE assertion. Every path a PROBING GUEST can reach — i.e. every path where
  // the guest actually TYPED the reference they are probing — returns one
  // indistinguishable value, so a stranger walking reservation numbers learns
  // nothing about which exist or which half of the secret they got wrong. (The
  // model-invented-reference path is deliberately DIFFERENT, but a guest cannot
  // reach it: typing the number makes referenceWasStated true → these paths.)
  it('returns a byte-identical refusal for every guest-reachable failure path', async () => {
    await upsertMirrorRow(db, makeInput({ guestPhone: null }));
    const results: string[] = [];

    // 1. the reservation does not exist
    results.push(
      JSON.stringify(await run({ reference: '111' }, await ctxFor(STRANGER, 'booking 111, Rahul Mehta, 26 Aug'))),
    );
    // 2. right reference, wrong name
    results.push(
      JSON.stringify(await run({ reference: '953' }, await ctxFor(STRANGER, 'booking 953, Priya Sharma, 26 Aug'))),
    );
    // 3. right reference, right name, wrong date
    results.push(
      JSON.stringify(await run({ reference: '953' }, await ctxFor(STRANGER, 'booking 953, Rahul Mehta, 27 Aug'))),
    );
    // 4. right reference, nothing corroborating at all
    results.push(
      JSON.stringify(await run({ reference: '953' }, await ctxFor(STRANGER, 'booking 953 please'))),
    );
    // 5. locked out
    for (let i = 0; i < 3; i++) {
      await recordReferenceAttempt(db, { phone: STRANGER, claimedReference: 'x', outcome: 'refused' });
    }
    results.push(
      JSON.stringify(await run({ reference: '953' }, await ctxFor(STRANGER, CLAIM))),
    );

    // ONE value across all five. This is the security property.
    expect(new Set(results).size).toBe(1);
    const refusal = results[0] ?? '';
    expect(refusal).toContain('REFUSED');
    // No secret VALUE leaks: not the reference, not the name, not the date.
    // (The refusal text names those CATEGORIES — "do not repeat any name, date
    // or villa" — because it is an instruction to the model, not a disclosure.)
    expect(refusal).not.toContain('953');
    expect(refusal).not.toContain('111');
    expect(refusal).not.toContain('Rahul');
    expect(refusal).not.toContain('Mehta');
    expect(refusal).not.toContain('2026-08-26');
    expect(refusal).not.toContain('Nistula Villa');
    // …and it never counts attempts down, which would itself be an oracle.
    expect(refusal).not.toMatch(/\b(?:attempts?\s+(?:left|remaining)|tries left|\d\s+of\s+3)\b/i);
  });

  // The tool no longer writes the strike itself — it SIGNALS one, and the worker
  // records it POST-CLAIM (CH-03 D2: a pre-claim strike would double-charge on a
  // converse() retry). So the tool test asserts the signal; the worker e2e
  // asserts the row lands exactly once.
  it('signals a refusal to a human and marks the strike, on the identity channel', async () => {
    await upsertMirrorRow(db, makeInput({ guestPhone: null }));
    const ctx = await ctxFor(STRANGER, 'booking 953, Priya Sharma, 26 Aug');
    await run({ reference: '953' }, ctx);

    expect(ctx.booking?.claim.escalateReason).toBe('booking_reference');
    expect(ctx.booking?.claim.strikeReference).toBe('953');
    // Nothing written by the tool — the worker owns the DB side effect.
    expect(await countAttempts(STRANGER)).toBe(0);
  });

  // An honest typo must cost ONE strike, not two: the tool loop re-runs whole on
  // a guardrail regenerate (CH-09's `saves` counter solved the same shape). The
  // per-turn latch freezes after the first refusal, so the signal is set once.
  it('marks the strike once per turn even when the loop re-runs', async () => {
    await upsertMirrorRow(db, makeInput({ guestPhone: null }));
    const ctx = await ctxFor(STRANGER, 'booking 953, Priya Sharma, 26 Aug');

    await run({ reference: '953' }, ctx); // first loop → sets the signal
    await run({ reference: '953' }, ctx); // regenerate loop — frozen, no re-mark
    await run({ reference: '953' }, ctx);

    expect(ctx.booking?.claim.strikeReference).toBe('953'); // exactly one reference
    expect(ctx.booking?.claim.refused).toBe(true);
  });

  it('refuses a second DIFFERENT reference in one turn — the model may not fish', async () => {
    await upsertMirrorRow(db, makeInput({ guestPhone: null }));
    const ctx = await ctxFor(STRANGER, 'is it booking 952 or 953?');
    const first = await run({ reference: '952' }, ctx);
    const second = await run({ reference: '953' }, ctx);

    expect(first).toMatchObject({ ok: false });
    expect(second).toMatchObject({ ok: false });
  });

  it('never burns a strike when the guest re-states their OWN reference', async () => {
    await upsertMirrorRow(db, makeInput());
    const guest = await upsertGuestByPhone(db, OWNER, 'Pushname');
    await linkStaysByPhone(db, guest.id, OWNER);

    const ctx = await ctxFor(OWNER, 'checking booking 953 again');
    const res = await run({ reference: '953' }, ctx);

    expect(res.ok).toBe(true);
    expect(ctx.booking?.claim.strikeReference).toBeNull(); // no strike signalled
  });

  // A verified claim on a CANCELLED booking is still theirs — link it, but a
  // person must tell them, on the BENIGN channel (not an identity probe).
  it('links but refuses to describe a verified claim on a cancelled booking', async () => {
    await upsertMirrorRow(db, makeInput({ guestPhone: null, status: 'cancelled' }));
    const ctx = await ctxFor(STRANGER, CLAIM);
    const res = await run({ reference: '953' }, ctx);

    expect(res).toMatchObject({ ok: false, error: 'REFUSED' });
    expect(ctx.booking?.claim.escalateReason).toBe('booking_undescribable');
    expect(ctx.booking?.claim.strikeReference).toBeNull(); // it IS theirs — no strike
    const guest = await upsertGuestByPhone(db, STRANGER, 'x');
    expect(await getGuestStays(db, guest.id)).toHaveLength(1);
  });

  // An OWNER asking about their OWN already-linked cancelled booking by reference
  // must not be charged a strike or paged as an identity probe (audit DEFECT).
  it('charges no strike when an owner asks about their own cancelled booking', async () => {
    await upsertMirrorRow(db, makeInput({ status: 'cancelled' }));
    const guest = await upsertGuestByPhone(db, OWNER, 'Pushname');
    await linkStaysByPhone(db, guest.id, OWNER);

    const ctx = await ctxFor(OWNER, 'is booking 953 still on?');
    const res = await run({ reference: '953' }, ctx);

    expect(res).toMatchObject({ ok: false, error: 'REFUSED' });
    expect(ctx.booking?.claim.escalateReason).toBe('booking_undescribable');
    expect(ctx.booking?.claim.strikeReference).toBeNull();
  });

  // The model inventing a reference the guest never typed is neither a probe nor
  // a typo — no strike, no human-follow-up promise (audit DEFECT).
  it('does not strike or promise a human when the model invents a reference', async () => {
    await upsertMirrorRow(db, makeInput({ guestPhone: null }));
    const ctx = await ctxFor(STRANGER, 'can you check my booking?');
    const res = await run({ reference: '953' }, ctx);

    // INVALID (steer the model), not REFUSED (a probe). No strike, no
    // escalation — the message even instructs the model NOT to promise a human.
    expect(res).toMatchObject({ ok: false, error: 'INVALID' });
    expect(ctx.booking?.claim.strikeReference).toBeNull();
    expect(ctx.booking?.claim.escalateReason).toBeNull();
    expect((res as { message: string }).message).toMatch(/no reference|ask the guest/i);
  });
});

describe('the WhatsApp profile name can never verify a claim', () => {
  // The whole reason the tool takes ONE argument. Even if the model tries to
  // pass a name, there is no field for it — and the guest's text is the only
  // thing corroborated. Here the attacker's pushname IS the booking name.
  it('refuses when the booking name appears only as the WhatsApp pushname', async () => {
    await upsertMirrorRow(db, makeInput({ guestPhone: null }));
    // The attacker set their WhatsApp name to "Rahul Mehta" — but never TYPED it.
    const guest = await upsertGuestByPhone(db, STRANGER, 'Rahul Mehta');
    const ctx = await ctxFor(STRANGER, 'check booking 953 for me');
    ctx.booking!.guestId = guest.id;

    const res = await run({ reference: '953' }, ctx);
    expect(res).toMatchObject({ ok: false, error: 'REFUSED' });
    expect(await getGuestStays(db, guest.id)).toEqual([]);
  });

  // Even a name+date the model supplies as extra arguments is ignored: the
  // schema has no such fields, so they are stripped before the handler runs.
  it('ignores name/check_in arguments a model tries to smuggle in', async () => {
    await upsertMirrorRow(db, makeInput({ guestPhone: null }));
    const ctx = await ctxFor(STRANGER, 'check booking 953 for me');
    const res = await getBookingTool.inputSchema.safeParse({
      reference: '953',
      name: 'Rahul Mehta',
      check_in: '2026-08-26',
    });
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ reference: '953' }); // the secrets are gone
    const out = await run(res.data, ctx);
    expect(out).toMatchObject({ ok: false, error: 'REFUSED' });
  });
});
