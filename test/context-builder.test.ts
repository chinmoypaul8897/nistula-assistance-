/**
 * The §6.3 transcript window (CH-08). Pure — runs with Postgres down: these
 * cases drive planWindow/mapTranscript/renderTranscriptText on synthetic rows;
 * the DB-side halves (evidence query, uncovered count, µs regression) live in
 * summariser.test.ts, and the end-to-end 100-message budget case in
 * brain-worker.test.ts.
 */
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  TRANSCRIPT_MAX_MESSAGES,
  TRANSCRIPT_TOKEN_BUDGET,
  mapTranscript,
  planWindow,
  renderTranscriptText,
} from '../src/brain/contextBuilder.js';
import { estimateTokens } from '../src/brain/tokens.js';
import type { Message } from '../src/db/repos.js';

let seq = 0;

/** A minimal synthetic message row — only the fields the window walk reads. */
function msg(
  sender: Message['sender'],
  body: string | null,
  overrides: Partial<Message> = {},
): Message {
  seq += 1;
  return {
    id: randomUUID(),
    conversationId: randomUUID(),
    waMessageId: null,
    direction: sender === 'guest' ? 'in' : 'out',
    sender,
    type: 'text',
    body,
    mediaId: null,
    templateName: null,
    status: 'received',
    error: null,
    raw: null,
    createdAt: new Date(1_700_000_000_000 + seq * 1000),
    updatedAt: new Date(1_700_000_000_000 + seq * 1000),
    ...overrides,
  } as Message;
}

describe('planWindow — the §6.3 walk-back (30 msgs / ~6k tokens, whichever first)', () => {
  it('a short thread fits whole: no trimming, order preserved oldest-first', () => {
    const rows = [msg('guest', 'hi'), msg('ai', 'Good evening.'), msg('guest', 'B3 free?')];
    const plan = planWindow(rows, TRANSCRIPT_TOKEN_BUDGET);
    expect(plan.window.map((m) => m.body)).toEqual(['hi', 'Good evening.', 'B3 free?']);
    expect(plan.trimmedByTokens).toBe(false);
    expect(plan.excludedEligible).toBe(false);
  });

  it('a 100-message thread is capped at the 30 newest (count cap, not tokens)', () => {
    const rows = Array.from({ length: 100 }, (_, i) => msg(i % 2 === 0 ? 'guest' : 'ai', `m${i}`));
    const plan = planWindow(rows, TRANSCRIPT_TOKEN_BUDGET);
    expect(plan.window).toHaveLength(TRANSCRIPT_MAX_MESSAGES);
    expect(plan.window.at(-1)?.body).toBe('m99'); // newest kept
    expect(plan.window[0]?.body).toBe('m70'); // oldest 70 dropped
    expect(plan.trimmedByTokens).toBe(false);
    expect(plan.excludedEligible).toBe(true);
  });

  it('long messages trim by TOKENS before the count cap; the window stays within budget', () => {
    // ~500 tokens each (1800 chars / 3.6) — 6 messages exceed a 2000-token budget.
    const rows = Array.from({ length: 6 }, (_, i) => msg('guest', `m${i} ${'x'.repeat(1795)}`));
    const plan = planWindow(rows, 2000);
    expect(plan.trimmedByTokens).toBe(true);
    expect(plan.excludedEligible).toBe(true);
    expect(plan.window.length).toBeGreaterThan(0);
    expect(plan.window.length).toBeLessThan(6);
    const spent = plan.window.reduce((n, m) => n + estimateTokens(renderTranscriptText(m)), 0);
    expect(spent).toBeLessThanOrEqual(2000);
    expect(plan.window.at(-1)?.body).toContain('m5'); // newest survives the walk
  });

  it('one giant message still yields a 1-message window, never an empty transcript', () => {
    const rows = [msg('guest', 'earlier'), msg('guest', 'y'.repeat(50_000))];
    const plan = planWindow(rows, 2000);
    expect(plan.window).toHaveLength(1);
    expect(plan.window[0]?.body).toBe('y'.repeat(50_000));
    expect(plan.trimmedByTokens).toBe(true);
  });

  it('system rows never occupy window slots or spend budget', () => {
    const rows = [
      msg('guest', 'towels please'),
      ...Array.from({ length: 35 }, () => msg('system', 'ops escalated: media')),
      msg('ai', 'Two towels on their way.'),
    ];
    const plan = planWindow(rows, TRANSCRIPT_TOKEN_BUDGET);
    expect(plan.window.map((m) => m.body)).toEqual(['towels please', 'Two towels on their way.']);
    expect(plan.excludedEligible).toBe(false);
  });

  it('the budget measures RENDERED text (front-desk prefix, media placeholders)', () => {
    const human = msg('human', 'On it.');
    expect(renderTranscriptText(human)).toBe('(Front desk) On it.');
    const media = msg('guest', null, { type: 'image' });
    expect(renderTranscriptText(media)).toBe('[image]');
  });

  it('mapTranscript over a window still opens on a user turn', () => {
    // Window trimming can leave an assistant row first — the mapper drops it.
    const rows = [msg('ai', 'Good evening.'), msg('guest', 'hello')];
    const turns = mapTranscript(rows);
    expect(turns[0]?.role).toBe('user');
    expect(turns).toHaveLength(1);
  });
});
