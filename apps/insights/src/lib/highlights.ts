import { commodityGroupLabel, serviceCategoryByCode } from "@universe/types";
import type { CountryOption, InsightsPriceMovement } from "@universe/types";
import { apiClient } from "./apiClient";
import { fmtMoney, monthLabel } from "./format";
import { totalsOf } from "./geo";

/** The snippets a person can pin to their Overview (2026-10-25). Each is worked out live from the same anonymised figures as its lens. */
export interface HighlightResult { headline: string; detail: string }
export interface HighlightDef { id: string; area: string; title: string; href: string; load: (ctx: { countries: CountryOption[] }) => Promise<HighlightResult | null> }

const cache = new Map<string, Promise<unknown>>();
const once = <T,>(k: string, f: () => Promise<T>) => { let p = cache.get(k) as Promise<T> | undefined; if (!p) { p = f(); cache.set(k, p); p.catch(() => cache.delete(k)); } return p; };
const signed = (c: number) => `${c > 0 ? "+" : c < 0 ? "−" : ""}${Math.abs(c).toFixed(1)}%`;

function biggestMove(mv: InsightsPriceMovement[], skip?: (c: string) => boolean) {
  const own = mv.filter((s) => s.segmentBy === null && s.points.length >= 2 && !(skip && skip(s.category)));
  const cur = own.find((s) => s.currency === "USD")?.currency ?? own[0]?.currency;
  const list = own.filter((s) => s.currency === cur).map((s) => ({ s, c: s.points[s.points.length - 1]!.index - 100 }));
  return list.sort((a, b) => Math.abs(b.c) - Math.abs(a.c))[0] ?? null;
}

export const HIGHLIGHTS: HighlightDef[] = [
  { id: "commodities.biggest", area: "Commodities", title: "Biggest cost move in goods", href: "/commodities", load: async () => {
    const b = biggestMove(await once("mv", () => apiClient.insightsPriceMovement()), (c) => c === "SERVICES"); if (!b) return null;
    return { headline: `${commodityGroupLabel(b.s.category)} ${signed(b.c)}`, detail: `Like-for-like cost since ${monthLabel(b.s.points[0]!.month)}.` };
  } },
  { id: "services.biggest", area: "Services", title: "Biggest cost move in services", href: "/services", load: async () => {
    const b = biggestMove(await once("smv", () => apiClient.insightsServiceMovement())); if (!b) return null;
    return { headline: `${serviceCategoryByCode(b.s.category.split("|")[0]!)?.label ?? b.s.category} ${signed(b.c)}`, detail: `Like-for-like cost since ${monthLabel(b.s.points[0]!.month)}.` };
  } },
  { id: "freight.sea", area: "Distances", title: "What freight costs", href: "/distances", load: async () => {
    const rates = await once("rates", () => apiClient.insightsFreightRates()); const usd = rates.filter((r) => r.currency === "USD");
    const w = (m: string) => { const rs = usd.filter((r) => r.freightMode === m); const n = rs.reduce((a, r) => a + r.shipments, 0); return n ? rs.reduce((a, r) => a + r.avgCostPerTonneKm * r.shipments, 0) / n : null; };
    const sea = w("SEA"), air = w("AIR"); if (sea === null) return null;
    return { headline: `Sea freight: ${fmtMoney(sea)} USD per tonne-km`, detail: air ? `Air costs about ${Math.round(air / sea)} times as much.` : "Before any margin." };
  } },
  { id: "modes.share", area: "Shipping modes", title: "How goods travel", href: "/modes", load: async () => {
    const rows = await once("routes", () => apiClient.insightsLogisticsRoutes({})); const n = rows.reduce((a, r) => a + r.shipmentCount, 0); if (!n) return null;
    const share = (m: string) => Math.round((rows.filter((r) => r.transportMode === m).reduce((a, r) => a + r.shipmentCount, 0) / n) * 100);
    return { headline: `${share("SEA")}% of shipments go by sea`, detail: `Air ${share("AIR")}%, land ${share("LAND")}%.` };
  } },
  { id: "distances.average", area: "Distances", title: "How far goods travel", href: "/distances", load: async () => {
    const rows = await once("routes", () => apiClient.insightsLogisticsRoutes({})); const t = totalsOf(rows); if (!t.avgDistance) return null;
    return { headline: `${Math.round(t.avgDistance).toLocaleString("en-GB")} km on average`, detail: t.avgDays !== null ? `About ${Math.round(t.avgDays)} days in transit.` : "Average shipment distance." };
  } },
  { id: "geographies.busiest", area: "Geographies", title: "The busiest corridor", href: "/geographies", load: async ({ countries }) => {
    const rows = await once("routes", () => apiClient.insightsLogisticsRoutes({})); const m = new Map<string, number>();
    for (const r of rows) if (r.manufactureCountryCode && r.destinationCountryCode) { const k = `${r.manufactureCountryCode}>${r.destinationCountryCode}`; m.set(k, (m.get(k) ?? 0) + r.shipmentCount); }
    const top = [...m.entries()].sort((a, b) => b[1] - a[1])[0]; if (!top) return null;
    const [a, b] = top[0].split(">"); const nm = (c: string) => countries.find((x) => x.code === c)?.name ?? c;
    return { headline: `${nm(a!)} to ${nm(b!)}`, detail: `${top[1].toLocaleString("en-GB")} shipments.` };
  } },
];
export const DEFAULT_HIGHLIGHTS = ["commodities.biggest", "services.biggest", "freight.sea", "modes.share"];
