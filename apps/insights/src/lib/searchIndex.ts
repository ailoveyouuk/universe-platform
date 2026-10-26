import { COMMODITY_GROUPS, SERVICE_CATEGORIES, commodityGroupLabel } from "@universe/types";
import { REGION_LABEL } from "./format";

/** What can be found with Insights search (2026-10-25): the areas, the product groups, the service types, the regions and (added by the page) countries and saved views. */
export interface SearchEntry { type: "Area" | "Product group" | "Service" | "Region" | "Country" | "Saved view"; title: string; detail: string; href: string; keywords: string }

export const AREAS: SearchEntry[] = [
  { type: "Area", title: "Geographies", detail: "Where goods are made and delivered, on a map; how regions and countries trade; the most and least efficient delivery countries.", href: "/geographies", keywords: "map country countries region flows trade corridors made delivered efficiency partner" },
  { type: "Area", title: "Shipping modes", detail: "Air, sea and land compared: share of shipments, days in transit, CO2e and what each mode carries.", href: "/modes", keywords: "air sea land transport carbon co2 emissions speed days transit mode premium" },
  { type: "Area", title: "Data explorer", detail: "Cost, sourcing, shipping and regulatory figures side by side in one table, one row per product group or country.", href: "/explorer", keywords: "table compare combine side by side spreadsheet columns sort filter" },
  { type: "Area", title: "Commodities", detail: "How the cost of each product group is moving like for like, by region, with where it is made and how it travels.", href: "/commodities", keywords: "cost price movement index trend product group inflation dearer cheaper" },
  { type: "Area", title: "Distances", detail: "How far goods travel, distance bands, and freight cost per tonne and per tonne-kilometre by lane and mode.", href: "/distances", keywords: "freight cost tonne kilometre km lane corridor band transit forwarder" },
  { type: "Area", title: "Services", detail: "What consultancy, technical assistance, advisory, testing and other services cost, in their own units, and how that moves.", href: "/services", keywords: "consultancy consulting technical assistance advisory day rate per day fee training audit" },
  { type: "Area", title: "Prices", detail: "Cost price by product group over time, split by where it is made, where it is delivered and delivery terms.", href: "/prices", keywords: "price incoterm trend average lowest highest" },
  { type: "Area", title: "Currencies", detail: "The daily exchange rate between any two currencies, tracked over time, as used when costs are converted.", href: "/currency", keywords: "currency exchange rate fx convert conversion dollar euro pound usd eur gbp spot ecb" },
  { type: "Area", title: "Sourcing", detail: "Which countries manufacture each product group, on a map and as a table.", href: "/sourcing", keywords: "manufacture manufacturer made country origin approved supplier" },
  { type: "Area", title: "Logistics and CO2", detail: "The busiest and most CO2-efficient routes from where goods are made to where they are delivered.", href: "/logistics", keywords: "route co2 carbon efficiency rating stakeholder forwarder" },
  { type: "Area", title: "Methodology", detail: "How the data is anonymised, why some figures are hidden, how fresh it is, and what cost price means.", href: "/methodology", keywords: "privacy anonymised five organisations minimum cohort cost price margin freshness" },
];

export function staticEntries(): SearchEntry[] {
  const groups: SearchEntry[] = COMMODITY_GROUPS.filter((g) => g !== "SERVICES").map((g) => ({ type: "Product group", title: commodityGroupLabel(g), detail: "Cost movement, where it is made and how it travels.", href: `/commodities?group=${g}`, keywords: g.toLowerCase().replace(/_/g, " ") }));
  const services: SearchEntry[] = SERVICE_CATEGORIES.map((c) => ({ type: "Service", title: c.label, detail: `${c.group}. ${c.description}`, href: `/services?service=${c.code}`, keywords: `${c.examples.join(" ")} ${c.group}`.toLowerCase() }));
  const regions: SearchEntry[] = Object.entries(REGION_LABEL).map(([code, label]) => ({ type: "Region", title: label, detail: "WHO region: trade with other regions, and what it receives.", href: "/geographies", keywords: `${code} who region` }));
  return [...AREAS, ...groups, ...services, ...regions];
}

/** Every word typed must appear somewhere in the title, detail or keywords. Title matches rank first. */
export function searchEntries(all: SearchEntry[], q: string): SearchEntry[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored = all.flatMap((e) => {
    const t = e.title.toLowerCase(), hay = `${t} ${e.detail.toLowerCase()} ${e.keywords}`;
    if (!words.every((w) => hay.includes(w))) return [];
    const score = words.reduce((a, w) => a + (t.startsWith(w) ? 4 : t.includes(w) ? 3 : 1), 0);
    return [{ e, score }];
  });
  return scored.sort((a, b) => b.score - a.score).map((x) => x.e);
}
