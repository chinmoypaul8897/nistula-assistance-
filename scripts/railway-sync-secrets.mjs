#!/usr/bin/env node
/**
 * railway-sync-secrets — CH-18a-2. Push local `.env` secrets to Railway with
 * NODE, never a PowerShell pipe: PS prepends a UTF-8 BOM into the stored value
 * (the CH-10 trap that corrupted a secret). Verifies each stored variable
 * in-process and prints variable NAMES + a status word only — NEVER a value.
 *
 * Rotation (new WA token, etc.) = edit `.env`, rerun this. This is the
 * canonical rotation procedure the runbook points to.
 *
 * Usage:  node scripts/railway-sync-secrets.mjs [VAR ...]
 *   - no args → the default secret set below;
 *   - args    → sync exactly those variable names.
 *
 * Preconditions: `railway link` done (a service is selected). The flags match
 * Railway CLI v3+ (`railway variables --set KEY=VALUE`, `--json`); confirm once
 * against your installed CLI. The value rides in argv (visible only on your own
 * machine) with NO BOM — the property that matters for a working secret.
 */
/* global process, console */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const DEFAULT_SECRETS = [
  'WA_ACCESS_TOKEN',
  'WA_APP_SECRET',
  'WA_VERIFY_TOKEN',
  'EZEE_AUTH_CODE',
  'ANTHROPIC_API_KEY',
  'ADMIN_BEARER_TOKEN',
  'BACKUP_S3_ACCESS_KEY_ID',
  'BACKUP_S3_SECRET_ACCESS_KEY',
  'BACKUP_AGE_RECIPIENT',
];

/** Minimal `.env` parse: KEY=VALUE lines, optional surrounding quotes stripped. */
function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m === null) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const names = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_SECRETS;
const env = parseEnv(readFileSync('.env', 'utf8'));

for (const key of names) {
  const value = env[key];
  if (value === undefined || value === '') {
    console.log(`${key}: SKIP (absent in .env)`);
    continue;
  }
  try {
    // execFileSync (not a shell) → the value is one argv token, never
    // shell-interpolated and never given a BOM.
    execFileSync('railway', ['variables', '--set', `${key}=${value}`, '--skip-deploys'], {
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    console.log(`${key}: set`);
  } catch {
    console.log(`${key}: SET FAILED (is a service linked?)`);
  }
}

// Verify in-process: compare what Railway now stores against local — names +
// VERIFIED/MISMATCH only. Best-effort: a CLI JSON-shape change reads as MISMATCH.
try {
  const stored = JSON.parse(execFileSync('railway', ['variables', '--json'], { encoding: 'utf8' }));
  for (const key of names) {
    if (env[key] === undefined || env[key] === '') continue;
    console.log(`${key}: ${stored[key] === env[key] ? 'VERIFIED' : 'MISMATCH'}`);
  }
} catch {
  console.log('verify: could not read `railway variables --json`');
}
