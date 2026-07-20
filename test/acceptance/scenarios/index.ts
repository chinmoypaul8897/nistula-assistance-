/**
 * The ordered scenario list — the single source both the vitest wrapper and
 * the CLI replay consume.
 *
 * Cross-scenario invariant coverage (product-picture.md bottom): #1 price-trace
 * (S1 positive + fabricated-₹ negative, S6), #2 promise-trace (S1 unbacked-promise
 * negative + S3/S4/S5/S6 licensed positives), #3 no-discount (S1), #4 window/
 * marketing (S2 closed-window template, S6 opt-in + STOP), #5 one-reply-per-burst
 * (S1). Invariant #6 (VOICE — British English, no exclamation, register, emoji)
 * is DELIBERATELY NOT asserted here: the model's wording is the scripted part, so
 * a deterministic harness cannot prove it. Voice is validated in the human pass
 * against kb/source/voice-guide.md (runbook §CH-19).
 */
import type { Scenario } from '../scenario.js';
import { s1 } from './s1.js';
import { s2 } from './s2.js';
import { s3 } from './s3.js';
import { s4 } from './s4.js';
import { s5 } from './s5.js';
import { s6 } from './s6.js';

export const ALL_SCENARIOS: readonly Scenario[] = [s1, s2, s3, s4, s5, s6];
