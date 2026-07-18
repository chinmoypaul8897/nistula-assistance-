/**
 * CH-16 · the draft card must render a real reply. Regression guard for the bug
 * the pre-defined template shipped with: every slot used the guest-facing `param`
 * schema, which bans a ₹ figure and a URL — so the single most common draft (a
 * quote with a booking link) would throw at schema.parse and the approver would
 * get nothing. The body is the AI's OWN already-vetted reply, so those bans are
 * wrong here.
 */
import { describe, expect, it } from 'vitest';
import { renderTemplate } from '../src/lifecycle/templates.js';

describe('nst_draft_card render', () => {
  it('renders a body carrying a ₹ figure and a booking URL without throwing', () => {
    const body =
      'Our 3BHK villa in Assagao is ₹42,000 all-inclusive for those nights. ' +
      'Book here: https://nistula.life/villas/5220300000000000002';
    const card = renderTemplate('draft_card', {
      shortId: 'A3F2K9',
      guestName: 'Rahul',
      replyType: 'presales',
      body,
    });
    expect(card).toContain('DRAFT #A3F2K9');
    expect(card).toContain('₹42,000');
    expect(card).toContain('https://nistula.life');
    expect(card).toContain('OK A3F2K9');
    expect(card).toContain('NO A3F2K9');
  });

  it('still refuses a newline in a param (Meta bans it)', () => {
    expect(() =>
      renderTemplate('draft_card', {
        shortId: 'A3F2K9',
        guestName: 'Rahul',
        replyType: 'presales',
        body: 'line one\nline two',
      }),
    ).toThrow();
  });
});
