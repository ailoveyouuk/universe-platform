"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LogisticsFilters, LogisticsRouteSummary, StakeholderRatingSummary } from "@universe/types";
import { COMMODITY_GROUPS, commodityGroupLabel, INCOTERMS } from "@universe/types";
import {
  BuildingIcon, CountrySelect, GaugeIcon, GlobeIcon, ProjectsIcon, RankedTile, RankedTileGrid, SCORE_BAND_COLORS, ScoreLegend, StandardsReference, StatTile, StatTileGrid, TrendingUpIcon,
  bandForScore, scoreColor, type RankedRow, type WorldMapArc, type WorldMapLegendEntry, type WorldMapPoint, WorldMap, ClockIcon, ThermometerIcon,
} from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { useCountries } from "../../lib/useCountries";
import { Card, ErrorNote, Heading, Page, pill, inputStyle } from "../../lib/ui";

const TOP_ROUTE_COUNT = 10;
const MODES = [{ key: "", label: "All modes" }, { key: "AIR", label: "Air" }, { key: "SEA", label: "Sea" }, { key: "LAND", label: "Land" }];
const ENTITY_LABELS: Record<string, string> = { PROJECT: "Projects", MANUFACTURER: "Manufacturers", SUPPLIER: "Suppliers", PROCURING_ORGANIZATION: "Procuring organisations" };
const BAND_WORD: Record<string, string> = { RED: "Poor", AMBER: "Fair", YELLOW: "Good", GREEN: "Excellent" };
const fmt = (n: number) => Math.round(n).toLocaleString("en-GB");

/** Weighted totals over a set of anonymised route groups (every group already has at least five organisations behind it). */
function totals(rows: LogisticsRouteSummary[]) {
  let shipments = 0, dist = 0, co2 = 0, score = 0;
  for (const r of rows) { shipments += r.shipmentCount; dist += r.avgDistanceKm * r.shipmentCount; co2 += r.avgCo2TotalKg * r.shipmentCount; score += r.avgEfficiencyScore * r.shipmentCount; }
  return { shipments, avgDistance: shipments ? dist / shipments : 0, avgCo2: shipments ? co2 / shipments : 0, avgScore: shipments ? score / shipments : 0 };
}

export default function LogisticsPage() {
  const countries = useCountries();
  const [filters, setFilters] = useState<LogisticsFilters>({});
  const [mode, setMode] = useState("");
  const [rows, setRows] = useState<LogisticsRouteSummary[] | null>(null);
  const [ratings, setRatings] = useState<StakeholderRatingSummary[] | null>(null);
  const [sortBy, setSortBy] = useState<"common" | "efficient">("common");
  const [mapFocus, setMapFocus] = useState<{ id: string; nonce: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fail = (e: unknown) => setErr(e instanceof Error ? e.message : "Could not load logistics data.");

  // Mode is applied here, not on the server, so the four transport-mode tiles can show every mode side by side.
  useEffect(() => { setRows(null); apiClient.insightsLogisticsRoutes(filters).then(setRows).catch((e) => { setRows([]); fail(e); }); }, [filters]);
  useEffect(() => { apiClient.insightsLogisticsRatings().then(setRatings).catch((e) => { setRatings([]); fail(e); }); }, []);

  const setFilter = <K extends keyof LogisticsFilters>(k: K, v: LogisticsFilters[K]) => setFilters((f) => ({ ...f, [k]: v || undefined }));
  const shown = useMemo(() => (rows ?? []).filter((r) => !mode || r.transportMode === mode), [rows, mode]);
  const all = useMemo(() => totals(shown), [shown]);
  const sorted = useMemo(() => [...shown].sort((a, b) => (sortBy === "common" ? b.shipmentCount - a.shipmentCount : b.avgEfficiencyScore - a.avgEfficiencyScore)), [shown, sortBy]);
  const countryIndex = useMemo(() => new Map(countries.map((c) => [c.code, c])), [countries]);
  const nameOf = (code: string | null) => (code ? countryIndex.get(code)?.name ?? code : "—");
  const drillTo = (s: "common" | "efficient") => { setSortBy(s); listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  const map = useMemo(() => {
    const points: WorldMapPoint[] = []; const arcs: WorldMapArc[] = [];
    const mfg = new Map<string, number>(); const dest = new Map<string, number>();
    const pairs = new Map<string, { m: string; d: string; n: number; dist: number; eff: number }>();
    for (const r of shown) {
      if (r.manufactureCountryCode) mfg.set(r.manufactureCountryCode, (mfg.get(r.manufactureCountryCode) ?? 0) + r.shipmentCount);
      if (r.destinationCountryCode) dest.set(r.destinationCountryCode, (dest.get(r.destinationCountryCode) ?? 0) + r.shipmentCount);
      if (r.manufactureCountryCode && r.destinationCountryCode) {
        const k = `${r.manufactureCountryCode}>${r.destinationCountryCode}`; const e = pairs.get(k) ?? { m: r.manufactureCountryCode, d: r.destinationCountryCode, n: 0, dist: 0, eff: 0 };
        e.n += r.shipmentCount; e.dist += r.avgDistanceKm * r.shipmentCount; e.eff += r.avgEfficiencyScore * r.shipmentCount; pairs.set(k, e);
      }
    }
    const place = (m: Map<string, number>, prefix: string, color: string, word: string) => { for (const [code, n] of m) { const c = countryIndex.get(code); if (c && c.latitude !== null && c.longitude !== null) points.push({ id: `${prefix}:${code}`, latitude: c.latitude, longitude: c.longitude, label: `${c.name} — ${word}`, color, value: n }); } };
    place(mfg, "mfg", "var(--u-brand-violet)", "manufacture"); place(dest, "dest", "var(--u-accent-magenta)", "delivery");
    for (const p of [...pairs.values()].sort((a, b) => b.n - a.n).slice(0, TOP_ROUTE_COUNT)) {
      const a = countryIndex.get(p.m), b = countryIndex.get(p.d);
      if (!a || !b || a.latitude === null || a.longitude === null || b.latitude === null || b.longitude === null) continue;
      const eff = p.eff / p.n; const band = bandForScore(eff);
      arcs.push({ id: `${p.m}>${p.d}`, from: { latitude: a.latitude, longitude: a.longitude }, to: { latitude: b.latitude, longitude: b.longitude }, color: "var(--u-ink-secondary)", label: `${a.name} → ${b.name} — ${p.n} shipments`, tooltipLines: [{ text: `~${fmt(p.dist / p.n)} km` }, { text: `Efficiency/CO2e: ${eff.toFixed(1)}/10 (${band})`, color: SCORE_BAND_COLORS[band] }] });
    }
    const rank = (m: Map<string, number>, prefix: string, color: string): RankedRow[] => [...m.entries()].map(([code, value]) => ({ id: `${prefix}:${code}`, label: nameOf(code), value, color })).sort((a, b) => b.value - a.value);
    return { points, arcs, top: { mfg: rank(mfg, "mfg", "var(--u-brand-violet)"), dest: rank(dest, "dest", "var(--u-accent-magenta)") } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, countryIndex]);
  const legend: WorldMapLegendEntry[] = [
    { color: "var(--u-brand-violet)", label: "Country of manufacture" },
    { color: "var(--u-accent-magenta)", label: "Delivery country" },
    { color: "var(--u-ink-secondary)", label: `Dashed lines: the ${TOP_ROUTE_COUNT} busiest routes (by shipments)`, shape: "line" },
  ];
  const band = bandForScore(all.avgScore);
  const empty = rows !== null && shown.length === 0;

  return (
    <Page>
      <Heading
        title="Logistics and CO2"
        sub={<>How goods travel: the busiest and the most CO2-efficient routes from where products are made to where they are delivered. Anonymised across the platform; no organisation, project or shipment is identifiable.</>}
        actions={<><StandardsReference label="GLEC Framework (ISO 14083-aligned)" detail="Distance and CO2 figures use GLEC-aligned emission factors by transport mode. Distance is a great-circle approximation between country centroids, not an actual shipping route." /><ScoreLegend /></>}
      />
      <ErrorNote message={err} />

      <section aria-labelledby="glance" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 id="glance" style={{ margin: 0, fontFamily: "var(--u-font-display)", fontSize: 16 }}>At a glance</h2>
        <StatTileGrid>
          <StatTile label="Shipments" value={rows ? fmt(all.shipments) : "…"} icon={<TrendingUpIcon size={18} />} onClick={() => drillTo("common")} />
          <StatTile label="Average distance" value={rows ? `${fmt(all.avgDistance)} km` : "…"} icon={<GlobeIcon size={18} />} tone="neutral" onClick={() => drillTo("common")} />
          <StatTile label="Average CO2e per shipment" value={rows ? `${fmt(all.avgCo2)} kg` : "…"} icon={<ThermometerIcon size={18} />} tone="neutral" onClick={() => drillTo("efficient")} />
          <StatTile label="Average efficiency score" value={rows && all.shipments ? `${all.avgScore.toFixed(1)}/10` : rows ? "—" : "…"} icon={<GaugeIcon size={18} />} tone="neutral" onClick={() => drillTo("efficient")}
            indicator={rows && all.shipments ? { color: SCORE_BAND_COLORS[band], barColor: scoreColor(all.avgScore / 10) ?? undefined, label: BAND_WORD[band] ?? "", fraction: all.avgScore / 10 } : undefined} />
        </StatTileGrid>
      </section>

      <section aria-labelledby="modes" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 id="modes" style={{ margin: 0, fontFamily: "var(--u-font-display)", fontSize: 16 }}>By transport mode</h2>
        <StatTileGrid>
          {MODES.map((m) => {
            const t = totals((rows ?? []).filter((r) => !m.key || r.transportMode === m.key));
            return <StatTile key={m.label} label={`${m.label}: shipments`} value={rows ? fmt(t.shipments) : "…"} icon={<ClockIcon size={18} />} tone={m.key ? "brand" : "neutral"} active={mode === m.key} onClick={() => setMode(m.key)}
              indicator={rows && t.shipments ? { color: SCORE_BAND_COLORS[bandForScore(t.avgScore)], barColor: scoreColor(t.avgScore / 10) ?? undefined, label: `${fmt(t.avgCo2)} kg CO2e each · ${t.avgScore.toFixed(1)}/10`, fraction: t.avgScore / 10 } : undefined} />;
          })}
        </StatTileGrid>
      </section>

      <section aria-labelledby="ratings" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 id="ratings" style={{ margin: 0, fontFamily: "var(--u-font-display)", fontSize: 16 }}>Stakeholders by efficiency rating</h2>
        {ratings === null && <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>Loading…</p>}
        {ratings !== null && ratings.length === 0 && <p style={{ margin: 0, color: "var(--u-ink-secondary)", fontSize: 14 }}>Not enough contributing organisations yet to show this anonymously.</p>}
        {ratings && ratings.length > 0 && (
          <StatTileGrid>
            {ratings.map((r) => (
              <StatTile key={r.entityType} label={ENTITY_LABELS[r.entityType] ?? r.entityType} value={`${r.averageScore.toFixed(1)}/10`} tone="neutral"
                icon={r.entityType === "PROJECT" ? <ProjectsIcon size={18} /> : r.entityType === "PROCURING_ORGANIZATION" ? <GlobeIcon size={18} /> : <BuildingIcon size={18} />}
                indicator={{ color: SCORE_BAND_COLORS[r.scoreBand], barColor: scoreColor(r.averageScore / 10) ?? undefined, label: `${BAND_WORD[r.scoreBand] ?? ""} · ${r.entityCount.toLocaleString("en-GB")} rated`, fraction: r.averageScore / 10 }} />
            ))}
          </StatTileGrid>
        )}
      </section>

      <section aria-labelledby="where" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 id="where" style={{ margin: 0, fontFamily: "var(--u-font-display)", fontSize: 16 }}>Where goods are made and delivered</h2>
        <RankedTileGrid>
          <RankedTile label="Top countries of manufacture" icon={<GlobeIcon size={18} />} tone="var(--u-brand-violet)" rows={map.top.mfg} activeId={mapFocus?.id ?? null} onRowClick={(r) => setMapFocus({ id: r.id, nonce: Date.now() })} formatValue={(v) => fmt(v)} emptyMessage="No route has enough contributors to show yet." />
          <RankedTile label="Top delivery countries" icon={<GlobeIcon size={18} />} tone="var(--u-accent-magenta)" rows={map.top.dest} activeId={mapFocus?.id ?? null} onRowClick={(r) => setMapFocus({ id: r.id, nonce: Date.now() })} formatValue={(v) => fmt(v)} emptyMessage="No route has enough contributors to show yet." />
        </RankedTileGrid>
        <p style={{ margin: "0 2px", fontSize: 12, color: "var(--u-ink-secondary)" }}>Shipments by country. Select a country to find it on the map; select a spot on the map to filter the routes to that country.</p>
        <WorldMap focus={mapFocus} highlightId={mapFocus?.id ?? null} points={map.points} arcs={map.arcs} legend={legend} maxHeight={420} emptyMessage="No route has enough contributors to show yet."
          onPointClick={(p) => { const [kind, code] = p.id.split(":"); if (kind === "mfg") setFilter("manufactureCountryCode", code); else if (kind === "dest") setFilter("destinationCountryCode", code); }} />
      </section>

      <div ref={listRef} style={{ scrollMarginTop: 70 }}>
        <Card title="Routes" action={
          <div role="group" aria-label="Order routes by" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="u-touch" style={pill(sortBy === "common")} aria-pressed={sortBy === "common"} onClick={() => setSortBy("common")}>Most common</button>
            <button type="button" className="u-touch" style={pill(sortBy === "efficient")} aria-pressed={sortBy === "efficient"} onClick={() => setSortBy("efficient")}>Most CO2-efficient</button>
          </div>}>
          <div className="u-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))", gap: 10, marginBottom: 14 }}>
            <select className="u-native-select" aria-label="Delivery terms (Incoterm)" style={inputStyle} value={filters.incoterm ?? ""} onChange={(e) => setFilter("incoterm", e.target.value)}>
              <option value="">All delivery terms</option>{INCOTERMS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
            <select className="u-native-select" aria-label="Commodity group" style={inputStyle} value={filters.commodityGroup ?? ""} onChange={(e) => setFilter("commodityGroup", e.target.value)}>
              <option value="">All commodity groups</option>{COMMODITY_GROUPS.map((c) => <option key={c} value={c}>{commodityGroupLabel(c)}</option>)}
            </select>
            <CountrySelect value={filters.manufactureCountryCode ?? ""} onChange={(c) => setFilter("manufactureCountryCode", c)} options={countries} ariaLabel="Manufacture country" placeholder="Manufacture country…" />
            <CountrySelect value={filters.destinationCountryCode ?? ""} onChange={(c) => setFilter("destinationCountryCode", c)} options={countries} ariaLabel="Destination country" placeholder="Destination country…" />
          </div>
          {(filters.incoterm || filters.commodityGroup || filters.manufactureCountryCode || filters.destinationCountryCode || mode) && (
            <p style={{ margin: "0 0 12px" }}><button type="button" className="u-touch" style={pill(false)} onClick={() => { setFilters({}); setMode(""); }}>Clear all filters</button></p>
          )}
          {rows === null && <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>Loading…</p>}
          {empty && <p style={{ margin: 0, color: "var(--u-ink-secondary)", fontSize: 14 }}>No route combination has enough contributing organisations to show anonymously for this selection.</p>}
          {sorted.length > 0 && (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {sorted.slice(0, 50).map((r, i) => (
                <li key={i} style={{ border: "1px solid var(--u-border)", borderRadius: 8, padding: 14, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, color: "var(--u-ink)" }}>{nameOf(r.manufactureCountryCode)} → {nameOf(r.destinationCountryCode)}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>{r.transportMode ?? "—"} · {r.incoterm ?? "—"} · {r.commodityGroup ? commodityGroupLabel(r.commodityGroup) : "—"}{r.avgDurationDays !== null && ` · avg ${Math.round(r.avgDurationDays)} days`}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--u-ink-secondary)" }}>{r.shipmentCount.toLocaleString("en-GB")} shipments across {r.sourceCount} organisations</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, color: "var(--u-ink)" }}>{fmt(r.avgDistanceKm)} km</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>~{fmt(r.avgCo2TotalKg)} kg CO2e on average</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>Score {r.avgEfficiencyScore.toFixed(1)}/10</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {sorted.length > 50 && <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Showing the first 50 of {sorted.length.toLocaleString("en-GB")} routes. Use the filters to narrow the list.</p>}
        </Card>
      </div>
    </Page>
  );
}
