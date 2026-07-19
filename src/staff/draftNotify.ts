/**
 * The draft card (plan §8 CH-16 step 1) — draft mode's notify half.
 *
 * In draft mode the worker commits the AI's proposed reply as a `drafts` row
 * instead of sending it, then calls this to put a card on the ops number(s). The
 * approver replies `OK`/`EDIT`/`NO` (staff/commands.ts). It goes to EVERY ops
 * number for availability — any of them may act, and the atomic
 * `claimDraftDecision` makes a double-approval safe (the loser gets "already
 * decided"). Like the task card, `conversationId: null` routes the window check
 * to the ops number's own `phone_windows`, and `sendTemplated` picks free-form
 * inside an open window or `nst_draft_card` when it is shut.
 *
 * UNLIKE a task, an undelivered draft needs no status flip: it stays `pending`
 * and the 30-minute expiry sweep resolves it and pages ops. Never throws — a
 * card is a side effect of a guest's turn, and a throw here would crash the turn.
 */
import { sanitiseInline } from '../brain/prompt.js';
import { alertOps, type AlertLogger } from '../ops/alerts.js';
import type { DraftReplyType } from '../db/drafts.js';
import type { WaClient } from '../wa/client.js';

export interface DraftNotifierDeps {
  log: AlertLogger & { info?: (obj: Record<string, unknown>, msg?: string) => void };
  wa: Pick<WaClient, 'sendTemplated'>;
}

export interface DraftCardInput {
  shortId: string;
  guestName: string | null;
  replyType: DraftReplyType;
  /** The FULL proposed reply. The card shows a flattened, capped PREVIEW of it;
   * the untruncated text lives in drafts.proposed_body and is what OK sends. */
  body: string;
  /** CH-18c: the guest this reply is for — links the card (which shows the guest's
   * name + a preview of a reply about them) to messages.guest_id for erasure. */
  guestId: string | null;
}

const NAME_MAX = 40;
/**
 * Card preview cap in CODE POINTS. Kept small enough that 2× (the UTF-16
 * worst case) stays inside `draftBodyParam`'s 800-UTF-16 max, so `schema.parse`
 * can never reject a preview. The approver sees the opening of the reply; the
 * full text is stored and is what `OK` dispatches verbatim.
 */
const BODY_PREVIEW_MAX = 400;

export async function notifyDraft(
  deps: DraftNotifierDeps,
  opsNumbers: readonly string[],
  input: DraftCardInput,
): Promise<{ delivered: boolean }> {
  if (opsNumbers.length === 0) {
    // The dev/mis-config footgun: DRAFT_MODE on with nobody to approve means the
    // guest gets nothing until the sweep expires the row. Loud, not silent.
    deps.log.error(
      { shortId: input.shortId },
      'DRAFT created but OPS_NUMBERS is empty — nobody can approve it; the guest gets nothing until it expires',
    );
    return { delivered: false };
  }

  const params = {
    shortId: input.shortId,
    guestName: sanitiseInline(input.guestName ?? 'a guest', NAME_MAX) || 'a guest',
    replyType: input.replyType,
    body: sanitiseInline(input.body, BODY_PREVIEW_MAX) || '(empty reply)',
  };

  let delivered = false;
  for (const ops of opsNumbers) {
    const result = await deps.wa.sendTemplated(
      ops,
      { key: 'draft_card', params },
      { conversationId: null, sender: 'system', aboutGuestId: input.guestId ?? undefined },
    );
    if (result.ok) {
      delivered = true;
      deps.log.info?.(
        { shortId: input.shortId, usedTemplate: result.usedTemplate },
        'draft card sent',
      );
    } else {
      deps.log.error({ shortId: input.shortId, reason: result.error }, 'draft card send failed');
    }
  }

  if (!delivered) {
    await alertOps(deps.log, {
      kind: 'draft_notify_failed',
      summary: 'A draft card reached no ops number — the guest reply is stuck pending until it expires',
      detail: { shortId: input.shortId },
    });
  }
  return { delivered };
}
