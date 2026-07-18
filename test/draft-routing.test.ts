/**
 * CH-16 · the draft-mode routing decision (pure). Guards the CONTRACT: draft
 * mode off ⇒ never draft; needsHuman ⇒ ALWAYS draft even for an unlocked type;
 * otherwise draft iff the type is not unlocked.
 */
import { describe, expect, it } from 'vitest';
import { shouldDraftReply, stageToReplyType } from '../src/brain/draftRouting.js';
import type { ReplyType } from '../src/config.js';
import type { Stage } from '../src/brain/stayView.js';

describe('stageToReplyType', () => {
  it('maps every CH-11 stage to its conversation reply type', () => {
    const map: Record<Stage, ReplyType> = {
      lead: 'presales',
      prearrival: 'arrival',
      inhouse: 'instay',
      postguest: 'poststay',
    };
    for (const [stage, type] of Object.entries(map)) {
      expect(stageToReplyType(stage as Stage)).toBe(type);
    }
  });
});

describe('shouldDraftReply', () => {
  it('never drafts when draft mode is off — not even a needsHuman booking', () => {
    expect(
      shouldDraftReply({ draftMode: false, autoSendTypes: [], replyType: 'presales', needsHuman: true }),
    ).toBe(false);
  });

  it('drafts an unlocked type anyway when needsHuman (guard the contract, not the enum)', () => {
    // instay IS unlocked, but the guest holds a booking a human must see — a
    // must-not auto-send case (stayView.needsHuman's own docstring).
    expect(
      shouldDraftReply({
        draftMode: true,
        autoSendTypes: ['presales', 'arrival', 'instay', 'poststay'],
        replyType: 'instay',
        needsHuman: true,
      }),
    ).toBe(true);
  });

  it('sends direct when the type is unlocked and no human is needed', () => {
    expect(
      shouldDraftReply({
        draftMode: true,
        autoSendTypes: ['instay'],
        replyType: 'instay',
        needsHuman: false,
      }),
    ).toBe(false);
  });

  it('drafts when the type is not unlocked', () => {
    expect(
      shouldDraftReply({
        draftMode: true,
        autoSendTypes: ['instay'],
        replyType: 'presales',
        needsHuman: false,
      }),
    ).toBe(true);
  });

  it('drafts everything when nothing is unlocked (the day-one posture)', () => {
    for (const replyType of ['presales', 'arrival', 'instay', 'poststay'] as ReplyType[]) {
      expect(
        shouldDraftReply({ draftMode: true, autoSendTypes: [], replyType, needsHuman: false }),
      ).toBe(true);
    }
  });
});
