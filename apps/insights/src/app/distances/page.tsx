"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { InsightsFreightRate, InsightsPriceMovement, LogisticsRouteSummary } from "@universe/types";
import { StatTile, StatTileGrid, ClockIcon, GaugeIcon, GlobeIcon, TrendingUpIcon, WorldMap, type WorldMapArc, type WorldMapPoint } from "@universe/ui";
import { ModeDotPlot, ModeLegend, type DotRow } from "../../components/ModeDotPlot";
import { DataTable, type Col } from "../../components/DataTable";
import { MovementChart, type MovementLine } from "../../components/MovementChart";
import { MODE_NAME } from "../../components/ModeDotPlot";
import { readParam, useViewBridge } from "../../lib/views";
import { apiClient } from "../../lib/apiClient";
import { fmtMoney, monthLabel, regionLabel } from "../../lib/format";
import { totalsOf } from "../../lib/geo";
import { useCountries } from "../../lib/useCountries";
import { SourceNote } from "../../components/SourceNote";
import { Card, ErrorNote, Heading, Page, pill } from "../../lib/ui";

const h2: React.CSSProperties = { margin: 0, fontFamily: "var(--u-font-display)", fontSize: 16 };
const sub: React.CSSProperties = { margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" };
const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 12.5, fontWeight: 600, borderBottom: "1px solid var(--u-border)", color: "var(--u-ink)" };
const td: React.CSSProperties = { padding: "8px 10px", fontSize: 13.5, verticalAlign: "middle" };
const FILL: Record<string, string> = { AIR: "var(--u-accent-magenta)", SEA: "var(--u-brand-violet)", LAND: "var(--u-status-good)" };
const DASH: Record<string, string | undefined> = { SEA: undefined, AIR: "7 4", LAND: "2 3" };
const BANDS: { id: string; label: string; from: number; to: number }[] = [
  { id: "b1", label: "Under 2,000 km", from: 0, to: 2000 }, { id: "b2", label: "2,000 to 5,000 km", from: 2000, to: 5000 }, { id: "b3", label: "5,000 to 8,000 km", from: 5000, to: 8000 },
  { id: "b4", label: "8,000 to 12,000 km", from: 8000, to: 12000 }, { id: "b5", label: "Over 12,000 km", from: 12000, to: Infinity },
];
const fmt = (n: number) => Math.round(n).toLocaleString("en-GB");
const bandOf = (km: number) => BANDS.find((b) => km >= b.from && km < b.to)!;
const lane = (r: InsightsFreightRate) => `${regionLabel(r.originRegion)} to ${regionLabel(r.destinationRegion)}`;

export default function DistancesPage() {
  const countries = useCountries();
  const idx = useMemo(() => new Map(countries.map((c) => [c.code, c])), [countries]);
  const [routes, setRoutes] = useState<LogisticsRouteSummary[] | null>(null);
  const [rates, setRates] = useState<InsightsFreightRate[] | null>(null);
  const [mv, setMv] = useState<InsightsPriceMovement[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState("");
  const [currency, setCurrency] = useState("");
  const bandsRef = useRef<HTMLElement>(null), rateRef = useRef<HTMLElement>(null), moveRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const fail = (what: string) => (e: unknown) => setErr(e instanceof Error ? e.message : `Could not load ${what}.`);
    apiClient.insightsLogisticsRoutes({}).then(setRoutes).catch((e) => { setRoutes([]); fail("distances")(e); });
    apiClient.insightsFreightRates().then(setRates).catch((e) => { setRates([]); fail("freight cost")(e); });
    apiClient.insightsFreightMovement().then(setMv).catch((e) => { setMv([]); fail("freight cost movement")(e); });
  }, []);

  const currencies = useMemo(() => [...new Set((rates ?? []).map((r) => r.currency))].sort(), [rates]);
  useEffect(() => { if (currencies.length && !currencies.includes(currency)) setCurrency(currencies.includes("USD") ? "USD" : currencies[0]!); }, [currencies, currency]);

  const rows = useMemo(() => (routes ?? []).filter((r) => !mode || r.transportMode === mode), [routes, mode]);
  const total = useMemo(() => totalsOf(rows), [rows]);
  const rateRows = useMemo(() => (rates ?? []).filter((r) => r.currency === currency && (!mode || r.freightMode === mode)), [rates, currency, mode]);
  const wavg = (f: (r: InsightsFreightRate) => number) => { const n = rateRows.reduce((a, r) => a + r.shipments, 0); return n ? rateRows.reduce((a, r) => a + f(r) * r.shipments, 0) / n : null; };
  const perTonne = wavg((r) => r.avgCostPerTonne), perTonneKm = wavg((r) => r.avgCostPerTonneKm);
  const daysPer1000 = total.avgDays !== null && total.avgDistance > 0 ? (total.avgDays / total.avgDistance) * 1000 : null;
  const loading = routes === null || rates === null;
  const laneCols: Col<InsightsFreightRate>[] = [
    { key: "lane", header: "Lane", value: lane },
    { key: "mode", header: "Mode", value: (r) => MODE_NAME[r.freightMode] ?? r.freightMode, filter: true },
    { key: "km", header: "Distance (km)", align: "right", value: (r) => Math.round(r.avgDistanceKm), render: (r) => fmt(r.avgDistanceKm) },
    { key: "tonne", header: "Per tonne", align: "right", value: (r) => r.avgCostPerTonne, render: (r) => <>{fmtMoney(r.avgCostPerTonne)}<span style={{ display: "block", fontSize: 11.5, color: "var(--u-ink-secondary)" }}>{fmtMoney(r.minCostPerTonne)} to {fmtMoney(r.maxCostPerTonne)}</span></> },
    { key: "tkm", header: "Per tonne-km", value: (r) => r.avgCostPerTonneKm, render: (r) => <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span aria-hidden style={{ height: 8, width: `${Math.max(4, (r.avgCostPerTonneKm / maxKmRate) * 100)}%`, maxWidth: 110, borderRadius: 4, background: FILL[r.freightMode] ?? "var(--u-ink-secondary)" }} /><span>{r.avgCostPerTonneKm.toFixed(3)}</span></div> },
    { key: "orgs", header: "Organisations", align: "right", value: (r) => r.sourceCount },
  ];
  const scroll = (r: React.RefObject<HTMLElement>) => r.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ---- distance bands
  const bands = useMemo(() => BANDS.map((b) => {
    const br = rows.filter((r) => r.avgDistanceKm >= b.from && r.avgDistanceKm < b.to);
    const t = totalsOf(br);
    const fr = rateRows.filter((r) => bandOf(r.avgDistanceKm).id === b.id);
    const n = fr.reduce((a, r) => a + r.shipments, 0);
    return { ...b, t, share: total.shipments ? t.shipments / total.shipments : 0, cost: n ? fr.reduce((a, r) => a + r.avgCostPerTonne * r.shipments, 0) / n : null };
  }), [rows, rateRows, total.shipments]);

  // ---- scatter and rate card
  const dotRows: DotRow[] = useMemo(() => {
    const byLane = new Map<string, InsightsFreightRate[]>();
    for (const r of rateRows) { const k = lane(r); byLane.set(k, [...(byLane.get(k) ?? []), r]); }
    return [...byLane.entries()].map(([label, list]) => ({
      id: label, label,
      marks: list.map((r) => ({
        key: `${r.freightMode}|${r.originRegion}|${r.destinationRegion}`, mode: r.freightMode, value: r.avgCostPerTonne, size: r.shipments,
        tipTitle: `${label}, ${MODE_NAME[r.freightMode] ?? r.freightMode}`,
        tipRows: [{ label: "Cost per tonne", value: `${fmtMoney(r.avgCostPerTonne)} ${currency}` }, { label: "Distance", value: `${Math.round(r.avgDistanceKm).toLocaleString("en-GB")} km` }, { label: "Shipments", value: r.shipments.toLocaleString("en-GB") }],
        aria: `${label}, ${MODE_NAME[r.freightMode] ?? r.freightMode}: ${fmtMoney(r.avgCostPerTonne)} ${currency} per tonne over ${Math.round(r.avgDistanceKm).toLocaleString("en-GB")} km, ${r.shipments.toLocaleString("en-GB")} shipments`,
      })),
    })).sort((a, b) => Math.max(...b.marks.map((m) => m.value)) - Math.max(...a.marks.map((m) => m.value)));
  }, [rateRows, currency]); // eslint-disable-line react-hooks/exhaustive-deps
  const card = [...rateRows].sort((a, b) => b.avgCostPerTonneKm - a.avgCostPerTonneKm);
  const maxKmRate = Math.max(1e-9, ...card.map((r) => r.avgCostPerTonneKm));

  // ---- freight cost movement by mode
  const lines: MovementLine[] = (mv ?? []).filter((s) => s.segmentBy === null && s.currency === currency && (!mode || s.category === mode)).map((s) => ({ id: s.category, name: `${MODE_NAME[s.category] ?? s.category} freight`, color: FILL[s.category] ?? "var(--u-ink)", dash: DASH[s.category], points: s.points.map((p) => ({ label: monthLabel(p.month), index: p.index, sources: p.sourceCount })) }));

  // ---- longest corridors on the map
  const long = useMemo(() => {
    const m = new Map<string, { a: string; b: string; md: string; n: number; km: number }>();
    for (const r of rows) if (r.manufactureCountryCode && r.destinationCountryCode && r.transportMode) {
      const k = `${r.manufactureCountryCode}>${r.destinationCountryCode}>${r.transportMode}`; const e = m.get(k) ?? { a: r.manufactureCountryCode, b: r.destinationCountryCode, md: r.transportMode, n: 0, km: 0 };
      e.n += r.shipmentCount; e.km += r.avgDistanceKm * r.shipmentCount; m.set(k, e);
    }
    return [...m.values()].filter((e) => e.n >= 30).map((e) => ({ ...e, km: e.km / e.n })).sort((x, y) => y.km - x.km).slice(0, 15);
  }, [rows]);
  const arcs: WorldMapArc[] = long.flatMap((e) => {
    const A = idx.get(e.a), B = idx.get(e.b); if (!A || !B || A.latitude === null || A.longitude === null || B.latitude === null || B.longitude === null) return [];
    return [{ id: `${e.a}>${e.b}>${e.md}`, from: { latitude: A.latitude, longitude: A.longitude }, to: { latitude: B.latitude, longitude: B.longitude }, color: FILL[e.md] ?? "var(--u-ink-secondary)", label: `${A.name} to ${B.name} by ${MODE_NAME[e.md]?.toLowerCase()}`, tooltipLines: [{ text: `${fmt(e.km)} km, ${e.n.toLocaleString("en-GB")} shipments` }] }];
  });

  const ends: WorldMapPoint[] = [...new Set(long.flatMap((e) => [e.a, e.b]))].flatMap((code) => {
    const c = idx.get(code); if (!c || c.latitude === null || c.longitude === null) return [];
    return [{ id: code, latitude: c.latitude, longitude: c.longitude, label: c.name, color: "var(--u-org-accent, var(--u-brand-violet))", value: 1 }];
  });

  const longCols: Col<(typeof long)[number]>[] = [
    { key: "from", header: "From", value: (e) => idx.get(e.a)?.name ?? e.a },
    { key: "to", header: "To", value: (e) => idx.get(e.b)?.name ?? e.b },
    { key: "mode", header: "Mode", value: (e) => MODE_NAME[e.md] ?? e.md, filter: true },
    { key: "km", header: "Distance (km)", align: "right", value: (e) => Math.round(e.km), render: (e) => fmt(e.km) },
    { key: "n", header: "Shipments", align: "right", value: (e) => e.n, render: (e) => e.n.toLocaleString("en-GB") },
  ];

  useViewBridge(() => ({ mode, currency }), (s) => { if (s.mode !== undefined) setMode(s.mode); if (s.currency) setCurrency(s.currency); });

  return (
    <Page>
      <Heading title="Distances" sub="How far goods travel and what it costs to move them: distance, time and CO2e, and freight cost per tonne and per tonne-kilometre. Freight cost is what the forwarder charges before any margin. Anonymised; a figure is only shown when at least five organisations are behind it." />
      <ErrorNote message={err} />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div role="group" aria-label="Transport mode" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[["", "All modes"], ["SEA", "Sea"], ["AIR", "Air"], ["LAND", "Land"]].map(([k, l]) => <button key={k} type="button" className="u-touch" style={pill(mode === k)} aria-pressed={mode === k} onClick={() => setMode(k!)}>{l}</button>)}
        </div>
        {currencies.length > 1 && (
          <div role="group" aria-label="Currency" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5, fontWeight: 600 }}>
            Currency (not converted)
            {currencies.map((c) => <button key={c} type="button" className="u-touch" style={pill(currency === c)} aria-pressed={currency === c} onClick={() => setCurrency(c)}>{c}</button>)}
          </div>
        )}
      </div>

      <StatTileGrid>
        <StatTile label="Average distance (km)" value={loading ? "…" : total.shipments ? fmt(total.avgDistance) : "—"} icon={<GlobeIcon size={18} />} onClick={() => scroll(bandsRef)} />
        <StatTile label="Days in transit per 1,000 km" value={loading ? "…" : daysPer1000 !== null ? daysPer1000.toFixed(1) : "—"} icon={<ClockIcon size={18} />} tone="neutral" onClick={() => scroll(bandsRef)} />
        <StatTile label={`Freight cost per tonne${currency ? ` (${currency})` : ""}`} value={loading ? "…" : perTonne !== null ? fmtMoney(perTonne) : "—"} icon={<TrendingUpIcon size={18} />} tone="neutral" onClick={() => scroll(rateRef)} />
        <StatTile label={`Freight cost per tonne-km${currency ? ` (${currency})` : ""}`} value={loading ? "…" : perTonneKm !== null ? perTonneKm.toFixed(3) : "—"} icon={<GaugeIcon size={18} />} tone="neutral" onClick={() => scroll(moveRef)} />
      </StatTileGrid>

      <section ref={bandsRef} aria-labelledby="d-bands" style={{ display: "flex", flexDirection: "column", gap: 10, scrollMarginTop: 12 }}>
        <h2 id="d-bands" style={h2}>What changes with distance?</h2>
        <p style={sub}>Shipments grouped by how far they travel: how much of the volume sits in each band, how long it takes, how much CO2e a shipment carries and what freight costs per tonne.</p>
        <Card>
          {loading ? <p style={{ margin: 0 }}>Loading…</p> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }}>
                <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Shipments, days in transit, CO2e and freight cost per tonne by distance band</caption>
                <thead><tr><th scope="col" style={th}>Distance</th><th scope="col" style={th}>Share of shipments</th><th scope="col" style={{ ...th, textAlign: "right" }}>Days</th><th scope="col" style={{ ...th, textAlign: "right" }}>kg CO2e each</th><th scope="col" style={{ ...th, textAlign: "right" }}>Freight per tonne{currency ? ` (${currency})` : ""}</th></tr></thead>
                <tbody>{bands.map((b) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid var(--u-border)" }}>
                    <th scope="row" style={{ ...td, textAlign: "left", fontWeight: 600 }}>{b.label}</th>
                    <td style={td}>{b.t.shipments ? <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span aria-hidden style={{ height: 8, width: `${Math.max(3, b.share * 100)}%`, maxWidth: 140, borderRadius: 4, background: "var(--u-org-accent, var(--u-brand-violet))" }} /><span>{Math.round(b.share * 100)}% <span style={{ color: "var(--u-ink-secondary)" }}>({fmt(b.t.shipments)})</span></span></div> : <span style={{ color: "var(--u-ink-secondary)" }}>–</span>}</td>
                    <td style={{ ...td, textAlign: "right" }}>{b.t.avgDays !== null ? b.t.avgDays.toFixed(0) : "–"}</td>
                    <td style={{ ...td, textAlign: "right" }}>{b.t.shipments ? fmt(b.t.avgCo2) : "–"}</td>
                    <td style={{ ...td, textAlign: "right" }}>{b.cost !== null ? fmtMoney(b.cost) : "–"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      <SourceNote keys={["freight", "logistics"]} />
      </section>

      <section ref={rateRef} aria-labelledby="d-rates" style={{ display: "flex", flexDirection: "column", gap: 10, scrollMarginTop: 12 }}>
        <h2 id="d-rates" style={h2}>Freight cost by lane</h2>
        <p style={sub}>Each row is a lane (one region to another) and each mark a transport mode, further right meaning dearer. Sea is far cheaper per tonne than air over the same distance; the table gives the exact rates and the cost per tonne-kilometre.</p>
        <Card>
          {rates === null ? <p style={{ margin: 0 }}>Loading…</p> : rateRows.length === 0 ? (
            <p style={{ margin: 0, fontSize: 14, color: "var(--u-ink-secondary)" }}>No lane has freight cost from at least five organisations yet. Freight cost appears here once organisations record the freight price on their projects.</p>
          ) : (
            <>
              <ModeLegend note="Larger mark: more shipments. The line joins the modes on the same lane." />
              <ModeDotPlot rows={dotRows} axisLabel={`${currency} per tonne (log scale)`} tick={(v) => fmtMoney(v)} ariaLabel={`Chart of freight cost per tonne in ${currency} for each lane, one mark per transport mode. The same figures are in the table below.`} />
              <details style={{ marginTop: 10 }} open>
                <summary style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 600 }}>Show the data as a table</summary>
                <div style={{ marginTop: 8 }}>
                  <DataTable<InsightsFreightRate> rows={card} rowKey={(r) => `${r.freightMode}|${r.originRegion}|${r.destinationRegion}`} columns={laneCols} caption={`Freight cost by lane and mode in ${currency}`} exportName={`freight-cost-by-lane-${currency}`} />
                </div>
              </details>
            </>
          )}
        </Card>
      <SourceNote keys={["freight", "logistics"]} />
      </section>

      <section ref={moveRef} aria-labelledby="d-move" style={{ display: "flex", flexDirection: "column", gap: 10, scrollMarginTop: 12 }}>
        <h2 id="d-move" style={h2}>Is freight getting dearer?</h2>
        <p style={sub}>Like-for-like movement in freight cost per tonne-kilometre, by mode: the same lanes and shipment sizes compared month on month, so a change in what was shipped does not look like a rate change. 100 is the first month shown.</p>
        <Card>
          {mv === null ? <p style={{ margin: 0 }}>Loading…</p> : <MovementChart lines={lines} title="Freight cost index" />}
          {lines.length > 0 && (
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 600 }}>Show the data as a table</summary>
              <div style={{ overflowX: "auto", marginTop: 8 }}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <caption style={{ textAlign: "left", color: "var(--u-ink-secondary)", padding: "4px 0" }}>Freight cost index by mode (100 = first month shown)</caption>
                  <thead><tr><th scope="col" style={th}>Mode</th><th scope="col" style={{ ...th, textAlign: "right" }}>From</th><th scope="col" style={{ ...th, textAlign: "right" }}>Latest index</th><th scope="col" style={{ ...th, textAlign: "right" }}>Change</th></tr></thead>
                  <tbody>{lines.map((l) => { const last = l.points[l.points.length - 1]!; const c = last.index - 100; return <tr key={l.id} style={{ borderBottom: "1px solid var(--u-border)" }}><th scope="row" style={{ ...td, textAlign: "left", fontWeight: 500 }}>{l.name}</th><td style={{ ...td, textAlign: "right" }}>{l.points[0]!.label}</td><td style={{ ...td, textAlign: "right" }}>{last.index.toFixed(1)}</td><td style={{ ...td, textAlign: "right" }}><span aria-hidden>{c > 0.05 ? "▲ " : c < -0.05 ? "▼ " : "▬ "}</span>{Math.abs(c) < 0.05 ? "No change" : `${c > 0 ? "+" : "−"}${Math.abs(c).toFixed(1)}%`}</td></tr>; })}</tbody>
                </table>
              </div>
            </details>
          )}
        </Card>
      <SourceNote keys={["freightMovement"]} />
      </section>

      <section aria-labelledby="d-long" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 id="d-long" style={h2}>The longest corridors</h2>
        <p style={sub}>The fifteen routes with the greatest average distance (at least 30 shipments each), coloured by transport mode.</p>
        <Card>
          {routes === null ? <p style={{ margin: 0 }}>Loading…</p> : <WorldMap points={ends} arcs={arcs} maxHeight={380} emptyMessage="No long route has enough contributors to show yet." />}
          {long.length > 0 && (
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 600 }}>Show the data as a table</summary>
              <div style={{ marginTop: 8 }}>
                <DataTable<(typeof long)[number]> rows={long} rowKey={(e) => `${e.a}${e.b}${e.md}`} columns={longCols} caption="Longest corridors by average distance" exportName="longest-corridors" />
              </div>
            </details>
          )}
        </Card>
      <SourceNote keys={["logistics"]} />
      </section>
    </Page>
  );
}
