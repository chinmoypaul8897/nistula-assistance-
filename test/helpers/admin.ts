/**
 * Admin-route test rig (CH-09) — the buildWaApp pattern: a bare Fastify with
 * the plugin registered directly, so route behaviour is tested without the
 * server boot (which only mounts the plugin when the flag is on).
 */
import Fastify from 'fastify';
import { pino } from 'pino';
import type { Db } from '../../src/db/client.js';
import { adminRoutes } from '../../src/ops/admin.js';
import type { LogCapture } from './wa.js';

export const TEST_ADMIN_TOKEN = 'test-admin-bearer-token-0123456789';

/** Builds an injectable app with the admin routes registered. */
export async function buildAdminApp(db: Db, capture?: LogCapture, bearerToken?: string) {
  const app = Fastify(
    capture === undefined ? {} : { loggerInstance: pino({ level: 'debug' }, capture.stream) },
  );
  await app.register(adminRoutes, { db, bearerToken: bearerToken ?? TEST_ADMIN_TOKEN });
  return app;
}
