/**
 * get_quote (plan.md §6.4 tool 1, CH-05 step 4). Resolves the guest's villa
 * reference, calls the website /api/quote (the price source of truth), and
 * returns the QuoteView VERBATIM on success — the AI never computes or adjusts a
 * ₹ figure. Ambiguous/unknown villas and unavailable dates are tool RESULTS the
 * model acts on, never throws (§6.4). Records website health for degraded mode.
 */
import { z } from 'zod';
import { VILLAS, resolveVilla } from '../../lib/villas.js';
import type { ToolDef, ToolResult } from './registry.js';
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

export const getQuoteTool: ToolDef = {
  name: 'get_quote',
  description:
    "Get the live, all-inclusive nightly and total price for a villa and dates from Nistula's website. Use for any price or 'how much' question. villa_label may be a unit ('B3', 'Apartment 11') or a type ('3bhk', 'apartment', 'Siolim'). plan: ep = room only, cp = with breakfast.",
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
      return {
        ok: false,
        error: 'AMBIGUOUS_VILLA',
        data: { type: resolution.typeName, options: resolution.villas.map((v) => v.label) },
      };
    }

    const villa = resolution.villa;
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
        // A REAL quote; the note tells the model to explain the minimum warmly.
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
  },
};
