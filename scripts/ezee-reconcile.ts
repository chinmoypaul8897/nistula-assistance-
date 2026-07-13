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
 * CLI: `pnpm ezee:reconcile [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--apply]`
 * Default range: 30 days back (to catch guests already in-house) to 120 forward.
 */
import { inArray } from 'drizzle-orm';
import { backfillBookings, type BackfillLogger } from './ezee-backfill.js';
import type { Db } from '../src/db/client.js';
import { bookingsMirror } from '../src/db/schema.js';
import type { EzeeClient } from '../src/ezee/client.js';
import { normalizeReservation } from '../src/ezee/normalize.js';

const DEFAULT_DAYS_BACK = 30;
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
}

/** Pure-ish core (injected client + db) — exported for tests. */
export async function reconcileMirror(
  deps: { db: Db; client: EzeeClient; log: BackfillLogger },
  opts: { fromDate: string; toDate: string; apply: boolean },
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
  };

  const outcome = await deps.client.fetchArrivals({
    fromDate: opts.fromDate,
    toDate: opts.toDate,
  });
  if (outcome.status !== 'ok') {
    deps.log.error({ status: outcome.status }, '[reconcile] ArrivalList failed — no conclusions');
    return base;
  }

  // Reservation numbers eZee says are arriving in this window.
  const atEzee = [
    ...new Set(
      outcome.reservations
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
  const toHydrate = [...missing, ...unlabelled];
  const out = await backfillBookings(deps, toHydrate);
  return { ...result, upserted: out.upserted, failed: out.failed };
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
): { fromDate: string; toDate: string; apply: boolean } {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i === -1 ? undefined : argv[i + 1];
  };
  return {
    fromDate: get('--from') ?? shiftDate(today, -DEFAULT_DAYS_BACK),
    toDate: get('--to') ?? shiftDate(today, DEFAULT_DAYS_FORWARD),
    apply: argv.includes('--apply'),
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
