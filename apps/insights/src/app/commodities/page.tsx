"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { InsightsPriceMovement, LogisticsRouteSummary, ProductSourcingSummary } from "@universe/types";
import { COMMODITY_GROUPS, catalogueGroupForCommodity, commodityGroupLabel } from "@universe/types";
import { StatTile, StatTileGrid, TrendingUpIcon, WorldMap, type WorldMapPoint } from "@universe/ui";
import { MovementChart, type MovementLine } from "../../components/MovementChart";
import { apiClient } from "../../lib/apiClient";
import { monthLabel, regionLabel } from "../../lib/format";
import { totalsOf } from "../../lib/geo";
import { useCountries } from "../../lib/useCountries";
import { Card, ErrorNote, Heading, Page, pill } from "../../lib/ui";

const h2: React.CSSProperties = { margin: 0, fontFamily: "var(--u-font-display)", fontSize: 16 };
const sub: React.CSSProperties = { margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" };
const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 12.5, fontWeight: 600, borderBottom: "1px solid var(--u-border)", color: "var(--u-ink)" };
const td: React.CSSProperties = { padding: "8px 10px", fontSize: 13.5, verticalAlign: "middle" };
const SEG_STYLE = [{ stroke: "var(--u-brand-violet)", dash: undefined }, { stroke: "var(--u-accent-magenta)", dash: "7 4" }, { stroke: "var(--u-status-good)", dash: "2 3" }, { stroke: "var(--u-ink-secondary)", dash: "10 3 2 3" }];
type Sort = "rise" | "fall" | "name";

/** "+4.2%" with an arrow, so direction is never carried by colour alone. */
function change(index: number) {
  const c = index - 100; const abs = Math.abs(c).toFixed(1);
  return Math.abs(c) < 0.05 ? { text: "No change", arrow: "▬", value: 0 } : c > 0 ? { text: `+${abs}%`, arrow: "▲", value: c } : { text: `−${abs}%`, arrow: "▼", value: c };
}

function Spark({ points }: { points: { index: number }[] }) {
  const W = 96, H = 26; const lo = Math.min(...points.map((p) => p.index)), hi = Math.max(...points.map((p) => p.index)); const span = hi - lo || 1;
  const d = points.map((p, i) => `${i ? "L" : "M"}${(i * (W - 4)) / Math.max(1, points.length - 1) + 2},${H - 3 - ((p.index - lo) / span) * (H - 6)}`).join(" ");
  return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden style={{ display: "block" }}><path d={d} fill="none" stroke="var(--u-brand-violet)" strokeWidth={2} strokeLinejoin="round" /></svg>;
}

export default function CommoditiesPage() {
  const countries = useCountries();
  const [mv, setMv] = useState<InsightsPriceMovement[] | null>(null);
  const [src, setSrc] = useState<ProductSourcingSummary[] | null>(null);
  const [routes, setRoutes] = useState<LogisticsRouteSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [currency, setCurrency] = useState("");
  const [sort, setSort] = useState<Sort>("rise");
  const [group, setGroup] = useState("");
  const [seg, setSeg] = useState<"" | "manufactureRegion" | "destinationRegion">("");
  const detailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const fail = (what: string) => (e: unknown) => setErr(e instanceof Error ? e.message : `Could not load ${what}.`);
    apiClient.insightsPriceMovement().then(setMv).catch((e) => { setMv([]); fail("cost movement")(e); });
    apiClient.insightsSourcing().then(setSrc).catch((e) => { setSrc([]); fail("sourcing")(e); });
    apiClient.insightsLogisticsRoutes({}).then(setRoutes).catch((e) => { setRoutes([]); fail("transport")(e); });
  }, []);

  const currencies = useMemo(() => [...new Set((mv ?? []).map((s) => s.currency))].sort(), [mv]);
  useEffect(() => { if (currencies.length && !currencies.includes(currency)) setCurrency(currencies.includes("USD") ? "USD" : currencies[0]!); }, [currencies, currency]);

  const board = useMemo(() => {
    const rows = (mv ?? []).filter((s) => s.segmentBy === null && s.currency === currency).map((s) => {
      const last = s.points[s.points.length - 1]!; return { s, last, ch: change(last.index) };
    });
    return rows.sort((a, b) => sort === "name" ? a.s.category.localeCompare(b.s.category) : sort === "rise" ? b.ch.value - a.ch.value : a.ch.value - b.ch.value);
  }, [mv, currency, sort]);
  const rising = board.filter((r) => r.ch.value > 0.5).length, falling = board.filter((r) => r.ch.value < -0.5).length;
  const biggest = [...board].sort((a, b) => Math.abs(b.ch.value) - Math.abs(a.ch.value))[0];
  const loading = mv === null;

  const pick = (g: string) => { setGroup(g); setSeg(""); if (typeof window !== "undefined" && window.innerWidth <= 1100) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); };
  const selected = board.find((r) => r.s.category === group);
  const segments = useMemo(() => (mv ?? []).filter((s) => s.category === group && s.currency === currency && seg !== "" && s.segmentBy === seg).sort((a, b) => b.points[b.points.length - 1]!.index - a.points[a.points.length - 1]!.index), [mv, group, currency, seg]);
  const hasSeg = (k: "manufactureRegion" | "destinationRegion") => (mv ?? []).some((s) => s.category === group && s.currency === currency && s.segmentBy === k);

  const lines: MovementLine[] = selected ? [
    { id: "all", name: `${group}, all regions`, color: "var(--u-ink)", points: selected.s.points.map((p) => ({ label: monthLabel(p.month), index: p.index, sources: p.sourceCount })) },
    ...segments.slice(0, 4).map((s, i) => ({ id: s.segment ?? String(i), name: regionLabel(s.segment), color: SEG_STYLE[i]!.stroke, dash: SEG_STYLE[i]!.dash, points: s.points.map((p) => ({ label: monthLabel(p.month), index: p.index, sources: p.sourceCount })) })),
  ] : [];

  // where it is made, for the chosen group
  const countryRows = useMemo(() => (src ?? []).filter((r) => r.category === group && r.manufactureCountryCode).sort((a, b) => b.approvalCount - a.approvalCount), [src, group]);
  const points: WorldMapPoint[] = countryRows.flatMap((e) => {
    const c = countries.find((x) => x.code === e.manufactureCountryCode); if (!c || c.latitude === null || c.longitude === null) return [];
    return [{ id: c.code, latitude: c.latitude, longitude: c.longitude, label: c.name, color: "var(--u-org-accent, var(--u-brand-violet))", value: e.approvalCount, tooltipLines: [{ text: `${e.approvalCount.toLocaleString("en-GB")} approved sourcing relationships` }] }];
  });

  // how it travels: the transport data uses its own commodity codes, which line up with product groups for ten of them
  const code = COMMODITY_GROUPS.find((c) => catalogueGroupForCommodity(c) === group);
  const travel = useMemo(() => {
    if (!code || !routes) return null;
    const rows = routes.filter((r) => r.commodityGroup === code); if (!rows.length) return null;
    const t = totalsOf(rows);
    const modes = (["SEA", "AIR", "LAND"] as const).map((m) => ({ m, share: totalsOf(rows.filter((r) => r.transportMode === m)).shipments / (t.shipments || 1) }));
    return { t, modes };
  }, [code, routes]);

  return (
    <Page>
      <Heading title="Commodities" sub="How the cost of each product group is moving, where it is made and how it travels. Cost prices only: what suppliers and manufacturers charged before any margin. Anonymised; a figure is only shown when at least five organisations are behind it." />
      <ErrorNote message={err} />
      {currencies.length > 1 && (
        <div role="group" aria-label="Currency" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5, fontWeight: 600 }}>
          Currency (not converted)
          {currencies.map((c) => <button key={c} type="button" className="u-touch" style={pill(currency === c)} aria-pressed={currency === c} onClick={() => { setCurrency(c); setGroup(""); }}>{c}</button>)}
        </div>
      )}

      <StatTileGrid>
        <StatTile label="Product groups with a cost trend" value={loading ? "…" : board.length} icon={<TrendingUpIcon size={18} />} onClick={() => setSort("name")} />
        <StatTile label="Getting dearer" value={loading ? "…" : rising} icon={<TrendingUpIcon size={18} />} tone="neutral" active={sort === "rise"} onClick={() => setSort("rise")} />
        <StatTile label="Getting cheaper" value={loading ? "…" : falling} icon={<TrendingUpIcon size={18} />} tone="neutral" active={sort === "fall"} onClick={() => setSort("fall")} />
        <StatTile label={biggest ? `Biggest move: ${biggest.s.category}` : "Biggest move"} value={loading ? "…" : biggest ? biggest.ch.text : "—"} icon={<TrendingUpIcon size={18} />} tone="neutral" onClick={biggest ? () => pick(biggest.s.category) : undefined} />
      </StatTileGrid>

      <section aria-labelledby="c-board" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 id="c-board" style={h2}>Cost movement by product group</h2>
        <p style={sub}>Change in like-for-like cost since the first month shown. Like-for-like means the same kind of product, made and delivered in the same regions, so a change in what was bought does not look like a price change. Select a group for detail.</p>
        <Card>
          <div role="group" aria-label="Sort the product groups" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {([["rise", "Biggest rise first"], ["fall", "Biggest fall first"], ["name", "A to Z"]] as const).map(([k, l]) => <button key={k} type="button" className="u-touch" style={pill(sort === k)} aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>)}
          </div>
          {loading ? <p style={{ margin: 0 }}>Loading…</p> : board.length === 0 ? <p style={{ margin: 0, fontSize: 14, color: "var(--u-ink-secondary)" }}>No product group has enough like-for-like purchases from at least five organisations yet.</p> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 480 }}>
                <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Change in cost price by product group, in {currency}</caption>
                <thead><tr><th scope="col" style={th}>Product group</th><th scope="col" style={th}>Trend</th><th scope="col" style={{ ...th, textAlign: "right" }}>Change</th><th scope="col" style={{ ...th, textAlign: "right" }}>Organisations</th></tr></thead>
                <tbody>{board.map(({ s, last, ch }) => (
                  <tr key={s.category} style={{ borderBottom: "1px solid var(--u-border)", background: s.category === group ? "var(--u-surface-alt)" : undefined }}>
                    <th scope="row" style={{ ...td, textAlign: "left", fontWeight: 600 }}><button type="button" className="u-touch" onClick={() => pick(s.category)} aria-pressed={s.category === group} style={{ background: "none", border: 0, padding: 0, font: "inherit", fontWeight: 600, color: "var(--u-ink)", textDecoration: "underline", cursor: "pointer", textAlign: "left" }}>{s.category}</button></th>
                    <td style={td}><Spark points={s.points} /></td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}><span aria-hidden>{ch.arrow} </span>{ch.text}<span style={{ display: "block", fontSize: 11.5, fontWeight: 400, color: "var(--u-ink-secondary)" }}>since {monthLabel(s.points[0]!.month)}</span></td>
                    <td style={{ ...td, textAlign: "right" }}>{last.sourceCount}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <section ref={detailRef} aria-labelledby="c-detail" style={{ display: "flex", flexDirection: "column", gap: 10, scrollMarginTop: 12 }}>
        <h2 id="c-detail" style={h2}>{selected ? selected.s.category : "Product group detail"}</h2>
        {!selected ? <p style={sub}>Select a product group above to see its cost movement by region, where it is made and how it travels.</p> : (
          <>
            <Card title="Cost movement over time">
              <div role="group" aria-label="Compare regions" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <button type="button" className="u-touch" style={pill(seg === "")} aria-pressed={seg === ""} onClick={() => setSeg("")}>All regions together</button>
                {hasSeg("manufactureRegion") && <button type="button" className="u-touch" style={pill(seg === "manufactureRegion")} aria-pressed={seg === "manufactureRegion"} onClick={() => setSeg("manufactureRegion")}>Compare where it is made</button>}
                {hasSeg("destinationRegion") && <button type="button" className="u-touch" style={pill(seg === "destinationRegion")} aria-pressed={seg === "destinationRegion"} onClick={() => setSeg("destinationRegion")}>Compare where it is delivered</button>}
              </div>
              <MovementChart lines={lines} title={`${selected.s.category} cost index`} />
              {seg && segments.length > 4 && <p style={{ ...sub, marginTop: 8 }}>The chart shows the four regions with the highest movement; all {segments.length} are in the table.</p>}
              <details style={{ marginTop: 10 }}>
                <summary style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 600 }}>Show the data as a table</summary>
                <div style={{ overflowX: "auto", marginTop: 8 }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13.5 }}>
                    <caption style={{ textAlign: "left", color: "var(--u-ink-secondary)", padding: "4px 0" }}>Cost index for {selected.s.category} (100 = {monthLabel(selected.s.points[0]!.month)}), {currency}</caption>
                    <thead><tr><th scope="col" style={th}>{seg ? (seg === "manufactureRegion" ? "Made in" : "Delivered to") : "Scope"}</th><th scope="col" style={{ ...th, textAlign: "right" }}>Change</th><th scope="col" style={{ ...th, textAlign: "right" }}>Latest index</th><th scope="col" style={{ ...th, textAlign: "right" }}>Months</th><th scope="col" style={{ ...th, textAlign: "right" }}>Organisations</th></tr></thead>
                    <tbody>{[{ k: "all", name: "All regions", s: selected.s }, ...segments.map((s) => ({ k: s.segment ?? "", name: regionLabel(s.segment), s }))].map(({ k, name, s }) => { const last = s.points[s.points.length - 1]!; const c = change(last.index); return (
                      <tr key={k} style={{ borderBottom: "1px solid var(--u-border)" }}><th scope="row" style={{ ...td, textAlign: "left", fontWeight: 500 }}>{name}</th><td style={{ ...td, textAlign: "right" }}><span aria-hidden>{c.arrow} </span>{c.text}</td><td style={{ ...td, textAlign: "right" }}>{last.index.toFixed(1)}</td><td style={{ ...td, textAlign: "right" }}>{s.points.length}</td><td style={{ ...td, textAlign: "right" }}>{last.sourceCount}</td></tr>
                    ); })}</tbody>
                  </table>
                </div>
              </details>
            </Card>
            <Card title="Where it is made">
              {src === null ? <p style={{ margin: 0 }}>Loading…</p> : <WorldMap points={points} maxHeight={340} emptyMessage="No country has enough contributors to show for this group yet." />}
              {countryRows.length > 0 && <p style={{ ...sub, marginTop: 8 }}>{countryRows.slice(0, 5).map((r) => `${countries.find((c) => c.code === r.manufactureCountryCode)?.name ?? r.manufactureCountryCode} (${r.approvalCount.toLocaleString("en-GB")})`).join(", ")}{countryRows.length > 5 ? ` and ${countryRows.length - 5} more` : ""}. Numbers are approved sourcing relationships.</p>}
            </Card>
            <Card title="How it travels">
              {routes === null ? <p style={{ margin: 0 }}>Loading…</p> : !code ? <p style={{ margin: 0, fontSize: 14, color: "var(--u-ink-secondary)" }}>Shipments are not tagged with this product group, so transport figures are not available for it.</p> : !travel ? <p style={{ margin: 0, fontSize: 14, color: "var(--u-ink-secondary)" }}>No route has enough contributors to show for {commodityGroupLabel(code)} yet.</p> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 14 }}>{travel.t.shipments.toLocaleString("en-GB")} shipments, about {travel.t.avgDays !== null ? `${travel.t.avgDays.toFixed(0)} days in transit, ` : ""}{Math.round(travel.t.avgCo2).toLocaleString("en-GB")} kg CO2e each on average.</p>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    {travel.modes.map(({ m, share }) => <li key={m} style={{ display: "grid", gridTemplateColumns: "64px 1fr 44px", alignItems: "center", gap: 10, fontSize: 13.5 }}><span>{m === "SEA" ? "Sea" : m === "AIR" ? "Air" : "Land"}</span><span aria-hidden style={{ height: 8, borderRadius: 4, background: "var(--u-surface-alt)" }}><span style={{ display: "block", height: "100%", width: `${Math.round(share * 100)}%`, borderRadius: 4, background: m === "AIR" ? "var(--u-accent-magenta)" : m === "LAND" ? "var(--u-status-good)" : "var(--u-brand-violet)" }} /></span><span style={{ textAlign: "right" }}>{Math.round(share * 100)}%</span></li>)}
                  </ul>
                  <p style={sub}>See Shipping modes for the full comparison.</p>
                </div>
              )}
            </Card>
          </>
        )}
      </section>
    </Page>
  );
}
