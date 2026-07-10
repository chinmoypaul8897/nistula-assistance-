/**
 * Fixture sanitiser (plan.md CH-02 step 5, §3.5): every captured payload
 * passes through here before entering test/fixtures/ — phones map to
 * reserved test numbers, message bodies become lorem, profile names become
 * placeholders. Replacement numbers are ALWAYS plusless digits (Meta's own
 * wire form) so the CI guard, which fails on any `+91` in fixtures, stays
 * maximally strict. CLI: `pnpm tsx scripts/fixture-scrub.ts <file...>`
 * rewrites each JSON file in place and prints counts only, never values.
 */

const PHONE_KEYS = new Set(['from', 'wa_id', 'recipient_id', 'display_phone_number', 'phone']);
const BODY_KEYS = new Set(['body', 'caption']);
const NAME_KEY = 'name';
const LOREM = 'Lorem ipsum dolor sit amet.';
// Reserved range mirrors the CH-01 test-data convention (+91 7700 900xxx),
// emitted plusless: 91770090 + 4-digit counter = a 12-digit wire-form number.
const RESERVED_PREFIX = '91770090';
// Digit runs that look like subscriber numbers inside free text; 10–14 with
// an optional +/91 lead. Keyed fields are replaced wholesale regardless.
const INLINE_PHONE = /\+?\d[\d\s-]{8,15}\d/g;

export interface ScrubStats {
  phones: number;
  bodies: number;
  names: number;
  wamids: number;
}

/** Deep-scrubs a parsed payload; deterministic (same input phone → same reserved number). */
export function scrubFixture(value: unknown): { scrubbed: unknown; stats: ScrubStats } {
  const phoneMap = new Map<string, string>();
  const wamidMap = new Map<string, string>();
  const stats: ScrubStats = { phones: 0, bodies: 0, names: 0, wamids: 0 };

  const reserve = (original: string): string => {
    const existing = phoneMap.get(original);
    if (existing !== undefined) return existing;
    const next = `${RESERVED_PREFIX}${String(phoneMap.size + 1).padStart(4, '0')}`;
    phoneMap.set(original, next);
    stats.phones += 1;
    return next;
  };

  // WHY wamids are rewritten, not preserved: real Cloud API message ids
  // BASE64-EMBED the counterpart's phone number (wamid.HBgM<base64(91…)>…) —
  // an un-rewritten wamid commits real PII the +91 grep can never see.
  // Deterministic mapping keeps cross-references (statuses citing the same
  // id) intact within a capture.
  const reserveWamid = (original: string): string => {
    const existing = wamidMap.get(original);
    if (existing !== undefined) return existing;
    const next = `wamid.SCRUBBED-${String(wamidMap.size + 1).padStart(4, '0')}`;
    wamidMap.set(original, next);
    stats.wamids += 1;
    return next;
  };

  const walk = (node: unknown, parentKey: string | undefined): unknown => {
    if (Array.isArray(node)) return node.map((item) => walk(item, parentKey));
    if (node !== null && typeof node === 'object') {
      return Object.fromEntries(
        Object.entries(node as Record<string, unknown>).map(([key, child]) => {
          if (typeof child === 'string') {
            if (child.startsWith('wamid.')) return [key, reserveWamid(child)];
            if (PHONE_KEYS.has(key)) return [key, reserve(child)];
            if (BODY_KEYS.has(key)) {
              stats.bodies += 1;
              return [key, LOREM];
            }
            if (key === NAME_KEY && parentKey === 'profile') {
              stats.names += 1;
              return [key, `Test Guest ${stats.names}`];
            }
            // Pure-digit strings under other keys are ids/timestamps (wamid
            // parts, phone_number_id, unix seconds) — not free text; phones
            // ride the PHONE_KEYS above. Rewriting them would break fixtures.
            if (/^\d+$/.test(child)) return [key, child];
            // Free-text field that may still embed a number (error details,
            // addresses): blank any phone-shaped digit run.
            return [key, child.replace(INLINE_PHONE, () => reserve('inline'))];
          }
          return [key, walk(child, key)];
        }),
      );
    }
    return node;
  };

  return { scrubbed: walk(value, undefined), stats };
}

async function main(): Promise<void> {
  const { readFile, writeFile } = await import('node:fs/promises');
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('usage: tsx scripts/fixture-scrub.ts <fixture.json...>');
    process.exit(1);
  }
  for (const file of files) {
    const parsed: unknown = JSON.parse(await readFile(file, 'utf8'));
    const { scrubbed, stats } = scrubFixture(parsed);
    await writeFile(file, `${JSON.stringify(scrubbed, null, 2)}\n`, 'utf8');
    console.log(
      `${file}: ${stats.phones} phone(s), ${stats.bodies} body(ies), ` +
        `${stats.names} name(s), ${stats.wamids} wamid(s) scrubbed`,
    );
  }
}

// Run only when executed directly — tests import scrubFixture without side effects.
if (process.argv[1]?.endsWith('fixture-scrub.ts') === true) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
