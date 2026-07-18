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
import { createEzeeClient } from './ezee/client.js';
import { getBoss, registerJobs, stopBoss } from './jobs/index.js';
import { createLogger } from './lib/logger.js';
import { istCalendarDay, nowIST } from './lib/time.js';
import { adminRoutes } from './ops/admin.js';
import { configureOpsAlerts } from './ops/alerts.js';
import { configureCostMeter, seedCostMeter } from './ops/costMeter.js';
import { configureHealth, probeHealth } from './ops/health.js';
import { createWaClient } from './wa/client.js';
import { isStaffPhone } from './staff/roster.js';
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
              // CH-17 step 5: internal health, reported not gated — /health stays
              // 200 while the process serves so a degraded external website can
              // never trigger a Railway restart loop. The watchdog owns alerting.
              db: { type: 'boolean' },
              boss: { type: 'boolean' },
              pollerAgeMs: { type: ['number', 'null'] },
              senderAgeMs: { type: ['number', 'null'] },
              degraded: { type: 'boolean' },
            },
            required: ['ok', 'version', 'uptime', 'db', 'boss', 'degraded'],
            additionalProperties: false,
          },
        },
      },
    },
    async () => ({ ok: true, version, uptime: process.uptime(), ...(await probeHealth()) }),
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
  // The eZee mirror boots from CH-10 — base URL and User-Agent carry registry
  // defaults, so only the two credentials can be missing. Required even when
  // the poller is disabled: fetchSingleBooking stays usable (CH-11) and a
  // partial credential set must fail at boot, not at the first live call.
  if (config.ezeeHotelCode === undefined || config.ezeeAuthCode === undefined) {
    throw new ConfigError(
      'EZEE_HOTEL_CODE and EZEE_AUTH_CODE are required from CH-10 (plan.md §3.7 phase model)',
    );
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
    templateMode: config.waTemplateMode,
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
  // CH-17: wire /health + the watchdog probe to the live internals. Poller/sender
  // ages are N/A when their feature is off, so dev (poller off) never alarms.
  configureHealth({
    db,
    boss,
    degraded,
    pollerEnabled: config.ezeePollerEnabled,
    senderEnabled: config.lifecycleSendEnabled,
  });
  // CH-17: alertOps now WhatsApp-delivers to OPS_NUMBERS (log-only until this
  // runs); the cost meter gates Anthropic spend at 2×/4× the daily budget and is
  // SEEDED from cost_events so a redeploy keeps today's tally.
  configureOpsAlerts({ wa, opsNumbers: config.opsNumbers });
  configureCostMeter({ thresholdInr: config.costAlertInrPerDay });
  await seedCostMeter(db, istCalendarDay(nowIST()));
  const toolRegistry = buildToolRegistry();
  // CH-10 eZee mirror: the client always builds (fetchSingleBooking is a
  // CH-11 dependency); whether the 60s poller mounts is the flag's call —
  // registerJobs logs the state loudly either way.
  const ezee = createEzeeClient({
    baseUrl: config.ezeeBaseUrl,
    hotelCode: config.ezeeHotelCode,
    authCode: config.ezeeAuthCode,
    userAgent: config.ezeeUserAgent,
    log: app.log,
  });
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
    healthchecksUrl: config.healthchecksUrl,
    nightStart: config.nightStart,
    nightEnd: config.nightEnd,
    ezee: { client: ezee, pollerEnabled: config.ezeePollerEnabled },
    // CH-12. The gates are fail-closed by construction: an unset LIFECYCLE_EPOCH
    // schedules NOTHING, and LIFECYCLE_SEND_ENABLED=0 sends nothing even when
    // rows exist. Merging this chunk cannot, on its own, message anybody.
    lifecycle: {
      gates: { epoch: config.lifecycleEpoch, sources: config.lifecycleSources },
      sendEnabled: config.lifecycleSendEnabled,
    },
    // CH-13a. Always mounted, even with an EMPTY roster — which is dev's
    // standing state and production's today. An empty roster is not the same
    // as an unmounted chunk: it fails closed on its own (assignFor returns
    // null, the card reaches nobody, the task is recorded as notify_failed and
    // guardrail 2 refuses every claim about it), while leaving it unmounted
    // would make the tool silently absent and the honesty untestable.
    staff: { roster: { members: config.staffRoster, opsNumbers: config.opsNumbers } },
    // CH-16 draft mode. DRAFT_MODE defaults true, so unless AUTO_SEND_TYPES
    // unlocks a type the AI drafts for ops approval rather than replying direct.
    // 🚨 On the live test number, keep replies DIRECT until the draft demo is run
    // deliberately by setting AUTO_SEND_TYPES to all four types (runbook).
    draftMode: config.draftMode,
    autoSendTypes: config.autoSendTypes,
  });
  await app.register(waWebhookRoutes, {
    db,
    appSecret: waAppSecret,
    verifyToken: waVerifyToken,
    enqueue: jobs.enqueueConversationProcess,
    // §3.3: roster wins over guest — a staff number never gets an AI
    // conversation. Built from the SAME normalised roster the assigner uses,
    // so the two can never disagree about who is staff.
    staff: {
      isStaffPhone: (phone) =>
        isStaffPhone({ members: config.staffRoster, opsNumbers: config.opsNumbers }, phone),
      enqueueCommand: jobs.enqueueStaffCommand,
    },
    // CH-14a: the prod `smb_message_echoes` takeover path.
    coexistence: jobs.coexistence,
  });
  // CH-09: admin routes mount ONLY when enabled — unmounted means Fastify's
  // default 404, indistinguishable from a route that never existed (§3.3 "no
  // public surface"). loadConfig guarantees a ≥16-char token when enabled.
  if (config.adminRoutesEnabled && config.adminBearerToken !== undefined) {
    // CH-14a: the dev human-takeover sim shares the coexistence core.
    await app.register(adminRoutes, {
      db,
      bearerToken: config.adminBearerToken,
      coexistence: jobs.coexistence,
    });
    app.log.info('admin routes enabled');
  }
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
