/**
 * Forgiving, electrical-domain-aware search matcher shared by the Component Library
 * and the Example Wirings selector. Supports case/punctuation insensitivity,
 * compound alphanumeric forms (e.g. "1p", "1-pole", "single pole"), electrical
 * synonyms (wye/star, rcd/rccb/gfci, aircon/ac), Unicode symbols (Φ -> phase,
 * Δ -> delta), and single-character typos on longer words.
 */

const SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ['1', 'one', 'single', '1p', 'sp'],
  ['2', 'two', 'double', '2p', 'dp'],
  ['3', 'three', 'triple', '3p', 'tp', '3ph'],
  ['4', 'four', 'quad', '4p'],
  ['pole', 'poles', 'p'],
  ['phase', 'phases', 'ph'],
  ['way', 'ways'],
  ['gang', 'gangs'],
  ['wye', 'star', 'y'],
  ['delta', 'd'],
  ['mcb', 'breaker', 'cb'],
  ['rcd', 'rccb', 'gfci', 'elcb'],
  ['rcbo', 'gfci'],
  ['tor', 'olr', 'overload'],
  ['ac', 'aircon', 'acu', 'hvac'],
  ['pe', 'earth', 'ground', 'gnd', 'egc'],
  ['jbox', 'junction', 'box'],
  ['pb', 'pushbutton', 'button'],
  ['vfd', 'vsd', 'inverter', 'drive'],
  ['ats', 'transfer', 'changeover'],
  ['spd', 'surge', 'arrester'],
  ['dol', 'direct'],
  ['lamp', 'light', 'bulb', 'pilot', 'indicator'],
  ['socket', 'outlet', 'receptacle', 'convenience'],
  ['marine', 'ship', 'vessel', '440v'],
  ['transformer', 'xfmr', 'trafo'],
  ['contactor', 'km'],
  ['timer', 'delay', 'tdr'],
  ['switch', 'sw'],
  ['motor', 'induction'],
];

const SYNONYM_LOOKUP: Map<string, Set<string>> = (() => {
  const map = new Map<string, Set<string>>();
  for (const group of SYNONYM_GROUPS) {
    for (const term of group) {
      let set = map.get(term);
      if (!set) {
        set = new Set<string>();
        map.set(term, set);
      }
      for (const peer of group) {
        set.add(peer);
      }
    }
  }
  return map;
})();

/**
 * Normalizes text by mapping common electrical symbols, removing diacritics,
 * lowercasing, and replacing punctuation/separators with single spaces.
 */
export function normalizeSearchText(input: string): string {
  return input
    .replace(/[Φφϕ]/g, ' phase ')
    .replace(/Δ/g, ' delta ')
    .replace(/[ΩΩ]/g, ' ohm ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Splits space-separated tokens and also expands digit<->letter compound boundaries
 * (e.g. "1p" -> ["1p", "1", "p"], "3ph" -> ["3ph", "3", "ph"], "1gang" -> ["1gang", "1", "gang"]).
 */
export function expandCompoundTokens(normalized: string): string[] {
  if (!normalized) return [];
  const rawTokens = normalized.split(' ').filter(Boolean);
  const result = new Set<string>();

  for (const token of rawTokens) {
    result.add(token);
    const parts = token.split(/(?<=\d)(?=[a-z])|(?<=[a-z])(?=\d)/).filter(Boolean);
    if (parts.length > 1) {
      for (const part of parts) {
        result.add(part);
      }
    }
  }

  return Array.from(result);
}

/**
 * Returns true if two strings differ by at most one edit (Damerau-Levenshtein <= 1):
 * one substitution, one insertion/deletion, or one adjacent character transposition.
 */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;

  if (la === lb) {
    let diffs = 0;
    let firstDiff = -1;
    let secondDiff = -1;
    for (let i = 0; i < la; i++) {
      if (a[i] !== b[i]) {
        diffs++;
        if (diffs === 1) firstDiff = i;
        else if (diffs === 2) secondDiff = i;
        else return false;
      }
    }
    if (diffs <= 1) return true;
    // Allow single adjacent transposition (e.g. "singe" / "snigle")
    return (
      secondDiff === firstDiff + 1 &&
      a[firstDiff] === b[secondDiff] &&
      a[secondDiff] === b[firstDiff]
    );
  }

  // Insertion / deletion of 1 char
  const shorter = la < lb ? a : b;
  const longer = la < lb ? b : a;
  let i = 0;
  let j = 0;
  let skipped = false;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i++;
      j++;
    } else {
      if (skipped) return false;
      skipped = true;
      j++;
    }
  }
  return true;
}

function tokenMatchesCandidate(
  queryToken: string,
  haystack: string,
  compactHaystack: string,
  candidateTokens: string[]
): boolean {
  if (!queryToken) return true;

  // Direct exact token match
  if (candidateTokens.includes(queryToken)) return true;

  // For tokens >= 2 chars, allow direct substring match in normalized/compact text
  if (queryToken.length >= 2) {
    if (haystack.includes(queryToken) || compactHaystack.includes(queryToken)) {
      return true;
    }
  }

  // Synonym expansion (bidirectional)
  const synonyms = SYNONYM_LOOKUP.get(queryToken);
  if (synonyms) {
    for (const syn of synonyms) {
      for (const cand of candidateTokens) {
        if (cand === syn) return true;
        if (syn.length >= 3 && cand.startsWith(syn)) return true;
      }
      // Multi-char synonym substring match (e.g. "aircon" -> "air conditioning" after compact? covered above)
      if (syn.length >= 3 && (haystack.includes(syn) || compactHaystack.includes(syn))) {
        return true;
      }
    }
  }

  // Fuzzy 1-edit typo tolerance for longer tokens (>= 4 chars)
  if (queryToken.length >= 4) {
    for (const cand of candidateTokens) {
      if (cand.length < 4) continue;
      if (withinOneEdit(queryToken, cand)) return true;
      // Prefix fuzzy match for longer words (e.g. "contctor" -> "contactor", "marin" -> "marine")
      if (cand.length > queryToken.length && queryToken.length >= 4) {
        const candPrefix = cand.slice(0, queryToken.length);
        if (withinOneEdit(queryToken, candPrefix)) return true;
      }
    }
  }

  return false;
}

/**
 * Matches a search query against a list of text fields using punctuation-insensitive,
 * synonym-aware, and single-typo-tolerant matching. Every token in the query must match.
 */
export function matchesSmartSearch(
  rawQuery: string,
  fields: Array<string | undefined | null>
): boolean {
  const normQuery = normalizeSearchText(rawQuery);
  if (!normQuery) return true;

  const combinedRaw = fields.filter((f): f is string => typeof f === 'string' && f.trim().length > 0).join(' ');
  const haystack = normalizeSearchText(combinedRaw);
  if (!haystack) return false;

  const compactQuery = normQuery.replace(/ /g, '');
  const compactHaystack = haystack.replace(/ /g, '');
  if (compactQuery.length >= 2 && compactHaystack.includes(compactQuery)) {
    return true;
  }

  const candidateTokens = expandCompoundTokens(haystack);
  const queryWords = normQuery.split(' ').filter(Boolean);

  for (const word of queryWords) {
    if (tokenMatchesCandidate(word, haystack, compactHaystack, candidateTokens)) {
      continue;
    }

    // If word is compound alphanumeric (e.g. "1p", "3ph", "2pole", "440v"),
    // allow it to match when every sub-part matches individually.
    const subParts = word.split(/(?<=\d)(?=[a-z])|(?<=[a-z])(?=\d)/).filter(Boolean);
    if (
      subParts.length > 1 &&
      subParts.every((part) => tokenMatchesCandidate(part, haystack, compactHaystack, candidateTokens))
    ) {
      continue;
    }

    return false;
  }

  return true;
}
