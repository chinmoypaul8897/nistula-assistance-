import { afterAll, describe, expect, it } from 'vitest';
import { buildServer } from '../src/server.js';

describe('GET /health (CH-00 integration seam)', () => {
  const app = buildServer();
  afterAll(() => app.close());

  it('returns 200 with ok, version, uptime and the CH-17 internal-health fields', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      ok: boolean;
      version: string;
      uptime: number;
      db: boolean;
      boss: boolean;
      pollerAgeMs: number | null;
      senderAgeMs: number | null;
      degraded: boolean;
    };
    expect(body.ok).toBe(true);
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(body.uptime).toBeGreaterThan(0);
    // Unconfigured (buildServer without main()'s wiring) ⇒ the basic all-clear
    // report, no DB touched. /health stays 200 regardless (liveness only).
    expect(body.db).toBe(true);
    expect(body.boss).toBe(true);
    expect(body.pollerAgeMs).toBeNull();
    expect(body.senderAgeMs).toBeNull();
    expect(body.degraded).toBe(false);
  });

  it('serves nothing else — no other public surface in CH-00 (§3.3)', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/anything' });
    expect(res.statusCode).toBe(404);
  });
});

describe('request logging strips query strings (CH-02 — found live)', () => {
  it('never logs a query value — Meta handshakes carry the verify token there', async () => {
    process.env.LOG_LEVEL = 'info';
    const lines: string[] = [];
    const app = buildServer({ write: (msg: string) => void lines.push(msg) });
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/health?hub.verify_token=super-secret-token-value&hub.challenge=42',
      });
      expect(res.statusCode).toBe(200);
      const out = lines.join('');
      expect(out).toContain('request completed');
      expect(out).not.toContain('super-secret-token-value');
    } finally {
      await app.close();
      delete process.env.LOG_LEVEL;
    }
  });
});
