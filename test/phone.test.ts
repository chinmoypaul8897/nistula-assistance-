import { describe, expect, it } from 'vitest';
import { normalizePhone } from '../src/lib/phone.js';

describe('normalizePhone (plan §5.2)', () => {
  const cases: Array<{ input: string; expected: string | null }> = [
    // the tricky cases named in plan.md CH-00 step 3
    { input: '08810358517', expected: '+918810358517' },
    { input: '91 88103 58517', expected: '+918810358517' },
    { input: '+91-88103-58517', expected: '+918810358517' },
    // bare 10-digit → assume +91
    { input: '8810358517', expected: '+918810358517' },
    // already E.164 → unchanged
    { input: '+918810358517', expected: '+918810358517' },
    // foreign numbers keep their country code (+44 7700 9xxxxx is Ofcom-reserved)
    { input: '+14155552671', expected: '+14155552671' },
    { input: '+44 7700 900123', expected: '+447700900123' },
    { input: '447700900123', expected: '+447700900123' },
    // 10 digits starting with 91 is a mobile number, not a country code
    { input: '9198765432', expected: '+919198765432' },
    // unnormalisable → null
    { input: '', expected: null },
    { input: 'not a phone', expected: null },
    { input: '12345', expected: null },
    { input: '+91 (88103) 58517', expected: null }, // parens are outside §5.2's strip list
    { input: '1234567890123456', expected: null }, // > 15 digits breaks E.164
    { input: '+', expected: null },
    // country codes never start with 0 — reject, don't store unreachable numbers
    { input: '+08810358517', expected: null },
    { input: '00918810358517', expected: null },
  ];

  it.each(cases)('normalizePhone($input) → $expected', ({ input, expected }) => {
    expect(normalizePhone(input)).toBe(expected);
  });
});
