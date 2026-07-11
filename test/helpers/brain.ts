/**
 * CH-05 test helpers: the new tool-capable ConverseResult shape and the tool
 * deps (registry + website + degraded) for worker/golden-path tests that don't
 * drive tools. The website client here THROWS if ever called, so an accidental
 * live-ish call in a no-tool test fails loudly instead of hanging.
 */
import { vi } from 'vitest';
import type { ConverseResult } from '../../src/brain/claude.js';
import { createDegradedTracker } from '../../src/brain/tools/degraded.js';
import { buildToolRegistry } from '../../src/brain/tools/index.js';
import type { ToolRegistry } from '../../src/brain/tools/registry.js';
import { createWebsiteClient, type WebsiteClient } from '../../src/brain/tools/websiteApi.js';

const WEBSITE_BASE_URL = 'https://website.test.invalid';

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

/** The CH-05 tool deps a worker/jobs test needs when no tool is exercised. */
export function noToolDeps(log: { error: (obj: Record<string, unknown>, msg?: string) => void }): {
  toolRegistry: ToolRegistry;
  website: WebsiteClient;
  websiteBaseUrl: string;
  degraded: ReturnType<typeof createDegradedTracker>;
  opsNumbers: string[];
} {
  return {
    toolRegistry: buildToolRegistry(),
    website: unusedWebsite(),
    websiteBaseUrl: WEBSITE_BASE_URL,
    degraded: createDegradedTracker({ log }),
    opsNumbers: [],
  };
}
