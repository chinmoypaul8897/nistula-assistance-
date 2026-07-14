/**
 * Guardrail 7 — leak scan (§6.5 #7, CH-07). Runs LAST, on the FINAL outgoing
 * text: system-prompt fragments, phone numbers that are not the guest's own,
 * and internal ids must never reach a guest. On a hit the pipeline BLOCKS
 * (no regenerate — §6.5 differentiates #7) and substitutes the team line.
 *
 * Design (review decisions):
 * - 8-word shingles over the INSTRUCTION blocks [1][2][4] only — never [3]
 *   KNOWLEDGE (guest-shareable by design; shingling it blocks every correct
 *   policy answer). Approved verbatim lines (phrasebook, register exemplars,
 *   §6.6 fallbacks) are subtracted from the corpus, so using them is clean.
 * - Literal tripwires catch short, high-signal internals shingles can't see
 *   (tool names, block markers). Deliberately NOT bare "Claude" — guest-name
 *   collision.
 * - The phone scan URL-masks first (every booking link carries a 19-digit
 *   villaId that would otherwise read as digits), requires digit boundaries,
 *   and exempts ONLY the guest's own number (last-10 match handles +91/0/bare
 *   spellings). The business number is not exempt: no approved copy sends any
 *   phone number, so one in a draft is anomalous by construction.
 * - §6.5 #7's "other guests' NAMES" arm was deferred to CH-11 (Paul-approved
 *   2026-07-12). CH-11 HAS LANDED and the arm is still not needed — but for a
 *   structural reason, not an accident, so do not "finish" it without reading
 *   this. CH-11 is the first code that loads a FOREIGN guest's row (the
 *   reference claim reads a mirror row that may not be the caller's), yet no
 *   foreign name can reach a prompt, a draft or an ops card: stayView.ts drops
 *   guest_name/guest_email by construction, get_booking's payload emits neither,
 *   its refusals are byte-identical, and block [5] renders only rows already
 *   LINKED to this guest. There is nothing for a name-scan to catch.
 *   RE-POINTED: the arm becomes real when a foreign name genuinely enters —
 *   CH-12's scheduler (it creates guests from mirror `guest_name`) and CH-13's
 *   staff cards (they print a guest's first name). Decide it there.
 */
import { LEAK_SCAN_SOURCES, PHRASEBOOK, REGISTER_EXEMPLARS } from './prompt.js';

const SHINGLE_SIZE = 8;

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9₹]+/g, ' ')
    .trim()
    .split(' ')
    .filter((t) => t !== '');
}

function shinglesOf(text: string, into = new Set<string>()): Set<string> {
  const words = tokens(text);
  for (let i = 0; i + SHINGLE_SIZE <= words.length; i++) {
    into.add(words.slice(i, i + SHINGLE_SIZE).join(' '));
  }
  return into;
}

// Approved verbatim lines a clean reply may contain — subtracted from the
// corpus so the model can use them without tripping the scan.
const EXEMPT_SHINGLES = (() => {
  const exempt = new Set<string>();
  for (const line of Object.values(PHRASEBOOK)) shinglesOf(line, exempt);
  for (const line of REGISTER_EXEMPLARS) shinglesOf(line, exempt);
  return exempt;
})();

// Built once at module load from the same statics the prompt ships — zero new
// imports, prompt.ts stays a leaf (CH-06 cycle lesson).
const PROMPT_SHINGLES = (() => {
  const all = new Set<string>();
  for (const source of LEAK_SCAN_SOURCES) shinglesOf(source, all);
  for (const shingle of EXEMPT_SHINGLES) all.delete(shingle);
  return all;
})();

// Short, high-signal internals — none appears in legitimate guest prose.
// NOTE: matched LONGEST-FIRST with the hit masked out (see below), because
// `get_booking` is a substring of `get_booking_link` — a naive pass would record
// two hits for one leak and quietly inflate the weekly review.
const TRIPWIRES = [
  'get_quote',
  'get_availability',
  'get_booking_link',
  'get_booking',
  'remember_fact',
  '[SITUATION]',
  '[KNOWLEDGE]',
  '[CORRECTION]',
  '[GUEST CONTEXT]',
  '[EARLIER CONTEXT]',
  'must_escalate',
  'cache_control',
  'system prompt',
  'Anthropic',
] as const;

const URL_RE = /https?:\/\/\S+/gi;
const PHONE_CANDIDATE = /(?<![\d/])(\+?\d[\d\s\-()]{8,20}\d)(?![\d/])/g;
// A bare eZee/website villa id outside a URL is an internal-id leak (§5.4 ids
// share the 5220300… prefix); inside a booking link it is legitimate.
const BARE_VILLA_ID = /(?<!\d)5220300\d{12}(?!\d)/;
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

export interface LeakScanResult {
  ok: boolean;
  /** PII-free hit labels for telemetry/logs (the draft itself goes only to
   * the raw_events payload). */
  hits: string[];
}

/** Scans the final outgoing text. `guestPhone` is the guest's own E.164. */
export function scanForLeaks(draft: string, guestPhone: string): LeakScanResult {
  const hits: string[] = [];

  const draftShingles = shinglesOf(draft);
  for (const shingle of draftShingles) {
    if (PROMPT_SHINGLES.has(shingle)) {
      hits.push('prompt_shingle');
      break;
    }
  }

  // Longest-first, masking each hit, so a nested wire (get_booking inside
  // get_booking_link) is reported once — as the most specific name that matched.
  let lower = draft.toLowerCase();
  for (const wire of [...TRIPWIRES].sort((a, b) => b.length - a.length)) {
    const needle = wire.toLowerCase();
    if (!lower.includes(needle)) continue;
    hits.push(`tripwire:${wire}`);
    lower = lower.split(needle).join(' '.repeat(needle.length));
  }

  const masked = draft.replace(URL_RE, ' ');
  const guestLast10 = guestPhone.replace(/\D/g, '').slice(-10);
  for (const match of masked.matchAll(PHONE_CANDIDATE)) {
    const digits = (match[1] ?? '').replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) continue;
    if (guestLast10 !== '' && digits.slice(-10) === guestLast10) continue;
    hits.push('phone_number');
    break;
  }

  if (BARE_VILLA_ID.test(masked)) hits.push('villa_id');
  if (UUID_RE.test(draft)) hits.push('uuid');

  return { ok: hits.length === 0, hits };
}
