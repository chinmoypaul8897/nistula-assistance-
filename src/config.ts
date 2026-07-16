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
import { istWallClockToInstant } from './lib/time.js';

// Range-checked HH:mm — a "25:00" must fail BOOT, not the first night-window
// call inside message handling.
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
// IST wall clock for FAKE_NOW_IST — time part range-checked like HHMM, date
// part verified against the real calendar (Date.UTC silently rolls Feb 31 →
// Mar 3; a typo'd fake clock would test the wrong month).
const IST_WALL_CLOCK = /^\d{4}-\d{2}-\d{2}[T ]([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

function hasRealCalendarDate(wallClock: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(wallClock);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

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
  // Default OFF (CH-10 split-brain guard): eZee's un-ACKed queue is shared
  // per AuthCode — a dev poller would consume and ACK REAL bookings the
  // production mirror then never sees. Only Railway sets 1. New §3.7
  // registry var (recorded CH-10 deviation, pending the plan.md fold-in).
  EZEE_POLLER_ENABLED: z.enum(['0', '1']).default('0'),
  // ── CH-12 lifecycle gates. New §3.7 registry vars (recorded deviation). ───
  // Default OFF. Merging CH-12 to main must not, by itself, start messaging
  // real people: the flag is a human's hand on the switch, flipped only after
  // the backlog is purged and the gates are seen to hold in production.
  LIFECYCLE_SEND_ENABLED: z.enum(['0', '1']).default('0'),
  // The cutover INSTANT (IST wall clock). Bookings first mirrored before it get
  // no lifecycle, ever. This is what makes CH-11's 123 hydrated historical rows
  // — and every real booking that predates this chunk — inert. UNSET ⇒ nothing
  // is scheduled at all: "no epoch" can only ever fail closed.
  // WHY an instant and not a date: 134 of production's mirror rows were created
  // on the cutover DAY itself, so a date would have let all of them through.
  LIFECYCLE_EPOCH: z
    .string()
    .regex(IST_WALL_CLOCK)
    .refine(hasRealCalendarDate, 'date does not exist on the calendar')
    .optional(),
  // Booking sources we are allowed to message. The fail-closed answer to the
  // unanswered Q13 ("may we WhatsApp guests who booked via Airbnb?"): direct
  // only. NOT theoretical — production holds 12 Airbnb/Booking.com guests with
  // real, unmasked phone numbers arriving soon.
  LIFECYCLE_SOURCES: z.string().default('Internet Booking Engine,Walk-in'),
  // Real Meta templates, or free-form simulation? Approval belongs to the real
  // number's WABA, which does not exist yet — so dev simulates. Nothing branches
  // on NODE_ENV, only on this (§5.3).
  WA_TEMPLATE_MODE: z.enum(['simulate', 'send']).default('simulate'),
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
  FAKE_NOW_IST: z
    .string()
    .regex(IST_WALL_CLOCK)
    .refine(hasRealCalendarDate, 'date does not exist on the calendar')
    .optional(),
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
  ezeePollerEnabled: boolean;
  lifecycleSendEnabled: boolean;
  /** The cutover instant, already resolved from IST wall clock to a UTC Date. */
  lifecycleEpoch: Date | undefined;
  /** Lower-cased, for a case-insensitive compare against eZee's free-text source. */
  lifecycleSources: string[];
  waTemplateMode: 'simulate' | 'send';
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
  // dotenv and Railway deliver blank lines ("VAR=") as '' — treat as unset so
  // registry defaults apply (zod .default() only fires on undefined).
  const cleaned = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value !== ''),
  );
  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
    throw new ConfigError(`Invalid environment:\n${lines.join('\n')}`);
  }
  const raw = parsed.data;

  // FAKE_NOW_IST is a dev/test lever only — production must never boot with it (§3.7).
  if (raw.NODE_ENV === 'production' && raw.FAKE_NOW_IST !== undefined) {
    throw new ConfigError('FAKE_NOW_IST must not be set in production (plan.md §3.7)');
  }

  // §3.3: admin routes need BOTH halves — the flag AND a real token. An
  // enabled-but-tokenless (or trivially short) configuration must never boot
  // rather than mount an unguardable route (CH-09).
  if (
    raw.ADMIN_ROUTES_ENABLED === '1' &&
    (raw.ADMIN_BEARER_TOKEN === undefined || raw.ADMIN_BEARER_TOKEN.length < 16)
  ) {
    throw new ConfigError(
      'ADMIN_ROUTES_ENABLED=1 requires ADMIN_BEARER_TOKEN of at least 16 characters (§3.3)',
    );
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
    ezeePollerEnabled: raw.EZEE_POLLER_ENABLED === '1',
    lifecycleSendEnabled: raw.LIFECYCLE_SEND_ENABLED === '1',
    lifecycleEpoch:
      raw.LIFECYCLE_EPOCH === undefined ? undefined : istWallClockToInstant(raw.LIFECYCLE_EPOCH),
    lifecycleSources: raw.LIFECYCLE_SOURCES.split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0),
    waTemplateMode: raw.WA_TEMPLATE_MODE,
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
  const numbers: string[] = [];
  for (const entry of (csv ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '')) {
    const normal = normalizePhone(entry);
    if (normal === null) {
      throw new ConfigError(`OPS_NUMBERS entry not normalisable to E.164: "${entry}"`);
    }
    // The same person spelled two ways must not mean double alerts later.
    if (!numbers.includes(normal)) numbers.push(normal);
  }
  return numbers;
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
  // Two roster members sharing one phone would make staff-command matching
  // (CH-13/14, normalised-vs-normalised) ambiguous — refuse at boot.
  const nameByPhone = new Map<string, string>();
  return parsed.data.map((member) => {
    const normal = normalizePhone(member.phone);
    if (normal === null) {
      throw new ConfigError(
        `STAFF_ROSTER_JSON phone not normalisable to E.164: "${member.phone}" (${member.name})`,
      );
    }
    const existing = nameByPhone.get(normal);
    if (existing !== undefined) {
      throw new ConfigError(
        `STAFF_ROSTER_JSON: "${existing}" and "${member.name}" share one phone number`,
      );
    }
    nameByPhone.set(normal, member.name);
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
    `EZEE_POLLER_ENABLED=${config.ezeePollerEnabled}`,
    `LIFECYCLE_SEND_ENABLED=${config.lifecycleSendEnabled}`,
    `LIFECYCLE_EPOCH=${config.lifecycleEpoch?.toISOString() ?? 'unset (nothing will be scheduled)'}`,
    `LIFECYCLE_SOURCES=${config.lifecycleSources.join('|')}`,
    `WA_TEMPLATE_MODE=${config.waTemplateMode}`,
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
