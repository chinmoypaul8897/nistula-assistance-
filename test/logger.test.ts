import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../src/config.js';
import { createLogger, loggableBody, summarizeError } from '../src/lib/logger.js';

describe('summarizeError (CH-02 — §3.3: exception text without payload)', () => {
  it('strips the drizzle params tail that embeds guest phone and body', () => {
    // The realistic leak: DrizzleQueryError.message = "Failed query: <sql>\nparams: <values>"
    const wrapped = new Error(
      'Failed query: insert into "messages" ("body", ...) values ($1, $2)\n' +
        'params: need a late checkout, call me on 919812345678,guest,text',
    );
    wrapped.name = 'DrizzleQueryError';
    const summary = summarizeError(wrapped);
    expect(summary).not.toContain('919812345678');
    expect(summary).not.toContain('late checkout');
    expect(summary).toContain('DrizzleQueryError');
  });

  it('prefers the driver message on error.cause (the real pg reason)', () => {
    const wrapped = new Error('Failed query: insert into "messages" ...\nparams: secret-stuff');
    wrapped.cause = new Error('invalid input value for enum message_type: "bogus"');
    expect(summarizeError(wrapped)).toBe(
      'Error: invalid input value for enum message_type: "bogus"',
    );
  });

  it('handles plain errors and non-Error throws', () => {
    expect(summarizeError(new TypeError('x is not iterable'))).toBe('TypeError: x is not iterable');
    expect(summarizeError('string throw')).toBe('string throw');
  });
});

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
