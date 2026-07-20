/**
 * S2 · Booking made (lifecycle, zero staff typing). product-picture.md §S2.
 *
 * SYS: poller mirrored the booking (seeded) · guest row auto-created from the
 * booking phone · FIVE scheduled_messages with correct IST send_at + dedupe
 * keys · the four gates passed (in-epoch, arriving, confirmed, sanctioned
 * source) · a date change RESCHEDULES (never duplicates) · a cancel clears the
 * pending rows · a template is the vehicle when the window is shut (mode 'send'
 * → captured template; the villa TYPE + locality, never a house) · an OTA
 * booking mirrors but is NOT messaged (OQ-20, source gate → 0 rows).
 */
import { eq } from 'drizzle-orm';
import { assert, type Scenario } from '../scenario.js';
import { istWallClockToInstant, shiftDay } from '../../../src/lib/time.js';
import { getMirrorByReservationNo } from '../../../src/db/bookings.js';
import { bookingsMirror } from '../../../src/db/schema.js';
import { EPOCH } from '../harness.js';
import { istDay, seedDirectBooking, seedOtaBooking, seedBooking } from '../seed.js';
import { guestByPhone, scheduledForBase, templateSendsTo } from '../query.js';

// No '-<digits>' suffix: referenceBase strips one as an eZee multi-room marker.
const RES = 'ACC9001';
const GUEST = '+917700900102';
const OTA_RES = 'ACC9002';
const OTA_GUEST = '+917700900103';
const KINDS = ['confirmation', 'prearrival', 'welcome', 'poststay', 'winback'] as const;

export const s2: Scenario = {
  id: 'S2',
  title: 'Booking made — five scheduled sends, reschedule, cancel, OTA excluded',
  async run(h) {
    // A direct (Walk-in) booking arriving in 5 days, phone present.
    const checkIn = istDay(5);
    await seedDirectBooking(h.db, RES, 'Rahul Menon', GUEST, 5, 2);
    await h.driveBooking('created', RES);

    // The scheduler auto-creates the guest from the mirror (they never messaged).
    const guest = await guestByPhone(h.db, GUEST);
    assert(guest, 'S2: guest auto-created from the booking phone');

    // Exactly the five kinds, keyed on the reference base — the four gates passed.
    const rows = await scheduledForBase(h.db, RES);
    assert.equal(rows.length, 5, 'S2: five scheduled rows (all four gates passed)');
    const byKind = new Map(rows.map((r) => [r.kind, r]));
    for (const kind of KINDS) {
      assert(byKind.has(kind), `S2: a ${kind} row exists`);
      assert.equal(byKind.get(kind)?.dedupeKey, `${kind}:${RES}`, `S2: ${kind} dedupe key`);
    }

    // §2.3 IST timings, computed with the SAME helpers planSends uses.
    assert.equal(
      byKind.get('prearrival')?.sendAt.getTime(),
      istWallClockToInstant(`${shiftDay(checkIn, -3)}T10:00`).getTime(),
      'S2: pre-arrival at check-in −3d 10:00 IST',
    );
    assert.equal(
      byKind.get('welcome')?.sendAt.getTime(),
      istWallClockToInstant(`${checkIn}T09:00`).getTime(),
      'S2: welcome on the arrival day 09:00 IST',
    );

    // ── The confirmation SEND (window shut, mode 'send' → captured template).
    // The template names the villa TYPE + locality, never a house (OQ-19).
    const sent = await h.runSenderNow();
    assert.equal(sent.sent, 1, 'S2: exactly the confirmation was due and sent');
    const templates = templateSendsTo(h, GUEST);
    assert.equal(templates.length, 1, 'S2: the confirmation went as a (captured) template');
    const card = templates[0]?.body ?? '';
    assert(/Assagao/.test(card), 'S2: the confirmation names the locality');
    assert(!/Villa B3|Apartment 0/.test(card), 'S2: the confirmation names NO house (OQ-19)');
    const conf = (await scheduledForBase(h.db, RES)).find((r) => r.kind === 'confirmation');
    assert.equal(conf?.status, 'sent', 'S2: the confirmation row is resolved sent');

    // ── A date change RESCHEDULES the pending rows, never duplicates them.
    const newCheckIn = istDay(9);
    await seedBooking(h.db, {
      reservationNo: RES,
      guestName: 'Rahul Menon',
      guestPhone: GUEST,
      checkIn: newCheckIn,
      checkOut: istDay(11),
      source: 'Walk-in',
    });
    await h.driveBooking('modified', RES);
    const afterModify = await scheduledForBase(h.db, RES);
    assert.equal(afterModify.length, 5, 'S2: still five rows after a modify (no duplicates)');
    const prearrival = afterModify.find((r) => r.kind === 'prearrival');
    assert.equal(
      prearrival?.sendAt.getTime(),
      istWallClockToInstant(`${shiftDay(newCheckIn, -3)}T10:00`).getTime(),
      'S2: the pre-arrival was rescheduled to the new dates',
    );
    assert.equal(prearrival?.status, 'pending', 'S2: the rescheduled row stays pending');

    // ── A cancel clears every pending row; the sent confirmation stays sent.
    await h.driveBooking('cancelled', RES);
    const afterCancel = await scheduledForBase(h.db, RES);
    const pending = afterCancel.filter((r) => r.status === 'pending');
    assert.equal(pending.length, 0, 'S2: no pending rows survive a cancel');
    const confAfter = afterCancel.find((r) => r.kind === 'confirmation');
    assert.equal(confAfter?.status, 'sent', 'S2: an already-sent confirmation is never un-sent');

    // ── OQ-20: an OTA booking mirrors but is never messaged (source gate).
    await seedOtaBooking(h.db, OTA_RES, 'OTA Guest', OTA_GUEST, 5);
    const mirror = await getMirrorByReservationNo(h.db, OTA_RES);
    assert(mirror, 'S2: the OTA booking IS mirrored');
    await h.driveBooking('created', OTA_RES);
    const otaRows = await scheduledForBase(h.db, OTA_RES);
    assert.equal(otaRows.length, 0, 'S2: the OTA booking schedules NOTHING (OQ-20)');
    assert.equal(templateSendsTo(h, OTA_GUEST).length, 0, 'S2: the OTA guest receives nothing');

    // ── "The four gates passed" needs a discriminating negative for EACH gate,
    // not only source — a regression disabling any one must fail S2. (The pure
    // predicates are table-tested in lifecycle-gates.test.ts; this proves the
    // gate is wired into the real scheduler path.)
    // EPOCH — a booking mirrored BEFORE the cutover instant gets nothing (this is
    // the gate that neutralised 199 pre-epoch production rows).
    await seedDirectBooking(h.db, 'ACC9003', 'Pre Epoch', '+917700900108', 5, 2);
    await h.db
      .update(bookingsMirror)
      .set({ createdAt: new Date(EPOCH.getTime() - 24 * 3600_000) })
      .where(eq(bookingsMirror.ezeeReservationNo, 'ACC9003'));
    await h.driveBooking('created', 'ACC9003');
    assert.equal((await scheduledForBase(h.db, 'ACC9003')).length, 0, 'S2: a pre-epoch booking schedules nothing');
    // DATE — a stay already over gets nothing.
    await seedBooking(h.db, {
      reservationNo: 'ACC9004',
      guestName: 'Past Stay',
      guestPhone: '+917700900109',
      checkIn: istDay(-5),
      checkOut: istDay(-3),
      source: 'Walk-in',
    });
    await h.driveBooking('created', 'ACC9004');
    assert.equal((await scheduledForBase(h.db, 'ACC9004')).length, 0, 'S2: a past-date booking schedules nothing');
    // STATUS — a booking outside the confirmed/modified allowlist gets nothing.
    // 🚨 `checked_out`, NOT `unknown`, and the difference is the whole test: an
    // `unknown` booking is ALSO undescribable to stayView (DESCRIBABLE_STATUSES),
    // so the scheduler bails at the describable check BEFORE the status gate is
    // consulted — it would schedule 0 rows even with `passesStatus` deleted, i.e.
    // a FALSE-GREEN that proved nothing (a round-2 review caught exactly that).
    // `checked_out` is describable but off the allowlist, so it isolates GATE 3:
    // remove the gate and this booking schedules 5 rows. Dates are future so the
    // date gate cannot be what fails.
    await seedBooking(h.db, {
      reservationNo: 'ACC9005',
      guestName: 'Not Live',
      guestPhone: '+917700900110',
      checkIn: istDay(5),
      checkOut: istDay(7),
      source: 'Walk-in',
      status: 'checked_out',
    });
    await h.driveBooking('created', 'ACC9005');
    assert.equal((await scheduledForBase(h.db, 'ACC9005')).length, 0, 'S2: a non-live-status booking schedules nothing');

    // ── The DEPLOYED reality (WA_TEMPLATE_MODE=simulate — today's Railway
    // default). A confirmation to a guest with a CLOSED window DEFERS: a simulated
    // template is physically free-form and cannot enter a shut window, so NOTHING
    // is sent until real templates are approved at cutover. This is the
    // fail-closed behaviour holding back every website/OTA guest who never
    // messaged us. (The send-mode demo above proves the post-cutover template path.)
    await seedDirectBooking(h.db, 'ACC9006', 'Sim Defer', '+917700900111', 6, 2);
    await h.driveBooking('created', 'ACC9006');
    const sim = await h.runSenderSimulateNow();
    assert.equal(sim.attempted, 1, 'S2: exactly the new confirmation was due this tick');
    assert.equal(sim.sent, 0, 'S2: in simulate mode a closed-window confirmation is NOT sent');
    assert.equal(sim.deferred, 1, 'S2: it DEFERS (fail-closed) until templates are approved');
    const simConf = (await scheduledForBase(h.db, 'ACC9006')).find((r) => r.kind === 'confirmation');
    assert.equal(simConf?.status, 'pending', 'S2: the deferred confirmation stays pending for the next tick');
    // Pin the REASON, not just the outcome: it must defer because the WINDOW was
    // shut in simulate mode, never because of quiet hours / no phone / staleness.
    assert.equal(simConf?.skipReason, 'window_closed', 'S2: deferred for WINDOW_CLOSED_SIMULATED');
  },
};
