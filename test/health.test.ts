import { afterAll, describe, expect, it } from 'vitest';
import { buildServer } from '../src/server.js';

describe('GET /health (CH-00 integration seam)', () => {
  const app = buildServer();
  afterAll(() => app.close());

  it('returns 200 with ok, version and uptime', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { ok: boolean; version: string; uptime: number };
    expect(body.ok).toBe(true);
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(body.uptime).toBeGreaterThan(0);
  });

  it('serves nothing else — no other public surface in CH-00 (§3.3)', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/anything' });
    expect(res.statusCode).toBe(404);
  });
});
