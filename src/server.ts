/**
 * Fastify bootstrap (plan.md CH-00 step 4). Routes are schema-validated
 * (§3.1); the only public surface is /health until CH-02 adds the webhook —
 * §3.3 allows nothing else without the admin gate.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Fastify from 'fastify';
import { ConfigError, configSummary, loadConfig } from './config.js';
import { runMigrations } from './db/migrate.js';
import { closeDb, getDb } from './db/client.js';
import { createLogger } from './lib/logger.js';
import { waWebhookRoutes } from './wa/webhook.js';

// package.json is read via require to avoid JSON-module import attributes
// churn across Node versions; the path is stable relative to src/ and dist/.
const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

/** Builds the app without listening — tests inject requests against this. */
export function buildServer() {
  // Logger is constructed at CALL time so it reads env after main() has
  // loaded .env; a module-scope logger froze the level too early.
  const app = Fastify({ loggerInstance: createLogger() });

  app.get(
    '/health',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              version: { type: 'string' },
              uptime: { type: 'number' },
            },
            required: ['ok', 'version', 'uptime'],
            additionalProperties: false,
          },
        },
      },
    },
    async () => ({ ok: true, version, uptime: process.uptime() }),
  );

  return app;
}

async function main(): Promise<void> {
  const config = loadConfig(); // fail-fast before anything listens
  // Phase model (§3.7): the DB feature boots from CH-01, so its variable is
  // required from here on.
  const { databaseUrl, waPhoneNumberId, waAccessToken, waAppSecret, waVerifyToken } = config;
  if (databaseUrl === undefined) {
    throw new ConfigError('DATABASE_URL is required from CH-01 (plan.md §3.7 phase model)');
  }
  // WhatsApp boots from CH-02 — all four WA variables are required now, even
  // the two the server itself doesn't use (fail-fast completeness: a partial
  // set would only surface at the first send).
  if (
    waPhoneNumberId === undefined ||
    waAccessToken === undefined ||
    waAppSecret === undefined ||
    waVerifyToken === undefined
  ) {
    throw new ConfigError(
      'WA_PHONE_NUMBER_ID, WA_ACCESS_TOKEN, WA_APP_SECRET and WA_VERIFY_TOKEN ' +
        'are required from CH-02 (plan.md §3.7 phase model)',
    );
  }
  await runMigrations(databaseUrl); // idempotent, before listen (CH-01)
  const app = buildServer();
  await app.register(waWebhookRoutes, {
    db: getDb(databaseUrl).db,
    appSecret: waAppSecret,
    verifyToken: waVerifyToken,
  });
  app.log.info(`config: ${configSummary(config)}`);

  // TODO(CH-03): stop pg-boss before closing the server on shutdown.
  let shuttingDown = false;
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      if (shuttingDown) return; // both signals can arrive — close only once
      shuttingDown = true;
      app.log.info({ signal }, 'shutting down');
      // WHY the timer: a hung connection must not block a redeploy — exit
      // with a nonzero code before the platform resorts to SIGKILL.
      setTimeout(() => process.exit(1), 10_000).unref();
      app
        .close()
        .then(() => closeDb())
        .then(
          () => process.exit(0),
          (error: unknown) => {
            app.log.error(error, 'error during shutdown');
            process.exit(1);
          },
        );
    });
  }

  await app.listen({ port: config.port, host: '0.0.0.0' });
}

// Start only when executed directly (pnpm dev / node dist), never on import.
// WHY the lowercasing: Windows reports drive letters with inconsistent case.
const entryPath = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : '';
if (entryPath === fileURLToPath(import.meta.url).toLowerCase()) {
  // .env loads only when actually booting — importing buildServer (tests)
  // must stay free of process.env side effects.
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ quiet: true });
  main().catch((error) => {
    // Config errors must reach the console even before any logger exists.
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
