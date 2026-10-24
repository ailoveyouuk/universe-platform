"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { LogisticsFilters, LogisticsRouteSummary, StakeholderRatingSummary } from "@universe/types";
import { COMMODITY_GROUPS, commodityGroupLabel, INCOTERMS as SHARED_INCOTERMS } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";
import {
  GaugeIcon,
  StandardsReference,
  ScoreLegend,
  SCORE_BAND_COLORS,
  bandForScore,
  CountrySelect,
  WorldMap,
  RankedTile,
  RankedTileGrid,
  GlobeIcon,
  StatTile,
  ProjectsIcon,
  BuildingIcon,
  type RankedRow,
  type WorldMapPoint,
  type WorldMapArc,
  type WorldMapLegendEntry,
  scoreColor,
} from "@universe/ui";
import { useCountries } from "../../../lib/useCountries";

/** How many of the top manufacture->destination country pairs (by total
 * shipment count across every route combination matching the current
 * filters) get drawn as arcs on the map below — product-database-and-
 * map-roadmap.md Stage 3a's "top-10 transit routes" ask. Computed
 * client-side from the same `routes` response the list below already
 * renders (grouped route combinations, not raw shipments -- small enough
 * that a dedicated truncated backend query isn't needed), rather than
 * adding a LIMIT to getAggregatedLogisticsRoutes' raw SQL. */
const TOP_ROUTE_COUNT = 10;

const TRANSPORT_MODES = ["", "AIR", "SEA", "LAND"] as const;
const INCOTERM_CHOICES = ["", ...SHARED_INCOTERMS] as const;
const COMMODITY_FILTER = ["", ...COMMODITY_GROUPS] as const;

const ENTITY_LABELS: Record<string, string> = {
  PROJECT: "Projects",
  MANUFACTURER: "Manufacturers",
  SUPPLIER: "Suppliers",
  PROCURING_ORGANIZATION: "Procuring organisations",
};

/**
 * Global, anonymized, cross-tenant "Logistics & CO2" benchmark — added
 * 2026-10-08, per Lewis's request for a view "accessible by all universe
 * users" showing the most-common and most-CO2-efficient manufacture-to-
 * destination routes, plus aggregate stakeholder counts by efficiency
 * rating. Every figure here comes from @universe/insights-db's
 * AggregatedLogisticsMetric / getStakeholderRatingDistribution — never
 * this organization's own tenant data directly. A route/bucket with
 * fewer than MINIMUM_COHORT_SIZE (5) distinct contributing organizations
 * (or entities, for the stakeholder counts) is never returned at all —
 * so on a platform with few consented/contributing organizations, this
 * page may legitimately show little or nothing yet. See
 * supply-chain-co2-efficiency.md for the full writeup of that tradeoff.
 */
export default function GlobalLogisticsPage() {
  const countries = useCountries();
  const searchParams = useSearchParams();
  const [routes, setRoutes] = useState<LogisticsRouteSummary[] | null>(null);
  const [ratings, setRatings] = useState<StakeholderRatingSummary[] | null>(null);
  // Deep-linkable from the embedded map on the org-private Logistics page
  // (clicking a manufacture/delivery pulse there navigates here with
  // ?manufactureCountryCode=XX / ?destinationCountryCode=XX), same
  // ?param convention as the Projects list's ?status=/?country= deep
  // links -- see this page's own WorldMap onPointClick below for the
  // same behaviour wired locally (clicking a pulse here updates the
  // filter in place rather than navigating).
  const [filters, setFilters] = useState<LogisticsFilters>(() => ({
    manufactureCountryCode: searchParams.get("manufactureCountryCode") ?? undefined,
    destinationCountryCode: searchParams.get("destinationCountryCode") ?? undefined,
  }));
  const [sortBy, setSortBy] = useState<"common" | "efficient">("common");

  useEffect(() => {
    apiClient
      .getGlobalLogisticsRoutes(filters)
      .then(setRoutes)
      .catch(() => setRoutes([]));
  }, [filters]);

  useEffect(() => {
    apiClient
      .getGlobalStakeholderRatings()
      .then(setRatings)
      .catch(() => setRatings([]));
  }, []);

  const sortedRoutes = routes
    ? [...routes].sort((a, b) => (sortBy === "common" ? b.shipmentCount - a.shipmentCount : b.avgEfficiencyScore - a.avgEfficiencyScore))
    : null;

  function update<K extends keyof LogisticsFilters>(key: K, value: LogisticsFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value || undefined }));
  }

  // World map data — product-database-and-map-roadmap.md Stage 3a, added
  // 2026-10-09. Derived entirely from `routes` (the same filtered
  // response the route list below already renders), not a second fetch:
  // manufacture-country pulses (violet) and delivery-country pulses
  // (magenta) are each country's shipmentCount summed across every route
  // combination landing there, and the arcs are the TOP_ROUTE_COUNT
  // manufacture->destination country PAIRS by that same summed count
  // (coarser than `routes`' own manufacture/destination/mode/incoterm/
  // commodity grouping, which is too fine-grained for "top routes"). A
  // country with no seeded centroid (Country.latitude/longitude still
  // null — see schema.prisma) is silently skipped rather than crashing;
  // not every country is seeded yet.
  const [mapFocus, setMapFocus] = useState<{ id: string; nonce: number } | null>(null);
  const countryIndex = useMemo(() => new Map(countries.map((c) => [c.code, c])), [countries]);

  const mapData = useMemo(() => {
    const points: WorldMapPoint[] = [];
    const arcs: WorldMapArc[] = [];
    const rankings = { manufacture: [] as RankedRow[], destination: [] as RankedRow[] };
    if (!routes || routes.length === 0) return { points, arcs, rankings };

    const manufactureTotals = new Map<string, number>();
    const destinationTotals = new Map<string, number>();
    const pairTotals = new Map<
      string,
      { manufacture: string; destination: string; count: number; distanceWeightedSum: number; efficiencyWeightedSum: number }
    >();

    for (const r of routes) {
      if (r.manufactureCountryCode) {
        manufactureTotals.set(r.manufactureCountryCode, (manufactureTotals.get(r.manufactureCountryCode) ?? 0) + r.shipmentCount);
      }
      if (r.destinationCountryCode) {
        destinationTotals.set(r.destinationCountryCode, (destinationTotals.get(r.destinationCountryCode) ?? 0) + r.shipmentCount);
      }
      if (r.manufactureCountryCode && r.destinationCountryCode) {
        const key = `${r.manufactureCountryCode}>${r.destinationCountryCode}`;
        const existing = pairTotals.get(key);
        if (existing) {
          existing.count += r.shipmentCount;
          existing.distanceWeightedSum += r.avgDistanceKm * r.shipmentCount;
          existing.efficiencyWeightedSum += r.avgEfficiencyScore * r.shipmentCount;
        } else {
          pairTotals.set(key, {
            manufacture: r.manufactureCountryCode,
            destination: r.destinationCountryCode,
            count: r.shipmentCount,
            distanceWeightedSum: r.avgDistanceKm * r.shipmentCount,
            efficiencyWeightedSum: r.avgEfficiencyScore * r.shipmentCount,
          });
        }
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
      const avgDistance = pair.distanceWeightedSum / pair.count;
      const avgEfficiency = pair.efficiencyWeightedSum / pair.count;
      const band = bandForScore(avgEfficiency);
      arcs.push({
        id: `${pair.manufacture}>${pair.destination}`,
        from: { latitude: from.latitude, longitude: from.longitude },
        to: { latitude: to.latitude, longitude: to.longitude },
        color: "var(--u-ink-secondary)",
        label: `${from.name} → ${to.name} — ${pair.count} shipments`,
        tooltipLines: [
          { text: `~${Math.round(avgDistance).toLocaleString()} km` },
          { text: `Efficiency/CO2e: ${avgEfficiency.toFixed(1)}/10 (${band})`, color: SCORE_BAND_COLORS[band] },
        ],
      });
    }

    const rank = (totals: Map<string, number>, prefix: string, color: string): RankedRow[] =>
      Array.from(totals.entries())
        .map(([code, value]) => ({ id: `${prefix}:${code}`, label: countryIndex.get(code)?.name ?? code, value, color }))
        .sort((a, b) => b.value - a.value);
    rankings.manufacture = rank(manufactureTotals, "mfg", "var(--u-brand-violet)");
    rankings.destination = rank(destinationTotals, "dest", "var(--u-accent-magenta)");
    return { points, arcs, rankings };
  }, [routes, countryIndex]);

  const mapLegend: WorldMapLegendEntry[] = [
    { color: "var(--u-brand-violet)", label: "Country of manufacture" },
    { color: "var(--u-accent-magenta)", label: "Delivery country" },
    { color: "var(--u-ink-secondary)", label: `Dashed lines: the ${TOP_ROUTE_COUNT} busiest routes (by shipments)`, shape: "line" },
  ];

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "var(--u-org-accent, var(--u-brand-violet))", marginBottom: 10 }} />
        <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 26, margin: 0, color: "var(--u-ink)", display: "flex", alignItems: "center", gap: 10 }}>
          <GaugeIcon size={24} /> Global Logistics & CO2 Benchmark
        </h1>
        <p style={{ color: "var(--u-ink-secondary)", fontSize: 14, marginTop: 6, maxWidth: 760 }}>
          Anonymized, aggregated across every consented organisation on the platform — no organisation,
          project, or shipment is ever individually identifiable here. See{" "}
          <Link href="/logistics" style={{ textDecoration: "none", color: "var(--u-brand-violet)" }}>
            your own organisation&apos;s private data
          </Link>{" "}
          for line-level detail.
        </p>
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <StandardsReference
            label="GLEC Framework (ISO 14083-aligned)"
            detail="Distance and CO2 figures below use GLEC-Framework-aligned emission factors by transport mode. Distance is a great-circle approximation between country centroids, not an actual shipping route. See supply-chain-co2-efficiency.md for the full methodology."
          />
          <ScoreLegend />
        </div>
      </div>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, margin: "0 0 10px", color: "var(--u-ink)" }}>Stakeholders by efficiency/CO2-impact rating</h2>
        {ratings === null && <p style={{ color: "var(--u-ink-secondary)" }}>Loading…</p>}
        {ratings !== null && ratings.length === 0 && (
          <p style={{ color: "var(--u-ink-secondary)" }}>
            Not enough contributing organisations/entities yet to show this anonymously (a minimum group size applies to every category).
          </p>
        )}
        {ratings && ratings.length > 0 && (
          <div className="u-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 46%), 1fr))", gap: 16 }}>
            {ratings.map((r) => (
              <StatTile
                key={r.entityType}
                label={ENTITY_LABELS[r.entityType] ?? r.entityType}
                value={`${r.averageScore.toFixed(1)}/10`}
                icon={r.entityType === "PROJECT" ? <ProjectsIcon size={18} /> : r.entityType === "PROCURING_ORGANIZATION" ? <GlobeIcon size={18} /> : <BuildingIcon size={18} />}
                tone="neutral"
                indicator={{
                  color: SCORE_BAND_COLORS[r.scoreBand],
                  barColor: scoreColor(r.averageScore / 10) ?? undefined,
                  label: `${{ RED: "Poor", AMBER: "Fair", YELLOW: "Good", GREEN: "Excellent" }[r.scoreBand] ?? ""} · ${r.entityCount.toLocaleString("en-GB")} rated`,
                  fraction: r.averageScore / 10,
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ fontSize: 18, margin: 0, color: "var(--u-ink)" }}>Routes (manufacture → destination)</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button className={sortBy === "common" ? "u-tab-active" : "u-tab"} onClick={() => setSortBy("common")} style={tabStyle(sortBy === "common")}>
              Most common
            </button>
            <button className={sortBy === "efficient" ? "u-tab-active" : "u-tab"} onClick={() => setSortBy("efficient")} style={tabStyle(sortBy === "efficient")}>
              Most CO2-efficient
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <RankedTileGrid>
            <RankedTile
              label="Top countries of manufacture"
              icon={<GlobeIcon size={18} />}
              tone="var(--u-brand-violet)"
              rows={mapData.rankings.manufacture}
              activeId={mapFocus?.id ?? null}
              onRowClick={(row) => setMapFocus({ id: row.id, nonce: Date.now() })}
              formatValue={(v) => `${Math.round(v).toLocaleString()}`}
              emptyMessage="No anonymised routes meet the minimum cohort size yet."
            />
            <RankedTile
              label="Top delivery countries"
              icon={<GlobeIcon size={18} />}
              tone="var(--u-accent-magenta)"
              rows={mapData.rankings.destination}
              activeId={mapFocus?.id ?? null}
              onRowClick={(row) => setMapFocus({ id: row.id, nonce: Date.now() })}
              formatValue={(v) => `${Math.round(v).toLocaleString()}`}
              emptyMessage="No anonymised routes meet the minimum cohort size yet."
            />
          </RankedTileGrid>
          <p style={{ margin: "6px 2px 0", fontSize: 12, color: "var(--u-ink-secondary)" }}>Shipments by country. Select a country to find it on the map.</p>
        </div>
        <WorldMap
          focus={mapFocus}
          highlightId={mapFocus?.id ?? null}
          points={mapData.points}
          arcs={mapData.arcs}
          legend={mapLegend}
          emptyMessage="No anonymised routes meet the minimum cohort size yet."
          onPointClick={(point) => {
            // Point ids are built as `mfg:<code>` / `dest:<code>` above --
            // clicking a pulse filters the route list below to that
            // country, reusing the exact filters the CountrySelect
            // dropdowns already drive (see the "World map interactivity"
            // doc comment on mapData).
            const [kind, code] = point.id.split(":");
            if (kind === "mfg") update("manufactureCountryCode", code);
            else if (kind === "dest") update("destinationCountryCode", code);
          }}
        />

        <div className="u-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(150px, 100%), 1fr))", gap: 10, marginTop: 20, marginBottom: 16 }}>
          <select className="u-native-select" aria-label="Transport mode" style={filterInputStyle} value={filters.transportMode ?? ""} onChange={(e) => update("transportMode", e.target.value)}>
            {TRANSPORT_MODES.map((m) => (
              <option key={m} value={m}>
                {m || "All modes"}
              </option>
            ))}
          </select>
          <select className="u-native-select" aria-label="Incoterm" style={filterInputStyle} value={filters.incoterm ?? ""} onChange={(e) => update("incoterm", e.target.value)}>
            {INCOTERM_CHOICES.map((i) => (
              <option key={i} value={i}>
                {i || "All incoterms"}
              </option>
            ))}
          </select>
          <select className="u-native-select" aria-label="Commodity group" style={filterInputStyle} value={filters.commodityGroup ?? ""} onChange={(e) => update("commodityGroup", e.target.value)}>
            {COMMODITY_FILTER.map((c) => (
              <option key={c} value={c}>
                {c ? commodityGroupLabel(c) : "All commodity groups"}
              </option>
            ))}
          </select>
          <CountrySelect
            value={filters.manufactureCountryCode ?? ""}
            onChange={(code) => update("manufactureCountryCode", code)}
            options={countries}
            ariaLabel="Manufacture country"
            placeholder="Manufacture country…"
          />
          <CountrySelect
            value={filters.destinationCountryCode ?? ""}
            onChange={(code) => update("destinationCountryCode", code)}
            options={countries}
            ariaLabel="Destination country"
            placeholder="Destination country…"
          />
        </div>

        {sortedRoutes === null && <p style={{ color: "var(--u-ink-secondary)" }}>Loading…</p>}
        {sortedRoutes !== null && sortedRoutes.length === 0 && (
          <p style={{ color: "var(--u-ink-secondary)" }}>
            No route combination currently has enough contributing organisations to show anonymously.
          </p>
        )}
        {sortedRoutes && sortedRoutes.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sortedRoutes.map((r, i) => (
              <div key={i} style={{ border: "1px solid var(--u-border)", borderRadius: 8, padding: 14, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, color: "var(--u-ink)" }}>
                    {r.manufactureCountryCode ? countries.find((c) => c.code === r.manufactureCountryCode)?.name ?? r.manufactureCountryCode : "—"}
                    {" → "}
                    {r.destinationCountryCode ? countries.find((c) => c.code === r.destinationCountryCode)?.name ?? r.destinationCountryCode : "—"}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>
                    {r.transportMode ?? "—"} · {r.incoterm ?? "—"} · {r.commodityGroup ? commodityGroupLabel(r.commodityGroup) : "—"}
                    {r.avgDurationDays !== null && ` · avg ${Math.round(r.avgDurationDays)}d`}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--u-ink-secondary)" }}>
                    {r.shipmentCount} shipments across {r.sourceCount} organisations
                  </p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: "var(--u-ink)" }}>{Math.round(r.avgDistanceKm).toLocaleString()} km</p>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>~{Math.round(r.avgCo2TotalKg).toLocaleString()} kg CO2e avg</p>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>Avg score {r.avgEfficiencyScore.toFixed(1)}/10</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const filterInputStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--u-border)",
  fontSize: 13,
};

function tabStyle(active: boolean): CSSProperties {
  return {
    padding: "6px 14px",
    borderRadius: 6,
    border: "1px solid var(--u-border)",
    background: active ? "var(--u-org-accent, var(--u-brand-violet))" : "transparent",
    color: active ? "var(--u-on-accent)" : "var(--u-ink)",
    fontSize: 13,
    cursor: "pointer",
  };
}
