"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { LogisticsFilters, LogisticsRouteSummary, OrgLogisticsLineSummary } from "@universe/types";
import { apiClient } from "../../lib/apiClient";
import {
  GaugeIcon,
  StandardsReference,
  StatTile,
  ScoreLegend,
  SCORE_BAND_COLORS,
  ProjectsIcon,
  TrendingUpIcon,
  AlertIcon,
  WorldMap,
  type WorldMapPoint,
  type WorldMapArc,
  type WorldMapLegendEntry,
} from "@universe/ui";
import { useCountries } from "../../lib/useCountries";

/** Same cap as the old /logistics/global page — top manufacture-
 * >destination country pairs (by total shipment count) drawn as arcs. */
const TOP_ROUTE_COUNT = 10;

const TRANSPORT_MODES = ["", "AIR", "SEA", "LAND"] as const;
const INCOTERMS = ["", "EXW", "FCA", "FAS", "FOB", "CPT", "CIP", "CFR", "CIF", "DAP", "DPU", "DDP"] as const;
const COMMODITY_GROUPS = ["", "CONSUMABLES", "DEVICES", "REAGENTS", "EQUIPMENT", "PHARMACEUTICALS", "LABORATORY"] as const;
const SCORE_BANDS = ["", "RED", "AMBER", "YELLOW", "GREEN"] as const;

/**
 * Org-private "Logistics & CO2" view — added 2026-10-08. Every row in the
 * line list below is this organization's own ProjectLineLogisticsMetric
 * data (plain tenant-scoped read via /logistics-insights/lines) — see
 * supply-chain-co2-efficiency.md for the full methodology.
 *
 * The world map below the 4 stat tiles is different: it's the anonymized,
 * cross-tenant benchmark (AggregatedLogisticsMetric via
 * getGlobalLogisticsRoutes — never this organization's own tenant data
 * directly, same MINIMUM_COHORT_SIZE floor as everywhere else that reads
 * insights-db). Originally this lived on its own page (/logistics/global)
 * reachable only via a small text link in this page's intro paragraph —
 * Lewis flagged there was no real nav path to it, so 2026-10-09 it was
 * folded directly into this page instead of fixing that page's nav. The
 * standalone /logistics/global page (route list, filters, stakeholder
 * ratings) still exists for deeper benchmarking, linked from below the map.
 */
export default function LogisticsPage() {
  const countries = useCountries();
  const [rows, setRows] = useState<OrgLogisticsLineSummary[] | null>(null);
  const [globalRoutes, setGlobalRoutes] = useState<LogisticsRouteSummary[] | null>(null);
  const [filters, setFilters] = useState<LogisticsFilters>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => {
      apiClient
        .getLogisticsLines({ ...filters, search: search || undefined })
        .then(setRows)
        .catch(() => setRows([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [filters, search]);

  // Anonymized cross-tenant benchmark map — fetched once, independent of
  // this org's own line filters/search above (it's a different dataset,
  // not a filtered view of the same rows).
  useEffect(() => {
    apiClient
      .getGlobalLogisticsRoutes({})
      .then(setGlobalRoutes)
      .catch(() => setGlobalRoutes([]));
  }, []);

  const totals = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const totalCo2 = rows.reduce((sum, r) => sum + Number(r.metric.co2TotalKg), 0);
    const totalDistance = rows.reduce((sum, r) => sum + Number(r.metric.distanceKm), 0);
    const avgScore = rows.reduce((sum, r) => sum + r.metric.efficiencyScore, 0) / rows.length;
    return { totalCo2, totalDistance, avgScore, count: rows.length };
  }, [rows]);

  // Same derivation as the old /logistics/global page's mapData useMemo —
  // see product-database-and-map-roadmap.md Stage 3a. Manufacture-country
  // pulses (violet) and delivery-country pulses (magenta) are each
  // country's shipmentCount summed across every route combination; arcs
  // are the TOP_ROUTE_COUNT manufacture->destination country pairs by
  // that same summed count. A country with no seeded centroid is
  // silently skipped.
  const countryIndex = useMemo(() => new Map(countries.map((c) => [c.code, c])), [countries]);

  const globalMapData = useMemo(() => {
    const points: WorldMapPoint[] = [];
    const arcs: WorldMapArc[] = [];
    if (!globalRoutes || globalRoutes.length === 0) return { points, arcs };

    const manufactureTotals = new Map<string, number>();
    const destinationTotals = new Map<string, number>();
    const pairTotals = new Map<string, { manufacture: string; destination: string; count: number }>();

    for (const r of globalRoutes) {
      if (r.manufactureCountryCode) {
        manufactureTotals.set(r.manufactureCountryCode, (manufactureTotals.get(r.manufactureCountryCode) ?? 0) + r.shipmentCount);
      }
      if (r.destinationCountryCode) {
        destinationTotals.set(r.destinationCountryCode, (destinationTotals.get(r.destinationCountryCode) ?? 0) + r.shipmentCount);
      }
      if (r.manufactureCountryCode && r.destinationCountryCode) {
        const key = `${r.manufactureCountryCode}>${r.destinationCountryCode}`;
        const existing = pairTotals.get(key);
        if (existing) existing.count += r.shipmentCount;
        else pairTotals.set(key, { manufacture: r.manufactureCountryCode, destination: r.destinationCountryCode, count: r.shipmentCount });
      }
    }

    for (const [code, count] of manufactureTotals) {
      const c = countryIndex.get(code);
      if (!c || c.latitude === null || c.longitude === null) continue;
      points.push({ id: `mfg:${code}`, latitude: c.latitude, longitude: c.longitude, label: `${c.name} — manufacture`, color: "var(--u-brand-violet)", value: count });
    }
    for (const [code, count] of destinationTotals) {
      const c = countryIndex.get(code);
      if (!c || c.latitude === null || c.longitude === null) continue;
      points.push({ id: `dest:${code}`, latitude: c.latitude, longitude: c.longitude, label: `${c.name} — delivery`, color: "var(--u-accent-magenta)", value: count });
    }

    const topPairs = Array.from(pairTotals.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_ROUTE_COUNT);
    for (const pair of topPairs) {
      const from = countryIndex.get(pair.manufacture);
      const to = countryIndex.get(pair.destination);
      if (!from || !to || from.latitude === null || from.longitude === null || to.latitude === null || to.longitude === null) continue;
      arcs.push({
        id: `${pair.manufacture}>${pair.destination}`,
        from: { latitude: from.latitude, longitude: from.longitude },
        to: { latitude: to.latitude, longitude: to.longitude },
        color: "var(--u-ink-secondary)",
        label: `${from.name} → ${to.name} — ${pair.count} shipments`,
      });
    }

    return { points, arcs };
  }, [globalRoutes, countryIndex]);

  const globalMapLegend: WorldMapLegendEntry[] = [
    { color: "var(--u-brand-violet)", label: "Country of manufacture" },
    { color: "var(--u-accent-magenta)", label: "Delivery country" },
  ];

  function update<K extends keyof LogisticsFilters>(key: K, value: LogisticsFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value || undefined }));
  }

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "var(--u-org-accent, var(--u-brand-violet))", marginBottom: 10 }} />
          <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 26, margin: 0, color: "var(--u-ink)", display: "flex", alignItems: "center", gap: 10 }}>
            <GaugeIcon size={24} /> Logistics & CO2
          </h1>
          <p style={{ color: "var(--u-ink-secondary)", fontSize: 14, marginTop: 6, maxWidth: 680 }}>
            Manufacture-to-delivery distance, approximate CO2 (GLEC-Framework-aligned), and a 1–10
            efficiency/CO2-impact score per project line — this organisation&apos;s own data only.
            The map below is the anonymized, cross-platform benchmark against other organisations.
          </p>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <StandardsReference
              label="GLEC Framework (ISO 14083-aligned)"
              detail="Distance and CO2 figures below use GLEC-Framework-aligned emission factors by transport mode. Distance is a great-circle approximation between country centroids, not an actual shipping route. See supply-chain-co2-efficiency.md for the full methodology."
            />
            <ScoreLegend />
          </div>
        </div>
      </div>

      {totals && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          <StatTile label="Lines" value={totals.count} icon={<ProjectsIcon size={18} />} tone="neutral" />
          <StatTile label="Total distance" value={`${Math.round(totals.totalDistance).toLocaleString()} km`} icon={<TrendingUpIcon size={18} />} tone="neutral" />
          <StatTile label="Total CO2e" value={`${Math.round(totals.totalCo2).toLocaleString()} kg`} icon={<AlertIcon size={18} />} tone="warning" />
          <StatTile label="Avg. efficiency score" value={`${totals.avgScore.toFixed(1)} / 10`} icon={<GaugeIcon size={18} />} tone="brand" />
        </div>
      )}

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, margin: "0 0 10px", color: "var(--u-ink)" }}>Global benchmark (anonymized)</h2>
        <WorldMap
          points={globalMapData.points}
          arcs={globalMapData.arcs}
          legend={globalMapLegend}
          emptyMessage="No anonymised routes meet the minimum cohort size yet."
        />
        <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>
          Aggregated across every consented organisation on the platform — no organisation, project,
          or shipment is ever individually identifiable here. Full route list, filters, and
          stakeholder rating breakdown: <Link href="/logistics/global" style={{ textDecoration: "none", color: "var(--u-brand-violet)" }}>Global Logistics & CO2 Benchmark</Link>.
        </p>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 18 }}>
        <input
          placeholder="Search project / description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={filterInputStyle}
        />
        <select className="u-native-select" style={filterInputStyle} value={filters.transportMode ?? ""} onChange={(e) => update("transportMode", e.target.value)}>
          {TRANSPORT_MODES.map((m) => (
            <option key={m} value={m}>
              {m || "All modes"}
            </option>
          ))}
        </select>
        <select className="u-native-select" style={filterInputStyle} value={filters.incoterm ?? ""} onChange={(e) => update("incoterm", e.target.value)}>
          {INCOTERMS.map((i) => (
            <option key={i} value={i}>
              {i || "All incoterms"}
            </option>
          ))}
        </select>
        <select className="u-native-select" style={filterInputStyle} value={filters.commodityGroup ?? ""} onChange={(e) => update("commodityGroup", e.target.value)}>
          {COMMODITY_GROUPS.map((c) => (
            <option key={c} value={c}>
              {c || "All commodity groups"}
            </option>
          ))}
        </select>
        <select className="u-native-select" style={filterInputStyle} value={filters.scoreBand ?? ""} onChange={(e) => update("scoreBand", e.target.value)}>
          {SCORE_BANDS.map((b) => (
            <option key={b} value={b}>
              {b || "All score bands"}
            </option>
          ))}
        </select>
        <input
          placeholder="Max duration (days)"
          type="number"
          min={0}
          value={filters.maxDurationDays ?? ""}
          onChange={(e) => update("maxDurationDays", e.target.value ? Number(e.target.value) : undefined)}
          style={filterInputStyle}
        />
      </div>

      {rows === null && <p style={{ color: "var(--u-ink-secondary)" }}>Loading…</p>}
      {rows !== null && rows.length === 0 && <p style={{ color: "var(--u-ink-secondary)" }}>No lines match these filters yet.</p>}

      {rows && rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((row) => {
            const m = row.metric;
            const color = SCORE_BAND_COLORS[m.scoreBand] ?? "#666";
            return (
              <Link key={row.projectLineId} href={`/projects/detail?id=${row.projectId}`} style={{ textDecoration: "none" }}>
                <div style={{ border: "1px solid var(--u-border)", borderRadius: 8, padding: 14, display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: "var(--u-ink)" }}>
                      {row.projectReferenceNumber} — {row.clientProductDescription ?? row.projectTitle}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>
                      {m.manufactureCountryCode ? countries.find((c) => c.code === m.manufactureCountryCode)?.name ?? m.manufactureCountryCode : "—"}
                      {" → "}
                      {m.destinationCountryCode ? countries.find((c) => c.code === m.destinationCountryCode)?.name ?? m.destinationCountryCode : "—"}
                      {" · "}{Math.round(Number(m.distanceKm)).toLocaleString()} km ·{" "}
                      {m.transportMode ?? "—"} · {m.incoterm ?? "—"} · {m.commodityGroup ?? "—"}
                      {m.durationDays !== null && ` · ${m.durationDays}d`}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>
                      Manufacturer: {row.manufacturerName ?? "—"} · Supplier: {row.supplierName ?? "—"}
                      {m.weightEstimated && " · weight estimated"}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: color,
                        color: "#fff",
                        fontWeight: 700,
                      }}
                      title={`Efficiency/CO2 impact score: ${m.efficiencyScore}/10`}
                    >
                      {m.efficiencyScore}
                    </div>
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>
                      ~{Math.round(Number(m.co2TotalKg)).toLocaleString()} kg CO2e
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const filterInputStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--u-border)",
  fontSize: 13,
};

