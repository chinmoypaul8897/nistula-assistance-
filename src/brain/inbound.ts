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
 * ten other things is not a signal). Matches a whole-LINE stop/unsubscribe/opt-out
 * keyword, an explicit marketing-scoped "stop these / stop sending offers / stop
 * your messages", "unsubscribe from …" / "opt out of …", or the Hinglish "band
 * karo" / "mat bhejo".
 *
 * 🚨 A NEGATED stop is the OPPOSITE of an opt-out (pre-merge review DEFECT):
 * "please don't stop sending me offers", "never stop sending these" are requests
 * to KEEP receiving. STOP_NEGATED short-circuits them to false. And a bare channel
 * verb ("stop messaging me here, just call me") is a channel switch, not an
 * unsubscribe — so the sending/messaging branch REQUIRES a marketing object.
 */
const STOP_NEGATED =
  /\b(?:do\s?n['’]?t|does\s?n['’]?t|please\s+do\s+not|please\s+don['’]?t|never)\s+stop\b/i;

const STOP_RES: readonly RegExp[] = [
  // The whole line is a stop / unsubscribe / opt-out keyword (+ optional tail).
  /^\s*(?:stop|unsubscribe|opt[\s-]*out)\b[\s\p{P}]*(?:please|pls|now|these|all|marketing|messages?|sending|texts?|offers?)?[\s\p{P}]*$/imu,
  // A marketing-scoped object after "stop": a deictic (these/this/them), a
  // marketing noun, or "sending/messaging/texting <marketing object>". Bare
  // "stop messaging me here" (no marketing object) deliberately does NOT match.
  /\bstop\s+(?:these|this|them|marketing|offers?|spam|(?:sending|messaging|texting)\s+(?:me\s+)?(?:these|this|them|offers?|marketing|messages?|msgs?|texts?)|(?:your|the)\s+(?:marketing|messages?|texts?|offers?|msgs?)|the\s+messages?|the\s+msgs?)\b/i,
  // "unsubscribe [from …]" / "opt out [of …]".
  /\bunsubscribe\b|\bopt[\s-]*out(?:\s+of\b|\b)/i,
  /\bband\s+kar(?:o|do|dijiye|dena)\b/i, // "stop it" (Hinglish)
  /\bmat\s+bhej(?:o|na|iye|a)\b/i, // "don't send" (Hinglish)
];

/** True if the guest asked to stop marketing messages (unsubscribe). */
export function matchesStop(text: string): boolean {
  if (STOP_NEGATED.test(text)) return false;
  return STOP_RES.some((re) => re.test(text));
}

/**
 * A clear affirmative — the post-stay consent invite says "Reply YES" (CH-15
 * step 6). CONTRACT-shaped (pre-merge review DEFECT): consent must be an actual
 * YES, so the reply must LEAD with an affirmative AND carry no negator anywhere.
 * Without that, "Absolutely not" / "Of course not" / "Not sure" — the natural
 * ways to DECLINE the invite — matched as consent. Fail-closed: any co-occurring
 * negation ("yes, no problem") yields false (a missed opt-in is far safer than a
 * false one). Only ACTED ON when scoped to a recent poststay (worker gate).
 */
const AFFIRMATIVE_LEAD_RE =
  /^\s*(?:yes|yeah|yep|yup|sure|absolutely|of\s+course|please\s+do|go\s+ahead|sounds?\s+good|haan|zaroor|bilkul)\b/im;
const NEGATOR_RE =
  /\b(?:no|not|never|nope|nah|nahi|dont|doesnt|didnt|wont|cant|wouldnt|couldnt|shouldnt|isnt|arent|wasnt)\b|\b(?:do|does|did|wo|ca|would|could|should|is|are|was)n['’]t\b/i;

/** True if the guest's reply is a clear, unnegated affirmative (YES to the invite). */
export function isAffirmative(text: string): boolean {
  if (NEGATOR_RE.test(text)) return false;
  return AFFIRMATIVE_LEAD_RE.test(text);
}
