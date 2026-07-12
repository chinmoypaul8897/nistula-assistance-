/**
 * Register & language detection (plan.md CH-09 step 4) — pure leaf, cheap
 * heuristics, NO model call. Runs after each guest turn on the batch text;
 * the caller writes guests.register_pref/lang_pref only on a POSITIVE signal
 * (latest signal wins — guests drift; a neutral batch never flips a pref).
 *
 * Deliberate boundaries:
 *  - A bare "hi" is not warmth and emoji are not informality (a folded-hands
 *    emoji is FORMAL Indian courtesy) — warm needs an explicitly casual word
 *    with no formal marker beside it; formal wins a mixed batch.
 *  - The Hinglish list holds only unambiguous Latin-script Hindi tokens —
 *    collisions with English words (do, to, ho, ka, se) are excluded, so a
 *    false hinglish flip needs several genuinely Hindi words, not one "ok".
 *  - Devanagari (or any non-Latin) text yields no Latin tokens → no signal;
 *    per-guest language beyond English/Hinglish is out of v1 (plan §11 F4).
 */

export type RegisterSignal = 'formal_sir_maam' | 'warm_first_name';
export type LangSignal = 'en' | 'hinglish';

const FORMAL_DIRECT = /\b(?:sir|ma'?am|madam)\b/i;
const FORMAL_MARKERS: readonly RegExp[] = [
  /\bkindly\b/i,
  /\bplease\s+advise\b/i,
  /\brespected\b/i,
  /\b(?:warm\s+)?regards\b/i,
  /\bmay\s+i\s+request\b/i,
];
const WARM_WORDS = /\b(?:hey|bro|yaar|dude|buddy|hiya)\b/i;

/** Formal on sir/ma'am or ≥2 formal markers; warm only on a casual word with
 * zero formal signal in the same batch. Null = nothing conclusive. */
export function detectRegister(texts: readonly string[]): RegisterSignal | null {
  const joined = texts.join(' ');
  if (joined.trim() === '') return null;
  const formalMarkers = FORMAL_MARKERS.filter((re) => re.test(joined)).length;
  if (FORMAL_DIRECT.test(joined) || formalMarkers >= 2) return 'formal_sir_maam';
  if (formalMarkers === 0 && WARM_WORDS.test(joined)) return 'warm_first_name';
  return null;
}

// Unambiguous Latin-script Hindi tokens (see module header for exclusions).
const HINGLISH_TOKENS = new Set([
  'hai', 'hain', 'tha', 'thi', 'nahi', 'nahin', 'kya', 'kaise', 'kaisa', 'kitna', 'kitne',
  'accha', 'acha', 'theek', 'thik', 'bhai', 'yaar', 'chahiye', 'milega', 'milegi', 'hoga',
  'hogi', 'karna', 'karo', 'karenge', 'batao', 'bataiye', 'aap', 'aapka', 'aapke', 'hum',
  'humein', 'mera', 'meri', 'mere', 'apna', 'apni', 'wala', 'wali', 'bahut', 'bohot',
  'thoda', 'abhi', 'aaj', 'jaldi', 'shukriya', 'dhanyavaad', 'namaste', 'chalega',
  'kripya', 'paisa', 'paise', 'pani', 'kamra', 'aur', 'lekin', 'magar', 'kyunki',
  'kab', 'kahan', 'kaun', 'kuch', 'sab', 'bilkul', 'zaroor', 'haan',
]);

const MIN_TOKENS_HINGLISH = 4;
const MIN_TOKENS_EN = 6;
const HINGLISH_RATIO = 0.15;

/** Hinglish on ratio ≥ 0.15 over ≥4 tokens; en only when a ≥6-token batch has
 * ZERO Hindi tokens (so a short "ok" can never flip a Hinglish guest back). */
export function detectLang(texts: readonly string[]): LangSignal | null {
  const tokens = texts
    .join(' ')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t !== '');
  if (tokens.length === 0) return null;
  const hindi = tokens.filter((t) => HINGLISH_TOKENS.has(t)).length;
  if (tokens.length >= MIN_TOKENS_HINGLISH && hindi / tokens.length >= HINGLISH_RATIO) {
    return 'hinglish';
  }
  if (tokens.length >= MIN_TOKENS_EN && hindi === 0) return 'en';
  return null;
}
