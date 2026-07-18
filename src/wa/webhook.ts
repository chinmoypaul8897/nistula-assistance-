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
import { inboundTimestamp, touchPhoneWindow } from '../db/windows.js';
import { summarizeError } from '../lib/logger.js';
import { normalizePhone } from '../lib/phone.js';
import { alertOps } from '../ops/alerts.js';
import { timingSafeStringEqual, verifySignature } from './signature.js';
import type { WaChange, WaInboundMessage, WaStatus, WaValue, WaWebhookBody } from './types.js';

export interface WaWebhookOptions {
  db: Db;
  appSecret: string;
  verifyToken: string;
  /**
   * CH-03: wakes the debounced worker after a NEW guest message is stored
   * (jobs/index.ts binds it). Injected, not imported — the webhook never
   * sees queue mechanics and tests pass a recorder.
   */
  enqueue: (conversationId: string) => Promise<void>;
  /**
   * CH-13a — §3.3's "roster wins over guest". Absent ⇒ nobody is staff and
   * every inbound is a guest, which is exactly the pre-CH-13a world.
   */
  staff?: {
    isStaffPhone: (phone: string) => boolean;
    /** Wakes the staff-command worker. Same injection discipline as `enqueue`. */
    enqueueCommand: (input: { phone: string; waMessageId: string }) => Promise<void>;
  };
  /**
   * CH-14a coexistence (§5.3). Absent ⇒ `smb_message_echoes` stays a logged
   * no-op (its pre-CH-14 behaviour). `findConversation` is FIND-ONLY (a vendor
   * the front desk messaged must not grow a guest thread); `apply` runs the
   * shared takeover core (staff/humanTakeover.ts).
   */
  coexistence?: {
    findConversation: (phone: string) => Promise<{ conversationId: string } | null>;
    apply: (input: {
      conversationId: string;
      echo: { waMessageId?: string; body: string | null; raw?: unknown };
    }) => Promise<void>;
  };
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
    const raw = request.body;
    // A POST with no content-type skips Fastify's parsers entirely and
    // arrives with body undefined — that is an unverified probe, not a 500
    // (§3.3: "401, logged, counted"; anyone on the internet can send it).
    if (!Buffer.isBuffer(raw)) {
      unverifiedCount += 1;
      request.log.warn(
        { unverifiedCount, ip: request.ip },
        'webhook POST without a parseable body — dropped',
      );
      return reply.code(401).send();
    }
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
      await ingest(raw, opts.db, request.log, opts.enqueue, opts.staff, opts.coexistence);
    } catch (error) {
      // Post-ack there is nothing to return to Meta; the raw row (when it
      // was written) carries the error per the D6 write contract.
      // summarizeError: a raw DB error message embeds bound params (§3.3).
      request.log.error({ err: summarizeError(error) }, 'webhook ingest failed after ack');
    }
  });
};

type Enqueue = WaWebhookOptions['enqueue'];

/** One raw_events row per verified POST body, then per-entry tolerant parsing (D6). */
async function ingest(
  raw: Buffer,
  db: Db,
  log: FastifyBaseLogger,
  enqueue: Enqueue,
  staff: WaWebhookOptions['staff'],
  coexistence: WaWebhookOptions['coexistence'],
): Promise<void> {
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

  // Array.isArray / optional chains, not bare ?? — a malformed entry (null
  // elements, non-array changes) must still land in raw_events (D6 contract)
  // rather than throwing before the insert.
  const entries = Array.isArray(body.entry) ? body.entry : [];
  const fields = [
    ...new Set(
      entries
        .flatMap((entry) => (Array.isArray(entry?.changes) ? entry.changes : []))
        .map((change) => (typeof change?.field === 'string' ? change.field : 'unknown')),
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
        await handleChange(change, db, log, enqueue, staff, coexistence);
      }
    } catch (error) {
      // summarizeError, never error.message: drizzle's message embeds bound
      // params — guest phone and body — and this text persists (§3.3, D6).
      errors.push(`entry[${index}]: ${summarizeError(error)}`);
    }
  }
  await updateRawEvent(db, rawEvent.id, {
    processed: errors.length === 0,
    error: errors.length === 0 ? null : errors.join('; '),
  });
}

async function handleChange(
  change: WaChange,
  db: Db,
  log: FastifyBaseLogger,
  enqueue: Enqueue,
  staff: WaWebhookOptions['staff'],
  coexistence: WaWebhookOptions['coexistence'],
): Promise<void> {
  if (change.field === 'smb_message_echoes') {
    // CH-14a coexistence (§5.3). Only when wired; else a logged no-op as before.
    if (coexistence !== undefined) {
      for (const echo of change.value?.message_echoes ?? []) {
        await handleEcho(echo, db, log, staff, coexistence);
      }
    } else {
      log.info({ field: change.field }, 'echo received but coexistence unwired — raw stored');
    }
    return;
  }
  if (change.field !== 'messages') {
    // history / smb_app_state_sync land in CH-18 — until then unknown fields are
    // a tolerated, logged no-op with the payload kept raw (§5.3).
    log.info({ field: change.field }, 'webhook change field not handled yet — raw stored');
    return;
  }
  const value = change.value ?? {};
  for (const message of value.messages ?? []) {
    await handleInbound(message, value, db, log, enqueue, staff);
  }
  for (const status of value.statuses ?? []) {
    await handleStatus(status, db, log);
  }
}

/**
 * A staff-app send, echoed to us (CH-14a, §2.2 step 6). It pauses the AI on the
 * RECIPIENT's (the guest's) thread. Two skips, both load-bearing:
 *  - recipient is a roster/OPS number → the front desk messaged a colleague or a
 *    vendor; that must NEVER create or pause a guest thread.
 *  - recipient has no guest thread with prior inbound → `findConversation` is
 *    find-only and returns null; we do not conjure a conversation from an echo.
 * Fixtures are PROVISIONAL (§5.3) and this parses tolerantly — a missing/odd
 * field is a skip, never a throw (the raw payload is already stored).
 */
async function handleEcho(
  echo: NonNullable<WaValue['message_echoes']>[number],
  db: Db,
  log: FastifyBaseLogger,
  staff: WaWebhookOptions['staff'],
  coexistence: NonNullable<WaWebhookOptions['coexistence']>,
): Promise<void> {
  const to = typeof echo?.to === 'string' ? normalizePhone(echo.to) : null;
  if (to === null) {
    log.info('echo missing a normalisable recipient — skipped, raw stored');
    return;
  }
  if (staff !== undefined && staff.isStaffPhone(to)) {
    log.info('echo to a roster/ops number — ignored (not a guest thread)');
    return;
  }
  const conv = await coexistence.findConversation(to);
  if (conv === null) {
    log.info('echo recipient has no guest thread with prior inbound — ignored');
    return;
  }
  await coexistence.apply({
    conversationId: conv.conversationId,
    echo: {
      waMessageId: typeof echo?.id === 'string' ? echo.id : undefined,
      body: echo?.text?.body ?? null,
      raw: echo,
    },
  });
  log.info({ conversationId: conv.conversationId }, 'human echo — AI paused (coexistence)');
}

/**
 * A message FROM a roster or ops number (CH-13a, plan §8 CH-13 step 3).
 *
 * It is STORED — plan step 3's "unknown text from staff numbers → stored,
 * never AI-processed" — and storing it through the same `insertMessage` buys
 * the `wa_message_id` dedupe for free. That matters more than it looks: Meta
 * redelivers, and `DONE A3F2K9` arriving twice must close one task once and
 * message the guest once. This is the FIRST of the two guards; the second is
 * the guarded UPDATE in db/tasks.ts, which covers a genuine race rather than a
 * replay.
 *
 * The row carries `conversation_id: null` (§4 — a staff number is not a guest
 * conversation) and `sender: 'human'` (a real person typed it).
 *
 * The command is only ENQUEUED here. Parsing, closing a task and messaging a
 * guest are fallible work, and this path runs AFTER the 200 ack on a delivery
 * Meta never repeats — so a throw here would lose the DONE for ever. The
 * worker is the retry-safe place (CH-03 D2; the same reasoning that moved
 * CH-11's linking out of the webhook).
 */
async function handleStaffInbound(
  message: WaInboundMessage,
  phone: string,
  db: Db,
  log: FastifyBaseLogger,
  staff: NonNullable<WaWebhookOptions['staff']>,
): Promise<void> {
  const waMessageId = message.id;
  if (waMessageId === undefined) return;
  const { isNew } = await insertMessage(db, {
    conversationId: null,
    waMessageId,
    direction: 'in',
    sender: 'human',
    type: mapInboundType(message.type),
    body: message.text?.body ?? null,
    mediaId: mediaIdOf(message),
    status: 'received',
    raw: message,
  });
  if (!isNew) {
    log.info({ waMessageId }, 'duplicate staff delivery deduped (§3.4)');
    return;
  }
  // Ids only — never the body (§3.3). The roster-wins fact is logged because
  // §3.3 asks for it: a staff member who is also a guest silently losing their
  // AI thread is exactly the kind of thing an operator must be able to find.
  log.info({ waMessageId }, 'inbound from a staff/ops number — roster wins (§3.3), AI not engaged');
  try {
    await staff.enqueueCommand({ phone, waMessageId });
  } catch (error) {
    // Same posture as the guest enqueue: the message IS stored, and a failed
    // wake must not mark the raw event failed.
    log.warn({ waMessageId, err: summarizeError(error) }, 'staff command enqueue failed');
  }
}

async function handleInbound(
  message: WaInboundMessage,
  value: WaValue,
  db: Db,
  log: FastifyBaseLogger,
  enqueue: Enqueue,
  staff: WaWebhookOptions['staff'],
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
  // CH-12 (§5.3): EVERY inbound opens a 24h window, whoever sent it. Guests keep
  // theirs on the conversation, but staff and ops numbers have no conversation
  // at all — and Meta's window binds them identically. Written before the dedupe
  // check on purpose: a redelivery is still evidence that they wrote to us, and
  // touchPhoneWindow never moves a window backwards.
  // Meta's OWN timestamp, not our receipt time. Meta retries webhooks for hours
  // after an outage, so stamping now() would re-open a window Meta itself closed
  // — and the next free-form send would take a 131047 we inflicted on ourselves.
  // It is also what makes touchPhoneWindow's greatest() guard mean anything.
  await touchPhoneWindow(db, phone, inboundTimestamp(message.timestamp));

  // CH-13a — §3.3: "If a roster member is also a guest, roster wins (their
  // number never gets an AI conversation) and it's logged." Placed HERE
  // deliberately: after the window write (a staff member who writes to us has
  // opened their own 24h window, and their next task card depends on it) and
  // BEFORE the guest upsert, so no roster number ever grows a conversation or
  // wakes the brain.
  if (staff !== undefined && staff.isStaffPhone(phone)) {
    await handleStaffInbound(message, phone, db, log, staff);
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
  // CH-03: wake the debounced worker — only for NEW rows (a replay past the
  // isNew guard never reaches here). Failure is log-and-continue: the
  // message IS stored, the sweeper is the recovery net, and an enqueue
  // error must not mark the raw event failed.
  try {
    await enqueue(conversation.id);
  } catch (error) {
    log.warn(
      { conversationId: conversation.id, err: summarizeError(error) },
      'conversation enqueue failed — sweeper will recover',
    );
  }
}

async function handleStatus(status: WaStatus, db: Db, log: FastifyBaseLogger): Promise<void> {
  if (status.id === undefined || status.status === undefined) {
    log.warn('status entry missing id/status — skipped, raw stored');
    return;
  }
  const errorText = statusErrorText(status.errors);
  // Structured code/title for logs (D4 — CH-17 keys off errorCode); the free
  // text incl. Meta's error_data.details goes ONLY to messages.error.
  const firstError = status.errors?.[0];
  const result = await applyStatusUpdate(db, status.id, status.status, errorText);
  switch (result.outcome) {
    case 'applied':
      if (status.status === 'failed') {
        await alertOps(log, {
          kind: 'wa_status_failed',
          summary: 'outbound message failed at Meta',
          detail: {
            messageId: result.messageId,
            conversationId: result.conversationId,
            waMessageId: status.id,
            errorCode: firstError?.code,
            errorTitle: firstError?.title,
          },
        });
      }
      break;
    case 'stale':
      if (status.status === 'failed') {
        // Delivery evidence outranks failed (Meta's multi-device case, D3) —
        // keep the discard visible in logs; full payload is in raw_events.
        log.warn(
          {
            waMessageId: status.id,
            currentStatus: result.currentStatus,
            errorCode: firstError?.code,
            errorTitle: firstError?.title,
          },
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
