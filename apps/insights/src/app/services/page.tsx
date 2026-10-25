"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { InsightsPriceMovement, InsightsServicePrice } from "@universe/types";
import { serviceCategoryByCode, servicePricingBasisLabel } from "@universe/types";
import { StatTile, StatTileGrid, GridIcon, TrendingUpIcon } from "@universe/ui";
import { MovementChart, type MovementLine } from "../../components/MovementChart";
import { DataTable, emptyTableState, type Col, type TableState } from "../../components/DataTable";
import { Spark } from "../../components/Spark";
import { readParam, useViewBridge } from "../../lib/views";
import { apiClient } from "../../lib/apiClient";
import { fmtMoney, monthLabel, regionLabel } from "../../lib/format";
import { Card, ErrorNote, Heading, Page, pill } from "../../lib/ui";

const h2: React.CSSProperties = { margin: 0, fontFamily: "var(--u-font-display)", fontSize: 16 };
const sub: React.CSSProperties = { margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" };
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

  type ServiceRow = (typeof rows)[number];
  const serviceCols: Col<ServiceRow>[] = [
    { key: "group", header: "Group", value: (r) => r.cat?.group ?? "Other", filter: true },
    { key: "service", header: "Service", value: (r) => r.cat?.label ?? r.p.serviceCategory, render: (r) => <button type="button" className="u-touch" onClick={(e) => { e.stopPropagation(); pick(r.k); }} aria-pressed={r.k === sel} style={{ background: "none", border: 0, padding: 0, font: "inherit", fontWeight: 600, color: "var(--u-ink)", textDecoration: "underline", cursor: "pointer", textAlign: "left" }}>{r.cat?.label ?? r.p.serviceCategory}</button> },
    { key: "basis", header: "Priced", value: (r) => servicePricingBasisLabel(r.p.pricingBasis), filter: true },
    { key: "avg", header: "Typical cost", align: "right", value: (r) => r.p.avgPrice, render: (r) => <><strong>{price(r.p.avgPrice, r.p.pricingBasis)}</strong> {SHORT_BASIS[r.p.pricingBasis] ?? ""}</> },
    { key: "range", header: "Range", align: "right", value: (r) => `${price(r.p.minPrice, r.p.pricingBasis)} to ${price(r.p.maxPrice, r.p.pricingBasis)}` },
    { key: "trend", header: "Trend", value: () => null, render: (r) => (r.series ? <Spark points={r.series.points} lo={sparkLo} hi={sparkHi} /> : <span style={{ color: "var(--u-ink-secondary)" }}>–</span>) },
    { key: "change", header: "Change", align: "right", value: (r) => (r.series ? Number((r.series.points[r.series.points.length - 1]!.index - 100).toFixed(1)) : null), render: (r) => { if (!r.series) return <span style={{ color: "var(--u-ink-secondary)" }}>–</span>; const ch = change(r.series.points[r.series.points.length - 1]!.index); return <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}><span aria-hidden>{ch.arrow} </span>{ch.text}<span style={{ display: "block", fontSize: 11.5, fontWeight: 400, color: "var(--u-ink-secondary)" }}>since {monthLabel(r.series.points[0]!.month)}</span></span>; } },
    { key: "orgs", header: "Organisations", align: "right", value: (r) => r.p.sourceCount },
  ];
  const [tableState, setTableState] = useState<TableState>(() => emptyTableState());
  type RegionRow = InsightsServicePrice;
  const regionCols: Col<RegionRow>[] = [
    { key: "region", header: "Delivered in", value: (r) => regionLabel(r.deliveryRegion) },
    { key: "avg", header: "Typical cost", align: "right", value: (r) => r.avgPrice, render: (r) => `${price(r.avgPrice, r.pricingBasis)} ${SHORT_BASIS[r.pricingBasis] ?? ""}` },
    { key: "range", header: "Range", align: "right", value: (r) => `${price(r.minPrice, r.pricingBasis)} to ${price(r.maxPrice, r.pricingBasis)}` },
    { key: "orgs", header: "Organisations", align: "right", value: (r) => r.sourceCount },
  ];

  useViewBridge(() => ({ currency, sel, table: tableState }), (s) => { if (s.currency) setCurrency(s.currency); if (s.sel !== undefined) setSel(s.sel); if (s.table) setTableState(s.table); });
  const wantService = useRef(readParam("service"));
  useEffect(() => {
    if (!wantService.current || rows.length === 0) return;
    const hit = rows.find((r) => r.p.serviceCategory === wantService.current); wantService.current = "";
    if (hit) pick(hit.k);
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

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
        ) : (
          <Card>
            <DataTable<ServiceRow> rows={rows} rowKey={(r) => r.k} columns={serviceCols} caption={`Cost, range and movement by type of service, in ${currency}`} exportName={`service-costs-${currency}`} selectedKey={sel} state={tableState} onState={setTableState} />
          </Card>
        )}
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
                <DataTable<RegionRow> rows={regionRows} rowKey={(r) => r.deliveryRegion ?? "none"} columns={regionCols} caption={`Cost of ${cur.cat?.label} by region of delivery, in ${currency}`} exportName={`service-${cur.k}-by-region`} />
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
