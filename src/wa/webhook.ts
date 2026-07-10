/**
 * Meta webhook receiver (plan.md CH-02 step 2, §2.2 hot path). GET is the
 * subscription handshake; POST verifies the signature, acks 200 fast, then
 * stores + parses tolerantly. NO thinking here (§3.4 — queue/worker arrive
 * in CH-03) and NO window-column writes (CH-03's worker owns
 * last_guest_msg_at / service_window_expires_at — CH-02 decision D2).
 */
import type { FastifyBaseLogger, FastifyPluginAsync } from 'fastify';
import type { Db } from '../db/client.js';
import {
  applyStatusUpdate,
  getOrCreateConversation,
  insertMessage,
  insertRawEvent,
  updateRawEvent,
  upsertGuestByPhone,
  type NewMessage,
} from '../db/repos.js';
import { normalizePhone } from '../lib/phone.js';
import { alertOps } from '../ops/alerts.js';
import { timingSafeStringEqual, verifySignature } from './signature.js';
import type { WaChange, WaInboundMessage, WaStatus, WaValue, WaWebhookBody } from './types.js';

export interface WaWebhookOptions {
  db: Db;
  appSecret: string;
  verifyToken: string;
}

/** Fastify plugin carrying both /webhooks/whatsapp routes; register at boot with live deps. */
export const waWebhookRoutes: FastifyPluginAsync<WaWebhookOptions> = async (app, opts) => {
  // Raw-body capture scoped to THIS plugin context only (CH-02 step 1):
  // the HMAC must run over the exact bytes Meta signed, so the JSON parser
  // is replaced by a buffer passthrough for these routes alone.
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) =>
    done(null, body),
  );

  // §3.3 "401, logged, counted" — process-lifetime counter, no DB write
  // (storing unverified payloads would hand an attacker write amplification).
  let unverifiedCount = 0;

  app.get('/webhooks/whatsapp', async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
    if (
      query['hub.mode'] === 'subscribe' &&
      token !== undefined &&
      timingSafeStringEqual(token, opts.verifyToken) &&
      challenge !== undefined
    ) {
      return reply.type('text/plain').send(challenge);
    }
    request.log.warn('webhook handshake failed — verify token mismatch');
    return reply.code(403).send();
  });

  app.post('/webhooks/whatsapp', async (request, reply) => {
    const raw = request.body as Buffer;
    const header = request.headers['x-hub-signature-256'];
    const headerValue = Array.isArray(header) ? undefined : header;
    if (!verifySignature(raw, headerValue, opts.appSecret)) {
      unverifiedCount += 1;
      request.log.warn(
        { unverifiedCount, bytes: raw.length, ip: request.ip },
        'webhook signature verification failed — payload dropped',
      );
      return reply.code(401).send();
    }
    // Ack fast (§2.2: 200 in <1s), THEN store and parse — Meta re-delivers
    // on timeout and wa_message_id dedupe makes redelivery a no-op.
    await reply.code(200).send();
    try {
      await ingest(raw, opts.db, request.log);
    } catch (error) {
      // Post-ack there is nothing to return to Meta; the raw row (when it
      // was written) carries the error per the D6 write contract.
      request.log.error({ err: error }, 'webhook ingest failed after ack');
    }
  });
};

/** One raw_events row per verified POST body, then per-entry tolerant parsing (D6). */
async function ingest(raw: Buffer, db: Db, log: FastifyBaseLogger): Promise<void> {
  let body: WaWebhookBody;
  try {
    body = JSON.parse(raw.toString('utf8')) as WaWebhookBody;
  } catch {
    await insertRawEvent(db, {
      source: 'whatsapp',
      eventType: null,
      payload: raw.toString('utf8'),
      processed: false,
      error: 'unparseable JSON body',
    });
    log.warn('webhook body was not valid JSON — stored raw, skipped');
    return;
  }

  // Array.isArray, not ?? — a malformed non-array `entry` must still land
  // in raw_events (D6 contract) rather than throwing before the insert.
  const entries = Array.isArray(body.entry) ? body.entry : [];
  const fields = [
    ...new Set(
      entries.flatMap((entry) => entry.changes ?? []).map((change) => change.field ?? 'unknown'),
    ),
  ].join(',');
  const rawEvent = await insertRawEvent(db, {
    source: 'whatsapp',
    eventType: fields === '' ? null : fields,
    payload: body,
    processed: false,
  });

  const errors: string[] = [];
  for (const [index, entry] of entries.entries()) {
    try {
      for (const change of entry.changes ?? []) {
        await handleChange(change, db, log);
      }
    } catch (error) {
      // Exception text only — never payload excerpts (§3.3 PII discipline).
      errors.push(`entry[${index}]: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  await updateRawEvent(db, rawEvent.id, {
    processed: errors.length === 0,
    error: errors.length === 0 ? null : errors.join('; '),
  });
}

async function handleChange(change: WaChange, db: Db, log: FastifyBaseLogger): Promise<void> {
  if (change.field !== 'messages') {
    // smb_message_echoes / history land in CH-14/CH-18 — until then unknown
    // fields are a tolerated, logged no-op with the payload kept raw (§5.3).
    log.info({ field: change.field }, 'webhook change field not handled yet — raw stored');
    return;
  }
  const value = change.value ?? {};
  for (const message of value.messages ?? []) {
    await handleInbound(message, value, db, log);
  }
  for (const status of value.statuses ?? []) {
    await handleStatus(status, db, log);
  }
}

async function handleInbound(
  message: WaInboundMessage,
  value: WaValue,
  db: Db,
  log: FastifyBaseLogger,
): Promise<void> {
  if (message.from === undefined || message.id === undefined) {
    log.warn({ waMessageId: message.id }, 'inbound message missing from/id — skipped, raw stored');
    return;
  }
  const phone = normalizePhone(message.from);
  if (phone === null) {
    log.warn({ waMessageId: message.id }, 'inbound phone not normalisable — skipped, raw stored');
    return;
  }
  const profileName = value.contacts?.find((c) => c.wa_id === message.from)?.profile?.name;
  const guest = await upsertGuestByPhone(db, phone, profileName);
  const conversation = await getOrCreateConversation(db, guest.id);
  const { isNew } = await insertMessage(db, {
    conversationId: conversation.id,
    waMessageId: message.id,
    direction: 'in',
    sender: 'guest',
    type: mapInboundType(message.type),
    body: message.text?.body ?? null,
    mediaId: mediaIdOf(message),
    status: 'received',
    raw: message,
  });
  if (!isNew) {
    log.info({ waMessageId: message.id }, 'duplicate delivery deduped (§3.4)');
    return;
  }
  // Ids only at info level — bodies live in Postgres, not logs (§3.3).
  log.info(
    { conversationId: conversation.id, waMessageId: message.id, type: message.type },
    'inbound message stored',
  );
}

async function handleStatus(status: WaStatus, db: Db, log: FastifyBaseLogger): Promise<void> {
  if (status.id === undefined || status.status === undefined) {
    log.warn('status entry missing id/status — skipped, raw stored');
    return;
  }
  const errorText = statusErrorText(status.errors);
  const result = await applyStatusUpdate(db, status.id, status.status, errorText);
  switch (result.outcome) {
    case 'applied':
      if (status.status === 'failed') {
        await alertOps(log, {
          kind: 'wa_status_failed',
          summary: 'outbound message failed at Meta',
          detail: { messageId: result.messageId, waMessageId: status.id, error: errorText },
        });
      }
      break;
    case 'stale':
      if (status.status === 'failed') {
        // Delivery evidence outranks failed (Meta's multi-device case, D3) —
        // keep the discarded error visible in logs; payload is in raw_events.
        log.warn(
          { waMessageId: status.id, currentStatus: result.currentStatus, error: errorText },
          'failed status discarded — delivery evidence outranks it',
        );
      } else {
        log.debug({ waMessageId: status.id, status: status.status }, 'stale/duplicate status');
      }
      break;
    case 'missing':
      // Normal, not an error: dashboard hello_world, later staff-app sends.
      log.info({ waMessageId: status.id, status: status.status }, 'status for unknown message');
      break;
    case 'unknown_status':
      log.info({ waMessageId: status.id, status: status.status }, 'unknown status string');
      break;
  }
}

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

function mapInboundType(type: string | undefined): NewMessage['type'] {
  return type !== undefined && INBOUND_TYPES.has(type)
    ? (type as NewMessage['type'])
    : 'unsupported';
}

function mediaIdOf(message: WaInboundMessage): string | null {
  return (
    message.image?.id ?? message.audio?.id ?? message.video?.id ?? message.document?.id ?? null
  );
}

function statusErrorText(errors: WaStatus['errors']): string | undefined {
  if (errors === undefined || errors.length === 0) return undefined;
  return errors
    .map((e) => {
      const details = e.error_data?.details;
      return `${e.code ?? '?'}: ${e.title ?? 'unknown'}${details === undefined ? '' : ` — ${details}`}`;
    })
    .join('; ');
}
