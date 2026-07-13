/**
 * Tool framework (plan.md §6.4, CH-05 step 2). Each tool is a zod input schema,
 * its JSON-schema projection for the Anthropic `tools` param, and a handler that
 * returns `{ok, data|error}` and NEVER throws into the model — a bad input or an
 * ambiguous villa is a tool result the model can act on, not an exception. The
 * worker's tool loop (worker.ts) calls `run()`; guardrails read the accumulated
 * `ToolRun[]`.
 */
import { z } from 'zod';
import type { Db } from '../../db/client.js';
import type { AlertLogger } from '../../ops/alerts.js';
import type { StayView } from '../stayView.js';
import type { WebsiteClient } from './websiteApi.js';

/** Friendly, model-facing error enum (§6.4). Kept small and stable.
 * REFUSED (CH-09): a screened-out remember_fact save — distinct from INVALID
 * so telemetry can count poisoning attempts, and ok:false by design so a
 * refused save can never license a memory claim (guardrail 2 C4). */
export type ToolErrorCode =
  | 'INVALID'
  | 'UNKNOWN_VILLA'
  | 'AMBIGUOUS_VILLA'
  | 'UNAVAILABLE'
  | 'UPSTREAM_DOWN'
  | 'UNKNOWN_TOOL'
  | 'REFUSED';

export type ToolResult =
  | { ok: true; data: unknown; note?: 'MIN_NIGHTS' }
  | { ok: false; error: ToolErrorCode; message?: string; data?: unknown };

/** One executed tool call — accumulated for guardrail 1 + `raw.toolRuns` audit. */
export interface ToolRun {
  name: string;
  input: unknown;
  result: ToolResult;
}

/**
 * Per-TURN memory identity (CH-09). The registry itself is built once at boot
 * (specs are part of the cached prompt prefix), so anything per-turn rides the
 * ToolContext: turn.ts builds ONE object per turn and shares it across the
 * first and regenerate loops — which is exactly what lets `saves` cap the
 * whole turn at 2, not 2 per loop.
 */
export interface ToolMemoryContext {
  db: Db;
  guestId: string;
  conversationId: string;
  /** Newest guest message of the batch — guest_facts.source_message_id provenance. */
  sourceMessageId: string | null;
  /** Mutable per-turn save counter (max 2 per turn, plan §8 CH-09 step 2). */
  saves: { count: number };
}

/**
 * Per-TURN booking identity (CH-11) — the get_booking half of the same pattern.
 *
 * `guestText` is the load-bearing field and the reason this group exists: §6.4
 * requires the GUEST to state the booking name and check-in date, but tool
 * ARGUMENTS are authored by the model, which can read the (attacker-chosen)
 * WhatsApp profile name straight out of block [5]. So the secret is never a tool
 * argument — the handler corroborates OUR stored record against the words the
 * guest actually typed this turn, which arrive here and nowhere else.
 */
export interface ToolBookingContext {
  db: Db;
  guestId: string;
  /** The claimant's E.164 — the 3-strikes counter is keyed on the phone. */
  guestPhone: string;
  /** ONLY the guest's own typed words from this batch. Never the model's text,
   * never the profile name, never a saved fact, never the rolling summary. */
  guestText: string;
  /** This guest's stays, already projected (the worker's single read). */
  stays: readonly StayView[];
  /** Today's IST calendar day, from the DB clock — the SAME clock block [6]
   * prints and the stage is derived from. A handler calling new Date() would be
   * a second clock, and could sort a stay differently from the prompt the model
   * is reading in the same turn. */
  today: string;
  /** Mutable per-turn latch. The tool loop RE-RUNS on a guardrail regenerate
   * (and one round may carry parallel calls), so without this an honest typo
   * would burn two strikes and the model could walk a range of reservation
   * numbers inside one turn. Once refused, every later call in either loop
   * returns the same frozen value with no DB read at all.
   *
   * The DB WRITES are deferred to the worker's POST-CLAIM path (pre-push audit:
   * a pre-claim strike violates CH-03 D2 — a converse() failure later in the
   * turn would pg-boss-retry the whole loop and double-charge an honest guest
   * toward the lockout). The tool sets these SIGNALS; the worker records them
   * once, on the winning claim only. */
  claim: {
    /** A claim was already refused this turn — every later one is free and mute. */
    refused: boolean;
    /** A distinct reference was already claimed this turn (cap: one). */
    attempted: string | null;
    /** How a refusal must reach a human, or null. `booking_reference` = someone
     * quoted a reference that could not be verified as theirs (a probe or a
     * typo); `booking_undescribable` = a VERIFIED owner whose booking we may not
     * describe (cancelled/multi-room). The two must NOT collapse into one — an
     * owner asking about their own cancelled booking is not an identity probe. */
    escalateReason: 'booking_reference' | 'booking_undescribable' | null;
    /** The reference to record a `refused` STRIKE for (counts toward lockout).
     * Null on a verified/owner path — those never strike. Worker writes it. */
    strikeReference: string | null;
    /** A reference we verified+linked this turn — the `linked` audit row the
     * worker writes post-claim. */
    linkedReference: string | null;
  };
}

/** Everything a handler needs, injected (no module globals). */
export interface ToolContext {
  website: WebsiteClient;
  websiteBaseUrl: string;
  degraded: { record(outcome: 'down' | 'up'): void };
  /** AlertLogger (error) plus an OPTIONAL warn — the worker always passes a full
   * pino logger; the pure test contexts pass an error-only stub. CH-11 wants a
   * warn for a refused claim without dragging in the ops-alert channel. */
  log: AlertLogger & { warn?: (obj: Record<string, unknown>, msg?: string) => void };
  /** Absent ⇒ remember_fact cannot save (contexts with no guest identity). */
  memory?: ToolMemoryContext;
  /** Absent ⇒ get_booking cannot answer (contexts with no guest identity). */
  booking?: ToolBookingContext;
}

/** The Anthropic tool spec shape (a JSON-schema input_schema). */
export interface ToolSpec {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: unknown, ctx: ToolContext) => Promise<ToolResult>;
}

export interface ToolRegistry {
  /** Anthropic tool specs for the `tools` param (empty ⇒ caller omits `tools`). */
  specs(): ToolSpec[];
  /** Runs a tool by name; unknown names and bad input become tool RESULTS, never throws. */
  run(name: string, input: unknown, ctx: ToolContext): Promise<ToolResult>;
}

/**
 * zod v4 → Anthropic input_schema. Strips the `$schema` marker and drops any
 * defaulted field from `required` so the model sees optional-with-default inputs
 * (children, plan) as optional rather than mandatory.
 */
export function toInputSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  const props = json.properties as Record<string, { default?: unknown }> | undefined;
  if (Array.isArray(json.required) && props !== undefined) {
    json.required = (json.required as string[]).filter(
      (key) => !(key in props && 'default' in (props[key] ?? {})),
    );
  }
  return json;
}

/** Builds a registry over the given tool definitions. */
export function createToolRegistry(defs: ToolDef[]): ToolRegistry {
  const byName = new Map(defs.map((d) => [d.name, d]));
  const specs: ToolSpec[] = defs.map((d) => ({
    name: d.name,
    description: d.description,
    input_schema: toInputSchema(d.inputSchema),
  }));

  return {
    specs() {
      return specs;
    },
    async run(name, input, ctx) {
      const def = byName.get(name);
      if (def === undefined) {
        return { ok: false, error: 'UNKNOWN_TOOL', message: `no such tool: ${name}` };
      }
      const parsed = def.inputSchema.safeParse(input);
      if (!parsed.success) {
        // Never throw into the model — a validation miss is a result it retries.
        return { ok: false, error: 'INVALID', message: firstIssue(parsed.error) };
      }
      return def.handler(parsed.data, ctx);
    },
  };
}

function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (issue === undefined) return 'invalid input';
  const path = issue.path.join('.');
  return path === '' ? issue.message : `${path}: ${issue.message}`;
}
