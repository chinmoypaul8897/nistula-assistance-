/**
 * §6.7 pre-model policy directives (CH-07). Pure suite — runs with Postgres
 * down. The negative cases matter as much as the positives: the §6.7 token
 * list is trip-wire prone ("koi baat nahi" is a HAPPY guest) and a false
 * HUMAN_REQUEST hard-escalates a thank-you.
 */
import { describe, expect, it } from 'vitest';
import { captionOf, guestTextOf, locationTextOf, sanitiseTail } from '../src/brain/inbound.js';
import {
  BOT_QUESTION,
  createRateWindow,
  decidePolicy,
  RATE_LIMIT,
  settlePlanFor,
  type Directive,
  type PolicyInput,
} from '../src/brain/policy.js';
import type { Message } from '../src/db/repos.js';

const NOW = new Date('2026-07-12T10:00:30Z');
let seq = 0;

function msg(over: Partial<Message>): Message {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    conversationId: 'c0ffee00-0000-4000-8000-000000000001',
    waMessageId: `wamid.TEST-POLICY-${seq}`,
    direction: 'in',
    sender: 'guest',
    type: 'text',
    body: null,
    mediaId: null,
    templateName: null,
    status: 'received',
    error: null,
    raw: null,
    createdAt: new Date(NOW.getTime() - 10_000),
    updatedAt: new Date(NOW.getTime() - 10_000),
    ...over,
  } as Message;
}

const text = (body: string) => msg({ body });
const image = (caption?: string) =>
  msg({ type: 'image', raw: caption === undefined ? { image: { id: 'm1' } } : { image: { id: 'm1', caption } } });

function decide(messages: Message[], over: Partial<PolicyInput> = {}): Directive {
  return decidePolicy({
    messages,
    conversation: { status: 'ai_active', humanActiveUntil: null },
    now: NOW,
    overLimit: false,
    ...over,
  });
}

describe('rate window (§3.3: 20 messages / 5 min, id-keyed)', () => {
  const entries = (n: number, at = NOW) =>
    Array.from({ length: n }, (_, i) => ({ id: `m-${i}`, createdAt: at }));

  it('trips strictly ABOVE 20 in-window messages', () => {
    const w = createRateWindow();
    w.feed('+917700900060', entries(20), NOW);
    expect(w.isOverLimit('+917700900060', NOW)).toBe(false);
    w.feed('+917700900060', [{ id: 'm-20', createdAt: NOW }], NOW);
    expect(w.isOverLimit('+917700900060', NOW)).toBe(true);
  });

  it('re-feeding the SAME messages never double-counts (pg-boss retry safety)', () => {
    const w = createRateWindow();
    w.feed('+917700900061', entries(11), NOW);
    w.feed('+917700900061', entries(11), NOW); // the retried batch
    expect(w.isOverLimit('+917700900061', NOW)).toBe(false);
  });

  it('prunes entries older than the window — an old backlog counts zero', () => {
    const w = createRateWindow();
    const old = new Date(NOW.getTime() - RATE_LIMIT.windowMs - 1_000);
    w.feed('+917700900062', entries(25, old), NOW);
    expect(w.isOverLimit('+917700900062', NOW)).toBe(false);
  });
});

describe('directive order (§6.7)', () => {
  it('COOL_OFF wins over everything, even a human request in the flood', () => {
    const d = decide([text('I want a human NOW')], { overLimit: true });
    expect(d.kind).toBe('COOL_OFF');
    expect(d.flags.containsHumanRequest).toBe(true); // ops triage still sees it
  });

  it('HUMAN_ACTIVE silences the AI while a takeover is running', () => {
    const d = decide([text('the AC is broken, worst night')], {
      conversation: { status: 'human_active', humanActiveUntil: null },
    });
    expect(d.kind).toBe('HUMAN_ACTIVE');
  });

  it('a PASSIVE echo takeover (status ai_active) is governed by its 2h TTL', () => {
    const future = new Date(NOW.getTime() + 60_000);
    const past = new Date(NOW.getTime() - 60_000);
    // An echo pauses the AI while the TTL holds, then resumes when it expires.
    expect(
      decide([text('hello')], { conversation: { status: 'ai_active', humanActiveUntil: future } })
        .kind,
    ).toBe('HUMAN_ACTIVE');
    expect(
      decide([text('hello')], { conversation: { status: 'ai_active', humanActiveUntil: past } })
        .kind,
    ).toBe('NORMAL');
  });

  it('🚨 an explicit AI-OFF hold (status human_active) survives an EXPIRED echo TTL', () => {
    // The CH-14a review BLOCKER: status='human_active' is only ever set by AI OFF
    // and means "held until AI ON". A later staff echo stamps a 2h TTL; once it
    // expires the AI must STILL stay silent — the hold is indefinite, not a proxy
    // for the mutable clock. (Guard by the CONTRACT, not the TTL.)
    const past = new Date(NOW.getTime() - 60_000);
    expect(
      decide([text('hello')], { conversation: { status: 'human_active', humanActiveUntil: past } })
        .kind,
    ).toBe('HUMAN_ACTIVE');
    // And still held with a null TTL (the bare AI OFF state).
    expect(
      decide([text('hello')], { conversation: { status: 'human_active', humanActiveUntil: null } })
        .kind,
    ).toBe('HUMAN_ACTIVE');
  });
});

describe('HUMAN_REQUEST routing', () => {
  it.each([
    'I want to talk to a human',
    'kisi se baat karao',
    'baat karni hai abhi',
    'connect me to your manager',
    'please call me back',
    'I need a representative',
    'Call me.',
  ])('routes %j to HUMAN_REQUEST', (body) => {
    expect(decide([text(body)]).kind).toBe('HUMAN_REQUEST');
  });

  it.each([
    'koi baat nahi, thanks a lot',
    'my travel agent will book for us',
    'call me Raj, by the way',
    'is there a villa manager on site?',
  ])('does NOT route %j to HUMAN_REQUEST', (body) => {
    expect(decide([text(body)]).kind).toBe('NORMAL');
  });

  it('a bot question is identity, not escalation — the human token is stripped', () => {
    const d = decide([text('are you a human or a bot?')]);
    expect(d.kind).toBe('NORMAL');
    expect(d.flags.botQuestion).toBe(true);
    expect(BOT_QUESTION.test('are you a bot')).toBe(true);
  });

  it('a caption can carry the human request (captions ARE guest text)', () => {
    expect(decide([image('please call me back about this')]).kind).toBe('HUMAN_REQUEST');
  });

  it('the ops-card tail carries the WHOLE batch, not just the last message (post-build audit)', () => {
    const d = decide([text('what is B3 for 20-22 Dec for 4?'), text('and please call me back')]);
    expect(d.kind).toBe('HUMAN_REQUEST');
    expect(d.guestTextTail).toContain('B3');
    expect(d.guestTextTail).toContain('call me back');
  });
});

describe('COMPLAINT_SUSPECT routing (sentiment alone — stay context is CH-11)', () => {
  it('routes complaints to the model with the escalation flag', () => {
    const d = decide([text('the AC is not working, worst night ever')]);
    expect(d.kind).toBe('COMPLAINT_SUSPECT');
  });

  it('a happy guest stays NORMAL', () => {
    expect(decide([text('everything was lovely, thank you')]).kind).toBe('NORMAL');
  });

  it('a complaint typed as a photo caption still routes', () => {
    expect(decide([image('the AC is leaking, please fix')]).kind).toBe('COMPLAINT_SUSPECT');
  });
});

describe('MEDIA_FALLBACK (caption-aware — review finding)', () => {
  it('captionless media-only batch falls back', () => {
    expect(decide([image()]).kind).toBe('MEDIA_FALLBACK');
    expect(decide([msg({ type: 'audio', raw: { audio: { id: 'a1' } } })]).kind).toBe(
      'MEDIA_FALLBACK',
    );
  });

  it('a captioned photo routes like text and flags the media', () => {
    const d = decide([image('what time is checkout?')]);
    expect(d.kind).toBe('NORMAL');
    expect(d.flags.hasMedia).toBe(true);
  });

  it('a shared location goes to the model, not the fallback (§6.7)', () => {
    const loc = msg({
      type: 'location',
      raw: { location: { latitude: 15.5934, longitude: 73.7546, name: 'Assagao Market' } },
    });
    expect(decide([loc]).kind).toBe('NORMAL');
  });

  it('mixed text + media runs the model with the media flag set', () => {
    const d = decide([text('this is the issue'), image()]);
    expect(d.kind).toBe('NORMAL');
    expect(d.flags.hasMedia).toBe(true);
  });
});

describe('inbound helpers', () => {
  it('captionOf / guestTextOf read the caption; body wins when present', () => {
    expect(captionOf(image('hello there'))).toBe('hello there');
    expect(guestTextOf(text('typed body'))).toBe('typed body');
    expect(guestTextOf(image('caption text'))).toBe('caption text');
    expect(guestTextOf(image())).toBeNull();
  });

  it('locationTextOf renders name/address with coordinates, or bare coordinates', () => {
    const named = msg({
      type: 'location',
      raw: { location: { latitude: 15.59, longitude: 73.75, name: 'Villa B3', address: 'Assagao' } },
    });
    expect(locationTextOf(named)).toBe('Villa B3, Assagao (15.59, 73.75)');
    const pin = msg({ type: 'location', raw: { location: { latitude: 15.59, longitude: 73.75 } } });
    expect(locationTextOf(pin)).toBe('15.59, 73.75');
    expect(locationTextOf(text('hi'))).toBeNull();
  });

  it('sanitiseTail strips control chars and keeps the newest 200 chars', () => {
    expect(sanitiseTail('hello\u0000\u001fworld')).toBe('hello world');
    const long = `${'x'.repeat(300)} the actual ask`;
    const tail = sanitiseTail(long);
    expect(tail.length).toBeLessThanOrEqual(201); // ellipsis + 200
    expect(tail).toContain('the actual ask');
  });
});

describe('MARKETING_STOP (CH-15)', () => {
  it('routes a pure STOP to MARKETING_STOP with the confirm line', () => {
    const d = decide([text('STOP')]);
    expect(d.kind).toBe('MARKETING_STOP');
    expect(d.flags.containsStop).toBe(true);
    expect(settlePlanFor(d, 'ai_active')).toMatchObject({
      modelRuns: false,
      send: 'marketingStopConfirm',
      telemetry: 'marketing_stop',
      escalate: null,
    });
  });

  it.each([
    'unsubscribe',
    'stop these messages',
    'band karo',
    'please stop sending texts',
    'stop.',
    'opt-out',
    'opt out of these messages',
    'stop your messages',
    'stop the marketing texts',
    'stop marketing',
    'unsubscribe me from these',
  ])('treats %j as a stop', (t) => expect(decide([text(t)]).flags.containsStop).toBe(true));

  it.each([
    'please stop, the AC is broken',
    "I'll stop by later",
    'non-stop rain here',
    'stop the AC',
    "please don't stop sending me offers", // negated — the OPPOSITE of a stop
    'never stop sending these',
    'stop messaging me here, just call me', // channel switch, not an unsubscribe
  ])('does NOT treat %j as a stop (homograph/negation guard)', (t) =>
    expect(decide([text(t)]).flags.containsStop).toBe(false),
  );

  it('a more urgent route wins, but the opt-out FLAG is still set', () => {
    // The opt-out is flag-driven in the worker, so it fires even when the
    // directive routes to complaint / human-request / human-active.
    const complaint = decide([text('unsubscribe, the villa was filthy')]);
    expect(complaint.flags.containsStop).toBe(true);
    expect(complaint.kind).toBe('COMPLAINT_SUSPECT');

    const human = decide([text('stop these and get me a human')]);
    expect(human.flags.containsStop).toBe(true);
    expect(human.kind).toBe('HUMAN_REQUEST');

    const held = decide([text('STOP')], {
      conversation: { status: 'human_active', humanActiveUntil: null },
    });
    expect(held.flags.containsStop).toBe(true);
    expect(held.kind).toBe('HUMAN_ACTIVE');
  });
});

describe('settlePlanFor (directive → worker settlement)', () => {
  const directive = (kind: Directive['kind']): Directive => ({
    kind,
    flags: {
      botQuestion: false,
      containsHumanRequest: false,
      containsComplaint: false,
      containsStop: false,
      hasMedia: false,
    },
    guestTextTail: 'tail',
  });

  it('COOL_OFF from ai_active announces once on the status edge', () => {
    const plan = settlePlanFor(directive('COOL_OFF'), 'ai_active');
    expect(plan).toMatchObject({
      modelRuns: false,
      send: 'coolOff',
      statusTransition: { from: 'ai_active', to: 'cooloff' },
      announceOnTransition: true,
      telemetry: 'cool_off',
    });
  });

  it('COOL_OFF while already cooled off or human-active is silent store-only', () => {
    for (const status of ['cooloff', 'human_active'] as const) {
      const plan = settlePlanFor(directive('COOL_OFF'), status);
      expect(plan.send).toBeNull();
      expect(plan.statusTransition).toBeNull(); // never clobbers human_active
    }
  });

  it('a processed under-limit turn restores ai_active from cooloff', () => {
    const plan = settlePlanFor(directive('NORMAL'), 'cooloff');
    expect(plan.modelRuns).toBe(true);
    expect(plan.statusTransition).toEqual({ from: 'cooloff', to: 'ai_active' });
  });

  it('HUMAN_REQUEST skips the model, sends the phrasebook key, escalates', () => {
    const plan = settlePlanFor(directive('HUMAN_REQUEST'), 'ai_active');
    expect(plan).toMatchObject({
      modelRuns: false,
      send: 'humanRequest',
      escalate: 'human_request',
      telemetry: 'human_request',
    });
  });

  it('🚨 HUMAN_ACTIVE never calls the model and sends nothing (CH-14 step 5)', () => {
    // §6.7 line 1: a human holds the thread ⇒ store-only, the AI is silent. The
    // worker keys the whole turn on modelRuns; nothing is sent, no status touched.
    const plan = settlePlanFor(directive('HUMAN_ACTIVE'), 'human_active');
    expect(plan).toMatchObject({ modelRuns: false, send: null, escalate: null, statusTransition: null });
  });

  it('COMPLAINT_SUSPECT runs the model with must_escalate set', () => {
    const plan = settlePlanFor(directive('COMPLAINT_SUSPECT'), 'ai_active');
    expect(plan).toMatchObject({ modelRuns: true, mustEscalate: true, escalate: 'complaint' });
  });

  it('HUMAN_ACTIVE is pure store-only', () => {
    expect(settlePlanFor(directive('HUMAN_ACTIVE'), 'human_active')).toMatchObject({
      modelRuns: false,
      send: null,
      statusTransition: null,
      escalate: null,
    });
  });
});
