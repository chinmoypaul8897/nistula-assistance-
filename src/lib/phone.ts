/**
 * Phone normalisation to E.164 (plan.md §5.2) — the single place any phone
 * string becomes canonical. Guests, staff roster, ops numbers and eZee
 * payloads all pass through here so matching is always normalised-to-
 * normalised (§3.3 roster integrity).
 */

// E.164 caps numbers at 15 digits; 8 is a pragmatic floor — anything shorter
// is a short code or noise, not a reachable guest number.
const MAX_DIGITS = 15;
const MIN_DIGITS = 8;

/** Normalises a raw phone string to E.164 (`+…`); returns null when unnormalisable. */
export function normalizePhone(raw: string): string | null {
  // §5.2 strips spaces and dashes only — anything else non-numeric is rejected,
  // not guessed at.
  const cleaned = raw.replace(/[\s-]/g, '');
  const hasPlus = cleaned.startsWith('+');
  const digits = hasPlus ? cleaned.slice(1) : cleaned;
  if (!/^\d+$/.test(digits)) return null;
  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return null;

  // An explicit "+" is already international form — trust it as given.
  if (hasPlus) return `+${digits}`;

  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;

  // Foreign number typed without its "+" — keep with "+" per §5.2.
  return `+${digits}`;
}
