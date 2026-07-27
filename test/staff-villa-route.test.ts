/**
 * The villa route's failure modes. Every case asserts the OUTCOME (what the
 * caller is told to do) rather than a precondition — the CH-12 lesson: a test
 * that asserts a precondition instead of the outcome will pass through the bug
 * it was written to catch.
 *
 * The shapes below are the ones BKG-03 ACTUALLY returned in 14 live probes on
 * 2026-07-17, not the ones its doc describes.
 */
import { describe, expect, it, vi } from 'vitest';
import type { EzeePollOutcome } from '../src/ezee/client.js';
import { DOOR_READ_TIMEOUT_MS, resolveDoor } from '../src/staff/villaRoute.js';

const alerts: Record<string, unknown>[] = [];
const log = {
  error: (obj: Record<string, unknown>) => {
    alerts.push(obj);
  },
  info: () => {},
};

/** One BKG-03 reservation, shaped exactly as the live probe returned it. */
const reservation = (tran: Record<string, unknown>) => ({
  UniqueID: '972',
  Source: 'Airbnb',
  BookingTran: [tran],
});

const okWith = (...reservations: unknown[]): EzeePollOutcome =>
  ({ status: 'ok', reservations, cancels: [], raw: {} }) as unknown as EzeePollOutcome;

const routeWith = (outcome: EzeePollOutcome) => {
  const fetchSingleBooking = vi.fn(async () => outcome);
  return { deps: { ezee: { fetchSingleBooking }, log }, fetchSingleBooking };
};

describe('resolveDoor — the resolved path', () => {
  it('maps a live confirmed booking to its §5.4 label (probe: 972 → Apartment 06)', async () => {
    const { deps } = routeWith(
      okWith(
        reservation({
          Status: 'New',
          IsConfirmed: '1',
          CurrentStatus: 'Confirmed Reservation',
          RoomID: '5220300000000000008',
          RoomName: '06',
        }),
      ),
    );
    expect(await resolveDoor(deps, '972')).toEqual({
      resolved: true,
      label: 'Apartment 06',
      roomId: '5220300000000000008',
    });
  });

  it('🚨 an UNRECOGNISED CurrentStatus still routes — "Confirmed Reservation" is undocumented', async () => {
    // CH-10's load-bearing finding: every real booking carries a CurrentStatus
    // that is NOT in eZee's documented list. Reading an unknown status as death
    // would refuse to route every real guest while passing every test.
    const { deps } = routeWith(
      okWith(
        reservation({
          CurrentStatus: 'Some Word eZee Invented Today',
          // CH-20: was Villa B3's id (…011). That house went 2026-07-24, so it no
          // longer maps and this test would have been proving the retirement
          // rather than the undocumented-status tolerance it exists for.
          RoomID: '5220300000000000010',
        }),
      ),
    );
    expect(await resolveDoor(deps, '900')).toMatchObject({ resolved: true, label: 'Apartment 09' });
  });

  it('🚨 a RETIRED villa RoomID does NOT resolve a door — it pages ops instead', async () => {
    // A stay in a departed house can still be read out of eZee (history exists),
    // but there is no round to send anyone to. Routing must FAIL LOUDLY rather
    // than fall back to eZee's RoomName, which would put "B3" on a staff card as
    // if it were a door we service. This is the same contract as an unmapped id
    // below — deliberately, because that is exactly what a retired id now is.
    const { deps } = routeWith(
      okWith(reservation({ CurrentStatus: 'Confirmed Reservation', RoomID: '5220300000000000011' })),
    );
    expect(await resolveDoor(deps, '900')).toMatchObject({ resolved: false });
  });

  it('falls back to RentalInfo[0].RoomID when the tran carries none', async () => {
    const { deps } = routeWith(
      okWith(
        reservation({
          CurrentStatus: 'Confirmed Reservation',
          RentalInfo: [{ RoomID: '5220300000000000015' }],
        }),
      ),
    );
    expect(await resolveDoor(deps, '901')).toMatchObject({ resolved: true, label: 'Siolim 4BHK' });
  });

  it('reads with the short timeout, not the poller’s patient 15s', async () => {
    const { deps, fetchSingleBooking } = routeWith(okWith());
    await resolveDoor(deps, '902');
    expect(fetchSingleBooking).toHaveBeenCalledWith(
      { bookingId: '902' },
      { timeoutMs: DOOR_READ_TIMEOUT_MS },
    );
  });
});

describe('resolveDoor — UNREADABLE NEVER MEANS CANCELLED (rule 1)', () => {
  it('a reservation that does not exist is not_found — an EMPTY OK, not a 503', async () => {
    // The probe's headline: 977-980 and 999999 all returned ok + reservations:[].
    // BKG-03 never returned 503 once, so keying on an error code would have
    // made this branch unreachable.
    const { deps } = routeWith(okWith());
    expect(await resolveDoor(deps, '999999')).toEqual({ resolved: false, reason: 'not_found' });
  });

  it('an eZee error envelope is unreadable — including a 503, if it ever sends one', async () => {
    const { deps } = routeWith({
      status: 'ezee_error',
      errorCode: '503',
      errorMessage: 'No Reservation Found.',
    });
    expect(await resolveDoor(deps, '970')).toEqual({ resolved: false, reason: 'unreadable' });
  });

  it('a transport failure is unreadable — eZee flaps, and that says nothing', async () => {
    const { deps } = routeWith({ status: 'unreachable' });
    expect(await resolveDoor(deps, '970')).toEqual({ resolved: false, reason: 'unreadable' });
  });

  it('NONE of the unreadable reasons is ever reported as a dead booking', async () => {
    for (const outcome of [
      okWith(),
      { status: 'unreachable' } as EzeePollOutcome,
      { status: 'ezee_error', errorCode: '503', errorMessage: null } as EzeePollOutcome,
      { status: 'ezee_error', errorCode: '301', errorMessage: null } as EzeePollOutcome,
    ]) {
      const { deps } = routeWith(outcome);
      const result = await resolveDoor(deps, '970');
      expect(result).toMatchObject({ resolved: false });
      expect(result).not.toMatchObject({ reason: 'booking_dead' });
    }
  });
});

describe('resolveDoor — A SUCCESSFUL READ IS NOT PROOF OF LIFE (rule 2)', () => {
  it.each([
    ['Cancel', '970'],
    ['Void', '969'],
    ['cancel', '971'],
  ])('refuses to route a booking eZee reports as %s, and pages ops', async (status, id) => {
    alerts.length = 0;
    const { deps } = routeWith(
      okWith(
        reservation({
          CurrentStatus: status,
          // eZee hands us the room of a dead booking without complaint — the
          // whole reason this check runs BEFORE the room is read.
          RoomID: '5220300000000000008',
          RoomName: '06',
        }),
      ),
    );
    expect(await resolveDoor(deps, id)).toEqual({ resolved: false, reason: 'booking_dead' });
    expect(alerts[0]).toMatchObject({ opsAlert: 'task_booking_dead_at_ezee', reservationNo: id });
  });

  it('pages ops because a VOID may be news to us — OQ-24: a void emits no event', async () => {
    alerts.length = 0;
    const { deps } = routeWith(
      okWith(reservation({ CurrentStatus: 'Void', RoomID: '5220300000000000010' })),
    );
    await resolveDoor(deps, '969');
    // Booking 969 is exactly this in production right now: eZee says Void, our
    // mirror still believes it is alive. This read is the only place we learn.
    expect(alerts[0]).toMatchObject({ currentStatus: 'Void' });
  });
});

describe('resolveDoor — the remaining unresolved shapes', () => {
  it('an EMPTY-STRING RoomID is no_room_yet, not a resolved blank (probe: 976)', async () => {
    const { deps } = routeWith(
      okWith(reservation({ CurrentStatus: 'Confirmed Reservation', RoomID: '', RoomName: '' })),
    );
    expect(await resolveDoor(deps, '976')).toEqual({ resolved: false, reason: 'no_room_yet' });
  });

  it('an absent RoomID is no_room_yet too — a house exists only after confirm', async () => {
    const { deps } = routeWith(okWith(reservation({ CurrentStatus: 'Confirmed Reservation' })));
    expect(await resolveDoor(deps, '977')).toEqual({ resolved: false, reason: 'no_room_yet' });
  });

  it('a multi-room reservation resolves to no single door', async () => {
    const { deps } = routeWith(
      okWith({
        UniqueID: '894',
        BookingTran: [
          { RoomID: '5220300000000000011', CurrentStatus: 'Confirmed Reservation' },
          { RoomID: '5220300000000000012', CurrentStatus: 'Confirmed Reservation' },
        ],
      }),
    );
    expect(await resolveDoor(deps, '894')).toEqual({ resolved: false, reason: 'multi_room' });
  });

  it('an unmapped RoomID pages ops and does NOT fall back to eZee’s RoomName', async () => {
    // normalize.ts falls back to RoomName because an ops-readable mirror label
    // beats nothing. Here the label ROUTES A HUMAN and is matched against the
    // roster's canonical villas — an uncanonical "07" would match no round and
    // misroute silently.
    alerts.length = 0;
    const { deps } = routeWith(
      okWith(
        reservation({
          CurrentStatus: 'Confirmed Reservation',
          RoomID: '5220300000000000099',
          RoomName: '07',
        }),
      ),
    );
    expect(await resolveDoor(deps, '905')).toEqual({ resolved: false, reason: 'unmapped_room' });
    expect(alerts[0]).toMatchObject({ opsAlert: 'task_unmapped_room_id', roomId: '5220300000000000099' });
  });

  it('never throws, whatever eZee returns — a guest’s towels must not depend on it', async () => {
    for (const outcome of [
      okWith(null),
      okWith({ UniqueID: '1', BookingTran: '' }),
      okWith({ UniqueID: '1' }),
      { status: 'unreachable' } as EzeePollOutcome,
    ]) {
      const { deps } = routeWith(outcome as EzeePollOutcome);
      await expect(resolveDoor(deps, '906')).resolves.toMatchObject({ resolved: false });
    }
  });
});
