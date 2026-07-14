/**
 * eZee mirror reconcile (CH-11).
 *
 * WHY THIS EXISTS. `bookings_mirror` is fed only by the CH-10 poller, which
 * drains eZee's connectivity QUEUE — and a queue is a CHANGE FEED, not the
 * property's booking book. Nobody had ever collected it before, so it dumped a
 * backlog (62 items) and we mirrored that. NOTHING establishes that what
 * happened to be in the queue is the set of the property's real live bookings:
 * anything confirmed before connectivity was switched on, or aged out, is simply
 * not there. A guest standing in Villa B3 whose booking never entered that queue
 * would be staged a LEAD, and the AI would try to sell them the villa they are
 * standing in.
 *
 * WHAT IT DOES. BKG-05 ArrivalList lists bookings by ARRIVAL DATE — the thing
 * the queue cannot tell us. We diff that against the mirror and PRINT the gap.
 * That printout is the answer to "is our mirror complete?". With --apply, each
 * missing booking is then fetched individually via BKG-03 FetchSingleBooking and
 * written through CH-10's existing, tested backfill writer.
 *
 * WHY BKG-03 for the hydration and not ArrivalList's own payload: BKG-03 is the
 * ONLY call confirmed to return RoomID/RoomName, and that is the only source of
 * a real villa label ("Villa B3"). Polls carry none — `physical_room_label` is
 * null on all 62 production rows today, which is why the mirror currently cannot
 * tell B3 from C1, and why CH-13's task cards would be unactionable.
 *
 * SAFETY, verified in the code rather than assumed:
 * - It cannot message anyone. Booking events are emitted by the poller alone
 *   (src/ezee/poller.ts); src/db/bookings.ts does not import the job system, and
 *   backfillBookings takes no boss in its dependency set BY CONSTRUCTION. So
 *   nothing here can add to the 62 un-consumed booking.* jobs CH-12 must purge.
 * - It cannot eat the queue. Only BookingRecdNotification (BKG-04) acknowledges,
 *   and this script never calls it. Reads leave the queue untouched — plan.md
 *   §5.2 says so outright. The binding "never run the poller locally" rule is
 *   about the ACK, not about reading, so this is safe to run from a laptop.
 * - It is PRINT-ONLY unless --apply is passed.
 *
 * CLI: `pnpm ezee:reconcile [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--apply] [--refresh]`
 * Default range: 30 days back (to catch guests already in-house) to 120 forward.
 */
import { inArray } from 'drizzle-orm';
import { backfillBookings, type BackfillLogger } from './ezee-backfill.js';
import type { Db } from '../src/db/client.js';
import { bookingsMirror } from '../src/db/schema.js';
import type { EzeeClient } from '../src/ezee/client.js';
import { normalizeReservation } from '../src/ezee/normalize.js';

// 90 days back, not 30 (pre-push audit): ArrivalList filters by ARRIVAL date, so
// to catch a guest who is IN-HOUSE today their arrival must be inside the
// window — and a long stay can begin well over a month ago. 90d covers a
// generous maximum stay; a guest whose arrival predates even that is a rare
// tail the reconcile misses (recorded — a departures cross-check is the future
// fix). Forward covers the booking horizon.
const DEFAULT_DAYS_BACK = 90;
const DEFAULT_DAYS_FORWARD = 120;

export interface ReconcileResult {
  from: string;
  to: string;
  /** Reservation numbers eZee reports arriving in the range. */
  atEzee: string[];
  /** Of those, the ones we already hold. */
  inMirror: string[];
  /** Of those, the ones we do NOT hold — every one is a guest the AI would
   * currently fail to recognise. This number is the whole point of the script. */
  missing: string[];
  /** Held, in range, and still carrying no villa label — CH-13 cannot make a
   * task card for these. --apply hydrates them via BKG-03. */
  unlabelled: string[];
  applied: boolean;
  upserted: number;
  failed: string[];
  /**
   * TRUE when a slice failed and we bailed. Without this the fail-closed return
   * was byte-identical to a clean run (`missing: []`) — the summary printed an
   * all-clear and the process exited 0, which is the exact FALSE ALL-CLEAR the
   * fail-closed branch exists to prevent (close-out audit). Every consumer must
   * check this BEFORE reading `missing`.
   */
  aborted: boolean;
}

/** Pure-ish core (injected client + db) — exported for tests. */
export async function reconcileMirror(
  deps: { db: Db; client: EzeeClient; log: BackfillLogger },
  opts: { fromDate: string; toDate: string; apply: boolean; refresh?: boolean },
): Promise<ReconcileResult> {
  const base: ReconcileResult = {
    from: opts.fromDate,
    to: opts.toDate,
    atEzee: [],
    inMirror: [],
    missing: [],
    unlabelled: [],
    applied: opts.apply,
    upserted: 0,
    failed: [],
    aborted: false,
  };

  // eZee caps ArrivalList at ONE MONTH per call — an UNDOCUMENTED limit, found
  // live on the first production run:
  //     {"ErrorCode":"112","ErrorMessage":"Error: Date range is too long.
  //      Please provide dates for 1 month."}
  // Error 112 is not in BKG-05's documented error list at all, and no date cap is
  // mentioned anywhere in its docs (the same class of vendor-doc gap as
  // InsertBooking's POST + per-night rates). So we PAGE the window in slices.
  //
  // (The nested `Date{}` request shape we ship IS correct — probed live: the doc's
  // parameter TABLE lists from_date/to_date top-level, and that spelling fails
  // with "From Date is missing"; the doc's request EXAMPLE nests them, and that
  // works. Table wrong, example right.)
  const slices = monthSlices(opts.fromDate, opts.toDate);
  const reservations: unknown[] = [];
  for (const slice of slices) {
    const outcome = await deps.client.fetchArrivals(slice);
    if (outcome.status !== 'ok') {
      // FAIL CLOSED. A failed slice makes its bookings invisible to us, and an
      // invisible booking does not show up as MISSING — so a partial run reports
      // a FALSE ALL-CLEAR, which is the one direction that must never happen.
      deps.log.error(
        { status: outcome.status, slice },
        '[reconcile] ArrivalList failed on a slice — NO CONCLUSIONS for the whole range',
      );
      return { ...base, aborted: true };
    }
    reservations.push(...outcome.reservations);
    deps.log.info(
      { ...slice, found: outcome.reservations.length },
      '[reconcile] arrivals slice',
    );
  }

  // Reservation numbers eZee says are arriving in this window.
  const atEzee = [
    ...new Set(
      (reservations as Parameters<typeof normalizeReservation>[0][])
        .map((r) => normalizeReservation(r).reservationNo)
        .filter((no): no is string => no !== null),
    ),
  ];
  if (atEzee.length === 0) {
    deps.log.warn({ from: opts.fromDate, to: opts.toDate }, '[reconcile] eZee reported no arrivals');
    return { ...base, atEzee };
  }

  const held = await deps.db
    .select({
      no: bookingsMirror.ezeeReservationNo,
      label: bookingsMirror.physicalRoomLabel,
    })
    .from(bookingsMirror)
    .where(inArray(bookingsMirror.ezeeReservationNo, atEzee));

  const heldByNo = new Map(held.map((h) => [h.no, h.label]));
  const inMirror = atEzee.filter((no) => heldByNo.has(no));
  const missing = atEzee.filter((no) => !heldByNo.has(no));
  const unlabelled = inMirror.filter((no) => heldByNo.get(no) === null);

  deps.log.info(
    {
      from: opts.fromDate,
      to: opts.toDate,
      atEzee: atEzee.length,
      inMirror: inMirror.length,
      missing: missing.length,
      unlabelled: unlabelled.length,
      apply: opts.apply,
    },
    '[reconcile] mirror vs eZee',
  );
  if (missing.length > 0) {
    deps.log.warn(
      { missing },
      '[reconcile] bookings eZee holds that the mirror does NOT — the AI would not recognise these guests',
    );
  }

  const result = { ...base, atEzee, inMirror, missing, unlabelled };
  if (!opts.apply) {
    deps.log.info({}, '[reconcile] DRY RUN — nothing written. Re-run with --apply to hydrate.');
    return result;
  }

  // Hydrate the missing rows AND the label-less held ones, through CH-10's own
  // tested writer (BKG-03 per id; no events; never ACKs).
  //
  // --refresh re-fetches EVERY booking in the window, not only the ones lacking a
  // label. WHY it must exist: hydration is otherwise fill-if-null, and the poller
  // diff COALESCEs a null-from-poll so a label, once written, is never revisited
  // by anything. If eZee moves a guest from B3 to C1 (maintenance, an upgrade, an
  // overbooking shuffle) the change arrives on the queue carrying NO room
  // information at all — and we would go on telling that guest, and CH-13's staff
  // card, the OLD villa forever. Fill-once is safe only while nothing is filled.
  // (The durable fix is CH-13's enrichment job re-fetching and overwriting.)
  const toHydrate = opts.refresh === true
    ? [...new Set([...missing, ...inMirror])]
    : [...missing, ...unlabelled];
  const out = await backfillBookings(deps, toHydrate);
  return { ...result, upserted: out.upserted, failed: out.failed };
}

/** eZee rejects an ArrivalList window longer than "1 month" (undocumented error
 * 112). 28 days keeps every slice safely inside that, whatever they mean by a
 * month, at the cost of a few extra reads — and reads are free and never ACK. */
const MAX_SLICE_DAYS = 28;

/** Splits [from, to] inclusive into windows of at most MAX_SLICE_DAYS. */
export function monthSlices(
  fromDate: string,
  toDate: string,
): Array<{ fromDate: string; toDate: string }> {
  const slices: Array<{ fromDate: string; toDate: string }> = [];
  let cursor = fromDate;
  // Guard against a reversed range rather than looping forever.
  if (toDate < fromDate) return [{ fromDate, toDate }];
  while (cursor <= toDate) {
    const end = shiftDate(cursor, MAX_SLICE_DAYS - 1);
    const sliceEnd = end > toDate ? toDate : end;
    slices.push({ fromDate: cursor, toDate: sliceEnd });
    cursor = shiftDate(sliceEnd, 1);
  }
  return slices;
}

/** IST-agnostic date shift on a YYYY-MM-DD string — arrival dates are calendar
 * days at the property, so no timezone maths is wanted here. */
export function shiftDate(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function parseArgs(
  argv: string[],
  today: string,
): { fromDate: string; toDate: string; apply: boolean; refresh: boolean } {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i === -1 ? undefined : argv[i + 1];
  };
  return {
    fromDate: get('--from') ?? shiftDate(today, -DEFAULT_DAYS_BACK),
    toDate: get('--to') ?? shiftDate(today, DEFAULT_DAYS_FORWARD),
    apply: argv.includes('--apply'),
    refresh: argv.includes('--refresh'),
  };
}

async function main(): Promise<void> {
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ quiet: true });
  const { loadConfig, ConfigError } = await import('../src/config.js');
  const config = loadConfig();
  if (
    config.databaseUrl === undefined ||
    config.ezeeHotelCode === undefined ||
    config.ezeeAuthCode === undefined
  ) {
    throw new ConfigError('DATABASE_URL and EZEE_HOTEL_CODE/EZEE_AUTH_CODE are required');
  }
  const { istCalendarDay } = await import('../src/lib/time.js');
  const opts = parseArgs(process.argv.slice(2), istCalendarDay(new Date()));

  const { getDb, closeDb } = await import('../src/db/client.js');
  const { createEzeeClient } = await import('../src/ezee/client.js');
  const log: BackfillLogger = {
    info: (obj, msg) => console.log(msg ?? '', JSON.stringify(obj)),
    warn: (obj, msg) => console.warn(msg ?? '', JSON.stringify(obj)),
    error: (obj, msg) => console.error(msg ?? '', JSON.stringify(obj)),
  };
  const { db } = getDb(config.databaseUrl);
  const client = createEzeeClient({
    baseUrl: config.ezeeBaseUrl,
    hotelCode: config.ezeeHotelCode,
    authCode: config.ezeeAuthCode,
    userAgent: config.ezeeUserAgent,
    log,
  });

  const r = await reconcileMirror({ db, client, log }, opts);
  console.log('');
  if (r.aborted) {
    // NEVER print a count here. A booking inside a failed slice is invisible to
    // us, so it cannot appear as MISSING — printing "MISSING: 0" would tell the
    // operator the mirror is complete on the strength of a call that failed.
    console.log(`RANGE INCOMPLETE — eZee failed on a slice of ${r.from} → ${r.to}.`);
    console.log('NO CONCLUSIONS: the mirror has NOT been checked. Re-run before trusting it.');
    await closeDb();
    process.exit(1);
  }
  console.log(`eZee arrivals ${r.from} → ${r.to}`);
  console.log(`  at eZee        : ${String(r.atEzee.length)}`);
  console.log(`  in our mirror  : ${String(r.inMirror.length)}`);
  console.log(`  MISSING        : ${String(r.missing.length)}${r.missing.length > 0 ? `  → ${r.missing.join(', ')}` : ''}`);
  console.log(`  no villa label : ${String(r.unlabelled.length)}`);
  if (r.applied) {
    console.log(`  hydrated       : ${String(r.upserted)} upserted, ${String(r.failed.length)} failed`);
  } else {
    console.log('');
    console.log('  DRY RUN — nothing was written. Re-run with --apply to hydrate.');
  }
  await closeDb();
}

// Run only when executed directly — tests import reconcileMirror side-effect-free.
if (process.argv[1]?.endsWith('ezee-reconcile.ts') === true) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
