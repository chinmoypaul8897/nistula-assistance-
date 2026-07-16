/**
 * CH-12 · the 24h window at the chokepoint (§5.3) — the TODO(CH-12) that stood
 * in wa/client.ts since CH-02.
 *
 * Meta allows free-form only within 24h of the counterparty's last inbound.
 * Outside it, only an approved template. The rule binds STAFF and OPS numbers
 * exactly as it binds guests — and they have no conversation row, which is the
 * detail that makes this worth its own file. The classic version of the bug is
 * the task card that "just doesn't arrive" for the housekeeper who last messaged
 * the line on Tuesday.
 */
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/db/client.js';
import { getOrCreateConversation, upsertGuestByPhone } from '../src/db/repos.js';
import { touchPhoneWindow, windowStateFor } from '../src/db/windows.js';
import * as schema from '../src/db/schema.js';
import { createWaClient, type TemplateMode } from '../src/wa/client.js';
import { TEST_URL } from './helpers/boss.js';

let client: ReturnType<typeof postgres>;
let db: Db;

const GRAPH = 'https://graph.test.invalid/v23.0';
const PHONE_ID = '000000000000000';
const NOW = new Date('2026-07-14T12:00:00Z');

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema }) as unknown as Db;
}, 30_000);

afterAll(async () => {
  await client?.end();
});

beforeEach(async () => {
  await db.execute(sql`TRUNCATE phone_windows, messages, conversations, guests CASCADE`);
});

function makeClient(opts: {
  httpImpl?: Parameters<typeof createWaClient>[0]['httpImpl'];
  templateMode?: TemplateMode;
}) {
  const log = { error: vi.fn(), warn: vi.fn() };
  const sent: unknown[] = [];
  const wa = createWaClient({
    db,
    log,
    graphBaseUrl: GRAPH,
    phoneNumberId: PHONE_ID,
    accessToken: 'test-token-never-logged',
    templateMode: opts.templateMode,
    now: () => NOW,
    httpImpl:
      opts.httpImpl ??
      (async (_url, options) => {
        sent.push(JSON.parse(options?.body ?? '{}'));
        return new Response(JSON.stringify({ messages: [{ id: 'wamid.TPL-0001' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }),
  });
  return { wa, log, sent };
}

describe('windowStateFor — fails closed on every unknown', () => {
  it('a staff number that has never written to us has NO window', async () => {
    expect(await windowStateFor(db, { conversationId: null, phone: '+917700900901' }, NOW)).toEqual({
      open: false,
      source: 'none',
    });
  });

  it('a staff number that wrote 23h ago has an open window', async () => {
    await touchPhoneWindow(db, '+917700900901', new Date(NOW.getTime() - 23 * 3600_000));
    const state = await windowStateFor(db, { conversationId: null, phone: '+917700900901' }, NOW);
    expect(state).toEqual({ open: true, source: 'phone_window' });
  });

  it('...and 24h01m ago has a closed one', async () => {
    await touchPhoneWindow(db, '+917700900901', new Date(NOW.getTime() - 24 * 3600_000 - 60_000));
    const state = await windowStateFor(db, { conversationId: null, phone: '+917700900901' }, NOW);
    expect(state).toEqual({ open: false, source: 'phone_window' });
  });

  it('a guest conversation with no service window reads CLOSED, not open', async () => {
    const guest = await upsertGuestByPhone(db, '+917700900902', 'G');
    const convo = await getOrCreateConversation(db, guest.id);
    const state = await windowStateFor(
      db,
      { conversationId: convo.id, phone: '+917700900902' },
      NOW,
    );
    expect(state).toEqual({ open: false, source: 'conversation' });
  });
});

describe('touchPhoneWindow', () => {
  it('never moves a window BACKWARDS (webhooks arrive out of order)', async () => {
    const fresh = new Date(NOW.getTime() - 3600_000);
    await touchPhoneWindow(db, '+917700900903', fresh);
    // An old redelivery arrives afterwards; it must not shrink the live window.
    await touchPhoneWindow(db, '+917700900903', new Date(NOW.getTime() - 40 * 3600_000));
    const [row] = await db
      .select()
      .from(schema.phoneWindows)
      .where(eq(schema.phoneWindows.phone, '+917700900903'));
    expect(row?.lastInboundAt).toEqual(fresh);
  });
});

describe('sendText — refuses a closed window BEFORE the Graph call', () => {
  it('does not call Graph, writes no row, and says why', async () => {
    const { wa, log, sent } = makeClient({
      httpImpl: async () => {
        throw new Error('Graph must never be reached with a closed window');
      },
    });
    const result = await wa.sendText('+917700900904', 'out of window', {
      conversationId: null,
      sender: 'system',
    });

    expect(result).toEqual({ ok: false, messageId: null, error: 'WINDOW_CLOSED', retryable: false });
    expect(sent).toHaveLength(0);
    expect(await db.select().from(schema.messages)).toHaveLength(0);
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ opsAlert: 'window_closed_blocked' }),
      expect.stringContaining('[OPS-ALERT]'),
    );
  });

  it('sends once the counterparty has written to us', async () => {
    await touchPhoneWindow(db, '+917700900905', new Date(NOW.getTime() - 3600_000));
    const { wa, sent } = makeClient({});
    const result = await wa.sendText('+917700900905', 'in window', {
      conversationId: null,
      sender: 'system',
    });
    expect(result.ok).toBe(true);
    expect(sent).toHaveLength(1);
  });
});

describe('sendTemplated — the only way to reach a closed window', () => {
  const params = { firstName: 'Rahul', villaType: 'Nistula Villa' };

  it('uses FREE-FORM while the window is open (warmer, and free)', async () => {
    await touchPhoneWindow(db, '+917700900906', new Date(NOW.getTime() - 3600_000));
    const { wa, sent } = makeClient({ templateMode: 'send' });

    const result = await wa.sendTemplated('+917700900906', { key: 'welcome', params }, {
      conversationId: null,
      sender: 'system',
    });

    expect(result.ok).toBe(true);
    expect(result.usedTemplate).toBe(false);
    expect(sent[0]).toMatchObject({ type: 'text' });
    const [row] = await db.select().from(schema.messages);
    expect(row?.type).toBe('text');
    expect(row?.templateName).toBe('nst_welcome_v1'); // recorded even so
  });

  it('sends a real TEMPLATE into a closed window (mode=send)', async () => {
    const { wa, sent } = makeClient({ templateMode: 'send' });

    const result = await wa.sendTemplated('+917700900907', { key: 'welcome', params }, {
      conversationId: null,
      sender: 'system',
    });

    expect(result.ok).toBe(true);
    expect(result.usedTemplate).toBe(true);
    expect(sent[0]).toEqual({
      messaging_product: 'whatsapp',
      to: '+917700900907',
      type: 'template',
      template: {
        name: 'nst_welcome_v1',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Rahul' },
              { type: 'text', text: 'Nistula Villa' },
            ],
          },
        ],
      },
    });

    // The RENDERED text is on the row, not a template id — a human reading the
    // thread (and the model reading the transcript) sees what the guest got.
    const [row] = await db.select().from(schema.messages);
    expect(row?.type).toBe('template');
    expect(row?.body).toContain('your Nistula Villa is ready for you today');
    expect(row?.status).toBe('sent');
  });

  it('REFUSES a closed window in simulate mode — a free-form "template" is still free-form', async () => {
    // The honest limit of the dev test number: a simulated template is
    // physically a text message, so Meta blocks it exactly like any other
    // free-form. Only the real WABA can prove the closed-window path.
    const { wa, sent, log } = makeClient({ templateMode: 'simulate' });

    const result = await wa.sendTemplated('+917700900908', { key: 'welcome', params }, {
      conversationId: null,
      sender: 'system',
    });

    expect(result).toMatchObject({ ok: false, error: 'WINDOW_CLOSED_SIMULATED' });
    expect(sent).toHaveLength(0);
    // WARN, deliberately not an ops alert: this is the EXPECTED state for every
    // lifecycle guest on the dev test number (they have never messaged us), and
    // the sender re-attempts on a backoff — alerting here paged ops once per row
    // per tick, for ever.
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ template: 'nst_welcome_v1' }),
      expect.stringContaining('CLOSED window'),
    );
    expect(log.error).not.toHaveBeenCalled();
  });

  it('marks a simulated (open-window) send raw.devTemplate = true, with no visible prefix', async () => {
    await touchPhoneWindow(db, '+917700900909', new Date(NOW.getTime() - 3600_000));
    const { wa } = makeClient({ templateMode: 'simulate' });

    await wa.sendTemplated('+917700900909', { key: 'welcome', params }, {
      conversationId: null,
      sender: 'system',
    });

    const [row] = await db.select().from(schema.messages);
    expect(row?.raw).toMatchObject({ devTemplate: true, template: 'nst_welcome_v1' });
    expect(row?.body?.startsWith('Rahul,')).toBe(true); // the guest sees no marker
  });

  it('refuses params Meta would reject, without burning a Graph call', async () => {
    await touchPhoneWindow(db, '+917700900910', new Date(NOW.getTime() - 3600_000));
    const { wa, sent, log } = makeClient({ templateMode: 'send' });

    const result = await wa.sendTemplated(
      '+917700900910',
      { key: 'welcome', params: { firstName: 'A\nB', villaType: 'Nistula Villa' } },
      { conversationId: null, sender: 'system' },
    );

    expect(result.ok).toBe(false);
    expect(sent).toHaveLength(0);
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ opsAlert: 'wa_template_invalid' }),
      expect.stringContaining('[OPS-ALERT]'),
    );
  });
});
