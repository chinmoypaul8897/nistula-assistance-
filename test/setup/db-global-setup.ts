/**
 * vitest globalSetup — provisions the test database ONCE per run, so DB test
 * files can't race each other on CREATE DATABASE / first migration when more
 * of them land (CH-02+). Unreachable Postgres degrades gracefully: unit tests
 * still run; DB tests then fail with a clear connection error.
 */
import postgres from 'postgres';
import { runMigrations } from '../../src/db/migrate.js';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula_test';

export default async function setup(): Promise<void> {
  try {
    const adminUrl = new URL(TEST_URL);
    const testDbName = adminUrl.pathname.slice(1);
    adminUrl.pathname = '/postgres';
    const admin = postgres(adminUrl.toString(), {
      max: 1,
      onnotice: () => {},
      connect_timeout: 5,
    });
    try {
      await admin.unsafe(`CREATE DATABASE "${testDbName}"`);
    } catch (error) {
      // 42P04 = database exists; 23505 = lost a concurrent-create race — both fine.
      const code = (error as { code?: string }).code;
      if (code !== '42P04' && code !== '23505') throw error;
    } finally {
      await admin.end();
    }
    await runMigrations(TEST_URL);
  } catch (error) {
    console.warn(
      `[db-global-setup] test database not provisioned (${(error as Error).message}) — ` +
        'DB tests will fail; start it with: docker compose up -d postgres',
    );
  }
}
