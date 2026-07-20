/**
 * S4 · Special request (human takeover + escalation SLA). product-picture.md §S4.
 *
 * SYS: escalate_to_human(special_request) ran (day → escalation task + a card to
 * the front desk, ok:true licenses the C3 referral) · the human reply pauses the
 * AI (human_active_until) and cancels the live escalation · the AI stays silent
 * while a human holds the thread · a staff→staff echo creates NO conversation ·
 * AI ON hands the thread back.
 */
import { and, eq } from 'drizzle-orm';
import { assert, type Scenario } from '../scenario.js';
import { tasks as tasksTable } from '../../../src/db/schema.js';
import { FRONTDESK_PHONE, openStaffWindow } from '../seed.js';
import { toolUse, txt } from '../support.js';
import { allSendsTo, conversationFor, guestByPhone, textSendsTo } from '../query.js';

const GUEST = '+917700900105';

export const s4: Scenario = {
  id: 'S4',
  title: 'Special request — escalate, human takeover pauses the AI, AI ON resumes',
  async run(h) {
    // Daytime, so the escalation cards the front desk NOW (not the night queue).
    h.setClockAtHour('12:15');
    await openStaffWindow(h.db, FRONTDESK_PHONE);

    // ── The proposal: outside the AI's remit → escalate + a warm C3 referral.
    const reply =
      'Congratulations — what a wonderful idea. That is one for our villa team; ' +
      'let me bring them in, and someone will reply right here shortly.';
    h.script(
      toolUse('escalate_to_human', { reason: 'special_request', summary: 'proposal décor at the pool' }, { text: reply }),
      txt(''),
    );
    await h.sendGuest(GUEST, 'we are planning a proposal at the villa, can you decorate the pool area? budget not an issue', {
      name: 'Priya',
    });

    const guest = await guestByPhone(h.db, GUEST);
    assert(guest, 'S4: guest exists');
    const conversation = await conversationFor(h.db, guest.id);
    assert(conversation, 'S4: conversation exists');

    // A tracked escalation task + a card to the front desk.
    const escalations = await h.db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.guestId, guest.id), eq(tasksTable.kind, 'escalation')));
    assert.equal(escalations.length, 1, 'S4: one escalation task raised');
    assert.equal(escalations[0]?.assignedPhone, FRONTDESK_PHONE, 'S4: routed to the front desk');
    assert(allSendsTo(h, FRONTDESK_PHONE).length >= 1, 'S4: the escalation card reached the front desk');

    // The C3 referral was licensed by the successful escalation and went out.
    // (Whether the model INVENTS a capability is a model-output property, proven
    // in the human voice pass — a scripted harness cannot assert it, so no
    // vacuous check is made here.)
    assert.equal(textSendsTo(h, GUEST).at(-1)?.body, reply, 'S4: the referral reply was sent (C3 licensed)');

    // ── A human takes the thread over (the dev echo seam).
    const res = await h.simulateHumanReply(GUEST, 'Hi Priya, this is Meera from the villa team — I would love to plan this with you.');
    assert.equal(res.status, 200, 'S4: the human reply was accepted');
    const paused = await conversationFor(h.db, guest.id);
    assert(
      paused?.humanActiveUntil !== null && (paused?.humanActiveUntil?.getTime() ?? 0) > Date.now(),
      'S4: the AI is paused (human_active_until set)',
    );
    const liveEsc = await h.db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.guestId, guest.id), eq(tasksTable.status, 'open')));
    assert.equal(liveEsc.length, 0, 'S4: the open escalation was cancelled by the takeover');

    // ── The AI stays silent while the human holds the thread.
    const beforeSilent = textSendsTo(h, GUEST).length;
    h.script(txt('this should never be sent'));
    await h.sendGuest(GUEST, 'thanks, that sounds lovely', { name: 'Priya' });
    assert.equal(textSendsTo(h, GUEST).length, beforeSilent, 'S4: the AI sent nothing under human takeover');

    // ── A staff→staff echo must NOT create a guest conversation.
    await h.echo(FRONTDESK_PHONE, 'Meera, can you take the Priya proposal?');
    assert.equal(await guestByPhone(h.db, FRONTDESK_PHONE), null, 'S4: a staff→staff echo created no conversation');

    // ── AI ON hands the thread back to the assistant.
    await h.sendStaff(FRONTDESK_PHONE, `AI ON ${GUEST.slice(-4)}`);
    const resumed = await conversationFor(h.db, guest.id);
    assert.equal(resumed?.status, 'ai_active', 'S4: AI ON resumed the assistant');

    h.clearClock();
  },
};
