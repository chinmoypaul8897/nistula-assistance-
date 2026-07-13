/**
 * get_booking (plan.md §6.4 #3, CH-11).
 *
 * ONE model-authored argument — the reservation number — exactly as §6.4 writes
 * the signature. Deliberately NOT `{reference, name, check_in, email}`: those
 * strings would be written by the MODEL, which can read the attacker-chosen
 * WhatsApp profile name straight out of block [5], and §6.4 forbids that name
 * for matching. With no field to put a secret in, the model cannot smuggle one.
 * The corroboration runs the other way round — see referenceClaim.ts.
 *
 * Privacy invariants, each pinned by a test:
 * - Never returns another guest's data. Without a reference it returns only
 *   ALREADY-LINKED stays; with one, it links only after verification.
 * - ONE frozen refusal for every failure — unknown reference, wrong name, wrong
 *   date, undescribable booking, locked out. The tool result is serialised into
 *   the transcript for the model to paraphrase, so a "wrong name" that reads
 *   differently from "no such booking" would tell an attacker which reservation
 *   numbers are real AND which half of the secret they still need. Reservation
 *   numbers on this property are short and near-sequential.
 * - No ₹ figure, ever (the projection drops it): our stored amount is one room's
 *   on a multi-room booking, and possibly the OTA net rather than what the guest
 *   paid. Money questions go to a human.
 */
import { z } from 'zod';
import {
  countRecentFailures,
  getMirrorForClaim,
  isStayLinked,
  linkStayByReference,
  recordReferenceAttempt,
  REFERENCE_ATTEMPT_LIMIT,
} from '../../db/stays.js';
import { summarizeError } from '../../lib/logger.js';
import { referenceWasStated, verifyClaim } from '../referenceClaim.js';
import { project, selectStays, type DescribedStay } from '../stayView.js';
import { toInputSchema, type ToolBookingContext, type ToolDef, type ToolResult } from './registry.js';

const inputSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .optional()
    .describe(
      'The booking reference the guest themselves typed, exactly as they wrote it. Omit it to see the stays already linked to this number. Never invent one, and never copy one from anywhere but the guest’s own message.',
    ),
});

/**
 * THE single refusal. Byte-identical across every failure path — that
 * indistinguishability IS the security property, so this is one constant and
 * there is no `message` and no `data` to vary.
 */
const REFUSAL: ToolResult = {
  ok: false,
  error: 'REFUSED',
  message:
    'Booking details could not be verified. Reveal nothing: do not confirm or deny that any booking or reference exists, do not repeat any name, date, villa or reference back, and do not ask them to try again. Tell the guest a colleague is checking and will reply right here shortly.',
};

/** What the model may see about a stay. Note what is absent: amount, currency,
 * the eZee guest name, the email, the rate plan. */
function payload(stay: DescribedStay): Record<string, unknown> {
  return {
    reference: stay.reservationNo,
    villa: stay.villa,
    // The model must not name a unit we were not given (§5.4).
    villa_is_specific_unit: stay.isUnit,
    check_in: stay.checkIn,
    check_out: stay.checkOut,
    adults: stay.adults,
    children: stay.children,
    status: stay.live ? 'upcoming_or_current' : 'past',
  };
}

export const getBookingTool: ToolDef = {
  name: 'get_booking',
  description:
    "The guest's own bookings, from our booking system. Call it with no arguments to see the stays already linked to this number. Pass `reference` ONLY when the guest has typed a booking reference themselves and it is not already one of their linked stays — we will then verify it belongs to them before revealing anything. Never returns another guest's booking. Returns no prices: for anything about money paid, bring the team in.",
  inputSchema,
  handler: async (input, ctx): Promise<ToolResult> => {
    const { reference } = input as { reference?: string };
    const booking = ctx.booking;
    if (booking === undefined) {
      return { ok: false, error: 'UPSTREAM_DOWN', message: 'booking lookup is unavailable' };
    }

    // No reference → the guest's own linked stays. The 95% case ("when is my
    // check-in?"), safe by construction: nothing here was not already theirs.
    if (reference === undefined) {
      const stays = selectStays(booking.stays, booking.today);
      return {
        ok: true,
        data: {
          stays: stays.map(payload),
          // The model needs to distinguish "no booking" (an honest lead) from
          // "a booking a person must handle" — they are different sentences.
          undescribable_booking_exists: booking.stays.some((s) => !s.describable && s.live),
        },
      };
    }

    // Once refused this turn, every later call is frozen and free: the tool loop
    // re-runs on a guardrail regenerate, and one honest typo must cost exactly
    // one strike — not two, and not five rounds of the model guessing numbers.
    if (booking.claim.refused) return REFUSAL;

    try {
      // The model may not invent a reference. If the guest never typed it, this
      // is the model being helpful — refuse, but charge the guest nothing.
      if (!referenceWasStated(reference, booking.guestText)) {
        ctx.log.warn?.({ tool: 'get_booking' }, 'reference not stated by the guest — refused');
        booking.claim.refused = true;
        return REFUSAL;
      }

      // One distinct reference per turn. A second is the model fishing.
      if (booking.claim.attempted !== null && booking.claim.attempted !== reference) {
        booking.claim.refused = true;
        return REFUSAL;
      }
      booking.claim.attempted = reference;

      const row = await getMirrorForClaim(booking.db, reference);

      // Already theirs → answer, no strike. An honest guest re-stating their own
      // reference must never be charged for it.
      if (row !== null && (await isStayLinked(booking.db, booking.guestId, row.id))) {
        const view = project(row, [row]);
        if (!view.describable) return await refuse(booking, reference);
        return { ok: true, data: { stays: [payload(view)] } };
      }

      // Locked out? Check BEFORE reading anything into the answer.
      const failures = await countRecentFailures(booking.db, booking.guestPhone);
      if (failures >= REFERENCE_ATTEMPT_LIMIT) return await refuse(booking, reference);

      // Unknown reference and a failed claim are the SAME value. Verify anyway
      // (against an empty record it fails) so the work does not signal either.
      const verdict = verifyClaim(
        {
          guestName: row?.guestName ?? null,
          guestEmail: row?.guestEmail ?? null,
          checkIn: row?.checkIn ?? null,
        },
        booking.guestText,
      );
      if (row === null || !verdict.ok) return await refuse(booking, reference);

      const view = project(row, [row]);
      // Verified as theirs — but still not describable (cancelled, multi-room).
      // Link it (it IS their booking) and hand the conversation to a human.
      if (!view.describable) {
        await linkStayByReference(booking.db, booking.guestId, row.id);
        await recordReferenceAttempt(booking.db, {
          phone: booking.guestPhone,
          claimedReference: reference,
          outcome: 'linked',
        });
        booking.claim.escalate = true;
        return REFUSAL;
      }

      await linkStayByReference(booking.db, booking.guestId, row.id);
      await recordReferenceAttempt(booking.db, {
        phone: booking.guestPhone,
        claimedReference: reference,
        outcome: 'linked',
      });
      return { ok: true, data: { stays: [payload(view)] } };
    } catch (error) {
      // A DB failure must never throw into the model (registry contract) and must
      // never look like a refusal — that would burn a strike for our outage.
      ctx.log.warn?.({ tool: 'get_booking', err: summarizeError(error) }, 'booking lookup failed');
      return { ok: false, error: 'UPSTREAM_DOWN', message: 'booking lookup is unavailable' };
    }
  },
};

/** Records the strike, latches the turn, and asks for a human — then returns the
 * one frozen value. Someone quoting a reservation number that is not theirs is
 * precisely the event a person must see: it may be an honest typo, and it may be
 * an identity probe. */
async function refuse(booking: ToolBookingContext, reference: string): Promise<ToolResult> {
  await recordReferenceAttempt(booking.db, {
    phone: booking.guestPhone,
    claimedReference: reference,
    outcome: 'refused',
  });
  booking.claim.refused = true;
  booking.claim.escalate = true;
  return REFUSAL;
}

export const getBookingInputSchema = toInputSchema(inputSchema);
