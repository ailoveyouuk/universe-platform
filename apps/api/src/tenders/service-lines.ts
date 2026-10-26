import { SERVICE_CATEGORIES, scopeSubForServiceCategory, serviceCatalogueByCode } from "@universe/types";

/** Finds a catalogue service by code; the database-backed lookup in production, the built-in list when none is given (tests). */
export type CatalogueLookup = (code: string) => { category: string } | undefined;

/**
 * Service tender lines (2026-10-25). A service line has no catalogue product, so it takes its place in matching from its service category:
 * the category path "Services.<group>" for category filters and saved searches, and the Services scope subcategory for suppliers that
 * declared they offer it. Goods lines keep matching through their catalogue product.
 */
export interface ServiceLineFields { serviceCategory?: string | null; servicePricingBasis?: string | null; serviceCode?: string | null; productMasterId?: string | null }

export const isServiceLine = (l: ServiceLineFields) => !!l.serviceCategory;
export const serviceCategoryPath = (code: string): string | null => {
  const c = SERVICE_CATEGORIES.find((x) => x.code === code);
  return c ? `Services.${c.group}` : null;
};
export const serviceScopeSub = (code: string): string | null => scopeSubForServiceCategory(code);

/** Why a service line cannot be saved as given, or null. A line is a service or a product, never both; a catalogue service must match the category. */
export function serviceLineProblem(l: ServiceLineFields & { description?: string }, label: string, lookup: CatalogueLookup = serviceCatalogueByCode as CatalogueLookup): string | null {
  if (!l.serviceCategory) {
    if (l.servicePricingBasis || l.serviceCode) return `${label}: choose a kind of service, or clear the pricing basis.`;
    return null;
  }
  if (l.productMasterId) return `${label}: an item is either a product or a service, not both.`;
  if (!l.servicePricingBasis) return `${label}: say how the price is stated (per day, per month, fixed fee and so on).`;
  if (l.serviceCode) {
    const item = lookup(l.serviceCode);
    if (!item) return `${label}: that standard service is not in the catalogue.`;
    if (item.category !== l.serviceCategory) return `${label}: the standard service does not belong to the chosen kind of service.`;
  }
  return null;
}

/** The unit a service line is quoted in when the issuer did not name one: one unit of the pricing basis. */
const BASIS_UNIT: Record<string, string> = { PER_DAY: "day", PER_HOUR: "hour", PER_MONTH: "month", PER_UNIT: "unit", LUMP_SUM: "fixed fee", PERCENT_OF_GOODS: "% of goods value" };
export const serviceBasisUnit = (basis: string | null | undefined) => (basis ? BASIS_UNIT[basis] ?? null : null);
