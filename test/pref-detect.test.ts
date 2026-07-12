/**
 * CH-09 step 4 — register/language heuristics. Pure (runs with Postgres
 * down). The bar: a positive signal must be unmistakable; anything neutral
 * returns null so the stored pref never flips on ordinary chat.
 */
import { describe, expect, it } from 'vitest';
import { detectLang, detectRegister } from '../src/brain/prefDetect.js';

describe('detectRegister', () => {
  it.each([
    ['Good evening sir, is the villa available?', 'formal_sir_maam'],
    ["Thank you ma'am", 'formal_sir_maam'],
    ['Madam, we would like a late checkout', 'formal_sir_maam'],
    // Two formal markers without sir/ma'am.
    ['Kindly confirm the booking. Warm regards, Rahul', 'formal_sir_maam'],
    ['hey bro is the pool heated', 'warm_first_name'],
    ['yaar the villa was amazing', 'warm_first_name'],
  ])('%j → %s', (text, expected) => {
    expect(detectRegister([text])).toBe(expected);
  });

  it.each([
    'hi', // bare greeting is not warmth
    'Is the villa available for 20 December?', // neutral
    'Thank you so much! 🙏', // emoji is NOT informality (formal Indian courtesy)
    'kindly send the link', // ONE formal marker alone is not conclusive
  ])('returns null on neutral text: %j', (text) => {
    expect(detectRegister([text])).toBeNull();
  });

  it('formal wins a mixed batch (warm word beside a formal marker)', () => {
    expect(detectRegister(['hey bro', 'kindly advise sir'])).toBe('formal_sir_maam');
    // A warm word with any formal marker present → not warm, not conclusive.
    expect(detectRegister(['hey bro, warm regards'])).toBeNull();
  });

  it('handles an empty batch', () => {
    expect(detectRegister([])).toBeNull();
    expect(detectRegister([''])).toBeNull();
  });
});

describe('detectLang', () => {
  it.each([
    ['bhai kya villa 20 dec ko milega', 'hinglish'],
    ['pool hai kya waha, aur breakfast chahiye', 'hinglish'],
    ['theek hai, batao kitna hoga', 'hinglish'],
  ])('%j → hinglish', (text, expected) => {
    expect(detectLang([text])).toBe(expected);
  });

  it.each([
    'Is the villa available for the 20th of December, please?',
    'We are a family of six looking for a quiet villa with a pool',
  ])('%j → en (≥6 tokens, zero Hindi tokens)', (text) => {
    expect(detectLang([text])).toBe('en');
  });

  it.each([
    'ok', // too short for anything
    'ok thanks', // still short of both floors
    'yes haan ok', // 3 tokens — below the hinglish floor
  ])('returns null on short/ambiguous text: %j', (text) => {
    expect(detectLang([text])).toBeNull();
  });

  it('one stray Hindi word in a long English batch is not hinglish (ratio floor)', () => {
    expect(
      detectLang(['That is accha but we would prefer an early check in on Saturday morning please']),
    ).toBeNull();
  });

  it('English homographs never flip a guest to hinglish (audit fix: hum/mere dropped)', () => {
    expect(detectLang(["there's a loud hum"])).toBeNull();
    expect(detectLang(["it's a mere 5 minute walk"])).toBe('en');
    expect(detectLang(['the ac makes a hum at night, please have it checked'])).toBe('en');
  });

  it('non-Latin (Devanagari) text yields no signal — F4 is out of v1', () => {
    expect(detectLang(['क्या विला उपलब्ध है'])).toBeNull();
  });

  it('joins the batch: several short Hinglish messages add up', () => {
    expect(detectLang(['villa milega kya', 'aur pool hai?'])).toBe('hinglish');
  });
});
