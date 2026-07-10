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

/** Inserts a guest message aged `ageSeconds` into the past (0 = now). */
export async function seedGuestMessage(
  db: Db,
  conversationId: string,
  body: string | null,
  ageSeconds: number,
  type: NewMessage['type'] = 'text',
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
  });
  if (message === null) throw new Error('seed message conflicted — should be unreachable');
  return message;
}
