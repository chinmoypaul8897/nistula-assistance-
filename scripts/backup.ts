/**
 * `pnpm backup` — a manual/one-off run of the nightly encrypted backup (the
 * scheduled path is the in-process cron in jobs/index.ts). Two modes:
 *   - default: pg_dump → age → upload to the configured S3 bucket + prune.
 *   - --no-upload: write the encrypted dump to BACKUP_LOCAL_DIR (default
 *     ./backups) and stop — the hermetic RESTORE-DRILL path (runbook §Backups:
 *     `pnpm backup --no-upload` → `age -d -i drill.key` → `pg_restore` into a
 *     scratch DB → row-count parity).
 */
import { mkdir } from 'node:fs/promises';
import dotenv from 'dotenv';
import { loadConfig } from '../src/config.js';
import { runBackup, type BackupResult } from '../src/ops/backup.js';
import { pgDumpAgePipe, writeLocalFile } from '../src/ops/backupExec.js';
import { createS3Client } from '../src/lib/s3.js';
import { createLogger } from '../src/lib/logger.js';

async function main(): Promise<void> {
  dotenv.config({ quiet: true });
  const config = loadConfig();
  const log = createLogger();
  const noUpload = process.argv.includes('--no-upload');

  const databaseUrl = config.databaseUrl;
  const ageRecipient = config.backupAgeRecipient;
  if (databaseUrl === undefined) throw new Error('DATABASE_URL is required to back up');
  if (ageRecipient === undefined || ageRecipient.trim() === '') {
    throw new Error('BACKUP_AGE_RECIPIENT (age public key) is required — refusing a plaintext dump');
  }

  const common = {
    ageRecipient,
    retentionDays: config.backupRetentionDays,
    log,
    produceEncryptedDump: (): Promise<Uint8Array> => pgDumpAgePipe(databaseUrl, ageRecipient),
  };

  let result: BackupResult;
  if (noUpload) {
    const localDir = process.env.BACKUP_LOCAL_DIR ?? './backups';
    await mkdir(localDir, { recursive: true });
    result = await runBackup({ ...common, localDir, writeLocal: writeLocalFile });
  } else {
    const { backupS3Endpoint, backupS3Bucket, backupS3AccessKeyId, backupS3SecretAccessKey } = config;
    if (
      backupS3Endpoint === undefined ||
      backupS3Bucket === undefined ||
      backupS3AccessKeyId === undefined ||
      backupS3SecretAccessKey === undefined
    ) {
      throw new Error('S3 upload needs BACKUP_S3_ENDPOINT/BUCKET/ACCESS_KEY_ID/SECRET_ACCESS_KEY (or use --no-upload)');
    }
    result = await runBackup({
      ...common,
      s3: createS3Client({
        endpoint: backupS3Endpoint,
        region: config.backupS3Region,
        bucket: backupS3Bucket,
        accessKeyId: backupS3AccessKeyId,
        secretAccessKey: backupS3SecretAccessKey,
      }),
    });
  }

  log.info({ ...result }, result.ok ? 'backup ok' : 'backup FAILED');
  process.exitCode = result.ok ? 0 : 1;
}

if (process.argv[1]?.endsWith('backup.ts') === true) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
