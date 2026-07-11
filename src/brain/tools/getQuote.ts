/**
 * get_quote (plan.md §6.4 tool 1, CH-05 step 4). Resolves the guest's villa
 * reference, calls the website /api/quote (the price source of truth), and
 * returns the QuoteView VERBATIM on success — the AI never computes or adjusts a
 * ₹ figure. Ambiguous/unknown villas and unavailable dates are tool RESULTS the
 * model acts on, never throws (§6.4). Records website health for degraded mode.
 *
 * TYPE queries ("3bhk", "a villa", "apartment") do NOT ask the guest to pick a
 * unit (bookings are held at TYPE level — eZee assigns the unit, §5.4 — and all
 * units of a type share one rate plan, so the price is identical). Instead the
 * handler quotes every unit of the type and returns the single shared price plus
 * how many units are free, so the AI answers in one message with only what's
 * actually available.
 */
import { z } from 'zod';
import { VILLAS, resolveVilla, type Villa, type VillaTypeName } from '../../lib/villas.js';
import type { ToolContext, ToolDef, ToolResult } from './registry.js';
import type { QuoteOutcome, QuoteView } from './websiteApi.js';
import { isoDate, villaLabel } from './schemas.js';

const quoteInput = z
  .object({
    villa_label: villaLabel,
    check_in: isoDate,
    check_out: isoDate,
    adults: z.number().int().min(1).max(10),
    children: z.number().int().min(0).max(10).default(0),
    plan: z.enum(['ep', 'cp']).default('ep'),
  })
  .refine((d) => d.check_out > d.check_in, {
    message: 'check_out must be after check_in',
    path: ['check_out'],
  });

type QuoteInput = z.infer<typeof quoteInput>;

/** Sibling units of the same type — lets the model offer an alternative when a
 * villa is taken (block [4]), without the villa map being in the prompt yet. */
function sameTypeAlternatives(villaId: string, typeName: string): string[] {
  return VILLAS.filter((v) => v.typeName === typeName && v.villaId !== villaId).map((v) => v.label);
}

/** The QuoteView carried by an outcome, if any (an available:false 200 still has one). */
function quoteViewOf(outcome: QuoteOutcome): QuoteView | undefined {
  if (outcome.status === 'ok' || outcome.status === 'min_nights') return outcome.quote;
  if (outcome.status === 'unavailable') return outcome.quote;
  return undefined;
}

/** Quotes a single named villa (the guest picked a specific unit). */
async function quoteUnit(villa: Villa, input: QuoteInput, ctx: ToolContext): Promise<ToolResult> {
  const outcome = await ctx.website.getQuote({
    villaId: villa.villaId,
    checkIn: input.check_in,
    checkOut: input.check_out,
    adults: input.adults,
    children: input.children,
    plan: input.plan,
  });
  switch (outcome.status) {
    case 'ok':
      ctx.degraded.record('up');
      return { ok: true, data: outcome.quote };
    case 'min_nights':
      ctx.degraded.record('up');
      return { ok: true, data: outcome.quote, note: 'MIN_NIGHTS' };
    case 'unavailable':
      ctx.degraded.record('up');
      return {
        ok: false,
        error: 'UNAVAILABLE',
        data: { villa: villa.label, alternatives: sameTypeAlternatives(villa.villaId, villa.typeName) },
      };
    case 'invalid':
      ctx.degraded.record('up');
      return { ok: false, error: 'INVALID', message: outcome.kind };
    case 'upstream_down':
      ctx.degraded.record('down');
      return { ok: false, error: 'UPSTREAM_DOWN' };
  }
}

/**
 * Quotes a whole TYPE: every unit is priced (they share a rate plan, so the
 * price is identical), and availability is aggregated across units. Returns the
 * single shared price plus availableCount so the AI presents only what's free
 * and never asks the guest to choose a unit (§5.4).
 */
async function quoteType(
  typeName: VillaTypeName,
  villas: Villa[],
  input: QuoteInput,
  ctx: ToolContext,
): Promise<ToolResult> {
  const outcomes: QuoteOutcome[] = [];
  for (const villa of villas) {
    outcomes.push(
      await ctx.website.getQuote({
        villaId: villa.villaId,
        checkIn: input.check_in,
        checkOut: input.check_out,
        adults: input.adults,
        children: input.children,
        plan: input.plan,
      }),
    );
  }
  // One health signal per guest query: reachable if any unit answered at all.
  const answered = outcomes.some((o) => o.status !== 'upstream_down');
  ctx.degraded.record(answered ? 'up' : 'down');

  const availableCount = outcomes.filter(
    (o) => o.status === 'ok' || o.status === 'min_nights',
  ).length;
  // Representative for the shared price: prefer a FREE unit (also carries the
  // right min-nights flag); else any unit that returned a price (incl. a taken
  // 200), so we can still quote the rate for sold-out dates.
  const representative =
    outcomes.find((o) => o.status === 'ok' || o.status === 'min_nights') ??
    outcomes.find((o) => quoteViewOf(o) !== undefined);
  const quote = representative === undefined ? undefined : quoteViewOf(representative);

  if (quote === undefined) {
    // No unit returned a price at all (409s / invalid / upstream).
    if (outcomes.every((o) => o.status === 'upstream_down')) {
      return { ok: false, error: 'UPSTREAM_DOWN' };
    }
    return { ok: false, error: 'UNAVAILABLE', data: { type: typeName } };
  }

  const data = {
    type: typeName,
    total: quote.total,
    averagePerNight: quote.averagePerNight,
    perNight: quote.perNight,
    minNights: quote.minNights,
    available: availableCount > 0,
    availableCount,
    unitCount: villas.length,
  };
  return representative?.status === 'min_nights' ? { ok: true, data, note: 'MIN_NIGHTS' } : { ok: true, data };
}

export const getQuoteTool: ToolDef = {
  name: 'get_quote',
  description:
    "Get the live, all-inclusive price for a villa and dates from Nistula's website. Use for any price or 'how much' question. villa_label may be a specific unit ('B3', 'Apartment 11') or a type ('3bhk', 'apartment', 'Siolim'). For a TYPE it returns the single shared price plus how many units are free for the dates (all units of a type cost the same and are booked at type level) — present the price and availability directly, never ask the guest which unit. plan: ep = room only, cp = with breakfast.",
  inputSchema: quoteInput,
  async handler(rawInput, ctx): Promise<ToolResult> {
    const input = rawInput as QuoteInput;
    const resolution = resolveVilla(input.villa_label);
    if (resolution.kind === 'none') {
      return {
        ok: false,
        error: 'UNKNOWN_VILLA',
        message: `no villa matches "${input.villa_label}" — ask the guest which villa`,
      };
    }
    if (resolution.kind === 'ambiguous') {
      return quoteType(resolution.typeName, resolution.villas, input, ctx);
    }
    return quoteUnit(resolution.villa, input, ctx);
  },
};
