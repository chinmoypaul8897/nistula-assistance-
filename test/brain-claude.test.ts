/**
 * The converse() retry wrapper (CH-04). Pure — no network, no key: the single
 * messages.create call is injected. Proves the SDK-retry-disabled loop retries
 * 5xx/connection, passes 4xx straight through, honours the total deadline, and
 * parses text + usage (incl. cache tokens).
 */
import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { createConverse, isRetryable } from '../src/brain/claude.js';

const log = { warn: vi.fn() };
const noSleep = async (): Promise<void> => {};

function fakeMessage(
  text: string,
  usage: { input?: number; output?: number; cacheRead?: number | null; cacheWrite?: number | null } = {},
): Anthropic.Message {
  return {
    content: [{ type: 'text', text }],
    usage: {
      input_tokens: usage.input ?? 10,
      output_tokens: usage.output ?? 5,
      cache_read_input_tokens: usage.cacheRead ?? null,
      cache_creation_input_tokens: usage.cacheWrite ?? null,
    },
  } as unknown as Anthropic.Message;
}

const INPUT = { system: [{ type: 'text' as const, text: 'S' }], messages: [{ role: 'user' as const, content: 'hi' }] };

describe('createConverse', () => {
  it('builds the messages.create params and parses text + usage', async () => {
    const calls: { params: Anthropic.MessageCreateParamsNonStreaming; timeout: number }[] = [];
    const converse = createConverse({
      apiKey: undefined,
      modelId: 'test-model',
      log,
      createMessage: async (params, options) => {
        calls.push({ params, timeout: options.timeout });
        return fakeMessage('hello there', { input: 50, output: 40, cacheRead: 12, cacheWrite: 1200 });
      },
    });

    const result = await converse(INPUT);

    expect(result.text).toBe('hello there');
    expect(result.usage).toEqual({
      inputTokens: 50,
      outputTokens: 40,
      cacheReadTokens: 12,
      cacheWriteTokens: 1200,
    });
    expect(calls[0]?.params).toMatchObject({ model: 'test-model', max_tokens: 1024, temperature: 0.7 });
    expect(calls[0]?.params.system).toEqual([{ type: 'text', text: 'S' }]);
    expect(calls[0]?.params.messages).toEqual([{ role: 'user', content: 'hi' }]);
    expect(calls[0]?.timeout).toBeGreaterThan(0);
  });

  it('retries a 5xx then succeeds (our loop, SDK retry disabled)', async () => {
    let n = 0;
    const converse = createConverse({
      apiKey: undefined,
      modelId: 'm',
      log,
      sleepImpl: noSleep,
      randomImpl: () => 0,
      createMessage: async () => {
        n += 1;
        if (n < 3) throw Object.assign(new Error('overloaded'), { status: 529 });
        return fakeMessage('ok');
      },
    });

    expect((await converse(INPUT)).text).toBe('ok');
    expect(n).toBe(3);
  });

  it('does NOT retry a 4xx — throws straight through on the first try', async () => {
    let n = 0;
    const converse = createConverse({
      apiKey: undefined,
      modelId: 'm',
      log,
      sleepImpl: noSleep,
      createMessage: async () => {
        n += 1;
        throw Object.assign(new Error('bad request'), { status: 400 });
      },
    });

    await expect(converse(INPUT)).rejects.toThrow('bad request');
    expect(n).toBe(1);
  });

  it('throws the last error after exhausting tries', async () => {
    let n = 0;
    const converse = createConverse({
      apiKey: undefined,
      modelId: 'm',
      log,
      sleepImpl: noSleep,
      randomImpl: () => 0,
      maxTries: 2,
      createMessage: async () => {
        n += 1;
        throw Object.assign(new Error('still overloaded'), { status: 503 });
      },
    });

    await expect(converse(INPUT)).rejects.toThrow('still overloaded');
    expect(n).toBe(2);
  });

  it('breaks immediately when the total deadline is already exhausted', async () => {
    const converse = createConverse({
      apiKey: undefined,
      modelId: 'm',
      log,
      totalDeadlineMs: 0,
      createMessage: async () => fakeMessage('never sent'),
    });

    await expect(converse(INPUT)).rejects.toThrow('deadline exhausted before any attempt');
  });

  it('classifies retryable vs terminal errors', () => {
    expect(isRetryable(new Anthropic.APIConnectionError({ message: 'boom' }))).toBe(true);
    expect(isRetryable(Object.assign(new Error('x'), { status: 429 }))).toBe(true);
    expect(isRetryable(Object.assign(new Error('x'), { status: 500 }))).toBe(true);
    expect(isRetryable(Object.assign(new Error('x'), { status: 400 }))).toBe(false);
    expect(isRetryable(new Error('plain'))).toBe(false);
  });

  it('requires an API key when no createMessage is injected', () => {
    expect(() => createConverse({ apiKey: undefined, modelId: 'm', log })).toThrow('ANTHROPIC_API_KEY');
    expect(() => createConverse({ apiKey: '', modelId: 'm', log })).toThrow('ANTHROPIC_API_KEY');
  });
});

function fakeToolMessage(): Anthropic.Message {
  return {
    content: [
      { type: 'text', text: 'let me check' },
      { type: 'tool_use', id: 'tu_1', name: 'get_quote', input: { villa_label: 'B3' } },
    ],
    stop_reason: 'tool_use',
    usage: {
      input_tokens: 20,
      output_tokens: 8,
      cache_read_input_tokens: null,
      cache_creation_input_tokens: null,
    },
  } as unknown as Anthropic.Message;
}

describe('createConverse — tool use (CH-05)', () => {
  const tools = [{ name: 'get_quote', description: 'd', input_schema: { type: 'object' } }];

  it('forwards tools + tool_choice and parses tool_use into toolUses/stopReason/assistantContent', async () => {
    let seen: Anthropic.MessageCreateParamsNonStreaming | undefined;
    const converse = createConverse({
      apiKey: undefined,
      modelId: 'm',
      log,
      createMessage: async (params) => {
        seen = params;
        return fakeToolMessage();
      },
    });

    const result = await converse({ ...INPUT, tools, toolChoice: { type: 'none' } });

    expect(seen?.tools).toEqual(tools);
    expect(seen?.tool_choice).toEqual({ type: 'none' });
    expect(result.stopReason).toBe('tool_use');
    expect(result.toolUses).toEqual([{ id: 'tu_1', name: 'get_quote', input: { villa_label: 'B3' } }]);
    // The assistant turn is rebuilt verbatim (text + tool_use) for the next round.
    expect(result.assistantContent).toEqual([
      { type: 'text', text: 'let me check' },
      { type: 'tool_use', id: 'tu_1', name: 'get_quote', input: { villa_label: 'B3' } },
    ]);
  });

  it('omits tools/tool_choice when none are given (CH-04 request shape intact)', async () => {
    let seen: Anthropic.MessageCreateParamsNonStreaming | undefined;
    const converse = createConverse({
      apiKey: undefined,
      modelId: 'm',
      log,
      createMessage: async (params) => {
        seen = params;
        return fakeMessage('hi');
      },
    });
    const result = await converse(INPUT);
    expect(seen?.tools).toBeUndefined();
    expect(seen?.tool_choice).toBeUndefined();
    expect(result.toolUses).toEqual([]);
  });

  it('a per-call deadlineMs caps the request timeout', async () => {
    let timeout = 0;
    const converse = createConverse({
      apiKey: undefined,
      modelId: 'm',
      log,
      createMessage: async (_params, options) => {
        timeout = options.timeout;
        return fakeMessage('ok');
      },
    });
    await converse({ ...INPUT, deadlineMs: 4000 });
    expect(timeout).toBeLessThanOrEqual(4000);
  });
});
