/**
 * CH-09 step 5 — POST /admin/guest-lookup (bearer + flag, §3.3). Real
 * Postgres. The 401 suite mirrors the webhook signature-gate tests: reject,
 * count, leak nothing. Phones from the CH-09 3xx decade (32x sub-band).
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { loadConfig, ConfigError } from '../src/config.js';
import { upsertGuestByPhone } from '../src/db/repos.js';
import { insertGuestFactGuarded, updateGuestPrefs } from '../src/db/guestMemory.js';
import { buildAdminApp, TEST_ADMIN_TOKEN } from './helpers/admin.js';
import { captureLog } from './helpers/wa.js';
import { buildServer, maybeRegisterAdminRoutes } from '../src/server.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

let client: ReturnType<typeof postgres>;
let db: Db;

beforeAll(async () => {
  client = postgres(TEST_URL, { max: 5, onnotice: () => {} });
  db = drizzle(client, { schema });
  await db.execute(sql`TRUNCATE guest_facts, messages, conversations, raw_events, guests CASCADE`);
}, 30_000);

afterAll(async () => {
  await client?.end();
});

const auth = { authorization: `Bearer ${TEST_ADMIN_TOKEN}` };

describe('bearer gate (§3.3: 401, logged, counted — nothing leaked)', () => {
  it.each([
    ['no header', {}],
    ['wrong scheme', { authorization: `Basic ${TEST_ADMIN_TOKEN}` }],
    ['wrong token', { authorization: 'Bearer wrong-token-wrong-token-wrong' }],
    ['empty bearer', { authorization: 'Bearer ' }],
  ])('%s → 401 with an empty body', async (_label, headers) => {
    const capture = captureLog();
    const app = await buildAdminApp(db, capture);
    const res = await app.inject({
      method: 'POST',
      url: '/admin/guest-lookup',
      headers: { ...headers, 'content-type': 'application/json' },
      payload: { phone: '+917700900320' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.body).toBe('');
    // The failure is alerted (admin_auth_failed) and the phone never logged.
    const logged = JSON.stringify(capture.lines);
    expect(logged).toContain('admin_auth_failed');
    expect(logged).not.toContain('7700900320');
    await app.close();
  });

  it('counts consecutive failures into the alert detail', async () => {
    const capture = captureLog();
    const app = await buildAdminApp(db, capture);
    for (let i = 0; i < 3; i += 1) {
      await app.inject({ method: 'POST', url: '/admin/guest-lookup', payload: {} });
    }
    const counts = capture.lines
      .filter((l) => l.opsAlert === 'admin_auth_failed')
      .map((l) => l.count);
    expect(counts).toContain(3);
    await app.close();
  });
});

describe('guest lookup', () => {
  it('unknown phone → 404 fixed body', async () => {
    const app = await buildAdminApp(db);
    const res = await app.inject({
      method: 'POST',
      url: '/admin/guest-lookup',
      headers: auth,
      payload: { phone: '+917700900329' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'not found' });
    await app.close();
  });

  it.each([
    ['garbage', 'not-a-phone'],
    ['missing', undefined],
  ])('invalid phone (%s) → 400 fixed body, input never echoed', async (_label, phone) => {
    const capture = captureLog();
    const app = await buildAdminApp(db, capture);
    const res = await app.inject({
      method: 'POST',
      url: '/admin/guest-lookup',
      headers: auth,
      payload: phone === undefined ? {} : { phone },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'invalid phone' });
    expect(JSON.stringify(capture.lines)).not.toContain('not-a-phone');
    await app.close();
  });

  it('known guest → profile + all facts (expired included) + stays stub', async () => {
    const guest = await upsertGuestByPhone(db, '+917700900321', 'Lookup Guest');
    await updateGuestPrefs(db, guest.id, { registerPref: 'formal_sir_maam', langPref: 'en' });
    await insertGuestFactGuarded(db, {
      guestId: guest.id,
      kind: 'preference',
      content: 'Loved the early check-in',
      sourceMessageId: null,
    });
    // An expired fact — the admin view includes it (the model's block [5] would not).
    await db.insert(schema.guestFacts).values({
      guestId: guest.id,
      kind: 'context',
      content: 'expired context row',
      expiresAt: new Date(Date.now() - 60_000),
    });

    const app = await buildAdminApp(db);
    // The phone arrives non-normalised — the route normalises before lookup.
    const res = await app.inject({
      method: 'POST',
      url: '/admin/guest-lookup',
      headers: auth,
      payload: { phone: '0 77009 00321' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      guest: { id: string; phone: string; registerPref: string; langPref: string };
      facts: { kind: string; content: string }[];
      stays: unknown[];
    };
    expect(body.guest).toMatchObject({
      id: guest.id,
      phone: '+917700900321',
      registerPref: 'formal_sir_maam',
      langPref: 'en',
    });
    expect(body.facts).toHaveLength(2);
    expect(body.facts.map((f) => f.content)).toContain('expired context row');
    expect(body.stays).toEqual([]); // TODO(CH-11) stub
    await app.close();
  });
});

describe('config pairing guard (boot must refuse enabled-without-token)', () => {
  const base = { NODE_ENV: 'test', PORT: '3100' };

  it('enabled without a token → ConfigError', () => {
    expect(() => loadConfig({ ...base, ADMIN_ROUTES_ENABLED: '1' })).toThrow(ConfigError);
  });

  it('enabled with a short token → ConfigError', () => {
    expect(() =>
      loadConfig({ ...base, ADMIN_ROUTES_ENABLED: '1', ADMIN_BEARER_TOKEN: 'short' }),
    ).toThrow(ConfigError);
  });

  it('enabled with a real token boots; disabled needs no token', () => {
    const ok = loadConfig({
      ...base,
      ADMIN_ROUTES_ENABLED: '1',
      ADMIN_BEARER_TOKEN: TEST_ADMIN_TOKEN,
    });
    expect(ok.adminRoutesEnabled).toBe(true);
    expect(loadConfig(base).adminRoutesEnabled).toBe(false);
  });
});

describe('admin route gating (CH-18a-1 — server-boot registration)', () => {
  it('disabled → admin routes are Fastify 404 (never registered)', async () => {
    const app = buildServer();
    const registered = await maybeRegisterAdminRoutes(app, {
      enabled: false,
      bearerToken: undefined,
      db,
      coexistence: undefined,
    });
    expect(registered).toBe(false);
    const res = await app.inject({
      method: 'POST',
      url: '/admin/delete-guest',
      payload: { phone: '+917700900338' },
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('enabled → registered and bearer-gated (401 without a token)', async () => {
    const app = buildServer();
    const registered = await maybeRegisterAdminRoutes(app, {
      enabled: true,
      bearerToken: TEST_ADMIN_TOKEN,
      db,
      coexistence: undefined,
    });
    expect(registered).toBe(true);
    const res = await app.inject({
      method: 'POST',
      url: '/admin/delete-guest',
      payload: { phone: '+917700900338' },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });
});

describe('delete-guest (CH-18a-1 DELETE_GUEST — dry-run default, confirm erases)', () => {
  it('unknown phone → 404', async () => {
    const app = await buildAdminApp(db);
    const res = await app.inject({
      method: 'POST',
      url: '/admin/delete-guest',
      headers: auth,
      payload: { phone: '+917700900339' },
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('no confirm → dry-run preview; the guest survives', async () => {
    await upsertGuestByPhone(db, '+917700900330', 'DryRun Guest');
    const app = await buildAdminApp(db);
    const res = await app.inject({
      method: 'POST',
      url: '/admin/delete-guest',
      headers: auth,
      payload: { phone: '+917700900330' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, dryRun: true });
    const look = await app.inject({
      method: 'POST',
      url: '/admin/guest-lookup',
      headers: auth,
      payload: { phone: '+917700900330' },
    });
    expect(look.statusCode).toBe(200);
    await app.close();
  });

  it('confirm erases; lookup then 404s; re-erase is 404; phone never logged', async () => {
    await upsertGuestByPhone(db, '+917700900331', 'Erase Guest');
    const capture = captureLog();
    const app = await buildAdminApp(db, capture);
    const res = await app.inject({
      method: 'POST',
      url: '/admin/delete-guest',
      headers: auth,
      payload: { phone: '+917700900331', confirm: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, dryRun: false });
    const look = await app.inject({
      method: 'POST',
      url: '/admin/guest-lookup',
      headers: auth,
      payload: { phone: '+917700900331' },
    });
    expect(look.statusCode).toBe(404);
    const again = await app.inject({
      method: 'POST',
      url: '/admin/delete-guest',
      headers: auth,
      payload: { phone: '+917700900331', confirm: true },
    });
    expect(again.statusCode).toBe(404);
    expect(JSON.stringify(capture.lines)).not.toContain('7700900331');
    await app.close();
  });
});
