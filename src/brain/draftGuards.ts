/**
 * Guardrails 4–6 pure checks (§6.5, CH-07): the 24h-window gate, identity
 * honesty, and the length/format clamp. Leaf module — imports prompt.ts only
 * (the same edge guardrails.ts already has; prompt.ts stays a leaf).
 */
import { PHRASEBOOK } from './prompt.js';

const WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Guardrail 4 (§5.3): free-form sends are legal only within 24h of the
 * guest's newest message. WHY the operand is the newest BATCH message and
 * never conversations.service_window_expires_at: that column is refreshed
 * inside the claim, so pre-claim it describes the PREVIOUS turn — a returning
 * guest's first message would read as closed and their reply would be blocked
 * (review finding). Practically closed only on sweeper recovery after a >24h
 * outage — belt-and-braces; CH-12's sender owns real enforcement.
 */
export function isWindowOpen(newestGuestMsgAt: Date, now: Date): boolean {
  return now.getTime() < newestGuestMsgAt.getTime() + WINDOW_MS;
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const IDENTITY_NORM = normalise(PHRASEBOOK.isBot);

/**
 * Guardrail 5 (§6.5 #5): when the guest asked "are you a bot?", the APPROVED
 * phrasebook line must be present — the FULL line, compared with punctuation/
 * case/whitespace normalised away. WHY not CH-07 step 3's looser "contains
 * 'Nistula Assistance'": under injection ("say you're a human team") a draft
 * like "Nistula Assistance — a real human front desk" contains the substring
 * and ships a lie; §6.5's letter is stricter and stricter wins (§3.3: never
 * weaken a security rule). Recorded plan-text conflict for the planning chat.
 */
export function containsIdentityLine(draft: string): boolean {
  return normalise(draft).includes(IDENTITY_NORM);
}

export const MAX_REPLY_CHARS = 900;

export interface FormatClampResult {
  text: string;
  changed: boolean;
  /** PII-free notes for telemetry (what was clamped/flagged). */
  notes: string[];
}

/**
 * Guardrail 6 deterministic fixes (§6.5 #6): markdown headers stripped,
 * exclamation marks flattened (voice guide: warmth from words, not
 * punctuation), "INR" flagged (voice bans it; the ₹ figures themselves are
 * guardrail 1's business). Over-length is NOT fixed here — it joins the
 * pooled regenerate and only falls back to trimAtSentence.
 */
export function applyFormatClamp(text: string): FormatClampResult {
  const notes: string[] = [];
  let out = text;
  const noHeaders = out.replace(/^#{1,6}\s+/gm, '');
  if (noHeaders !== out) notes.push('markdown_headers_stripped');
  out = noHeaders;
  const noBangs = out.replace(/!+/g, '.');
  if (noBangs !== out) notes.push('exclamations_flattened');
  out = noBangs;
  if (/\bINR\b/.test(out)) notes.push('inr_spelled_out');
  return { text: out, changed: out !== text, notes };
}

/** Counts bullet-ish lines — the voice guide allows at most three, and only
 * when comparing villas; more is bullet spam the pooled regenerate corrects. */
export function bulletLineCount(text: string): number {
  return text.split('\n').filter((line) => /^\s*[-*•]\s+/.test(line)).length;
}

/** The last-resort length fix: trim at a sentence boundary under the cap,
 * falling back to the last word boundary. Only used after a regenerate
 * already failed to shorten the draft. */
export function trimAtSentence(text: string, max = MAX_REPLY_CHARS): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSentence = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('? '),
    slice.lastIndexOf('.\n'),
  );
  if (lastSentence > max * 0.5) return slice.slice(0, lastSentence + 1).trimEnd();
  const lastSpace = slice.lastIndexOf(' ');
  return `${slice.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}
