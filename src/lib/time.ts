/**
 * IST time helpers (plan.md §3.4: business logic in Asia/Kolkata, DB stores
 * UTC). IST is a fixed UTC+05:30 with no DST, so plain offset arithmetic is
 * exact — no timezone library needed.
 */

const IST_OFFSET_MINUTES = 330;
const MS_PER_MINUTE = 60_000;

/** Current instant; FAKE_NOW_IST (dev/test only, §3.7) overrides it when set. */
export function nowIST(): Date {
  const fake = process.env.FAKE_NOW_IST;
  if (fake !== undefined && fake.trim() !== '') return istWallClockToInstant(fake);
  return new Date();
}

/** Parses "YYYY-MM-DDTHH:mm[:ss]" as IST wall clock and returns the instant. */
export function istWallClockToInstant(wallClock: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(wallClock.trim());
  if (!m) throw new Error(`Not an IST wall-clock string (YYYY-MM-DDTHH:mm): "${wallClock}"`);
  const utcMs = Date.UTC(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    Number(m[6] ?? 0),
  );
  return new Date(utcMs - IST_OFFSET_MINUTES * MS_PER_MINUTE);
}

/** The instant of `hhmm` (e.g. "10:00") IST on the same IST calendar day as `date`. */
export function atISTHour(date: Date, hhmm: string): Date {
  const { hour, minute } = parseHHMM(hhmm);
  const p = istParts(date);
  const utcMs = Date.UTC(p.year, p.month - 1, p.day, hour, minute);
  return new Date(utcMs - IST_OFFSET_MINUTES * MS_PER_MINUTE);
}

/**
 * True when `date` falls inside the night window (IST HH:mm bounds; start is
 * inclusive, end exclusive). The window wraps midnight when start > end —
 * the default 20:00→10:00 does.
 */
export function isNightIST(date: Date, nightStart: string, nightEnd: string): boolean {
  const p = istParts(date);
  const current = p.hour * 60 + p.minute;
  const start = toMinutes(nightStart);
  const end = toMinutes(nightEnd);
  if (start === end) return false; // zero-length window — never night
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** IST calendar day as YYYY-MM-DD — the business day for daily cost/lifecycle rollups. */
export function istCalendarDay(instant: Date): string {
  const p = istParts(instant);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Human IST stamp for the prompt SITUATION block, e.g. "Saturday 11 July 2026, 3:42 pm IST". */
export function formatISTDisplay(instant: Date): string {
  const p = istParts(instant);
  const shifted = new Date(instant.getTime() + IST_OFFSET_MINUTES * MS_PER_MINUTE);
  const weekday = WEEKDAYS[shifted.getUTCDay()];
  const month = MONTHS[p.month - 1];
  const ampm = p.hour < 12 ? 'am' : 'pm';
  const hour12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  const minute = String(p.minute).padStart(2, '0');
  return `${weekday} ${p.day} ${month} ${p.year}, ${hour12}:${minute} ${ampm} IST`;
}

/**
 * Calendar-day arithmetic on a YYYY-MM-DD string. Constructed at UTC midnight on
 * both sides, so it is pure day maths — no timezone can shift it.
 *
 * WHY it lives here and takes a STRING: eZee dates are 'YYYY-MM-DD' strings end
 * to end and must never be new Date()-ed (a Date would drag a timezone in and
 * check_in could silently slide a day). Hoisted out of brain/stayView.ts in
 * CH-12 so the lifecycle scheduler shares one implementation rather than
 * growing a second — two subtly different day-shifts is exactly how a
 * pre-arrival lands on the wrong morning.
 */
export function shiftDay(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "Sunday 20 December" — a check-in day, for a lifecycle body (British, no year:
 * the stay is imminent and the year would read like a form). */
export function formatDayDisplay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/**
 * A stay's dates, British and compact: "20–22 December 2026", collapsing the
 * month when it is shared and the year when both fall in it ("30 December 2026
 * – 2 January 2027" otherwise). check_out is the departure day, stated as such —
 * we never silently subtract a night.
 */
export function formatStayDates(checkIn: string, checkOut: string): string {
  const a = new Date(`${checkIn}T00:00:00Z`);
  const b = new Date(`${checkOut}T00:00:00Z`);
  const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
  const sameMonth = sameYear && a.getUTCMonth() === b.getUTCMonth();
  const left = sameMonth
    ? `${a.getUTCDate()}`
    : `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]}${sameYear ? '' : ` ${a.getUTCFullYear()}`}`;
  const right = `${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
  return `${left}–${right}`;
}

/** IST wall-clock parts of an instant. */
function istParts(instant: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  // Shift the instant by +05:30 and read UTC fields = IST wall clock.
  const shifted = new Date(instant.getTime() + IST_OFFSET_MINUTES * MS_PER_MINUTE);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function parseHHMM(hhmm: string): { hour: number; minute: number } {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) throw new Error(`Not an HH:mm time: "${hhmm}"`);
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) throw new Error(`Not a valid HH:mm time: "${hhmm}"`);
  return { hour, minute };
}

function toMinutes(hhmm: string): number {
  const { hour, minute } = parseHHMM(hhmm);
  return hour * 60 + minute;
}
