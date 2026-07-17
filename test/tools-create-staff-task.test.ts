/**
 * create_staff_task's gates. These assert the OUTCOME the caller acts on —
 * whether a task exists, where it routed, and whether the model may claim
 * anything — never a precondition.
 */
import { describe, expect, it, vi } from 'vitest';
import { createStaffTaskTool, similar } from '../src/brain/tools/createStaffTask.js';
import type { ToolContext, ToolTaskContext } from '../src/brain/tools/registry.js';
import type { DescribedStay } from '../src/brain/stayView.js';
import type { Task } from '../src/db/tasks.js';

const TODAY = '2026-07-17';

const stay = (over: Partial<DescribedStay> = {}): DescribedStay => ({
  describable: true,
  bookingId: 'b-1',
  reservationNo: '972',
  villa: 'Nistula Apartment',
  isUnit: false,
  checkIn: '2026-07-15',
  checkOut: '2026-07-20',
  adults: 2,
  children: 0,
  status: 'confirmed',
  live: true,
  ...over,
});

const task = (over: Partial<Task> = {}): Task =>
  ({
    id: 't-1',
    shortId: 'A3F2K9',
    kind: 'housekeeping',
    summary: '2 extra towels',
    detail: null,
    villaLabel: 'Apartment 06',
    status: 'open',
    conversationId: 'c-1',
    guestId: 'g-1',
    bookingId: 'b-1',
    assignedPhone: '+917700900401',
    slaMinutes: 30,
    ...over,
  }) as Task;

interface Harness {
  ctx: ToolContext;
  inserted: unknown[];
  appended: unknown[];
  notified: Task[];
  tasks: ToolTaskContext;
}

const harness = (over: Partial<ToolTaskContext> & { live?: Task[]; delivered?: boolean } = {}): Harness => {
  const inserted: unknown[] = [];
  const appended: unknown[] = [];
  const notified: Task[] = [];
  const live = over.live ?? [];
  const db = {
    select: () => ({
      from: () => ({ where: () => ({ orderBy: () => Promise.resolve(live) }) }),
    }),
    insert: () => ({
      values: (v: unknown) => ({
        returning: () => {
          inserted.push(v);
          return Promise.resolve([task({ ...(v as object) } as Partial<Task>)]);
        },
      }),
    }),
    update: () => ({
      set: (v: unknown) => ({
        where: () => ({
          returning: () => {
            appended.push(v);
            return Promise.resolve([task()]);
          },
        }),
      }),
    }),
  } as unknown as ToolTaskContext['db'];

  const tasks: ToolTaskContext = {
    db,
    conversationId: 'c-1',
    guestId: 'g-1',
    guestFirstName: 'Rahul',
    stays: [stay()],
    today: TODAY,
    now: new Date('2026-07-17T09:50:00Z'),
    ezee: vi.fn(async () => ({ resolved: true as const, label: 'Apartment 06', roomId: 'r' })),
    assign: vi.fn(() => ({ phone: '+917700900401', member: { name: 'Anita' }, via: 'role_and_villa' })),
    notify: vi.fn(async (t: Task) => {
      notified.push(t);
      return { delivered: over.delivered ?? true };
    }),
    created: { count: 0, shortIds: [] },
    ...over,
  };
  const ctx = { log: { error: () => {}, warn: () => {} }, tasks } as unknown as ToolContext;
  return { ctx, inserted, appended, notified, tasks };
};

const run = (ctx: ToolContext, input: Record<string, unknown> = {}) =>
  createStaffTaskTool.handler(
    { kind: 'housekeeping', summary: '2 extra towels', ...input },
    ctx,
  );

describe('create_staff_task — the happy path', () => {
  it('raises, routes off the FRESH door, and returns the short id + assignee', async () => {
    const h = harness();
    const result = await run(h.ctx);
    expect(result).toMatchObject({ ok: true, data: { assignee: 'Anita' } });
    // The short id is what a human types back, so pin its shape: 6 chars of
    // Crockford base32 minus I/L/O/U.
    expect((result as { data: { shortId: string } }).data.shortId).toMatch(/^[0-9A-HJ-KM-NP-TV-Z]{6}$/);
    // The door came from eZee, keyed on the stay's reservation number — never
    // from a model argument and never from the mirror's stale label.
    expect(h.tasks.ezee).toHaveBeenCalledWith('972');
    expect(h.tasks.assign).toHaveBeenCalledWith('housekeeping', 'Apartment 06');
    expect(h.inserted[0]).toMatchObject({ villaLabel: 'Apartment 06', kind: 'housekeeping' });
  });

  it('🚨 has NO villa_label parameter — a model cannot supply a house at all', () => {
    // §6.4's signature is struck through: a model-supplied villa is the model
    // guessing a house. The schema is the enforcement.
    const shape = (createStaffTaskTool.inputSchema as unknown as { shape: Record<string, unknown> }).shape;
    expect(Object.keys(shape).sort()).toEqual(['detail', 'kind', 'summary']);
  });

  it('data stays BARE — no summary, no villa, no phone reaches the model', async () => {
    const h = harness();
    const result = await run(h.ctx, { summary: 'towels please' });
    expect(JSON.stringify(result)).not.toContain('towels');
    expect(JSON.stringify(result)).not.toContain('+9177');
    expect(JSON.stringify(result)).not.toContain('Apartment');
  });

  it('falls back to the villa TYPE when the door will not resolve, and still raises', async () => {
    const h = harness({ ezee: vi.fn(async () => ({ resolved: false as const, reason: 'unreadable' as const })) });
    const result = await run(h.ctx);
    expect(result).toMatchObject({ ok: true });
    // A guest's towels must not depend on eZee being up.
    expect(h.inserted[0]).toMatchObject({ villaLabel: 'Nistula Apartment' });
    expect(h.tasks.assign).toHaveBeenCalledWith('housekeeping', 'Nistula Apartment');
  });

  it('raises even with no eZee client at all', async () => {
    const h = harness({ ezee: null });
    expect(await run(h.ctx)).toMatchObject({ ok: true });
  });
});

describe('🚨 create_staff_task — DELIVERY IS THE CONTRACT', () => {
  it('an undelivered card is ok:FALSE — the task exists, the promise does not', async () => {
    // CH-12's blocker #5, held by construction: covered() gates on
    // run.result.ok, so ok:false is what stops guardrail 2 licensing C1/C2.
    // "housekeeping is on their way" claims a PERSON IS MOVING, and none is.
    const h = harness({ delivered: false });
    const result = await run(h.ctx);
    expect(result).toMatchObject({ ok: false, error: 'NOT_NOTIFIED' });
    // The task was still RAISED — it is real work from a real guest.
    expect(h.inserted).toHaveLength(1);
    expect(h.notified).toHaveLength(1);
  });

  it('an undelivered card tells the model to bring the team in, not to claim', async () => {
    const h = harness({ delivered: false });
    const result = await run(h.ctx);
    expect((result as { message: string }).message).toMatch(/do NOT say it has been logged/i);
    expect((result as { message: string }).message).toMatch(/bringing the team in/i);
  });

  it('an undelivered card does NOT burn the per-turn allowance', async () => {
    const h = harness({ delivered: false });
    await run(h.ctx);
    expect(h.tasks.created.count).toBe(0);
  });
});

describe('create_staff_task — GATE 1, the stage (asked of DATES)', () => {
  it('refuses a lead — nothing exists for the team to attend to', async () => {
    const h = harness({ stays: [] });
    const result = await run(h.ctx);
    expect(result).toMatchObject({ ok: false, error: 'REFUSED' });
    expect(h.inserted).toHaveLength(0);
  });

  it('refuses a past guest', async () => {
    const h = harness({ stays: [stay({ checkIn: '2026-06-01', checkOut: '2026-06-05' })] });
    expect(await run(h.ctx)).toMatchObject({ ok: false, error: 'REFUSED' });
  });

  it('allows in-house and pre-arrival', async () => {
    const inhouse = harness({ stays: [stay({ checkIn: '2026-07-15', checkOut: '2026-07-20' })] });
    expect(await run(inhouse.ctx)).toMatchObject({ ok: true });
    const arriving = harness({ stays: [stay({ checkIn: '2026-07-25', checkOut: '2026-07-28' })] });
    expect(await run(arriving.ctx)).toMatchObject({ ok: true });
  });

  it('🚨 allows an in-house guest whose status is `confirmed` — the DATE decides', async () => {
    // No production row is ever `checked_in` (a front-desk check-in never comes
    // down the queue), so a status-keyed gate would refuse EVERY real in-house
    // guest while passing every seeded test — on the exact scenario this chunk
    // exists for.
    const h = harness({ stays: [stay({ status: 'confirmed', checkIn: '2026-07-15', checkOut: '2026-07-20' })] });
    expect(await run(h.ctx)).toMatchObject({ ok: true });
  });
});

describe('create_staff_task — GATE 2, a house in the summary', () => {
  it.each([
    ['towels for Apartment 09', 'summary'],
    ['the AC in Villa B3 is weak', 'summary'],
  ])('refuses %s — an unverified house may not compete with the resolved door', async (summary) => {
    const h = harness();
    const result = await run(h.ctx, { summary });
    expect(result).toMatchObject({ ok: false, error: 'REFUSED' });
    expect((result as { message: string }).message).toMatch(/do not name a villa or apartment/i);
    expect(h.inserted).toHaveLength(0);
  });

  it('refuses a house hidden in the detail too', async () => {
    const h = harness();
    expect(await run(h.ctx, { detail: 'guest says they are in Apartment 11' })).toMatchObject({
      ok: false,
      error: 'REFUSED',
    });
  });

  it('allows a villa TYPE and ordinary prose', async () => {
    const h = harness();
    expect(await run(h.ctx, { summary: 'extra towels for the apartment' })).toMatchObject({ ok: true });
  });
});

describe('create_staff_task — GATES 3 and 4, duplicates and the cap', () => {
  it('a near-duplicate APPENDS instead of raising a second card', async () => {
    const h = harness({ live: [task({ summary: '2 extra towels please', villaLabel: 'Apartment 06' })] });
    const result = await run(h.ctx, { summary: 'more extra towels please' });
    expect(result).toMatchObject({ ok: true, data: { appended: true, reason: 'duplicate' } });
    expect(h.inserted).toHaveLength(0);
    // No second buzz: the housekeeper already has the card, and the SLA nudger
    // is what chases them.
    expect(h.notified).toHaveLength(0);
  });

  it('the duplicate check keys on the DERIVED villa, not an argument', async () => {
    // Same words, different house → a genuinely different task.
    const h = harness({ live: [task({ summary: '2 extra towels', villaLabel: 'Villa B3' })] });
    expect(await run(h.ctx, { summary: '2 extra towels' })).toMatchObject({ ok: true });
    expect(h.inserted).toHaveLength(1);
  });

  it('a different KIND with similar words is not a duplicate', async () => {
    const h = harness({ live: [task({ kind: 'maintenance', summary: 'the towel rail is broken' })] });
    expect(await run(h.ctx, { kind: 'housekeeping', summary: 'towel rail towels' })).toMatchObject({
      ok: true,
    });
  });

  it('at the 3-open cap, a same-kind ask appends', async () => {
    const live = [
      task({ id: '1', kind: 'housekeeping', summary: 'towels', villaLabel: 'Apartment 06' }),
      task({ id: '2', kind: 'maintenance', summary: 'ac' }),
      task({ id: '3', kind: 'frontdesk', summary: 'taxi' }),
    ];
    const h = harness({ live });
    expect(await run(h.ctx, { kind: 'housekeeping', summary: 'a bathrobe as well' })).toMatchObject({
      ok: true,
      data: { appended: true, reason: 'at_cap' },
    });
  });

  it('at the cap, a NEW kind refuses and points at a human', async () => {
    const live = [
      task({ id: '1', kind: 'housekeeping', summary: 'towels' }),
      task({ id: '2', kind: 'housekeeping', summary: 'linen' }),
      task({ id: '3', kind: 'housekeeping', summary: 'soap' }),
    ];
    const h = harness({ live });
    const result = await run(h.ctx, { kind: 'maintenance', summary: 'the AC is broken' });
    // Three open tasks plus a fourth different problem is a guest who needs a
    // person, not another card.
    expect(result).toMatchObject({ ok: false, error: 'REFUSED' });
    expect((result as { message: string }).message).toMatch(/bring the team in/i);
  });
});

describe('create_staff_task — the per-turn latch', () => {
  it('caps raises across the turn, so a guardrail regenerate cannot double-buzz', async () => {
    // The tool loop RE-RUNS on a regenerate, sharing this context object — the
    // CH-09 lesson, applied to a side effect a human can hear.
    const h = harness({ created: { count: 2, shortIds: ['X', 'Y'] } });
    expect(await run(h.ctx)).toMatchObject({ ok: false, error: 'REFUSED' });
    expect(h.inserted).toHaveLength(0);
  });

  it('refuses when the turn carries no task context at all', async () => {
    const result = await createStaffTaskTool.handler(
      { kind: 'housekeeping', summary: 'towels' },
      { log: { error: () => {} } } as unknown as ToolContext,
    );
    expect(result).toMatchObject({ ok: false, error: 'INVALID' });
  });
});

describe('similar — "near enough" (§6.4)', () => {
  it.each([
    ['2 extra towels', 'more extra towels', true],
    ['2 extra towels please', 'extra towels', true],
    ['the AC is weak', 'need extra pillows', false],
    ['towels', 'the shower is leaking badly', false],
  ])('%s vs %s → %s', (a, b, expected) => {
    expect(similar(a, b)).toBe(expected);
  });
});
