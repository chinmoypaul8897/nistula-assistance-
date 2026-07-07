/**
 * Environment configuration. plan.md §3.7 is the single-source registry —
 * add variables THERE first, then here. Zod-validated, fail-fast at boot
 * (CH-00 step 2). Phase model: only NODE_ENV and PORT are hard-required now;
 * each later feature validates its own variables when it boots (DATABASE_URL
 * at CH-01, WA_* at CH-02, …) — they parse here when present so a typo fails
 * loudly rather than lying dormant.
 */
import { z } from 'zod';
import { normalizePhone } from './lib/phone.js';

const HHMM = /^\d{2}:\d{2}$/;

const staffMemberSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  role: z.enum(['housekeeping', 'maintenance', 'frontdesk']),
  villas: z.array(z.string()),
});

// Raw-string view of §3.7. Defaults are the registry's inline defaults.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535),
  TZ: z.string().default('Asia/Kolkata'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  DATABASE_URL: z.string().optional(), // required from CH-01
  ANTHROPIC_API_KEY: z.string().optional(), // required from CH-04
  MODEL_ID: z.string().default('claude-sonnet-4-5'),
  MODEL_ID_LIGHT: z.string().optional(),
  GRAPH_BASE_URL: z.url().default('https://graph.facebook.com/v23.0'),
  WA_PHONE_NUMBER_ID: z.string().optional(), // WA_* required from CH-02
  WA_ACCESS_TOKEN: z.string().optional(),
  WA_APP_SECRET: z.string().optional(),
  WA_VERIFY_TOKEN: z.string().optional(),
  WEBSITE_BASE_URL: z.url().optional(), // required from CH-05
  EZEE_BASE_URL: z.url().default('https://live.ipms247.com'),
  EZEE_HOTEL_CODE: z.string().optional(), // EZEE_* required from CH-10
  EZEE_AUTH_CODE: z.string().optional(),
  EZEE_USER_AGENT: z.string().default('openAPI-Nistula'),
  OPS_NUMBERS: z.string().optional(),
  STAFF_ROSTER_JSON: z.string().optional(),
  DRAFT_MODE: z.enum(['true', 'false']).default('true'),
  AUTO_SEND_TYPES: z.string().default(''),
  NIGHT_START: z.string().regex(HHMM).default('20:00'),
  NIGHT_END: z.string().regex(HHMM).default('10:00'),
  ADMIN_BEARER_TOKEN: z.string().optional(),
  ADMIN_ROUTES_ENABLED: z.enum(['0', '1']).default('0'),
  HEALTHCHECKS_URL: z.url().optional(),
  COST_ALERT_INR_PER_DAY: z.coerce.number().positive().default(1000),
  FAKE_NOW_IST: z.string().optional(),
});

export interface StaffMember {
  name: string;
  phone: string;
  role: 'housekeeping' | 'maintenance' | 'frontdesk';
  villas: string[];
}

export interface Config {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  tz: string;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  databaseUrl: string | undefined;
  anthropicApiKey: string | undefined;
  modelId: string;
  modelIdLight: string | undefined;
  graphBaseUrl: string;
  waPhoneNumberId: string | undefined;
  waAccessToken: string | undefined;
  waAppSecret: string | undefined;
  waVerifyToken: string | undefined;
  websiteBaseUrl: string | undefined;
  ezeeBaseUrl: string;
  ezeeHotelCode: string | undefined;
  ezeeAuthCode: string | undefined;
  ezeeUserAgent: string;
  opsNumbers: string[];
  staffRoster: StaffMember[];
  draftMode: boolean;
  autoSendTypes: string[];
  nightStart: string;
  nightEnd: string;
  adminBearerToken: string | undefined;
  adminRoutesEnabled: boolean;
  healthchecksUrl: string | undefined;
  costAlertInrPerDay: number;
  fakeNowIst: string | undefined;
}

export class ConfigError extends Error {}

/** Validates env (default process.env) into the typed Config; throws ConfigError listing every problem. */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
    throw new ConfigError(`Invalid environment:\n${lines.join('\n')}`);
  }
  const raw = parsed.data;

  // FAKE_NOW_IST is a dev/test lever only — production must never boot with it (§3.7).
  if (raw.NODE_ENV === 'production' && raw.FAKE_NOW_IST !== undefined && raw.FAKE_NOW_IST !== '') {
    throw new ConfigError('FAKE_NOW_IST must not be set in production (plan.md §3.7)');
  }

  return {
    nodeEnv: raw.NODE_ENV,
    port: raw.PORT,
    tz: raw.TZ,
    logLevel: raw.LOG_LEVEL,
    databaseUrl: raw.DATABASE_URL,
    anthropicApiKey: raw.ANTHROPIC_API_KEY,
    modelId: raw.MODEL_ID,
    modelIdLight: raw.MODEL_ID_LIGHT,
    graphBaseUrl: raw.GRAPH_BASE_URL,
    waPhoneNumberId: raw.WA_PHONE_NUMBER_ID,
    waAccessToken: raw.WA_ACCESS_TOKEN,
    waAppSecret: raw.WA_APP_SECRET,
    waVerifyToken: raw.WA_VERIFY_TOKEN,
    websiteBaseUrl: raw.WEBSITE_BASE_URL,
    ezeeBaseUrl: raw.EZEE_BASE_URL,
    ezeeHotelCode: raw.EZEE_HOTEL_CODE,
    ezeeAuthCode: raw.EZEE_AUTH_CODE,
    ezeeUserAgent: raw.EZEE_USER_AGENT,
    opsNumbers: parseOpsNumbers(raw.OPS_NUMBERS),
    staffRoster: parseStaffRoster(raw.STAFF_ROSTER_JSON),
    draftMode: raw.DRAFT_MODE === 'true',
    autoSendTypes: raw.AUTO_SEND_TYPES.split(',')
      .map((s) => s.trim())
      .filter((s) => s !== ''),
    nightStart: raw.NIGHT_START,
    nightEnd: raw.NIGHT_END,
    adminBearerToken: raw.ADMIN_BEARER_TOKEN,
    adminRoutesEnabled: raw.ADMIN_ROUTES_ENABLED === '1',
    healthchecksUrl: raw.HEALTHCHECKS_URL,
    costAlertInrPerDay: raw.COST_ALERT_INR_PER_DAY,
    fakeNowIst: raw.FAKE_NOW_IST,
  };
}

// §3.3 roster integrity: staff/ops phones normalise at config load or boot FAILS.
function parseOpsNumbers(csv: string | undefined): string[] {
  return (csv ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '')
    .map((entry) => {
      const normal = normalizePhone(entry);
      if (normal === null) {
        throw new ConfigError(`OPS_NUMBERS entry not normalisable to E.164: "${entry}"`);
      }
      return normal;
    });
}

function parseStaffRoster(json: string | undefined): StaffMember[] {
  if (json === undefined || json.trim() === '') return [];
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new ConfigError('STAFF_ROSTER_JSON is not valid JSON');
  }
  const parsed = z.array(staffMemberSchema).safeParse(value);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`);
    throw new ConfigError(`STAFF_ROSTER_JSON invalid:\n${lines.join('\n')}`);
  }
  return parsed.data.map((member) => {
    const normal = normalizePhone(member.phone);
    if (normal === null) {
      throw new ConfigError(
        `STAFF_ROSTER_JSON phone not normalisable to E.164: "${member.phone}" (${member.name})`,
      );
    }
    return { ...member, phone: normal };
  });
}

/**
 * Secret-free boot summary (CH-00 step 2): plain values for the harmless,
 * set/unset presence for secrets and PII-bearing variables — never values.
 */
export function configSummary(config: Config): string {
  const presence = (value: string | undefined) =>
    value === undefined || value === '' ? 'unset' : 'set';
  return [
    `NODE_ENV=${config.nodeEnv}`,
    `PORT=${config.port}`,
    `TZ=${config.tz}`,
    `LOG_LEVEL=${config.logLevel}`,
    `DATABASE_URL=${presence(config.databaseUrl)}`,
    `ANTHROPIC_API_KEY=${presence(config.anthropicApiKey)}`,
    `MODEL_ID=${config.modelId}`,
    `MODEL_ID_LIGHT=${config.modelIdLight ?? 'unset'}`,
    `GRAPH_BASE_URL=${config.graphBaseUrl}`,
    `WA_PHONE_NUMBER_ID=${presence(config.waPhoneNumberId)}`,
    `WA_ACCESS_TOKEN=${presence(config.waAccessToken)}`,
    `WA_APP_SECRET=${presence(config.waAppSecret)}`,
    `WA_VERIFY_TOKEN=${presence(config.waVerifyToken)}`,
    `WEBSITE_BASE_URL=${config.websiteBaseUrl ?? 'unset'}`,
    `EZEE_BASE_URL=${config.ezeeBaseUrl}`,
    `EZEE_HOTEL_CODE=${presence(config.ezeeHotelCode)}`,
    `EZEE_AUTH_CODE=${presence(config.ezeeAuthCode)}`,
    `EZEE_USER_AGENT=${config.ezeeUserAgent}`,
    `OPS_NUMBERS=${config.opsNumbers.length} number(s)`,
    `STAFF_ROSTER_JSON=${config.staffRoster.length} member(s)`,
    `DRAFT_MODE=${config.draftMode}`,
    `AUTO_SEND_TYPES=${config.autoSendTypes.join(',') || '(none)'}`,
    `NIGHT_START=${config.nightStart}`,
    `NIGHT_END=${config.nightEnd}`,
    `ADMIN_BEARER_TOKEN=${presence(config.adminBearerToken)}`,
    `ADMIN_ROUTES_ENABLED=${config.adminRoutesEnabled}`,
    `HEALTHCHECKS_URL=${presence(config.healthchecksUrl)}`,
    `COST_ALERT_INR_PER_DAY=${config.costAlertInrPerDay}`,
    `FAKE_NOW_IST=${config.fakeNowIst ?? 'unset'}`,
  ].join(' · ');
}
