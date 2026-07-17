/**
 * Villa identity map + resolver (plan.md §5.4, CH-05 step 1). The map is the
 * verified website/eZee constant: `villaId` = the website villa id = the eZee
 * physical RoomID. `resolveVilla` turns whatever a guest types ("B3", "3bhk",
 * "apartment", "solim") into a concrete villa, a type SET the model must
 * disambiguate, or nothing — fuzzy but fully DETERMINISTIC (no Math.random, no
 * locale-dependent ops) so the same input always resolves the same way and the
 * resolution is unit-testable as a table.
 *
 * WHY unit beats type: bookings are held at TYPE level (eZee assigns the unit),
 * but a guest naming a specific unit ("B3") wants that unit — so an explicit
 * unit alias always wins over a bare type word. A multi-unit type ("villa")
 * stays ambiguous on purpose: the model asks or quotes each, never guesses.
 */

export type VillaTypeName = 'Nistula Apartment' | 'Nistula Villa' | 'Nistula 4BHK Siolim';

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
const VILLA = 'Nistula Villa' as const;
const SIOLIM = 'Nistula 4BHK Siolim' as const;

// §5.4 occupancy note: Apartment base 4/max 5+2c · Villa base 6/max 7+4c · Siolim max 8+6c.
const APT_OCC: VillaOccupancy = { baseAdults: 4, maxAdults: 5, maxChildren: 2 };
const VILLA_OCC: VillaOccupancy = { baseAdults: 6, maxAdults: 7, maxChildren: 4 };
const SIOLIM_OCC: VillaOccupancy = { baseAdults: null, maxAdults: 8, maxChildren: 6 };

/** The eight units (plan.md §5.4). ids share the `5220300000000000` prefix. */
export const VILLAS: readonly Villa[] = [
  { label: 'Apartment 11', villaId: '5220300000000000001', roomTypeId: '5220300000000000001', typeName: APT, occupancy: APT_OCC },
  { label: 'Apartment 06', villaId: '5220300000000000008', roomTypeId: '5220300000000000001', typeName: APT, occupancy: APT_OCC },
  { label: 'Apartment 09', villaId: '5220300000000000010', roomTypeId: '5220300000000000001', typeName: APT, occupancy: APT_OCC },
  { label: 'Villa B1', villaId: '5220300000000000002', roomTypeId: '5220300000000000003', typeName: VILLA, occupancy: VILLA_OCC },
  { label: 'Villa B3', villaId: '5220300000000000011', roomTypeId: '5220300000000000003', typeName: VILLA, occupancy: VILLA_OCC },
  { label: 'Villa C1', villaId: '5220300000000000012', roomTypeId: '5220300000000000003', typeName: VILLA, occupancy: VILLA_OCC },
  { label: 'Villa C3', villaId: '5220300000000000013', roomTypeId: '5220300000000000003', typeName: VILLA, occupancy: VILLA_OCC },
  { label: 'Siolim 4BHK', villaId: '5220300000000000015', roomTypeId: '5220300000000000009', typeName: SIOLIM, occupancy: SIOLIM_OCC },
];

export type VillaResolution =
  | { kind: 'match'; villa: Villa }
  /** A multi-unit type the model must disambiguate (or quote each of). */
  | { kind: 'ambiguous'; typeName: VillaTypeName; villas: Villa[] }
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

// Explicit per-unit aliases (checked FIRST, so unit beats type). Villa units
// are matched before apartment numbers so the "1" in "b1" is never read as an
// apartment number.
const VILLA_UNIT_ALIASES: Record<string, string> = {
  b1: 'Villa B1',
  b3: 'Villa B3',
  c1: 'Villa C1',
  c3: 'Villa C3',
};
// Apartment numbers, leading-zero folded (6 ≡ 06, 9 ≡ 09).
const APARTMENT_UNIT_BY_NUMBER: Record<string, string> = {
  '11': 'Apartment 11',
  '6': 'Apartment 06',
  '9': 'Apartment 09',
};

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

  // 1) Unit signal — villa units first, then apartment numbers.
  for (const token of tokens) {
    const villaLabel = VILLA_UNIT_ALIASES[token];
    if (villaLabel !== undefined) return { kind: 'match', villa: byLabel(villaLabel) };
  }
  // A bare digit ("6") must NOT override a coexisting explicit villa/type word —
  // otherwise "villa 9 dec" (a date) or "a villa for 6 guests" (a headcount)
  // mis-resolves to an apartment (review finding). A PREFIXED form ("apt 9",
  // "a9", "apartment 06") is a genuine unit reference and always wins.
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
  if (tokens.includes('villa') || tokens.includes('3bhk')) {
    return { kind: 'ambiguous', typeName: VILLA, villas: villasOfType(VILLA) };
  }
  if (tokens.some((t) => t === 'apartment' || t === 'apt' || t === 'studio')) {
    return { kind: 'ambiguous', typeName: APT, villas: villasOfType(APT) };
  }

  return { kind: 'none', input: labelOrType };
}

/** Reverse lookup for booking-awareness/mirror joins (CH-11). */
export function getVillaById(villaId: string): Villa | undefined {
  return VILLAS.find((v) => v.villaId === villaId);
}

/**
 * Does this text NAME a physical house, as opposed to a villa type? (CH-13a.)
 *
 * ONE definition, because two would drift and this predicate now guards two
 * different doors: the guest-facing template `param` (a house may not reach a
 * guest — OQ-15) and `create_staff_task`'s summary screen (an unverified house
 * may not compete with the door we resolved from eZee). They ask the same
 * question and must never answer it differently.
 *
 * Guard by the CONTRACT, not a shape enumeration: a villa TYPE is a bare word
 * ("Nistula Apartment", "Nistula Villa") — a HOUSE is that word followed by a
 * number, optionally via a letter ("Apartment 06", "Apartment 11", "Villa B3").
 * An earlier `0?\d|[BC]\d` enumeration missed "Apartment 11", a REAL house,
 * because 0? matched empty and the trailing digit broke \b.
 *
 * NOT to be confused with stayGuards.scanUnitAssertions, which asks a different
 * question — "is the model BINDING a house to this guest?" — and deliberately
 * lets a bare mention through, because naming a house is how we sell.
 */
export function namesPhysicalHouse(text: string): boolean {
  return /\b(?:Apartment|Villa)\s*[A-Za-z]?\d/i.test(text) || /\bSiolim 4BHK\b/i.test(text);
}

/** The canonical booking link to share (§5.1) — never build a booking ourselves. */
export function bookingUrl(websiteBaseUrl: string, villaId: string): string {
  return `${websiteBaseUrl.replace(/\/+$/, '')}/villas/${villaId}`;
}
