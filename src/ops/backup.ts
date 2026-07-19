/**
 * Encrypted off-site backup runner (plan §8 CH-18 step 2). Nightly:
 *   pg_dump -Fc  →  age-encrypt to Paul's PUBLIC key  →  PUT to S3-compatible
 *   storage (R2/B2)  →  prune anything past the retention window.
 *
 * 🚨 INVARIANT: a plaintext dump is a full PII export (every guest message,
 * phone, name). If BACKUP_AGE_RECIPIENT is unset we REFUSE — nothing is produced
 * and nothing is uploaded — rather than risk an unencrypted dump leaving the box.
 *
 * The dump producer and the S3 client are INJECTED, so this whole runner is
 * unit-testable with fakes and no live pg_dump/age/S3 (scripts/backup.ts wires
 * the real child-process pipe + client). Never throws — it is a cron tick; a
 * failure alerts ops and returns a reason.
 *
 * The 30-day retention is LOAD-BEARING: plan step 1 ties DELETE_GUEST erasure
 * completeness to backups ageing out, so both the bucket lifecycle rule AND this
 * in-app prune enforce it.
 */
import { summarizeError } from '../lib/logger.js';
import type { S3Client } from '../lib/s3.js';
import { alertOps, type AlertLogger } from './alerts.js';

export interface BackupLogger extends AlertLogger {
  info?: (obj: Record<string, unknown>, msg?: string) => void;
}

export interface BackupDeps {
  /** age recipient PUBLIC key. Empty ⇒ REFUSE (no plaintext dump ever). */
  ageRecipient: string;
  retentionDays: number;
  log: BackupLogger;
  now?: () => Date;
  /** Runs `pg_dump -Fc | age -r <recipient>` and returns the encrypted bytes. */
  produceEncryptedDump: () => Promise<Uint8Array>;
  /** Destination. Exactly one of s3 / localDir is used (s3 in prod; localDir is
   * the hermetic restore-drill / dev path). */
  s3?: S3Client;
  localDir?: string;
  writeLocal?: (filePath: string, bytes: Uint8Array) => Promise<void>;
}

export interface BackupResult {
  ok: boolean;
  reason?: string;
  key?: string;
  bytes?: number;
  uploaded?: boolean;
  prunedKeys?: string[];
}

const KEY_PREFIX = 'nistula/backup-';
const KEY_RE = /backup-(\d{8}T\d{6}Z)\.sql\.age$/;

/** Compact UTC stamp "YYYYMMDDTHHMMSSZ" for the object key. */
export function backupStamp(now: Date): string {
  return now.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

/** The instant encoded in a backup object key, or null when unrecognised (a key
 * we cannot date is NEVER pruned — safety over tidiness). */
export function keyInstant(key: string): Date | null {
  const m = KEY_RE.exec(key);
  if (!m) return null;
  const s = m[1]!;
  const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function runBackup(deps: BackupDeps): Promise<BackupResult> {
  const now = deps.now?.() ?? new Date();

  if (deps.ageRecipient.trim() === '') {
    await alertOps(deps.log, {
      kind: 'backup_no_recipient',
      summary: 'backup REFUSED — BACKUP_AGE_RECIPIENT unset; a plaintext dump must never be produced',
    });
    return { ok: false, reason: 'no_recipient' };
  }

  try {
    const bytes = await deps.produceEncryptedDump();
    if (bytes.length === 0) {
      await alertOps(deps.log, {
        kind: 'backup_failed',
        summary: 'backup produced an EMPTY encrypted dump — pg_dump/age likely failed',
      });
      return { ok: false, reason: 'empty_dump' };
    }
    const key = `${KEY_PREFIX}${backupStamp(now)}.sql.age`;

    if (deps.localDir !== undefined) {
      // Restore-drill / dev: write locally, never upload, never prune.
      const base = key.split('/').pop();
      const filePath = `${deps.localDir.replace(/\/$/, '')}/${base}`;
      if (deps.writeLocal === undefined) throw new Error('localDir set without writeLocal');
      await deps.writeLocal(filePath, bytes);
      deps.log.info?.({ filePath, bytes: bytes.length }, '[backup] wrote local dump (no upload)');
      return { ok: true, key, bytes: bytes.length, uploaded: false };
    }

    if (deps.s3 === undefined) throw new Error('no backup destination (neither s3 nor localDir)');
    await deps.s3.put(key, bytes, now);
    const prunedKeys = await prune(deps.s3, deps.retentionDays, now);
    deps.log.info?.(
      { key, bytes: bytes.length, pruned: prunedKeys.length },
      '[backup] uploaded + pruned',
    );
    return { ok: true, key, bytes: bytes.length, uploaded: true, prunedKeys };
  } catch (error) {
    await alertOps(deps.log, {
      kind: 'backup_failed',
      summary: 'nightly backup failed',
      detail: { err: summarizeError(error) },
    });
    return { ok: false, reason: summarizeError(error) };
  }
}

/** Defensive in-app prune (belt-and-braces with the bucket's lifecycle rule):
 * delete backups strictly older than the retention window. */
async function prune(s3: S3Client, retentionDays: number, now: Date): Promise<string[]> {
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  const objects = await s3.list(KEY_PREFIX, now);
  const deleted: string[] = [];
  for (const obj of objects) {
    const at = keyInstant(obj.key);
    if (at !== null && at.getTime() < cutoff) {
      await s3.del(obj.key, now);
      deleted.push(obj.key);
    }
  }
  return deleted;
}
