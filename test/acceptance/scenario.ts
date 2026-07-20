/**
 * The shared scenario contract (CH-19). A scenario seeds its preconditions,
 * drives the REAL pipeline through the harness, and asserts the product-picture
 * "SYS:" outcomes with node:assert — so the SAME module runs both under vitest
 * (test/acceptance/replay.test.ts) and under the CLI (scripts/replay-scenarios.ts),
 * with no vitest-only globals.
 */
import assert from 'node:assert/strict';
import type { Harness } from './harness.js';

export { assert };

export interface Scenario {
  /** 'S1'…'S6' — the product-picture id. */
  id: string;
  title: string;
  /** Seeds, drives and asserts. Throws (an AssertionError) on any failure. */
  run(h: Harness): Promise<void>;
}
