/**
 * Single database client (plan.md CH-01 step 1): one postgres.js pool per
 * process, wrapped by drizzle. Callers get it via getDb(url) at boot; tests
 * create their own against the test database.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

function create(databaseUrl: string) {
  // onnotice muted: Postgres NOTICEs (e.g. from IF NOT EXISTS ddl) are noise
  // at runtime; real errors still throw.
  const sql = postgres(databaseUrl, { max: 10, onnotice: () => {} });
  return { sql, db: drizzle(sql, { schema }) };
}

let instance: ReturnType<typeof create> | null = null;

/** The shared pool+drizzle pair — first call wins the URL; later calls reuse it. */
export function getDb(databaseUrl: string) {
  instance ??= create(databaseUrl);
  return instance;
}

/** Closes the shared pool (graceful shutdown / test teardown). */
export async function closeDb(): Promise<void> {
  if (instance !== null) {
    await instance.sql.end();
    instance = null;
  }
}

export type Db = ReturnType<typeof create>['db'];
