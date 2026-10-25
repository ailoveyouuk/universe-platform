import { MINIMUM_COHORT_SIZE } from "@universe/insights-db";
import type { InsightsReferenceCountry } from "@universe/types";

/**
 * Builds the per-country reference counts for the Insights map layers from three plain tallies. A country's figure is kept only when at least the
 * minimum number of items stand behind it, so a single entry can never be picked out; a country with no figure above the floor is left out entirely.
 */
export function referenceCountries(restrictions: Map<string, number>, registrations: Map<string, number>, notices: Map<string, number>): InsightsReferenceCountry[] {
  const keep = (m: Map<string, number>, c: string) => { const n = m.get(c) ?? 0; return n >= MINIMUM_COHORT_SIZE ? n : 0; };
  const codes = new Set([...restrictions.keys(), ...registrations.keys(), ...notices.keys()]);
  return [...codes].map((countryCode) => ({ countryCode, exportRestrictions: keep(restrictions, countryCode), registrations: keep(registrations, countryCode), safetyNotices: keep(notices, countryCode) }))
    .filter((r) => r.exportRestrictions + r.registrations + r.safetyNotices > 0)
    .sort((a, b) => a.countryCode.localeCompare(b.countryCode));
}

/** Country codes in a notice's comma-separated list (empty means worldwide, which is not tied to a country and so is not counted). */
export function noticeCountries(list: string | null): string[] {
  return (list ?? "").split(",").map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c));
}
