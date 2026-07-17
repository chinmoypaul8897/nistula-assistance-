/**
 * Who gets the card (plan §8 CH-13 step 1). Pure — no DB, no clock, no IO.
 *
 * The ladder is §8's, stated as a contract rather than a list: send the task to
 * the person whose ROLE does this work and whose ROUND includes this house;
 * failing that, to the front desk, who can find out; failing that, to ops, who
 * can find the front desk. Every rung is a real human who could act. When no
 * rung has anybody, `assignFor` returns null and the caller records a hole —
 * it never invents a recipient.
 */
import type { StaffMember } from '../config.js';
import type { TaskKind } from '../db/tasks.js';

export interface Roster {
  members: readonly StaffMember[];
  opsNumbers: readonly string[];
}

export type StaffRole = StaffMember['role'];

/**
 * Which roster ROLE does this kind of work? Written as a total map, so adding a
 * task kind forces a decision here rather than silently falling through to the
 * frontdesk (the enumerated-rule failure class this repo keeps hitting: the
 * `escalation`/`night_queue` kinds are CH-14's and they are answered NOW).
 */
const ROLE_FOR_KIND: Readonly<Record<TaskKind, StaffRole>> = {
  housekeeping: 'housekeeping',
  maintenance: 'maintenance',
  frontdesk: 'frontdesk',
  // A guest asking for a human is a front-desk job, not a housekeeping one.
  escalation: 'frontdesk',
  // Nobody is on duty; CH-14b's morning digest converts it. The front desk is
  // who owns it when they walk in.
  night_queue: 'frontdesk',
};

/**
 * The front-desk LEAD. §8 says "else frontdesk lead" but `role` is a flat enum
 * with no lead marker, so "the lead" would otherwise be undefined with two
 * frontdesk members. §8 also says "first matching" — so the lead is the FIRST
 * frontdesk member in STAFF_ROSTER_JSON. That makes roster ORDER meaningful,
 * which is a contract worth stating out loud rather than discovering.
 */
export function frontdeskLead(roster: Roster): StaffMember | null {
  return roster.members.find((m) => m.role === 'frontdesk') ?? null;
}

export interface Assignment {
  phone: string;
  /** Null when the rung is an ops number — ops is a channel, not a person. */
  member: StaffMember | null;
  /** Which rung answered. Carried so the caller can log/alert honestly rather
   * than reporting a fallback as if it were a real assignment. */
  via: 'role_and_villa' | 'frontdesk_lead' | 'ops';
}

/**
 * The §8 ladder.
 *
 * `villa` is the CANONICAL label of the physical door as eZee reported it at
 * task time (staff/villaRoute.ts), or null when we could not establish one.
 * Roster villas are canonicalised at boot (config.ts), so this compares
 * canonical-to-canonical — the same normalised-vs-normalised discipline §3.3
 * demands of phones, for the same reason.
 *
 * A null villa CANNOT match a round, and that is the correct fail-closed
 * behaviour rather than an inconvenience: "we do not know which house" must
 * never resolve to "send whoever cleans B3". It goes to the front desk, who
 * can look it up — which is exactly what §8 means by the frontdesk fallback
 * being "the correct fail-closed default".
 */
export function assignFor(roster: Roster, kind: TaskKind, villa: string | null): Assignment | null {
  const role = ROLE_FOR_KIND[kind];
  if (villa !== null) {
    const match = roster.members.find((m) => m.role === role && m.villas.includes(villa));
    if (match !== undefined) return { phone: match.phone, member: match, via: 'role_and_villa' };
  }
  const lead = frontdeskLead(roster);
  if (lead !== null) return { phone: lead.phone, member: lead, via: 'frontdesk_lead' };
  const ops = roster.opsNumbers[0];
  if (ops !== undefined) return { phone: ops, member: null, via: 'ops' };
  return null;
}

/** Is this number on the roster or an ops number? §3.3: roster wins over guest
 * — such a number never gets an AI conversation. Both sides are normalised at
 * boot; the caller normalises the inbound. */
export function isStaffPhone(roster: Roster, phone: string): boolean {
  return (
    roster.members.some((m) => m.phone === phone) || roster.opsNumbers.some((n) => n === phone)
  );
}

/** The roster member behind a phone, if any. Ops numbers are not members. */
export function memberFor(roster: Roster, phone: string): StaffMember | null {
  return roster.members.find((m) => m.phone === phone) ?? null;
}
