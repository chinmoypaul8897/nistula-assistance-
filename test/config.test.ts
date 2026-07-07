import { describe, expect, it } from 'vitest';
import { ConfigError, configSummary, loadConfig } from '../src/config.js';

const minimalEnv = { NODE_ENV: 'test', PORT: '3000' };

describe('loadConfig (plan §3.7 registry)', () => {
  it('accepts a minimal env and applies the registry defaults', () => {
    const config = loadConfig(minimalEnv);
    expect(config.nodeEnv).toBe('test');
    expect(config.port).toBe(3000);
    expect(config.tz).toBe('Asia/Kolkata');
    expect(config.logLevel).toBe('info');
    expect(config.modelId).toBe('claude-sonnet-4-5');
    expect(config.graphBaseUrl).toBe('https://graph.facebook.com/v23.0');
    expect(config.ezeeBaseUrl).toBe('https://live.ipms247.com');
    expect(config.ezeeUserAgent).toBe('openAPI-Nistula');
    expect(config.draftMode).toBe(true);
    expect(config.nightStart).toBe('20:00');
    expect(config.nightEnd).toBe('10:00');
    expect(config.adminRoutesEnabled).toBe(false);
    expect(config.costAlertInrPerDay).toBe(1000);
    expect(config.opsNumbers).toEqual([]);
    expect(config.staffRoster).toEqual([]);
  });

  it.each([
    { name: 'missing NODE_ENV', env: { PORT: '3000' } },
    { name: 'unknown NODE_ENV', env: { NODE_ENV: 'staging', PORT: '3000' } },
    { name: 'missing PORT', env: { NODE_ENV: 'test' } },
    { name: 'non-numeric PORT', env: { NODE_ENV: 'test', PORT: 'abc' } },
    { name: 'out-of-range PORT', env: { NODE_ENV: 'test', PORT: '70000' } },
    { name: 'bad NIGHT_START', env: { ...minimalEnv, NIGHT_START: '8pm' } },
    { name: 'out-of-range NIGHT_START', env: { ...minimalEnv, NIGHT_START: '25:00' } },
    { name: 'out-of-range NIGHT_END', env: { ...minimalEnv, NIGHT_END: '20:71' } },
    { name: 'bad GRAPH_BASE_URL', env: { ...minimalEnv, GRAPH_BASE_URL: 'not-a-url' } },
    { name: 'non-wall-clock FAKE_NOW_IST', env: { ...minimalEnv, FAKE_NOW_IST: 'tomorrow' } },
    { name: 'out-of-range FAKE_NOW_IST time', env: { ...minimalEnv, FAKE_NOW_IST: '2026-12-20T99:99' } },
  ])('rejects $name', ({ env }) => {
    expect(() => loadConfig(env)).toThrow(ConfigError);
  });

  it('treats empty-string values as unset so defaults apply (dotenv blank lines)', () => {
    const config = loadConfig({
      ...minimalEnv,
      LOG_LEVEL: '',
      GRAPH_BASE_URL: '',
      MODEL_ID: '',
      DRAFT_MODE: '',
      NIGHT_START: '',
      ADMIN_ROUTES_ENABLED: '',
      COST_ALERT_INR_PER_DAY: '',
      FAKE_NOW_IST: '',
    });
    expect(config.logLevel).toBe('info');
    expect(config.graphBaseUrl).toBe('https://graph.facebook.com/v23.0');
    expect(config.modelId).toBe('claude-sonnet-4-5');
    expect(config.draftMode).toBe(true);
    expect(config.nightStart).toBe('20:00');
    expect(config.adminRoutesEnabled).toBe(false);
    expect(config.costAlertInrPerDay).toBe(1000);
    expect(config.fakeNowIst).toBeUndefined();
  });

  it('refuses FAKE_NOW_IST in production (§3.7 boot-refusal)', () => {
    expect(() =>
      loadConfig({ NODE_ENV: 'production', PORT: '3000', FAKE_NOW_IST: '2026-12-20T23:42' }),
    ).toThrow(/FAKE_NOW_IST/);
  });

  it('allows FAKE_NOW_IST outside production', () => {
    const config = loadConfig({ ...minimalEnv, FAKE_NOW_IST: '2026-12-20T23:42' });
    expect(config.fakeNowIst).toBe('2026-12-20T23:42');
  });
});

describe('roster integrity at config load (§3.3)', () => {
  it('normalises OPS_NUMBERS entries to E.164', () => {
    const config = loadConfig({ ...minimalEnv, OPS_NUMBERS: '08810358517, +1 415 555 2671' });
    expect(config.opsNumbers).toEqual(['+918810358517', '+14155552671']);
  });

  it('fails boot on an unnormalisable OPS_NUMBERS entry', () => {
    expect(() => loadConfig({ ...minimalEnv, OPS_NUMBERS: '+91881035, hello' })).toThrow(
      /OPS_NUMBERS/,
    );
  });

  it('parses and normalises STAFF_ROSTER_JSON', () => {
    const roster = JSON.stringify([
      { name: 'Meera', phone: '91 88103 58517', role: 'frontdesk', villas: ['B1', 'B3'] },
    ]);
    const config = loadConfig({ ...minimalEnv, STAFF_ROSTER_JSON: roster });
    expect(config.staffRoster).toEqual([
      { name: 'Meera', phone: '+918810358517', role: 'frontdesk', villas: ['B1', 'B3'] },
    ]);
  });

  it.each([
    { name: 'invalid JSON', value: '[{oops' },
    { name: 'unknown role', value: JSON.stringify([{ name: 'X', phone: '8810358517', role: 'chef', villas: [] }]) },
    { name: 'unnormalisable phone', value: JSON.stringify([{ name: 'X', phone: '12', role: 'frontdesk', villas: [] }]) },
    { name: 'missing name', value: JSON.stringify([{ phone: '8810358517', role: 'frontdesk', villas: [] }]) },
  ])('fails boot on STAFF_ROSTER_JSON with $name', ({ value }) => {
    expect(() => loadConfig({ ...minimalEnv, STAFF_ROSTER_JSON: value })).toThrow(ConfigError);
  });
});

describe('configSummary (secret-free boot print)', () => {
  it('never contains secret values, only presence', () => {
    const config = loadConfig({
      ...minimalEnv,
      ANTHROPIC_API_KEY: 'sk-super-secret-key',
      WA_ACCESS_TOKEN: 'EAAG-token-value',
      WA_APP_SECRET: 'app-secret-value',
      EZEE_AUTH_CODE: 'ezee-auth-value',
      ADMIN_BEARER_TOKEN: 'bearer-value',
      DATABASE_URL: 'postgres://user:dbpassword@host/db',
      HEALTHCHECKS_URL: 'https://hc-ping.com/secret-uuid',
      OPS_NUMBERS: '08810358517',
    });
    const summary = configSummary(config);
    for (const secret of [
      'sk-super-secret-key',
      'EAAG-token-value',
      'app-secret-value',
      'ezee-auth-value',
      'bearer-value',
      'dbpassword',
      'secret-uuid',
      '8810358517',
    ]) {
      expect(summary).not.toContain(secret);
    }
    expect(summary).toContain('ANTHROPIC_API_KEY=set');
    expect(summary).toContain('DATABASE_URL=set');
    expect(summary).toContain('OPS_NUMBERS=1 number(s)');
  });
});
