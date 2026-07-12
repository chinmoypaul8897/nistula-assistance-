/**
 * CH-05 test helpers: the new tool-capable ConverseResult shape and the tool
 * deps (registry + website + degraded) for worker/golden-path tests that don't
 * drive tools. The website client here THROWS if ever called, so an accidental
 * live-ish call in a no-tool test fails loudly instead of hanging.
 */
import { vi } from 'vitest';
import type { ConverseResult } from '../../src/brain/claude.js';
import type { LoadedKnowledge } from '../../src/brain/knowledge.js';
import { createRateWindow, type RateWindow } from '../../src/brain/policy.js';
import { estimateTokens } from '../../src/brain/tokens.js';
import { createDegradedTracker } from '../../src/brain/tools/degraded.js';
import { buildToolRegistry } from '../../src/brain/tools/index.js';
import type { ToolRegistry } from '../../src/brain/tools/registry.js';
import { createWebsiteClient, type WebsiteClient } from '../../src/brain/tools/websiteApi.js';

const WEBSITE_BASE_URL = 'https://website.test.invalid';

/** An injected block [3] fake — worker/turn tests must not read kb/ off disk
 * (the CH-06 singleton residual, closed in CH-08). Tests that assert the REAL
 * compiled kb (the boot-wiring seam) override deps.knowledge with
 * loadKnowledge() instead. */
export function fakeKnowledge(knowledge = 'Fake KB for tests: check-in is from 3 pm.'): LoadedKnowledge {
  return {
    knowledge,
    tokens: estimateTokens(knowledge),
    version: 'fakekb00',
    quirksPresent: false,
    whitelist: [],
  };
}

/** A no-tool assistant turn in the CH-05 ConverseResult shape. */
export function textResult(
  text: string,
  usage: ConverseResult['usage'] = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
): ConverseResult {
  return {
    text,
    toolUses: [],
    stopReason: 'end_turn',
    assistantContent: [{ type: 'text', text }],
    usage,
  };
}

/** A website client whose http never succeeds — for tests that must not call it. */
export function unusedWebsite(): WebsiteClient {
  return createWebsiteClient({
    baseUrl: WEBSITE_BASE_URL,
    log: { error: vi.fn() },
    http: () => {
      throw new Error('unexpected website call in a no-tool test');
    },
  });
}

/** The CH-05/07 deps a worker/jobs test needs when no tool is exercised.
 * Each call returns a FRESH rate window so suites stay isolated. */
export function noToolDeps(log: { error: (obj: Record<string, unknown>, msg?: string) => void }): {
  toolRegistry: ToolRegistry;
  website: WebsiteClient;
  websiteBaseUrl: string;
  degraded: ReturnType<typeof createDegradedTracker>;
  knowledge: LoadedKnowledge;
  opsNumbers: string[];
  rateWindow: RateWindow;
} {
  return {
    toolRegistry: buildToolRegistry(),
    website: unusedWebsite(),
    websiteBaseUrl: WEBSITE_BASE_URL,
    degraded: createDegradedTracker({ log }),
    knowledge: fakeKnowledge(),
    opsNumbers: [],
    rateWindow: createRateWindow(),
  };
}
