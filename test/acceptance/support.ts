/**
 * CH-19 acceptance support: the deterministic stand-ins for the four external
 * boundaries the replay harness stubs (plan.md §8 CH-19; the "in-process
 * deterministic" decision). Only the model's OUTPUT and the three network
 * boundaries are faked here — everything those flow into (guardrails, tools,
 * DB, routing, gates, staff loop) is the REAL code, so an assertion proves the
 * system and not the script.
 *
 * NOT a *.test.ts file — vitest only collects those. Imported by the scenario
 * modules and the CLI (scripts/replay-scenarios.ts).
 */
import type Anthropic from '@anthropic-ai/sdk';
import type { ConverseResult } from '../../src/brain/claude.js';
import type { EzeeClient, EzeePollOutcome } from '../../src/ezee/client.js';
import type { EzeeReservation } from '../../src/ezee/types.js';
import type { HttpRequestOptions } from '../../src/lib/http.js';
import { createWebsiteClient, type WebsiteClient } from '../../src/brain/tools/websiteApi.js';

const ZERO_USAGE: ConverseResult['usage'] = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

/** The website /api/quote figures the fixture always returns. A scripted reply
 * that cites either is guardrail-1-clean; one that cites any OTHER ₹ is not —
 * which is exactly the adversarial probe S1 uses. */
export const FIXTURE_TOTAL = 34000;
export const FIXTURE_PER_NIGHT = 17000;

/** §5.4: Villa B3's eZee RoomID. The fixture door read returns this so
 * resolveDoor maps it back to the canonical label "Villa B3" (S3). */
export const B3_ROOM_ID = '5220300000000000011';

let tuSeq = 0;

/** A plain prose assistant turn (no tool call). */
export function txt(text: string): ConverseResult {
  return {
    text,
    toolUses: [],
    stopReason: 'end_turn',
    assistantContent: [{ type: 'text', text }],
    usage: ZERO_USAGE,
  };
}

/** A tool_use assistant turn — optionally with prose beside the call (the live
 * Sonnet pattern: it writes its reply IN the tool round). Mirrors the shape the
 * real converse() produces, so turn.ts's tool loop drives the REAL handler. */
export function toolUse(
  name: string,
  input: unknown,
  opts?: { text?: string; id?: string },
): ConverseResult {
  tuSeq += 1;
  const id = opts?.id ?? `tu_${name}_${tuSeq}`;
  const content: Anthropic.ContentBlockParam[] = [];
  if (opts?.text !== undefined) content.push({ type: 'text', text: opts.text });
  content.push({ type: 'tool_use', id, name, input });
  return {
    text: opts?.text ?? '',
    toolUses: [{ id, name, input }],
    stopReason: 'tool_use',
    assistantContent: content,
    usage: ZERO_USAGE,
  };
}

/**
 * A website client whose injected http returns the fixed fixture quote for any
 * villa/date (spacing 0 so 4-unit type quotes don't add a second per call). The
 * amounts are constant, so ₹ tracing is deterministic; the requested villaId and
 * dates are echoed back for internal consistency of the tool result.
 */
export function fixtureWebsite(): WebsiteClient {
  const http = async (url: string, _options?: HttpRequestOptions): Promise<Response> => {
    const q = new URL(url).searchParams;
    const checkIn = q.get('checkIn') ?? '2026-12-20';
    const checkOut = q.get('checkOut') ?? '2026-12-22';
    const body = {
      ok: true,
      quote: {
        villaId: q.get('villaId') ?? '',
        checkIn,
        checkOut,
        nights: 2,
        adults: Number(q.get('adults') ?? 2),
        children: Number(q.get('children') ?? 0),
        total: FIXTURE_TOTAL,
        averagePerNight: FIXTURE_PER_NIGHT,
        perNight: [
          { date: checkIn, amount: FIXTURE_PER_NIGHT },
          { date: checkOut, amount: FIXTURE_PER_NIGHT },
        ],
        minNights: { average: 2, meetsRequirement: true },
        available: true,
      },
    };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  return createWebsiteClient({
    baseUrl: 'https://website.test.invalid',
    log: { error: () => undefined },
    http,
    spacingMs: 0,
  });
}

/** A mutable holder so a scenario can set what the next BKG-03 door read returns
 * (S3: a live confirmed room; an adversarial: a dead booking). */
export interface DoorState {
  roomId: string;
  currentStatus: string;
}

/**
 * An eZee client whose only live method is fetchSingleBooking (the BKG-03 door
 * read villaRoute.resolveDoor calls). The poller is BINDINGLY disabled in the
 * harness (§CH-10), so the other three methods must never run — they throw
 * loudly if they ever do.
 */
export function fixtureEzee(door: DoorState): EzeeClient {
  const unreachable = (name: string) => async (): Promise<EzeePollOutcome> => {
    throw new Error(`fixtureEzee.${name} called — the poller is disabled in the acceptance harness`);
  };
  return {
    fetchPendingBookings: unreachable('fetchPendingBookings'),
    ackBookings: async () => {
      throw new Error('fixtureEzee.ackBookings called — the poller is disabled in the acceptance harness');
    },
    fetchArrivals: unreachable('fetchArrivals'),
    async fetchSingleBooking() {
      const reservations = [
        { BookingTran: { RoomID: door.roomId, CurrentStatus: door.currentStatus } },
      ] as unknown as EzeeReservation[];
      return { status: 'ok', reservations, cancels: [], raw: {} };
    },
  };
}
