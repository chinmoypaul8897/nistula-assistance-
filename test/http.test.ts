import { describe, expect, it } from 'vitest';
import { createHttp } from '../src/lib/http.js';

const instantSleep = () => Promise.resolve();

function fetchSequence(results: Array<Response | Error>): {
  fetchImpl: typeof fetch;
  calls: () => number;
} {
  let call = 0;
  const fetchImpl = (async () => {
    const result = results[Math.min(call, results.length - 1)];
    call += 1;
    if (result instanceof Error) throw result;
    return result as Response;
  }) as typeof fetch;
  return { fetchImpl, calls: () => call };
}

describe('createHttp (plan §3.4 retry doctrine)', () => {
  it('returns a 2xx response first try', async () => {
    const seq = fetchSequence([new Response('ok', { status: 200 })]);
    const http = createHttp({ fetchImpl: seq.fetchImpl, sleepImpl: instantSleep });
    const res = await http('https://example.test/');
    expect(res.status).toBe(200);
    expect(seq.calls()).toBe(1);
  });

  it('retries network errors then succeeds (3 tries total)', async () => {
    const seq = fetchSequence([
      new Error('ECONNRESET'),
      new Error('ECONNRESET'),
      new Response('ok', { status: 200 }),
    ]);
    const http = createHttp({ fetchImpl: seq.fetchImpl, sleepImpl: instantSleep });
    const res = await http('https://example.test/');
    expect(res.status).toBe(200);
    expect(seq.calls()).toBe(3);
  });

  it('retries 5xx and returns the last 5xx when tries are spent', async () => {
    const seq = fetchSequence([new Response('down', { status: 502 })]);
    const http = createHttp({ fetchImpl: seq.fetchImpl, sleepImpl: instantSleep });
    const res = await http('https://example.test/');
    expect(res.status).toBe(502);
    expect(seq.calls()).toBe(3);
  });

  it('does NOT retry 4xx — it is an answer, not an outage', async () => {
    const seq = fetchSequence([new Response('nope', { status: 404 })]);
    const http = createHttp({ fetchImpl: seq.fetchImpl, sleepImpl: instantSleep });
    const res = await http('https://example.test/');
    expect(res.status).toBe(404);
    expect(seq.calls()).toBe(1);
  });

  it('throws the last network error after 3 failed tries', async () => {
    const seq = fetchSequence([new Error('EAI_AGAIN')]);
    const http = createHttp({ fetchImpl: seq.fetchImpl, sleepImpl: instantSleep });
    await expect(http('https://example.test/')).rejects.toThrow('EAI_AGAIN');
    expect(seq.calls()).toBe(3);
  });

  it('aborts a hung request via the timeout signal', async () => {
    const hangingFetch = ((_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal.reason));
      })) as typeof fetch;
    const http = createHttp({ fetchImpl: hangingFetch, sleepImpl: instantSleep });
    await expect(http('https://example.test/', { timeoutMs: 20 })).rejects.toThrow();
  });

  it('jitters backoff from the injected random source', async () => {
    const sleeps: number[] = [];
    const seq = fetchSequence([new Response('down', { status: 500 })]);
    const http = createHttp({
      fetchImpl: seq.fetchImpl,
      sleepImpl: (ms) => {
        sleeps.push(ms);
        return Promise.resolve();
      },
      randomImpl: () => 0.5,
    });
    await http('https://example.test/');
    // base 300ms · 2^attempt · 0.5 → 300, 600
    expect(sleeps).toEqual([300, 600]);
  });
});
