/**
 * The REAL side-effecting halves of the backup (CH-18a-2), isolated here so
 * ops/backup.ts stays a pure, injected, unit-testable orchestrator. Both the
 * in-process cron (jobs/index.ts) and the `pnpm backup` CLI (scripts/backup.ts)
 * wire these.
 *
 * The container image must carry `pg_dump` (postgresql-client-16, matching PG16)
 * and `age` — see the runbook. `age -r <public recipient>` encrypts; no private
 * key ever lives on the box.
 */
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

/**
 * Streams `pg_dump -Fc <DATABASE_URL> | age -r <recipient>` and resolves with
 * the encrypted bytes. Resolves ONLY when BOTH processes exit 0 — a pg_dump that
 * fails mid-stream would otherwise yield a non-empty but TRUNCATED (useless)
 * encrypted blob, and a corrupt backup that looks fine is worse than none.
 *
 * `spawnFn` is injected only so the pipe's error paths can be driven in a unit
 * test without the real binaries — production always uses node's `spawn`.
 */
export function pgDumpAgePipe(
  databaseUrl: string,
  recipient: string,
  spawnFn: typeof spawn = spawn,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const errs: string[] = [];
    let dumpCode: number | null | undefined;
    let ageCode: number | null | undefined;
    let settled = false;
    const fail = (msg: string): void => {
      if (!settled) {
        settled = true;
        reject(new Error(`${msg} ${errs.join(' ').slice(0, 300)}`.trim()));
      }
    };
    const tryResolve = (): void => {
      if (settled || dumpCode === undefined || ageCode === undefined) return;
      if (dumpCode !== 0) return fail(`pg_dump exit ${dumpCode}`);
      if (ageCode !== 0) return fail(`age exit ${ageCode}`);
      settled = true;
      resolve(new Uint8Array(Buffer.concat(chunks)));
    };

    const dump = spawnFn('pg_dump', ['-Fc', databaseUrl], { stdio: ['ignore', 'pipe', 'pipe'] });
    const age = spawnFn('age', ['-r', recipient], { stdio: ['pipe', 'pipe', 'pipe'] });
    dump.on('error', (e) => fail(`pg_dump spawn: ${e.message}`));
    age.on('error', (e) => fail(`age spawn: ${e.message}`));
    // A premature `age` (malformed recipient, OOM-kill) closes age.stdin while
    // pg_dump is still streaming; the forwarding write then raises EPIPE as an
    // 'error' ON THE STREAM (distinct from the ChildProcess 'error' above). With
    // no listener node escalates it to an uncaughtException that kills the whole
    // service — so route stream errors into fail(), keeping the module's
    // "never throws — a failure is a clean rejected reason" cron contract.
    dump.stdout.on('error', (e) => fail(`pg_dump stdout: ${e.message}`));
    age.stdin.on('error', (e) => fail(`age stdin: ${e.message}`));
    dump.stderr.on('data', (c: Buffer) => errs.push(String(c)));
    age.stderr.on('data', (c: Buffer) => errs.push(String(c)));
    age.stdout.on('data', (c: Buffer) => chunks.push(c));
    dump.stdout.pipe(age.stdin);
    dump.on('close', (code) => {
      dumpCode = code;
      tryResolve();
    });
    age.on('close', (code) => {
      ageCode = code;
      tryResolve();
    });
  });
}

/** Writes the encrypted dump to a local path (restore-drill / dev, --no-upload). */
export async function writeLocalFile(filePath: string, bytes: Uint8Array): Promise<void> {
  await writeFile(filePath, bytes);
}
