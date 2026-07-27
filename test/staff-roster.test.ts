import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { assignFor, frontdeskLead, isStaffPhone, memberFor, type Roster } from '../src/staff/roster.js';
import type { StaffMember } from '../src/config.js';

const member = (over: Partial<StaffMember> & Pick<StaffMember, 'name' | 'phone' | 'role'>): StaffMember => ({
  villas: [],
  ...over,
});

const HOUSE = member({
  name: 'Anita',
  phone: '+917700900401',
  role: 'housekeeping',
  villas: ['Apartment 09'],
});
const HOUSE_OTHER = member({
  name: 'Priya',
  phone: '+917700900402',
  role: 'housekeeping',
  villas: ['Apartment 06'],
});
const MAINT = member({
  name: 'Ravi',
  phone: '+917700900403',
  role: 'maintenance',
  villas: ['Apartment 09'],
});
const DESK = member({ name: 'Meera', phone: '+917700900404', role: 'frontdesk' });
const DESK_TWO = member({ name: 'Sunil', phone: '+917700900405', role: 'frontdesk' });

const roster = (members: StaffMember[], opsNumbers: string[] = []): Roster => ({ members, opsNumbers });

describe('assignFor — the §8 ladder', () => {
  it('routes to the member whose role does the work and whose round has the house', () => {
    const r = roster([HOUSE_OTHER, HOUSE, MAINT, DESK]);
    expect(assignFor(r, 'housekeeping', 'Apartment 09')).toEqual({
      phone: HOUSE.phone,
      member: HOUSE,
      via: 'role_and_villa',
    });
  });

  it('keys on the ROLE, not just the villa — Apartment 09 maintenance is not Apartment 09 housekeeping', () => {
    const r = roster([HOUSE, MAINT, DESK]);
    expect(assignFor(r, 'maintenance', 'Apartment 09')?.member).toBe(MAINT);
    expect(assignFor(r, 'housekeeping', 'Apartment 09')?.member).toBe(HOUSE);
  });

  it('falls to the frontdesk lead when the role covers no such house', () => {
    const r = roster([HOUSE, DESK]);
    expect(assignFor(r, 'housekeeping', 'Villa C1')).toEqual({
      phone: DESK.phone,
      member: DESK,
      via: 'frontdesk_lead',
    });
  });

  it('🚨 an UNRESOLVED villa never matches a round — it goes to the front desk', () => {
    // The fail-closed default that matters: "we do not know which house" must
    // never resolve to "send whoever cleans Apartment 09".
    const r = roster([HOUSE, DESK]);
    const assignment = assignFor(r, 'housekeeping', null);
    expect(assignment?.via).toBe('frontdesk_lead');
    expect(assignment?.member).toBe(DESK);
  });

  it('a null villa with a SINGLE housekeeper still does not guess that housekeeper', () => {
    const r = roster([HOUSE, DESK]);
    expect(assignFor(r, 'housekeeping', null)?.member).not.toBe(HOUSE);
  });

  it('falls to ops when there is no front desk at all, and marks the rung', () => {
    const r = roster([HOUSE], ['+917700900409']);
    expect(assignFor(r, 'housekeeping', 'Villa C1')).toEqual({
      phone: '+917700900409',
      member: null,
      via: 'ops',
    });
  });

  it('returns null — never an invented recipient — when no rung has anybody', () => {
    expect(assignFor(roster([]), 'housekeeping', 'Apartment 09')).toBeNull();
    expect(assignFor(roster([HOUSE]), 'housekeeping', 'Villa C1')).toBeNull();
  });

  it('an empty villas list is not a wildcard — it only ever answers as a fallback', () => {
    const floating = member({ name: 'Floater', phone: '+917700900406', role: 'housekeeping' });
    const r = roster([floating, DESK]);
    expect(assignFor(r, 'housekeeping', 'Apartment 09')?.via).toBe('frontdesk_lead');
  });

  it('escalation and night_queue are front-desk work, not housekeeping', () => {
    const r = roster([HOUSE, DESK]);
    expect(assignFor(r, 'escalation', 'Apartment 09')?.member).toBe(DESK);
    expect(assignFor(r, 'night_queue', 'Apartment 09')?.member).toBe(DESK);
  });

  it('the frontdesk LEAD is the first frontdesk member — roster order is the contract', () => {
    expect(frontdeskLead(roster([HOUSE, DESK, DESK_TWO]))).toBe(DESK);
    expect(frontdeskLead(roster([HOUSE, DESK_TWO, DESK]))).toBe(DESK_TWO);
    expect(frontdeskLead(roster([HOUSE]))).toBeNull();
  });
});

describe('isStaffPhone / memberFor', () => {
  it('matches roster and ops numbers, normalised-vs-normalised', () => {
    const r = roster([HOUSE], ['+917700900409']);
    expect(isStaffPhone(r, '+917700900401')).toBe(true);
    expect(isStaffPhone(r, '+917700900409')).toBe(true);
    expect(isStaffPhone(r, '+917700900999')).toBe(false);
  });

  it('an ops number is staff but not a member — ops is a channel, not a person', () => {
    const r = roster([HOUSE], ['+917700900409']);
    expect(memberFor(r, '+917700900409')).toBeNull();
    expect(memberFor(r, '+917700900401')).toBe(HOUSE);
  });
});

describe('STAFF_ROSTER_JSON villa canonicalisation (§3.3 applied to the field it forgot)', () => {
  const base = { NODE_ENV: 'test', PORT: '3000' };
  const load = (villas: unknown) =>
    loadConfig({
      ...base,
      STAFF_ROSTER_JSON: JSON.stringify([
        { name: 'Anita', phone: '+917700900401', role: 'housekeeping', villas },
      ]),
    });

  it('stores the CANONICAL label, so "apt 9" and "a9" both match eZee\'s "Apartment 09"', () => {
    // CH-20: this used to canonicalise "B3"/"b3" → "Villa B3". That house was
    // retired 2026-07-24, so a roster naming it now refuses boot (below) — which
    // means the old fixture asserted canonicalisation on an input production can
    // no longer accept. Same contract, on a house we still let.
    expect(load(['apt 9']).staffRoster[0]?.villas).toEqual(['Apartment 09']);
    expect(load(['a9']).staffRoster[0]?.villas).toEqual(['Apartment 09']);
    expect(load(['Apartment 09']).staffRoster[0]?.villas).toEqual(['Apartment 09']);
  });

  it('🚨 REFUSES BOOT on a RETIRED villa, and says WHY — routing to it is impossible', () => {
    // The four three-bedroom Assagao houses went 2026-07-24 (CH-20). A roster
    // naming one is not a typo to be canonicalised and not a house to route to —
    // there is no door. Boot is the last place a human is still watching, so it
    // fails there rather than silently falling back to the frontdesk lead for
    // ever. The message must name the CAUSE: "not a villa we know" would send an
    // operator hunting for a typo that is not there.
    for (const label of ['B1', 'Villa B3', 'c1', 'Villa C3']) {
      expect(() => load([label])).toThrow(/no longer lets/);
    }
  });

  it('canonicalises apartments and Siolim the same way', () => {
    expect(load(['apt 6', 'siolim']).staffRoster[0]?.villas).toEqual(['Apartment 06', 'Siolim 4BHK']);
  });

  it('🚨 REFUSES BOOT on a villa that is not ours — the silent-misroute bug', () => {
    // Without this, every housekeeping task for that house routes to the
    // frontdesk lead with no error anywhere: a config bug presenting as a
    // mysterious ops workload.
    expect(() => load(['B33'])).toThrow(/villa "B33" for "Anita" is not a villa we know/);
  });

  it('REFUSES BOOT on a villa TYPE — it names three houses, and we will not guess', () => {
    // CH-20: "Nistula Villa"/"3bhk" named the retired TYPE and now refuse boot
    // for the retirement reason instead (covered above). The apartments are the
    // ONLY multi-unit type left, so they are the only place this rule can still
    // be exercised — which is exactly why it must keep being exercised.
    expect(() => load(['apartment'])).toThrow(/names a villa TYPE/);
    expect(() => load(['Nistula Apartment'])).toThrow(/names a villa TYPE/);
  });

  it('an empty villas list is legal — a member with no specific round', () => {
    expect(load([]).staffRoster[0]?.villas).toEqual([]);
  });

  it('still refuses an unnormalisable phone and a shared phone (CH-00 behaviour intact)', () => {
    expect(() =>
      loadConfig({
        ...base,
        STAFF_ROSTER_JSON: JSON.stringify([
          { name: 'A', phone: 'not-a-phone', role: 'frontdesk', villas: [] },
        ]),
      }),
    ).toThrow(/not normalisable/);
    expect(() =>
      loadConfig({
        ...base,
        STAFF_ROSTER_JSON: JSON.stringify([
          { name: 'A', phone: '+917700900401', role: 'frontdesk', villas: [] },
          { name: 'B', phone: '7700900401', role: 'housekeeping', villas: [] },
        ]),
      }),
    ).toThrow(/share one phone number/);
  });
});
