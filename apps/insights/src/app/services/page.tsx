"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { InsightsPriceMovement, InsightsServicePrice } from "@universe/types";
import { SERVICE_CATEGORIES, SERVICE_GROUPS, serviceCategoryByCode, servicePricingBasisLabel } from "@universe/types";
import { StatTile, StatTileGrid, GridIcon, TrendingUpIcon } from "@universe/ui";
import { MovementChart, type MovementLine } from "../../components/MovementChart";
import { Spark } from "../../components/Spark";
import { apiClient } from "../../lib/apiClient";
import { fmtMoney, monthLabel, regionLabel } from "../../lib/format";
import { Card, ErrorNote, Heading, Page, pill } from "../../lib/ui";

const h2: React.CSSProperties = { margin: 0, fontFamily: "var(--u-font-display)", fontSize: 16 };
const sub: React.CSSProperties = { margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" };
const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 12.5, fontWeight: 600, borderBottom: "1px solid var(--u-border)", color: "var(--u-ink)" };
const td: React.CSSProperties = { padding: "8px 10px", fontSize: 13.5, verticalAlign: "middle" };
const PROCUREMENT_LABEL: Record<string, string> = { CONSULTING: "Consulting service", NON_CONSULTING: "Non-consulting service", GOODS_RELATED: "Service related to goods" };
const SHORT_BASIS: Record<string, string> = { PER_DAY: "per day", PER_HOUR: "per hour", PER_MONTH: "per month", PER_UNIT: "per unit", LUMP_SUM: "fixed fee", PERCENT_OF_GOODS: "of goods value" };
const key = (c: string, b: string) => `${c}|${b}`;
function change(index: number) { const c = index - 100; const a = Math.abs(c).toFixed(1); return Math.abs(c) < 0.05 ? { text: "No change", arrow: "▬", value: 0 } : c > 0 ? { text: `+${a}%`, arrow: "▲", value: c } : { text: `−${a}%`, arrow: "▼", value: c }; }
const price = (v: number, basis: string) => (basis === "PERCENT_OF_GOODS" ? `${v.toFixed(1)}%` : fmtMoney(v));

export default function ServicesPage() {
  const [prices, setPrices] = useState<InsightsServicePrice[] | null>(null);
  const [byRegion, setByRegion] = useState<InsightsServicePrice[] | null>(null);
  const [mv, setMv] = useState<InsightsPriceMovement[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [currency, setCurrency] = useState("");
  const [sel, setSel] = useState("");
  const detailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const fail = (w: string) => (e: unknown) => setErr(e instanceof Error ? e.message : `Could not load ${w}.`);
    apiClient.insightsServicePrices(false).then(setPrices).catch((e) => { setPrices([]); fail("service costs")(e); });
    apiClient.insightsServicePrices(true).then(setByRegion).catch((e) => { setByRegion([]); fail("service costs by region")(e); });
    apiClient.insightsServiceMovement().then(setMv).catch((e) => { setMv([]); fail("service cost movement")(e); });
  }, []);

  const currencies = useMemo(() => [...new Set((prices ?? []).map((p) => p.currency))].sort(), [prices]);
  useEffect(() => { if (currencies.length && !currencies.includes(currency)) setCurrency(currencies.includes("USD") ? "USD" : currencies[0]!); }, [currencies, currency]);

  const mvOf = useMemo(() => { const m = new Map<string, InsightsPriceMovement>(); for (const s of mv ?? []) if (s.segmentBy === null && s.currency === currency) m.set(s.category, s); return m; }, [mv, currency]);
  const rows = useMemo(() => (prices ?? []).filter((p) => p.currency === currency).map((p) => ({ p, k: key(p.serviceCategory, p.pricingBasis), cat: serviceCategoryByCode(p.serviceCategory), series: mvOf.get(key(p.serviceCategory, p.pricingBasis)) ?? null })), [prices, currency, mvOf]);
  const withMove = rows.filter((r) => r.series);
  const moves = withMove.map((r) => ({ r, ch: change(r.series!.points[r.series!.points.length - 1]!.index) }));
  const rising = moves.filter((m) => m.ch.value > 0.5).length, falling = moves.filter((m) => m.ch.value < -0.5).length;
  const biggest = [...moves].sort((a, b) => Math.abs(b.ch.value) - Math.abs(a.ch.value))[0];
  const sparkAll = withMove.flatMap((r) => r.series!.points.map((p) => p.index));
  const sparkLo = Math.min(100, ...sparkAll), sparkHi = Math.max(100, ...sparkAll);
  const loading = prices === null;

  const pick = (k: string) => { setSel(k); if (typeof window !== "undefined" && window.innerWidth <= 1100) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); };
  const cur = rows.find((r) => r.k === sel);
  const regionRows = (byRegion ?? []).filter((p) => p.currency === currency && key(p.serviceCategory, p.pricingBasis) === sel).sort((a, b) => b.avgPrice - a.avgPrice);
  const lines: MovementLine[] = cur?.series ? [{ id: cur.k, name: cur.cat?.label ?? cur.p.serviceCategory, color: "var(--u-brand-violet)", points: cur.series.points.map((p) => ({ label: monthLabel(p.month), index: p.index, sources: p.sourceCount })) }] : [];

  return (
    <Page>
      <Heading title="Services" sub="What services cost: consultancy, technical assistance, advisory, testing, equipment servicing and more. A service is priced by time, output or fee, so each is shown in its own unit, before any margin. Freight is separate (see Distances). Anonymised; a figure is only shown when at least five organisations are behind it." />
      <ErrorNote message={err} />
      {currencies.length > 1 && (
        <div role="group" aria-label="Currency" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5, fontWeight: 600 }}>
          Currency (not converted)
          {currencies.map((c) => <button key={c} type="button" className="u-touch" style={pill(currency === c)} aria-pressed={currency === c} onClick={() => { setCurrency(c); setSel(""); }}>{c}</button>)}
        </div>
      )}
      <StatTileGrid>
        <StatTile label="Types of service with a cost" value={loading ? "…" : rows.length} icon={<GridIcon size={18} />} />
        <StatTile label="Getting dearer" value={loading ? "…" : rising} icon={<TrendingUpIcon size={18} />} tone="neutral" />
        <StatTile label="Getting cheaper" value={loading ? "…" : falling} icon={<TrendingUpIcon size={18} />} tone="neutral" />
        <StatTile label={biggest ? `Biggest move: ${biggest.r.cat?.label ?? biggest.r.p.serviceCategory}` : "Biggest move"} value={loading ? "…" : biggest ? biggest.ch.text : "—"} icon={<TrendingUpIcon size={18} />} tone="neutral" onClick={biggest ? () => pick(biggest.r.k) : undefined} />
      </StatTileGrid>

      <section aria-labelledby="s-board" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 id="s-board" style={h2}>What each type of service costs</h2>
        <p style={sub}>Typical cost (average across organisations) with the range seen, and the like-for-like movement since the first month shown. Select a service for detail.</p>
        {loading ? <Card><p style={{ margin: 0 }}>Loading…</p></Card> : rows.length === 0 ? (
          <Card><p style={{ margin: 0, fontSize: 14, color: "var(--u-ink-secondary)" }}>No type of service has costs from at least five organisations yet. Costs appear here once organisations record services on their projects (choose the Services product category on a line).</p></Card>
        ) : SERVICE_GROUPS.map((g) => {
          const gr = rows.filter((r) => r.cat?.group === g);
          if (!gr.length) return null;
          return (
            <Card key={g} title={g}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }}>
                  <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{g}: typical cost, range and movement by type of service, in {currency}</caption>
                  <thead><tr><th scope="col" style={th}>Service</th><th scope="col" style={{ ...th, textAlign: "right" }}>Typical cost</th><th scope="col" style={th}>Trend</th><th scope="col" style={{ ...th, textAlign: "right" }}>Change</th><th scope="col" style={{ ...th, textAlign: "right" }}>Organisations</th></tr></thead>
                  <tbody>{gr.map(({ p, k, cat, series }) => { const last = series?.points[series.points.length - 1]; const ch = last ? change(last.index) : null; return (
                    <tr key={k} style={{ borderBottom: "1px solid var(--u-border)", background: k === sel ? "var(--u-surface-alt)" : undefined }}>
                      <th scope="row" style={{ ...td, textAlign: "left", fontWeight: 600 }}><button type="button" className="u-touch" onClick={() => pick(k)} aria-pressed={k === sel} style={{ background: "none", border: 0, padding: 0, font: "inherit", fontWeight: 600, color: "var(--u-ink)", textDecoration: "underline", cursor: "pointer", textAlign: "left" }}>{cat?.label ?? p.serviceCategory}</button></th>
                      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}><strong>{price(p.avgPrice, p.pricingBasis)}</strong> {SHORT_BASIS[p.pricingBasis] ?? ""}<span style={{ display: "block", fontSize: 11.5, color: "var(--u-ink-secondary)" }}>{price(p.minPrice, p.pricingBasis)} to {price(p.maxPrice, p.pricingBasis)}</span></td>
                      <td style={td}>{series ? <Spark points={series.points} lo={sparkLo} hi={sparkHi} /> : <span style={{ color: "var(--u-ink-secondary)" }}>–</span>}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>{ch && series ? <><span aria-hidden>{ch.arrow} </span>{ch.text}<span style={{ display: "block", fontSize: 11.5, fontWeight: 400, color: "var(--u-ink-secondary)" }}>since {monthLabel(series.points[0]!.month)}</span></> : <span style={{ color: "var(--u-ink-secondary)", fontWeight: 400 }}>–</span>}</td>
                      <td style={{ ...td, textAlign: "right" }}>{p.sourceCount}</td>
                    </tr>
                  ); })}</tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </section>

      <section ref={detailRef} aria-labelledby="s-detail" style={{ display: "flex", flexDirection: "column", gap: 10, scrollMarginTop: 12 }}>
        <h2 id="s-detail" style={h2}>{cur ? cur.cat?.label ?? cur.p.serviceCategory : "Service detail"}</h2>
        {!cur ? <p style={sub}>Select a service above to see what it covers, its cost by region and how that cost has moved.</p> : (
          <>
            <Card title="What it covers">
              <p style={{ margin: "0 0 8px", fontSize: 14 }}>{cur.cat?.description}</p>
              <p style={{ ...sub, margin: 0 }}>{PROCUREMENT_LABEL[cur.cat?.procurementType ?? ""] ?? ""}. Priced {servicePricingBasisLabel(cur.p.pricingBasis).toLowerCase()}. For example: {cur.cat?.examples.join("; ")}.</p>
            </Card>
            <Card title="Cost by region of delivery">
              {byRegion === null ? <p style={{ margin: 0 }}>Loading…</p> : regionRows.length === 0 ? <p style={{ margin: 0, fontSize: 14, color: "var(--u-ink-secondary)" }}>No region has costs from at least five organisations yet.</p> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 420 }}>
                    <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Cost of {cur.cat?.label} by region of delivery, in {currency}</caption>
                    <thead><tr><th scope="col" style={th}>Delivered in</th><th scope="col" style={{ ...th, textAlign: "right" }}>Typical cost</th><th scope="col" style={{ ...th, textAlign: "right" }}>Range</th><th scope="col" style={{ ...th, textAlign: "right" }}>Organisations</th></tr></thead>
                    <tbody>{regionRows.map((r) => <tr key={r.deliveryRegion ?? "n"} style={{ borderBottom: "1px solid var(--u-border)" }}><th scope="row" style={{ ...td, textAlign: "left", fontWeight: 500 }}>{regionLabel(r.deliveryRegion)}</th><td style={{ ...td, textAlign: "right" }}>{price(r.avgPrice, r.pricingBasis)} {SHORT_BASIS[r.pricingBasis] ?? ""}</td><td style={{ ...td, textAlign: "right" }}>{price(r.minPrice, r.pricingBasis)} to {price(r.maxPrice, r.pricingBasis)}</td><td style={{ ...td, textAlign: "right" }}>{r.sourceCount}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </Card>
            <Card title="Cost movement over time">
              {mv === null ? <p style={{ margin: 0 }}>Loading…</p> : <MovementChart lines={lines} title={`${cur.cat?.label} cost index`} />}
            </Card>
          </>
        )}
      </section>
    </Page>
  );
}
