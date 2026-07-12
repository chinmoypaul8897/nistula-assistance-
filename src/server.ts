/**
 * Fastify bootstrap (plan.md CH-00 step 4). Routes are schema-validated
 * (§3.1); the only public surface is /health until CH-02 adds the webhook —
 * §3.3 allows nothing else without the admin gate.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Fastify from 'fastify';
import { createConverse } from './brain/claude.js';
import { loadKnowledge } from './brain/knowledge.js';
import { buildToolRegistry } from './brain/tools/index.js';
import { createDegradedTracker } from './brain/tools/degraded.js';
import { createWebsiteClient } from './brain/tools/websiteApi.js';
import { ConfigError, configSummary, loadConfig } from './config.js';
import { runMigrations } from './db/migrate.js';
import { closeDb, getDb } from './db/client.js';
import { getBoss, registerJobs, stopBoss } from './jobs/index.js';
import { createLogger } from './lib/logger.js';
import { createWaClient } from './wa/client.js';
import { waWebhookRoutes } from './wa/webhook.js';

// package.json is read via require to avoid JSON-module import attributes
// churn across Node versions; the path is stable relative to src/ and dist/.
const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

/** Builds the app without listening — tests inject requests against this (optionally capturing logs). */
export function buildServer(logStream?: { write: (msg: string) => void }) {
  // Logger is constructed at CALL time so it reads env after main() has
  // loaded .env; a module-scope logger froze the level too early.
  // WHY disableRequestLogging: Fastify's own request log prints the FULL
  // URL — Meta's webhook handshake carries WA_VERIFY_TOKEN in the query
  // string, which landed verbatim in production logs (found live, CH-02).
  // The onResponse hook below restores per-request logs, query-stripped.
  const app = Fastify({ loggerInstance: createLogger(logStream), disableRequestLogging: true });

  app.addHook('onResponse', (request, reply, done) => {
    request.log.info(
      {
        method: request.method,
        path: request.url.split('?')[0],
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
      },
      'request completed',
    );
    done();
  });

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
  // The brain boots from CH-04 — it cannot speak without a key (MODEL_ID has a
  // registry default, so only the key can be missing).
  if (config.anthropicApiKey === undefined) {
    throw new ConfigError('ANTHROPIC_API_KEY is required from CH-04 (plan.md §3.7 phase model)');
  }
  // The price tools boot from CH-05 — they can only call the website origin, so
  // WEBSITE_BASE_URL must be present (dev: the vercel preview).
  if (config.websiteBaseUrl === undefined) {
    throw new ConfigError('WEBSITE_BASE_URL is required from CH-05 (plan.md §3.7 phase model)');
  }
  await runMigrations(databaseUrl); // idempotent, before listen (CH-01)
  const app = buildServer();
  const { db } = getDb(databaseUrl);
  // Queue + workers boot BEFORE listen (CH-03): a webhook that acks before
  // the boss is started would enqueue into nothing.
  const boss = getBoss(databaseUrl);
  await boss.start();
  const wa = createWaClient({
    db,
    log: app.log,
    graphBaseUrl: config.graphBaseUrl,
    phoneNumberId: waPhoneNumberId,
    accessToken: waAccessToken,
  });
  const converse = createConverse({
    apiKey: config.anthropicApiKey,
    modelId: config.modelId,
    log: app.log,
  });
  // The summariser's client (CH-08, §6.1): MODEL_ID_LIGHT when set, else the
  // main model — createConverse binds ONE model id at construction.
  const converseLight =
    config.modelIdLight === undefined
      ? converse
      : createConverse({ apiKey: config.anthropicApiKey, modelId: config.modelIdLight, log: app.log });
  // CH-05 price tools: one website client (the origin allowlist), one shared
  // degraded tracker (process-global health), the tool registry.
  const website = createWebsiteClient({ baseUrl: config.websiteBaseUrl, log: app.log });
  const degraded = createDegradedTracker({ log: app.log });
  const toolRegistry = buildToolRegistry();
  // Block [3] KNOWLEDGE (CH-06): load once, fail-fast if over the token budget
  // — BEFORE registerJobs since CH-08 threads it through the worker deps.
  const kb = loadKnowledge();
  const jobs = await registerJobs({
    boss,
    db,
    wa,
    log: app.log,
    converse,
    converseLight,
    toolRegistry,
    website,
    websiteBaseUrl: config.websiteBaseUrl,
    degraded,
    knowledge: kb,
    opsNumbers: config.opsNumbers,
    nightStart: config.nightStart,
    nightEnd: config.nightEnd,
  });
  await app.register(waWebhookRoutes, {
    db,
    appSecret: waAppSecret,
    verifyToken: waVerifyToken,
    enqueue: jobs.enqueueConversationProcess,
  });
  app.log.info(`config: ${configSummary(config)}`);
  // Log the kb version so a kb change is visible against the cache/cost logs.
  app.log.info(
    { kbVersion: kb.version, kbTokens: kb.tokens, quirksPresent: kb.quirksPresent },
    'knowledge base loaded',
  );

  let shuttingDown = false;
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      if (shuttingDown) return; // both signals can arrive — close only once
      shuttingDown = true;
      app.log.info({ signal }, 'shutting down');
      // WHY the timer: a hung connection must not block a redeploy — exit
      // with a nonzero code before the platform resorts to SIGKILL. 30s
      // clears the 25s boss drain below (CH-03).
      setTimeout(() => process.exit(1), 30_000).unref();
      app
        .close()
        // Drain active jobs before their pool closes — a worker mid-turn
        // gets its bounded grace, then failWip marks leftovers for retry.
        .then(() => stopBoss())
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
