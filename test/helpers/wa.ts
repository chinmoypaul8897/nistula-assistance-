/**
 * Shared WhatsApp test rig: a Fastify app with the webhook plugin on test
 * credentials, plus a signer producing the exact X-Hub-Signature-256 header
 * Meta would send. Not a test file (vitest only picks up *.test.ts).
 */
import { createHmac } from 'node:crypto';
import Fastify from 'fastify';
import type { Db } from '../../src/db/client.js';
import { waWebhookRoutes } from '../../src/wa/webhook.js';

export const TEST_APP_SECRET = 'test-app-secret';
export const TEST_VERIFY_TOKEN = 'test-verify-token';

/** The header value for a given raw body under the (test) app secret. */
export function signBody(body: string | Buffer, secret: string = TEST_APP_SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

/** Builds an injectable app with the webhook routes registered. */
export async function buildWaApp(db: Db) {
  const app = Fastify();
  await app.register(waWebhookRoutes, {
    db,
    appSecret: TEST_APP_SECRET,
    verifyToken: TEST_VERIFY_TOKEN,
  });
  return app;
}
