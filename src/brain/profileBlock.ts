/**
 * Block [5] GUEST CONTEXT — full version (plan.md §6.2 [5], CH-09 step 3):
 * name + address/language preference + saved facts + linked stays (CH-11), with
 * open tasks (CH-13) still stubbed. Split from prompt.ts (~300-line rule); the
 * DIRECTION matters: prompt.ts is the import-free leaf guardrails sits on,
 * so this module imports the framing + hygiene FROM prompt.ts, never the
 * other way (the CH-06 cycle lesson).
 *
 * Everything here is guest-typed or guest-derived: every dynamic string is
 * sanitised, facts render quoted inside bullets (a stored "[SITUATION]" can
 * never pose as a block header — the CH-08 summary-block rule), and the
 * framing carries the non-evidence clause so nothing in this block can
 * license a guardrail-2 claim.
 */
import { PROFILE_FACTS_LIMIT, type GuestFact, type GuestFactKind } from '../db/guestMemory.js';
import { PROFILE_BLOCK_FRAMING, sanitiseInline } from './prompt.js';
import type { DescribedStay } from './stayView.js';

export type ProfileFact = Pick<GuestFact, 'kind' | 'content' | 'createdAt'>;

export interface GuestProfileInput {
  name: string | null;
  registerPref: 'warm_first_name' | 'formal_sir_maam' | 'unknown';
  langPref: 'en' | 'hinglish' | 'unknown';
  facts: readonly ProfileFact[];
  /** CH-11: already PROJECTED through stayView — a raw mirror row must never
   * reach this file. Cancelled/multi-room/dateless rows never appear here. */
  stays?: readonly DescribedStay[];
  /** CH-11: a booking exists that we may not describe. The model is told it
   * exists and that a person is handling it — never what it says. */
  bookingNeedsHuman?: boolean;
}

// Salience order for the render (§6.2's "grouped"): what went wrong and what
// they like outrank occasions and background.
const KIND_ORDER: readonly GuestFactKind[] = ['past_issue', 'preference', 'celebration', 'context'];

const KIND_LABEL: Record<GuestFactKind, string> = {
  past_issue: 'past issue',
  preference: 'preference',
  celebration: 'celebration',
  context: 'context',
};

const NAME_MAX = 40;
const FACT_RENDER_MAX = 200;
/** Villa names come from OUR villa map or eZee's room-type name — sanitised
 * anyway, because a room-type name is externally-sourced text. */
const VILLA_MAX = 60;

/** "May 2026" recency anchor — IST calendar, matching the business clock. */
function monthYearIST(date: Date): string {
  return date.toLocaleString('en-GB', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

/**
 * Renders block [5]. Null when there is nothing to say (no name, no facts,
 * both prefs unknown) — a first-contact stranger keeps today's no-block
 * behaviour rather than paying uncached tokens for an empty scaffold.
 */
// Guest-derived text renders inside double-quote framing, so a literal `"`
// would let one stored fact forge extra `(kind) "…"` structure on its own
// bullet (audit) — neutralised to a plain apostrophe, content preserved.
function quoteSafe(text: string): string {
  return text.replace(/"/g, "'");
}

export function buildGuestBlock(profile: GuestProfileInput): string | null {
  const name =
    profile.name === null ? '' : quoteSafe(sanitiseInline(profile.name, NAME_MAX));
  const hasPrefs = profile.registerPref !== 'unknown' || profile.langPref !== 'unknown';
  const stays = profile.stays ?? [];
  const needsHuman = profile.bookingNeedsHuman === true;
  // A guest with a booking but no name/facts/prefs must still get a block —
  // otherwise the one thing that matters most about them would vanish.
  if (name === '' && profile.facts.length === 0 && !hasPrefs && stays.length === 0 && !needsHuman) {
    return null;
  }

  const lines: string[] = ['[GUEST CONTEXT]', PROFILE_BLOCK_FRAMING];
  if (name !== '') lines.push(`- Name: "${name}"`);
  if (profile.registerPref === 'formal_sir_maam') {
    lines.push('- Address style: formal — sir/ma’am suits this guest');
  } else if (profile.registerPref === 'warm_first_name') {
    lines.push('- Address style: warm — the first name suits this guest');
  }
  if (profile.langPref === 'hinglish') {
    lines.push('- Language: leans Hinglish — mirror it naturally');
  } else if (profile.langPref === 'en') {
    lines.push('- Language: English');
  }

  const facts = groupFacts(profile.facts);
  if (facts.length > 0) {
    lines.push('Known facts (saved from earlier conversations):');
    for (const fact of facts) {
      const content = quoteSafe(sanitiseInline(fact.content, FACT_RENDER_MAX));
      if (content === '') continue;
      lines.push(`- (${KIND_LABEL[fact.kind]}) "${content}" (${monthYearIST(fact.createdAt)})`);
    }
  }
  lines.push(...stayLines(stays, needsHuman));
  // TODO(CH-13): replace with the guest's open tasks.
  lines.push('Open tasks: not tracked yet.');
  return lines.join('\n');
}

/**
 * The stays section (§6.2 block [5], CH-11). Input is already projected — this
 * function does no policy, it only renders what stayView.ts permitted.
 *
 * Villa naming follows §5.4: a UNIT is named only when eZee has actually
 * assigned one; otherwise the type, with an explicit instruction not to guess a
 * unit. Today every live mirror row has no unit (BKG-02 polls carry no RoomID),
 * so in practice this always speaks the type — which is correct, and which
 * block [4] reinforces.
 */
function stayLines(stays: readonly DescribedStay[], needsHuman: boolean): string[] {
  const lines: string[] = [];
  if (stays.length > 0) {
    lines.push('Stays (from our booking system — dates and villa are reliable):');
    for (const stay of stays) {
      const villa =
        stay.villa === null
          ? 'a villa we have not identified'
          : stay.isUnit
            ? sanitiseInline(stay.villa, VILLA_MAX)
            : `${sanitiseInline(stay.villa, VILLA_MAX)} (villa type — the specific unit is not assigned yet, do not name one)`;
      const party = partyOf(stay);
      lines.push(
        `- ${villa}, ${stay.checkIn} to ${stay.checkOut}${party}${pastNote(stay)}`,
      );
    }
  } else if (!needsHuman) {
    lines.push('Stays: no booking is linked to this number.');
  }
  if (needsHuman) {
    // Deliberately detail-free. The row exists, the model must not describe it,
    // and the worker escalates so "the team is looking at it" is TRUE.
    lines.push(
      'Stays: this guest also has a booking record the assistant may NOT describe. State no dates, villa, amount or status for it. The team is being brought in.',
    );
  }
  return lines;
}

function partyOf(stay: DescribedStay): string {
  if (stay.adults === null) return '';
  const children = stay.children !== null && stay.children > 0 ? ` + ${stay.children} children` : '';
  return `, ${stay.adults} adults${children}`;
}

/** A departed stay is annotated so the model never greets a past guest as
 * arriving. Keyed on `live` (DATE-derived), NOT status: no production row is
 * ever `checked_out`, so a completed stay stays `confirmed` and only its dates
 * reveal it is behind us (pre-push audit). */
function pastNote(stay: DescribedStay): string {
  return stay.live ? '' : ' (a past stay)';
}

/** Newest 15 overall, then grouped by kind salience, newest first in-group —
 * the repo read already caps at 15; the slice here is belt-and-braces. */
function groupFacts(facts: readonly ProfileFact[]): ProfileFact[] {
  const newestFirst = [...facts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const capped = newestFirst.slice(0, PROFILE_FACTS_LIMIT);
  return KIND_ORDER.flatMap((kind) => capped.filter((fact) => fact.kind === kind));
}
