import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // WHY: keeps test output readable — app logs are exercised via injected
    // streams in tests, never via stdout noise.
    env: { LOG_LEVEL: 'silent' },
    // Provisions the shared test database once per run (see the file's header).
    globalSetup: ['test/setup/db-global-setup.ts'],
    // WHY sequential files (CH-02): several DB test files now share one test
    // database and isolate via TRUNCATE in beforeAll — parallel files would
    // race each other's truncates and row-count assertions.
    fileParallelism: false,
  },
});
