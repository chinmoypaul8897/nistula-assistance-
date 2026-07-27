/**
 * get_booking_link (plan.md §6.4 tool 7, CH-05 step 4). The canonical villa URL
 * the guest books on — never a booking we build ourselves (§5.1: the site
 * re-quotes live before any hold, so a shared link can't mischarge). Pure string
 * construction: no HTTP, no cache, no degraded signal. Never throws (§6.4).
 */
import { z } from 'zod';
import { bookingUrl, resolveVilla } from '../../lib/villas.js';
import type { ToolDef, ToolResult } from './registry.js';
import { villaLabel } from './schemas.js';

const bookingLinkInput = z.object({ villa_label: villaLabel });

type BookingLinkInput = z.infer<typeof bookingLinkInput>;

export const getBookingLinkTool: ToolDef = {
  name: 'get_booking_link',
  description:
    'Get the website booking link for a villa to share with the guest (they pick dates and book there). villa_label may be a unit or a type.',
  inputSchema: bookingLinkInput,
  async handler(rawInput, ctx): Promise<ToolResult> {
    const input = rawInput as BookingLinkInput;
    const resolution = resolveVilla(input.villa_label);
    if (resolution.kind === 'retired') {
      return {
        ok: false,
        error: 'INVENTORY_RETIRED',
        message:
          'Nistula no longer lets the three-bedroom villas in Assagao. Do not share a link for them. Tell the guest we no longer let the three-bedroom houses in Assagao, and offer what we do have — the Assagao apartments and the four-bedroom villa in Siolim.',
      };
    }
    if (resolution.kind === 'none') {
      return {
        ok: false,
        error: 'UNKNOWN_VILLA',
        message: `no specific home matched "${input.villa_label}" — ask whether they mean the Assagao apartments or the four-bedroom villa in Siolim`,
      };
    }
    if (resolution.kind === 'ambiguous') {
      // A TYPE has no type-level page (the site is per-villa) and booking is at
      // type level anyway (eZee assigns the unit, §5.4) — share a representative
      // unit's page framed as the type; the site re-quotes live before any hold.
      const representative = resolution.villas[0];
      if (representative === undefined) {
        return { ok: false, error: 'UNKNOWN_VILLA', message: 'no unit for that type' };
      }
      return {
        ok: true,
        data: { type: resolution.typeName, url: bookingUrl(ctx.websiteBaseUrl, representative.villaId) },
      };
    }
    return {
      ok: true,
      data: { villa: resolution.villa.label, url: bookingUrl(ctx.websiteBaseUrl, resolution.villa.villaId) },
    };
  },
};
