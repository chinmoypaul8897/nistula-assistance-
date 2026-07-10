/**
 * CH-02 step 1 — signature verification is the security gate for every
 * webhook byte: prove it accepts exactly Meta's form and rejects everything
 * else without throwing (§3.3).
 */
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { timingSafeStringEqual, verifySignature } from '../src/wa/signature.js';

const SECRET = 'unit-test-secret';

function sign(body: Buffer, secret: string = SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

describe('verifySignature', () => {
  const body = Buffer.from('{"object":"whatsapp_business_account","entry":[]}', 'utf8');

  it('accepts the exact Meta form', () => {
    expect(verifySignature(body, sign(body), SECRET)).toBe(true);
  });

  it('accepts an uppercase hex digest (case-tolerant, still timing-safe)', () => {
    const header = `sha256=${sign(body).slice('sha256='.length).toUpperCase()}`;
    expect(verifySignature(body, header, SECRET)).toBe(true);
  });

  it('rejects a signature made with a different secret', () => {
    expect(verifySignature(body, sign(body, 'other-secret'), SECRET)).toBe(false);
  });

  it('rejects when the body was tampered after signing', () => {
    const header = sign(body);
    const tampered = Buffer.from(body.toString('utf8').replace('entry', 'evil!'), 'utf8');
    expect(verifySignature(tampered, header, SECRET)).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(verifySignature(body, undefined, SECRET)).toBe(false);
  });

  it('rejects a wrong-algorithm prefix', () => {
    const digest = sign(body).slice('sha256='.length);
    expect(verifySignature(body, `sha1=${digest}`, SECRET)).toBe(false);
  });

  it('rejects a truncated digest without throwing (length mismatch)', () => {
    expect(verifySignature(body, sign(body).slice(0, 20), SECRET)).toBe(false);
  });

  it('rejects an empty header value', () => {
    expect(verifySignature(body, '', SECRET)).toBe(false);
  });

  it('signs over exact BYTES — multi-byte UTF-8 bodies verify', () => {
    const unicode = Buffer.from('{"text":{"body":"नमस्ते 👋 चाहिए"}}', 'utf8');
    expect(verifySignature(unicode, sign(unicode), SECRET)).toBe(true);
  });
});

describe('timingSafeStringEqual', () => {
  it('matches equal strings and rejects unequal or different-length ones', () => {
    expect(timingSafeStringEqual('token-a', 'token-a')).toBe(true);
    expect(timingSafeStringEqual('token-a', 'token-b')).toBe(false);
    expect(timingSafeStringEqual('token-a', 'token-a-longer')).toBe(false);
    expect(timingSafeStringEqual('', '')).toBe(true);
  });
});
