/**
 * eZee history backfill (plan.md CH-10 step 5): FetchSingleBooking (BKG-03)
 * over an EXPLICIT booking-id list. LIMIT, documented: BKG-03 has no
 * date-range parameter, so "backfill a date range" is not expressible — ids
 * come from the eZee UI or front desk. Deliberately emits NO booking.*
 * events and never ACKs: lifecycle (CH-12) must not fire on history, and
 * FetchSingleBooking is on-demand — nothing is queued to acknowledge.
 *
 * CLI: `pnpm ezee:backfill <bookingId...>` (reads .env for creds/DB).
 */
import { linkStayByPhone, upsertMirrorRow } from '../src/db/bookings.js';
import type { Db } from '../src/db/client.js';
import type { EzeeClient } from '../src/ezee/client.js';
import { normalizeReservation } from '../src/ezee/normalize.js';

export interface BackfillLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
  error: (obj: Record<string, unknown>, msg?: string) => void;
}

export interface BackfillResult {
  upserted: number;
  failed: string[];
}

/** Pure-ish core (injected client + db) — exported for tests. */
export async function backfillBookings(
  deps: { db: Db; client: EzeeClient; log: BackfillLogger },
  bookingIds: string[],
): Promise<BackfillResult> {
  let upserted = 0;
  const failed: string[] = [];
  for (const bookingId of bookingIds) {
    const outcome = await deps.client.fetchSingleBooking({ bookingId });
    if (outcome.status !== 'ok' || outcome.reservations.length === 0) {
      deps.log.warn({ bookingId, status: outcome.status }, '[backfill] fetch returned nothing');
      failed.push(bookingId);
      continue;
    }
    for (const reservation of outcome.reservations) {
      const norm = normalizeReservation(reservation);
      const row = norm.row;
      if (norm.reservationNo === null || row === null) {
        deps.log.warn({ bookingId, issues: norm.issues }, '[backfill] unkeyable reservation');
        failed.push(bookingId);
        continue;
      }
      // Upsert + link only — NO sendInTx here (see the header WHY).
      await deps.db.transaction(async (tx) => {
        const result = await upsertMirrorRow(tx, row);
        if (row.guestPhone !== null) {
          await linkStayByPhone(tx, result.row.id, row.guestPhone);
        }
      });
      upserted += 1;
      deps.log.info(
        { reservationNo: norm.reservationNo, issues: norm.issues },
        '[backfill] mirrored',
      );
    }
  }
  return { upserted, failed };
}

async function main(): Promise<void> {
  const ids = process.argv.slice(2);
  if (ids.length === 0) {
    console.error('usage: pnpm ezee:backfill <bookingId...>   (BKG-03 takes ids, not date ranges)');
    process.exit(1);
  }
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
  const result = await backfillBookings({ db, client, log }, ids);
  console.log(`backfill: ${String(result.upserted)} upserted, ${String(result.failed.length)} failed`);
  if (result.failed.length > 0) console.log(`failed ids: ${result.failed.join(', ')}`);
  await closeDb();
  if (result.failed.length > 0) process.exit(2);
}

// Run only when executed directly — tests import backfillBookings without side effects.
if (process.argv[1]?.endsWith('ezee-backfill.ts') === true) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
