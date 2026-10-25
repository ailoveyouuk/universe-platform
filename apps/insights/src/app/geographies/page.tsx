"use client";

import { useEffect, useMemo, useState } from "react";
import type { LogisticsRouteSummary } from "@universe/types";
import { GaugeIcon, GlobeIcon, RankedTile, RankedTileGrid, SCORE_BAND_COLORS, ScoreLegend, StatTile, StatTileGrid, TrendingUpIcon, WorldMap, bandForScore, type RankedRow, type WorldMapArc, type WorldMapLegendEntry, type WorldMapPoint } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { InsightsFilterBar, useInsightsFilters } from "../../lib/filters";
import { groupShipments, totalsOf } from "../../lib/geo";
import { REGION_LABEL } from "../../lib/format";
import { useCountries } from "../../lib/useCountries";
import { Card, ErrorNote, Heading, Page, pill } from "../../lib/ui";

type Layer = "made" | "delivered" | "flows" | "efficiency";
type Measure = "shipments" | "co2" | "score";
const LAYERS: { key: Layer; label: string; hint: string }[] = [
  { key: "made", label: "Where it is made", hint: "Each spot is a country of manufacture, sized by shipments." },
  { key: "delivered", label: "Where it is delivered", hint: "Each spot is a delivery country, sized by shipments." },
  { key: "flows", label: "Busiest flows", hint: "Dashed lines join the fifteen busiest manufacture-to-delivery pairs." },
  { key: "efficiency", label: "Efficiency by delivery country", hint: "Spots are coloured by the average efficiency score of what arrives there." },
];
const MEASURES: { key: Measure; label: string }[] = [{ key: "shipments", label: "Shipments" }, { key: "co2", label: "CO2e per shipment" }, { key: "score", label: "Efficiency score" }];
const REGIONS = Object.keys(REGION_LABEL);
const MODE_FILL: Record<string, string> = { AIR: "var(--u-accent-magenta)", SEA: "var(--u-brand-violet)", LAND: "var(--u-status-good)" };
const MODE_WORD: Record<string, string> = { AIR: "Air", SEA: "Sea", LAND: "Land" };
const BAND_WORD: Record<string, string> = { RED: "Poor", AMBER: "Fair", YELLOW: "Good", GREEN: "Excellent" };
const fmt = (n: number) => Math.round(n).toLocaleString("en-GB");
const h2: React.CSSProperties = { margin: 0, fontFamily: "var(--u-font-display)", fontSize: 16 };
const sub: React.CSSProperties = { margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" };

export default function GeographiesPage() {
  const countries = useCountries();
  const f = useInsightsFilters();
  const [all, setAll] = useState<LogisticsRouteSummary[] | null>(null);
  const [layer, setLayer] = useState<Layer>("flows");
  const [measure, setMeasure] = useState<Measure>("shipments");
  const [selected, setSelected] = useState<string | null>(null);
  const [pair, setPair] = useState<{ from: string; to: string } | null>(null);
  const [mapFocus, setMapFocus] = useState<{ id: string; nonce: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { apiClient.insightsLogisticsRoutes({}).then(setAll).catch((e) => { setAll([]); setErr(e instanceof Error ? e.message : "Could not load geography data."); }); }, []);
  const idx = useMemo(() => new Map(countries.map((c) => [c.code, c])), [countries]);
  const nameOf = (code: string | null) => (code ? idx.get(code)?.name ?? code : "—");
  const regionOf = (code: string | null) => (code ? idx.get(code)?.regionCode ?? null : null);

  const commodities = useMemo(() => [...new Set((all ?? []).map((r) => r.commodityGroup).filter((c): c is string => !!c))].sort(), [all]);
  // Rows after the shared filters, before the region pair, so the region grid always shows every cell.
  const base = useMemo(() => (all ?? []).filter((r) => (!f.commodity || r.commodityGroup === f.commodity) && (!f.mode || r.transportMode === f.mode)), [all, f.commodity, f.mode]);
  const rows = useMemo(() => (pair ? base.filter((r) => regionOf(r.manufactureCountryCode) === pair.from && regionOf(r.destinationCountryCode) === pair.to) : base), [base, pair, idx]); // eslint-disable-line react-hooks/exhaustive-deps
  const tot = useMemo(() => totalsOf(rows), [rows]);
  const made = useMemo(() => groupShipments(rows, (r) => r.manufactureCountryCode), [rows]);
  const delivered = useMemo(() => groupShipments(rows, (r) => r.destinationCountryCode), [rows]);
  const top3Share = tot.shipments ? made.slice(0, 3).reduce((a, m) => a + m.shipments, 0) / tot.shipments : 0;

  // ---- map layers
  const map = useMemo(() => {
    const points: WorldMapPoint[] = []; const arcs: WorldMapArc[] = [];
    const place = (code: string, id: string, label: string, color: string, value: number, lines?: { text: string }[]) => {
      const c = idx.get(code); if (c && c.latitude !== null && c.longitude !== null) points.push({ id, latitude: c.latitude, longitude: c.longitude, label, color, value, tooltipLines: lines });
    };
    if (layer === "made" || layer === "flows") made.forEach((m) => place(m.code, `m:${m.code}`, `${nameOf(m.code)} — made`, "var(--u-brand-violet)", m.shipments));
    if (layer === "delivered" || layer === "flows") delivered.forEach((d) => place(d.code, `d:${d.code}`, `${nameOf(d.code)} — delivered`, "var(--u-accent-magenta)", d.shipments));
    if (layer === "efficiency") {
      for (const d of delivered) {
        const t = totalsOf(rows.filter((r) => r.destinationCountryCode === d.code)); const b = bandForScore(t.avgScore);
        place(d.code, `d:${d.code}`, `${nameOf(d.code)} — delivered`, SCORE_BAND_COLORS[b], d.shipments, [{ text: `Efficiency ${t.avgScore.toFixed(1)}/10 (${BAND_WORD[b]})` }, { text: `${fmt(t.avgCo2)} kg CO2e per shipment` }]);
      }
    }
    if (layer === "flows") {
      const pairs = new Map<string, { a: string; b: string; n: number; dist: number; eff: number }>();
      for (const r of rows) if (r.manufactureCountryCode && r.destinationCountryCode) {
        const k = `${r.manufactureCountryCode}>${r.destinationCountryCode}`; const e = pairs.get(k) ?? { a: r.manufactureCountryCode, b: r.destinationCountryCode, n: 0, dist: 0, eff: 0 };
        e.n += r.shipmentCount; e.dist += r.avgDistanceKm * r.shipmentCount; e.eff += r.avgEfficiencyScore * r.shipmentCount; pairs.set(k, e);
      }
      for (const p of [...pairs.values()].sort((x, y) => y.n - x.n).slice(0, 15)) {
        const A = idx.get(p.a), B = idx.get(p.b); if (!A || !B || A.latitude === null || A.longitude === null || B.latitude === null || B.longitude === null) continue;
        const eff = p.eff / p.n; const band = bandForScore(eff);
        arcs.push({ id: `${p.a}>${p.b}`, from: { latitude: A.latitude, longitude: A.longitude }, to: { latitude: B.latitude, longitude: B.longitude }, color: "var(--u-ink-secondary)", label: `${A.name} → ${B.name} — ${fmt(p.n)} shipments`, tooltipLines: [{ text: `~${fmt(p.dist / p.n)} km` }, { text: `Efficiency ${eff.toFixed(1)}/10 (${BAND_WORD[band]})`, color: SCORE_BAND_COLORS[band] }] });
      }
    }
    return { points, arcs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer, rows, made, delivered, idx]);
  const legend: WorldMapLegendEntry[] = layer === "efficiency"
    ? (["GREEN", "YELLOW", "AMBER", "RED"] as const).map((b) => ({ color: SCORE_BAND_COLORS[b], label: `${BAND_WORD[b]} (${{ GREEN: "8–10", YELLOW: "6–7", AMBER: "4–5", RED: "1–3" }[b]})` }))
    : [
      ...(layer !== "delivered" ? [{ color: "var(--u-brand-violet)", label: "Made" }] : []),
      ...(layer !== "made" ? [{ color: "var(--u-accent-magenta)", label: "Delivered" }] : []),
      ...(layer === "flows" ? [{ color: "var(--u-ink-secondary)", label: "Dashed lines: the busiest pairs", shape: "line" as const }] : []),
    ];

  // ---- selected-country side panel
  const detail = useMemo(() => {
    if (!selected) return null;
    const asMaker = rows.filter((r) => r.manufactureCountryCode === selected);
    const asReceiver = rows.filter((r) => r.destinationCountryCode === selected);
    const touching = rows.filter((r) => r.manufactureCountryCode === selected || r.destinationCountryCode === selected);
    const modes = groupShipments(touching, (r) => r.transportMode);
    return {
      madeN: totalsOf(asMaker).shipments, recvN: totalsOf(asReceiver).shipments, t: totalsOf(touching), modes,
      sendsTo: groupShipments(asMaker, (r) => r.destinationCountryCode).slice(0, 5), receivesFrom: groupShipments(asReceiver, (r) => r.manufactureCountryCode).slice(0, 5),
    };
  }, [selected, rows]);

  // ---- region grid
  const grid = useMemo(() => {
    const cells = new Map<string, LogisticsRouteSummary[]>();
    for (const r of base) { const a = regionOf(r.manufactureCountryCode), b = regionOf(r.destinationCountryCode); if (!a || !b) continue; const k = `${a}>${b}`; cells.set(k, [...(cells.get(k) ?? []), r]); }
    const val = (k: string) => { const t = totalsOf(cells.get(k) ?? []); return !t.shipments ? null : measure === "shipments" ? t.shipments : measure === "co2" ? t.avgCo2 : t.avgScore; };
    const vals = [...cells.keys()].map(val).filter((v): v is number => v !== null); const max = Math.max(1, ...vals);
    return { val, max, has: (k: string) => (cells.get(k)?.length ?? 0) > 0, n: (k: string) => totalsOf(cells.get(k) ?? []).shipments };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, measure, idx]);
  const cellText = (v: number) => (measure === "shipments" ? fmt(v) : measure === "co2" ? `${fmt(v)} kg` : `${v.toFixed(1)}/10`);

  // ---- efficiency league
  const league = useMemo(() => {
    const out = delivered.filter((d) => d.shipments >= 30).map((d) => ({ code: d.code, score: totalsOf(rows.filter((r) => r.destinationCountryCode === d.code)).avgScore, n: d.shipments }));
    const row = (c: { code: string; score: number }, color: string): RankedRow => ({ id: `d:${c.code}`, label: nameOf(c.code), value: c.score, color });
    return { best: [...out].sort((a, b) => b.score - a.score).slice(0, 10).map((c) => row(c, "var(--u-status-good)")), worst: [...out].sort((a, b) => a.score - b.score).slice(0, 10).map((c) => row(c, "var(--u-status-critical)")) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivered, rows, idx]);

  const loading = all === null;
  const focusCountry = (id: string) => { setMapFocus({ id, nonce: Date.now() }); setSelected(id.split(":")[1] ?? null); };

  return (
    <Page>
      <style>{`.geo-split{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start}@media (max-width:1100px){.geo-split{grid-template-columns:minmax(0,1fr)}}`}</style>
      <Heading title="Geographies" sub="Where goods are made, where they go, and how efficiently they get there. Anonymised across the platform; a figure is only shown when at least five organisations are behind it." actions={<ScoreLegend />} />
      <ErrorNote message={err} />
      <InsightsFilterBar commodities={commodities} />
      {pair && <p style={{ margin: 0, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: 13.5 }}>Showing only goods made in <strong>{REGION_LABEL[pair.from]}</strong> and delivered to <strong>{REGION_LABEL[pair.to]}</strong>. <button type="button" className="u-touch" style={pill(false)} onClick={() => setPair(null)}>Show all regions</button></p>}

      <StatTileGrid>
        <StatTile label="Shipments" value={loading ? "…" : fmt(tot.shipments)} icon={<TrendingUpIcon size={18} />} onClick={() => setLayer("flows")} />
        <StatTile label="Countries of manufacture" value={loading ? "…" : made.length} icon={<GlobeIcon size={18} />} onClick={() => setLayer("made")} />
        <StatTile label="Delivery countries" value={loading ? "…" : delivered.length} icon={<GlobeIcon size={18} />} tone="neutral" onClick={() => setLayer("delivered")} />
        <StatTile label="Made in the top three countries" value={loading ? "…" : tot.shipments ? `${Math.round(top3Share * 100)}%` : "—"} icon={<GaugeIcon size={18} />} tone="neutral" onClick={() => setLayer("made")} />
      </StatTileGrid>

      <section aria-labelledby="g-map" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 id="g-map" style={h2}>Where does it flow?</h2>
        <div role="group" aria-label="Map layer" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {LAYERS.map((l) => <button key={l.key} type="button" className="u-touch" style={pill(layer === l.key)} aria-pressed={layer === l.key} onClick={() => setLayer(l.key)}>{l.label}</button>)}
        </div>
        <p style={sub}>{LAYERS.find((l) => l.key === layer)?.hint} Select a spot to see that country on the right.</p>
        <div className="geo-split">
          <WorldMap points={map.points} arcs={map.arcs} legend={legend} maxHeight={460} focus={mapFocus} highlightId={selected ? map.points.find((p) => p.id.endsWith(`:${selected}`))?.id ?? null : null}
            emptyMessage={loading ? "Loading…" : "No route has enough contributors to show for this selection."} onPointClick={(p) => setSelected(p.id.split(":")[1] ?? null)} />
          <Card title={selected ? nameOf(selected) : "Country detail"} action={selected ? <button type="button" className="u-touch" style={pill(false)} onClick={() => setSelected(null)}>Clear</button> : undefined}>
            {!selected || !detail ? <p style={{ margin: 0, fontSize: 13.5, color: "var(--u-ink-secondary)" }}>Select a spot on the map, or a country in the lists below, to see what it makes, what it receives, where it trades and how it ships.</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ margin: 0, fontSize: 13.5 }}>{detail.madeN ? `Makes goods for ${fmt(detail.madeN)} shipments. ` : "Not a country of manufacture here. "}{detail.recvN ? `Receives ${fmt(detail.recvN)} shipments.` : "Not a delivery country here."}</p>
                <p style={{ margin: 0, fontSize: 13.5 }}>Average distance <strong>{fmt(detail.t.avgDistance)} km</strong> · efficiency <strong>{detail.t.avgScore.toFixed(1)}/10</strong> ({BAND_WORD[bandForScore(detail.t.avgScore)]}){detail.t.avgDays !== null && <> · about <strong>{Math.round(detail.t.avgDays)} days</strong></>}</p>
                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600 }}>How it ships</h3>
                  <div role="img" aria-label={`Transport mode mix: ${detail.modes.map((m) => `${MODE_WORD[m.code] ?? m.code} ${Math.round((m.shipments / detail.t.shipments) * 100)}%`).join(", ")}`} style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", backgroundColor: "var(--u-surface-alt)" }}>
                    {detail.modes.map((m) => <span key={m.code} style={{ width: `${(m.shipments / detail.t.shipments) * 100}%`, backgroundColor: MODE_FILL[m.code] ?? "var(--u-ink-secondary)" }} />)}
                  </div>
                  <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12.5 }}>
                    {detail.modes.map((m) => <li key={m.code} style={{ display: "flex", alignItems: "center", gap: 5 }}><span aria-hidden style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: MODE_FILL[m.code] ?? "var(--u-ink-secondary)" }} />{MODE_WORD[m.code] ?? m.code} {Math.round((m.shipments / detail.t.shipments) * 100)}%</li>)}
                  </ul>
                </div>
                {[{ title: "Sends goods to", list: detail.sendsTo }, { title: "Receives goods from", list: detail.receivesFrom }].filter((s) => s.list.length).map((s) => (
                  <div key={s.title}>
                    <h3 style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600 }}>{s.title}</h3>
                    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                      {s.list.map((p) => (
                        <li key={p.code}>
                          <button type="button" onClick={() => setSelected(p.code)} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}>
                            <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}><span>{nameOf(p.code)}</span><span style={{ fontWeight: 600 }}>{fmt(p.shipments)}</span></span>
                            <span aria-hidden style={{ display: "block", height: 5, borderRadius: 3, backgroundColor: "var(--u-surface-alt)", marginTop: 3 }}><span style={{ display: "block", height: "100%", borderRadius: 3, width: `${(p.shipments / s.list[0]!.shipments) * 100}%`, backgroundColor: "var(--u-brand-violet)" }} /></span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </section>

      <section aria-labelledby="g-grid" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 id="g-grid" style={h2}>Region to region</h2>
        <p style={sub}>Rows are where goods are made, columns where they are delivered (WHO regions). Select a cell to narrow everything on this page to that pair.</p>
        <div role="group" aria-label="Measure shown in the grid" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {MEASURES.map((m) => <button key={m.key} type="button" className="u-touch" style={pill(measure === m.key)} aria-pressed={measure === m.key} onClick={() => setMeasure(m.key)}>{m.label}</button>)}
        </div>
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "separate", borderSpacing: 4, width: "100%", minWidth: 640, fontSize: 13 }}>
              <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{MEASURES.find((m) => m.key === measure)?.label} by region of manufacture (rows) and region of delivery (columns)</caption>
              <thead><tr><td />{REGIONS.map((r) => <th key={r} scope="col" style={{ fontSize: 12, fontWeight: 600, padding: "4px 6px", textAlign: "center", color: "var(--u-ink)" }}>{REGION_LABEL[r]}</th>)}</tr></thead>
              <tbody>
                {REGIONS.map((from) => (
                  <tr key={from}>
                    <th scope="row" style={{ fontSize: 12, fontWeight: 600, padding: "4px 8px 4px 0", textAlign: "left", color: "var(--u-ink)", whiteSpace: "nowrap" }}>{REGION_LABEL[from]}</th>
                    {REGIONS.map((to) => {
                      const k = `${from}>${to}`; const v = grid.val(k); const on = pair?.from === from && pair?.to === to;
                      const alpha = v === null ? 0 : measure === "score" ? Math.min(0.4, (v / 10) * 0.4) : Math.min(0.4, 0.06 + (v / grid.max) * 0.34);
                      return (
                        <td key={to} style={{ padding: 0 }}>
                          {v === null ? <span style={{ display: "block", textAlign: "center", padding: "10px 4px", color: "var(--u-ink-secondary)" }} aria-label={`${REGION_LABEL[from]} to ${REGION_LABEL[to]}: no figure`}>–</span> : (
                            <button type="button" aria-pressed={on} aria-label={`${REGION_LABEL[from]} to ${REGION_LABEL[to]}: ${cellText(v)}${measure === "shipments" ? " shipments" : ""}`} onClick={() => setPair(on ? null : { from, to })}
                              style={{ position: "relative", display: "block", width: "100%", minHeight: 44, padding: "10px 4px", border: on ? "2px solid var(--u-brand-violet)" : "1px solid var(--u-border)", borderRadius: 6, backgroundColor: "var(--u-surface-raised)", color: "var(--u-ink)", font: "inherit", fontWeight: 600, cursor: "pointer", overflow: "hidden" }}>
                              <span aria-hidden style={{ position: "absolute", inset: 0, backgroundColor: "var(--u-brand-violet)", opacity: alpha }} />
                              <span style={{ position: "relative" }}>{cellText(v)}</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section aria-labelledby="g-league" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 id="g-league" style={h2}>Which delivery countries are served most and least efficiently?</h2>
        <p style={sub}>Average efficiency score of what arrives, for delivery countries with at least thirty shipments. Select a country to see it on the map.</p>
        <RankedTileGrid>
          <RankedTile label="Most efficient" icon={<GaugeIcon size={18} />} tone="var(--u-status-good)" rows={league.best} limit={5} onRowClick={(r) => focusCountry(r.id)} formatValue={(v) => `${v.toFixed(1)}/10`} emptyMessage="Not enough shipments to rank yet." />
          <RankedTile label="Least efficient" icon={<GaugeIcon size={18} />} tone="var(--u-status-critical)" rows={league.worst} limit={5} onRowClick={(r) => focusCountry(r.id)} formatValue={(v) => `${v.toFixed(1)}/10`} emptyMessage="Not enough shipments to rank yet." />
        </RankedTileGrid>
      </section>
    </Page>
  );
}
