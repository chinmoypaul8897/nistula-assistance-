/** The ordered scenario list — the single source both the vitest wrapper and
 * the CLI replay consume. */
import type { Scenario } from '../scenario.js';
import { s1 } from './s1.js';
import { s2 } from './s2.js';
import { s3 } from './s3.js';
import { s4 } from './s4.js';
import { s5 } from './s5.js';
import { s6 } from './s6.js';

export const ALL_SCENARIOS: readonly Scenario[] = [s1, s2, s3, s4, s5, s6];
