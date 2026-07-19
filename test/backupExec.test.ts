/**
 * CH-18a-2 backup pipe (src/ops/backupExec.ts). The nightly backup runs the real
 * `pg_dump | age` pipe IN-PROCESS with every other worker, so a stream error must
 * become a clean promise rejection, NEVER an uncaughtException that kills the
 * service. A pre-merge review reproduced the crash: a fast-failing `age` (bad
 * recipient) closes its stdin while pg_dump keeps streaming → EPIPE on the stream
 * → with no listener, node terminates the process. These tests drive that real
 * path via an injected spawn whose fake streams are EventEmitters — so an
 * unhandled 'error' would throw here exactly as it would in production.
 */
import { EventEmitter } from 'node:events';
import type { spawn } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { pgDumpAgePipe } from '../src/ops/backupExec.js';

/** A stdio stream stand-in: a real EventEmitter (so an unhandled 'error' throws)
 *  plus a no-op `pipe` and `write`/`end` the production code calls. */
class FakeStream extends EventEmitter {
  pipe(): void {}
  write(): void {}
  end(): void {}
}

class FakeChild extends EventEmitter {
  stdin = new FakeStream();
  stdout = new FakeStream();
  stderr = new FakeStream();
}

/** Returns an injectable spawn plus the two children it hands back, in order. */
function fakeSpawn(): { spawnFn: typeof spawn; dump: FakeChild; age: FakeChild } {
  const dump = new FakeChild();
  const age = new FakeChild();
  const children = [dump, age];
  const spawnFn = (() => children.shift()!) as unknown as typeof spawn;
  return { spawnFn, dump, age };
}

describe('pgDumpAgePipe', () => {
  it('turns an EPIPE on age.stdin into a rejection, not an uncaughtException', async () => {
    const { spawnFn, age } = fakeSpawn();
    const p = pgDumpAgePipe('postgres://x', 'age1bad', spawnFn);
    // age exits early on a bad recipient, then pg_dump's write hits the dead pipe.
    age.emit('close', 1);
    age.stdin.emit('error', new Error('write EPIPE'));
    await expect(p).rejects.toThrow(/EPIPE|age/);
  });

  it('rejects on an error emitted on dump.stdout', async () => {
    const { spawnFn, dump } = fakeSpawn();
    const p = pgDumpAgePipe('postgres://x', 'age1ok', spawnFn);
    dump.stdout.emit('error', new Error('read reset'));
    await expect(p).rejects.toThrow(/pg_dump stdout|read reset/);
  });

  it('rejects a non-zero pg_dump exit (a truncated dump is worse than none)', async () => {
    const { spawnFn, dump, age } = fakeSpawn();
    const p = pgDumpAgePipe('postgres://x', 'age1ok', spawnFn);
    dump.stderr.emit('data', Buffer.from('could not connect'));
    dump.emit('close', 1);
    age.emit('close', 0);
    await expect(p).rejects.toThrow(/pg_dump exit 1/);
  });

  it('resolves with the encrypted bytes when both processes exit 0', async () => {
    const { spawnFn, dump, age } = fakeSpawn();
    const p = pgDumpAgePipe('postgres://x', 'age1ok', spawnFn);
    age.stdout.emit('data', Buffer.from([1, 2, 3]));
    dump.emit('close', 0);
    age.emit('close', 0);
    await expect(p).resolves.toEqual(new Uint8Array([1, 2, 3]));
  });
});
