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

/** Everything a handler needs, injected (no module globals). */
export interface ToolContext {
  website: WebsiteClient;
  websiteBaseUrl: string;
  degraded: { record(outcome: 'down' | 'up'): void };
  log: AlertLogger;
  /** Absent ⇒ remember_fact cannot save (contexts with no guest identity). */
  memory?: ToolMemoryContext;
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
