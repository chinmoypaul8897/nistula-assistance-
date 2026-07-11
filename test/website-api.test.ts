/**
 * Website price client (plan.md §5.1, CH-05 step 3). Pure — runs with Postgres
 * down; the http wrapper is injected so no live preview is ever called (§3.5).
 * Proves the error map (incl. the two subtleties: 200+available:false and 409
 * both → unavailable; meetsRequirement:false → min_nights not an error), the
 * 60s cache, and the concurrency-1 + 350ms spacer.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createWebsiteClient } from '../src/brain/tools/websiteApi.js';

const BASE = 'https://website.test.invalid';
const QUOTE: Parameters<ReturnType<typeof createWebsiteClient>['getQuote']>[0] = {
  villaId: '5220300000000000011',
  checkIn: '2026-12-20',
  checkOut: '2026-12-22',
  adults: 4,
  children: 0,
  plan: 'ep',
};

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`./fixtures/website/${name}.json`, import.meta.url), 'utf8'));
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/** A fake http that returns a queue of responses (or throws) and records URLs. */
function fakeHttp(responses: (Response | Error)[]) {
  const urls: string[] = [];
  const http = (async (url: string) => {
    urls.push(url);
    const next = responses.shift();
    if (next === undefined) throw new Error('fakeHttp: no more responses');
    if (next instanceof Error) throw next;
    return next;
  }) as unknown as Parameters<typeof createWebsiteClient>[0]['http'];
  return { http, urls };
}

const log = { error: vi.fn() };

describe('getQuote — outcome mapping', () => {
  it('200 available:true meets → ok with the verbatim QuoteView', async () => {
    const { http } = fakeHttp([jsonResponse(fixture('quote-ok'))]);
    const client = createWebsiteClient({ baseUrl: BASE, log, http });
    const outcome = await client.getQuote(QUOTE);
    expect(outcome.status).toBe('ok');
    if (outcome.status === 'ok') {
      expect(outcome.quote.total).toBe(34000);
      expect(outcome.quote.averagePerNight).toBe(17000);
      expect(outcome.quote.perNight).toHaveLength(2);
    }
  });

  it('200 meetsRequirement:false → min_nights (a REAL quote, not an error)', async () => {
    const { http } = fakeHttp([jsonResponse(fixture('quote-min-nights'))]);
    const client = createWebsiteClient({ baseUrl: BASE, log, http });
    const outcome = await client.getQuote(QUOTE);
    expect(outcome.status).toBe('min_nights');
    if (outcome.status === 'min_nights') expect(outcome.quote.minNights.meetsRequirement).toBe(false);
  });

  it('200 available:false AND 409 both → unavailable', async () => {
    const a = createWebsiteClient({
      baseUrl: BASE,
      log,
      http: fakeHttp([jsonResponse(fixture('quote-available-false'))]).http,
    });
    expect((await a.getQuote(QUOTE)).status).toBe('unavailable');

    const b = createWebsiteClient({
      baseUrl: BASE,
      log,
      http: fakeHttp([jsonResponse({ ok: false, kind: 'unavailable' }, 409)]).http,
    });
    expect((await b.getQuote(QUOTE)).status).toBe('unavailable');
  });

  it('400/404 → invalid; 404 raises a villa_map_drift alert', async () => {
    const drift = { error: vi.fn() };
    const c404 = createWebsiteClient({
      baseUrl: BASE,
      log: drift,
      http: fakeHttp([jsonResponse({ ok: false, kind: 'input' }, 404)]).http,
    });
    expect((await c404.getQuote(QUOTE)).status).toBe('invalid');
    expect(drift.error).toHaveBeenCalledWith(
      expect.objectContaining({ opsAlert: 'villa_map_drift' }),
      expect.any(String),
    );

    const c400 = createWebsiteClient({
      baseUrl: BASE,
      log,
      http: fakeHttp([jsonResponse({ ok: false, kind: 'validation' }, 400)]).http,
    });
    expect((await c400.getQuote(QUOTE)).status).toBe('invalid');
  });

  it('429/502/network-throw → upstream_down (retryAfterMs when present)', async () => {
    const c429 = createWebsiteClient({
      baseUrl: BASE,
      log,
      http: fakeHttp([jsonResponse({ ok: false, kind: 'rate_limit', retryAfterMs: 5000 }, 429)]).http,
    });
    const r = await c429.getQuote(QUOTE);
    expect(r.status).toBe('upstream_down');
    if (r.status === 'upstream_down') expect(r.retryAfterMs).toBe(5000);

    const c502 = createWebsiteClient({
      baseUrl: BASE,
      log,
      http: fakeHttp([jsonResponse({ ok: false, kind: 'upstream' }, 502)]).http,
    });
    expect((await c502.getQuote(QUOTE)).status).toBe('upstream_down');

    const cThrow = createWebsiteClient({
      baseUrl: BASE,
      log,
      http: fakeHttp([new Error('ECONNRESET')]).http,
    });
    expect((await cThrow.getQuote(QUOTE)).status).toBe('upstream_down');
  });

  it('builds the /api/quote URL from the base + params (origin allowlist)', async () => {
    const fake = fakeHttp([jsonResponse(fixture('quote-ok'))]);
    const client = createWebsiteClient({ baseUrl: BASE, log, http: fake.http });
    await client.getQuote(QUOTE);
    const url = new URL(fake.urls[0] ?? '');
    expect(url.origin).toBe('https://website.test.invalid');
    expect(url.pathname).toBe('/api/quote');
    expect(url.searchParams.get('villaId')).toBe('5220300000000000011');
    expect(url.searchParams.get('plan')).toBe('ep');
  });
});

describe('getQuote — cache', () => {
  it('caches a success for 60s but never an unavailable/error', async () => {
    let clock = 0;
    const okBody = fixture('quote-ok');
    const fake = fakeHttp([jsonResponse(okBody), jsonResponse(okBody)]);
    const client = createWebsiteClient({ baseUrl: BASE, log, http: fake.http, now: () => clock });

    await client.getQuote(QUOTE);
    await client.getQuote(QUOTE); // within TTL → served from cache
    expect(fake.urls).toHaveLength(1);

    clock = 61_000; // past the 60s TTL
    await client.getQuote(QUOTE);
    expect(fake.urls).toHaveLength(2);
  });

  it('re-hits http for an unavailable (never cached) and on bypassCache', async () => {
    const clock = 0;
    const fake = fakeHttp([
      jsonResponse(fixture('quote-available-false')),
      jsonResponse(fixture('quote-available-false')),
      jsonResponse(fixture('quote-ok')),
    ]);
    const client = createWebsiteClient({ baseUrl: BASE, log, http: fake.http, now: () => clock });
    await client.getQuote(QUOTE);
    await client.getQuote(QUOTE); // unavailable is never cached → 2nd http call
    expect(fake.urls).toHaveLength(2);
    await client.getQuote(QUOTE, { bypassCache: true });
    expect(fake.urls).toHaveLength(3);
  });
});

describe('politeness spacer', () => {
  it('does not sleep on the first call but spaces later calls by 350ms', async () => {
    const sleeps: number[] = [];
    const fake = fakeHttp([
      jsonResponse(fixture('quote-ok')),
      jsonResponse(fixture('quote-available-false')),
    ]);
    const client = createWebsiteClient({
      baseUrl: BASE,
      log,
      http: fake.http,
      now: () => 1000, // constant clock: the gap since the last start is 0
      sleep: async (ms: number) => {
        sleeps.push(ms);
      },
    });
    await client.getQuote(QUOTE);
    await client.getQuote({ ...QUOTE, checkIn: '2026-12-25' }); // distinct key, not cached
    expect(sleeps).toEqual([350]);
  });
});

describe('getAvailability', () => {
  it('returns the days verbatim on 200 and maps 502 → upstream_down', async () => {
    const okClient = createWebsiteClient({
      baseUrl: BASE,
      log,
      http: fakeHttp([jsonResponse(fixture('availability-ok'))]).http,
    });
    const ok = await okClient.getAvailability({ villaId: QUOTE.villaId, from: '2026-12-20', to: '2026-12-22' });
    expect(ok.status).toBe('ok');
    if (ok.status === 'ok') {
      expect(ok.days).toHaveLength(3);
      expect(ok.days[1]).toEqual({ date: '2026-12-21', state: 'booked', price: 17000 });
    }

    const downClient = createWebsiteClient({
      baseUrl: BASE,
      log,
      http: fakeHttp([jsonResponse({ ok: false, kind: 'upstream' }, 502)]).http,
    });
    expect((await downClient.getAvailability({ villaId: QUOTE.villaId, from: '2026-12-20', to: '2026-12-22' })).status).toBe(
      'upstream_down',
    );
  });
});
