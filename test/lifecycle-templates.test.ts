/**
 * CH-12 · the template catalog.
 *
 * A lifecycle body is the one place the system speaks to a guest with NO model
 * in the loop and NO guardrail pipeline after it — the guardrails run on what
 * Claude drafts, not on what this file hard-codes. So the constraints the
 * guardrails would have enforced have to be asserted HERE, on the static bodies,
 * or they are not enforced at all.
 */
import { describe, expect, it } from 'vitest';
import {
  ALL_TEMPLATES,
  LIFECYCLE_TEMPLATES,
  metaBody,
  renderTemplate,
  STAFF_TEMPLATES,
  templateComponents,
  type TemplateDef,
  type TemplateKey,
} from '../src/lifecycle/templates.js';

const entries = Object.entries(ALL_TEMPLATES) as [TemplateKey, TemplateDef][];

/** Fill every param with a benign value so a body can be rendered for scanning. */
function sample(d: TemplateDef): Record<string, string> {
  return Object.fromEntries(d.order.map((k) => [k, `«${k}»`]));
}

describe('every template body', () => {
  it.each(entries)('%s has no exclamation mark (voice guide v1.1)', (_key, d) => {
    expect(metaBody(d)).not.toContain('!');
  });

  it.each(entries)('%s states no ₹ figure — money never leaves a template', (_key, d) => {
    // The booking amount may be the OTA net rather than what the guest paid, and
    // no security-deposit figure is published anywhere (OQ-04/OQ-13).
    expect(metaBody(d)).not.toContain('₹');
    expect(metaBody(d)).not.toMatch(/\b(?:INR|Rs\.?)\s*\d/i);
  });

  it.each(entries)('%s names no HOUSE — eZee only guessed it (OQ-19)', (_key, d) => {
    // Not even as a literal. The params carry the villa TYPE, from stayView.
    expect(metaBody(d)).not.toMatch(/\b(?:Apartment|Villa)\s*[A-Za-z]?\d/i);
    expect(metaBody(d)).not.toMatch(/\bSiolim 4BHK\b/);
  });

  it('the param guard rejects EVERY real house — including "Apartment 11" (regression)', () => {
    // The earlier 0?\d guard let "Apartment 11" (a real house) through. Guard by
    // the contract: Apartment/Villa followed by any number is a house.
    for (const house of [
      'Nistula Apartment 06',
      'Nistula Apartment 09',
      'Nistula Apartment 11', // the one the old regex missed
      'Villa B1',
      'Villa B3',
      'Villa C1',
      'Villa C3',
    ]) {
      expect(() => renderTemplate('welcome', { firstName: 'A', villaType: house })).toThrow();
    }
    // ...but the TYPE strings (no number) pass.
    for (const type of ['Nistula Apartment', 'Nistula Villa', 'Nistula 4BHK']) {
      expect(() => renderTemplate('welcome', { firstName: 'A', villaType: type })).not.toThrow();
    }
  });

  it.each(entries)('%s uses no banned vocabulary', (_key, d) => {
    const body = metaBody(d).toLowerCase();
    for (const banned of [
      'discount',
      'deal',
      'cheap',
      'hurry',
      'limited',
      'amazing',
      'awesome',
      'luxurious',
      'hassle-free',
      'kindly',
      'dear guest',
      'as per policy',
      'do the needful',
      'asap',
      'revert',
    ]) {
      expect(body).not.toContain(banned);
    }
  });

  it.each(entries)('%s promises no address or map pin we do not have', (_key, d) => {
    // OQ-12: there is no address, pin or coordinate anywhere in the KB. The
    // pre-arrival may PROMISE that a human sends one (the FAQ already does), but
    // no template may imply it is attached.
    expect(metaBody(d)).not.toMatch(/google\.com\/maps|maps\.app|goo\.gl|attached|below is the pin/i);
  });
});

describe('metaBody — the anti-drift guarantee', () => {
  it.each(entries)('%s renders positional {{1}}..{{n}} matching its order', (_key, d) => {
    const body = metaBody(d);
    d.order.forEach((_name, i) => {
      expect(body).toContain(`{{${i + 1}}}`);
    });
    // and nothing beyond the declared arity
    expect(body).not.toContain(`{{${d.order.length + 1}}}`);
  });

  it('is the SAME function dev sends through — so approved ≠ sent is impossible', () => {
    const d = LIFECYCLE_TEMPLATES.confirmation;
    const meta = metaBody(d);
    const live = renderTemplate('confirmation', {
      firstName: 'Rahul',
      villaType: 'Nistula Villa',
      locality: 'Assagao',
      dates: '20–22 December 2026',
      reference: '953',
    });
    // Same skeleton, different substitutions.
    expect(meta.replace(/\{\{\d\}\}/g, 'X')).toBe(
      live
        .replace('Rahul', 'X')
        .replace('Nistula Villa', 'X')
        .replace('Assagao', 'X')
        .replace('20–22 December 2026', 'X')
        .replace('953', 'X'),
    );
  });
});

describe('category + consent', () => {
  it('win-back and lead follow-up are MARKETING (opt-in gated)', () => {
    expect(LIFECYCLE_TEMPLATES.winback.category).toBe('marketing');
    expect(LIFECYCLE_TEMPLATES.lead_followup.category).toBe('marketing');
  });

  it('service lifecycle messages are UTILITY — they are not marketing', () => {
    for (const k of ['confirmation', 'prearrival', 'welcome', 'poststay'] as const) {
      expect(LIFECYCLE_TEMPLATES[k].category).toBe('utility');
    }
  });

  it('every marketing template carries an opt-out line', () => {
    for (const [, d] of Object.entries(LIFECYCLE_TEMPLATES)) {
      if (d.category === 'marketing') expect(metaBody(d)).toContain('STOP');
    }
  });

  it('no utility template nags about STOP — it is service, not marketing', () => {
    expect(metaBody(LIFECYCLE_TEMPLATES.confirmation)).not.toContain('STOP');
  });

  it('all four staff templates are utility (§5.3)', () => {
    for (const d of Object.values(STAFF_TEMPLATES)) expect(d.category).toBe('utility');
  });
});

describe('param validation — what Meta would reject at send time', () => {
  it.each(entries)('%s rejects a newline inside a param', (key, d) => {
    const bad = { ...sample(d), [d.order[0] as string]: 'line one\nline two' };
    expect(() => renderTemplate(key, bad)).toThrow();
  });

  it.each(entries)('%s rejects an empty param', (key, d) => {
    const bad = { ...sample(d), [d.order[0] as string]: '' };
    expect(() => renderTemplate(key, bad)).toThrow();
  });

  it('rejects a run of 4+ spaces (Meta 132000-class)', () => {
    expect(() => renderTemplate('welcome', { firstName: 'A    B', villaType: 'Nistula Villa' })).toThrow();
  });

  it('accepts ordinary guest names, including a tab-free unicode one', () => {
    expect(() => renderTemplate('welcome', { firstName: 'Ananya', villaType: 'Nistula Villa' })).not.toThrow();
  });
});

describe('🚨 staffParam vs param — two audiences, two contracts (CH-13a)', () => {
  const card = (over: Partial<Record<string, string>> = {}) => ({
    shortId: 'A3F2K9',
    villa: 'Apartment 06',
    guestName: 'Rahul',
    summary: '2 extra towels',
    ...over,
  });

  it('the STAFF card names the house — it is the door housekeeping walks to', () => {
    // The whole of OQ-19's 2026-07-16 answer, in one assertion. Before the
    // schema split this threw, which is why templates.ts carried a TODO(CH-13)
    // warning that the guard would block the card.
    expect(renderTemplate('task_card', card())).toContain('Apartment 06');
    expect(renderTemplate('task_card', card({ villa: 'Villa B3' }))).toContain('Villa B3');
    expect(renderTemplate('task_card', card({ villa: 'Apartment 11' }))).toContain('Apartment 11');
    expect(renderTemplate('task_card', card({ villa: 'Siolim 4BHK' }))).toContain('Siolim 4BHK');
  });

  it('the staff card still carries the villa TYPE when no door was resolved', () => {
    expect(renderTemplate('task_card', card({ villa: 'Nistula Apartment' }))).toContain(
      'Nistula Apartment',
    );
  });

  it('🚨 and the GUEST-facing ban is UNTOUCHED — weakening it was the wrong fix', () => {
    // The guest bodies must still refuse a house: naming one to a guest is no
    // longer contradictory (OQ-19) but is still gated on OQ-15 and on
    // staleness. The split exists precisely so this stays true.
    for (const villaType of ['Apartment 06', 'Villa B3', 'Apartment 11', 'Siolim 4BHK']) {
      expect(() => renderTemplate('welcome', { firstName: 'Rahul', villaType })).toThrow(
        /may not name a physical house/,
      );
    }
    expect(() => renderTemplate('welcome', { firstName: 'Rahul', villaType: 'Nistula Villa' })).not.toThrow();
  });

  it('a house in the SUMMARY is refused — an unverified claim may not compete with the door', () => {
    // The model's likeliest source for a house is the guest's own guess, and a
    // card reading "Apartment 06 · Rahul · towels for Apartment 09" is two
    // doors. create_staff_task screens this; the schema is the backstop.
    expect(() => renderTemplate('task_card', card({ summary: 'towels for Apartment 09' }))).toThrow(
      /may not name a physical house/,
    );
  });

  it('a house in the GUEST NAME is refused — the profile name is attacker-chosen', () => {
    expect(() => renderTemplate('task_card', card({ guestName: 'Villa B3' }))).toThrow(
      /may not name a physical house/,
    );
  });

  it('the money rule and Meta’s wire rules bind BOTH audiences', () => {
    expect(() => renderTemplate('task_card', card({ villa: '₹5,000' }))).toThrow(/₹ figure/);
    expect(() => renderTemplate('task_card', card({ summary: 'Rs. 500 please' }))).toThrow(/₹ figure/);
    expect(() => renderTemplate('task_card', card({ villa: 'a\nb' }))).toThrow(/newlines/);
    expect(() => renderTemplate('task_card', card({ summary: 'see https://x.com' }))).toThrow(/URL/);
  });
});

describe('🚨 escalation_card is ENTIRELY staff-read — the money/URL bans must NOT block it (CH-14a review)', () => {
  const esc = (over: Partial<Record<string, string>> = {}) => ({
    shortId: 'A3F2K9',
    guestName: 'Rahul',
    reason: 'A question outside what the assistant can answer',
    detail: 'Guest: is the AC in Apartment 09 fixed · Us: one moment',
    ...over,
  });

  it('delivers a detail carrying the AI’s own ₹ quote — the review’s dominant failure path', () => {
    // A pricing dispute is the most common escalation; the transcript detail
    // carries "...Us: that is ₹12,000 per night...". Before the fix this failed
    // schema.parse and the front desk got nothing.
    const card = renderTemplate('escalation_card', esc({ detail: 'Us: that is ₹12,000 per night · Guest: too much' }));
    expect(card).toContain('₹12,000');
  });

  it('delivers a detail carrying a guest-pasted URL', () => {
    const card = renderTemplate('escalation_card', esc({ detail: 'Guest: this listing https://airbnb.com/x is cheaper' }));
    expect(card).toContain('https://airbnb.com/x');
  });

  it('delivers a house name in reason/detail, and a ₹/URL guest name — all staff-read', () => {
    expect(renderTemplate('escalation_card', esc({ detail: 'Guest: the AC in Apartment 09 is weak' }))).toContain('Apartment 09');
    expect(() => renderTemplate('escalation_card', esc({ guestName: '₹5000' }))).not.toThrow();
    expect(() => renderTemplate('escalation_card', esc({ reason: 'STILL OPEN after 10 min — Rs. 500 refund' }))).not.toThrow();
  });

  it('STILL rejects Meta’s hard wire breakers (newlines) in any slot', () => {
    // The floor every param clears — a {{n}} substitution may not contain a newline.
    expect(() => renderTemplate('escalation_card', esc({ detail: 'line one\nline two' }))).toThrow(/newlines/);
  });
});

describe('🚨 digest is staff-read too — a house/₹/emoji summary must render (CH-14b review)', () => {
  // The only digest test mocks sendTemplated and never runs def.schema.parse, so
  // this drives the REAL schema — the load-bearing param->staffReadParam swap.
  it('renders a summary naming a house, a ₹ figure, and emoji', () => {
    const out = renderTemplate('digest', {
      day: 'Sunday 20 December',
      summary: '1 raised overnight now live (the AC in Apartment 09 is weak · 23:05); ₹12,000 disputed 🔥',
    });
    expect(out).toContain('Apartment 09');
    expect(out).toContain('₹12,000');
    expect(out).toContain('🔥');
  });

  it('STILL rejects a newline in the summary param (Meta wire rule)', () => {
    expect(() => renderTemplate('digest', { day: 'Sunday', summary: 'line one\nline two' })).toThrow(/newlines/);
  });
});

describe('templateComponents — the Graph payload', () => {
  it('emits one body component with params in declared order', () => {
    const d = LIFECYCLE_TEMPLATES.welcome;
    expect(templateComponents(d, { firstName: 'Rahul', villaType: 'Nistula Villa' })).toEqual([
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'Rahul' },
          { type: 'text', text: 'Nistula Villa' },
        ],
      },
    ]);
  });
});

describe('the bodies themselves', () => {
  it('confirmation carries type, locality, dates, reference and the 3 pm fact', () => {
    const body = renderTemplate('confirmation', {
      firstName: 'Rahul',
      villaType: 'Nistula Villa',
      locality: 'Assagao',
      dates: '20–22 December 2026',
      reference: '953',
    });
    expect(body).toContain('Nistula Villa');
    expect(body).toContain('Assagao');
    expect(body).toContain('20–22 December 2026');
    expect(body).toContain('953');
    expect(body).toContain('3 pm'); // kb/policies.md, verbatim
  });

  it('pre-arrival ASKS for the arrival time rather than pretending to have a pin', () => {
    const body = renderTemplate('prearrival', {
      firstName: 'Rahul',
      checkInDay: 'Sunday 20 December',
    });
    expect(body).toMatch(/arrival time/i);
    expect(body).toMatch(/location pin/i); // the promise the FAQ already makes
  });
});
