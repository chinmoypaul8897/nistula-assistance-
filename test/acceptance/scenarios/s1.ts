/**
 * S1 · Midnight enquiry (pre-sales, no human). product-picture.md §S1.
 *
 * SYS: ack + debounce batched · the "3bhk" ask is REFUSED as retired inventory
 * (CH-20) · get_quote called for the apartment TYPE · every ₹ present in tool
 * JSON (guardrail-1 clean) · booking link from get_booking_link · discount ask
 * deflected with the phrasebook line, no discount words. Adversarial: a
 * fabricated ₹ is caught by guardrail-1; a discount-worded draft is replaced by
 * guardrail-3.
 *
 * 🚨 CH-20 (2026-07-27): the opening ask is UNCHANGED — a guest really does still
 * type "3bhk" — but the four three-bedroom Assagao villas were retired
 * 2026-07-24. The beat this scenario now asserts first is the honest refusal,
 * and with it the negative that matters: the reply must NOT blame the dates. A
 * retired id 404s at the website, and a 404 is indistinguishable from "taken"
 * to everything downstream, so "those dates have gone" was the reachable wrong
 * answer — a false statement about a real house.
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

/** A tool run with its result — S1 asserts the 3bhk refusal's error CODE, not
 * merely that a tool ran. */
interface RetiredRun extends ToolRun {
  result?: { ok: boolean; error?: string };
}

export const s1: Scenario = {
  id: 'S1',
  title: 'Midnight enquiry — pre-sales quote, discount deflection, no human',
  async run(h) {
    // ── Turn 1: a two-message burst → ONE combined reply (invariant #5). The
    // guest asks for a 3BHK; the tool refuses it as retired and the model gives
    // the approved line. NO ₹, NO house named, NO availability claim.
    h.script(
      toolUse('get_quote', {
        villa_label: '3bhk',
        check_in: '2026-12-20',
        check_out: '2026-12-22',
        adults: 4,
      }),
      txt(PHRASEBOOK.inventoryRetired),
    );
    await h.sendGuestBurst(GUEST, ['Hi', 'is a 3bhk villa available 20-22 dec? what will be the rate'], {
      name: 'Aditi',
    });

    const guest = await guestByPhone(h.db, GUEST);
    assert(guest, 'S1: guest row created from the inbound');
    const conversation = await conversationFor(h.db, guest.id);
    assert(conversation, 'S1: conversation created');

    const retiredReplies = await aiReplies(h.db, conversation.id);
    assert.equal(retiredReplies.length, 1, 'S1: the 2-message burst produced exactly ONE reply (debounce)');
    const retiredRun = ((retiredReplies[0]?.raw as { toolRuns?: RetiredRun[] } | null)?.toolRuns ?? [])
      .find((r) => r.name === 'get_quote');
    assert(retiredRun, 'S1: get_quote was called for the 3bhk ask');
    assert.equal(retiredRun.result?.ok, false, 'S1: the 3bhk quote was REFUSED, not priced');
    assert.equal(
      retiredRun.result?.error,
      'INVENTORY_RETIRED',
      'S1: refused as retired inventory — not as an unknown villa, not as a website outage',
    );

    const retiredSend = textSendsTo(h, GUEST).at(-1)?.body ?? '';
    // 🚨 The negative that matters most: never blame the dates for a house that
    // no longer exists. This is the specific false statement CH-20 was built to
    // stop, and it is the one a 404 would otherwise produce.
    // NOTE the shape of this pattern: it bans the AVAILABILITY CLAIM, not the
    // word "dates". The approved line legitimately ends "…for those dates?" —
    // an offer to check, which is the opposite of a claim — so a naive
    // /those dates/ ban fails on the very copy it is meant to protect. (It did,
    // on the first run of this assertion.)
    assert(
      !/\btaken\b|\bunavailable\b|fully booked|booked out|just gone|have gone|no longer free|not free/i.test(
        retiredSend,
      ),
      'S1: the retirement is NOT attributed to the dates',
    );
    assert(!/₹/.test(retiredSend), 'S1: no ₹ figure for a product we cannot quote');
    assert(
      !/Villa B1|Villa B3|Villa C1|Villa C3|Nistula Villa/i.test(retiredSend),
      'S1: no departed house is named back to the guest',
    );
    assert(/apartment/i.test(retiredSend) && /siolim/i.test(retiredSend), 'S1: offers what we DO have');

    // ── Turn 2: the guest takes the apartments. NOW the quote path runs, and
    // everything S1 was built to prove still gets proven.
    const reply =
      `Our apartments in Assagao are free for 20–22 Dec — ₹${FIXTURE_TOTAL.toLocaleString('en-IN')} ` +
      `all-inclusive for the two nights. Shall I share the link to book?`;
    h.script(
      toolUse('get_quote', {
        villa_label: 'apartment',
        check_in: '2026-12-20',
        check_out: '2026-12-22',
        adults: 4,
      }),
      toolUse('get_booking_link', { villa_label: 'apartment' }, { text: reply }),
      txt(''),
    );
    await h.sendGuest(GUEST, 'the apartments then — same dates', { name: 'Aditi' });

    const replies = await aiReplies(h.db, conversation.id);
    const first = replies.at(-1);
    assert(first, 'S1: reply row exists');

    // The tools actually ran — the reply is not model-invented.
    const runs = ((first.raw as { toolRuns?: ToolRun[] } | null)?.toolRuns ?? []).map((r) => r.name);
    assert(runs.includes('get_quote'), 'S1: get_quote was called');
    assert(runs.includes('get_booking_link'), 'S1: get_booking_link was called');

    // guardrail-1 clean: the real quoted body went out (not the deferral line),
    // and the ₹ traces to the tool JSON.
    const sent = textSendsTo(h, GUEST);
    // Two sends now: the retirement line, then the apartment quote (CH-20).
    assert.equal(sent.length, 2, 'S1: one wire send per guest turn');
    const quoted = sent.at(-1)?.body ?? '';
    assert(quoted.includes(FIXTURE_TOTAL.toLocaleString('en-IN')), 'S1: the exact quoted ₹ was sent');
    assert(!/discount|% off|deal/i.test(quoted), 'S1: no discount language');

    // ── Turn 3: "any discount?" — a discount-worded draft is REPLACED by the
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
    // CH-20: asks about the APARTMENTS — a "3bhk" ask would now be refused as
    // retired before the model ever got to fabricate a figure, so the poison
    // would never be swallowed and this adversarial probe would prove nothing.
    await h.sendGuest(GUEST, 'what would an apartment cost me on 25-27 dec?', { name: 'Aditi' });
    const afterPoison = textSendsTo(h, GUEST).at(-1)?.body ?? '';
    assert(!afterPoison.includes('9,999'), 'S1: the fabricated ₹ was blocked, never sent');
    assert.equal(afterPoison, PHRASEBOOK.quoteApiDown, 'S1: guardrail-1 deferred with the quote-down line');

    // ── Adversarial: invariant #2 (promise-trace). A pre-sales guest has no task
    // and no evidence row, so a "the team has been informed" claim (C1) is
    // licensed by NOTHING — guardrail-2 must regenerate it away. This is the
    // discriminating negative for the most-regressed guardrail in the repo: a
    // regression that over-licenses C1/C2/C5 would otherwise keep every scenario
    // green (all their promises are legitimately licensed). Round 2 is clean.
    const clean = 'Those dates are open — here is the link whenever you would like.';
    h.script(txt("I've informed the team to hold your dates for you."), txt(clean));
    await h.sendGuest(GUEST, 'can you hold 20-22 dec for me?', { name: 'Aditi' });
    const afterPromise = textSendsTo(h, GUEST).at(-1)?.body ?? '';
    assert(!/informed the team/i.test(afterPromise), 'S1: the unbacked promise was blocked (guardrail-2)');
    assert.equal(afterPromise, clean, 'S1: guardrail-2 regenerated to the honest reply');
  },
};
