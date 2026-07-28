/**
 * build-explainer-pdf — renders `docs/what-is-nistula-assistance.html` to
 * `docs/what-is-nistula-assistance.pdf` with headless Chrome, and BYTE-CHECKS
 * every guest- and staff-facing line quoted in the document against the code
 * that actually produces it.
 *
 * WHY the check imports rather than greps: the document quotes the words a real
 * person will read. An earlier version regex-extracted string literals, which
 * proves the file contains a string — not that the system SENDS it. Here the
 * lifecycle and staff bodies are produced by calling the real `renderTemplate`,
 * so the document is compared against the actual render path, slots and all.
 * A copy-edit "improving" the discount line, or a prettifier curling a straight
 * apostrophe, fails the build instead of quietly shipping a plausible fiction
 * about what this system says.
 *
 * It has already earned that: the first draft of the document invented an
 * SLA-nudge message that does not exist.
 *
 * Usage:  npx tsx scripts/build-explainer-pdf.ts [--check-only]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PHRASEBOOK } from '../src/brain/prompt.js';
import { renderTemplate } from '../src/lifecycle/templates.js';
import { formatStayDates, formatDayDisplay } from '../src/lib/time.js';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const htmlPath = join(root, 'docs', 'what-is-nistula-assistance.html');
const pdfPath = join(root, 'docs', 'what-is-nistula-assistance.pdf');
const html = readFileSync(htmlPath, 'utf8');
const read = (...p: string[]): string => readFileSync(join(root, ...p), 'utf8');

/* ── the worked example the document is written around ───────────────────── */

const GUEST = 'Rahul';
const TYPE = 'Nistula Apartment';
const PLACE = 'Assagao';
const DATES = formatStayDates('2026-12-20', '2026-12-22');
const CHECK_IN_DAY = formatDayDisplay('2026-12-20');
const REF = '1042';
const TASK_ID = 'K7Q2FX';
const ESC_ID = 'M4T8QP';
const DRAFT_ID = '9WXB2K';
const HOUSE = 'Apartment 09';

const stay = {
  firstName: GUEST,
  villaType: TYPE,
  locality: PLACE,
  dates: DATES,
  reference: REF,
  checkInDay: CHECK_IN_DAY,
};

/**
 * Slot values the document puts on a card. Kept beside the renders so the
 * example stays ONE example — a card naming a different house from the chat
 * beside it is the kind of thing a reader notices and an author does not.
 */
const TOWELS = '2 extra towels';

/* ── 1. every quoted line, produced the way production produces it ───────── */

const expected: [string, string][] = [
  // Phrasebook — the fixed wordings the model may not paraphrase.
  ['PHRASEBOOK.inventoryRetired', PHRASEBOOK.inventoryRetired],
  ['PHRASEBOOK.discountAsk', PHRASEBOOK.discountAsk],
  ['PHRASEBOOK.outsideKnowledgeNight', PHRASEBOOK.outsideKnowledgeNight],
  ['PHRASEBOOK.isBot', PHRASEBOOK.isBot],
  ['PHRASEBOOK.marketingStopConfirm', PHRASEBOOK.marketingStopConfirm],

  // The five lifecycle messages that send themselves, plus the lead nudge.
  ['template confirmation', renderTemplate('confirmation', stay)],
  ['template prearrival', renderTemplate('prearrival', stay)],
  ['template welcome', renderTemplate('welcome', stay)],
  ['template poststay', renderTemplate('poststay', stay)],
  ['template winback', renderTemplate('winback', stay)],
  ['template lead_followup', renderTemplate('lead_followup', stay)],

  // Staff cards.
  [
    'template task_card',
    renderTemplate('task_card', {
      shortId: TASK_ID,
      villa: HOUSE,
      guestName: GUEST,
      summary: TOWELS,
    }),
  ],
  [
    'template task_card (SLA re-send)',
    renderTemplate('task_card', {
      shortId: TASK_ID,
      villa: HOUSE,
      guestName: 'overdue',
      summary: `STILL OPEN after 30 min — ${TOWELS}`,
    }),
  ],
  [
    'template escalation_card',
    renderTemplate('escalation_card', {
      shortId: ESC_ID,
      guestName: 'Priya',
      reason: 'outside_kb',
      detail:
        'Proposal at the villa - asks us to decorate the pool area, budget no object. In-house from Friday.',
    }),
  ],
  [
    'template draft_card',
    renderTemplate('draft_card', {
      shortId: DRAFT_ID,
      guestName: GUEST,
      replyType: 'presales',
      body: 'Good evening. The apartments in Assagao are free for 20-22 Dec.',
    }),
  ],
  [
    'template digest (morning)',
    renderTemplate('digest', {
      day: 'Monday 21 December',
      // buildSummary's exact join, replicated — the function is module-private.
      // The token guard below fails the build if its format ever moves.
      summary:
        '1 raised overnight now live (the AC in the master bedroom is weak · 23:05); 0 escalation(s) + 1 task(s) open',
    }),
  ],
];

/* ── 2. facts the document bakes in that no render can prove ─────────────── */

interface Token {
  file: string[];
  needle: string;
  why: string;
}

const tokens: Token[] = [
  // The two close lines are module-private consts in commands.ts.
  {
    file: ['src', 'staff', 'commands.ts'],
    needle: "housekeeping: 'Housekeeping have taken care of that for you.'",
    why: 'the housekeeping close line quoted on the towels scene',
  },
  {
    file: ['src', 'staff', 'commands.ts'],
    needle: "maintenance: 'Maintenance have seen to that for you.'",
    why: 'the maintenance close line quoted on the night scene',
  },
  {
    file: ['src', 'staff', 'commands.ts'],
    needle: "return ['Open for you:', ...lines, 'Reply DONE <id> when finished.'].join('\\n')",
    why: 'the TASKS list a staff member can pull at any time',
  },
  // The SLA nudge is the SAME card re-sent, not a bespoke message.
  {
    file: ['src', 'staff', 'sla.ts'],
    needle: '`STILL OPEN after ${task.slaMinutes} min — ${task.summary}`',
    why: 'the overdue prefix on the re-sent card',
  },
  {
    file: ['src', 'staff', 'sla.ts'],
    needle: "guestName: 'overdue'",
    why: 'the re-sent card replaces the guest name with "overdue"',
  },
  // The digest summary shape.
  {
    file: ['src', 'staff', 'digest.ts'],
    needle: '`${run.converted} raised overnight now live (${label} · ${at})${more}`',
    why: 'the morning digest first clause',
  },
  {
    file: ['src', 'staff', 'digest.ts'],
    needle: '`${run.openEscalations} escalation(s) + ${run.openTasks} task(s) open`',
    why: 'the morning digest second clause',
  },
];

/** Numbers the document states as facts. Each is read out of the code. */
const numbers: [string, RegExp, string, string[]][] = [
  ['housekeeping SLA', /housekeeping:\s*(\d+),/, '30', ['src', 'db', 'tasks.ts']],
  ['frontdesk SLA', /frontdesk:\s*(\d+),/, '10', ['src', 'db', 'tasks.ts']],
  ['maintenance SLA', /maintenance:\s*(\d+),/, '120', ['src', 'db', 'tasks.ts']],
  ['escalation SLA', /escalation:\s*(\d+),/, '10', ['src', 'db', 'tasks.ts']],
  ['win-back cap', /const WINBACK_CAP = (\d+)/, '2', ['src', 'lifecycle', 'sendGuards.ts']],
  [
    'win-back window',
    /const WINBACK_WINDOW_DAYS = (\d+)/,
    '365',
    ['src', 'lifecycle', 'sendGuards.ts'],
  ],
  ['stale hours', /STALE_AFTER_HOURS = (\d+)/, '36', ['src', 'lifecycle', 'sendGuards.ts']],
  [
    'guest quiet start',
    /GUEST_QUIET_START = '(\d\d:\d\d)'/,
    '22:00',
    ['src', 'lifecycle', 'sendGuards.ts'],
  ],
  [
    'guest quiet end',
    /GUEST_QUIET_END = '(\d\d:\d\d)'/,
    '08:00',
    ['src', 'lifecycle', 'sendGuards.ts'],
  ],
  [
    'staff night start',
    /NIGHT_START: z\.string\(\)\.regex\(HHMM\)\.default\('(\d\d:\d\d)'\)/,
    '20:00',
    ['src', 'config.ts'],
  ],
  [
    'staff night end',
    /NIGHT_END: z\.string\(\)\.regex\(HHMM\)\.default\('(\d\d:\d\d)'\)/,
    '10:00',
    ['src', 'config.ts'],
  ],
  ['morning digest cron', /DIGEST_CRON = '([^']+)'/, '0 10 * * *', ['src', 'staff', 'digest.ts']],
  ['ops rollup cron', /ROLLUP_CRON = '([^']+)'/, '30 23 * * *', ['src', 'ops', 'rollup.ts']],
  ['SLA nudger cron', /SLA_NUDGER_CRON = '([^']+)'/, '*/5 * * * *', ['src', 'staff', 'sla.ts']],
  ['watchdog cron', /WATCHDOG_CRON = '([^']+)'/, '*/5 * * * *', ['src', 'ops', 'watchdog.ts']],
  [
    'human takeover TTL',
    /HUMAN_ACTIVE_TTL_MS = (\d+) \* 60 \* 60 \* 1000/,
    '2',
    ['src', 'staff', 'humanTakeover.ts'],
  ],
  ['max open tasks', /MAX_OPEN_TASKS_PER_CONVERSATION = (\d+)/, '3', ['src', 'db', 'tasks.ts']],
];

/* ── 3. run the checks ───────────────────────────────────────────────────── */

let failures = 0;
const fail = (msg: string): void => {
  failures += 1;
  console.log(`FAIL  ${msg}`);
};

/** A body containing `<new text>` MUST be entity-escaped to render at all, so a
 * raw substring test would reject a document that is in fact correct. Compare
 * against both forms — never relax the comparison itself. */
const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

for (const [name, line] of expected) {
  if (html.includes(line) || html.includes(escapeHtml(line))) console.log(`OK    ${name}`);
  else {
    fail(name);
    console.log(`      expected verbatim: ${JSON.stringify(line)}`);
  }
}

for (const t of tokens) {
  if (read(...t.file).includes(t.needle)) console.log(`OK    source: ${t.why}`);
  else fail(`source moved — ${t.why} (${t.file.join('/')})`);
}

for (const [name, re, want, file] of numbers) {
  const got = re.exec(read(...file))?.[1];
  if (got === want) console.log(`OK    ${name} = ${want}`);
  else fail(`${name} is now ${got ?? 'unreadable'}, document says ${want}`);
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed. Refusing to render.`);
  process.exit(1);
}
console.log(`\nAll ${expected.length + tokens.length + numbers.length} checks pass.`);

if (process.argv.includes('--check-only')) process.exit(0);

/* ── 4. render ───────────────────────────────────────────────────────────── */

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
