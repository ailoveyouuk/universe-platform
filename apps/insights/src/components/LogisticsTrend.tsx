"use client";

import { useEffect, useMemo, useState } from "react";
import { commodityGroupLabel, type InsightsLogisticsTrendPoint } from "@universe/types";
import { apiClient } from "../lib/apiClient";
import { Field, inputStyle } from "../lib/ui";
import { SectionTrend, trendStyle, type TrendLine, type TrendMetric } from "./SectionTrend";

const MODE_NAME: Record<string, string> = { AIR: "Air", SEA: "Sea", LAND: "Land" };
export type TrendSplit = "all" | "mode" | "commodity";
export type LogisticsMetricId = "shipments" | "distance" | "days" | "co2" | "efficiency";
const n0 = (v: number) => Math.round(v).toLocaleString("en-GB");

interface Acc { ship: number; dist: number; co2: number; eff: number; days: number; dayShip: number }

/** Weighted monthly figures for a set of rows (weighted by shipments, so a busy lane counts for more than a quiet one). */
function monthly(rows: InsightsLogisticsTrendPoint[], pick: (r: InsightsLogisticsTrendPoint) => boolean) {
  const by = new Map<string, Acc>();
  for (const r of rows) {
    if (!pick(r)) continue;
    const a = by.get(r.month) ?? { ship: 0, dist: 0, co2: 0, eff: 0, days: 0, dayShip: 0 };
    a.ship += r.shipmentCount; a.dist += r.avgDistanceKm * r.shipmentCount; a.co2 += r.avgCo2TotalKg * r.shipmentCount; a.eff += r.avgEfficiencyScore * r.shipmentCount;
    if (r.avgDurationDays !== null) { a.days += r.avgDurationDays * r.shipmentCount; a.dayShip += r.shipmentCount; }
    by.set(r.month, a);
  }
  return [...by.entries()].sort(([a], [b]) => a.localeCompare(b));
}

const METRICS: { id: LogisticsMetricId; label: string; unit: string; fmt: (v: number) => string; zero?: boolean; blurb: string; value: (a: Acc) => number | null }[] = [
  { id: "shipments", label: "Shipments", unit: "shipments", fmt: n0, zero: true, blurb: "Shipments recorded in each month by organisations that share data.", value: (a) => a.ship },
  { id: "distance", label: "Distance", unit: "km", fmt: n0, blurb: "Average straight-line distance per shipment, in kilometres.", value: (a) => (a.ship ? a.dist / a.ship : null) },
  { id: "days", label: "Days in transit", unit: "days", fmt: (v) => v.toFixed(1), blurb: "Average days from dispatch to delivery, for shipments with both dates recorded.", value: (a) => (a.dayShip ? a.days / a.dayShip : null) },
  { id: "co2", label: "CO2e", unit: "kg per shipment", fmt: n0, blurb: "Average kilograms of CO2e per shipment, using GLEC Framework v3.2 factors.", value: (a) => (a.ship ? a.co2 / a.ship : null) },
  { id: "efficiency", label: "Efficiency score", unit: "out of 10", fmt: (v) => v.toFixed(1), blurb: "Average efficiency score, Universe's own 1 to 10 measure (mainly the CO2 intensity of the mode used).", value: (a) => (a.ship ? a.eff / a.ship : null) },
];

/**
 * The standard "over time" panel for the shipping sections: pick what to measure (shipments, distance, days, CO2e, efficiency), how to split it
 * (all together, by mode, by product group) and the page's own filters narrow it. Monthly figures need at least five organisations behind each cell.
 */
export function LogisticsTrend({ title, commodity = "", mode = "", manufactureCountryCode, destinationCountryCode, exportName, initialMetric = "shipments", initialSplit = "mode", metrics, hideSplit }: {
  title: string; commodity?: string; mode?: string; manufactureCountryCode?: string; destinationCountryCode?: string; exportName: string;
  initialMetric?: LogisticsMetricId; initialSplit?: TrendSplit; metrics?: LogisticsMetricId[]; hideSplit?: boolean;
}) {
  const [pts, setPts] = useState<InsightsLogisticsTrendPoint[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [metric, setMetric] = useState<string>(initialMetric);
  const [split, setSplit] = useState<TrendSplit>(initialSplit);
  useEffect(() => {
    setPts(null); setFailed(false);
    apiClient.insightsLogisticsTrend({ manufactureCountryCode, destinationCountryCode }).then(setPts).catch(() => { setPts([]); setFailed(true); });
  }, [manufactureCountryCode, destinationCountryCode]);

  const list = useMemo(() => {
    const rows = (pts ?? []).filter((r) => (!commodity || r.commodityGroup === commodity) && (!mode || r.transportMode === mode));
    const keys = split === "mode" ? [...new Set(rows.map((r) => r.transportMode).filter((m): m is string => !!m))].sort()
      : split === "commodity" ? [...rows.reduce((m, r) => (r.commodityGroup ? m.set(r.commodityGroup, (m.get(r.commodityGroup) ?? 0) + r.shipmentCount) : m), new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k)
      : [""];
    const build = (m: (typeof METRICS)[number]): TrendMetric => ({
      id: m.id, label: m.label, unit: m.unit, fmt: m.fmt, zero: m.zero, blurb: `${m.blurb}${split === "commodity" ? " Showing the five busiest product groups." : ""}`,
      lines: keys.map((k, i): TrendLine => ({
        id: k || "all", name: split === "mode" ? MODE_NAME[k] ?? k : split === "commodity" ? commodityGroupLabel(k) : "All shipments", ...trendStyle(i),
        points: monthly(rows, (r) => (split === "mode" ? r.transportMode === k : split === "commodity" ? r.commodityGroup === k : true)).flatMap(([month, a]) => { const v = m.value(a); return v === null ? [] : [{ month, value: v }]; }),
      })),
    });
    return METRICS.filter((m) => !metrics || metrics.includes(m.id)).map(build);
  }, [pts, commodity, mode, split, metrics]);

  const splitFilter = hideSplit ? undefined : (
    <Field label="Split by">
      <select className="u-native-select" style={{ ...inputStyle, width: "auto", minWidth: 150, maxWidth: "100%" }} value={split} onChange={(e) => setSplit(e.target.value as TrendSplit)}>
        <option value="all">All together</option>
        <option value="mode">Transport mode</option>
        <option value="commodity">Product group</option>
      </select>
    </Field>
  );
  return (
    <>
      {failed && <p role="status" style={{ margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" }}>The monthly trend is not available just now.</p>}
      <SectionTrend title={title} metrics={list} metric={metric} onMetric={setMetric} filters={splitFilter} loading={pts === null} sources={["logistics", "efficiency"]} exportName={exportName} />
    </>
  );
}
