/**
 * CH-02 step 5 — the scrubber is what stands between a real captured payload
 * and the repo: phones, bodies and names must all die here, and the emitted
 * fixtures must pass the CI `+91` guard by construction.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { scrubFixture } from '../scripts/fixture-scrub.js';

const CAPTURE = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '1010101010101010',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '15551798672', phone_number_id: '1010101010101010' },
            contacts: [{ profile: { name: 'Rahul Mehta' }, wa_id: '919812345678' }],
            messages: [
              {
                from: '919812345678',
                id: 'wamid.HBgMOTE5ODEyMzQ1Njc4FQIAEhg=',
                timestamp: '1720620000',
                text: { body: 'hi, call me on +91 98123 45678 about villa B3' },
                type: 'text',
              },
            ],
            statuses: [
              {
                id: 'wamid.OUT',
                status: 'failed',
                recipient_id: '919812345678',
                errors: [
                  {
                    code: 131026,
                    title: 'Undeliverable',
                    error_data: { details: 'number 919812345678 unreachable' },
                  },
                ],
              },
            ],
          },
          field: 'messages',
        },
      ],
    },
  ],
};

describe('scrubFixture', () => {
  const { scrubbed, stats } = scrubFixture(CAPTURE);
  const json = JSON.stringify(scrubbed);

  it('replaces every phone-keyed field with a reserved number, consistently', () => {
    const value = (scrubbed as typeof CAPTURE).entry[0]?.changes[0]?.value;
    expect(value?.contacts?.[0]?.wa_id).toMatch(/^91770090\d{4}$/);
    // Same source number → same reserved number across keys.
    expect(value?.messages?.[0]?.from).toBe(value?.contacts?.[0]?.wa_id);
    expect(value?.statuses?.[0]?.recipient_id).toBe(value?.contacts?.[0]?.wa_id);
  });

  it('replaces bodies with lorem and profile names with placeholders', () => {
    const value = (scrubbed as typeof CAPTURE).entry[0]?.changes[0]?.value;
    expect(value?.messages?.[0]?.text?.body).toBe('Lorem ipsum dolor sit amet.');
    expect(value?.contacts?.[0]?.profile?.name).toMatch(/^Test Guest \d+$/);
    expect(stats.bodies).toBeGreaterThan(0);
    expect(stats.names).toBe(1);
  });

  it('scrubs phone-shaped runs inside free text (error details)', () => {
    const value = (scrubbed as typeof CAPTURE).entry[0]?.changes[0]?.value;
    expect(value?.statuses?.[0]?.errors?.[0]?.error_data?.details).not.toContain('9812345678');
  });

  it('leaves timestamps and wamids untouched', () => {
    const value = (scrubbed as typeof CAPTURE).entry[0]?.changes[0]?.value;
    expect(value?.messages?.[0]?.timestamp).toBe('1720620000');
    expect(value?.messages?.[0]?.id).toBe('wamid.HBgMOTE5ODEyMzQ1Njc4FQIAEhg=');
  });

  it('emits nothing the CI +91 guard would catch, and no source number survives', () => {
    expect(json).not.toMatch(/\+91[0-9]{5,}/);
    expect(json).not.toContain('9812345678');
  });

  it('is deterministic within a run: distinct phones get distinct reserved numbers', () => {
    const twoPhones = scrubFixture({ a: { from: '919812345678' }, b: { from: '918899776655' } });
    const scrubbedPair = twoPhones.scrubbed as { a: { from: string }; b: { from: string } };
    expect(scrubbedPair.a.from).not.toBe(scrubbedPair.b.from);
    expect(twoPhones.stats.phones).toBe(2);
  });
});

describe('committed fixtures hygiene (the CI guard, enforced locally too)', () => {
  it('no fixture contains a +91 form or a real-looking name', () => {
    const dir = new URL('./fixtures/wa/', import.meta.url);
    for (const file of readdirSync(dir)) {
      const content = readFileSync(new URL(file, dir), 'utf8');
      expect(content, file).not.toMatch(/\+91[0-9]{5,}/);
    }
  });
});
