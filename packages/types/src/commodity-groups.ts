/**
 * Commodity groups: the coarse tag on a project line (ProjectLine.productCategory), which also becomes the commodity group of the
 * anonymised logistics and CO2 benchmarks. Six original groups plus eight added on 2026-10-24 to follow the new catalogue groups.
 * (Stored as plain strings, so adding a value needs no migration.) Catalogue product groups are a separate, finer list: see supplier-scope.ts.
 */
export const COMMODITY_GROUPS = [
  "CONSUMABLES", "DEVICES", "REAGENTS", "EQUIPMENT", "PHARMACEUTICALS", "LABORATORY",
  "REPRODUCTIVE_HEALTH", "NUTRITION", "VECTOR_CONTROL", "WASH", "IMMUNISATION", "KITS", "SHELTER", "FIELD_MEDICAL", "LOGISTICS_SERVICES",
] as const;
export type CommodityGroup = (typeof COMMODITY_GROUPS)[number];

export const COMMODITY_GROUP_LABEL: Record<CommodityGroup, string> = {
  CONSUMABLES: "Consumables", DEVICES: "Devices", REAGENTS: "Reagents", EQUIPMENT: "Equipment", PHARMACEUTICALS: "Pharmaceuticals", LABORATORY: "Laboratory",
  REPRODUCTIVE_HEALTH: "Reproductive health", NUTRITION: "Nutrition", VECTOR_CONTROL: "Vector control", WASH: "Water, sanitation and hygiene",
  IMMUNISATION: "Immunisation", KITS: "Kits and emergency supplies", SHELTER: "Shelter and household items", FIELD_MEDICAL: "Field and military medical", LOGISTICS_SERVICES: "Logistics and services (packaging)",
};

/**
 * Older rows hold a commodity group as a title-case word ("Pharmaceuticals") rather than the code ("PHARMACEUTICALS"). This returns the code when the
 * value is one of ours in any case or spelling, and the value unchanged otherwise (so a real extra group such as "Imaging" stays as it is).
 */
export function canonicalCommodityGroup(value: string | null | undefined): string | null {
  if (!value) return null;
  const code = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return (COMMODITY_GROUPS as readonly string[]).includes(code) ? code : value;
}

/** A readable label for a stored commodity group; an unknown value is shown as it is. */
export function commodityGroupLabel(value: string | null | undefined): string {
  if (!value) return "";
  return (COMMODITY_GROUP_LABEL as Record<string, string>)[value] ?? value;
}

/**
 * The catalogue group a commodity group corresponds to, where there is exactly one. The six original commodity groups are coarse and span several
 * catalogue groups, so they map to nothing (no filter). Used to narrow the catalogue search on a project line; the two lists are otherwise unrelated.
 */
const CATALOGUE_GROUP_FOR_COMMODITY: Record<string, string> = {
  PHARMACEUTICALS: "Pharmaceuticals", REPRODUCTIVE_HEALTH: "Reproductive Health", NUTRITION: "Nutrition", VECTOR_CONTROL: "Vector Control",
  WASH: "Water, Sanitation and Hygiene", IMMUNISATION: "Immunisation", KITS: "Kits and Emergency Supplies", SHELTER: "Shelter and Household Items",
  FIELD_MEDICAL: "Field and Military Medical", LOGISTICS_SERVICES: "Logistics and Services",
};
export function catalogueGroupForCommodity(value: string | null | undefined): string | undefined {
  return value ? CATALOGUE_GROUP_FOR_COMMODITY[value] : undefined;
}
