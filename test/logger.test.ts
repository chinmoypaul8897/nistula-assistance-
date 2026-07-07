import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../src/config.js';
import { createLogger, loggableBody } from '../src/lib/logger.js';

function captureLogger() {
  const lines: string[] = [];
  const logger = createLogger({ write: (msg: string) => void lines.push(msg) });
  return { logger, output: () => lines.join('') };
}

describe('createLogger redaction (CH-00 security box)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('redacts secret keys at top level and one level deep', () => {
    vi.stubEnv('LOG_LEVEL', 'info');
    const { logger, output } = captureLogger();
    logger.info({
      WA_ACCESS_TOKEN: 'wa-secret-1',
      config: { ANTHROPIC_API_KEY: 'sk-secret-2', EZEE_AUTH_CODE: 'ez-secret-3' },
      headers: { authorization: 'Bearer secret-4' },
    });
    const out = output();
    for (const secret of ['wa-secret-1', 'sk-secret-2', 'ez-secret-3', 'secret-4']) {
      expect(out).not.toContain(secret);
    }
    expect(out).toContain('[redacted]');
  });

  it('redacts a whole Config object logged wholesale', () => {
    vi.stubEnv('LOG_LEVEL', 'info');
    const { logger, output } = captureLogger();
    const config = loadConfig({
      NODE_ENV: 'test',
      PORT: '3000',
      ANTHROPIC_API_KEY: 'sk-cfg-secret',
      WA_ACCESS_TOKEN: 'EAAG-cfg-secret',
      WA_APP_SECRET: 'appsecret-cfg',
      EZEE_AUTH_CODE: 'ezee-cfg-secret',
      DATABASE_URL: 'postgres://u:pw-cfg-secret@h/db',
      ADMIN_BEARER_TOKEN: 'bearer-cfg-secret',
    });
    logger.info({ config });
    const out = output();
    for (const secret of [
      'sk-cfg-secret',
      'EAAG-cfg-secret',
      'appsecret-cfg',
      'ezee-cfg-secret',
      'pw-cfg-secret',
      'bearer-cfg-secret',
    ]) {
      expect(out).not.toContain(secret);
    }
  });

  it('respects LOG_LEVEL from the environment', () => {
    vi.stubEnv('LOG_LEVEL', 'error');
    const { logger, output } = captureLogger();
    logger.info('quiet');
    logger.error('loud');
    expect(output()).not.toContain('quiet');
    expect(output()).toContain('loud');
  });
});

describe('loggableBody (§3.3 PII discipline)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('withholds bodies in production regardless of level', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(loggableBody('guest wrote this')).not.toContain('guest wrote this');
  });

  it('passes bodies through outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(loggableBody('guest wrote this')).toBe('guest wrote this');
  });
});
