"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LogisticsFilters, LogisticsLinesPage, LogisticsRouteSummary } from "@universe/types";
import { COMMODITY_GROUPS, commodityGroupLabel, INCOTERMS as SHARED_INCOTERMS } from "@universe/types";
import { apiClient } from "../../lib/apiClient";
import {
  GaugeIcon,
  Pagination,
  type PageSize,
  StandardsReference,
  StatTile,
  ScoreLegend,
  SCORE_BAND_COLORS,
  bandForScore,
  ProjectsIcon,
  TrendingUpIcon,
  AlertIcon,
  WorldMap,
  RankedTile,
  RankedTileGrid,
  GlobeIcon,
  type RankedRow,
  type WorldMapPoint,
  type WorldMapArc,
  type WorldMapLegendEntry,
  scoreColor,
} from "@universe/ui";
import { useCountries } from "../../lib/useCountries";
import { OwnDataExportButton } from "../../components/OwnDataExportButton";

/** Same cap as the old /logistics/global page — top manufacture-
 * >destination country pairs (by total shipment count) drawn as arcs. */
const TOP_ROUTE_COUNT = 10;

const TRANSPORT_MODES = ["", "AIR", "SEA", "LAND"] as const;
const INCOTERM_CHOICES = ["", ...SHARED_INCOTERMS] as const;
const COMMODITY_FILTER = ["", ...COMMODITY_GROUPS] as const;
const SCORE_BANDS = ["", "RED", "AMBER", "YELLOW", "GREEN"] as const;

/**
 * Org-private "Logistics & CO2" view — added 2026-10-08. Every row in the
 * line list below is this organization's own ProjectLineLogisticsMetric
 * data (plain tenant-scoped read via /logistics-insights/lines) — see
 * supply-chain-co2-efficiency.md for the full methodology.
 *
 * The world map below the 4 stat tiles is different: it's the anonymised,
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
/** Compact "approx." figures for the stat tiles: 35,504,994 km → 35.5M km; 8,405,129 kg → 8,405 t. */
function compactKm(km: number): string {
  if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(1)}M km`;
  if (km >= 10_000) return `${Math.round(km / 1_000).toLocaleString()}k km`;
  return `${Math.round(km).toLocaleString()} km`;
}
function compactCo2(kg: number): string {
  if (kg >= 10_000) return `${Math.round(kg / 1_000).toLocaleString()} t`;
  return `${Math.round(kg).toLocaleString()} kg`;
}

export default function LogisticsPage() {
  const countries = useCountries();
  // Server-paged with database-computed totals (2026-10-17, scale work).
  const [result, setResult] = useState<LogisticsLinesPage | null>(null);
  const rows = result?.items ?? null;
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [page, setPage] = useState(0);
  const [globalRoutes, setGlobalRoutes] = useState<LogisticsRouteSummary[] | null>(null);
  const [filters, setFilters] = useState<LogisticsFilters>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      apiClient
        .getLogisticsLinesPage({ ...filters, search: search || undefined }, page + 1, pageSize === "all" ? 100 : pageSize)
        .then((r) => {
          if (!cancelled) setResult(r);
        })
        .catch(() => {
          if (!cancelled) setResult({ items: [], total: 0, page: 1, pageSize: 25, totals: { count: 0, totalCo2Kg: 0, totalDistanceKm: 0, avgScore: 0 } });
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [filters, search, page, pageSize]);

  // A new filter or search starts again from the first page.
  useEffect(() => {
    setPage(0);
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

  const totals = result && result.totals.count > 0 ? { totalCo2: result.totals.totalCo2Kg, totalDistance: result.totals.totalDistanceKm, avgScore: result.totals.avgScore, count: result.totals.count } : null;

  // Same derivation as the old /logistics/global page's mapData useMemo —
  // see product-database-and-map-roadmap.md Stage 3a. Manufacture-country
  // pulses (violet) and delivery-country pulses (magenta) are each
  // country's shipmentCount summed across every route combination; arcs
  // are the TOP_ROUTE_COUNT manufacture->destination country pairs by
  // that same summed count. A country with no seeded centroid is
  // silently skipped.
  const [mapFocus, setMapFocus] = useState<{ id: string; nonce: number } | null>(null);
  const countryIndex = useMemo(() => new Map(countries.map((c) => [c.code, c])), [countries]);

  const globalMapData = useMemo(() => {
    const points: WorldMapPoint[] = [];
    const arcs: WorldMapArc[] = [];
    const rankings = { manufacture: [] as RankedRow[], destination: [] as RankedRow[] };
    if (!globalRoutes || globalRoutes.length === 0) return { points, arcs, rankings };

    const manufactureTotals = new Map<string, number>();
    const destinationTotals = new Map<string, number>();
    const pairTotals = new Map<
      string,
      { manufacture: string; destination: string; count: number; distanceWeightedSum: number; efficiencyWeightedSum: number }
    >();

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
  }, [globalRoutes, countryIndex]);

  const globalMapLegend: WorldMapLegendEntry[] = [
    { color: "var(--u-brand-violet)", label: "Country of manufacture" },
    { color: "var(--u-accent-magenta)", label: "Delivery country" },
    { color: "var(--u-ink-secondary)", label: `Dashed lines: the ${TOP_ROUTE_COUNT} busiest routes (by shipments)`, shape: "line" },
  ];

  function update<K extends keyof LogisticsFilters>(key: K, value: LogisticsFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value || undefined }));
  }

  const router = useRouter();
  /** This page has no local list of global route data to filter in
   * place -- the filterable route list lives on /logistics/global. So
   * unlike that page's own WorldMap (which updates its filters in
   * place), clicking a pulse here navigates there with the country
   * pre-applied, same ?param deep-link convention as the Projects list's
   * ?status=/?country=. */
  function handleGlobalMapPointClick(point: WorldMapPoint) {
    const [kind, code] = point.id.split(":");
    const param = kind === "mfg" ? "manufactureCountryCode" : "destinationCountryCode";
    router.push(`/logistics/global?${param}=${encodeURIComponent(code)}`);
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
            The map below is the anonymised, cross-platform benchmark against other organisations.
          </p>
          <div style={{ marginTop: 8 }}>
            <OwnDataExportButton entity="logistics" label="Export CSV" />
          </div>
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
        <div className="u-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 100%), 1fr))", gap: 12, marginBottom: 20 }}>
          <StatTile label="Lines" value={totals.count} icon={<ProjectsIcon size={18} />} tone="neutral" active={Object.values(filters).every((v) => v === undefined || v === "") && !search} onClick={() => { setFilters({}); setSearch(""); }} />
          <StatTile label="Total distance" note="approx." value={compactKm(totals.totalDistance)} icon={<TrendingUpIcon size={18} />} tone="neutral" />
          <StatTile label="Total CO2e" note="approx." value={compactCo2(totals.totalCo2)} icon={<AlertIcon size={18} />} tone="warning" />
          <StatTile
            label="Avg. efficiency score"
            value={`${totals.avgScore.toFixed(1)}/10`}
            icon={<GaugeIcon size={18} />}
            tone="brand"
            active={filters.scoreBand === "RED"}
            onClick={() => setFilters((f) => ({ ...f, scoreBand: f.scoreBand === "RED" ? undefined : "RED" }))}
            note={filters.scoreBand === "RED" ? "Showing poor-scoring lines" : "Click for poor-scoring lines"}
            indicator={{ color: scoreColor(totals.avgScore / 10) ?? SCORE_BAND_COLORS[bandForScore(totals.avgScore)], label: { RED: "Poor", AMBER: "Fair", YELLOW: "Good", GREEN: "Excellent" }[bandForScore(totals.avgScore)] ?? "", fraction: totals.avgScore / 10 }}
          />
        </div>
      )}

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, margin: "0 0 10px", color: "var(--u-ink)" }}>Global benchmark (anonymised)</h2>
        <div style={{ marginBottom: 16 }}>
          <RankedTileGrid>
            <RankedTile
              label="Top countries of manufacture"
              icon={<GlobeIcon size={18} />}
              tone="var(--u-brand-violet)"
              rows={globalMapData.rankings.manufacture}
              activeId={mapFocus?.id ?? null}
              onRowClick={(row) => setMapFocus({ id: row.id, nonce: Date.now() })}
              formatValue={(v) => `${Math.round(v).toLocaleString()}`}
              emptyMessage="No anonymised routes meet the minimum cohort size yet."
            />
            <RankedTile
              label="Top delivery countries"
              icon={<GlobeIcon size={18} />}
              tone="var(--u-accent-magenta)"
              rows={globalMapData.rankings.destination}
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
          points={globalMapData.points}
          arcs={globalMapData.arcs}
          legend={globalMapLegend}
          emptyMessage="No anonymised routes meet the minimum cohort size yet."
          onPointClick={handleGlobalMapPointClick}
        />
        <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>
          Aggregated across every consented organisation on the platform — no organisation, project,
          or shipment is ever individually identifiable here. Full route list, filters, and
          stakeholder rating breakdown: <Link href="/logistics/global" style={{ textDecoration: "none", color: "var(--u-brand-violet)" }}>Global Logistics & CO2 Benchmark</Link>.
        </p>
      </section>

      <div className="u-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(150px, 100%), 1fr))", gap: 10, marginBottom: 18 }}>
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
          {INCOTERM_CHOICES.map((i) => (
            <option key={i} value={i}>
              {i || "All incoterms"}
            </option>
          ))}
        </select>
        <select className="u-native-select" style={filterInputStyle} value={filters.commodityGroup ?? ""} onChange={(e) => update("commodityGroup", e.target.value)}>
          {COMMODITY_FILTER.map((c) => (
            <option key={c} value={c}>
              {c ? commodityGroupLabel(c) : "All commodity groups"}
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
                      {m.transportMode ?? "—"} · {m.incoterm ?? "—"} · {m.commodityGroup ? commodityGroupLabel(m.commodityGroup) : "—"}
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
          <Pagination
            pageSize={pageSize}
            onPageSizeChange={(sz) => { setPageSize(sz); setPage(0); }}
            page={page}
            pageCount={Math.max(1, Math.ceil((result?.total ?? 0) / (pageSize === "all" ? 100 : pageSize)))}
            onPageChange={setPage}
            totalCount={result?.total ?? 0}
          />
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

