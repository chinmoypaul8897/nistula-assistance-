/**
 * Reference-claim verification (plan.md §6.4 get_booking, CH-11).
 *
 * §6.4: "the guest must STATE the full booking name AND check-in date (or the
 * booking email) — matched against the mirror in code; the WhatsApp profile
 * name is NEVER used for matching."
 *
 * THE TRAP THIS MODULE EXISTS TO AVOID. The obvious build is a tool taking
 * `{reference, name, check_in, email}` and comparing those to the mirror. But
 * tool arguments are authored by the MODEL, not the guest — and block [5] prints
 * the WhatsApp profile name into the very same prompt. That name is typed by the
 * sender into their own phone's settings: it is attacker-chosen. A helpful model
 * asked "check booking 953" will fill `name` from the line we just showed it, and
 * no code could tell the difference. §6.4's hardest privacy rule would degrade
 * from a mechanism into a polite request.
 *
 * SO THE CHECK RUNS THE OTHER WAY. The tool takes ONE model-authored argument —
 * the reservation number (which is exactly §6.4's own signature). Everything
 * secret is taken from OUR stored record and looked for in the words the GUEST
 * ACTUALLY TYPED this turn. The model's only job is to point at a row; it can
 * never supply a secret, because there is no field for one.
 *
 * Pure and DB-free — the caller does the single-row read and the linking.
 */

/** What we hold for the claimed reservation. Every field may be absent: eZee
 * and the OTAs are inconsistent, and a booking with no stored name must NEVER
 * pass on "blank matches blank" — the exact bug shape this repo has shipped
 * three times. Each path below therefore requires its own field to EXIST. */
export interface ClaimRecord {
  guestName: string | null;
  guestEmail: string | null;
  checkIn: string | null;
}

/**
 * Bounds on the guest's own text before it may corroborate anything. Without
 * these, a stranger could paste a dictionary — 200 names and 60 dates in one
 * message, then "booking 953" — and our stored name and date would both "appear
 * in the guest's text" by sheer coverage. A claim is a sentence, not a corpus.
 */
export const CLAIM_TEXT_MAX_CHARS = 600;
export const CLAIM_MAX_DATES = 2;
export const CLAIM_MAX_EMAILS = 2;
/** A one-token stored name ("Rahul") is too weak to be a secret, so the name
 * path is unavailable for it and only the email path can verify. Fail closed. */
const MIN_NAME_TOKENS = 2;

export type ClaimFailure =
  | 'not_stated'
  | 'text_unbounded'
  | 'no_verifiable_field'
  | 'mismatch';

export type ClaimVerdict = { ok: true; via: 'email' | 'name_and_date' } | { ok: false; reason: ClaimFailure };

/** Lowercase, strip diacritics and punctuation, collapse whitespace.
 * The combining range is written as \u escapes on purpose: raw bytes here have
 * corrupted this repo's files three times (CH-07/08/09 all hit it). */
export function normaliseClaimText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9@.\s/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Did the guest actually type this reservation number? If not, the MODEL made
 * it up — refuse, but do not punish the guest, and do not let the model spend
 * its tool rounds walking through reservation numbers. */
export function referenceWasStated(reference: string, guestText: string): boolean {
  const ref = normaliseClaimText(reference);
  if (ref === '') return false;
  const escaped = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, 'i').test(
    normaliseClaimText(guestText),
  );
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

type ClaimDate = { day: number; month: number; year?: number };

/** Match the whole text with `re`, collect via `emit`, and BLANK the matched
 * span ONLY when `emit` actually consumed a date (returned true) — a match whose
 * "month" word is not a real month ("arriving 26") must be LEFT INTACT, or it
 * would eat the "26" that a following numeric date needs. WHY blank at all: an
 * ISO "2026-06-08" would otherwise also match the numeric "06-08" pattern as a
 * SECOND {6,8} date — a phantom that pushes an honest two-date message over the
 * dictionary-attack cap and refuses it (pre-push audit). */
function consume(text: string, re: RegExp, emit: (m: RegExpExecArray) => boolean): string {
  return text.replace(re, (...args) => {
    const full = String(args[0]);
    const consumed = emit(args.slice(0, -2) as unknown as RegExpExecArray);
    return consumed ? ' '.repeat(full.length) : full;
  });
}

const RANGE_SEP = String.raw`\s*(?:-|–|—|to|through|till|until)\s*`;

/**
 * Every date the guest typed, as {day, month, year?}. Day-first only for numeric
 * forms — "05/08" is 5 August, never 8 May (accepting both orders would let ONE
 * typed date match TWO stored dates). Day RANGES ("26-28 August", "26 to 28
 * Aug") emit BOTH endpoints against the shared month, so an honest guest stating
 * their stay as a range verifies (pre-push audit DEFECT).
 */
export function extractClaimDates(text: string): ClaimDate[] {
  const found: ClaimDate[] = [];
  const push = (d: ClaimDate): void => {
    found.push(d);
  };
  let t = text.toLowerCase();

  // ISO first (and masked), so its month/day never re-enters as a numeric date.
  t = consume(t, /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, (m) => {
    push({ year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) });
    return true;
  });
  // Day range + month name: "26-28 August 2026", "26 to 28 Aug".
  t = consume(
    t,
    new RegExp(
      String.raw`\b(\d{1,2})(?:st|nd|rd|th)?${RANGE_SEP}(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?(?:\s+(\d{2,4}))?\b`,
      'gi',
    ),
    (m) => {
      const month = monthOf(m[3]);
      if (month === undefined) return false;
      const year = m[4] === undefined ? undefined : normaliseYear(Number(m[4]));
      push({ day: Number(m[1]), month, ...(year === undefined ? {} : { year }) });
      push({ day: Number(m[2]), month, ...(year === undefined ? {} : { year }) });
      return true;
    },
  );
  // Month name + day range: "August 26-28".
  t = consume(
    t,
    new RegExp(
      String.raw`\b([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?${RANGE_SEP}(\d{1,2})(?:st|nd|rd|th)?\b`,
      'gi',
    ),
    (m) => {
      const month = monthOf(m[1]);
      if (month === undefined) return false;
      push({ day: Number(m[2]), month });
      push({ day: Number(m[3]), month });
      return true;
    },
  );
  // Single "26 Aug", "26th August 2026".
  t = consume(t, /\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?(?:\s+(\d{2,4}))?\b/gi, (m) => {
    const month = monthOf(m[2]);
    if (month === undefined) return false;
    const year = m[3] === undefined ? undefined : normaliseYear(Number(m[3]));
    push({ day: Number(m[1]), month, ...(year === undefined ? {} : { year }) });
    return true;
  });
  // Single "Aug 26", "August 26th".
  t = consume(t, /\b([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{2,4}))?\b/gi, (m) => {
    const month = monthOf(m[1]);
    if (month === undefined) return false;
    const year = m[3] === undefined ? undefined : normaliseYear(Number(m[3]));
    push({ day: Number(m[2]), month, ...(year === undefined ? {} : { year }) });
    return true;
  });
  // Numeric "26/08/2026", "26-8-26" — day first, always. LAST, so month-name and
  // ISO forms have already been consumed.
  consume(t, /\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/g, (m) => {
    const year = m[3] === undefined ? undefined : normaliseYear(Number(m[3]));
    push({ day: Number(m[1]), month: Number(m[2]), ...(year === undefined ? {} : { year }) });
    return true;
  });

  return found.filter((d) => d.day >= 1 && d.day <= 31 && d.month >= 1 && d.month <= 12);
}

function monthOf(name: string | undefined): number | undefined {
  const n = (name ?? '').toLowerCase();
  return MONTHS[n.slice(0, 4)] ?? MONTHS[n.slice(0, 3)];
}

function normaliseYear(year: number): number {
  return year < 100 ? 2000 + year : year;
}

/** Does the stored check-in appear among the dates the guest typed? A guest who
 * omits the year is taken at their word on day+month — they are corroborating a
 * booking we already hold, not selecting one. */
function checkInStated(checkIn: string, guestText: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(checkIn);
  if (m === null) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return extractClaimDates(guestText).some(
    (d) => d.day === day && d.month === month && (d.year === undefined || d.year === year),
  );
}

/** Every token of the stored name must appear as a WORD in the guest's text —
 * "the full booking name", robust to reordering and to "Mr" being dropped. */
function nameStated(storedName: string, guestText: string): boolean {
  const tokens = normaliseClaimText(storedName)
    .split(' ')
    .filter((t) => t.length >= 2);
  if (tokens.length < MIN_NAME_TOKENS) return false;
  const haystack = ` ${normaliseClaimText(guestText)} `;
  return tokens.every((token) => haystack.includes(` ${token} `));
}

function emailStated(storedEmail: string, guestText: string): boolean {
  const stored = storedEmail.trim().toLowerCase();
  if (stored === '') return false;
  const typed = (guestText.toLowerCase().match(EMAIL_RE) ?? []).map((e) => e.trim());
  return typed.includes(stored);
}

/**
 * The gate. Corroborates OUR record against the GUEST'S OWN typed words.
 *
 * Every field is compared before the verdict is formed (no early return on the
 * first mismatch) so the work does not vary with which half was wrong — and the
 * caller collapses every failure to ONE frozen value anyway, because a
 * "wrong name" that reads differently from "no such booking" tells an attacker
 * which reservation numbers are real and which half they still need.
 */
export function verifyClaim(record: ClaimRecord, guestText: string): ClaimVerdict {
  const dates = extractClaimDates(guestText);
  const emails = guestText.match(EMAIL_RE) ?? [];
  if (
    guestText.length > CLAIM_TEXT_MAX_CHARS ||
    dates.length > CLAIM_MAX_DATES ||
    emails.length > CLAIM_MAX_EMAILS
  ) {
    return { ok: false, reason: 'text_unbounded' };
  }

  const hasName = record.guestName !== null && record.guestName.trim() !== '';
  const hasEmail = record.guestEmail !== null && record.guestEmail.trim() !== '';
  const hasCheckIn = record.checkIn !== null;
  if (!hasEmail && !(hasName && hasCheckIn)) {
    // We hold nothing that could be a secret — no claim can ever verify against
    // this row, and it must not pass by default.
    return { ok: false, reason: 'no_verifiable_field' };
  }

  const byEmail = hasEmail && emailStated(record.guestEmail as string, guestText);
  const byName =
    hasName &&
    hasCheckIn &&
    nameStated(record.guestName as string, guestText) &&
    checkInStated(record.checkIn as string, guestText);

  if (byEmail) return { ok: true, via: 'email' };
  if (byName) return { ok: true, via: 'name_and_date' };
  return { ok: false, reason: 'mismatch' };
}
