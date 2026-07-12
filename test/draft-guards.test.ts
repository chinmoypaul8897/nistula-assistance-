/**
 * Guardrails 4–6 pure checks (CH-07): the 24h window edges (the chunk's own
 * required test: 23h59 vs 24h01), the strict identity-line check, and the
 * deterministic format clamp.
 */
import { describe, expect, it } from 'vitest';
import {
  applyFormatClamp,
  bulletLineCount,
  containsIdentityLine,
  isWindowOpen,
  trimAtSentence,
} from '../src/brain/draftGuards.js';
import { PHRASEBOOK } from '../src/brain/prompt.js';

describe('guardrail 4 — the 24h window (§5.3)', () => {
  const newest = new Date('2026-07-12T10:00:00Z');
  const at = (h: number, m: number) =>
    new Date(newest.getTime() + (h * 60 + m) * 60_000);

  it('is open at 23h59 and closed at 24h01 (the chunk edge test)', () => {
    expect(isWindowOpen(newest, at(23, 59))).toBe(true);
    expect(isWindowOpen(newest, at(24, 1))).toBe(false);
  });

  it('closes exactly at the boundary', () => {
    expect(isWindowOpen(newest, at(24, 0))).toBe(false);
  });
});

describe('guardrail 5 — identity honesty (§6.5 #5, strict full line)', () => {
  it('accepts the approved line verbatim, with prose around it', () => {
    expect(containsIdentityLine(PHRASEBOOK.isBot)).toBe(true);
    expect(containsIdentityLine(`Good evening. ${PHRASEBOOK.isBot} Now, about those dates…`)).toBe(
      true,
    );
  });

  it('accepts punctuation/case/whitespace variants of the full line', () => {
    const mangled = PHRASEBOOK.isBot.toUpperCase().replace(/—/g, '-').replace(/\s+/g, '  ');
    expect(containsIdentityLine(mangled)).toBe(true);
  });

  it('REJECTS the substring lie that CH-07 step 3 would have let through', () => {
    // "Nistula Assistance" is present, but the claim is a human team — the
    // reason §6.5's full-line letter ships instead of the substring check.
    expect(containsIdentityLine('You are chatting with Nistula Assistance — a real human front desk team.')).toBe(false);
    expect(containsIdentityLine('Just the front desk here, no bots involved.')).toBe(false);
  });
});

describe('guardrail 6 — format clamp', () => {
  it('strips markdown headers and flattens exclamation marks', () => {
    const clamped = applyFormatClamp('## Great news!\nYour villa awaits!!');
    expect(clamped.text).toBe('Great news.\nYour villa awaits.');
    expect(clamped.changed).toBe(true);
    expect(clamped.notes).toEqual(
      expect.arrayContaining(['markdown_headers_stripped', 'exclamations_flattened']),
    );
  });

  it('flags INR (voice guide bans it) without rewriting the figure', () => {
    const clamped = applyFormatClamp('The rate is INR 34,000 all in.');
    expect(clamped.notes).toContain('inr_spelled_out');
    expect(clamped.text).toContain('INR 34,000'); // ₹ figures are guardrail 1's business
  });

  it('leaves a clean voice-conformant draft untouched', () => {
    const clamped = applyFormatClamp('C3 wraps around its own pool. Here is the link.');
    expect(clamped.changed).toBe(false);
    expect(clamped.notes).toEqual([]);
  });

  it('counts bullet-spam lines', () => {
    expect(bulletLineCount('- one\n- two\n- three')).toBe(3);
    expect(bulletLineCount('no bullets here')).toBe(0);
  });

  it('trimAtSentence cuts at a sentence boundary under the cap', () => {
    const long = `${'A full sentence here. '.repeat(60)}`;
    const trimmed = trimAtSentence(long);
    expect(trimmed.length).toBeLessThanOrEqual(900);
    expect(trimmed.endsWith('.')).toBe(true);
  });

  it('trimAtSentence falls back to a word boundary + ellipsis', () => {
    const unbroken = 'word '.repeat(300);
    const trimmed = trimAtSentence(unbroken);
    expect(trimmed.length).toBeLessThanOrEqual(901);
    expect(trimmed.endsWith('…')).toBe(true);
  });
});
