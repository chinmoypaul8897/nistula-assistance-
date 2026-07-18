/**
 * CH-17 — the token-error classifier feeding the distinct `wa_token_expired`
 * alert. The point of this test is the FALSE positives it forbids: Meta stamps
 * `type: 'OAuthException'` on unrelated rejections (allowlist, bad param), so the
 * classifier must key on the narrow contract (HTTP 401 / code 190), never the
 * type string. A wa-client test proved the regression; this pins the rule.
 */
import { describe, expect, it } from 'vitest';
import { isTokenError } from '../src/wa/sendFailure.js';

describe('isTokenError', () => {
  it('is TRUE for a dead token — HTTP 401 or code 190', () => {
    expect(isTokenError({ errorText: 'x', httpStatus: 401 })).toBe(true);
    expect(isTokenError({ errorText: 'x', errorCode: 190, errorTitle: 'OAuthException', httpStatus: 401 })).toBe(true);
    expect(isTokenError({ errorText: 'x', errorCode: 190, httpStatus: 200 })).toBe(true);
  });

  it('is FALSE for an OAuthException that is NOT a token problem', () => {
    // 131030 recipient-not-allowed and 100 invalid-param both arrive as
    // OAuthException + HTTP 400 — never a dead token.
    expect(isTokenError({ errorText: 'x', errorTitle: 'OAuthException', errorCode: 131030, httpStatus: 400 })).toBe(false);
    expect(isTokenError({ errorText: 'x', errorTitle: 'OAuthException', errorCode: 100, httpStatus: 400 })).toBe(false);
    expect(isTokenError({ errorText: 'x', errorCode: 131047, httpStatus: 400 })).toBe(false);
    expect(isTokenError({ errorText: 'x' })).toBe(false);
  });
});
