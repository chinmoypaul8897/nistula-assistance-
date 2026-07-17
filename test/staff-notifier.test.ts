/**
 * The card, and the one thing that must never drift: `delivered` is what
 * guardrail 2 keys off, so an undelivered card licenses NOTHING.
 */
import { describe, expect, it, vi } from 'vitest';
import { notifyTask, VILLA_UNRESOLVED_LABEL } from '../src/staff/notifier.js';
import type { Task } from '../src/db/tasks.js';

const task = (over: Partial<Task> = {}): Task =>
  ({
    id: 't-1',
    shortId: 'A3F2K9',
    kind: 'housekeeping',
    summary: '2 extra towels',
    villaLabel: 'Apartment 06',
    status: 'open',
    conversationId: 'c-1',
    guestId: 'g-1',
    assignedPhone: '+917700900802',
    slaMinutes: 30,
    ...over,
  }) as Task;

const alerts: Record<string, unknown>[] = [];
const failed: string[] = [];

type CardCall = [string, { key: string; params: Record<string, string> }, unknown];

const calls: CardCall[] = [];

const harness = (sendResult: unknown = { ok: true, usedTemplate: false }) => {
  alerts.length = 0;
  failed.length = 0;
  calls.length = 0;
  const sendTemplated = vi.fn(async (...args: CardCall) => {
    calls.push(args);
    return sendResult;
  });
  const db = {
    update: () => ({
      set: () => ({
        where: () => {
          failed.push('marked');
          return Promise.resolve([]);
        },
      }),
    }),
  } as unknown as Parameters<typeof notifyTask>[0]['db'];
  const deps = {
    db,
    log: { error: (o: Record<string, unknown>) => alerts.push(o), info: () => {} },
    wa: { sendTemplated },
  } as unknown as Parameters<typeof notifyTask>[0];
  return { deps, sendTemplated };
};

/** The params of the one card we sent — asserted via a helper so a missing
 * call fails as a clear message rather than a tuple-index type error. */
function cardParams(): Record<string, string> {
  const call = calls[0];
  if (call === undefined) throw new Error('no card was sent');
  return call[1].params;
}

describe('notifyTask — the card', () => {
  it('sends the house, the guest and the ask, with conversationId NULL', async () => {
    const { deps, sendTemplated } = harness();
    const result = await notifyTask(deps, task(), 'Rahul');
    expect(result).toEqual({ delivered: true, usedTemplate: false });
    expect(sendTemplated).toHaveBeenCalledWith(
      '+917700900802',
      { key: 'task_card', params: { shortId: 'A3F2K9', villa: 'Apartment 06', guestName: 'Rahul', summary: '2 extra towels' } },
      // 🚨 conversationId null is what routes windowStateFor to phone_windows.
      // A staff number that is ALSO a guest has two independent windows, and
      // judging a task card by the guest one is the wrong question entirely.
      { conversationId: null, sender: 'system' },
    );
  });

  it('says the villa is unconfirmed rather than guessing or going blank', async () => {
    const { deps } = harness();
    await notifyTask(deps, task({ villaLabel: null }), 'Rahul');
    expect(cardParams().villa).toBe(VILLA_UNRESOLVED_LABEL);
  });

  it('sanitises and caps the guest name and the summary', async () => {
    const { deps } = harness();
    await notifyTask(deps, task({ summary: `towels${'x'.repeat(300)}` }), 'Rahul‮evil');
    const params = cardParams();
    expect(params.guestName).not.toContain('‮');
    expect((params.summary ?? '').length).toBeLessThanOrEqual(120);
  });

  it('falls back to "a guest" rather than sending an empty slot Meta would reject', async () => {
    const { deps } = harness();
    await notifyTask(deps, task(), null);
    expect(cardParams().guestName).toBe('a guest');
  });

  it('reports usedTemplate so a caller could meter it', async () => {
    const { deps } = harness({ ok: true, usedTemplate: true });
    expect(await notifyTask(deps, task(), 'Rahul')).toEqual({ delivered: true, usedTemplate: true });
  });
});

describe('🚨 notifyTask — a card that reached nobody', () => {
  it('reports delivered:false and records the hole', async () => {
    const { deps } = harness({ ok: false, error: 'WINDOW_CLOSED_SIMULATED' });
    expect(await notifyTask(deps, task(), 'Rahul')).toEqual({ delivered: false, usedTemplate: false });
    expect(failed).toContain('marked');
    expect(alerts.some((a) => a.opsAlert === 'task_notify_failed')).toBe(true);
  });

  it('🚨 an EMPTY ROSTER licenses nothing — there is NO "nobody configured" carve-out', async () => {
    // escalateToOps has that carve-out and it is right there: for an ops ALERT
    // the log genuinely IS the ops channel (CH-02 D4). It is wrong here. An
    // alert claims a message was recorded; "two towels are on their way" claims
    // A PERSON IS MOVING, and with an empty roster nobody is.
    const { deps, sendTemplated } = harness();
    const result = await notifyTask(deps, task({ assignedPhone: null }), 'Rahul');
    expect(result.delivered).toBe(false);
    expect(sendTemplated).not.toHaveBeenCalled();
    expect(alerts.some((a) => a.opsAlert === 'task_notify_failed' && a.reason === 'no_assignee')).toBe(
      true,
    );
  });

  it('the ops alert carries ids and routing, never the guest’s words', async () => {
    const { deps } = harness({ ok: false, error: 'WINDOW_CLOSED_SIMULATED' });
    await notifyTask(deps, task({ summary: 'the shower is broken' }), 'Rahul');
    const alert = alerts.find((a) => a.opsAlert === 'task_notify_failed');
    expect(JSON.stringify(alert)).not.toContain('shower');
    expect(alert).toMatchObject({ shortId: 'A3F2K9', kind: 'housekeeping' });
  });
});
