/** The ordered scenario list — the single source both the vitest wrapper and
 * the CLI replay consume. */
import type { Scenario } from '../scenario.js';
import { s1 } from './s1.js';
import { s2 } from './s2.js';
import { s3 } from './s3.js';

export const ALL_SCENARIOS: readonly Scenario[] = [s1, s2, s3];
