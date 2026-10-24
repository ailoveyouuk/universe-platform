import type { NetworkSearchCriteria } from "@universe/types";

/** What a saved supplier search is matched against: one published organisation, with only valid (unexpired) certifications. */
export interface NetworkSubject {
  name: string; type: string; /** Every role held; falls back to type. */ types?: string[]; description: string | null; principalManufacturers: string | null;
  scope: string[]; countryCodes: string[]; certificationTypes: string[];
  whoPrequalified: boolean; localManufacturer: boolean; yearsInOperation: number | null; warehousing: string | null;
}

/** Same semantics as the Find suppliers filters: scope and country are "any of", certifications are "all of". */
export function matchesNetworkCriteria(c: NetworkSearchCriteria, o: NetworkSubject): boolean {
  const q = c.q?.trim().toLowerCase();
  if (q && ![o.name, o.description, o.principalManufacturers].some((v) => (v ?? "").toLowerCase().includes(q))) return false;
  if (c.type && !(o.types?.length ? o.types : [o.type]).includes(c.type)) return false;
  if (c.scope?.length && !c.scope.some((s) => o.scope.includes(s))) return false;
  if (c.country?.length && !c.country.some((s) => o.countryCodes.includes(s.toUpperCase()))) return false;
  if (c.certType?.length && !c.certType.every((t) => o.certificationTypes.includes(t))) return false;
  if (c.certified && o.certificationTypes.length === 0) return false;
  if (c.whoPq && !o.whoPrequalified) return false;
  if (c.localMfr && !o.localManufacturer) return false;
  if (c.minYears && (o.yearsInOperation ?? 0) < c.minYears) return false;
  if (c.warehousing && o.warehousing !== c.warehousing) return false;
  return true;
}

export function isEmptyCriteria(c: NetworkSearchCriteria): boolean {
  return !c.q?.trim() && !c.type && !c.scope?.length && !c.country?.length && !c.certType?.length && !c.certified && !c.whoPq && !c.localMfr && !c.minYears && !c.warehousing;
}
