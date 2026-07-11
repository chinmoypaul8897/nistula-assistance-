/**
 * The Anthropic client (plan.md §5.5). The SDK's own retry is DISABLED
 * (maxRetries:0) and we retry with lib/http.ts's doctrine — 3 tries,
 * full-jitter backoff on 5xx/429/connection — plus a total deadline so one
 * turn can never outlive the pg-boss expire (the CH-04 half of CH-03 D2's
 * internal-deadline gate; the expire raise itself is deferred to CH-05's tool
 * loop). converse() returns text + usage; hard failure throws, and the worker
 * turns that into "no reply, ops alerted, sweeper retries" (§6.6).
 */
import Anthropic from '@anthropic-ai/sdk';
import { summarizeError } from '../lib/logger.js';
import type { ConverseUsage } from './cost.js';
import type { SystemBlock } from './prompt.js';

export interface ConverseInput {
  system: SystemBlock[];
  messages: { role: 'user' | 'assistant'; content: string }[];
}

export interface ConverseResult {
  text: string;
  usage: ConverseUsage;
}

export type ConverseFn = (input: ConverseInput) => Promise<ConverseResult>;

interface ConverseLogger {
  warn: (obj: Record<string, unknown>, msg?: string) => void;
}

/** The single create call — isolated so tests inject a fake with no real client/key. */
type CreateMessage = (
  params: Anthropic.MessageCreateParamsNonStreaming,
  options: { timeout: number },
) => Promise<Anthropic.Message>;

export interface ConverseDeps {
  apiKey: string | undefined;
  modelId: string;
  log: ConverseLogger;
  // Test seams — all default to the real SDK / real timers.
  createMessage?: CreateMessage;
  sleepImpl?: (ms: number) => Promise<void>;
  randomImpl?: () => number;
  maxTries?: number;
  perTryTimeoutMs?: number;
  totalDeadlineMs?: number;
}

const DEFAULT_MAX_TRIES = 3;
const DEFAULT_PER_TRY_TIMEOUT_MS = 30_000;
const DEFAULT_TOTAL_DEADLINE_MS = 55_000;
const BACKOFF_BASE_MS = 300;
const MAX_TOKENS = 1024;
const TEMPERATURE = 0.7;

const realSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function createConverse(deps: ConverseDeps): ConverseFn {
  const maxTries = deps.maxTries ?? DEFAULT_MAX_TRIES;
  const perTryTimeoutMs = deps.perTryTimeoutMs ?? DEFAULT_PER_TRY_TIMEOUT_MS;
  const totalDeadlineMs = deps.totalDeadlineMs ?? DEFAULT_TOTAL_DEADLINE_MS;
  const sleep = deps.sleepImpl ?? realSleep;
  const random = deps.randomImpl ?? Math.random;

  let createMessage = deps.createMessage;
  if (createMessage === undefined) {
    if (deps.apiKey === undefined || deps.apiKey === '') {
      throw new Error('createConverse: ANTHROPIC_API_KEY is required from CH-04');
    }
    // maxRetries:0 — our loop owns retries; the SDK must not double them.
    const client = new Anthropic({ apiKey: deps.apiKey, maxRetries: 0 });
    createMessage = (params, options) => client.messages.create(params, options);
  }
  const call = createMessage;

  return async function converse(input: ConverseInput): Promise<ConverseResult> {
    const params: Anthropic.MessageCreateParamsNonStreaming = {
      model: deps.modelId,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: input.system,
      messages: input.messages,
    };
    const deadline = Date.now() + totalDeadlineMs;
    let lastError: unknown;
    for (let attempt = 0; attempt < maxTries; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break; // deadline exhausted — stop before another try
      try {
        const message = await call(params, {
          timeout: Math.min(perTryTimeoutMs, remaining),
        });
        return parseMessage(message);
      } catch (error) {
        lastError = error;
        if (!isRetryable(error) || attempt === maxTries - 1) throw error;
        deps.log.warn(
          { attempt: attempt + 1, err: summarizeError(error) },
          'anthropic call failed — retrying',
        );
        const backoff = Math.min(
          Math.floor(random() * BACKOFF_BASE_MS * 2 ** attempt),
          Math.max(0, deadline - Date.now()),
        );
        await sleep(backoff);
      }
    }
    throw lastError ?? new Error('converse: deadline exhausted before any attempt');
  };
}

/** 5xx / 429 / connection (incl. timeout) are transient; 4xx and bugs are not. */
export function isRetryable(error: unknown): boolean {
  if (error instanceof Anthropic.APIConnectionError) return true;
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' && (status === 429 || status >= 500);
}

function parseMessage(message: Anthropic.Message): ConverseResult {
  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
  const { usage } = message;
  return {
    text,
    usage: {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheReadTokens: usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    },
  };
}
