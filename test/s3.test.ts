/**
 * CH-18a-2 S3 SigV4 helper (src/lib/s3.ts). The signature is checked against
 * AWS's published "GET Object" example vector — the authoritative correctness
 * proof without a live endpoint (the live round-trip is a go-live smoke).
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  createS3Client,
  parseListXml,
  signRequest,
  uriEncode,
  type S3RequestOptions,
} from '../src/lib/s3.js';

describe('S3 SigV4 signing', () => {
  it('matches the AWS "GET Object" example vector', () => {
    const { headers } = signRequest(
      {
        endpoint: 'https://examplebucket.s3.amazonaws.com',
        region: 'us-east-1',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      },
      {
        method: 'GET',
        path: '/test.txt',
        extraHeaders: { range: 'bytes=0-9' },
        payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        now: new Date('2013-05-24T00:00:00Z'),
      },
    );
    expect(headers['x-amz-date']).toBe('20130524T000000Z');
    expect(headers.Authorization).toContain(
      'Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request',
    );
    expect(headers.Authorization).toContain('SignedHeaders=host;range;x-amz-content-sha256;x-amz-date');
    expect(headers.Authorization).toContain(
      'Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41',
    );
  });

  it('uriEncode follows the AWS rules', () => {
    expect(uriEncode('/a/b c', false)).toBe('/a/b%20c'); // slash kept in a path, space encoded
    expect(uriEncode('a/b', true)).toBe('a%2Fb'); // slash encoded in a query value
    expect(uriEncode('-_.~AZ09', false)).toBe('-_.~AZ09'); // unreserved untouched
  });
});

describe('S3 client', () => {
  const cfg = {
    endpoint: 'https://acc.r2.cloudflarestorage.com',
    region: 'auto',
    bucket: 'nistula-backups',
    accessKeyId: 'AK',
    secretAccessKey: 'SK',
  };

  it('PUT signs and targets the path-style URL with the body hash', async () => {
    const calls: { url: string; opts: S3RequestOptions }[] = [];
    const fakeHttp = async (url: string, opts: S3RequestOptions): Promise<Response> => {
      calls.push({ url, opts });
      return new Response('', { status: 200 });
    };
    const s3 = createS3Client(cfg, fakeHttp);
    const body = new Uint8Array([1, 2, 3]);
    await s3.put('nistula/backup-x.sql.age', body, new Date('2026-07-19T00:00:00Z'));

    expect(calls[0]!.url).toBe(
      'https://acc.r2.cloudflarestorage.com/nistula-backups/nistula/backup-x.sql.age',
    );
    expect(calls[0]!.opts.method).toBe('PUT');
    expect(calls[0]!.opts.headers.Authorization).toContain('AWS4-HMAC-SHA256');
    expect(calls[0]!.opts.headers['x-amz-content-sha256']).toBe(
      createHash('sha256').update(body).digest('hex'),
    );
  });

  it('LIST hits ?list-type=2 and parses keys', async () => {
    const xml =
      '<ListBucketResult>' +
      '<Contents><Key>nistula/backup-a.sql.age</Key><LastModified>2026-01-01T00:00:00.000Z</LastModified></Contents>' +
      '<Contents><Key>nistula/backup-b.sql.age</Key><LastModified>2026-02-01T00:00:00.000Z</LastModified></Contents>' +
      '</ListBucketResult>';
    let seenUrl = '';
    const fakeHttp = async (url: string): Promise<Response> => {
      seenUrl = url;
      return new Response(xml, { status: 200 });
    };
    const s3 = createS3Client(cfg, fakeHttp);
    const objects = await s3.list('nistula/backup-', new Date('2026-07-19T00:00:00Z'));
    expect(seenUrl).toContain('list-type=2');
    expect(seenUrl).toContain('prefix=nistula%2Fbackup-');
    expect(objects.map((o) => o.key)).toEqual(['nistula/backup-a.sql.age', 'nistula/backup-b.sql.age']);
  });

  it('throws on a non-2xx response', async () => {
    const s3 = createS3Client(cfg, async () => new Response('denied', { status: 403 }));
    await expect(s3.put('k', new Uint8Array([1]))).rejects.toThrow(/403/);
  });
});

describe('parseListXml', () => {
  it('returns [] for an empty listing', () => {
    expect(parseListXml('<ListBucketResult></ListBucketResult>')).toEqual([]);
  });
});
