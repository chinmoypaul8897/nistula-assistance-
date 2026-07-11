/**
 * get_availability (plan.md §6.4 tool 2, CH-05 step 4). Per-day open/booked
 * state for calendar answers ("is B3 free that week?"). Returns the website
 * DayState list verbatim; no 409 on this endpoint. Never throws (§6.4).
 */
import { z } from 'zod';
import { resolveVilla } from '../../lib/villas.js';
import type { ToolDef, ToolResult } from './registry.js';
import { isoDate, villaLabel } from './schemas.js';

const availabilityInput = z
  .object({
    villa_label: villaLabel,
    from: isoDate,
    to: isoDate,
  })
  .refine((d) => d.to >= d.from, { message: 'to must be on or after from', path: ['to'] });

type AvailabilityInput = z.infer<typeof availabilityInput>;

export const getAvailabilityTool: ToolDef = {
  name: 'get_availability',
  description:
    'Check which dates a villa is free or booked over a range, for calendar questions. villa_label may be a unit or a type; from/to are inclusive YYYY-MM-DD.',
  inputSchema: availabilityInput,
  async handler(rawInput, ctx): Promise<ToolResult> {
    const input = rawInput as AvailabilityInput;
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
    const outcome = await ctx.website.getAvailability({
      villaId: villa.villaId,
      from: input.from,
      to: input.to,
    });

    switch (outcome.status) {
      case 'ok':
        ctx.degraded.record('up');
        return { ok: true, data: { villa: villa.label, days: outcome.days } };
      case 'invalid':
        ctx.degraded.record('up');
        return { ok: false, error: 'INVALID', message: outcome.kind };
      case 'upstream_down':
        ctx.degraded.record('down');
        return { ok: false, error: 'UPSTREAM_DOWN' };
    }
  },
};
