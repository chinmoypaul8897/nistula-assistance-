/**
 * The two tiny mappings from a Meta inbound message shape to our `messages`
 * columns, shared by the live intake (wa/webhook.ts) and the history import
 * (wa/history.ts) so the two can never disagree about a message's type or
 * media id — a divergence would be a subtle, hard-to-see bug (§4 message_type).
 */
import type { NewMessage } from '../db/repos.js';
import type { WaInboundMessage } from './types.js';

// §4 message_type values Meta can deliver inbound; 'template' is only ever
// written by our own sends, everything unrecognised is 'unsupported'.
const INBOUND_TYPES = new Set([
  'text',
  'image',
  'audio',
  'video',
  'document',
  'location',
  'interactive',
]);

export function mapInboundType(type: string | undefined): NewMessage['type'] {
  return type !== undefined && INBOUND_TYPES.has(type)
    ? (type as NewMessage['type'])
    : 'unsupported';
}

export function mediaIdOf(message: WaInboundMessage): string | null {
  return (
    message.image?.id ?? message.audio?.id ?? message.video?.id ?? message.document?.id ?? null
  );
}
