/**
 * Villa identity map + resolver (plan.md §5.4, CH-05 step 1). The map is the
 * verified website/eZee constant: `villaId` = the website villa id = the eZee
 * physical RoomID. `resolveVilla` turns whatever a guest types ("Apartment 11",
 * "apartment", "solim", "3bhk", "B3") into a concrete villa, a type SET the
 * model must disambiguate, a RETIRED product, or nothing — fuzzy but fully
 * DETERMINISTIC (no Math.random, no locale-dependent ops) so the same input
 * always resolves the same way and the resolution is unit-testable as a table.
 *
 * WHY unit beats type: bookings are held at TYPE level (eZee assigns the unit),
 * but a guest naming a specific unit wants that unit — so an explicit unit alias
 * always wins over a bare type word. A multi-unit type ("apartment") stays
 * ambiguous on purpose: the model asks or quotes each, never guesses.
 *
 * 🚨 RETIRED INVENTORY (2026-07-24). The three-bedroom Assagao villas
 * (Villa B1/B3/C1/C3, the "Nistula Villa" type) are no longer part of Nistula —
 * the contract ended and they were removed from eZee. Their rows are gone from
 * VILLAS, so nothing may be sold, priced or named for a guest. But their NAMES
 * still RESOLVE — to `retired`, never a `match` — for two reasons the removal
 * must not break: a guest may still ask for one (and deserves an honest answer,
 * not a crash or a fake sold-out), and a house-naming SAFETY screen
 * (namesPhysicalHouse) must still recognise "Villa B3" as a house. "What may we
 * SELL?" (loses them) and "does this text NAME a house?" (still yes) are two
 * different predicates — see namesPhysicalHouse.
 */

export type VillaTypeName = 'Nistula Apartment' | 'Nistula 4BHK Siolim';

export interface VillaOccupancy {
  /** Informational in CH-05 — the website /api/quote is the occupancy authority
   * (over-occupancy 400s there); refreshed from RoomTypeList in CH-06. */
  baseAdults: number | null;
  maxAdults: number;
  maxChildren: number;
}

export interface Villa {
  /** Canonical label, e.g. "Villa B3", "Apartment 11", "Siolim 4BHK". */
  label: string;
  /** 19-digit id: website villaId === eZee physical RoomID (§5.4). */
  villaId: string;
  /** eZee RoomTypeID — shared across units of one type. */
  roomTypeId: string;
  typeName: VillaTypeName;
  occupancy: VillaOccupancy;
}

const APT = 'Nistula Apartment' as const;
const SIOLIM = 'Nistula 4BHK Siolim' as const;

// §5.4 occupancy note: Apartment base 4/max 5+2c · Siolim max 8+6c.
const APT_OCC: VillaOccupancy = { baseAdults: 4, maxAdults: 5, maxChildren: 2 };
const SIOLIM_OCC: VillaOccupancy = { baseAdults: null, maxAdults: 8, maxChildren: 6 };

/** The four units we still let (plan.md §5.4; the three-bedroom Assagao villas
 * were retired 2026-07-24 — see the module header). ids share the
 * `5220300000000000` prefix. */
export const VILLAS: readonly Villa[] = [
  { label: 'Apartment 11', villaId: '5220300000000000001', roomTypeId: '5220300000000000001', typeName: APT, occupancy: APT_OCC },
  { label: 'Apartment 06', villaId: '5220300000000000008', roomTypeId: '5220300000000000001', typeName: APT, occupancy: APT_OCC },
  { label: 'Apartment 09', villaId: '5220300000000000010', roomTypeId: '5220300000000000001', typeName: APT, occupancy: APT_OCC },
  { label: 'Siolim 4BHK', villaId: '5220300000000000015', roomTypeId: '5220300000000000009', typeName: SIOLIM, occupancy: SIOLIM_OCC },
];

/** The labels of the retired three-bedroom Assagao villas. Kept ONLY so their
 * names still resolve `retired` and a house-naming screen still recognises them
 * — they are not sellable and carry no id, rate or occupancy. */
export const RETIRED_VILLA_LABELS: readonly string[] = ['Villa B1', 'Villa B3', 'Villa C1', 'Villa C3'];

export type VillaResolution =
  | { kind: 'match'; villa: Villa }
  /** A multi-unit type the model must disambiguate (or quote each of). */
  | { kind: 'ambiguous'; typeName: VillaTypeName; villas: Villa[] }
  /** A three-bedroom Assagao villa we no longer let — named, but not sellable. */
  | { kind: 'retired'; input: string }
  | { kind: 'none'; input: string };

/**
 * Lowercase; drop non-alphanumerics WITHOUT inserting a space (so "B-3" and
 * "b.3" glue to "b3", matching the "b3" alias) while whitespace still separates
 * tokens; collapse runs of whitespace. Deterministic.
 */
function normalise(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

// The retired three-bedroom Assagao villas, by their unit code. Checked FIRST
// (unit beats type) AND before apartment numbers, so the "1" in "b1" is never
// read as an apartment number. They resolve `retired`, never a match.
const RETIRED_UNIT_TOKENS = new Set(['b1', 'b3', 'c1', 'c3']);
// Apartment numbers, leading-zero folded (6 ≡ 06, 9 ≡ 09).
const APARTMENT_UNIT_BY_NUMBER: Record<string, string> = {
  '11': 'Apartment 11',
  '6': 'Apartment 06',
  '9': 'Apartment 09',
};

/** An explicit THREE-bedroom reference — "3bhk", "3 bhk", "3-bedroom", "3 br".
 * The bare word "villa" is deliberately NOT one: Siolim is a four-bedroom villa
 * and "villa" is the company's own noun, so only a three-bedroom cue resolves
 * to the retired type; "villa" alone falls through to `none`. */
const THREE_BED_JOINED = new Set(['3bhk', '3bedroom', '3br', 'threebhk', '3bed']);
function mentionsThreeBed(tokens: string[]): boolean {
  if (tokens.some((t) => THREE_BED_JOINED.has(t))) return true;
  for (let i = 0; i < tokens.length - 1; i++) {
    if (tokens[i] === '3' && ['bhk', 'bedroom', 'bedrooms', 'bed', 'br'].includes(tokens[i + 1]!)) {
      return true;
    }
  }
  return false;
}

function byLabel(label: string): Villa {
  const villa = VILLAS.find((v) => v.label === label);
  // Aliases reference the constant table above — a miss is a coding error.
  if (villa === undefined) throw new Error(`villa alias points at unknown label: ${label}`);
  return villa;
}

function villasOfType(typeName: VillaTypeName): Villa[] {
  return VILLAS.filter((v) => v.typeName === typeName);
}

/** Levenshtein distance, bounded use only (deterministic; small inputs). */
function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) dist[i]![0] = i;
  for (let j = 0; j < cols; j++) dist[0]![j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i]![j] = Math.min(dist[i - 1]![j]! + 1, dist[i]![j - 1]! + 1, dist[i - 1]![j - 1]! + cost);
    }
  }
  return dist[a.length]![b.length]!;
}

/** Typo tolerance CONFINED to "siolim" (edit distance ≤2) — fuzzing the generic
 * type words "villa"/"apartment" would collide, so only this token is fuzzed.
 * Length ≥5 excludes the real word "slim" (length 4, distance 2 from "siolim")
 * while keeping the intended typos "solim"/"sioli" (length 5, distance 1). */
function looksLikeSiolim(token: string): boolean {
  if (token.length < 5) return false;
  return editDistance(token, 'siolim') <= 2;
}

/**
 * Resolves free guest text to a villa, a type set, or nothing (§6.4 get_*
 * tools call this). Precedence: explicit unit > type word; a single-unit type
 * collapses to a match; a multi-unit type returns the set for the model to ask.
 */
export function resolveVilla(labelOrType: string): VillaResolution {
  const n = normalise(labelOrType);
  if (n === '') return { kind: 'none', input: labelOrType };
  const tokens = n.split(' ');

  // 1) Unit signal — RETIRED villa codes first (so "b1"'s "1" is never read as
  // an apartment number, and a retired house is never mistaken for a live one),
  // then live apartment numbers.
  for (const token of tokens) {
    if (RETIRED_UNIT_TOKENS.has(token)) return { kind: 'retired', input: labelOrType };
  }
  // A bare digit ("6") must NOT override a coexisting explicit villa/type word —
  // otherwise "villa 9 dec" (a date) or "a villa for 6 guests" (a headcount)
  // mis-resolves to an apartment (review finding). A PREFIXED form ("apt 9",
  // "a9", "apartment 06") is a genuine unit reference and always wins. Kept
  // referencing "villa"/"3bhk" though the villa TYPE is retired: the guard is
  // about a bare digit beside those words, which is still text a guest types.
  const hasVillaWord = tokens.includes('villa') || tokens.includes('3bhk');
  for (const token of tokens) {
    // An apartment number — bare ("11") or glued to a prefix ("a9", "apt06",
    // "apartment11"), leading zeros folded (06 ≡ 6). Villa units matched above,
    // so "b1"'s digit never reaches here.
    const m = /^(?:apartment|apt|a)?0*(\d+)$/.exec(token);
    const aptLabel = m ? APARTMENT_UNIT_BY_NUMBER[m[1]!] : undefined;
    if (aptLabel === undefined) continue;
    const bareDigit = /^\d/.test(token); // no apartment-word prefix
    if (bareDigit && hasVillaWord) continue; // let a real villa/type word win
    return { kind: 'match', villa: byLabel(aptLabel) };
  }

  // 2) Type signal (only if no unit matched).
  if (tokens.includes('4bhk') || tokens.some(looksLikeSiolim)) {
    return { kind: 'match', villa: villasOfType(SIOLIM)[0]! }; // single-unit type → match
  }
  // The three-bedroom villa TYPE is retired — but ONLY an explicit three-bedroom
  // cue resolves to it. Bare "villa" is not one (Siolim is a villa), so it falls
  // through to `none` and the tool asks which product the guest means.
  if (mentionsThreeBed(tokens)) {
    return { kind: 'retired', input: labelOrType };
  }
  if (tokens.some((t) => t === 'apartment' || t === 'apt' || t === 'studio')) {
    return { kind: 'ambiguous', typeName: APT, villas: villasOfType(APT) };
  }

  return { kind: 'none', input: labelOrType };
}

/** Does this eZee/mirror room-type string name the RETIRED three-bedroom villa
 * product? Used by the lifecycle marketing guard, which reads the stored type
 * STRING (a booking's room_type_name or a scheduled row's params), never the
 * live map. Precise: the two remaining types ("Nistula Apartment", "Nistula
 * 4BHK Siolim") do not match. */
export function isRetiredVillaType(villaType: string | null | undefined): boolean {
  if (villaType == null) return false;
  return /\bnistula\s+villa\b/i.test(villaType);
}

/** Reverse lookup for booking-awareness/mirror joins (CH-11). */
export function getVillaById(villaId: string): Villa | undefined {
  return VILLAS.find((v) => v.villaId === villaId);
}

/**
 * Does this text NAME a physical house, as opposed to a villa type? (CH-13a.)
 *
 * ONE definition, because two would drift, and this predicate guards two doors:
 * the guest-facing template `param` (a house may not reach a guest — OQ-15) and
 * `create_staff_task`'s summary screen (an unverified house may not compete
 * with the door we resolved from eZee).
 *
 * 🚨 REWRITTEN BY CH-13a's PRE-PUSH REVIEW, and the finding was humbling: this
 * function's own docstring said "guard by the CONTRACT, not a shape
 * enumeration" — and then enumerated a shape. `/\b(?:Apartment|Villa)\s*[A-Za-z]?\d/`
 * missed "apt 6", "villa b-3", "a9", "B3" and "the 06 apartment", every one of
 * which THIS REPO'S OWN RESOLVER maps to a real house. So the same chunk
 * decided "apt 6" IS a house (config.ts canonicalises the roster through
 * resolveVilla) and IS NOT a house name (this screen) — and a card could read
 * "Apartment 06 · Rahul · AC weak in villa b-3", which is two doors in
 * different buildings, with the guest's own guess the likelier one for a tired
 * housekeeper to act on.
 *
 * ─── The split this predicate needs, and why it is not just resolveVilla ────
 * The answer to "WHICH house is this?" already exists: `resolveVilla`. But it
 * cannot be the whole answer here, because it is deliberately LENIENT for its
 * own caller ("which villa does the guest mean?"): it maps a BARE digit to a
 * house. Handing it a task summary directly refuses the product —
 *   "6 towels please" → Apartment 06 · "9 am wake-up call" → Apartment 09
 *   "need 11 hangers" → Apartment 11 · "a taxi at 6"     → Apartment 06
 * — and bare "Siolim" resolves to Siolim 4BHK while being the LOCALITY every
 * confirmation template prints. The over-fire is as real a bug as the
 * under-fire (CH-11 learnt this when its first unit-guard rewrite blocked the
 * core pre-sales quote).
 *
 * So the two questions are split, each answered by whatever owns it:
 *  - SCOPE  ("is this text REFERRING to a house at all?") is this function's
 *    contract: a house reference is a type WORD bound to a unit token, or a
 *    unit-letter token — never a bare number, which is a count or a clock.
 *  - VOCABULARY ("does that span name a real house?") is delegated to
 *    `resolveVilla`, so the spellings can never drift from the roster's.
 *
 * NOT to be confused with stayGuards.scanUnitAssertions, which asks a different
 * question — "is the model BINDING a house to this guest?" — and deliberately
 * lets a bare mention through, because naming a house is how we sell.
 */
const HOUSE_SPAN = new RegExp(
  [
    // "Apartment 06", "apt 6", "apt6", "villa b-3", "Villa B3".
    // NOTE no \b after the word: "apt6" is one token, and a housekeeper writes
    // it. ("aptitude 6" cannot match — the digit must follow within one
    // optional letter.)
    String.raw`\b(?:apartments?|apts?|villas?)[\s.\-#:]*[a-z]?-?\d{1,2}\b`,
    // "the 06 apartment" — the same reference, written backwards.
    String.raw`\b\d{1,2}\s*(?:apartments?|apts?|villas?)\b`,
    // Our label for the one Siolim house. Deliberately NOT bare "4BHK" and NOT
    // bare "Siolim": the latter is the LOCALITY every confirmation template
    // prints, and eZee's own type name ("Nistula 4BHK Siolim") must stay
    // sayable to a guest.
    String.raw`\bsiolim[\s.\-#:]*4\s*bhk\b`,
    // A bare unit-letter token: "B3", "a9", "c-1". A bare NUMBER is excluded on
    // purpose — that is the whole point of the scope half.
    String.raw`\b[abc]-?\d{1,2}\b`,
  ].join('|'),
  'gi',
);

export function namesPhysicalHouse(text: string): boolean {
  const spans = text.match(HOUSE_SPAN);
  if (spans === null) return false;
  // A span is a house only if the resolver says so — an unknown "a1" or
  // "villa 99" names nothing, and a TYPE ("the apartment") resolves ambiguous.
  return spans.some((span) => {
    const kind = resolveVilla(span).kind;
    // A RETIRED house (Villa B1/B3/C1/C3) still NAMES a house — this screen
    // stops a house reaching a guest-facing template or competing with the door
    // on a staff card, and that must keep firing for a retired name too. "What
    // may we sell?" lost these; "does this text name a house?" did not.
    if (kind === 'match' || kind === 'retired') return true;
    // 🚨 THE ROUND-3 GAP. "villa 11" / "villa 9" / "villa 6" resolve AMBIGUOUS,
    // not match — resolveVilla protects FREE TEXT from "a villa for 6 guests"
    // and "villa 9 dec" (a date) by refusing a bare digit that sits beside the
    // word "villa". But HOUSE_SPAN already required the digit BOUND to the word
    // ("villa" + optional letter + digit, no "for" between), so this span IS a
    // unit reference and that free-text guard is the wrong one to apply to it.
    // The round-1 rewrite from a shape-regex to the resolver LOST these — the
    // old `/\b(?:Apartment|Villa)\s*[A-Za-z]?\d/i` caught them — and they gate
    // BOTH the staff-card summary (GATE 2) and the guest-facing template param.
    // Re-resolve the BARE unit number: "villa 11" → "11" → Apartment 11, a real
    // house; "villa 99" → "99" → no unit → still not a house. Failing toward
    // "this is a house" is the safe direction for a house-NAMING screen.
    //
    // 🚨 ONLY for a span carrying a villa/apartment WORD (round 4). A bare
    // unit-code span like "B9" or "C11" is judged correctly by resolveVilla
    // already (B3 → match, B9 → none — there is no Villa B9), so stripping its
    // letter to re-resolve the digit — "B9" → "9" → Apartment 09 — would invent
    // a house out of "seat B9" / "gate C11". The word-plus-bare-digit form is
    // the only one resolveVilla downgrades to ambiguous, so it is the only one
    // that needs this fallback.
    if (!/\b(?:apartments?|apts?|villas?)\b/i.test(span)) return false;
    const digit = /\d{1,2}/.exec(span)?.[0];
    return digit !== undefined && resolveVilla(digit).kind === 'match';
  });
}

/** The canonical booking link to share (§5.1) — never build a booking ourselves. */
export function bookingUrl(websiteBaseUrl: string, villaId: string): string {
  return `${websiteBaseUrl.replace(/\/+$/, '')}/villas/${villaId}`;
}
