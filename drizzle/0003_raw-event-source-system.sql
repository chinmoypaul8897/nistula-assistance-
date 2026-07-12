-- WHY this file must stay DDL-only: drizzle's migrator runs ALL pending
-- migrations in one transaction, and Postgres forbids DML that USES a new
-- enum value inside the transaction that added it (55P04) — safe on fresh
-- databases only because the type itself is created in that same tx (0000).
-- Never add a backfill next to (or after) this ALTER in the same batch.
ALTER TYPE "public"."raw_event_source" ADD VALUE 'system';
