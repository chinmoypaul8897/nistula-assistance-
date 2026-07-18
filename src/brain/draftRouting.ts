/**
 * Draft-mode routing (plan §8 CH-16 step 1). Two pure decisions the worker makes
 * at send time: which conversation reply_type this turn is, and whether to draft.
 */
import type { ReplyType } from '../config.js';
import type { Stage } from './stayView.js';

/** The CH-11 stage words mapped to conversation types — the exact strings that
 * are `AUTO_SEND_TYPES` values and `draft_reply_type` enum values. */
const STAGE_TO_REPLY_TYPE: Readonly<Record<Stage, ReplyType>> = {
  lead: 'presales',
  prearrival: 'arrival',
  inhouse: 'instay',
  postguest: 'poststay',
};

export function stageToReplyType(stage: Stage): ReplyType {
  return STAGE_TO_REPLY_TYPE[stage];
}

/**
 * Should this reply be held for human approval instead of sent to the guest?
 *
 * Guard by the CONTRACT, not the enum: `needsHuman` FORCES a draft even when the
 * type is unlocked in `AUTO_SEND_TYPES`, because a guest holding a booking a human
 * must look at (a cancellation for next week, a multi-room stay) must never get
 * auto-sent pre-sales copy — stayView.needsHuman's own docstring names CH-16 as
 * the reason it is kept separate from the stage. When draft mode is off, nothing
 * drafts; every reply is direct.
 */
export function shouldDraftReply(input: {
  draftMode: boolean;
  autoSendTypes: readonly ReplyType[];
  replyType: ReplyType;
  needsHuman: boolean;
}): boolean {
  if (!input.draftMode) return false;
  if (input.needsHuman) return true;
  return !input.autoSendTypes.includes(input.replyType);
}
