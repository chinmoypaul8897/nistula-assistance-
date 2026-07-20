/**
 * CH-19 acceptance replay (plan.md §3.2, §3.5, §8 CH-19) — the named deliverable.
 *
 * Drives all six docs/product-picture.md scenarios through the REAL in-process
 * pipeline (the "in-process deterministic" decision — see the harness header),
 * asserting the "SYS:" outcomes, and prints a PASS·FAIL report. The IDENTICAL
 * scenario list is kept green in `pnpm check` by test/acceptance/replay.test.ts;
 * this is the human-facing run (`pnpm replay`) that exits non-zero on any failure.
 *
 * It provisions the same test database the suite uses (CREATE DATABASE + migrate,
 * exactly as test/setup/db-global-setup.ts), so it needs only a running Postgres
 * (docker compose up -d postgres). No Claude, website or eZee call is ever made.
 */
import postgres from 'postgres';
import { runMigrations } from '../src/db/migrate.js';
import { buildHarness } from '../test/acceptance/harness.js';
import { ALL_SCENARIOS } from '../test/acceptance/scenarios/index.js';
import { TEST_URL } from '../test/helpers/boss.js';

async function provisionTestDb(): Promise<void> {
  const adminUrl = new URL(TEST_URL);
  const testDbName = adminUrl.pathname.slice(1);
  adminUrl.pathname = '/postgres';
  const admin = postgres(adminUrl.toString(), { max: 1, onnotice: () => {}, connect_timeout: 5 });
  try {
    await admin.unsafe(`CREATE DATABASE "${testDbName}"`);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== '42P04' && code !== '23505') throw error; // exists / race — both fine
  } finally {
    await admin.end();
  }
  await runMigrations(TEST_URL);
}

interface Result {
  id: string;
  title: string;
  ok: boolean;
  message: string | null;
  ms: number;
}

async function main(): Promise<void> {
  process.env.NODE_ENV ??= 'test';
  await provisionTestDb();

  const harness = await buildHarness();
  const results: Result[] = [];
  try {
    for (const scenario of ALL_SCENARIOS) {
      await harness.reset();
      const started = Date.now();
      try {
        await scenario.run(harness);
        results.push({ id: scenario.id, title: scenario.title, ok: true, message: null, ms: Date.now() - started });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ id: scenario.id, title: scenario.title, ok: false, message, ms: Date.now() - started });
      }
    }
  } finally {
    await harness.close();
  }

  const passed = results.filter((r) => r.ok).length;
  process.stdout.write('\nCH-19 acceptance — the six product-picture scenarios\n');
  process.stdout.write('─'.repeat(64) + '\n');
  for (const r of results) {
    process.stdout.write(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id} · ${r.title}  (${r.ms}ms)\n`);
    if (!r.ok) process.stdout.write(`      ${r.message}\n`);
  }
  process.stdout.write('─'.repeat(64) + '\n');
  process.stdout.write(`${passed}/${results.length} scenarios passed\n\n`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((error) => {
  process.stderr.write(`replay-scenarios failed to run: ${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
