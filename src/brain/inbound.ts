/**
 * Inbound-message text helpers (CH-07). The webhook stores the full Meta
 * message object in messages.raw and leaves body NULL for media — but a
 * caption IS guest-typed text (review finding: a guest photographing a leaking
 * AC with a typed caption must never be told "mind typing it?"). Both the
 * policy pass (policy.ts) and the transcript mapper (turn.ts) read through
 * these, so captions route and render identically everywhere.
 * Pure leaf: type-only imports, no runtime dependencies.
 */
import type { Message } from '../db/repos.js';

interface RawMedia {
  caption?: unknown;
}
interface RawLocation {
  latitude?: unknown;
  longitude?: unknown;
  name?: unknown;
  address?: unknown;
}
type InboundRaw = {
  image?: RawMedia;
  video?: RawMedia;
  document?: RawMedia;
  location?: RawLocation;
} | null;

function nonEmpty(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** The typed caption of a captionable media message, if any (raw.*.caption —
 * audio/voice notes carry none in the Cloud API). */
export function captionOf(message: Pick<Message, 'raw'>): string | null {
  const raw = message.raw as InboundRaw;
  return (
    nonEmpty(raw?.image?.caption) ?? nonEmpty(raw?.video?.caption) ?? nonEmpty(raw?.document?.caption)
  );
}

/** What the guest actually TYPED in a message: the body, else a media caption. */
export function guestTextOf(message: Pick<Message, 'body' | 'raw'>): string | null {
  return nonEmpty(message.body) ?? captionOf(message);
}

/** §6.7: a shared location is passed to the model as place name/coordinates. */
export function locationTextOf(message: Pick<Message, 'type' | 'raw'>): string | null {
  if (message.type !== 'location') return null;
  const loc = (message.raw as InboundRaw)?.location;
  if (typeof loc?.latitude !== 'number' || typeof loc.longitude !== 'number') return null;
  const label = [nonEmpty(loc.name), nonEmpty(loc.address)].filter((s) => s !== null).join(', ');
  const coords = `${loc.latitude}, ${loc.longitude}`;
  return (label === '' ? coords : `${label} (${coords})`).slice(0, 120);
}

/** §6.3 sanitisation for staff-facing snippets: control chars out, length cap.
 * Keeps the TAIL — the newest words carry the guest's actual ask. */
export function sanitiseTail(text: string, max = 200): string {
  // eslint-disable-next-line no-control-regex
  const clean = text.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  return clean.length <= max ? clean : `…${clean.slice(-max)}`;
}

/**
 * Marketing STOP / unsubscribe — a guest keyword (CH-15 step 3). INTENT-scoped,
 * never a bare "stop" inside a sentence: "please stop, the AC is broken" is a
 * COMPLAINT, not an unsubscribe (the CH-09 homograph lesson — a keyword that means
 * ten other things is not a signal). Matches a whole-LINE stop/unsubscribe keyword
 * (with an optional polite/qualifier tail), an explicit "stop these / stop
 * sending …", or the Hinglish "band karo" / "mat bhejo".
 */
const STOP_RES: readonly RegExp[] = [
  /^\s*(?:stop|unsubscribe|opt\s*out)\b[\s\p{P}]*(?:please|pls|now|these|all|marketing|messages?|sending|texts?)?[\s\p{P}]*$/imu,
  /\bstop\s+(?:these|this|them|sending|messaging|texting|the\s+messages?|the\s+msgs?)\b/i,
  /\bunsubscribe\b/i,
  /\bband\s+kar(?:o|do|dijiye|dena)\b/i, // "stop it" (Hinglish)
  /\bmat\s+bhej(?:o|na|iye|a)\b/i, // "don't send" (Hinglish)
];

/** True if the guest asked to stop marketing messages (unsubscribe). */
export function matchesStop(text: string): boolean {
  return STOP_RES.some((re) => re.test(text));
}

/**
 * A clear affirmative — the post-stay consent invite says "Reply YES" (CH-15
 * step 6). Only ACTED ON when scoped to a recent poststay (worker gate); the
 * lexicon stays clear-signal-only, no bare "ok" (too common). Hinglish: haan /
 * zaroor / bilkul.
 */
const AFFIRMATIVE_RE =
  /\b(?:yes|yeah|yep|yup|sure|absolutely|of\s+course|please\s+do|go\s+ahead|sounds?\s+good|haan|zaroor|bilkul)\b/i;

/** True if the guest's reply is a clear affirmative (YES to the consent invite). */
export function isAffirmative(text: string): boolean {
  return AFFIRMATIVE_RE.test(text);
}
