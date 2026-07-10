/**
 * CH-02 decision D3 — the monotonic status lattice. Meta delivers statuses
 * out of order, duplicated, with `delivered` skippable and a documented
 * multi-device delivered+failed case: every one of those lands here.
 */
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.js';
import { applyStatusUpdate, insertMessage } from '../src/db/repos.js';
import * as schema from '../src/db/schema.js';
import { buildWaApp, captureLog, signBody, type LogCapture } from './helpers/wa.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

let client: ReturnType<typeof postgres>;
let db: Db;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
  await db.execute(sql`TRUNCATE messages, conversations, raw_events, guests CASCADE`);
}, 30_000);

afterAll(async () => {
  await client?.end();
});

let seq = 0;
async function outboundRow(status: 'queued' | 'sent' | 'delivered' | 'failed') {
  seq += 1;
  const waMessageId = `wamid.STATUS-TEST-${String(seq).padStart(4, '0')}`;
  const { message } = await insertMessage(db, {
    conversationId: null,
    waMessageId,
    direction: 'out',
    sender: 'ai',
    type: 'text',
    body: 'status test',
    status,
  });
  if (message === null) throw new Error('test row insert failed');
  return { waMessageId, id: message.id };
}

async function statusOf(waMessageId: string) {
  const [row] = await db
    .select({ status: schema.messages.status, error: schema.messages.error })
    .from(schema.messages)
    .where(eq(schema.messages.waMessageId, waMessageId));
  return row;
}

describe('applyStatusUpdate rank lattice', () => {
  it('applies the in-order flow sent → delivered → read', async () => {
    const { waMessageId } = await outboundRow('sent');
    expect((await applyStatusUpdate(db, waMessageId, 'delivered')).outcome).toBe('applied');
    expect((await applyStatusUpdate(db, waMessageId, 'read')).outcome).toBe('applied');
    expect((await statusOf(waMessageId))?.status).toBe('read');
  });

  it('absorbs out-of-order delivery: read first, late delivered is stale', async () => {
    const { waMessageId } = await outboundRow('sent');
    expect((await applyStatusUpdate(db, waMessageId, 'read')).outcome).toBe('applied');
    const late = await applyStatusUpdate(db, waMessageId, 'delivered');
    expect(late.outcome).toBe('stale');
    expect((await statusOf(waMessageId))?.status).toBe('read');
  });

  it('absorbs duplicate deliveries (webhook retries) as stale no-ops', async () => {
    const { waMessageId } = await outboundRow('sent');
    await applyStatusUpdate(db, waMessageId, 'delivered');
    expect((await applyStatusUpdate(db, waMessageId, 'delivered')).outcome).toBe('stale');
  });

  it('applies failed after sent, recording the error (error ⇔ failed)', async () => {
    const { waMessageId } = await outboundRow('sent');
    const result = await applyStatusUpdate(db, waMessageId, 'failed', '131047: Re-engagement');
    expect(result.outcome).toBe('applied');
    expect(await statusOf(waMessageId)).toMatchObject({
      status: 'failed',
      error: '131047: Re-engagement',
    });
  });

  it("discards failed after delivered — delivery evidence outranks (Meta's multi-device case)", async () => {
    const { waMessageId } = await outboundRow('delivered');
    const result = await applyStatusUpdate(db, waMessageId, 'failed', '131026: undeliverable');
    expect(result.outcome).toBe('stale');
    expect(await statusOf(waMessageId)).toMatchObject({ status: 'delivered', error: null });
  });

  it('recovers delivered after failed and CLEARS the error', async () => {
    const { waMessageId } = await outboundRow('sent');
    await applyStatusUpdate(db, waMessageId, 'failed', '131047: window closed');
    const recovery = await applyStatusUpdate(db, waMessageId, 'delivered');
    expect(recovery.outcome).toBe('applied');
    expect(await statusOf(waMessageId)).toMatchObject({ status: 'delivered', error: null });
  });

  it('reports a status for an unknown wa id as missing (dashboard hello_world class)', async () => {
    const result = await applyStatusUpdate(db, 'wamid.NEVER-SENT-BY-US', 'delivered');
    expect(result.outcome).toBe('missing');
  });

  it('reports an unknown status string without touching anything', async () => {
    const { waMessageId } = await outboundRow('sent');
    const result = await applyStatusUpdate(db, waMessageId, 'played');
    expect(result.outcome).toBe('unknown_status');
    expect((await statusOf(waMessageId))?.status).toBe('sent');
  });

  it('never rewrites an INBOUND row even when a status cites its wa id', async () => {
    const inbound = await insertMessage(db, {
      conversationId: null,
      waMessageId: 'wamid.INBOUND-GUARD-1',
      direction: 'in',
      sender: 'guest',
      type: 'text',
      body: 'guest words',
      status: 'received',
    });
    expect(inbound.isNew).toBe(true);
    const result = await applyStatusUpdate(db, 'wamid.INBOUND-GUARD-1', 'read');
    expect(result.outcome).toBe('missing'); // direction guard filters it out entirely
    expect((await statusOf('wamid.INBOUND-GUARD-1'))?.status).toBe('received');
  });

  it("applies 'sent' onto a queued send-intent row (client crash-window heal)", async () => {
    const { waMessageId } = await outboundRow('queued');
    expect((await applyStatusUpdate(db, waMessageId, 'sent')).outcome).toBe('applied');
  });
});

describe('statuses through the webhook route', () => {
  it('mutates the matching outbound row from the status fixture', async () => {
    const { readFileSync } = await import('node:fs');
    const payload = readFileSync(
      new URL('./fixtures/wa/status-update.json', import.meta.url),
      'utf8',
    );
    const { message } = await insertMessage(db, {
      conversationId: null,
      waMessageId: 'wamid.FIXTURE-OUTBOUND-0001',
      direction: 'out',
      sender: 'ai',
      type: 'text',
      body: 'fixture outbound',
      status: 'sent',
    });
    expect(message).not.toBeNull();

    const app = await buildWaApp(db);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/webhooks/whatsapp',
        payload,
        headers: { 'content-type': 'application/json', 'x-hub-signature-256': signBody(payload) },
      });
      expect(res.statusCode).toBe(200);
      // Bounded settle: ingest runs after the ack.
      for (let i = 0; i < 200; i++) {
        const row = await statusOf('wamid.FIXTURE-OUTBOUND-0001');
        if (row?.status === 'delivered') break;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect((await statusOf('wamid.FIXTURE-OUTBOUND-0001'))?.status).toBe('delivered');
    } finally {
      await app.close();
    }
  });

  it('renders the §5.3 errors array into messages.error on failed', async () => {
    const { message } = await insertMessage(db, {
      conversationId: null,
      waMessageId: 'wamid.FIXTURE-OUTBOUND-0002',
      direction: 'out',
      sender: 'ai',
      type: 'text',
      body: 'will fail',
      status: 'sent',
    });
    expect(message).not.toBeNull();
    const payload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'e1',
          changes: [
            {
              field: 'messages',
              value: {
                statuses: [
                  {
                    id: 'wamid.FIXTURE-OUTBOUND-0002',
                    status: 'failed',
                    timestamp: '1720620300',
                    recipient_id: '917700900001',
                    errors: [
                      {
                        code: 131047,
                        title: 'Re-engagement message',
                        error_data: { details: 'Message failed: 24h window' },
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const app = await buildWaApp(db);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/webhooks/whatsapp',
        payload,
        headers: { 'content-type': 'application/json', 'x-hub-signature-256': signBody(payload) },
      });
      expect(res.statusCode).toBe(200);
      for (let i = 0; i < 200; i++) {
        const row = await statusOf('wamid.FIXTURE-OUTBOUND-0002');
        if (row?.status === 'failed') break;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(await statusOf('wamid.FIXTURE-OUTBOUND-0002')).toMatchObject({
        status: 'failed',
        error: '131047: Re-engagement message — Message failed: 24h window',
      });
    } finally {
      await app.close();
    }
  });
});

describe('failed-status alert policy (D3/D4 — alert on APPLY only)', () => {
  function failedPayload(waMessageId: string): string {
    return JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'e1',
          changes: [
            {
              field: 'messages',
              value: {
                statuses: [
                  {
                    id: waMessageId,
                    status: 'failed',
                    timestamp: '1720620400',
                    recipient_id: '917700900001',
                    errors: [{ code: 131026, title: 'Undeliverable' }],
                  },
                ],
              },
            },
          ],
        },
      ],
    });
  }

  async function postAndSettle(
    app: Awaited<ReturnType<typeof buildWaApp>>,
    payload: string,
    settled: () => boolean,
  ): Promise<void> {
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/whatsapp',
      payload,
      headers: { 'content-type': 'application/json', 'x-hub-signature-256': signBody(payload) },
    });
    expect(res.statusCode).toBe(200);
    for (let i = 0; i < 300 && !settled(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(settled()).toBe(true);
  }

  const alertLines = (capture: LogCapture) =>
    capture.lines.filter((l) => l['opsAlert'] === 'wa_status_failed');

  it('alerts ONCE on an applied failed; the webhook retry is rank-guarded silent', async () => {
    const { waMessageId } = await outboundRow('sent');
    const capture = captureLog();
    const app = await buildWaApp(db, capture);
    try {
      // First delivery: transition applies → exactly one structured alert.
      await postAndSettle(app, failedPayload(waMessageId), () => alertLines(capture).length >= 1);
      expect(alertLines(capture)[0]).toMatchObject({ errorCode: 131026, waMessageId });
      // Meta retry (same payload): rank guard absorbs it → warn, NO new alert.
      await postAndSettle(app, failedPayload(waMessageId), () =>
        capture.lines.some((l) => String(l['msg']).includes('failed status discarded')),
      );
      expect(alertLines(capture)).toHaveLength(1);
    } finally {
      await app.close();
    }
  });

  it('never alerts when delivery evidence outranks the failed (warn only)', async () => {
    const { waMessageId } = await outboundRow('delivered');
    const capture = captureLog();
    const app = await buildWaApp(db, capture);
    try {
      await postAndSettle(app, failedPayload(waMessageId), () =>
        capture.lines.some((l) => String(l['msg']).includes('failed status discarded')),
      );
      expect(alertLines(capture)).toHaveLength(0);
      expect((await statusOf(waMessageId))?.status).toBe('delivered');
    } finally {
      await app.close();
    }
  });
});
