import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // WHY: keeps test output readable — app logs are exercised via injected
    // streams in tests, never via stdout noise.
    env: { LOG_LEVEL: 'silent' },
  },
});
