import { categoryAccent, type CrmCategoryKey } from "@universe/types";

/** The accent for each kind of stakeholder (tokens in packages/ui/src/tokens.css). Order is the order a multi-role stakeholder is led by. */
export const CATEGORY_ORDER: CrmCategoryKey[] = ["MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "LOGISTICS", "WAREHOUSING", "TENDERING_PURCHASING_BODY", "PROCUREMENT_SERVICE_AGENT", "FUNDER_DONOR", "CLIENT"];
const TOKEN = (k: CrmCategoryKey) => categoryAccent(k) ?? "--u-cat-client";

export function primaryCategory(keys: string[]): CrmCategoryKey | null {
  return CATEGORY_ORDER.find((k) => keys.includes(k)) ?? null;
}
/** A thin coloured edge and a very light wash; the text keeps the normal ink colour on top, so contrast does not depend on the accent. */
export function accentStyle(keys: string[]): React.CSSProperties {
  const k = primaryCategory(keys);
  if (!k) return {};
  const c = `var(${TOKEN(k)})`;
  return { borderLeft: `4px solid ${c}`, backgroundImage: `linear-gradient(100deg, color-mix(in srgb, ${c} 11%, transparent) 0%, transparent 70%)` };
}
export const accentVar = (k: CrmCategoryKey) => `var(${TOKEN(k)})`;
