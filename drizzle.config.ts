import { defineConfig } from 'drizzle-kit';

// Local default matches docker-compose.yml; real URLs come from env.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://nistula:nistula@localhost:5432/nistula',
  },
});
