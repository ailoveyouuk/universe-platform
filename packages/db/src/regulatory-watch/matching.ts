import type { WatchItemInput } from "./types";

/**
 * Deterministic-first matching of watch items to catalogue variants (Product Database step 4b). ADVISORY: a match only creates a
 * pending flag for platform staff to confirm; nothing is blocked automatically. Identifier matches (GTIN, UDI-DI, NDC, part
 * number appearing in the item's product/code text) score 0.9+; name matches need the generic (INN) or brand name AND the
 * strength to appear, and score 0.6; a name alone is too weak to store.
 */
export interface MatchableProduct {
  id: string;
  name: string;
  inn: string | null;
  brand: string | null;
  strength: string | null;
  /** Every identifier value held for the product: GTINs, UDI-DIs, NDCs, part numbers. */
  identifiers: string[];
}

export interface ProductMatchCandidate {
  productMasterId: string;
  confidence: number;
  matchBasis: "IDENTIFIER" | "NAME";
  matchDetail: string;
}

export interface ProductIndex {
  byIdentifier: Map<string, string[]>;
  nameEntries: { id: string; term: string; strength: string | null; re: RegExp }[];
}

const MIN_ID_LEN = 8;
const MIN_NAME_LEN = 5;

/** Uppercase, strip separators, and drop leading zeros from all-digit values so GTIN-13/14 and NDC formats line up. */
export function normaliseIdentifier(v: string): string {
  const s = v.toUpperCase().replace(/[^0-9A-Z]/g, "");
  return /^\d+$/.test(s) ? s.replace(/^0+/, "") : s;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const squash = (s: string) => s.toLowerCase().replace(/\s+/g, "");

export function buildProductIndex(products: MatchableProduct[]): ProductIndex {
  const byIdentifier = new Map<string, string[]>();
  const nameEntries: ProductIndex["nameEntries"] = [];
  for (const p of products) {
    for (const raw of p.identifiers) {
      const n = normaliseIdentifier(raw);
      if (n.length < MIN_ID_LEN) continue;
      const list = byIdentifier.get(n) ?? [];
      if (!list.includes(p.id)) list.push(p.id);
      byIdentifier.set(n, list);
    }
    for (const term of new Set([p.inn, p.brand].filter((t): t is string => !!t && t.trim().length >= MIN_NAME_LEN).map((t) => t.trim()))) {
      nameEntries.push({ id: p.id, term, strength: p.strength, re: new RegExp(`\\b${escapeRe(term.toLowerCase())}\\b`) });
    }
  }
  return { byIdentifier, nameEntries };
}

export function matchItem(item: Pick<WatchItemInput, "title" | "summary" | "affectedText">, index: ProductIndex, maxMatches = 20): ProductMatchCandidate[] {
  const text = `${item.affectedText ?? ""} ${item.title}`;
  const found = new Map<string, ProductMatchCandidate>();
  // Identifier tokens: runs of letters/digits/hyphens of at least eight characters.
  for (const tok of text.toUpperCase().match(/[0-9A-Z][0-9A-Z-]{6,}[0-9A-Z]/g) ?? []) {
    const ids = index.byIdentifier.get(normaliseIdentifier(tok));
    if (!ids) continue;
    for (const id of ids) found.set(id, { productMasterId: id, confidence: 0.95, matchBasis: "IDENTIFIER", matchDetail: `Identifier ${tok} appears in the notice` });
  }
  const lower = text.toLowerCase();
  const squashed = squash(text);
  for (const e of index.nameEntries) {
    if (found.has(e.id) || !e.re.test(lower)) continue;
    if (e.strength && squashed.includes(squash(e.strength))) found.set(e.id, { productMasterId: e.id, confidence: 0.6, matchBasis: "NAME", matchDetail: `"${e.term}" and strength ${e.strength} appear in the notice` });
  }
  return [...found.values()].sort((a, b) => b.confidence - a.confidence).slice(0, maxMatches);
}
