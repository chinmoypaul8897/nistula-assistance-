/**
 * App-wide pino logger (plan.md §3.1). Redaction is live from CH-00 (§3.3
 * secrets doctrine): token-shaped keys never reach a sink even if a caller
 * logs a whole config or headers object. Request-id / conversation-id ride on
 * pino child loggers — `logger.child({ conversationId })` — per §3.1.
 */
import { pino, type LoggerOptions } from 'pino';

// The CH-00 security box names the first four; the rest cover both the env
// spelling and the camelCase Config-object spelling so logging a whole
// loadConfig() result is safe. `*.` variants catch keys one level deep,
// which covers every log-call shape we use (logger.info({ config })).
const SECRET_KEYS = [
  'WA_ACCESS_TOKEN',
  'EZEE_AUTH_CODE',
  'ANTHROPIC_API_KEY',
  'authorization',
  'WA_APP_SECRET',
  'WA_VERIFY_TOKEN',
  'DATABASE_URL',
  'ADMIN_BEARER_TOKEN',
  'HEALTHCHECKS_URL',
  'waAccessToken',
  'waAppSecret',
  'waVerifyToken',
  'ezeeAuthCode',
  'anthropicApiKey',
  'databaseUrl',
  'adminBearerToken',
  'healthchecksUrl',
];
const REDACT_PATHS = [
  ...SECRET_KEYS,
  ...SECRET_KEYS.map((key) => `*.${key}`),
  'req.headers.authorization',
];

/** Creates the app logger; tests pass a stream to capture output. */
export function createLogger(stream?: { write: (msg: string) => void }) {
  const options: LoggerOptions = {
    level: process.env.LOG_LEVEL ?? 'info',
    redact: { paths: REDACT_PATHS, censor: '[redacted]' },
  };
  if (stream) return pino(options, stream);
  if (process.env.NODE_ENV === 'development') {
    return pino({ ...options, transport: { target: 'pino-pretty' } });
  }
  return pino(options);
}

/**
 * Guest message bodies may only appear in logs outside production — §3.3 PII
 * discipline hard-guards on NODE_ENV, never on log level alone.
 */
export function loggableBody(body: string): string {
  return process.env.NODE_ENV === 'production' ? '[body withheld in production]' : body;
}

/**
 * One safe line from any thrown value — for logs and raw_events.error.
 * WHY: drizzle wraps query failures in DrizzleQueryError whose MESSAGE
 * embeds every bound parameter ("Failed query: …\nparams: <phone, guest
 * body…>") — persisting or logging it verbatim violates §3.3. Prefer the
 * driver's own message on error.cause; always take the first line only.
 */
export function summarizeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error).slice(0, 200);
  const cause = error.cause;
  const message = cause instanceof Error && cause.message !== '' ? cause.message : error.message;
  const firstLine = message.split('\n', 1)[0] ?? '';
  return `${error.name}: ${firstLine}`.slice(0, 300);
}

// WHY no module-scope singleton: it would read LOG_LEVEL/NODE_ENV at import
// time, BEFORE main() has loaded .env — the level would silently freeze wrong
// (proven in the CH-00 post-merge audit). Call createLogger() at boot time;
// request paths derive children from the fastify instance (app.log).
