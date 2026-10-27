"use client";

import { useEffect, useMemo, useState } from "react";
import type { LogisticsRouteSummary } from "@universe/types";
import { commodityGroupLabel } from "@universe/types";
import { RankedTile, RankedTileGrid, SCORE_BAND_COLORS, ScoreLegend, StatTile, StatTileGrid, ThermometerIcon, TrendingUpIcon, ClockIcon, WorldMap, bandForScore, type RankedRow, type WorldMapArc, type WorldMapPoint, CollapsibleSection } from "@universe/ui";
import { ModeDotPlot, ModeLegend, MODE_FILL, MODE_NAME, type DotRow } from "../../components/ModeDotPlot";
import { apiClient } from "../../lib/apiClient";
import { InsightsFilterBar, setInsightsFilters, useInsightsFilters } from "../../lib/filters";
import { totalsOf } from "../../lib/geo";
import { useCountries } from "../../lib/useCountries";
import { DataTable, type Col } from "../../components/DataTable";
import { SourceNote } from "../../components/SourceNote";
import { LogisticsTrend } from "../../components/LogisticsTrend";
import { Card, ErrorNote, Heading, Page, pill } from "../../lib/ui";

const MODES = ["SEA", "AIR", "LAND"] as const;
const FILL = MODE_FILL;
const fmt = (n: number) => Math.round(n).toLocaleString("en-GB");
const pct = (n: number) => `${Math.round(n * 100)}%`;
const h2: React.CSSProperties = { margin: 0, fontFamily: "var(--u-font-display)", fontSize: 16 };
const sub: React.CSSProperties = { margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" };
const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 12.5, fontWeight: 600, borderBottom: "1px solid var(--u-border)", color: "var(--u-ink)" };
const td: React.CSSProperties = { padding: "8px 10px", fontSize: 13.5, verticalAlign: "middle" };

export default function ModesPage() {
  const countries = useCountries();
  const f = useInsightsFilters();
  const [all, setAll] = useState<LogisticsRouteSummary[] | null>(null);
  const [mode, setMode] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { apiClient.insightsLogisticsRoutes({}).then(setAll).catch((e) => { setAll([]); setErr(e instanceof Error ? e.message : "Could not load transport data."); }); }, []);
  const idx = useMemo(() => new Map(countries.map((c) => [c.code, c])), [countries]);

  const commodities = useMemo(() => [...new Set((all ?? []).map((r) => r.commodityGroup).filter((c): c is string => !!c))].sort(), [all]);
  const rows = useMemo(() => (all ?? []).filter((r) => !f.commodity || r.commodityGroup === f.commodity), [all, f.commodity]);
  const byMode = useMemo(() => Object.fromEntries(MODES.map((m) => [m, totalsOf(rows.filter((r) => r.transportMode === m))])), [rows]) as Record<(typeof MODES)[number], ReturnType<typeof totalsOf>>;
  const total = useMemo(() => totalsOf(rows), [rows]);
  const loading = all === null;
  const share = (m: (typeof MODES)[number]) => (total.shipments ? byMode[m].shipments / total.shipments : 0);
  const premium = byMode.SEA.avgCo2 > 0 && byMode.AIR.shipments ? byMode.AIR.avgCo2 / byMode.SEA.avgCo2 : null;

  // ---- speed against CO2: one mark per product group and mode
  const points: { id: string; label: string; commodity: string; mode: string; days: number; co2: number; shipments: number }[] = useMemo(() => {
    const m = new Map<string, LogisticsRouteSummary[]>();
    for (const r of rows) if (r.transportMode && r.commodityGroup && r.avgDurationDays !== null) { const k = `${r.commodityGroup}|${r.transportMode}`; m.set(k, [...(m.get(k) ?? []), r]); }
    return [...m.entries()].map(([k, list]) => {
      const [commodity, md] = k.split("|") as [string, string]; const t = totalsOf(list);
      return { id: k, label: commodityGroupLabel(commodity), commodity, mode: md, days: t.avgDays ?? 0, co2: t.avgCo2, shipments: t.shipments };
    }).filter((p) => p.shipments > 0 && p.co2 > 0);
  }, [rows]);

  const dotRows: DotRow[] = useMemo(() => {
    const by = new Map<string, typeof points>();
    for (const p of points) by.set(p.commodity, [...(by.get(p.commodity) ?? []), p]);
    return [...by.entries()].map(([commodity, list]) => ({
      id: commodity, label: list[0]!.label,
      marks: list.map((p) => ({
        key: p.id, mode: p.mode, value: p.co2, size: p.shipments, tipTitle: `${p.label}, ${MODE_NAME[p.mode] ?? p.mode}`,
        tipRows: [{ label: "kg CO2e per shipment", value: Math.round(p.co2).toLocaleString("en-GB") }, { label: "Average days", value: String(Math.round(p.days)) }, { label: "Shipments", value: p.shipments.toLocaleString("en-GB") }],
        aria: `${p.label}, ${MODE_NAME[p.mode] ?? p.mode}: about ${Math.round(p.days)} days, ${Math.round(p.co2).toLocaleString("en-GB")} kg CO2e per shipment, ${p.shipments.toLocaleString("en-GB")} shipments`,
      })),
    })).sort((a, b) => Math.max(...b.marks.map((m) => m.value)) - Math.max(...a.marks.map((m) => m.value)));
  }, [points]);

  // ---- which mode carries which goods
  const mix = useMemo(() => {
    const m = new Map<string, LogisticsRouteSummary[]>();
    for (const r of rows) if (r.commodityGroup) m.set(r.commodityGroup, [...(m.get(r.commodityGroup) ?? []), r]);
    return [...m.entries()].map(([c, list]) => { const t = totalsOf(list); const parts = Object.fromEntries(MODES.map((md) => [md, totalsOf(list.filter((r) => r.transportMode === md)).shipments / (t.shipments || 1)])) as Record<(typeof MODES)[number], number>; return { commodity: c, n: t.shipments, parts }; }).sort((a, b) => b.parts.AIR - a.parts.AIR);
  }, [rows]);

  // ---- league tiles
  const league = useMemo(() => {
    const airRows: RankedRow[] = []; const seaDays: RankedRow[] = [];
    for (const c of commodities) {
      const cr = rows.filter((r) => r.commodityGroup === c);
      const a = totalsOf(cr.filter((r) => r.transportMode === "AIR")), s = totalsOf(cr.filter((r) => r.transportMode === "SEA"));
      if (a.shipments >= 30 && s.shipments >= 30 && s.avgCo2 > 0) airRows.push({ id: c, label: commodityGroupLabel(c), value: a.avgCo2 / s.avgCo2, color: "var(--u-accent-magenta)" });
      if (s.shipments >= 30 && s.avgDays !== null) seaDays.push({ id: c, label: commodityGroupLabel(c), value: s.avgDays, color: "var(--u-brand-violet)" });
    }
    return { air: airRows.sort((a, b) => b.value - a.value), sea: seaDays.sort((a, b) => b.value - a.value) };
  }, [rows, commodities]);

  // ---- map: busiest routes for the chosen mode(s), arcs coloured by mode
  const map = useMemo(() => {
    const use = rows.filter((r) => !mode || r.transportMode === mode);
    const pairs = new Map<string, { a: string; b: string; md: string; n: number; dist: number; eff: number }>();
    for (const r of use) if (r.manufactureCountryCode && r.destinationCountryCode && r.transportMode) {
      const k = `${r.manufactureCountryCode}>${r.destinationCountryCode}>${r.transportMode}`; const e = pairs.get(k) ?? { a: r.manufactureCountryCode, b: r.destinationCountryCode, md: r.transportMode, n: 0, dist: 0, eff: 0 };
      e.n += r.shipmentCount; e.dist += r.avgDistanceKm * r.shipmentCount; e.eff += r.avgEfficiencyScore * r.shipmentCount; pairs.set(k, e);
    }
    const top = [...pairs.values()].sort((x, y) => y.n - x.n).slice(0, 20);
    const arcs: WorldMapArc[] = []; const ends = new Map<string, { id: string; md: string; n: number }>();
    for (const p of top) {
      const A = idx.get(p.a), B = idx.get(p.b); if (!A || !B || A.latitude === null || A.longitude === null || B.latitude === null || B.longitude === null) continue;
      const band = bandForScore(p.eff / p.n);
      arcs.push({ id: `${p.a}>${p.b}>${p.md}`, from: { latitude: A.latitude, longitude: A.longitude }, to: { latitude: B.latitude, longitude: B.longitude }, color: FILL[p.md] ?? "var(--u-ink-secondary)", label: `${A.name} → ${B.name} by ${MODE_NAME[p.md]?.toLowerCase()} — ${fmt(p.n)} shipments`, tooltipLines: [{ text: `~${fmt(p.dist / p.n)} km` }, { text: `Efficiency ${(p.eff / p.n).toFixed(1)}/10`, color: SCORE_BAND_COLORS[band] }] });
      for (const code of [p.a, p.b]) { const e = ends.get(`${code}|${p.md}`) ?? { id: code, md: p.md, n: 0 }; e.n += p.n; ends.set(`${code}|${p.md}`, e); }
    }
    const points: WorldMapPoint[] = [];
    for (const e of ends.values()) { const c = idx.get(e.id); if (c && c.latitude !== null && c.longitude !== null) points.push({ id: `${e.id}|${e.md}`, latitude: c.latitude, longitude: c.longitude, label: `${c.name} (${MODE_NAME[e.md]?.toLowerCase()})`, color: FILL[e.md] ?? "var(--u-ink-secondary)", value: e.n }); }
    return { arcs, points };
  }, [rows, mode, idx]);

  const speedCols: Col<(typeof points)[number]>[] = [
    { key: "group", header: "Product group", value: (p) => p.label, filter: true },
    { key: "mode", header: "Mode", value: (p) => MODE_NAME[p.mode] ?? p.mode, filter: true },
    { key: "days", header: "Average days", align: "right", value: (p) => Math.round(p.days), render: (p) => p.days.toFixed(0) },
    { key: "co2", header: "kg CO2e per shipment", align: "right", value: (p) => Math.round(p.co2), render: (p) => fmt(p.co2) },
    { key: "ship", header: "Shipments", align: "right", value: (p) => p.shipments, render: (p) => fmt(p.shipments) },
  ];
  const pickMode = (m: string) => setMode((cur) => (cur === m ? "" : m));
  const measures: { label: string; value: (m: (typeof MODES)[number]) => number | null; show: (v: number) => string }[] = [
    { label: "Shipments", value: (m) => byMode[m].shipments, show: fmt },
    { label: "Average distance (km)", value: (m) => byMode[m].avgDistance, show: fmt },
    { label: "Average days in transit", value: (m) => byMode[m].avgDays, show: (v) => v.toFixed(0) },
    { label: "Average CO2e per shipment (kg)", value: (m) => byMode[m].avgCo2, show: fmt },
    { label: "Average efficiency score (out of 10)", value: (m) => byMode[m].avgScore, show: (v) => v.toFixed(1) },
  ];

  return (
    <Page>
      <Heading title="Shipping modes" sub="Air, sea and land compared: how much moves each way, how long it takes, what it costs in CO2 and what each carries. Anonymised across the platform; a figure is only shown when at least five organisations are behind it." actions={<ScoreLegend />} />
      <ErrorNote message={err} />
      <InsightsFilterBar commodities={commodities} hideMode />

      <StatTileGrid>
        <StatTile label="Shipped by sea" value={loading ? "…" : pct(share("SEA"))} icon={<TrendingUpIcon size={18} />} active={mode === "SEA"} onClick={() => pickMode("SEA")} />
        <StatTile label="Shipped by air" value={loading ? "…" : pct(share("AIR"))} icon={<TrendingUpIcon size={18} />} tone="neutral" active={mode === "AIR"} onClick={() => pickMode("AIR")} />
        <StatTile label="Air CO2e compared with sea, per shipment" value={loading ? "…" : premium ? `${premium.toFixed(0)} times` : "—"} icon={<ThermometerIcon size={18} />} tone="neutral" onClick={() => setMode("")} />
        <StatTile label="Average days in transit" value={loading ? "…" : total.avgDays !== null ? total.avgDays.toFixed(0) : "—"} icon={<ClockIcon size={18} />} tone="neutral" onClick={() => setMode("")} />
      </StatTileGrid>

      <LogisticsTrend title="Shipping modes over time" commodity={f.commodity} mode={mode} exportName="modes-over-time" initialMetric="shipments" initialSplit="mode" />

      <CollapsibleSection title="How do the modes compare?" level={2} bare>
        <p style={sub}>Select a mode to focus the map below on it. Bars are scaled to the largest mode in each row.</p>
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 520 }}>
              <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Transport modes compared on shipments, distance, days in transit, CO2e and efficiency</caption>
              <thead><tr><td style={th} />{MODES.map((m) => <th key={m} scope="col" style={th}><button type="button" className="u-touch" style={pill(mode === m)} aria-pressed={mode === m} onClick={() => pickMode(m)}>{MODE_NAME[m]}</button></th>)}</tr></thead>
              <tbody>
                {measures.map((ms) => {
                  const vals = MODES.map((m) => ms.value(m)); const max = Math.max(1e-9, ...vals.map((v) => v ?? 0));
                  return (
                    <tr key={ms.label} style={{ borderBottom: "1px solid var(--u-border)" }}>
                      <th scope="row" style={{ ...td, textAlign: "left", fontWeight: 600 }}>{ms.label}</th>
                      {MODES.map((m, i) => { const v = vals[i]; return (
                        <td key={m} style={td}>{v === null || v === undefined || !byMode[m].shipments ? <span style={{ color: "var(--u-ink-secondary)" }}>–</span> : <>
                          <span style={{ fontWeight: 700 }}>{ms.show(v)}</span>
                          <span aria-hidden style={{ display: "block", height: 6, borderRadius: 3, backgroundColor: "var(--u-surface-alt)", marginTop: 4 }}><span style={{ display: "block", height: "100%", borderRadius: 3, width: `${Math.max(3, (v / max) * 100)}%`, backgroundColor: FILL[m] }} /></span></>}</td>
                      ); })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      <SourceNote keys={["logistics"]} />
      </CollapsibleSection>

      <CollapsibleSection title="What does speed cost in CO2?" level={2} bare>
        <p style={sub}>Each row is a product group and each mark a transport mode; further left is cleaner. Select a mark to see its days in transit and CO2, or to filter the page to that product group.</p>
        <Card>
          <ModeLegend note="Larger mark: more shipments. The line joins the modes for the same product group." />
          <ModeDotPlot rows={dotRows} activeMode={mode} axisLabel="kg CO2e per shipment (log scale)" tick={(v) => v.toLocaleString("en-GB")} ariaLabel="Chart of average CO2e per shipment for each product group, one mark per transport mode. Days in transit are in each mark's details and in the table below." onSelect={(id) => setInsightsFilters({ commodity: id })} />
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Show the data as a table</summary>
            <div style={{ marginTop: 8 }}>
              <DataTable<(typeof points)[number]> rows={points} rowKey={(p) => p.id} columns={speedCols} caption="Average days in transit and CO2e per shipment by product group and mode" exportName="modes-speed-vs-co2" />
            </div>
          </details>
        </Card>
      <SourceNote keys={["logistics"]} />
      </CollapsibleSection>

      <CollapsibleSection title="Which mode carries which goods?" level={2} bare>
        <p style={sub}>Share of each product group's shipments by air, sea and land, ordered by how much goes by air. Select a row to filter the page to that group.</p>
        <Card>
          {mix.length === 0 ? <p style={{ margin: 0, fontSize: 14, color: "var(--u-ink-secondary)" }}>{loading ? "Loading…" : "No route has enough contributors to show yet."}</p> : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {mix.map((r) => {
                const text = MODES.filter((m) => r.parts[m] > 0).map((m) => `${MODE_NAME[m]} ${pct(r.parts[m])}`).join(", ");
                return (
                  <li key={r.commodity}>
                    <button type="button" onClick={() => setInsightsFilters({ commodity: r.commodity })} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }} aria-label={`${commodityGroupLabel(r.commodity)}: ${text}. Select to filter the page to this group.`}>
                      <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, marginBottom: 4, flexWrap: "wrap" }}><span style={{ fontWeight: 600 }}>{commodityGroupLabel(r.commodity)}</span><span style={{ color: "var(--u-ink-secondary)" }}>{text}</span></span>
                      <span aria-hidden style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", backgroundColor: "var(--u-surface-alt)" }}>
                        {MODES.map((m) => <span key={m} style={{ width: `${r.parts[m] * 100}%`, backgroundColor: FILL[m] }} />)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div role="group" aria-label="Key" style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, marginTop: 12 }}>{MODES.map((m) => <span key={m} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: FILL[m] }} />{MODE_NAME[m]}</span>)}</div>
        </Card>
      <SourceNote keys={["logistics"]} />
      </CollapsibleSection>

      <CollapsibleSection title="Where the modes differ most" level={2} bare>
        <p style={sub}>Product groups with at least thirty shipments by each mode compared.</p>
        <RankedTileGrid>
          <RankedTile label="Biggest air premium (times the sea CO2e)" icon={<ThermometerIcon size={18} />} tone="var(--u-brand-violet)" rows={league.air} limit={5} onRowClick={(r) => setInsightsFilters({ commodity: r.id })} formatValue={(v) => `${v.toFixed(0)} times`} emptyMessage="Not enough shipments to compare yet." />
          <RankedTile label="Longest sea transit (days)" icon={<ClockIcon size={18} />} tone="var(--u-brand-violet)" rows={league.sea} limit={5} onRowClick={(r) => setInsightsFilters({ commodity: r.id })} formatValue={(v) => `${v.toFixed(0)} days`} emptyMessage="Not enough shipments to compare yet." />
        </RankedTileGrid>
      <SourceNote keys={["logistics", "efficiency"]} />
      </CollapsibleSection>

      <CollapsibleSection title="Where does each mode run?" level={2} bare>
        <div role="group" aria-label="Mode on the map" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" className="u-touch" style={pill(mode === "")} aria-pressed={mode === ""} onClick={() => setMode("")}>All modes</button>
          {MODES.map((m) => <button key={m} type="button" className="u-touch" style={pill(mode === m)} aria-pressed={mode === m} onClick={() => pickMode(m)}>{MODE_NAME[m]}</button>)}
        </div>
        <p style={sub}>The twenty busiest routes, drawn in the colour of their mode: sea violet, air magenta, land green.</p>
        <WorldMap points={map.points} arcs={map.arcs} legend={MODES.map((m) => ({ color: FILL[m], label: MODE_NAME[m] }))} maxHeight={440} emptyMessage={loading ? "Loading…" : "No route has enough contributors to show for this selection."} />
      <SourceNote keys={["logistics", "regions"]} />
      </CollapsibleSection>
    </Page>
  );
}
