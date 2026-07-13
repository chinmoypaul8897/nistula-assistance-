/**
 * Tolerant eZee payload types + the PII scrub choke-point (plan.md §5.2,
 * CH-10 step 2). eZee's envelope is untrustworthy by observation (docs/ezee
 * BKG-02/03): single items arrive without their array wrapper, keys are
 * omitted or '' for absent, every value is a string, and the docs' own typos
 * are real wire keys (TaxDeatil, IdentiyType, "Registration No"). Everything
 * is optional; the index signatures carry the rest into raw untouched.
 * The first LIVE payload is the authority — divergences from these doc-derived
 * shapes get recorded in progress.md + normalize.ts comments (§5.2 mandate).
 */

export interface EzeeRentalInfo {
  EffectiveDate?: string;
  Adult?: string;
  Child?: string;
  RoomID?: string; // documented on BKG-03; presence on BKG-02 polls TBC live
  RoomName?: string;
  RoomTypeCode?: string;
  RoomTypeName?: string;
  [key: string]: unknown;
}

export interface EzeeBookingTran {
  SubBookingId?: string;
  TransactionId?: string;
  Createdatetime?: string;
  Modifydatetime?: string;
  Status?: string; // 'New' | 'Modify' | 'Cancel'
  IsConfirmed?: string; // '1' | '0'
  CurrentStatus?: string; // 'Arrived', 'Checked Out', 'Cancel', 'Void', … or absent
  VoucherNo?: string;
  PackageCode?: string;
  PackageName?: string;
  RateplanCode?: string;
  RateplanName?: string;
  RoomTypeCode?: string;
  RoomTypeName?: string;
  RoomID?: string; // physical unit id = §5.4 villaId when present
  RoomName?: string;
  Start?: string; // 'yyyy-mm-dd'
  End?: string;
  ArrivalTime?: string;
  DepartureTime?: string;
  CurrencyCode?: string;
  TotalAmountAfterTax?: string;
  Salutation?: string;
  FirstName?: string;
  LastName?: string;
  Phone?: string;
  Mobile?: string;
  Email?: string;
  Source?: string;
  Comment?: string;
  RentalInfo?: EzeeRentalInfo | EzeeRentalInfo[];
  [key: string]: unknown; // TaxDeatil, Sharer, anything new — rides into raw
}

export interface EzeeReservation {
  UniqueID?: string;
  LocationId?: string;
  BookedBy?: string;
  Salutation?: string;
  FirstName?: string; // trailing/leading spaces observed ("Hae ", " Giles ")
  LastName?: string;
  Phone?: string;
  Mobile?: string;
  Email?: string;
  Source?: string;
  PaymentMethod?: string;
  IsChannelBooking?: string;
  BookingTran?: EzeeBookingTran | EzeeBookingTran[];
  [key: string]: unknown;
}

export interface EzeeCancelReservation {
  UniqueID?: string; // per-room SUFFIXED ('11241008-1') or bare
  Status?: string;
  Canceldatetime?: string;
  Remark?: string;
  VoucherNo?: string;
  [key: string]: unknown;
}

/** eZee wraps single items without the array — every list access folds here. */
export function toArray<T>(value: T | T[] | undefined | null | ''): T[] {
  if (value === undefined || value === null || value === '') return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Keys deleted from EVERY persisted eZee object (case/space-insensitive so a
 * casing drift cannot reopen the hole — fail-closed). Two groups:
 * - PCI: card fields ride BookingTran (CCLink is a base64 card link);
 *   CardHoldersName AND CardHolderName — the docs use both spellings.
 * - DPDP minimisation: IdentityNo can literally be a PAN/Aadhaar number and
 *   appears on BookingTran AND every Sharer; mirror rows are reservation-
 *   keyed, OUTSIDE CH-18's DELETE_GUEST path, so nothing downstream may ever
 *   need what we never store. Name/phone/email stay — CH-11's reference-claim
 *   verification needs them.
 */
const PII_STRIP_KEYS = new Set([
  'cclink',
  'ccno',
  'cctype',
  'ccexpirydate',
  'cardholdersname',
  'cardholdername',
  'identitytype',
  'identiytype', // the doc's own typo, verbatim on the wire
  'identitytypeid',
  'identityno',
  'expirydate', // the ID document's expiry (card expiry is ccexpirydate)
  'dateofbirth',
  'spousedateofbirth',
  'weddinganniversary',
  'registrationno', // also matches the "Registration No" spaced variant
]);

function isStripped(key: string): boolean {
  return PII_STRIP_KEYS.has(key.toLowerCase().replace(/\s+/g, ''));
}

/**
 * Deep-removes card/identity fields at every depth (Sharer[] included).
 * Applied at the client boundary right after JSON.parse, so bookings_mirror
 * raw, raw_events payloads, fixture captures and the backfill path can never
 * carry PAN/Aadhaar-class data. Pure; returns a new structure.
 */
export function scrubReservationPii<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => scrubReservationPii(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !isStripped(key))
        .map(([key, child]) => [key, scrubReservationPii(child)]),
    ) as T;
  }
  return value;
}

/**
 * Envelope → flat lists. Tolerates: missing/''/null Reservations, missing
 * branches, single-object branches. An Errors block with a non-'0' code is a
 * failure envelope (BKG-02 error table); '0' only ever appears on ACK
 * success responses.
 */
export function parseBookingsEnvelope(body: unknown): {
  reservations: EzeeReservation[];
  cancels: EzeeCancelReservation[];
  error: { code: string; message: string | null } | null;
} {
  if (body === null || typeof body !== 'object') {
    return { reservations: [], cancels: [], error: { code: 'unparseable', message: null } };
  }
  const envelope = body as {
    Reservations?: {
      Reservation?: EzeeReservation | EzeeReservation[] | '';
      CancelReservation?: EzeeCancelReservation | EzeeCancelReservation[] | '';
    } | null;
    Errors?: { ErrorCode?: string; ErrorMessage?: string };
  };
  const errorCode = envelope.Errors?.ErrorCode;
  if (errorCode !== undefined && errorCode !== '0') {
    return {
      reservations: [],
      cancels: [],
      error: { code: errorCode, message: envelope.Errors?.ErrorMessage ?? null },
    };
  }
  const reservationsBranch = envelope.Reservations ?? null;
  if (reservationsBranch === null || typeof reservationsBranch !== 'object') {
    return { reservations: [], cancels: [], error: null };
  }
  return {
    reservations: toArray(reservationsBranch.Reservation),
    cancels: toArray(reservationsBranch.CancelReservation),
    error: null,
  };
}
