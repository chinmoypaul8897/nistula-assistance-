/**
 * Draft decisions from an ops number (plan §8 CH-16 step 2): `OK <id>` sends the
 * AI's drafted reply, `EDIT <id> <new text>` sends the human's words instead, and
 * `NO <id>` drops it. Split out of commands.ts to keep that file's DONE/TASKS/AI
 * machinery intact and under the size rule; routed to from `handleStaffCommand`,
 * which has already confirmed the sender is an OPS number.
 *
 * Concurrency and honesty both come from `claimDraftDecision`'s guarded UPDATE on
 * `status='pending'`: exactly one decision wins, a replay or a second approver
 * gets "already decided", and a decision racing the 30-min expiry sweep is safe.
 * The guest send stays OUTSIDE the claim tx (not rollback-able) and goes through
 * the window-aware `sendText`, which re-checks the 24h window at approval time.
 */
import {
  claimDraftDecision,
  findDraftByShortId,
  type Draft,
  type DraftDecision,
} from '../db/drafts.js';
import { getConversationTurnContext } from '../db/repos.js';
import { scanForLeaks } from '../brain/leakGuards.js';
import { sanitiseInline } from '../brain/prompt.js';
import { alertOps } from '../ops/alerts.js';
import type { StaffCommandDeps } from './commands.js';

export type DraftCommand =
  | { kind: 'ok'; shortId: string }
  | { kind: 'edit'; shortId: string; text: string }
  | { kind: 'no'; shortId: string };

/**
 * Parses `OK`/`EDIT`/`NO` from an ops number. Same tolerance as DONE
 * (case-insensitive, optional `#`, trailing punctuation) so a phone-typed
 * decision is understood. Returns null when it is not a draft decision — the
 * caller then treats it as ordinary staff chatter.
 *
 * OK/NO are anchored (`…$`) exactly like DONE, so "no thanks then" is chatter,
 * not a decision. EDIT captures a free-text tail (the human's replacement reply),
 * so it is NOT anchored — everything after the id is the new body.
 */
export function parseDraftCommand(body: string | null): DraftCommand | null {
  const text = (body ?? '').trim();
  const ok = /^ok\s+#?([a-z0-9]{4,10})\b[\s.!]*$/i.exec(text);
  if (ok !== null) return { kind: 'ok', shortId: ok[1] as string };
  const no = /^no\s+#?([a-z0-9]{4,10})\b[\s.!]*$/i.exec(text);
  if (no !== null) return { kind: 'no', shortId: no[1] as string };
  const edit = /^edit\s+#?([a-z0-9]{4,10})\s+([\s\S]+)$/i.exec(text);
  if (edit !== null) {
    const newText = (edit[2] as string).trim();
    if (newText.length > 0) return { kind: 'edit', shortId: edit[1] as string, text: newText };
  }
  return null;
}

export async function handleDraftDecision(
  deps: StaffCommandDeps,
  opsPhone: string,
  command: DraftCommand,
): Promise<void> {
  const decision: DraftDecision =
    command.kind === 'ok' ? 'approved' : command.kind === 'edit' ? 'edited' : 'rejected';
  const finalBody = command.kind === 'edit' ? command.text : null;

  const claimed = await deps.db.transaction((tx) =>
    claimDraftDecision(tx, command.shortId, decision, opsPhone, deps.now(), finalBody),
  );
  if (claimed === null) {
    await replyToUndecidable(deps, opsPhone, command.shortId);
    return;
  }

  if (command.kind === 'no') {
    deps.log.info?.({ shortId: claimed.shortId }, 'draft rejected by ops');
    await ackOps(deps, opsPhone, `Dropped #${claimed.shortId}. The guest will get nothing.`);
    return;
  }

  // OK sends the AI's vetted reply verbatim; EDIT sends the human's words.
  const bodyToSend = command.kind === 'edit' ? (finalBody as string) : claimed.proposedBody;
  await sendApprovedReply(deps, opsPhone, claimed, bodyToSend, command.kind === 'edit');
}

/** Sends the approved/edited reply to the guest, then acks the approver truthfully
 * ("Sent" only after the Graph 2xx). A shut window or a Graph failure never
 * claims success — it alerts ops and tells the approver plainly.
 *
 * On an EDIT the leak scan runs here (where the guest's own phone is known, so it
 * is not false-flagged) as an ADVISORY: the human's words skip the model
 * guardrails but an accidental paste of another guest's detail leaves a trail
 * (plan step 2). The window check is NOT advisory — sendText refuses a shut
 * window outright. */
async function sendApprovedReply(
  deps: StaffCommandDeps,
  opsPhone: string,
  draft: Draft,
  body: string,
  isEdit: boolean,
): Promise<void> {
  const ctx = await getConversationTurnContext(deps.db, draft.conversationId).catch(() => null);
  if (ctx === null) {
    await alertOps(deps.log, {
      kind: 'draft_send_no_conversation',
      summary: 'An approved draft could not be sent — its conversation was not found',
      detail: { shortId: draft.shortId },
    });
    await ackOps(deps, opsPhone, `#${draft.shortId} approved, but I could not find the guest thread.`);
    return;
  }
  if (isEdit) {
    const leak = scanForLeaks(body, ctx.guestPhone);
    if (!leak.ok) {
      deps.log.info?.(
        { shortId: draft.shortId, hits: leak.hits },
        'edited draft tripped the leak scan — sending anyway (human words, advisory only)',
      );
    }
  }
  const who = sanitiseInline(ctx.guestName ?? 'the guest', 40) || 'the guest';
  const result = await deps.wa.sendText(ctx.guestPhone, body, {
    conversationId: draft.conversationId,
    sender: 'ai',
  });
  if (result.ok) {
    deps.log.info?.({ shortId: draft.shortId }, 'approved draft sent to guest');
    await ackOps(deps, opsPhone, `Sent to ${who} — #${draft.shortId}.`);
    return;
  }
  await alertOps(deps.log, {
    kind: 'draft_send_failed',
    summary: 'An approved draft did not reach the guest',
    detail: { shortId: draft.shortId, reason: result.error },
  });
  await ackOps(
    deps,
    opsPhone,
    `#${draft.shortId} approved, but it did not send (${result.error}). The guest has NOT been messaged.`,
  );
}

/** "No such draft" and "already decided" are different facts (findTaskByShortId's
 * reasoning) — an approver who typed a real id and got "unknown" would retype it. */
async function replyToUndecidable(
  deps: StaffCommandDeps,
  opsPhone: string,
  shortId: string,
): Promise<void> {
  const existing = await findDraftByShortId(deps.db, shortId);
  const line =
    existing === null
      ? `Sorry — no draft #${shortId.toUpperCase()}.`
      : `#${existing.shortId} was already ${existing.status}. Nothing to do.`;
  await ackOps(deps, opsPhone, line);
}

function ackOps(deps: StaffCommandDeps, opsPhone: string, body: string): Promise<unknown> {
  return deps.wa.sendText(opsPhone, body, { conversationId: null, sender: 'system' });
}
