/**
 * CH-11 · reference-claim verification (§6.4).
 *
 * The rule: the guest must STATE the full booking name AND check-in date (or the
 * booking email). The WhatsApp profile name is NEVER used. These tests pin the
 * mechanism, not the intention — including the attacks the design exists to stop.
 */
import { describe, expect, it } from 'vitest';
import {
  CLAIM_TEXT_MAX_CHARS,
  extractClaimDates,
  normaliseClaimText,
  referenceWasStated,
  verifyClaim,
  type ClaimRecord,
} from '../src/brain/referenceClaim.js';

const RECORD: ClaimRecord = {
  guestName: 'Rahul Mehta',
  guestEmail: 'rahul.mehta@example.com',
  checkIn: '2026-08-26',
};

describe('the guest must have STATED the reference — the model may not invent it', () => {
  it('accepts a reference the guest typed', () => {
    expect(referenceWasStated('953', 'hi, can you check booking 953 for me?')).toBe(true);
    expect(referenceWasStated('953', 'my ref is #953.')).toBe(true);
  });

  it('rejects a reference the guest never typed', () => {
    expect(referenceWasStated('953', 'can you check my booking?')).toBe(false);
  });

  // Digit-boundary: 953 must not match inside 9531 or 19953.
  it('does not match a reference embedded in a longer number', () => {
    expect(referenceWasStated('953', 'my number is 9531')).toBe(false);
    expect(referenceWasStated('953', 'call 919953000000')).toBe(false);
  });
});

describe('verifyClaim — name + check-in date', () => {
  it('passes when the guest typed the full name and the check-in date', () => {
    const text = 'Hi, this is Rahul Mehta, booking 953, checking in 26 Aug.';
    expect(verifyClaim(RECORD, text)).toMatchObject({ ok: true, via: 'name_and_date' });
  });

  it.each([
    ['2026-08-26', 'ISO'],
    ['26/08/2026', 'slashes'],
    ['26-8-26', 'short year'],
    ['26th August', 'ordinal + month name'],
    ['Aug 26', 'month first, no year'],
  ])('accepts the check-in written as %s (%s)', (date) => {
    expect(verifyClaim(RECORD, `Rahul Mehta here, booking 953, arriving ${date}`)).toMatchObject({
      ok: true,
    });
  });

  it('fails when the name is right but the date is wrong', () => {
    const text = 'Rahul Mehta, booking 953, checking in 27 Aug.';
    expect(verifyClaim(RECORD, text)).toMatchObject({ ok: false, reason: 'mismatch' });
  });

  it('fails when the date is right but the name is wrong', () => {
    const text = 'Priya Sharma, booking 953, checking in 26 Aug.';
    expect(verifyClaim(RECORD, text)).toMatchObject({ ok: false, reason: 'mismatch' });
  });

  it('requires the FULL name — a first name alone is not enough', () => {
    expect(verifyClaim(RECORD, 'Rahul here, booking 953, 26 Aug')).toMatchObject({ ok: false });
  });

  it('is tolerant of case, accents and reordering', () => {
    expect(verifyClaim(RECORD, 'MEHTA, RAHUL — booking 953 — 26 aug')).toMatchObject({ ok: true });
    expect(
      verifyClaim({ ...RECORD, guestName: 'José Álvarez' }, 'jose alvarez, 953, 26 aug'),
    ).toMatchObject({ ok: true });
  });

  // Day-first only. Accepting both orders would let one typed date match two
  // stored dates, halving the guess space of the thing we are protecting.
  it('reads 05/08 as 5 August, never 8 May', () => {
    const may8: ClaimRecord = { ...RECORD, checkIn: '2026-05-08' };
    const aug5: ClaimRecord = { ...RECORD, checkIn: '2026-08-05' };
    expect(verifyClaim(may8, 'Rahul Mehta 05/08/2026')).toMatchObject({ ok: false });
    expect(verifyClaim(aug5, 'Rahul Mehta 05/08/2026')).toMatchObject({ ok: true });
  });
});

describe('verifyClaim — the booking email', () => {
  it('passes on the email alone', () => {
    expect(verifyClaim(RECORD, 'booking 953, my email is rahul.mehta@example.com')).toMatchObject({
      ok: true,
      via: 'email',
    });
  });

  it('fails on a different email', () => {
    expect(verifyClaim(RECORD, 'booking 953, email attacker@example.com')).toMatchObject({
      ok: false,
    });
  });
});

describe('fail-closed on a record with nothing to verify against', () => {
  // The "blank matches blank" bug shape this repo has shipped three times.
  it('refuses when we hold no name and no email', () => {
    const empty: ClaimRecord = { guestName: null, guestEmail: null, checkIn: '2026-08-26' };
    expect(verifyClaim(empty, 'booking 953, 26 Aug')).toMatchObject({
      ok: false,
      reason: 'no_verifiable_field',
    });
    expect(verifyClaim(empty, '')).toMatchObject({ ok: false });
  });

  it('refuses when the stored name is blank, even if the guest typed a name', () => {
    const blank: ClaimRecord = { guestName: '   ', guestEmail: null, checkIn: '2026-08-26' };
    expect(verifyClaim(blank, 'Rahul Mehta, 26 Aug')).toMatchObject({ ok: false });
  });

  it('refuses a one-token stored name — too weak to be a secret', () => {
    const oneToken: ClaimRecord = { guestName: 'Rahul', guestEmail: null, checkIn: '2026-08-26' };
    expect(verifyClaim(oneToken, 'Rahul, booking 953, 26 Aug')).toMatchObject({ ok: false });
  });

  it('refuses when we hold no check-in date and no email', () => {
    const noDate: ClaimRecord = { guestName: 'Rahul Mehta', guestEmail: null, checkIn: null };
    expect(verifyClaim(noDate, 'Rahul Mehta, booking 953')).toMatchObject({
      ok: false,
      reason: 'no_verifiable_field',
    });
  });
});

describe('the dictionary attack — a claim is a sentence, not a corpus', () => {
  it('refuses a message stuffed with many dates', () => {
    const dates = ['2026-01-01', '2026-02-02', '2026-03-03'].join(' ');
    expect(verifyClaim(RECORD, `Rahul Mehta booking 953 ${dates}`)).toMatchObject({
      ok: false,
      reason: 'text_unbounded',
    });
  });

  it('refuses a message stuffed with many emails', () => {
    const emails = ['a@x.com', 'b@x.com', 'rahul.mehta@example.com'].join(' ');
    expect(verifyClaim(RECORD, `booking 953 ${emails}`)).toMatchObject({
      ok: false,
      reason: 'text_unbounded',
    });
  });

  it('refuses an over-long message', () => {
    const padding = 'name '.repeat(CLAIM_TEXT_MAX_CHARS);
    expect(verifyClaim(RECORD, `Rahul Mehta 26 Aug ${padding}`)).toMatchObject({
      ok: false,
      reason: 'text_unbounded',
    });
  });

  it('still accepts an ordinary two-date message (check-in and check-out)', () => {
    expect(verifyClaim(RECORD, 'Rahul Mehta, booking 953, 26 Aug to 28 Aug')).toMatchObject({
      ok: true,
    });
  });
});

describe('helpers', () => {
  it('extractClaimDates finds day/month/year', () => {
    expect(extractClaimDates('arriving 2026-08-26')).toContainEqual({
      year: 2026,
      month: 8,
      day: 26,
    });
  });

  it('normaliseClaimText strips diacritics and punctuation', () => {
    expect(normaliseClaimText('José  Álvarez!!')).toBe('jose alvarez');
  });
});
