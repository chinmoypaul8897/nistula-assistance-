/**
 * Migration runner (plan.md CH-01 step 2): applies the committed ./drizzle
 * migrations, idempotently, on boot BEFORE the server listens. Uses its own
 * one-shot connection so boot never holds pool slots.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/** Applies pending migrations; resolves when the schema is current. */
export async function runMigrations(databaseUrl: string): Promise<void> {
  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder: 'drizzle' });
  } finally {
    await sql.end();
  }
}
