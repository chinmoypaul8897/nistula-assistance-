/**
 * CH-10 eZee client + tolerant-envelope unit tests — pure, no Postgres, no
 * live calls (§3.5): the http wrapper is a fake that records every request.
 */
import { describe, expect, it } from 'vitest';
import { createEzeeClient } from '../src/ezee/client.js';
import { parseBookingsEnvelope, scrubReservationPii, toArray } from '../src/ezee/types.js';

const AUTH_CODE = 'TEST-AUTH-CODE-NEVER-LOGGED';

interface RecordedCall {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

function makeClient(responses: unknown[], opts: { failWith?: Error; status?: number } = {}) {
  const calls: RecordedCall[] = [];
  const logLines: unknown[] = [];
  let call = 0;
  const fakeHttp = async (
    url: string,
    options: { method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number } = {},
  ): Promise<Response> => {
    calls.push({ url, ...options });
    if (opts.failWith !== undefined) throw opts.failWith;
    const body = responses[Math.min(call, responses.length - 1)];
    call += 1;
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status: opts.status ?? 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const log = {
    error: (obj: Record<string, unknown>, msg?: string) => logLines.push([obj, msg]),
  };
  const client = createEzeeClient({
    baseUrl: 'https://live.ipms247.example',
    hotelCode: '9999',
    authCode: AUTH_CODE,
    userAgent: 'openAPI-Nistula',
    log,
    http: fakeHttp as never,
  });
  return { client, calls, logLines };
}

describe('fetchPendingBookings', () => {
  it('POSTs the BKG-02 wrapper with auth block, User-Agent and 15s timeout', async () => {
    const { client, calls } = makeClient([{ Reservations: { Reservation: [] } }]);
    await client.fetchPendingBookings();
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call?.url).toBe('https://live.ipms247.example/pmsinterface/pms_connectivity.php');
    expect(call?.method).toBe('POST');
    expect(call?.headers?.['user-agent']).toBe('openAPI-Nistula');
    expect(call?.headers?.['content-type']).toBe('application/json');
    expect(call?.timeoutMs).toBe(15_000);
    const body = JSON.parse(call?.body ?? '{}') as {
      RES_Request: { Request_Type: string; Authentication: { HotelCode: string; AuthCode: string } };
    };
    expect(body.RES_Request.Request_Type).toBe('Bookings');
    expect(body.RES_Request.Authentication).toEqual({ HotelCode: '9999', AuthCode: AUTH_CODE });
  });

  it('parses both branches; missing branches fold to empty arrays', async () => {
    const { client } = makeClient([
      {
        Reservations: {
          Reservation: { UniqueID: '1001', BookingTran: { Status: 'New' } },
          CancelReservation: [{ UniqueID: '1002-1', Status: 'Cancel' }],
        },
      },
    ]);
    const outcome = await client.fetchPendingBookings();
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') return;
    expect(outcome.reservations).toHaveLength(1); // single object tolerated
    expect(outcome.cancels).toHaveLength(1);
  });

  it('an Errors envelope on HTTP 200 is ezee_error with the code', async () => {
    const { client } = makeClient([
      { Errors: { ErrorCode: '301', ErrorMessage: 'Unauthorized Request.' } },
    ]);
    const outcome = await client.fetchPendingBookings();
    expect(outcome).toEqual({
      status: 'ezee_error',
      errorCode: '301',
      errorMessage: 'Unauthorized Request.',
    });
  });

  it('a thrown fetch and an unparseable body are both unreachable', async () => {
    const thrown = makeClient([], { failWith: new Error('ECONNRESET') });
    expect(await thrown.client.fetchPendingBookings()).toEqual({ status: 'unreachable' });
    const garbage = makeClient(['not json at all {{{']);
    expect(await garbage.client.fetchPendingBookings()).toEqual({ status: 'unreachable' });
  });

  it('scrubs card/identity fields before anything leaves the client', async () => {
    const { client } = makeClient([
      {
        Reservations: {
          Reservation: [
            {
              UniqueID: '1003',
              BookingTran: [
                {
                  Status: 'New',
                  CCNo: '4111111111111111',
                  CardHoldersName: 'Test Guest',
                  IdentityNo: 'ABCDE1234F',
                  DateOfBirth: '1990-01-01',
                  Sharer: [{ FirstName: 'Sharer One', IdentityNo: 'ZZZZ9999Z' }],
                },
              ],
            },
          ],
        },
      },
    ]);
    const outcome = await client.fetchPendingBookings();
    expect(outcome.status).toBe('ok');
    const text = JSON.stringify(outcome);
    expect(text).not.toContain('4111111111111111');
    expect(text).not.toContain('ABCDE1234F');
    expect(text).not.toContain('ZZZZ9999Z');
    expect(text).not.toContain('1990-01-01');
    expect(text).toContain('Sharer One'); // names stay — CH-11 needs them
  });
});

describe('ackBookings', () => {
  it('builds the BKG-04 body — ids verbatim, Status echoed only when given', async () => {
    const { client, calls } = makeClient([
      { Success: { SuccessMsg: '2 booking(s) updated' }, Errors: { ErrorCode: '0', ErrorMessage: 'Success' } },
    ]);
    const outcome = await client.ackBookings([
      { bookingId: '11241008-1', pmsBookingId: '11241008-1', status: 'Cancel' },
      { bookingId: '1001', pmsBookingId: '1001' },
    ]);
    expect(outcome).toEqual({ status: 'ok' });
    const body = JSON.parse(calls[0]?.body ?? '{}') as {
      RES_Request: { Request_Type: string; Bookings: { Booking: Record<string, string>[] } };
    };
    expect(body.RES_Request.Request_Type).toBe('BookingRecdNotification');
    expect(body.RES_Request.Bookings.Booking).toEqual([
      { BookingId: '11241008-1', PMS_BookingId: '11241008-1', Status: 'Cancel' },
      { BookingId: '1001', PMS_BookingId: '1001' },
    ]);
  });

  it('never calls eZee with an empty list (error 117/118)', async () => {
    const { client, calls } = makeClient([{}]);
    expect(await client.ackBookings([])).toEqual({ status: 'ok' });
    expect(calls).toHaveLength(0);
  });

  it('a non-zero ErrorCode and a missing Errors block are both failures', async () => {
    const denied = makeClient([{ Errors: { ErrorCode: '301', ErrorMessage: 'Unauthorized' } }]);
    const outcome = await denied.client.ackBookings([{ bookingId: '1', pmsBookingId: '1' }]);
    expect(outcome.status).toBe('ezee_error');
    const silent = makeClient([{}]); // unknown shape → fail closed, redeliver
    const missing = await silent.client.ackBookings([{ bookingId: '1', pmsBookingId: '1' }]);
    expect(missing).toEqual({ status: 'ezee_error', errorCode: 'missing', errorMessage: null });
  });
});

describe('fetchSingleBooking', () => {
  it('sends BookingId and the optional GuestMobileNo filter', async () => {
    const { client, calls } = makeClient([{ Reservations: { Reservation: [] } }]);
    await client.fetchSingleBooking({ bookingId: '12345', guestMobileNo: '917700900404' });
    const body = JSON.parse(calls[0]?.body ?? '{}') as {
      RES_Request: { Request_Type: string; BookingId: string; GuestMobileNo: string };
    };
    expect(body.RES_Request.Request_Type).toBe('FetchSingleBooking');
    expect(body.RES_Request.BookingId).toBe('12345');
    expect(body.RES_Request.GuestMobileNo).toBe('917700900404');
  });
});

describe('secrets discipline', () => {
  it('failure log lines never contain the AuthCode', async () => {
    const { client, logLines } = makeClient([], { failWith: new Error('boom') });
    await client.fetchPendingBookings();
    await client.ackBookings([{ bookingId: '1', pmsBookingId: '1' }]);
    expect(logLines.length).toBeGreaterThan(0);
    expect(JSON.stringify(logLines)).not.toContain(AUTH_CODE);
  });
});

describe('tolerant envelope helpers', () => {
  it('toArray folds undefined, null, empty-string and single objects', () => {
    expect(toArray(undefined)).toEqual([]);
    expect(toArray(null)).toEqual([]);
    expect(toArray('')).toEqual([]);
    expect(toArray({ a: 1 })).toEqual([{ a: 1 }]);
    expect(toArray([1, 2])).toEqual([1, 2]);
  });

  it('parseBookingsEnvelope tolerates empty/absent Reservations shapes', () => {
    expect(parseBookingsEnvelope({})).toEqual({ reservations: [], cancels: [], error: null });
    expect(parseBookingsEnvelope({ Reservations: null })).toEqual({
      reservations: [],
      cancels: [],
      error: null,
    });
    expect(parseBookingsEnvelope('nonsense').error?.code).toBe('unparseable');
  });

  it('scrubReservationPii is case- and space-insensitive on strip keys', () => {
    const scrubbed = scrubReservationPii({
      CCNO: 'x',
      'Registration No': 'y',
      ccLink: 'z',
      FirstName: 'Keep Me',
      nested: [{ IdentityTypeID: 'gone', Email: 'keep@example.com' }],
    }) as Record<string, unknown>;
    expect(scrubbed).toEqual({
      FirstName: 'Keep Me',
      nested: [{ Email: 'keep@example.com' }],
    });
  });
});
