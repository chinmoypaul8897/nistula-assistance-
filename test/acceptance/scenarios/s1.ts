/**
 * S1 · Midnight enquiry (pre-sales, no human). product-picture.md §S1.
 *
 * SYS: ack + debounce batched · get_quote called (type resolved from "3bhk") ·
 * every ₹ present in tool JSON (guardrail-1 clean) · booking link from
 * get_booking_link · discount ask deflected with the phrasebook line, no
 * discount words. Adversarial: a fabricated ₹ is caught by guardrail-1; a
 * discount-worded draft is replaced by guardrail-3.
 *
 * Invariants exercised: #1 (price-trace), #3 (no-discount), #5 (one reply/burst).
 */
import { assert, type Scenario } from '../scenario.js';
import { PHRASEBOOK } from '../../../src/brain/prompt.js';
import { FIXTURE_TOTAL } from '../support.js';
import { toolUse, txt } from '../support.js';
import { aiReplies, conversationFor, guestByPhone, textSendsTo } from '../query.js';

const GUEST = '+917700900101';

interface ToolRun {
  name: string;
}

export const s1: Scenario = {
  id: 'S1',
  title: 'Midnight enquiry — pre-sales quote, discount deflection, no human',
  async run(h) {
    // ── Turn 1: a two-message burst → ONE combined reply (invariant #5). The
    // model quotes the 3bhk TYPE and offers the booking link.
    const reply =
      `Good evening. Our 3BHK villas in Assagao are free for 20–22 Dec — ₹${FIXTURE_TOTAL.toLocaleString('en-IN')} ` +
      `all-inclusive for the two nights. Shall I share the link to book?`;
    h.script(
      toolUse('get_quote', {
        villa_label: '3bhk',
        check_in: '2026-12-20',
        check_out: '2026-12-22',
        adults: 4,
      }),
      toolUse('get_booking_link', { villa_label: '3bhk' }, { text: reply }),
      txt(''),
    );
    await h.sendGuestBurst(GUEST, ['Hi', 'is a 3bhk villa available 20-22 dec? what will be the rate'], {
      name: 'Aditi',
    });

    const guest = await guestByPhone(h.db, GUEST);
    assert(guest, 'S1: guest row created from the inbound');
    const conversation = await conversationFor(h.db, guest.id);
    assert(conversation, 'S1: conversation created');

    const replies = await aiReplies(h.db, conversation.id);
    assert.equal(replies.length, 1, 'S1: the 2-message burst produced exactly ONE reply (debounce)');
    const first = replies[0];
    assert(first, 'S1: reply row exists');

    // The tools actually ran — the reply is not model-invented.
    const runs = ((first.raw as { toolRuns?: ToolRun[] } | null)?.toolRuns ?? []).map((r) => r.name);
    assert(runs.includes('get_quote'), 'S1: get_quote was called');
    assert(runs.includes('get_booking_link'), 'S1: get_booking_link was called');

    // guardrail-1 clean: the real quoted body went out (not the deferral line),
    // and the ₹ traces to the tool JSON.
    const sent = textSendsTo(h, GUEST);
    assert.equal(sent.length, 1, 'S1: one wire send to the guest');
    assert(sent[0]?.body.includes(FIXTURE_TOTAL.toLocaleString('en-IN')), 'S1: the exact quoted ₹ was sent');
    assert(!/discount|% off|deal/i.test(sent[0]?.body ?? ''), 'S1: no discount language');

    // ── Turn 2: "any discount?" — a discount-worded draft is REPLACED by the
    // phrasebook line (guardrail-3), verbatim.
    h.script(txt('I could do a special 10% discount for a direct booking.'));
    await h.sendGuest(GUEST, 'any discount for direct booking?', { name: 'Aditi' });
    const afterDiscount = textSendsTo(h, GUEST);
    const discountReply = afterDiscount.at(-1)?.body ?? '';
    assert.equal(discountReply, PHRASEBOOK.discountAsk, 'S1: discount ask deflected with the phrasebook line');

    // ── Adversarial: a fabricated ₹ with no backing tool call is caught by
    // guardrail-1 → regenerate → defer. The number never reaches the guest.
    h.script(
      txt('A special ₹9,999 for those nights, just for you.'),
      txt('Still ₹9,999 — a one-off.'),
    );
    await h.sendGuest(GUEST, 'what would a 3bhk cost me on 25-27 dec?', { name: 'Aditi' });
    const afterPoison = textSendsTo(h, GUEST).at(-1)?.body ?? '';
    assert(!afterPoison.includes('9,999'), 'S1: the fabricated ₹ was blocked, never sent');
    assert.equal(afterPoison, PHRASEBOOK.quoteApiDown, 'S1: guardrail-1 deferred with the quote-down line');
  },
};
