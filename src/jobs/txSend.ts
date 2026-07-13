/**
 * Transaction-riding pg-boss send (plan.md §3.4 "atomic event emission":
 * booking events are enqueued in the SAME transaction as the mirror upsert).
 * Generic — CH-12/13 reuse this for their own tx-coupled sends.
 *
 * WHY the shim instead of fromDrizzle(tx, sql) directly: pg-boss 12.25.1's
 * drizzle adapter expects tx.execute() to resolve to {rows: [...]}, but
 * drizzle's postgres-js driver resolves a bare postgres.js RowList (an Array
 * subclass of row objects, no .rows). unwrapSQLResult (pg-boss dist/tools.js)
 * then sees Array.isArray === true and flatMaps `.rows` → [undefined] →
 * createJob crashes reading [0].id — on every SUCCESSFUL send, aborting the
 * enclosing transaction. Wrapping the result as {rows} satisfies the
 * adapter's DrizzleTransactionLike contract (dist/adapters/drizzle.d.ts) and
 * keeps pg-boss's own $N-placeholder parsing. Pinned by test/tx-send.test.ts
 * so a pg-boss upgrade that changes the adapter fails loudly.
 */
import { sql, type SQL } from 'drizzle-orm';
import { fromDrizzle, PgBoss } from 'pg-boss';
import type { Tx } from '../db/client.js';

/**
 * Sends a job on the caller's open transaction: committed together,
 * rolled back together. Throws on a null job id (a singleton conflict on a
 * standard queue should be impossible — failing the tx keeps at-least-once).
 */
export async function sendInTx(
  boss: PgBoss,
  tx: Tx,
  name: string,
  data: object,
): Promise<string> {
  const txLike = {
    execute: async (query: unknown) => ({ rows: [...(await tx.execute(query as SQL))] }),
  };
  const jobId = await boss.send(name, data, { db: fromDrizzle(txLike, sql) });
  if (jobId === null) throw new Error(`sendInTx: boss.send returned null for queue ${name}`);
  return jobId;
}
