/**
 * DELETE_GUEST — the DPDP right-to-erasure action (plan.md §3.3 "an admin
 * DELETE_GUEST action erases a guest's rows"; CH-18 step 1). One guest, one
 * transaction, every column that holds their words or their number.
 *
 * SHAPE = anonymise-in-place, not bottom-up delete. No FK in this schema is
 * ON DELETE CASCADE, and four children hold NOT NULL FKs to guests
 * (conversations, guest_facts, guest_stays, scheduled_messages) — so deleting
 * the guest row would need a fragile bottom-up ordering. Blanking the PII
 * columns keeps referential integrity and matches §3.3's "anonymised" wording.
 *
 * SCOPE — guard by the CONTRACT ("is this the guest's own data?"), verified by
 * the residue-sweep test (no phone/name survives in any in-scope column), never
 * by trusting this list to stay complete:
 *   - IN: guests, conversations, messages, guest_facts, guest_stays,
 *     scheduled_messages, drafts, tasks, reference_attempts, phone_windows, and
 *     raw_events rows sourced 'whatsapp' (the guest's own messages) or 'system'
 *     (telemetry keyed to them).
 *   - OUT, by the schema's stated decision (schema.ts bookings_mirror header):
 *     reservation-keyed data — bookings_mirror AND raw_events source='ezee' (a
 *     poll batch holds many reservations at once) — is controlled by
 *     data-minimisation at the eZee boundary, not by DELETE_GUEST. cost_events
 *     carries no PII.
 *
 * `tasks` are UNLINKED and their body SCRUBBED (not merely "retained unlinked"
 * per §4): summary/detail are the guest's own words and, unlike guest_facts,
 * are deliberately NOT screened for sensitive content (schema.ts tasks header).
 *
 * CONVERSATION_ID=NULL MESSAGES — the guest's name/phone/words are ALSO rendered
 * into `messages` rows that DON'T hang off the guest's conversation and carry NO
 * guest FK: sender='system' (task/escalation/draft cards, the escalateToOps ops
 * card, AI ON/OFF replies, SLA nudges) AND sender='human' (staff INBOUND typed at
 * the line — an `EDIT <id> <text>` naming the guest, a free-form note). These are
 * scrubbed by matching the guest's IDENTITY (phone, name-core, task+draft
 * shortId) — the CONTRACT. This took THREE re-review rounds: a shortId-only scrub
 * missed escalateToOps + AI-toggle; a \y name regex missed emoji/punctuation-edged
 * pushnames; a sender='system' filter missed staff inbound ("a leak has siblings
 * — enumerate ALL", each round a NEW sibling). 🚨 KNOWN RESIDUAL — this is a
 * BEST-EFFORT string match, NOT a durable link: a conversation_id=null body that
 * refers to the guest WITHOUT their stored name/phone/shortId (a name-free
 * complaint tail, a staff paraphrase, a pure-emoji/1-char name) cannot be
 * attributed by content. It carries no stored name/phone, so the residue-sweep
 * contract holds; the DURABLE fix is architectural — TODO(CH-18c): give these
 * staff/ops sends a guest reference (or render from one on read) so guest content
 * never lands in an un-attributable row.
 *
 * Full erasure completes as the encrypted backups age out of their 30-day
 * retention (backups land in CH-18a-2); the LIVE database is erased now.
 */
import { and, count, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { Db } from './client.js';
import { deleteGuestFacts, getGuestByPhone } from './guestMemory.js';
import { deleteGuestStays, deleteReferenceAttempts } from './stays.js';
import { deletePhoneWindow } from './windows.js';
import {
  conversations,
  drafts,
  guestFacts,
  guestStays,
  guests,
  messages,
  phoneWindows,
  rawEvents,
  referenceAttempts,
  scheduledMessages,
  tasks,
} from './schema.js';

const REDACTED = '[redacted]';
const ERASED = '[erased]';

/** Guest-identifying string keys blanked wholesale in a matched whatsapp
 * envelope. NOT just 'body'/'caption': Meta puts the guest's DISPLAY NAME at
 * contacts[].profile.name (the very string tombstoned to null on the guests
 * row) and a shared-location's name/address at messages[].location.{name,
 * address} — none of which contain the phone digits, so digit-replacement alone
 * left the name intact (pre-merge review BLOCKER: the name survived erasure and
 * the residue sweep was vacuously green because its seed omitted profile.name).
 * Over-blanking an already guest-scoped audit envelope is the safe direction. */
const BLANK_KEYS = new Set(['body', 'caption', 'name', 'address']);

export interface EraseReport {
  /** uuid, not PII — safe to log/return. The phone is never echoed. */
  guestId: string;
  /** true = counts are what WOULD change; nothing was written. */
  dryRun: boolean;
  /** Rows anonymised/scrubbed/deleted per table (would-change on a dry run). */
  tables: Record<string, number>;
  /** Reservation-keyed / no-PII tables left intact by design. */
  untouched: string[];
}

async function countWhere(db: Db, table: PgTable, where: SQL | undefined): Promise<number> {
  const [row] = await db.select({ n: count() }).from(table).where(where);
  return row?.n ?? 0;
}

/**
 * Recursively redact a webhook payload: replace every occurrence of the guest's
 * phone (in either the '+E.164' or the bare-wire-digits form Meta sends) and
 * blank every guest-identifying string key (BLANK_KEYS — body/caption/name/
 * address). Runs only on rows already matched to this guest, so blanking a key
 * wholesale cannot touch another guest's data unless a single webhook batched
 * them — in which case erring toward MORE erasure of an audit envelope is the
 * safe direction.
 */
export function redactPayload(value: unknown, reps: readonly string[]): unknown {
  if (typeof value === 'string') {
    let out = value;
    for (const rep of reps) if (rep !== '') out = out.split(rep).join(REDACTED);
    return out;
  }
  if (Array.isArray(value)) return value.map((v) => redactPayload(v, reps));
  if (value !== null && typeof value === 'object') {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      obj[k] = BLANK_KEYS.has(k) ? null : redactPayload(v, reps);
    }
    return obj;
  }
  return value;
}

/**
 * Erase one guest by their E.164 phone (already normalised by the caller).
 * `confirm:false` gathers the counts and returns them, touching nothing — the
 * preview an operator sees before committing. Returns null when no such guest
 * exists (so a re-run by the original phone, now tombstoned, is a 404 — the
 * erasure is idempotent from the caller's view).
 */
export async function eraseGuestByPhone(
  db: Db,
  phone: string,
  opts: { confirm: boolean },
): Promise<EraseReport | null> {
  const guest = await getGuestByPhone(db, phone);
  if (guest === null) return null;
  const guestId = guest.id;
  const digits = phone.replace(/[^0-9]/g, '');
  const reps = [phone, digits] as const; // '+E.164' first, then bare wire digits

  const [conv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.guestId, guestId));
  const convId = conv?.id ?? null;
  const taskWhere: SQL | undefined =
    convId === null
      ? eq(tasks.guestId, guestId)
      : or(eq(tasks.guestId, guestId), eq(tasks.conversationId, convId));

  // Messages ABOUT this guest that live with conversation_id=null (so the
  // conversation_id=convId scrub never reaches them) and carry NO guest FK:
  //   - sender='system' — task/escalation/draft cards, the escalateToOps ops
  //     card, AI ON/OFF takeover replies, SLA nudges;
  //   - sender='human'  — staff INBOUND typed at the line (an `EDIT <id> <text>`
  //     naming the guest, a free-form note), stored verbatim before parsing.
  // Guard by the CONTRACT — "does this message carry the guest's IDENTITY?" — not
  // by a proxy: prior re-reviews caught a shortId-only scrub missing escalateToOps
  // + AI-toggle, and a sender='system'-only scrub missing staff inbound. Match:
  //   - literals (phone forms, task/draft shortIds): strpos substring — long,
  //     unique, no over-match, no metachar hazard;
  //   - names: the guest's firstName/lastName/waProfileName, edge-trimmed to their
  //     alphanumeric CORE and whitespace-collapsed to the rendered form, matched
  //     with a SURROUNDING-context boundary — (^|[^alnum_])core([^alnum_]|$) — so
  //     an emoji/punctuation-edged pushname ("Rahul 🙏", "🌸Anjali") still matches
  //     (a \y on the name's own non-word edge silently failed — re-review BLOCKER)
  //     while "Jo" still cannot over-match "Joseph". The pattern is a bound param.
  // 🚨 RESIDUAL, documented (header) — BEST-EFFORT string match, not a link: a
  // conversation_id=null body that refers to the guest WITHOUT their stored
  // name/phone/shortId (a name-free complaint tail, a staff paraphrase, a
  // pure-emoji/1-char name) is not attributable without a guest FK on `messages`
  // (TODO CH-18c). It carries no stored name/phone, so the residue-sweep contract
  // holds; the durable fix is a guest reference on these sends.
  const literalTokens = [
    phone,
    digits,
    ...(await db.select({ s: tasks.shortId }).from(tasks).where(taskWhere)).map((r) => r.s),
    ...(convId === null
      ? []
      : (await db.select({ s: drafts.shortId }).from(drafts).where(eq(drafts.conversationId, convId))).map(
          (r) => r.s,
        )),
  ];
  const regexEscape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Edge-trim non-alphanumerics (emoji/punctuation/space) and collapse internal
  // whitespace so the token equals the CORE of the name as writers render it.
  const nameCores = [guest.firstName, guest.lastName, guest.waProfileName]
    .filter((n): n is string => typeof n === 'string')
    .map((n) => n.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').replace(/\s+/g, ' ').trim())
    .filter((c) => c.length >= 2);
  const staffMsgWhere = and(
    sql`${messages.conversationId} is null`,
    inArray(messages.sender, ['system', 'human']),
    or(
      ...literalTokens.map((t) => sql`strpos(coalesce(${messages.body}, ''), ${t}) > 0`),
      ...nameCores.map(
        (c) =>
          sql`coalesce(${messages.body}, '') ~* ${`(^|[^[:alnum:]_])${regexEscape(c)}([^[:alnum:]_]|$)`}`,
      ),
    ),
  );

  // The guest's own inbound/status webhook rows: phone lives only inside the
  // jsonb, unindexed, so this is a text scan (bounded — low traffic per guest).
  const waRows = [
    ...(await db.execute<{ id: string; payload: unknown }>(
      sql`SELECT id, payload FROM raw_events WHERE source = 'whatsapp' AND payload::text LIKE ${'%' + digits + '%'}`,
    )),
  ];
  const [sysRow] = [
    ...(await db.execute<{ n: number }>(
      sql`SELECT count(*)::int AS n FROM raw_events WHERE source = 'system' AND payload->>'guestPhone' = ${phone}`,
    )),
  ];

  const tables: Record<string, number> = {
    guests: 1,
    conversations: convId === null ? 0 : 1,
    messages: convId === null ? 0 : await countWhere(db, messages, eq(messages.conversationId, convId)),
    guest_facts: await countWhere(db, guestFacts, eq(guestFacts.guestId, guestId)),
    guest_stays: await countWhere(db, guestStays, eq(guestStays.guestId, guestId)),
    scheduled_messages: await countWhere(db, scheduledMessages, eq(scheduledMessages.guestId, guestId)),
    drafts: convId === null ? 0 : await countWhere(db, drafts, eq(drafts.conversationId, convId)),
    tasks: await countWhere(db, tasks, taskWhere),
    conv_null_messages: await countWhere(db, messages, staffMsgWhere),
    reference_attempts: await countWhere(db, referenceAttempts, eq(referenceAttempts.phone, phone)),
    phone_windows: await countWhere(db, phoneWindows, eq(phoneWindows.phone, phone)),
    raw_events_whatsapp: waRows.length,
    raw_events_system: sysRow?.n ?? 0,
  };

  const report: EraseReport = {
    guestId,
    dryRun: !opts.confirm,
    tables,
    untouched: ['bookings_mirror', 'cost_events', 'raw_events(ezee)'],
  };
  if (!opts.confirm) return report;

  await db.transaction(async (tx) => {
    if (convId !== null) {
      await tx
        // `error` too: a failed send stores Meta's echoed error text verbatim
        // and it "can embed a guest's phone or body" (sendFailure.ts) — the
        // residue sweep scans messages.error, so leaving it is a real leak
        // (pre-merge review DEFECT).
        .update(messages)
        .set({ body: null, raw: null, waMessageId: null, mediaId: null, error: null })
        .where(eq(messages.conversationId, convId));
      await tx.update(conversations).set({ summary: null }).where(eq(conversations.id, convId));
      await tx
        .update(drafts)
        .set({
          proposedBody: ERASED,
          finalBody: sql`CASE WHEN ${drafts.finalBody} IS NULL THEN NULL ELSE ${ERASED} END`,
          contextNote: null,
        })
        .where(eq(drafts.conversationId, convId));
    }
    await deleteGuestFacts(tx, guestId);
    await deleteGuestStays(tx, guestId);
    await tx.update(scheduledMessages).set({ params: {} }).where(eq(scheduledMessages.guestId, guestId));
    await tx
      .update(scheduledMessages)
      .set({ status: 'cancelled', skipReason: 'guest_erased' })
      .where(and(eq(scheduledMessages.guestId, guestId), eq(scheduledMessages.status, 'pending')));
    await tx
      .update(tasks)
      .set({ guestId: null, conversationId: null, bookingId: null, summary: ERASED, detail: null })
      .where(taskWhere);
    await deleteReferenceAttempts(tx, phone);
    await deletePhoneWindow(tx, phone);

    // Scrub the guest's identity out of every conversation_id=null message
    // attributable to them — staff/ops sends (system) and staff inbound (human) —
    // matched by phone / name-core / task+draft shortId (see the gather block).
    await tx.update(messages).set({ body: ERASED }).where(staffMsgWhere);

    for (const row of waRows) {
      await tx
        .update(rawEvents)
        .set({ payload: redactPayload(row.payload, reps) })
        .where(eq(rawEvents.id, row.id));
    }
    // System telemetry: keep the aggregate quality history (rule/action/draftHash/
    // details), blank only the guest-identifying draft + guestPhone (telemetry.ts).
    await tx.execute(
      sql`UPDATE raw_events SET payload = payload || '{"draft":null,"guestPhone":null}'::jsonb WHERE source = 'system' AND payload->>'guestPhone' = ${phone}`,
    );

    // LAST: tombstone the identity root. Phone → a unique non-PII marker (keeps
    // the UNIQUE NOT NULL constraint and makes the guest unfindable by phone);
    // opt_out so a resurrected row could never be marketed.
    await tx
      .update(guests)
      .set({
        phone: `erased:${guestId}`,
        waProfileName: null,
        firstName: null,
        lastName: null,
        notes: null,
        optOutMarketing: true,
      })
      .where(eq(guests.id, guestId));
  });

  return report;
}
