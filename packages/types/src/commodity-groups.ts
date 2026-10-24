/**
 * Commodity groups: the coarse tag on a project line (ProjectLine.productCategory), which also becomes the commodity group of the
 * anonymised logistics and CO2 benchmarks. Six original groups plus eight added on 2026-10-24 to follow the new catalogue groups.
 * (Stored as plain strings, so adding a value needs no migration.) Catalogue product groups are a separate, finer list: see supplier-scope.ts.
 */
export const COMMODITY_GROUPS = [
  "CONSUMABLES", "DEVICES", "REAGENTS", "EQUIPMENT", "PHARMACEUTICALS", "LABORATORY",
  "REPRODUCTIVE_HEALTH", "NUTRITION", "VECTOR_CONTROL", "WASH", "IMMUNISATION", "KITS", "SHELTER", "FIELD_MEDICAL",
] as const;
export type CommodityGroup = (typeof COMMODITY_GROUPS)[number];

export const COMMODITY_GROUP_LABEL: Record<CommodityGroup, string> = {
  CONSUMABLES: "Consumables", DEVICES: "Devices", REAGENTS: "Reagents", EQUIPMENT: "Equipment", PHARMACEUTICALS: "Pharmaceuticals", LABORATORY: "Laboratory",
  REPRODUCTIVE_HEALTH: "Reproductive health", NUTRITION: "Nutrition", VECTOR_CONTROL: "Vector control", WASH: "Water, sanitation and hygiene",
  IMMUNISATION: "Immunisation", KITS: "Kits and emergency supplies", SHELTER: "Shelter and household items", FIELD_MEDICAL: "Field and military medical",
};

/** A readable label for a stored commodity group; an unknown value is shown as it is. */
export function commodityGroupLabel(value: string | null | undefined): string {
  if (!value) return "";
  return (COMMODITY_GROUP_LABEL as Record<string, string>)[value] ?? value;
}
