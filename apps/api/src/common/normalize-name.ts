/** Lowercases and strips common legal suffixes/punctuation. Shared between
 * PartnersService (Partner.normalizedName) and StakeholderRegistryService
 * (StakeholderRegistryEntry.normalizedName) — both need the exact same
 * normalization for name-based matching to actually line up between a
 * tenant's own Partner record and the shared registry entry it's matched
 * against. Originally lived only in partners.service.ts; pulled out here
 * 2026-10-02 when the registry needed the identical logic. Deliberately
 * simple; not meant to be a full normalization library.
 */
export function normalizeStakeholderName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\b(inc|ltd|llc|limited|corp|corporation|gmbh|plc)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
