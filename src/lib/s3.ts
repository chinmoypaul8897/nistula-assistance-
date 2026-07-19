/**
 * A tiny, vendor-neutral S3 client (CH-18a-2 backups) — AWS Signature V4 over
 * `node:crypto`, path-style, no `@aws-sdk`. Works against any S3-compatible
 * endpoint (Cloudflare R2, Backblaze B2, AWS). Only the three verbs the backup
 * runner needs: PUT (upload a dump), GET-list (prune), DELETE (prune).
 *
 * WHY hand-rolled: the SDK is a large dependency for three requests, and SigV4
 * is a pure function of node:crypto. `signRequest` is exported and deliberately
 * general so it can be checked against AWS's published example vector in tests —
 * the live round-trip is a go-live smoke (§8 CH-18 step 2), not a build gate.
 *
 * SECURITY: the access key + secret are §3.7 secrets (redacted in logs); they
 * never appear in a URL or a log line — only in the derived Authorization header.
 */
import { createHash, createHmac } from 'node:crypto';

export interface S3Config {
  /** Full origin, e.g. https://<acct>.r2.cloudflarestorage.com (no bucket). */
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/** The transport this client needs — a binary-capable request (lib/http's body
 * is string-only). Injected in tests; the default is a plain timed fetch (the
 * pg-boss backup job supplies the retry, so no wrapper is needed here). */
export interface S3RequestOptions {
  method: string;
  headers: Record<string, string>;
  body?: Uint8Array;
}
export type S3HttpFn = (url: string, options: S3RequestOptions) => Promise<Response>;

const defaultHttp: S3HttpFn = (url, options) =>
  fetch(url, {
    method: options.method,
    headers: options.headers,
    ...(options.body ? { body: options.body } : {}),
    signal: AbortSignal.timeout(20_000),
  });

/** RFC3986 URI-encode, byte-wise (AWS rules): unreserved kept, '/' kept when
 * `encodeSlash` is false (path segments), everything else %XX uppercase. */
export function uriEncode(input: string, encodeSlash: boolean): string {
  let out = '';
  for (const byte of Buffer.from(input, 'utf8')) {
    const ch = String.fromCharCode(byte);
    if (/[A-Za-z0-9\-_.~]/.test(ch)) out += ch;
    else if (ch === '/' && !encodeSlash) out += ch;
    else out += `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
  }
  return out;
}

const sha256hex = (data: string | Uint8Array): string =>
  createHash('sha256').update(data).digest('hex');
const hmac = (key: Uint8Array | string, data: string): Buffer =>
  createHmac('sha256', key).update(data, 'utf8').digest();

/** amz timestamp "YYYYMMDDTHHMMSSZ" and the "YYYYMMDD" scope date, both UTC. */
function amzStamps(now: Date): { amzDate: string; dateStamp: string } {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

export interface SignedRequest {
  headers: Record<string, string>;
  amzDate: string;
}

/**
 * Signs one request. `path` is the already-constructed, un-encoded path
 * (e.g. "/bucket/key"); `extraHeaders` are any beyond host/x-amz-date/
 * x-amz-content-sha256 (e.g. a Range). Returns the full header set incl.
 * Authorization. `now` is injected so tests are deterministic.
 */
export function signRequest(
  cfg: Pick<S3Config, 'endpoint' | 'region' | 'accessKeyId' | 'secretAccessKey'>,
  req: {
    method: string;
    path: string;
    query?: Record<string, string>;
    extraHeaders?: Record<string, string>;
    payloadHash: string;
    now: Date;
  },
): SignedRequest {
  const { amzDate, dateStamp } = amzStamps(req.now);
  const host = new URL(cfg.endpoint).host;
  const headers: Record<string, string> = {
    host,
    'x-amz-content-sha256': req.payloadHash,
    'x-amz-date': amzDate,
    ...(req.extraHeaders ?? {}),
  };

  const lower = new Map<string, string>();
  for (const [k, v] of Object.entries(headers)) lower.set(k.toLowerCase(), v.trim());
  const signedKeys = [...lower.keys()].sort();
  const canonicalHeaders = signedKeys.map((k) => `${k}:${lower.get(k) ?? ''}\n`).join('');
  const signedHeaders = signedKeys.join(';');

  const query = req.query ?? {};
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${uriEncode(k, true)}=${uriEncode(query[k] ?? '', true)}`)
    .join('&');

  const canonicalRequest = [
    req.method,
    uriEncode(req.path, false),
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    req.payloadHash,
  ].join('\n');

  const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonicalRequest)].join('\n');

  const kDate = hmac(`AWS4${cfg.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, cfg.region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  headers.Authorization =
    `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return { headers, amzDate };
}

export interface S3Object {
  key: string;
  lastModified: string;
}

export interface S3Client {
  put(key: string, body: Uint8Array, now?: Date): Promise<void>;
  list(prefix: string, now?: Date): Promise<S3Object[]>;
  del(key: string, now?: Date): Promise<void>;
}

/** Parses <Contents><Key/><LastModified/></Contents> from a ListObjectsV2 body —
 * tolerant string scan, no XML dependency. */
export function parseListXml(xml: string): S3Object[] {
  const out: S3Object[] = [];
  for (const block of xml.match(/<Contents>[\s\S]*?<\/Contents>/g) ?? []) {
    const key = /<Key>([\s\S]*?)<\/Key>/.exec(block)?.[1];
    const lastModified = /<LastModified>([\s\S]*?)<\/LastModified>/.exec(block)?.[1] ?? '';
    if (key !== undefined) out.push({ key, lastModified });
  }
  return out;
}

/** An S3 client bound to one bucket. `httpImpl` is injectable for tests. */
export function createS3Client(cfg: S3Config, httpImpl: S3HttpFn = defaultHttp): S3Client {
  const send = async (
    method: string,
    path: string,
    opts: { query?: Record<string, string>; body?: Uint8Array; now?: Date },
  ): Promise<Response> => {
    const payloadHash = sha256hex(opts.body ?? '');
    const { headers } = signRequest(cfg, {
      method,
      path,
      query: opts.query,
      payloadHash,
      now: opts.now ?? new Date(),
    });
    const qs =
      opts.query && Object.keys(opts.query).length > 0
        ? `?${Object.keys(opts.query)
            .sort()
            .map((k) => `${uriEncode(k, true)}=${uriEncode(opts.query?.[k] ?? '', true)}`)
            .join('&')}`
        : '';
    const url = `${cfg.endpoint.replace(/\/$/, '')}${uriEncode(path, false)}${qs}`;
    return httpImpl(url, { method, headers, ...(opts.body ? { body: opts.body } : {}) });
  };

  const ok = (res: Response, what: string): void => {
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`s3 ${what} failed: ${res.status}`);
    }
  };

  return {
    async put(key, body, now) {
      const res = await send('PUT', `/${cfg.bucket}/${key}`, { body, now });
      ok(res, 'put');
    },
    async list(prefix, now) {
      const res = await send('GET', `/${cfg.bucket}`, {
        query: { 'list-type': '2', prefix },
        now,
      });
      ok(res, 'list');
      return parseListXml(await res.text());
    },
    async del(key, now) {
      const res = await send('DELETE', `/${cfg.bucket}/${key}`, { now });
      ok(res, 'delete');
    },
  };
}
