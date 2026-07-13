/**
 * One-shot live capture (plan.md §5.2): polls Bookings ONCE and NEVER ACKs —
 * eZee keeps un-ACKed data queued, so this is safe to run anywhere, anytime,
 * and cannot steal bookings from the production poller. Two outputs:
 *  1. the observed FIELD-NAME inventory (the §5.2 "record in progress.md"
 *     mandate — the live payload is the authority over the doc mirror);
 *  2. optionally, a SCRUBBED copy written to the given path for fixture use
 *     (card/identity fields are already stripped by the client boundary;
 *     scrubFixture then handles phones/names/emails/free text).
 *
 * CLI: `pnpm ezee:capture [output.json]`
 */
import { toArray, type EzeeReservation } from '../src/ezee/types.js';
import { scrubFixture } from './fixture-scrub.js';

/** Sorted union of keys per payload section — the progress.md inventory. */
export function keyInventory(reservations: EzeeReservation[], cancels: object[]): Record<string, string[]> {
  const collect = (objects: object[]): string[] => {
    const keys = new Set<string>();
    for (const item of objects) for (const key of Object.keys(item)) keys.add(key);
    return [...keys].sort();
  };
  const trans = reservations.flatMap((r) => toArray(r.BookingTran));
  const rentals = trans.flatMap((t) => toArray(t.RentalInfo));
  return {
    reservation: collect(reservations).filter((k) => k !== 'BookingTran'),
    bookingTran: collect(trans).filter((k) => k !== 'RentalInfo' && k !== 'TaxDeatil' && k !== 'Sharer'),
    rentalInfo: collect(rentals),
    cancelReservation: collect(cancels),
  };
}

async function main(): Promise<void> {
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ quiet: true });
  const { loadConfig, ConfigError } = await import('../src/config.js');
  const config = loadConfig();
  if (config.ezeeHotelCode === undefined || config.ezeeAuthCode === undefined) {
    throw new ConfigError('EZEE_HOTEL_CODE and EZEE_AUTH_CODE are required (local .env)');
  }
  const { createEzeeClient } = await import('../src/ezee/client.js');
  const log = {
    error: (obj: Record<string, unknown>, msg?: string) => console.error(msg ?? '', JSON.stringify(obj)),
  };
  const client = createEzeeClient({
    baseUrl: config.ezeeBaseUrl,
    hotelCode: config.ezeeHotelCode,
    authCode: config.ezeeAuthCode,
    userAgent: config.ezeeUserAgent,
    log,
  });
  const outcome = await client.fetchPendingBookings();
  if (outcome.status !== 'ok') {
    console.error(`poll failed: ${JSON.stringify(outcome)}`);
    process.exit(1);
  }
  console.log(
    `queued at eZee right now: ${String(outcome.reservations.length)} reservation(s), ` +
      `${String(outcome.cancels.length)} cancel(s) — NOT ACKed (they stay queued)`,
  );
  if (outcome.reservations.length === 0 && outcome.cancels.length === 0) return;
  console.log('observed field names (live payload = the §5.2 authority):');
  console.log(JSON.stringify(keyInventory(outcome.reservations, outcome.cancels), null, 2));

  const outPath = process.argv[2];
  if (outPath !== undefined) {
    const { writeFile } = await import('node:fs/promises');
    const { scrubbed, stats } = scrubFixture(outcome.raw);
    await writeFile(outPath, `${JSON.stringify(scrubbed, null, 2)}\n`, 'utf8');
    console.log(
      `scrubbed capture written to ${outPath} ` +
        `(${String(stats.phones)} phones, ${String(stats.names)} names, ${String(stats.emails)} emails scrubbed) — `,
      'review before committing; CI greps it too',
    );
  }
}

// Direct-execution guard (kb-build convention).
if (process.argv[1]?.endsWith('ezee-capture.ts') === true) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
