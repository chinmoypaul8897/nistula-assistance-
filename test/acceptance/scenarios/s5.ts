/**
 * S5 · Night issue (honest hold, morning digest). product-picture.md §S5.
 *
 * SYS: a night escalation takes the night_queue path — NO staff ping at 23:05 ·
 * the reply is an honest hold that says "after 10", never "shortly" · at 10:00
 * the morning digest converts the night_queue task into a live escalation with
 * the SLA clock started.
 *
 * The reply is C3-only (a referral): escalate_to_human licenses C3, so "the team
 * has been informed" (C1) or "on the way" (C2) would regenerate — the honest
 * night hold is the phrasebook referral with the after-10 wording.
 */
import { and, eq } from 'drizzle-orm';
import { assert, type Scenario } from '../scenario.js';
import { tasks as tasksTable } from '../../../src/db/schema.js';
import { PHRASEBOOK } from '../../../src/brain/prompt.js';
import { FRONTDESK_PHONE, HOUSEKEEPER_PHONE, istDay, openStaffWindow, seedBooking } from '../seed.js';
import { toolUse, txt } from '../support.js';
import { allSendsTo, conversationFor, guestByPhone, textSendsTo } from '../query.js';

const RES = 'ACC7005';
const RAHUL = '+917700900106';

export const s5: Scenario = {
  id: 'S5',
  title: 'Night issue — night_queue hold (after 10), morning digest wakes it',
  async run(h) {
    // 23:05 — the front desk is off (staff hours 10:00–20:00).
    h.setClockAtHour('23:05');
    await seedBooking(h.db, {
      reservationNo: RES,
      guestName: 'Rahul Menon',
      guestPhone: RAHUL,
      checkIn: istDay(-1),
      checkOut: istDay(2),
      source: 'Walk-in',
    });
    await openStaffWindow(h.db, FRONTDESK_PHONE);

    // ── The AC complaint at night → escalate → night_queue, honest hold reply.
    const reply =
      "I'm sorry the AC feels weak — that's one for the villa team; let me bring them in, " +
      'and someone will reply first thing after 10, when the team is in.';
    h.script(
      toolUse('escalate_to_human', { reason: 'other', summary: 'AC weak in the master bedroom' }, { text: reply }),
      txt(''),
    );
    await h.sendGuest(RAHUL, 'the AC in the master bedroom feels weak, can someone look at it', { name: 'Rahul' });

    const guest = await guestByPhone(h.db, RAHUL);
    assert(guest, 'S5: guest exists');
    const conversation = await conversationFor(h.db, guest.id);
    assert(conversation, 'S5: conversation exists');

    // A night_queue task — nobody assigned, and NO staff card went out at 23:05.
    const nightTasks = await h.db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.guestId, guest.id), eq(tasksTable.kind, 'night_queue')));
    assert.equal(nightTasks.length, 1, 'S5: one night_queue task');
    assert.equal(nightTasks[0]?.assignedPhone, null, 'S5: nobody is assigned at night');
    assert.equal(allSendsTo(h, FRONTDESK_PHONE).length, 0, 'S5: no front-desk ping at 23:05');
    assert.equal(allSendsTo(h, HOUSEKEEPER_PHONE).length, 0, 'S5: no staff ping at 23:05');

    // The reply is the honest after-10 hold. What real code proves here: the C3
    // referral was LICENSED by the successful night escalation and went out
    // verbatim (guardrail 2). The after-10 / no-"shortly" WORDING is a block-[4]
    // prompt rule (OQ-27, prompt-enforced) — so the two regexes below check the
    // scripted reply's compliance, not a guardrail; the shipped phrasebook night
    // line carrying the same rule is asserted just after.
    const sent = textSendsTo(h, RAHUL).at(-1)?.body ?? '';
    assert.equal(sent, reply, 'S5: the honest night hold was sent (C3 referral)');
    assert(/after 10/.test(sent), 'S5: the reply states the 10 am reality');
    assert(!/shortly|right away/i.test(sent), 'S5: no "shortly"/"right away" at night');
    // Sanity: the shipped night phrasebook line carries the same rule.
    assert(/after 10/.test(PHRASEBOOK.outsideKnowledgeNight), 'S5: phrasebook night line says after 10');

    // ── 10:00 — the morning digest wakes the night_queue into a live escalation.
    h.setClockAtHour('10:00');
    const digest = await h.runDigestNow();
    assert.equal(digest.converted, 1, 'S5: the digest converted one night_queue task');
    const woken = (
      await h.db.select().from(tasksTable).where(eq(tasksTable.guestId, guest.id))
    )[0];
    assert.equal(woken?.kind, 'escalation', 'S5: the task is now a live escalation');
    assert.equal(woken?.assignedPhone, FRONTDESK_PHONE, 'S5: the front desk now owns it');
    assert(woken?.slaDeadline, 'S5: the SLA clock has started');
    assert(allSendsTo(h, FRONTDESK_PHONE).length >= 1, 'S5: the front desk got the woken escalation card');

    h.clearClock();
  },
};
