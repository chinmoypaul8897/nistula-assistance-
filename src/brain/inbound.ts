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
