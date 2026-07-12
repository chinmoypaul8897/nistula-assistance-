/**
 * Row seeding for CH-03 worker/queue tests. Backdated created_at is how the
 * deterministic tiers simulate time — the debounce windows stay at their
 * real spec values while tests run in milliseconds (no fake timers: pg-boss
 * and the postgres driver own real sockets/timers).
 */
import type { Db } from '../../src/db/client.js';
import {
  getOrCreateConversation,
  insertMessage,
  upsertGuestByPhone,
  type Conversation,
  type Guest,
  type Message,
  type NewMessage,
} from '../../src/db/repos.js';

export async function seedConversation(
  db: Db,
  phone: string,
): Promise<{ guest: Guest; conversation: Conversation }> {
  const guest = await upsertGuestByPhone(db, phone, 'Seed Guest');
  const conversation = await getOrCreateConversation(db, guest.id);
  return { guest, conversation };
}

let seedSeq = 0;

/** Inserts a non-guest message (ai/human/system) aged into the past — shared
 * by the worker and summariser suites (CH-08 hoisted brain-worker's local). */
export async function seedOutboundMessage(
  db: Db,
  conversationId: string,
  sender: 'ai' | 'human' | 'system',
  body: string,
  ageSeconds: number,
  raw?: NewMessage['raw'],
): Promise<Message> {
  const { message } = await insertMessage(db, {
    conversationId,
    direction: 'out',
    sender,
    type: 'text',
    body,
    status: 'sent',
    createdAt: new Date(Date.now() - ageSeconds * 1000),
    raw,
  });
  if (message === null) throw new Error('seed outbound conflicted — should be unreachable');
  return message;
}

/** Inserts a guest message aged `ageSeconds` into the past (0 = now). `raw`
 * mimics the webhook's stored inbound object (captions/locations, CH-07). */
export async function seedGuestMessage(
  db: Db,
  conversationId: string,
  body: string | null,
  ageSeconds: number,
  type: NewMessage['type'] = 'text',
  raw?: NewMessage['raw'],
): Promise<Message> {
  seedSeq += 1;
  const { message } = await insertMessage(db, {
    conversationId,
    waMessageId: `wamid.SEED-${String(seedSeq).padStart(4, '0')}`,
    direction: 'in',
    sender: 'guest',
    type,
    body,
    status: 'received',
    createdAt: new Date(Date.now() - ageSeconds * 1000),
    raw,
  });
  if (message === null) throw new Error('seed message conflicted — should be unreachable');
  return message;
}
