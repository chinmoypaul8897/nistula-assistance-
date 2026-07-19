/**
 * Small text utilities shared by the ops/staff single-line senders (digest,
 * quality report, cost rollup, ops alerts). Extracted to lib/ in CH-17 so the
 * ops-alert path can reuse capUtf16 without an ops↔staff import cycle.
 */

/**
 * Trim to <= maxUnits UTF-16 CODE UNITS without splitting a surrogate pair.
 * A Meta template param (the digest `summary` slot is staffReadParam `.max(200)`)
 * is measured in UTF-16 units, so a code-point cap alone could still produce a
 * string zod rejects — an emoji-heavy summary would then silently kill the OPS
 * send (a CH-14b review DEFECT). Keep this the ONE definition (was in staff/digest).
 */
export function capUtf16(s: string, maxUnits: number): string {
  if (s.length <= maxUnits) return s;
  let end = maxUnits;
  const code = s.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) end -= 1; // don't cut a surrogate pair
  return s.slice(0, end);
}

/**
 * Make an arbitrary one-line string safe for the `staffReadParam` slot
 * (no newlines/tabs, no 4+ consecutive spaces, 1..200 UTF-16 units). WHY: an
 * alert or rollup summary that ever grew a newline would silently fail the
 * template's zod schema and reach nobody — the same class of bug capUtf16 fixes,
 * one field over. Empty in ⇒ a single dot, so `.min(1)` can never reject it.
 */
export function sanitiseTemplateParam(s: string, maxUnits = 190): string {
  const oneLine = s
    .replace(/[\n\r\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
  return capUtf16(oneLine.length === 0 ? '.' : oneLine, maxUnits);
}
