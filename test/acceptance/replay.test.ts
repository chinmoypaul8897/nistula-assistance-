/**
 * CH-19 acceptance — the six product-picture scenarios, replayed through the
 * real in-process pipeline (plan.md §8 CH-19). This vitest wrapper keeps the
 * SAME scenario modules green in `pnpm check` forever; `pnpm replay`
 * (scripts/replay-scenarios.ts) runs the identical list as a CLI report.
 */
import { afterAll, beforeAll, describe, it } from 'vitest';
import { buildHarness, type Harness } from './harness.js';
import { ALL_SCENARIOS } from './scenarios/index.js';

let h: Harness;

beforeAll(async () => {
  h = await buildHarness();
}, 60_000);

afterAll(async () => {
  await h?.close();
});

describe('CH-19 acceptance — the six scenarios', () => {
  for (const scenario of ALL_SCENARIOS) {
    it(
      `${scenario.id} · ${scenario.title}`,
      async () => {
        await h.reset();
        await scenario.run(h);
      },
      // Must exceed the harness SETTLE_TIMEOUT_MS ceiling with room for several
      // turns — a scenario drives multiple debounced turns end to end.
      120_000,
    );
  }
});
