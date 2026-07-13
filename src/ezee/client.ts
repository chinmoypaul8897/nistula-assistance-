/**
 * eZee Connectivity API client (plan.md §5.2, CH-10 step 2) — the ONLY code
 * that talks to live.ipms247.com. Contract source: docs/ezee/04_bookings.md
 * BKG-02 (Bookings poll), BKG-04 (BookingRecdNotification ACK), BKG-03
 * (FetchSingleBooking); BKG-20 ReadBooking is broken on this property and is
 * deliberately absent. Auth rides the JSON body; the User-Agent header
 * (01_overview_auth.md: `openAPI-{vendor}`) rides every call.
 *
 * Discipline: request bodies are NEVER logged (the AuthCode lives in every
 * one); eZee errors arrive as HTTP-200 envelopes ({Errors:{ErrorCode}}), so
 * transport success ≠ success — callers get a discriminated outcome. All
 * responses pass scrubReservationPii BEFORE leaving this module, so nothing
 * downstream (mirror raw, raw_events, fixtures, backfill) can carry card or
 * identity-document data (§3.3).
 */
import { http as defaultHttp } from '../lib/http.js';
import { summarizeError } from '../lib/logger.js';
import type { AlertLogger } from '../ops/alerts.js';
import {
  parseBookingsEnvelope,
  scrubReservationPii,
  type EzeeCancelReservation,
  type EzeeReservation,
} from './types.js';

export type EzeePollOutcome =
  | { status: 'ok'; reservations: EzeeReservation[]; cancels: EzeeCancelReservation[]; raw: unknown }
  | { status: 'ezee_error'; errorCode: string; errorMessage: string | null }
  | { status: 'unreachable' };

export interface EzeeAckItem {
  /** UniqueID verbatim as delivered — including any '-N' cancel suffix. */
  bookingId: string;
  /** BKG-04 requires it (VARCHAR(20) — our 36-char uuids cannot go there);
   * we echo the reservation number: our mirror key IS their id. */
  pmsBookingId: string;
  /** eZee's OWN vocabulary ('New'|'Modify'|'Cancel') echoed verbatim, or
   * omitted when unrecognised — never our enum values. */
  status?: string;
}

export type EzeeAckOutcome =
  | { status: 'ok' }
  | { status: 'ezee_error'; errorCode: string; errorMessage: string | null }
  | { status: 'unreachable' };

export interface EzeeClientDeps {
  /** config.ezeeBaseUrl — the only origin this client can reach. */
  baseUrl: string;
  hotelCode: string;
  authCode: string;
  userAgent: string;
  log: AlertLogger;
  /** Tests inject a fake fetch wrapper (§3.5 — no live calls in tests). */
  http?: typeof defaultHttp;
}

export interface EzeeClient {
  fetchPendingBookings(): Promise<EzeePollOutcome>;
  ackBookings(items: EzeeAckItem[]): Promise<EzeeAckOutcome>;
  fetchSingleBooking(filter: { bookingId: string; guestMobileNo?: string }): Promise<EzeePollOutcome>;
}

// §5.2: 15s timeout on eZee calls (their processing is slower than the
// website's); lib/http still owns the 3-try transport retry.
const EZEE_TIMEOUT_MS = 15_000;

export function createEzeeClient(deps: EzeeClientDeps): EzeeClient {
  const httpFn = deps.http ?? defaultHttp;
  const endpoint = new URL('/pmsinterface/pms_connectivity.php', deps.baseUrl).toString();

  /** POSTs one RES_Request and returns the parsed+scrubbed body, or null on
   * transport/parse failure (already logged — a body would leak the auth). */
  async function post(requestType: string, fields: Record<string, unknown>): Promise<unknown | null> {
    const body = JSON.stringify({
      RES_Request: {
        Request_Type: requestType,
        ...fields,
        Authentication: { HotelCode: deps.hotelCode, AuthCode: deps.authCode },
      },
    });
    let response: Response;
    try {
      response = await httpFn(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'user-agent': deps.userAgent },
        body,
        timeoutMs: EZEE_TIMEOUT_MS,
      });
    } catch (error) {
      deps.log.error(
        { opsAlert: 'ezee_unreachable', requestType, err: summarizeError(error) },
        '[ezee] request threw',
      );
      return null;
    }
    if (!response.ok) {
      deps.log.error(
        { opsAlert: 'ezee_unreachable', requestType, httpStatus: response.status },
        '[ezee] non-200 response',
      );
      return null;
    }
    const parsed: unknown = await response.json().catch(() => null);
    if (parsed === null) {
      deps.log.error(
        { opsAlert: 'ezee_unreachable', requestType },
        '[ezee] unparseable response body',
      );
      return null;
    }
    // Scrub at the boundary: nothing past this line ever sees card/identity
    // fields, so no caller can forget.
    return scrubReservationPii(parsed);
  }

  function toPollOutcome(body: unknown | null): EzeePollOutcome {
    if (body === null) return { status: 'unreachable' };
    const { reservations, cancels, error } = parseBookingsEnvelope(body);
    if (error !== null) {
      if (error.code === 'unparseable') return { status: 'unreachable' };
      return { status: 'ezee_error', errorCode: error.code, errorMessage: error.message };
    }
    return { status: 'ok', reservations, cancels, raw: body };
  }

  async function fetchPendingBookings(): Promise<EzeePollOutcome> {
    return toPollOutcome(await post('Bookings', {}));
  }

  async function ackBookings(items: EzeeAckItem[]): Promise<EzeeAckOutcome> {
    // BKG-04 rejects an empty Booking list (error 117/118) — never send one.
    if (items.length === 0) return { status: 'ok' };
    const body = await post('BookingRecdNotification', {
      Bookings: {
        Booking: items.map((item) => ({
          BookingId: item.bookingId,
          PMS_BookingId: item.pmsBookingId,
          ...(item.status === undefined ? {} : { Status: item.status }),
        })),
      },
    });
    if (body === null) return { status: 'unreachable' };
    const errors = (body as { Errors?: { ErrorCode?: string; ErrorMessage?: string } }).Errors;
    // BKG-04 success = ErrorCode '0' (unlike the poll, where any Errors block
    // is a failure). A missing Errors block is unknown territory — treat as
    // failure so unACKed data stays queued (fail-closed, redelivery is safe).
    if (errors?.ErrorCode === '0') return { status: 'ok' };
    return {
      status: 'ezee_error',
      errorCode: errors?.ErrorCode ?? 'missing',
      errorMessage: errors?.ErrorMessage ?? null,
    };
  }

  async function fetchSingleBooking(filter: {
    bookingId: string;
    guestMobileNo?: string;
  }): Promise<EzeePollOutcome> {
    // BKG-03 stars BookingId as required; GuestMobileNo-only lookup is
    // undocumented — TODO(CH-11): probe live whether BookingId can be omitted.
    return toPollOutcome(
      await post('FetchSingleBooking', {
        BookingId: filter.bookingId,
        ...(filter.guestMobileNo === undefined ? {} : { GuestMobileNo: filter.guestMobileNo }),
      }),
    );
  }

  return { fetchPendingBookings, ackBookings, fetchSingleBooking };
}
