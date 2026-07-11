/**
 * Price tools (plan.md §6.4, CH-05 step 4) + the registry framework. Pure — the
 * website client is a stub, so no live call. Proves label resolution → tool
 * errors, verbatim QuoteView passthrough, degraded recording, and that unknown
 * tools / bad input become tool RESULTS (never throws into the model).
 */
import { describe, expect, it, vi } from 'vitest';
import { buildToolRegistry } from '../src/brain/tools/index.js';
import type { ToolContext } from '../src/brain/tools/registry.js';
import type { AvailabilityOutcome, QuoteOutcome, WebsiteClient } from '../src/brain/tools/websiteApi.js';

const BASE = 'https://website.test.invalid';
const OK_QUOTE: QuoteOutcome = {
  status: 'ok',
  quote: {
    villaId: '5220300000000000011',
    checkIn: '2026-12-20',
    checkOut: '2026-12-22',
    nights: 2,
    adults: 4,
    children: 0,
    total: 34000,
    averagePerNight: 17000,
    perNight: [
      { date: '2026-12-20', amount: 17000 },
      { date: '2026-12-21', amount: 17000 },
    ],
    minNights: { average: 2, meetsRequirement: true },
    available: true,
  },
};

function ctx(overrides?: {
  quote?: QuoteOutcome;
  availability?: AvailabilityOutcome;
}): { ctx: ToolContext; recorded: ('down' | 'up')[] } {
  const recorded: ('down' | 'up')[] = [];
  const website: WebsiteClient = {
    getQuote: async () => overrides?.quote ?? OK_QUOTE,
    getAvailability: async () => overrides?.availability ?? { status: 'ok', days: [] },
  };
  return {
    recorded,
    ctx: {
      website,
      websiteBaseUrl: BASE,
      degraded: { record: (o) => recorded.push(o) },
      log: { error: vi.fn() },
    },
  };
}

const registry = buildToolRegistry();

describe('registry framework', () => {
  it('exposes exactly the three CH-05 tools with object input schemas', () => {
    const names = registry.specs().map((s) => s.name).sort();
    expect(names).toEqual(['get_availability', 'get_booking_link', 'get_quote']);
    for (const spec of registry.specs()) expect(spec.input_schema.type).toBe('object');
  });

  it('an unknown tool name → UNKNOWN_TOOL result (never throws)', async () => {
    const res = await registry.run('does_not_exist', {}, ctx().ctx);
    expect(res).toMatchObject({ ok: false, error: 'UNKNOWN_TOOL' });
  });

  it('bad input → INVALID result (never throws)', async () => {
    const res = await registry.run('get_quote', { villa_label: 'B3', check_in: 'nope' }, ctx().ctx);
    expect(res).toMatchObject({ ok: false, error: 'INVALID' });
  });

  it('toInputSchema drops $schema and makes defaulted fields optional', () => {
    const schema = registry.specs().find((s) => s.name === 'get_quote')?.input_schema ?? {};
    expect(schema.$schema).toBeUndefined();
    // adults has no default (required); children/plan have defaults (optional).
    expect(schema.required).toContain('adults');
    expect(schema.required).not.toContain('children');
    expect(schema.required).not.toContain('plan');
  });
});

describe('get_quote handler', () => {
  it('resolves the villa and returns the QuoteView verbatim on ok', async () => {
    const c = ctx();
    const res = await registry.run(
      'get_quote',
      { villa_label: 'B3', check_in: '2026-12-20', check_out: '2026-12-22', adults: 4 },
      c.ctx,
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual(OK_QUOTE.quote);
    expect(c.recorded).toEqual(['up']);
  });

  it('min_nights → ok with a MIN_NIGHTS note', async () => {
    const c = ctx({ quote: { status: 'min_nights', quote: OK_QUOTE.quote } });
    const res = await registry.run(
      'get_quote',
      { villa_label: 'B3', check_in: '2026-12-20', check_out: '2026-12-22', adults: 4 },
      c.ctx,
    );
    expect(res).toMatchObject({ ok: true, note: 'MIN_NIGHTS' });
  });

  it('unavailable → UNAVAILABLE with same-type alternatives, records up', async () => {
    const c = ctx({ quote: { status: 'unavailable' } });
    const res = await registry.run(
      'get_quote',
      { villa_label: 'B3', check_in: '2026-12-20', check_out: '2026-12-22', adults: 4 },
      c.ctx,
    );
    expect(res).toMatchObject({ ok: false, error: 'UNAVAILABLE' });
    if (!res.ok) {
      const alts = (res.data as { alternatives: string[] }).alternatives;
      expect(alts).toContain('Villa B1');
      expect(alts).not.toContain('Villa B3'); // itself excluded
    }
    expect(c.recorded).toEqual(['up']);
  });

  it('upstream_down → UPSTREAM_DOWN and records a down', async () => {
    const c = ctx({ quote: { status: 'upstream_down' } });
    const res = await registry.run(
      'get_quote',
      { villa_label: 'B3', check_in: '2026-12-20', check_out: '2026-12-22', adults: 4 },
      c.ctx,
    );
    expect(res).toMatchObject({ ok: false, error: 'UPSTREAM_DOWN' });
    expect(c.recorded).toEqual(['down']);
  });

  it('a TYPE ("3bhk") quotes all units → shared price + availability, never asks which unit', async () => {
    const c = ctx(); // default website returns OK_QUOTE for every unit
    const res = await registry.run(
      'get_quote',
      { villa_label: '3bhk', check_in: '2026-12-20', check_out: '2026-12-22', adults: 4 },
      c.ctx,
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      const d = res.data as { type: string; total: number; available: boolean; availableCount: number; unitCount: number };
      expect(d.type).toBe('Nistula Villa');
      expect(d.total).toBe(34000); // shared price
      expect(d.available).toBe(true);
      expect(d.availableCount).toBe(4);
      expect(d.unitCount).toBe(4);
    }
    expect(c.recorded).toEqual(['up']); // one health signal for the whole type query
  });

  it('a TYPE with all units taken → still shows the price, available:false (not a bare refusal)', async () => {
    // available:false 200 preserves the quote, so the type still has a price.
    const c = ctx({ quote: { status: 'unavailable', quote: OK_QUOTE.quote } });
    const res = await registry.run(
      'get_quote',
      { villa_label: '3bhk', check_in: '2026-12-20', check_out: '2026-12-22', adults: 4 },
      c.ctx,
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      const d = res.data as { total: number; available: boolean; availableCount: number };
      expect(d.total).toBe(34000);
      expect(d.available).toBe(false);
      expect(d.availableCount).toBe(0);
    }
  });

  it('a TYPE with mixed availability counts only the free units', async () => {
    const recorded: ('down' | 'up')[] = [];
    const free = new Set(['5220300000000000002', '5220300000000000011']); // B1, B3 free
    const c: ToolContext = {
      website: {
        getQuote: async (p) =>
          free.has(p.villaId)
            ? { status: 'ok', quote: OK_QUOTE.quote }
            : { status: 'unavailable', quote: OK_QUOTE.quote },
        getAvailability: async () => ({ status: 'ok', days: [] }),
      },
      websiteBaseUrl: BASE,
      degraded: { record: (o) => recorded.push(o) },
      log: { error: vi.fn() },
    };
    const res = await registry.run(
      'get_quote',
      { villa_label: 'villa', check_in: '2026-12-20', check_out: '2026-12-22', adults: 4 },
      c,
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      const d = res.data as { available: boolean; availableCount: number };
      expect(d.available).toBe(true);
      expect(d.availableCount).toBe(2);
    }
  });

  it('a TYPE with every unit upstream_down → UPSTREAM_DOWN + one degraded down', async () => {
    const c = ctx({ quote: { status: 'upstream_down' } });
    const res = await registry.run(
      'get_quote',
      { villa_label: '3bhk', check_in: '2026-12-20', check_out: '2026-12-22', adults: 4 },
      c.ctx,
    );
    expect(res).toMatchObject({ ok: false, error: 'UPSTREAM_DOWN' });
    expect(c.recorded).toEqual(['down']);
  });

  it('an unknown villa → UNKNOWN_VILLA', async () => {
    const res = await registry.run(
      'get_quote',
      { villa_label: 'treehouse', check_in: '2026-12-20', check_out: '2026-12-22', adults: 4 },
      ctx().ctx,
    );
    expect(res).toMatchObject({ ok: false, error: 'UNKNOWN_VILLA' });
  });

  it('rejects out-of-range occupancy and reversed dates', async () => {
    const c = ctx();
    for (const bad of [
      { villa_label: 'B3', check_in: '2026-12-20', check_out: '2026-12-22', adults: 11 },
      { villa_label: 'B3', check_in: '2026-12-22', check_out: '2026-12-20', adults: 2 },
    ]) {
      expect(await registry.run('get_quote', bad, c.ctx)).toMatchObject({ ok: false, error: 'INVALID' });
    }
  });
});

describe('get_availability + get_booking_link', () => {
  it('get_availability returns days verbatim', async () => {
    const days = [{ date: '2026-12-20', state: 'free' as const }];
    const c = ctx({ availability: { status: 'ok', days } });
    const res = await registry.run(
      'get_availability',
      { villa_label: 'B3', from: '2026-12-20', to: '2026-12-21' },
      c.ctx,
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect((res.data as { days: unknown[] }).days).toEqual(days);
  });

  it('get_booking_link builds the canonical URL with no website call', async () => {
    const c = ctx();
    const res = await registry.run('get_booking_link', { villa_label: 'Siolim' }, c.ctx);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect((res.data as { url: string }).url).toBe(`${BASE}/villas/5220300000000000015`);
    }
    expect(c.recorded).toEqual([]);
  });

  it('get_booking_link for a TYPE returns a representative unit link (no ask)', async () => {
    const c = ctx();
    const res = await registry.run('get_booking_link', { villa_label: '3bhk' }, c.ctx);
    expect(res.ok).toBe(true);
    if (res.ok) {
      const d = res.data as { type: string; url: string };
      expect(d.type).toBe('Nistula Villa');
      expect(d.url).toMatch(/\/villas\/5220300000000000\d{3}$/);
    }
  });
});
