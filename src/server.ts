/**
 * Fastify bootstrap (plan.md CH-00 step 4). Routes are schema-validated
 * (§3.1); the only public surface is /health until CH-02 adds the webhook —
 * §3.3 allows nothing else without the admin gate.
 */
import 'dotenv/config';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Fastify from 'fastify';
import { configSummary, loadConfig } from './config.js';
import { logger } from './lib/logger.js';

// package.json is read via require to avoid JSON-module import attributes
// churn across Node versions; the path is stable relative to src/ and dist/.
const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

/** Builds the app without listening — tests inject requests against this. */
export function buildServer() {
  const app = Fastify({ loggerInstance: logger });

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
  const app = buildServer();
  app.log.info(`config: ${configSummary(config)}`);

  // TODO(CH-03): stop pg-boss before closing the server on shutdown.
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      app.log.info({ signal }, 'shutting down');
      void app.close().then(() => process.exit(0));
    });
  }

  await app.listen({ port: config.port, host: '0.0.0.0' });
}

// Start only when executed directly (pnpm dev / node dist), never on import.
// WHY the lowercasing: Windows reports drive letters with inconsistent case.
const entryPath = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : '';
if (entryPath === fileURLToPath(import.meta.url).toLowerCase()) {
  main().catch((error) => {
    // Config errors must reach the console even before any logger exists.
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
