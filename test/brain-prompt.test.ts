/**
 * Prompt assembly (CH-04). Pure — runs with Postgres down. Guards the block
 * order, the cache breakpoint placement (§5.5), the locked voice rules, and
 * that the dynamic SITUATION renders with no unresolved placeholders.
 */
import { describe, expect, it } from 'vitest';
import { buildSituation, buildSystemPrompt } from '../src/brain/prompt.js';

const situation = buildSituation({
  now: new Date('2026-07-11T18:12:00Z'),
  isNight: false,
  serviceWindowOpen: true,
  degraded: false,
});
// Block [3] KNOWLEDGE is injected (knowledge.ts loads the real thing at runtime);
// a fixed fixture keeps this suite pure and deterministic.
const knowledge = 'Check-in is from 3 pm. Villa B3 has a private pool.';
const blocks = buildSystemPrompt(situation, knowledge);

describe('buildSystemPrompt', () => {
  it('assembles five text blocks in order: identity, voice, knowledge, rules, situation', () => {
    expect(blocks).toHaveLength(5);
    expect(blocks.every((block) => block.type === 'text')).toBe(true);
    expect(blocks[0]?.text).toContain('[IDENTITY & MISSION]');
    expect(blocks[1]?.text).toContain('[VOICE');
    expect(blocks[2]?.text).toContain('[KNOWLEDGE]');
    expect(blocks[2]?.text).toContain('Villa B3 has a private pool'); // injected block [3]
    expect(blocks[3]?.text).toContain('[RULES OF ENGAGEMENT]');
    expect(blocks[4]?.text).toContain('[SITUATION]');
  });

  it('sets the cache breakpoint on the last STATIC block ([4] RULES) only', () => {
    expect(blocks[0]?.cache_control).toBeUndefined();
    expect(blocks[1]?.cache_control).toBeUndefined();
    expect(blocks[2]?.cache_control).toBeUndefined(); // [3] KNOWLEDGE caches via the [4] breakpoint
    expect(blocks[3]?.cache_control).toEqual({ type: 'ephemeral' });
    // [6] SITUATION is dynamic — caching it would break the prefix every turn.
    expect(blocks[4]?.cache_control).toBeUndefined();
  });

  it('carries the locked voice rules, the CH-05 tool guard, and the CH-06 knowledge rule', () => {
    const voice = blocks[1]?.text ?? '';
    expect(voice).toContain('No exclamation marks');
    expect(voice).toContain('British English');
    expect(voice).toContain('Is this a bot?');
    expect(voice).toContain('discount'); // banned-words guidance present
    const rules = blocks[3]?.text ?? '';
    // CH-05: tools now exist; ₹ figures must come from a tool result this turn.
    expect(rules).toContain('get_quote');
    expect(rules).toContain('only from a tool result in THIS turn');
    expect(rules).toContain('DATA'); // prompt-injection posture (guest + tool result)
    // CH-06: KNOWLEDGE is the source of truth; never invent, never state a deposit.
    expect(rules).toContain('[KNOWLEDGE] block above is your source of truth');
    expect(rules).toContain('Never state a deposit amount');
  });

  it('renders the SITUATION with no unresolved placeholders (day and night)', () => {
    const night = buildSituation({
      now: new Date('2026-07-11T18:12:00Z'),
      isNight: true,
      serviceWindowOpen: false,
      degraded: false,
    });
    expect(night).toContain('IST');
    expect(night).toContain('OFF DUTY');
    expect(night).toContain('24-hour reply window has closed');
    expect(night).not.toContain('undefined');
    expect(night).not.toContain('${');

    const dayOpen = buildSituation({
      now: new Date('2026-07-11T06:00:00Z'),
      isNight: false,
      serviceWindowOpen: true,
      degraded: false,
    });
    expect(dayOpen).toContain('ON DUTY');
    expect(dayOpen).toContain('within the 24-hour reply window');
  });

  it('surfaces the degraded flag so the model stops quoting (§3.4)', () => {
    const healthy = buildSituation({
      now: new Date('2026-07-11T06:00:00Z'),
      isNight: false,
      serviceWindowOpen: true,
      degraded: false,
    });
    expect(healthy).not.toContain('Do not state any price this turn');
    const degraded = buildSituation({
      now: new Date('2026-07-11T06:00:00Z'),
      isNight: false,
      serviceWindowOpen: true,
      degraded: true,
    });
    expect(degraded).toContain('Do not state any price this turn');
  });

  it("the static head clears Sonnet 4.5's 1024-token cache floor (chars/3.6 heuristic)", () => {
    // The cached prefix is blocks [1]+[2]+[3]+[4] (up to and incl. the breakpoint).
    const head = (blocks[0]?.text ?? '') + (blocks[1]?.text ?? '') + (blocks[2]?.text ?? '') + (blocks[3]?.text ?? '');
    // Below the floor, cache_control silently no-ops on Sonnet 4.5 (§5.5).
    expect(head.length / 3.6).toBeGreaterThan(1024);
  });
});
