/**
 * CH-18a-2 backup runner (src/ops/backup.ts). Pure: the dump producer, the S3
 * client and the local writer are all injected, so no pg_dump/age/S3/Postgres.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { backupStamp, keyInstant, runBackup } from '../src/ops/backup.js';
import type { S3Client, S3Object } from '../src/lib/s3.js';
import { resetOpsAlerts } from '../src/ops/alerts.js';

function makeLog() {
  const lines: Record<string, unknown>[] = [];
  return {
    lines,
    error(o: Record<string, unknown>) {
      lines.push(o);
    },
    info(o: Record<string, unknown>) {
      lines.push(o);
    },
  };
}
const alerts = (log: ReturnType<typeof makeLog>): unknown[] =>
  log.lines.map((l) => l.opsAlert).filter((k) => k !== undefined);

function fakeS3(objects: S3Object[] = []) {
  const puts: { key: string; bytes: number }[] = [];
  const dels: string[] = [];
  const client: S3Client = {
    async put(key, body) {
      puts.push({ key, bytes: body.length });
    },
    async list() {
      return objects;
    },
    async del(key) {
      dels.push(key);
    },
  };
  return { client, puts, dels };
}

const now = () => new Date('2026-07-19T02:30:00Z');
beforeEach(() => resetOpsAlerts());

describe('runBackup', () => {
  it('REFUSES with no age recipient — nothing is produced', async () => {
    const log = makeLog();
    let produced = false;
    const r = await runBackup({
      ageRecipient: '  ',
      retentionDays: 30,
      log,
      now,
      produceEncryptedDump: async () => {
        produced = true;
        return new Uint8Array([1]);
      },
      s3: fakeS3().client,
    });
    expect(r).toEqual({ ok: false, reason: 'no_recipient' });
    expect(produced).toBe(false);
    expect(alerts(log)).toContain('backup_no_recipient');
  });

  it('dumps → uploads → prunes only backups past retention', async () => {
    const s3 = fakeS3([
      { key: 'nistula/backup-20260601T000000Z.sql.age', lastModified: '' }, // ~48d → prune
      { key: 'nistula/backup-20260715T000000Z.sql.age', lastModified: '' }, // ~4d → keep
      { key: 'nistula/backup-unrecognised.txt', lastModified: '' }, // undatable → keep (safety)
    ]);
    const log = makeLog();
    const r = await runBackup({
      ageRecipient: 'age1recipient',
      retentionDays: 30,
      log,
      now,
      produceEncryptedDump: async () => new Uint8Array([1, 2, 3, 4]),
      s3: s3.client,
    });
    expect(r.ok).toBe(true);
    expect(r.uploaded).toBe(true);
    expect(r.key).toBe('nistula/backup-20260719T023000Z.sql.age');
    expect(s3.puts).toEqual([{ key: 'nistula/backup-20260719T023000Z.sql.age', bytes: 4 }]);
    expect(s3.dels).toEqual(['nistula/backup-20260601T000000Z.sql.age']);
  });

  it('an EMPTY encrypted dump is a failure (truncated pg_dump/age)', async () => {
    const log = makeLog();
    const r = await runBackup({
      ageRecipient: 'age1',
      retentionDays: 30,
      log,
      now,
      produceEncryptedDump: async () => new Uint8Array(),
      s3: fakeS3().client,
    });
    expect(r).toEqual({ ok: false, reason: 'empty_dump' });
    expect(alerts(log)).toContain('backup_failed');
  });

  it('local mode writes the dump and never uploads or prunes', async () => {
    const s3 = fakeS3();
    const written: { filePath: string; bytes: number }[] = [];
    const log = makeLog();
    const r = await runBackup({
      ageRecipient: 'age1',
      retentionDays: 30,
      log,
      now,
      produceEncryptedDump: async () => new Uint8Array([9, 9]),
      localDir: '/tmp/drill/',
      writeLocal: async (filePath, bytes) => {
        written.push({ filePath, bytes: bytes.length });
      },
    });
    expect(r.uploaded).toBe(false);
    expect(written).toEqual([{ filePath: '/tmp/drill/backup-20260719T023000Z.sql.age', bytes: 2 }]);
    expect(s3.puts).toHaveLength(0);
  });

  it('a producer failure is caught, alerted, and never thrown', async () => {
    const log = makeLog();
    const r = await runBackup({
      ageRecipient: 'age1',
      retentionDays: 30,
      log,
      now,
      produceEncryptedDump: async () => {
        throw new Error('pg_dump exit 1');
      },
      s3: fakeS3().client,
    });
    expect(r.ok).toBe(false);
    expect(alerts(log)).toContain('backup_failed');
  });
});

describe('backup key stamps', () => {
  it('round-trips backupStamp → keyInstant', () => {
    const d = new Date('2026-07-19T02:30:00Z');
    expect(keyInstant(`nistula/backup-${backupStamp(d)}.sql.age`)?.toISOString()).toBe(
      '2026-07-19T02:30:00.000Z',
    );
  });
  it('returns null for an undatable key (never pruned)', () => {
    expect(keyInstant('nistula/backup-weird.txt')).toBeNull();
  });
});
