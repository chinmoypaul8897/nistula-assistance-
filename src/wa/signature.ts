/**
 * Meta webhook authentication (plan.md CH-02 step 1, §3.3): every POST body
 * is verified as `X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(rawBody)`
 * under WA_APP_SECRET BEFORE any parsing. Unverified payloads never reach
 * the database — they are 401'd, logged and counted by the webhook route.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

/** True iff `header` matches the HMAC of `rawBody` under `appSecret`; never throws. */
export function verifySignature(
  rawBody: Buffer,
  header: string | undefined,
  appSecret: string,
): boolean {
  if (header === undefined || !header.startsWith('sha256=')) return false;
  // Meta sends lowercase hex; tolerate case differences without weakening
  // the comparison (both sides normalised before the timing-safe check).
  const received = header.slice('sha256='.length).toLowerCase();
  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  return timingSafeStringEqual(received, expected);
}

/**
 * Constant-time string equality for secret-bearing comparisons (signature
 * digests, the GET-handshake verify token). timingSafeEqual throws on length
 * mismatch — a mismatched length is simply a failed match, not an error.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
