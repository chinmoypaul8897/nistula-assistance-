/**
 * S3 · Two towels (in-stay service + honest follow-up). product-picture.md §S3.
 *
 * SYS: create_staff_task succeeded BEFORE the promise (guardrail 2) · the card
 * names the house from a FRESH BKG-03 read (OQ-19) while the guest REPLY names
 * no house (OQ-15) · a 30-min-overdue task nudges + writes the sender:'system'
 * evidence row that makes "I've nudged housekeeping" claimable · DONE closes the
 * task and the guest is told.
 */
import { eq } from 'drizzle-orm';
import { assert, type Scenario } from '../scenario.js';
import { tasks as tasksTable } from '../../../src/db/schema.js';
import {
  HOUSEKEEPER_PHONE,
  istDay,
  openStaffWindow,
  seedBooking,
} from '../seed.js';
import { toolUse, txt } from '../support.js';
import {
  conversationFor,
  guestByPhone,
  systemEvidence,
  tasksAll,
  textSendsTo,
} from '../query.js';

const RES = 'ACC7003';
const RAHUL = '+917700900104';

export const s3: Scenario = {
  id: 'S3',
  title: 'Two towels — task, house on the card not the reply, SLA nudge, DONE',
  async run(h) {
    // Rahul is in-house in a Nistula Villa (checked in yesterday, out in two days).
    await seedBooking(h.db, {
      reservationNo: RES,
      guestName: 'Rahul Menon',
      guestPhone: RAHUL,
      checkIn: istDay(-1),
      checkOut: istDay(2),
      source: 'Walk-in',
    });
    // OQ-25: the housekeeper has messaged the line, so her window is open.
    await openStaffWindow(h.db, HOUSEKEEPER_PHONE);

    // ── The ask. The model raises a housekeeping task and promises warmly.
    const reply = 'Of course — two fresh towels are on their way up. Anything else this afternoon?';
    h.script(
      toolUse('create_staff_task', { kind: 'housekeeping', summary: '2 extra towels' }, { text: reply }),
      txt(''),
    );
    await h.sendGuest(RAHUL, 'hi, can we get 2 extra towels', { name: 'Rahul' });

    const guest = await guestByPhone(h.db, RAHUL);
    assert(guest, 'S3: guest exists');
    const conversation = await conversationFor(h.db, guest.id);
    assert(conversation, 'S3: conversation exists');

    // The task exists, routed to the house resolved from the FRESH door read.
    const tasks = await tasksAll(h.db);
    assert.equal(tasks.length, 1, 'S3: exactly one task raised');
    const task = tasks[0];
    assert.equal(task?.kind, 'housekeeping', 'S3: a housekeeping task');
    assert.equal(task?.villaLabel, 'Villa B3', 'S3: the card names the house from BKG-03 (OQ-19)');
    assert.equal(task?.assignedPhone, HOUSEKEEPER_PHONE, 'S3: routed to the B3 housekeeper');

    // The card reached the housekeeper and carries the house + the ask.
    const card = textSendsTo(h, HOUSEKEEPER_PHONE);
    assert.equal(card.length, 1, 'S3: exactly one card delivered to the housekeeper');
    assert(/Villa B3/.test(card[0]?.body ?? ''), 'S3: the card names Villa B3');
    assert(/towel/i.test(card[0]?.body ?? ''), 'S3: the card carries the ask');

    // The guest REPLY is the promise, licensed by the successful task — and it
    // names NO house (OQ-15), a different rule from the card.
    const guestSends = textSendsTo(h, RAHUL);
    assert.equal(guestSends.length, 1, 'S3: one reply to the guest');
    assert.equal(guestSends[0]?.body, reply, 'S3: the promise was sent (guardrail 2 licensed it)');
    assert(!/Villa B3|\bB3\b|Apartment/.test(guestSends[0]?.body ?? ''), 'S3: the reply names NO house (OQ-15)');

    // ── 32 minutes on, the task is overdue (housekeeping SLA 30m) → the nudger
    // re-pings and writes the evidence row that licenses "I've nudged".
    await h.db
      .update(tasksTable)
      .set({ slaDeadline: new Date(Date.now() - 2 * 60_000) })
      .where(eq(tasksTable.id, task?.id ?? ''));
    const nudge = await h.runSlaNow();
    assert.equal(nudge.nudged, 1, 'S3: the overdue task was nudged');
    const evidence = await systemEvidence(h.db, conversation.id);
    assert(
      evidence.some((e) => (e.raw as { contextKind?: string } | null)?.contextKind === 'sla_nudge'),
      'S3: an sla_nudge evidence row was written',
    );

    // ── "where are those?" → the AI is honest, and guardrail 2 accepts "nudged"
    // (C1) because the sla_nudge evidence row exists since the guest's last
    // message. NOTE: the product-picture example line adds "on the way" — that is
    // a C2 (dispatch-in-motion) claim, which sla_nudge deliberately does NOT
    // license (a nudge puts nobody in motion; promises.ts:211-217). The shipped,
    // guardrail-honest 32-min wording is the C1 nudge claim alone.
    const honest = "I've just nudged housekeeping about your towels — sorry for the wait, Rahul.";
    h.script(txt(honest));
    await h.sendGuest(RAHUL, 'where are those?', { name: 'Rahul' });
    const afterFollowup = textSendsTo(h, RAHUL);
    assert.equal(afterFollowup.at(-1)?.body, honest, 'S3: the honest "I have nudged" follow-up was sent (C1)');

    // ── DONE closes the task and the guest is told.
    const beforeDone = textSendsTo(h, RAHUL).length;
    assert(task?.shortId, 'S3: the task has a short id');
    await h.sendStaff(HOUSEKEEPER_PHONE, `DONE ${task?.shortId}`);
    const closed = (await tasksAll(h.db))[0];
    assert.equal(closed?.status, 'done', 'S3: the task is closed');
    assert(textSendsTo(h, RAHUL).length > beforeDone, 'S3: the guest was told the task is done');
  },
};
