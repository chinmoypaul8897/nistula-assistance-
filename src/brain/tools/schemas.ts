/**
 * Shared zod input pieces for the price tools (plan.md §6.4, CH-05 step 4).
 * Dates are ISO and must be REAL calendar dates (a 2026-02-31 typo would sail
 * past a bare regex and confuse the website), mirroring config.ts's FAKE_NOW_IST
 * calendar check.
 */
import { z } from 'zod';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True only when the y-m-d names a day that exists on the calendar. */
export function isRealCalendarDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m === null) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export const isoDate = z
  .string()
  .regex(ISO_DATE, 'date must be YYYY-MM-DD')
  .refine(isRealCalendarDate, 'date does not exist on the calendar');

/** Guest-typed villa reference — resolved via lib/villas.ts, capped for safety. */
export const villaLabel = z.string().min(1).max(40);
