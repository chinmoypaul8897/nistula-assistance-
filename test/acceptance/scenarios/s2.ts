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
import { assert, type Scenario } from '../scenario.js';
import { istWallClockToInstant, shiftDay } from '../../../src/lib/time.js';
import { getMirrorByReservationNo } from '../../../src/db/bookings.js';
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
  },
};
