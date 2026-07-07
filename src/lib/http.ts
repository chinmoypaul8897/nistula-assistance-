/**
 * The single fetch wrapper (plan.md §3.5) — every external call goes through
 * here so tests inject a fake fetch and never hit a live API. Retry doctrine
 * per §3.4: 3 tries, jittered exponential backoff, on 5xx and network errors
 * (4xx returns to the caller — it is an answer, not an outage).
 */
import { setTimeout as sleep } from 'node:timers/promises';

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TRIES = 3;
const BACKOFF_BASE_MS = 300;

export interface HttpDeps {
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<unknown>;
  randomImpl?: () => number;
}

export interface HttpRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

/** Builds an `http(url, options)` function with injectable deps (tests pass fakes). */
export function createHttp(deps: HttpDeps = {}) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const sleepImpl = deps.sleepImpl ?? sleep;
  const randomImpl = deps.randomImpl ?? Math.random;

  return async function http(url: string, options: HttpRequestOptions = {}): Promise<Response> {
    const { timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options;
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
      try {
        const response = await fetchImpl(url, {
          ...init,
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (response.status >= 500 && attempt < MAX_TRIES) {
          await sleepImpl(backoffMs(attempt, randomImpl));
          continue;
        }
        return response;
      } catch (error) {
        // Network failure or timeout — retry until tries are spent.
        lastError = error;
        if (attempt < MAX_TRIES) await sleepImpl(backoffMs(attempt, randomImpl));
      }
    }
    throw lastError;
  };
}

// Full jitter — uniform in [0, base·2^attempt) — avoids retry stampedes.
function backoffMs(attempt: number, random: () => number): number {
  return Math.floor(random() * BACKOFF_BASE_MS * 2 ** attempt);
}

/** Default instance over global fetch — application code imports this one. */
export const http = createHttp();
