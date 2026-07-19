/**
 * S6 · Three months later (win-back + memory). product-picture.md §S6.
 *
 * SYS: the win-back is gated on opt-in and names the villa TYPE + locality, never
 * a house (OQ-19) · the reply opens a free-form window and quotes a live ₹ from
 * get_quote · the profile block [5] carries BOTH remembered facts · a frontdesk
 * "verify the past issue before arrival" task is auto-created on the new booking ·
 * STOP flips opt-in off and cancels the pending marketing row.
 */
import { and, eq } from 'drizzle-orm';
import { assert, type Scenario } from '../scenario.js';
import { guests, messages, scheduledMessages } from '../../../src/db/schema.js';
import { getOrCreateConversation, upsertGuestByPhone } from '../../../src/db/repos.js';
import { linkStaysByPhone } from '../../../src/db/stays.js';
import { nowIST } from '../../../src/lib/time.js';
import {
  FRONTDESK_PHONE,
  istDay,
  openStaffWindow,
  seedBooking,
  seedFact,
  seedMarketingOptIn,
  seedWinback,
} from '../seed.js';
import { FIXTURE_TOTAL, toolUse, txt } from '../support.js';
import { conversationFor, tasksAll, templateSendsTo, textSendsTo } from '../query.js';

const RAHUL = '+917700900107';
const PAST_RES = 'ACC6001';
const NEW_RES = 'ACC6002';
const PENDING_RES = 'ACC6099';

export const s6: Scenario = {
  id: 'S6',
  title: 'Win-back + memory — opt-in gated, live ₹, facts recalled, verify task, STOP',
  async run(h) {
    h.setClockAtHour('11:00');
    // Rahul stayed ~74 days ago and opted in via the post-stay YES.
    const guest = await upsertGuestByPhone(h.db, RAHUL, 'Rahul Menon');
    await getOrCreateConversation(h.db, guest.id);
    await seedMarketingOptIn(h.db, guest.id);
    await seedBooking(h.db, {
      reservationNo: PAST_RES,
      guestName: 'Rahul Menon',
      guestPhone: RAHUL,
      checkIn: istDay(-75),
      checkOut: istDay(-73),
      source: 'Walk-in',
      status: 'checked_out',
    });
    await linkStaysByPhone(h.db, guest.id, RAHUL);
    await seedFact(h.db, guest.id, 'preference', 'early check-in matters to this guest');
    await seedFact(h.db, guest.id, 'past_issue', 'AC weak in B3 master bedroom — resolved');
    await openStaffWindow(h.db, FRONTDESK_PHONE);

    // ── The win-back SEND (opt-in gated, marketing template, closed window).
    await seedWinback(h.db, {
      guestId: guest.id,
      bookingId: null,
      reservationNo: PAST_RES,
      firstName: 'Rahul',
      sendAt: new Date(nowIST().getTime() - 60_000),
    });
    const sent = await h.runSenderNow();
    assert.equal(sent.sent, 1, 'S6: the win-back was sent (opt-in gated)');
    // It went as a (captured) template on the wire...
    assert.equal(templateSendsTo(h, RAHUL).length, 1, 'S6: one win-back template on the wire');
    // ...and the guest-facing RENDERED text is on the message row (the wire
    // template payload carries only param values, not the fixed template body).
    const conversation = await conversationFor(h.db, guest.id);
    assert(conversation, 'S6: conversation exists');
    const [winbackMsg] = await h.db
      .select()
      .from(messages)
      .where(and(eq(messages.conversationId, conversation.id), eq(messages.templateName, 'nst_winback_v1')));
    const body = winbackMsg?.body ?? '';
    assert(/Nistula Villa/.test(body) && /Assagao/.test(body), 'S6: names the villa TYPE + locality');
    assert(!/\bB3\b|Apartment/.test(body), 'S6: never a house (OQ-19)');
    assert(/STOP/i.test(body), 'S6: carries the STOP opt-out line');

    // ── The reply opens a window, quotes a live ₹, and the model SEES both facts.
    const reply =
      `Lovely to hear from you, Rahul. Your Nistula Villa in Assagao is ₹${FIXTURE_TOTAL.toLocaleString('en-IN')} ` +
      `all-inclusive for 12–14 Oct — and I remember early check-in matters to you. Shall I send the link?`;
    h.script(
      toolUse('get_quote', { villa_label: 'b3', check_in: '2026-10-12', check_out: '2026-10-14', adults: 2 }, { text: reply }),
      txt(''),
    );
    await h.sendGuest(RAHUL, 'good timing. is b3 free 12-14 oct?', { name: 'Rahul' });

    const guestReply = textSendsTo(h, RAHUL).at(-1)?.body ?? '';
    assert(guestReply.includes(FIXTURE_TOTAL.toLocaleString('en-IN')), 'S6: a live ₹ was quoted from get_quote');
    const seen = h.lastSystemText();
    assert(/early check-in/.test(seen), 'S6: block [5] carried the preference fact');
    assert(/AC weak/.test(seen), 'S6: block [5] carried the past-issue fact');

    // ── A new booking auto-creates the "verify the past issue before arrival" task.
    await seedBooking(h.db, {
      reservationNo: NEW_RES,
      guestName: 'Rahul Menon',
      guestPhone: RAHUL,
      checkIn: istDay(5),
      checkOut: istDay(7),
      source: 'Walk-in',
    });
    await h.driveBooking('created', NEW_RES);
    const verify = (await tasksAll(h.db)).find(
      (t) => t.kind === 'frontdesk' && /verify|AC|issue/i.test(`${t.summary} ${t.detail ?? ''}`),
    );
    assert(verify, 'S6: a frontdesk verify-before-arrival task was auto-created');

    // ── STOP flips opt-in off and cancels the pending marketing row.
    await seedWinback(h.db, {
      guestId: guest.id,
      bookingId: null,
      reservationNo: PENDING_RES,
      firstName: 'Rahul',
      sendAt: new Date(nowIST().getTime() + 10 * 24 * 3600_000),
    });
    await h.sendGuest(RAHUL, 'STOP', { name: 'Rahul' });
    const [after] = await h.db.select().from(guests).where(eq(guests.id, guest.id));
    assert.equal(after?.optOutMarketing, true, 'S6: STOP set the durable opt-out');
    const [pending] = await h.db
      .select()
      .from(scheduledMessages)
      .where(eq(scheduledMessages.dedupeKey, `winback:${PENDING_RES}`));
    assert.equal(pending?.status, 'cancelled', 'S6: STOP cancelled the pending marketing row');

    h.clearClock();
  },
};
