/**
 * Knowledge base = system-prompt block [3] (plan.md §6.2, CH-06). The compiled
 * kb/*.md files are concatenated into ONE reference block that rides inside the
 * cached static head (prompt.ts places the breakpoint after it, on block [4]).
 *
 * This module is the SHARED seam between build and runtime:
 *  - `scripts/kb-build.ts` calls concatKnowledge/estimateKbTokens/kbVersion to
 *    enforce the ≤6k-token budget at build time (the build FAILS over budget).
 *  - the worker (turn.ts) calls loadKnowledge()/kbPriceWhitelist() at runtime.
 * Keeping both on the same helpers means the shipped block is exactly the one
 * the budget gate measured. `extractRupeeAmounts` comes from rupees.ts (not
 * guardrails.ts) to avoid a prompt→knowledge→guardrails→prompt import cycle.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { extractRupeeAmounts } from './rupees.js';

/** §6.2: compiled block [3] must stay ≤ ~6k tokens (it is re-sent as a cache
 * read every turn; a bloated head is a standing cost). Heuristic below. */
export const KB_TOKEN_BUDGET = 6000;

/** chars/3.6 ≈ tokens — the repo's standing heuristic (brain-prompt.test.ts,
 * CH-08 will hoist a shared estimator). Good enough for a budget gate. */
export function estimateKbTokens(text: string): number {
  return Math.ceil(text.length / 3.6);
}

/** Short, stable content hash so a kb change is visible in the cost/cache logs
 * (a different head = one cache write, then reads — plan.md CH-06 step 3). */
export function kbVersion(knowledge: string): string {
  return createHash('sha256').update(knowledge).digest('hex').slice(0, 8);
}

/** Drop HTML comments (generated-file headers, hand-maintained review notes and
 * PLACEHOLDER markers in quirks.md) — they are for humans, never the model. */
function stripComments(md: string): string {
  return md.replace(/<!--[\s\S]*?-->/g, '').trim();
}

/** True only when, after comments, there is a line that is neither blank nor a
 * markdown heading — i.e. a real quirk note, not just the template's headings.
 * (Guardrail behind plan.md CH-06 test "prompt includes quirks only when the
 * file is non-empty".) */
function hasNotes(md: string): boolean {
  return stripComments(md)
    .split('\n')
    .some((line) => line.trim() !== '' && !line.trim().startsWith('#'));
}

export interface KnowledgeParts {
  villas: string;
  policies: string;
  faq: string;
  /** kb/quirks.md — hand-maintained; its section is included only when it
   * carries real notes (template-only ⇒ omitted). */
  quirks: string;
}

/** Assembles block [3] from the compiled/maintained kb files. Pure — the build
 * gate and the runtime loader both call this on the same inputs. */
export function concatKnowledge(parts: KnowledgeParts): string {
  const sections = [stripComments(parts.villas), stripComments(parts.policies), stripComments(parts.faq)];
  if (hasNotes(parts.quirks)) {
    sections.push(`## Villa quirks (practical, villa-specific notes)\n\n${stripComments(parts.quirks)}`);
  }
  return sections.join('\n\n');
}

export interface LoadedKnowledge {
  /** The concatenated block [3] body (prompt.ts prefixes the "[KNOWLEDGE]" tag). */
  knowledge: string;
  tokens: number;
  version: string;
  quirksPresent: boolean;
  /** Guardrail-1 whitelist: the ₹ fee figures verbatim in kb/policies.md (§6.5). */
  whitelist: number[];
}

const KB_DIR = new URL('../../kb/', import.meta.url);
let cached: LoadedKnowledge | null = null;

/**
 * Reads and compiles the kb files once (memoised for the default dir). Re-asserts
 * the token budget defensively — the authoritative gate is `pnpm kb:build`, but a
 * hand edit to quirks.md that skips the rebuild must still fail loudly at boot,
 * not silently ship an over-budget head. `dir` override is uncached (tests only).
 */
export function loadKnowledge(dir: URL = KB_DIR): LoadedKnowledge {
  if (dir.href === KB_DIR.href && cached !== null) return cached;

  const read = (name: string): string => readFileSync(new URL(name, dir), 'utf8');
  const policies = read('policies.md');
  const quirks = read('quirks.md');
  const knowledge = concatKnowledge({ villas: read('villas.md'), policies, faq: read('faq.md'), quirks });
  const tokens = estimateKbTokens(knowledge);
  if (tokens > KB_TOKEN_BUDGET) {
    throw new Error(`KNOWLEDGE block is ${tokens} tokens (> ${KB_TOKEN_BUDGET}); run \`pnpm kb:build\` and trim kb/source/*`);
  }

  const loaded: LoadedKnowledge = {
    knowledge,
    tokens,
    version: kbVersion(knowledge),
    quirksPresent: hasNotes(quirks),
    // §6.5 whitelist = figures verbatim in kb/policies.md (deposit rule / extra-
    // guest / early check-in); stay prices still come only from tool JSON.
    whitelist: extractRupeeAmounts(stripComments(policies)),
  };
  if (dir.href === KB_DIR.href) cached = loaded;
  return loaded;
}

/** The guardrail-1 kb price whitelist (memoised via loadKnowledge). */
export function kbPriceWhitelist(): number[] {
  return loadKnowledge().whitelist;
}
