/**
 * Shared WhatsApp test rig: a Fastify app with the webhook plugin on test
 * credentials, plus a signer producing the exact X-Hub-Signature-256 header
 * Meta would send. Not a test file (vitest only picks up *.test.ts).
 */
import { createHmac } from 'node:crypto';
import Fastify from 'fastify';
import { pino } from 'pino';
import type { Db } from '../../src/db/client.js';
import { waWebhookRoutes } from '../../src/wa/webhook.js';

export const TEST_APP_SECRET = 'test-app-secret';
export const TEST_VERIFY_TOKEN = 'test-verify-token';

/** The header value for a given raw body under the (test) app secret. */
export function signBody(body: string | Buffer, secret: string = TEST_APP_SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

export interface LogCapture {
  lines: Record<string, unknown>[];
  stream: { write: (msg: string) => void };
}

/** In-memory pino sink so tests can assert what the routes actually logged. */
export function captureLog(): LogCapture {
  const lines: Record<string, unknown>[] = [];
  return {
    lines,
    stream: {
      write(msg: string) {
        lines.push(JSON.parse(msg) as Record<string, unknown>);
      },
    },
  };
}

/** Builds an injectable app with the webhook routes registered. */
export async function buildWaApp(
  db: Db,
  capture?: LogCapture,
  opts?: {
    enqueue?: (conversationId: string) => Promise<void>;
    /** CH-13a. Absent ⇒ nobody is staff and every inbound is a guest, which
     * is exactly the pre-CH-13a world every earlier suite was written for. */
    staff?: {
      isStaffPhone: (phone: string) => boolean;
      enqueueCommand: (input: { phone: string; waMessageId: string }) => Promise<void>;
    };
  },
) {
  const app = Fastify(
    capture === undefined ? {} : { loggerInstance: pino({ level: 'debug' }, capture.stream) },
  );
  await app.register(waWebhookRoutes, {
    db,
    appSecret: TEST_APP_SECRET,
    verifyToken: TEST_VERIFY_TOKEN,
    // CH-02-era tests exercise storage, not the queue — no-op by default.
    enqueue: opts?.enqueue ?? (async () => {}),
    ...(opts?.staff === undefined ? {} : { staff: opts.staff }),
  });
  return app;
}
