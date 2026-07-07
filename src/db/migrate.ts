/**
 * Migration runner (plan.md CH-01 step 2): applies the committed ./drizzle
 * migrations, idempotently, on boot BEFORE the server listens. Uses its own
 * one-shot connection so boot never holds pool slots.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// WHY module-relative: a cwd-relative folder crashes boot whenever the
// service starts outside the repo root (Railway start command, Docker
// WORKDIR). src/db/ and dist/db/ both sit two levels below the root.
const MIGRATIONS_FOLDER = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'drizzle',
);

/** Applies pending migrations; resolves when the schema is current. */
export async function runMigrations(databaseUrl: string): Promise<void> {
  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await sql.end();
  }
}
