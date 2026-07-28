#!/usr/bin/env node
/**
 * build-explainer-pdf — renders `docs/what-is-nistula-assistance.html` to
 * `docs/what-is-nistula-assistance.pdf` with headless Chrome, and BYTE-CHECKS
 * every guest-facing line quoted in the document against its source constant.
 *
 * WHY the byte-check is in the build and not a review step: the document quotes
 * the words a real guest will read. A prettifier turning a straight apostrophe
 * into a curly one, or a copy-edit "improving" the discount line, would make the
 * document a plausible-looking lie about what the system says — and nothing else
 * in the repo would notice. So the render REFUSES on drift.
 *
 * Usage:  node scripts/build-explainer-pdf.mjs [--check-only]
 *
 * Chrome is used rather than a PDF library because the design is inherited from
 * Paul's deck (docs/presentation/), which is CSS print output at 336x189mm.
 */
/* global process, console, URL */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const htmlPath = join(root, 'docs', 'what-is-nistula-assistance.html');
const pdfPath = join(root, 'docs', 'what-is-nistula-assistance.pdf');

/* ── 1. byte-check the quoted lines ──────────────────────────────────────── */

/** Pull a single-or-double-quoted TS string literal assigned to `key`. */
function tsString(source, key) {
  const re = new RegExp(`${key}:\\s*(?:\\r?\\n\\s*)?(['"\`])((?:\\\\.|(?!\\1).)*)\\1`, 's');
  const m = re.exec(source);
  if (m === null) throw new Error(`could not find ${key} in source`);
  return m[2].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

const prompt = readFileSync(join(root, 'src', 'brain', 'prompt.ts'), 'utf8');
const commands = readFileSync(join(root, 'src', 'staff', 'commands.ts'), 'utf8');
const html = readFileSync(htmlPath, 'utf8');

// The task card is a template literal with ${p.x} slots; render it with the same
// example values the document uses, so the check covers punctuation AND shape.
const CARD = [
  'NISTULA TASK #K7Q2FX',
  'Apartment 09 · Rahul · 2 extra towels',
  'Reply DONE K7Q2FX when finished.',
].join('\n');

// The SLA nudge is NOT a bespoke message — staff/sla.ts re-sends the SAME
// task_card with guestName 'overdue' and the summary prefixed by
// `STILL OPEN after ${task.slaMinutes} min — `. Housekeeping's SLA is 30 min
// (db/tasks.ts SLA_MINUTES). The document's first draft invented a "Still open:"
// line instead, which is exactly the kind of plausible fiction this check exists
// to stop.
const NUDGE = [
  'NISTULA TASK #K7Q2FX',
  'Apartment 09 · overdue · STILL OPEN after 30 min — 2 extra towels',
  'Reply DONE K7Q2FX when finished.',
].join('\n');

const expected = [
  ['PHRASEBOOK.inventoryRetired', tsString(prompt, 'inventoryRetired')],
  ['PHRASEBOOK.discountAsk', tsString(prompt, 'discountAsk')],
  ['PHRASEBOOK.outsideKnowledgeNight', tsString(prompt, 'outsideKnowledgeNight')],
  ['PHRASEBOOK.isBot', tsString(prompt, 'isBot')],
  ['CLOSE_LINE.housekeeping', tsString(commands, 'housekeeping')],
  ['STAFF_TEMPLATES.task_card render', CARD],
  ['SLA nudge (task_card re-render)', NUDGE],
];

// Guard the two facts the NUDGE string bakes in, so a change to either is caught
// here rather than read off a stale PDF.
const sla = /housekeeping:\s*(\d+)/.exec(readFileSync(join(root, 'src', 'db', 'tasks.ts'), 'utf8'));
if (sla === null || sla[1] !== '30') {
  console.error(`housekeeping SLA is no longer 30 min (got ${sla?.[1] ?? 'nothing'})`);
  process.exit(1);
}
const slaSrc = readFileSync(join(root, 'src', 'staff', 'sla.ts'), 'utf8');
for (const token of ['STILL OPEN after ${task.slaMinutes} min — ', "guestName: 'overdue'"]) {
  if (!slaSrc.includes(token)) {
    console.error(
      `sla.ts no longer contains ${JSON.stringify(token)} — the nudge card has changed`,
    );
    process.exit(1);
  }
}

// The HTML holds `&amp;`/`&nbsp;` nowhere inside a quoted line, so a plain
// substring test is exact — no entity decoding to get subtly wrong.
let failures = 0;
for (const [name, line] of expected) {
  const ok = html.includes(line);
  if (!ok) failures += 1;
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`      expected verbatim: ${JSON.stringify(line)}`);
}
if (failures > 0) {
  console.error(`\n${failures} quoted line(s) do not match source. Refusing to render.`);
  process.exit(1);
}
console.log(`\n${expected.length} quoted lines match their source byte for byte.`);

if (process.argv.includes('--check-only')) process.exit(0);

/* ── 2. render ───────────────────────────────────────────────────────────── */

const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];
const chrome = chromeCandidates.find((p) => existsSync(p));
if (chrome === undefined) throw new Error('no Chrome or Edge binary found');

// A throwaway profile: a warm profile can hold an extension or a policy that
// injects into the page, and this render must be reproducible.
const profile = mkdtempSync(join(tmpdir(), 'nistula-pdf-'));
try {
  execFileSync(
    chrome,
    [
      '--headless',
      '--disable-gpu',
      '--no-first-run',
      '--no-pdf-header-footer',
      `--user-data-dir=${profile}`,
      `--print-to-pdf=${pdfPath}`,
      `file:///${htmlPath.replace(/\\/g, '/')}`,
    ],
    { stdio: 'inherit' },
  );
} finally {
  rmSync(profile, { recursive: true, force: true });
}
console.log(`\nrendered → ${pdfPath}`);
