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
