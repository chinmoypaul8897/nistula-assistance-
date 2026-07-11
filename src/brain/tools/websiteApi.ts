/**
 * Website price API client (plan.md §5.1, CH-05 step 3) — the price source of
 * truth. Every ₹ the guest sees originates here. Talks ONLY to WEBSITE_BASE_URL
 * (the origin allowlist: the model never supplies a URL, so the client can
 * physically only reach that host) through the injected lib/http.ts wrapper, so
 * no test hits the live preview (§3.5).
 *
 * The response shapes below are the VERIFIED website codebase shapes (CH-05
 * planning). They SUPERSEDE plan §5.1's approximate ("≈") sketch: the real
 * QuoteView uses `averagePerNight` (not avgPerNight), carries NO plan/currency
 * field, and adds `available` + occupancy echoes. Two subtleties the sketch
 * hides, both handled here: a 200 with available:false ≡ "dates just taken"
 * (same outcome as a 409), and minNights.meetsRequirement:false on a 200 is a
 * VALID quote (a note, not an error).
 *
 * Politeness (§5.1: 3/5s · 25/min shared): concurrency 1 + 350ms spacing, a
 * hand-rolled serial spacer (§3.3 minimal deps — no p-queue). 60s cache keyed
 * by the full query; only successful quotes are cached (never unavailable,
 * never errors).
 */
import { http as defaultHttp } from '../../lib/http.js';
import { summarizeError } from '../../lib/logger.js';
import type { AlertLogger } from '../../ops/alerts.js';
import { alertOps } from '../../ops/alerts.js';

/** Verbatim /api/quote success shape — do NOT add fields (§3.3, "never invent"). */
export interface QuoteView {
  villaId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  /** GST-inclusive, final, raw integer rupees (e.g. 34000). */
  total: number;
  averagePerNight: number;
  perNight: { date: string; amount: number }[];
  minNights: { average: number; meetsRequirement: boolean };
  /** false on a 200 ≡ "those dates just got taken" (distinct from a 409). */
  available: boolean;
}

/** Verbatim /api/availability day cell. */
export interface DayState {
  date: string;
  state: 'free' | 'booked';
  price?: number;
}

export interface QuoteParams {
  villaId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  plan: 'ep' | 'cp';
}
export interface AvailabilityParams {
  villaId: string;
  from: string;
  to: string;
}

/** Quote outcomes — the friendly enum the handlers map to §6.4 tool results. */
export type QuoteOutcome =
  | { status: 'ok'; quote: QuoteView }
  | { status: 'min_nights'; quote: QuoteView }
  | { status: 'unavailable' } // 200 available:false OR 409
  | { status: 'invalid'; kind: string } // 400 / 404
  | { status: 'upstream_down'; retryAfterMs?: number }; // 429 / 502 / network

export type AvailabilityOutcome =
  | { status: 'ok'; days: DayState[] }
  | { status: 'invalid'; kind: string }
  | { status: 'upstream_down'; retryAfterMs?: number };

/** The HTTP-error subset shared by both outcomes (no cast needed either way). */
type HttpErrorOutcome =
  | { status: 'invalid'; kind: string }
  | { status: 'upstream_down'; retryAfterMs?: number };

export interface WebsiteApiDeps {
  /** config.websiteBaseUrl — the ONLY origin this client will ever call. */
  baseUrl: string;
  log: AlertLogger;
  /** Tests inject a fake fetch wrapper (§3.5). */
  http?: typeof defaultHttp;
  /** Injectable clocks for the cache + spacer (deterministic tests). */
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  /** Politeness spacing between website calls (§5.1). */
  spacingMs?: number;
  /** Cache TTL for successful quotes. */
  cacheTtlMs?: number;
}

export interface WebsiteClient {
  getQuote(params: QuoteParams, opts?: { bypassCache?: boolean }): Promise<QuoteOutcome>;
  getAvailability(params: AvailabilityParams): Promise<AvailabilityOutcome>;
}

const DEFAULT_SPACING_MS = 350;
const DEFAULT_CACHE_TTL_MS = 60_000;

// Shape of a website error body (verified route): { ok:false, kind, ... }.
interface WebsiteErrorBody {
  ok?: boolean;
  kind?: string;
  retryAfterMs?: number;
}

export function createWebsiteClient(deps: WebsiteApiDeps): WebsiteClient {
  const httpFn = deps.http ?? defaultHttp;
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const spacingMs = deps.spacingMs ?? DEFAULT_SPACING_MS;
  const cacheTtlMs = deps.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;

  // Serial spacer: chain every call so concurrency is 1, and hold each start at
  // least `spacingMs` after the previous one began — the polite-caller contract
  // without a queue dependency.
  let chain: Promise<unknown> = Promise.resolve();
  // -Infinity ⇒ the first call never waits (on any clock); subsequent calls are
  // spaced ≥ spacingMs after the previous START.
  let lastStartedAt = Number.NEGATIVE_INFINITY;
  function schedule<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(async () => {
      const wait = Math.max(0, spacingMs - (now() - lastStartedAt));
      if (wait > 0) await sleep(wait);
      lastStartedAt = now();
      return fn();
    });
    // Keep the chain alive even if a call rejects (never wedge the spacer).
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  const quoteCache = new Map<string, { at: number; quote: QuoteView; status: 'ok' | 'min_nights' }>();

  function quoteUrl(p: QuoteParams): string {
    const url = new URL('/api/quote', deps.baseUrl);
    url.searchParams.set('villaId', p.villaId);
    url.searchParams.set('checkIn', p.checkIn);
    url.searchParams.set('checkOut', p.checkOut);
    url.searchParams.set('adults', String(p.adults));
    url.searchParams.set('children', String(p.children));
    url.searchParams.set('plan', p.plan);
    return url.toString();
  }

  function availabilityUrl(p: AvailabilityParams): string {
    const url = new URL('/api/availability', deps.baseUrl);
    url.searchParams.set('villaId', p.villaId);
    url.searchParams.set('from', p.from);
    url.searchParams.set('to', p.to);
    return url.toString();
  }

  async function getQuote(
    params: QuoteParams,
    opts?: { bypassCache?: boolean },
  ): Promise<QuoteOutcome> {
    const key = quoteUrl(params);
    if (opts?.bypassCache !== true) {
      const hit = quoteCache.get(key);
      if (hit !== undefined && now() - hit.at < cacheTtlMs) {
        return { status: hit.status, quote: hit.quote };
      }
    }
    const outcome = await schedule(() => fetchQuote(key));
    // Cache ONLY reusable successes — never `unavailable` (dates flip fast) and
    // never errors (§CH-05 step 3: never cache 409s).
    if (outcome.status === 'ok' || outcome.status === 'min_nights') {
      quoteCache.set(key, { at: now(), quote: outcome.quote, status: outcome.status });
    }
    return outcome;
  }

  async function fetchQuote(url: string): Promise<QuoteOutcome> {
    let response: Response;
    try {
      response = await httpFn(url, { method: 'GET', headers: { accept: 'application/json' } });
    } catch (error) {
      // Network/timeout after http.ts's own retries — an outage, not an answer.
      deps.log.error(
        { opsAlert: 'website_unreachable', err: summarizeError(error) },
        '[website] quote fetch threw',
      );
      return { status: 'upstream_down' };
    }
    if (response.ok) {
      const body = (await response.json().catch(() => null)) as { ok?: boolean; quote?: QuoteView } | null;
      const quote = body?.quote;
      if (body?.ok !== true || quote === undefined) {
        return { status: 'upstream_down' }; // 200 but unparseable — treat as an outage
      }
      if (quote.available === false) return { status: 'unavailable' };
      if (quote.minNights.meetsRequirement === false) return { status: 'min_nights', quote };
      return { status: 'ok', quote };
    }
    // 409 is the other "dates taken" signal (distinct from a 200 available:false).
    if (response.status === 409) return { status: 'unavailable' };
    return mapHttpError(response);
  }

  async function getAvailability(params: AvailabilityParams): Promise<AvailabilityOutcome> {
    const url = availabilityUrl(params);
    let response: Response;
    try {
      response = await schedule(() =>
        httpFn(url, { method: 'GET', headers: { accept: 'application/json' } }),
      );
    } catch (error) {
      deps.log.error(
        { opsAlert: 'website_unreachable', err: summarizeError(error) },
        '[website] availability fetch threw',
      );
      return { status: 'upstream_down' };
    }
    if (response.ok) {
      const body = (await response.json().catch(() => null)) as { ok?: boolean; days?: DayState[] } | null;
      if (body?.ok !== true || body.days === undefined) return { status: 'upstream_down' };
      return { status: 'ok', days: body.days };
    }
    // No 409 on availability — only invalid / upstream_down.
    return mapHttpError(response);
  }

  // Shared HTTP-error → outcome (subset of both QuoteOutcome and
  // AvailabilityOutcome). 400/404 = a caller/data problem (an answer, so the
  // degraded counter resets upstream); 429/502 = an outage.
  async function mapHttpError(response: Response): Promise<HttpErrorOutcome> {
    const body = (await response.json().catch(() => ({}))) as WebsiteErrorBody;
    if (response.status === 404) {
      // Our villa map disagrees with the live site — a real config drift worth
      // an alert (the model still degrades to "unknown villa" gracefully).
      void alertOps(deps.log, {
        kind: 'villa_map_drift',
        summary: 'website returned 404 for a villaId in our map',
        detail: { kind: body.kind, httpStatus: 404 },
      });
      return { status: 'invalid', kind: body.kind ?? 'input' };
    }
    if (response.status === 400) {
      return { status: 'invalid', kind: body.kind ?? 'validation' };
    }
    // 429 / 502 / any other 5xx that survived http.ts's retries.
    return { status: 'upstream_down', retryAfterMs: body.retryAfterMs };
  }

  return { getQuote, getAvailability };
}
