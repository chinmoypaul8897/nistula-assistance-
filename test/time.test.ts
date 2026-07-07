import { afterEach, describe, expect, it, vi } from 'vitest';
import { atISTHour, isNightIST, istWallClockToInstant, nowIST } from '../src/lib/time.js';

describe('istWallClockToInstant', () => {
  it('converts IST wall clock to the UTC instant (10:00 IST = 04:30Z)', () => {
    expect(istWallClockToInstant('2026-07-07T10:00').toISOString()).toBe(
      '2026-07-07T04:30:00.000Z',
    );
  });

  it('accepts seconds and a space separator', () => {
    expect(istWallClockToInstant('2026-07-07 23:05:30').toISOString()).toBe(
      '2026-07-07T17:35:30.000Z',
    );
  });

  it('rejects non wall-clock strings', () => {
    expect(() => istWallClockToInstant('yesterday')).toThrow();
    expect(() => istWallClockToInstant('2026-07-07')).toThrow();
  });
});

describe('atISTHour', () => {
  it('pins to the IST calendar day of the given instant', () => {
    // 04:30Z is 10:00 IST on 7 Jul — same IST day.
    const morning = atISTHour(new Date('2026-07-07T04:30:00Z'), '10:00');
    expect(morning.toISOString()).toBe('2026-07-07T04:30:00.000Z');
  });

  it('uses the IST day even when it differs from the UTC day', () => {
    // 20:30Z on 7 Jul is 02:00 IST on 8 Jul → "10:00" must mean 8 Jul IST.
    const next = atISTHour(new Date('2026-07-07T20:30:00Z'), '10:00');
    expect(next.toISOString()).toBe('2026-07-08T04:30:00.000Z');
  });

  it('rejects malformed HH:mm', () => {
    expect(() => atISTHour(new Date(), '25:00')).toThrow();
    expect(() => atISTHour(new Date(), '9am')).toThrow();
  });
});

describe('isNightIST (default window 20:00 → 10:00 IST)', () => {
  const at = (wallClock: string) => istWallClockToInstant(wallClock);

  it.each([
    { ist: '2026-07-07T23:05', night: true },
    { ist: '2026-07-07T20:00', night: true }, // start inclusive
    { ist: '2026-07-07T19:59', night: false },
    { ist: '2026-07-08T09:59', night: true },
    { ist: '2026-07-08T10:00', night: false }, // end exclusive
    { ist: '2026-07-08T14:00', night: false },
  ])('$ist IST → night=$night', ({ ist, night }) => {
    expect(isNightIST(at(ist), '20:00', '10:00')).toBe(night);
  });

  it('handles a non-wrapping window and a zero-length window', () => {
    expect(isNightIST(at('2026-07-07T02:00'), '01:00', '05:00')).toBe(true);
    expect(isNightIST(at('2026-07-07T06:00'), '01:00', '05:00')).toBe(false);
    expect(isNightIST(at('2026-07-07T02:00'), '02:00', '02:00')).toBe(false);
  });
});

describe('nowIST', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('honours FAKE_NOW_IST when set', () => {
    vi.stubEnv('FAKE_NOW_IST', '2026-12-20T23:42');
    expect(nowIST().toISOString()).toBe('2026-12-20T18:12:00.000Z');
  });

  it('returns the real clock otherwise', () => {
    vi.stubEnv('FAKE_NOW_IST', '');
    const before = Date.now();
    const now = nowIST().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});
