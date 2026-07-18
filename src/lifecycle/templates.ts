/**
 * The template catalog (CH-12, plan §8 step 2 + §5.3).
 *
 * Business-initiated sends outside the 24h window MUST be Meta-approved
 * templates. Approval belongs to the real number's WABA, which does not exist
 * yet — so the catalog is built NOW and the dev test number simulates it with
 * the identical body as free-form (raw.devTemplate = true, no visible prefix).
 *
 * THE ANTI-DRIFT TRICK, and the reason this file has no separate list of Meta
 * bodies: the body we submit to Meta for approval is GENERATED from the same
 * `render` function dev sends through, by rendering it with '{{1}}', '{{2}}'…
 * as the parameter values (see `metaBody`). It is therefore impossible for the
 * approved template and the message we actually send to drift apart — a class
 * of bug that would only ever surface in production, on a real guest.
 *
 * WHAT A BODY MAY SAY. Narrower than it looks, and every exclusion is a rule
 * someone already bled for:
 *   - The villa TYPE and its locality. NEVER a house ("Apartment 06", "Villa
 *     B3"). The REASON changed on 2026-07-16 but the RULE did not: it is no
 *     longer "eZee guessed it" (the website abolished house-choice, so eZee's
 *     assignment IS the door) — it is that naming a house TO A GUEST is still
 *     gated on OQ-15, and an assignment can move before arrival. Params come from
 *     stayView, the one door from a booking row to words.
 *   - Check-in from 3 pm, check-out by 12 pm (kb/policies.md).
 *   - Dates and the reservation reference.
 *   - NEVER a ₹ figure — not the booking amount (it may be the OTA net, not what
 *     the guest paid), and not the deposit (no figure is published; kb/policies
 *     says in terms "never state one").
 *   - NEVER an address or a map pin: none exists anywhere in the KB (OQ-12).
 *     The pre-arrival therefore makes the promise the FAQ already makes today —
 *     share an arrival time, and a human sends the pin.
 *   - NEVER the meal plan (an opaque rate code, OQ-16).
 *
 * Voice (kb/source/voice-guide.md v1.1): British English, 1–3 short sentences,
 * no exclamation marks, no discount language, never "dear guest".
 *
 * 🚨 EDITING A BODY? Every sentence below makes a claim that STOPS BEING TRUE at
 * some moment — "welcoming you on Friday" once they have arrived, "ready for you
 * today" tomorrow — and the sender refuses to send an untrue one. That expiry is
 * part of the same decision as the words, so it is stated per kind in TRUTH
 * (lifecycle/sendGuards.ts). Change a claim here, change its rule there. Judging
 * them all by one clock instead cost the last-minute booking its pre-arrival.
 */
import { z } from 'zod';
import type { scheduledMessageKindEnum } from '../db/schema.js';
import { namesPhysicalHouse } from '../lib/villas.js';

export type ScheduledKind = (typeof scheduledMessageKindEnum.enumValues)[number];
export type StaffTemplateKey = 'task_card' | 'escalation_card' | 'digest' | 'draft_card';
export type TemplateKey = ScheduledKind | StaffTemplateKey;

/**
 * STAFF-facing params (CH-13a). Everything Meta and the money rule demand —
 * but a house name is LEGAL here.
 *
 * 🚨 TWO AUDIENCES, TWO CONTRACTS. This split exists because the old single
 * `param` refused "Apartment 06" everywhere, which would have blocked the task
 * card — and the fix is emphatically NOT to weaken the guard, because the same
 * schema protects guests. `templates.ts` used to carry a TODO(CH-13) saying
 * exactly this, and it was right:
 *
 *   staff card  → the physical door housekeeping must walk to. A house name is
 *                 the POINT (OQ-19: eZee's assignment IS the door, read fresh
 *                 from BKG-03 at task time — never the mirror's stale label).
 *   guest body  → `param` below, which adds the house-name ban. Unchanged.
 *
 * Everything else is shared and stays shared, because it is about Meta's wire
 * format and this project's money rule, neither of which cares who is reading:
 *
 * Meta forbids newlines, tabs and runs of 4+ spaces INSIDE a parameter value
 * (the body may contain newlines; a {{n}} substitution may not). A param that
 * breaks this is rejected at send time with a 132000-class error, so we refuse
 * it here instead — where a test can see it.
 */
// The FLOOR every param must clear — Meta's hard wire rules ONLY. Meta forbids
// newlines, tabs and runs of 4+ spaces INSIDE a parameter value (the body may
// contain them; a {{n}} substitution may not). A param that breaks this is
// rejected at send time with a 132000-class error, so we refuse it here — where a
// test can see it.
//
// 🚨 A card read ENTIRELY by STAFF (the escalation card) needs ONLY this floor.
// Its slots carry the guest's own transcript words, which routinely contain a ₹
// figure (the AI quoted a rate) or a URL (the guest pasted an OTA link) — and
// NONE of it reaches a guest. Banning ₹/URL there only makes a legitimate handover
// card undeliverable: CH-14a's review found a pricing-dispute escalation whose
// detail carried the AI's own "₹12,000" quote failed schema.parse and the front
// desk got nothing, on the single most common escalation path.
const staffReadParam = z
  .string()
  .min(1)
  .max(200)
  .refine((v) => !/[\n\r\t]/.test(v), 'template params may not contain newlines or tabs')
  .refine((v) => !/ {4,}/.test(v), 'template params may not contain 4+ consecutive spaces');

const staffParam = staffReadParam
  // THE MONEY RULE, made load-bearing rather than incidental. Nothing in the
  // lifecycle path passes bookings_mirror.amount today — but "no caller happens
  // to do it" is not a guarantee, and this is the one outbound with no model and
  // no §6.5 guardrail behind it. A guest name of "₹5,000" would otherwise render
  // a rupee figure straight onto a guest's screen. Used on slots that carry OUR
  // verified facts (a resolved door, an id) — NOT a staff-read transcript slot.
  .refine((v) => !/₹|\b(?:INR|Rs\.?)\s*\d/i.test(v), 'template params may not contain a ₹ figure')
  .refine((v) => !/https?:\/\//i.test(v), 'template params may not carry a URL');

/**
 * Guest-facing params. Everything `staffParam` refuses, PLUS the house-name ban.
 *
 * Enforced in the SLOT and not just the sentence. The bodies are checked for
 * house names by a test, but a house can only ever reach a guest through a
 * PARAM — and `villaType` is free text from eZee's back office, so "Nistula
 * Villa B1" must not sail through onto a guest's screen.
 *
 * WHY the ban survives OQ-19's answer (CH-13a — the reason changed, the rule
 * did not): naming a house to a GUEST is no longer *contradictory* — the
 * website abolished house-choice, so eZee's pick is the real door — but it is
 * still gated on **OQ-15** (may we promise a specific house before arrival at
 * all?) and on staleness (an assignment can move before the guest arrives).
 * `stayView.TRUST_EZEE_ROOM_ASSIGNMENT` stays false for exactly that reason.
 * Staff routing is a different predicate and uses `staffParam` above.
 *
 * The predicate lives in lib/villas.ts because CH-13a's `create_staff_task`
 * screens its summary with the SAME question, and two copies would drift.
 */
const param = staffParam.refine(
  (v) => !namesPhysicalHouse(v),
  'template params may not name a physical house (guest-facing: OQ-15)',
);

export interface TemplateDef {
  /** The name submitted to Meta. Versioned: a body change is a NEW template. */
  name: string;
  language: 'en';
  /** Meta's billing/permission category. Marketing requires marketing_opt_in. */
  category: 'utility' | 'marketing';
  /** Param names in {{1}}…{{n}} order — the positional contract with Meta. */
  order: readonly string[];
  schema: z.ZodType<Record<string, string>>;
  render: (p: Record<string, string>) => string;
}

const def = (d: TemplateDef): TemplateDef => d;

/* ── guest lifecycle ─────────────────────────────────────────────────────── */

export const LIFECYCLE_TEMPLATES: Record<ScheduledKind, TemplateDef> = {
  confirmation: def({
    name: 'nst_confirmation_v1',
    language: 'en',
    category: 'utility',
    order: ['firstName', 'villaType', 'locality', 'dates', 'reference'],
    schema: z.object({
      firstName: param,
      villaType: param,
      locality: param,
      dates: param,
      reference: param,
    }),
    render: (p) =>
      `${p.firstName}, your booking with Nistula is confirmed — your ${p.villaType} in ${p.locality}, ${p.dates}. Your reference is ${p.reference}. Check-in is from 3 pm, and we are right here on WhatsApp whenever you need us.`,
  }),

  prearrival: def({
    name: 'nst_prearrival_v1',
    language: 'en',
    category: 'utility',
    order: ['firstName', 'checkInDay'],
    schema: z.object({ firstName: param, checkInDay: param }),
    // The pin promise is the one kb/faq.md already makes to guests, and a human
    // keeps it. We do not have a location pin to send ourselves (OQ-12).
    render: (p) =>
      `${p.firstName}, we are looking forward to welcoming you on ${p.checkInDay}. Check-in is from 3 pm — share your expected arrival time and we will send an accurate location pin and arrival guidance. If there is anything we can arrange before you travel, just say.`,
  }),

  welcome: def({
    name: 'nst_welcome_v1',
    language: 'en',
    category: 'utility',
    order: ['firstName', 'villaType'],
    schema: z.object({ firstName: param, villaType: param }),
    // WHY no "a late breakfast" (it was here, and a review caught it): the
    // tariff is ACCOMMODATION ONLY unless meals are listed on the booking
    // (kb/policies.md, kb/faq.md), the meal plan is an opaque rate code we
    // cannot read (OQ-16), and no breakfast fee is published — so guardrail 1
    // would block the AI from even pricing it if the guest said yes. Offering a
    // service we may not provide, cannot price and cannot fulfil is exactly what
    // §6.5 exists to stop, and this body sits where §6.5 cannot see it.
    render: (p) =>
      `${p.firstName}, your ${p.villaType} is ready for you today, from 3 pm. Anything at all during your stay — an extra towel, a cab, a recommendation — message us right here.`,
  }),

  poststay: def({
    name: 'nst_poststay_v1',
    language: 'en',
    category: 'utility',
    order: ['firstName'],
    schema: z.object({ firstName: param }),
    // TODO(CH-15): append the consent line ("May we write to you when the season
    // turns? Reply YES and we will.") — win-back has no opted-in guest without it.
    render: (p) =>
      `${p.firstName}, thank you for staying with us. We hope Goa was kind to you — and if anything could have been better, we would genuinely like to hear it.`,
  }),

  winback: def({
    name: 'nst_winback_v1',
    language: 'en',
    category: 'marketing',
    order: ['firstName', 'villaType', 'locality'],
    schema: z.object({ firstName: param, villaType: param, locality: param }),
    // Names the villa TYPE, not the house — docs/product-picture.md S6 was
    // amended for exactly this (OQ-19). No pressure, no discount language ever.
    render: (p) =>
      `${p.firstName}, the season is turning in Goa. If another stay is on your mind, your ${p.villaType} in ${p.locality} is here whenever you are. (Reply STOP anytime to stop these.)`,
  }),

  lead_followup: def({
    name: 'nst_lead_followup_v1',
    language: 'en',
    category: 'marketing',
    order: ['firstName', 'villaType', 'dates'],
    schema: z.object({ firstName: param, villaType: param, dates: param }),
    // WHY it claims nothing about availability: this sends 3 days after the
    // enquiry (CH-15), and "your dates are still free" would be a fact we have
    // not checked at send time. The guest re-quotes live, as everyone does.
    render: (p) =>
      `${p.firstName}, a gentle note about the ${p.villaType} you were considering for ${p.dates}. No rush at all — we are right here if you would like the link again. (Reply STOP anytime to stop these.)`,
  }),
};

/* ── staff-facing (§5.3: the window rule binds staff numbers too) ─────────── */

/**
 * A task card or digest sent to a staff number whose own 24h window is shut is
 * business-initiated exactly like a guest send, and Meta treats it identically
 * — so it needs an approved template or it fails with 131047.
 *
 * `task_card` is WIRED (CH-13a, staff/notifier.ts); `escalation_card` is WIRED
 * (CH-14a, staff/notifier.ts `notifyEscalation`). `digest`/`draft_card` remain
 * defined-not-wired, by CH-14b/16.
 *
 * CH-14a: the `escalation_card` is read ENTIRELY by a human on the front desk and
 * reaches NO guest, so ALL its slots are `staffReadParam` (Meta's floor only). Its
 * `reason`/`detail` carry the guest's OWN transcript words — a house ("the AC in
 * Apartment 09 is weak"), a ₹ figure the AI quoted, a URL the guest pasted — every
 * one of which the front desk needs and none of which may block delivery. The
 * review's first cut used `staffParam` (house-legal but still ₹/URL-banned) and a
 * pricing-dispute escalation carrying the AI's own rate quote failed schema.parse,
 * so the card never landed. The money/URL bans exist to protect a GUEST screen;
 * this card is not one.
 */
export const STAFF_TEMPLATES: Record<StaffTemplateKey, TemplateDef> = {
  task_card: def({
    name: 'nst_task_card_v1',
    language: 'en',
    category: 'utility',
    order: ['shortId', 'villa', 'guestName', 'summary'],
    // TWO SOURCES, TWO CONTRACTS — the split that matters on this card:
    //  - `villa` is OUR verified fact, resolved server-side from a fresh BKG-03
    //    read (staff/villaRoute.ts). A house name is the entire point: it is
    //    the door housekeeping walks to. → staffParam.
    //  - `summary` and `guestName` are SOMEBODY ELSE'S claim — the model
    //    authored the summary and its likeliest source for a house is the
    //    guest's own guess ("I'm in Apartment 09"), while the profile name is
    //    attacker-chosen. A house there is an unverified claim COMPETING with
    //    the slot we resolved, and a card reading "Apartment 06 · Rahul · towels
    //    for Apartment 09" is worse than useless — it is two doors. → param.
    // create_staff_task screens the summary first, so this is the backstop: if
    // it ever regressed, the send fails cleanly as notify_failed and licenses
    // no promise, rather than sending housekeeping somewhere on a guess.
    schema: z.object({
      shortId: staffParam,
      villa: staffParam,
      guestName: param,
      summary: param,
    }),
    render: (p) =>
      `NISTULA TASK #${p.shortId}\n${p.villa} · ${p.guestName} · ${p.summary}\nReply DONE ${p.shortId} when finished.`,
  }),

  escalation_card: def({
    name: 'nst_escalation_card',
    language: 'en',
    category: 'utility',
    order: ['shortId', 'guestName', 'reason', 'detail'],
    // 🚨 The card is read ENTIRELY by a human on the front desk and reaches NO
    // guest, so EVERY slot is staffReadParam (Meta's floor only). `reason` and
    // `detail` carry the guest's own transcript words — a house, a ₹ figure the AI
    // quoted, a URL the guest pasted — all of which the front desk needs and none
    // of which may block delivery (CH-14a review DEFECT). `guestName` too: a guest
    // WhatsApp name of "₹5000" must not jam the handover. The money/URL bans exist
    // to protect a GUEST screen; this card is not one.
    schema: z.object({
      shortId: staffReadParam,
      guestName: staffReadParam,
      reason: staffReadParam,
      detail: staffReadParam,
    }),
    render: (p) =>
      `NISTULA ESCALATION #${p.shortId}\n${p.guestName} · ${p.reason}\n${p.detail}\nReply in the guest's thread to take over.`,
  }),

  digest: def({
    name: 'nst_digest',
    language: 'en',
    category: 'utility',
    order: ['day', 'summary'],
    // Staff-read (goes to OPS): the summary is built from task summaries, which
    // carry the guest's own words — a ₹ figure, a house, a URL — so staffReadParam
    // (the escalation-card lesson, CH-14a review). Meta still bans a newline in a
    // param, so the digest builder keeps `summary` to ONE line.
    schema: z.object({ day: staffReadParam, summary: staffReadParam }),
    render: (p) => `NISTULA DIGEST — ${p.day}\n${p.summary}`,
  }),

  draft_card: def({
    name: 'nst_draft_card',
    language: 'en',
    category: 'utility',
    order: ['shortId', 'guestName', 'replyType', 'body'],
    schema: z.object({ shortId: param, guestName: param, replyType: param, body: param }),
    render: (p) =>
      `DRAFT #${p.shortId} for ${p.guestName} (${p.replyType})\n---\n${p.body}\n---\nReply: OK ${p.shortId} · EDIT ${p.shortId} <new text> · NO ${p.shortId}`,
  }),
};

export const ALL_TEMPLATES: Record<TemplateKey, TemplateDef> = {
  ...LIFECYCLE_TEMPLATES,
  ...STAFF_TEMPLATES,
};

/* ── rendering ───────────────────────────────────────────────────────────── */

/** The exact body to submit to Meta for approval — generated from `render`, so
 * the approved template and the message we send can never disagree. */
export function metaBody(d: TemplateDef): string {
  const positional = Object.fromEntries(d.order.map((k, i) => [k, `{{${i + 1}}}`]));
  return d.render(positional);
}

/** Meta's `components` payload: one body component, params in {{n}} order. */
export function templateComponents(d: TemplateDef, params: Record<string, string>): unknown[] {
  return [
    {
      type: 'body',
      parameters: d.order.map((k) => ({ type: 'text', text: params[k] })),
    },
  ];
}

/** Validate + render. Throws on a param Meta would reject — callers build params
 * from stayView, so a throw means a programming error, not a guest input. */
export function renderTemplate(key: TemplateKey, params: Record<string, string>): string {
  const d = ALL_TEMPLATES[key];
  return d.render(d.schema.parse(params));
}
