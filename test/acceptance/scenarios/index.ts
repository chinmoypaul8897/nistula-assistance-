/** The ordered scenario list — the single source both the vitest wrapper and
 * the CLI replay consume. */
import type { Scenario } from '../scenario.js';
import { s1 } from './s1.js';

export const ALL_SCENARIOS: readonly Scenario[] = [s1];
