"use client";

import { useEffect, useMemo, useState } from "react";
import type { InsightsPriceMovement, InsightsPriceBreakdownRow, InsightsPriceDimension, InsightsPriceTrendPoint, InsightsPricedCategory } from "@universe/types";
import { readParam, useViewBridge } from "../../lib/views";
import { apiClient } from "../../lib/apiClient";
import { SourceNote } from "../../components/SourceNote";
import { Card, ErrorNote, Field, Heading, Page, inputStyle, pill } from "../../lib/ui";
import { fmtMoney, fmtMoneyIn, regionLabel } from "../../lib/format";
import { DataTable, type Col } from "../../components/DataTable";
import { SectionTrend, trendStyle, type TrendMetric } from "../../components/SectionTrend";
import { CurrencyBar } from "../../components/CurrencyBar";
import { groupMoves } from "../../lib/priceStats";
import { MODE_NAME } from "../../components/ModeDotPlot";
import { setFxLens, useFxLens, useFxView } from "../../lib/fx";

const DIMENSIONS: { value: InsightsPriceDimension; label: string }[] = [
  { value: "destinationRegion", label: "Where it is delivered" },
  { value: "manufactureRegion", label: "Where it is made" },
  { value: "incoterm", label: "Delivery terms (Incoterm)" },
  { value: "freightMode", label: "Transport mode" },
  { value: "orderSize", label: "Order size (units per line)" },
];
const SIZE_ORDER = ["1 to 99", "100 to 999", "1,000 to 4,999", "5,000 or more"];
const rowLabel = (by: InsightsPriceDimension, l: string | null) => (by === "incoterm" || by === "orderSize" ? l ?? "Not stated" : by === "freightMode" ? (l ? MODE_NAME[l] ?? l : "Not stated") : regionLabel(l));
const pct = (v: number | null, d = 1) => (v === null ? "–" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(d)}%`);

export default function PricesPage() {
  const [cats, setCats] = useState<InsightsPricedCategory[] | null>(null);
  const [category, setCategory] = useState("");
  const [by, setBy] = useState<InsightsPriceDimension>("destinationRegion");
  const [trend, setTrend] = useState<InsightsPriceTrendPoint[] | null>(null);
  const [rows, setRows] = useState<InsightsPriceBreakdownRow[] | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [err, setErr] = useState<string | null>(null);
  const [mv, setMv] = useState<InsightsPriceMovement[] | null>(null);
  const [compare, setCompare] = useState<string[] | null>(null);
  const [cmpMetric, setCmpMetric] = useState("index");
  useEffect(() => { apiClient.insightsPriceMovement().then(setMv).catch(() => setMv([])); }, []);

  useEffect(() => {
    apiClient.insightsPriceCategories().then((c) => { setCats(c); if (c[0]) setCategory(c[0].category); }).catch((e) => setErr(e instanceof Error ? e.message : "Could not load product groups."));
  }, []);
  useEffect(() => {
    if (!category) return;
    setTrend(null); setRows(null);
    Promise.all([apiClient.insightsPriceTrend(category), apiClient.insightsPriceBreakdown(category, by)])
      .then(([t, b]) => {
        setTrend(t); setRows(b); setErr(null);
        const have = [...new Set(t.map((p) => p.currency))];
        setCurrency((cur) => (have.includes(cur) ? cur : have.includes("USD") ? "USD" : have[0] ?? "USD"));
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Could not load prices."));
  }, [category, by]);

  const currencies = useMemo(() => [...new Set((trend ?? []).map((p) => p.currency))], [trend]);
  const lens = useFxLens();
  const trendRows = (trend ?? []).filter((p) => p.currency === currency);
  const fx = useFxView(currency, trendRows.map((p) => p.month));
  const [metric, setMetric] = useState("average");
  const line = (id: string, name: string, i: number, val: (p: InsightsPriceTrendPoint) => number, conv = true) => ({ id, name, ...trendStyle(i), points: trendRows.map((p) => ({ month: p.month, value: conv ? fx.conv(val(p), p.month) : val(p) })) });
  const trendMetrics: TrendMetric[] = [
    { id: "average", label: "Average price", unit: fx.ccy, fmt: fmtMoney, blurb: "The average cost price per unit before margin, month by month.", lines: [line("avg", "Average", 0, (p) => p.avgPrice)] },
    { id: "range", label: "Price range", unit: fx.ccy, fmt: fmtMoney, blurb: "The lowest, average and highest cost price in each month.", lines: [line("max", "Highest", 1, (p) => p.maxPrice), line("avg", "Average", 0, (p) => p.avgPrice), line("min", "Lowest", 2, (p) => p.minPrice)] },
    { id: "orgs", label: "Organisations", unit: "organisations", fmt: (v) => String(Math.round(v)), zero: true, blurb: "How many organisations are behind the figures in each month.", lines: [line("orgs", "Organisations", 3, (p) => p.sourceCount, false)] },
  ];
  const moves = useMemo(() => groupMoves(mv ?? [], currency), [mv, currency]);
  const picked = useMemo(() => (compare ?? [...moves].sort((a, b) => Math.abs(b.sincePct) - Math.abs(a.sincePct)).slice(0, 3).map((m) => m.category)).filter((c) => moves.some((m) => m.category === c)), [compare, moves]);
  const toggleCompare = (c: string) => setCompare((cur) => { const base = cur ?? picked; return base.includes(c) ? base.filter((x) => x !== c) : base.length >= 5 ? base : [...base, c]; });
  const cmpMetrics: TrendMetric[] = [
    { id: "index", label: "Cost index", unit: "(100 = first month)", fmt: (v) => v.toFixed(1), blurb: "Like-for-like cost, starting at 100 in each group's first month shown, so groups can be compared on movement rather than price level. A ratio, never a price.", lines: picked.map((c, i) => ({ id: c, name: c, ...trendStyle(i), points: (moves.find((m) => m.category === c)?.points ?? []).map((p) => ({ month: p.month, value: p.index })) })) },
    { id: "mom", label: "Month-on-month change", unit: "%", fmt: (v) => pct(v), blurb: "How much the like-for-like cost changed from the month before.", lines: picked.map((c, i) => { const pts = moves.find((m) => m.category === c)?.points ?? []; return { id: c, name: c, ...trendStyle(i), points: pts.slice(1).map((p, k) => ({ month: p.month, value: (p.index / pts[k]!.index - 1) * 100 })) }; }) },
  ];
  type Move = (typeof moves)[number];
  const moveCols: Col<Move>[] = [
    { key: "group", header: "Product group", value: (m) => m.category, render: (m) => <button type="button" className="u-touch" onClick={(e) => { e.stopPropagation(); if (cats?.some((c) => c.category === m.category)) setCategory(m.category); }} aria-pressed={m.category === category} style={{ background: "none", border: 0, padding: 0, font: "inherit", fontWeight: 600, color: "var(--u-link, var(--u-brand-violet))", textDecoration: "underline", cursor: "pointer", textAlign: "left" }}>{m.category}</button> },
    { key: "mom", header: "Month on month", align: "right", value: (m) => (m.momPct === null ? null : Math.round(m.momPct * 10) / 10), render: (m) => pct(m.momPct) },
    { key: "since", header: "Since first month", align: "right", value: (m) => Math.round(m.sincePct * 10) / 10, render: (m) => pct(m.sincePct) },
    { key: "vol", header: "Volatility (points)", align: "right", value: (m) => (m.volatility === null ? null : Math.round(m.volatility * 10) / 10), render: (m) => (m.volatility === null ? "–" : m.volatility.toFixed(1)) },
    { key: "months", header: "Months", align: "right", value: (m) => m.months },
    { key: "orgs", header: "Organisations", align: "right", value: (m) => m.organisations },
  ];
  const shownRows = (rows ?? []).filter((r) => r.currency === currency).sort((a, b) => (by === "orderSize" ? SIZE_ORDER.indexOf(a.label ?? "") - SIZE_ORDER.indexOf(b.label ?? "") : 0));
  const maxAvg = Math.max(1, ...shownRows.map((r) => r.avgPrice));
  const selected = cats?.find((c) => c.category === category);

  const priceCols: Col<(typeof shownRows)[number]>[] = [
    { key: "label", header: DIMENSIONS.find((d) => d.value === by)?.label ?? "Split", value: (r) => rowLabel(by, r.label) },
    { key: "avg", header: `Average (${fx.ccy})`, value: (r) => Math.round(fx.conv(r.avgPrice) * 100) / 100, render: (r) => <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div aria-hidden style={{ height: 8, width: `${Math.max(4, (r.avgPrice / maxAvg) * 100)}%`, maxWidth: 140, background: "var(--u-org-accent, var(--u-brand-violet))", borderRadius: 4 }} /><span>{fmtMoneyIn(fx.conv(r.avgPrice), fx.ccy)}{fx.on && <span style={{ display: "block", fontSize: 11.5, color: "var(--u-ink-secondary)" }}>agreed at {fmtMoneyIn(r.avgPrice, r.currency)}</span>}</span></div> },
    { key: "min", header: `Lowest (${fx.ccy})`, align: "right", value: (r) => Math.round(fx.conv(r.minPrice) * 100) / 100, render: (r) => fmtMoneyIn(fx.conv(r.minPrice), fx.ccy) },
    { key: "max", header: `Highest (${fx.ccy})`, align: "right", value: (r) => Math.round(fx.conv(r.maxPrice) * 100) / 100, render: (r) => fmtMoneyIn(fx.conv(r.maxPrice), fx.ccy) },
    { key: "orgs", header: "Organisations", align: "right", value: (r) => r.sourceCount },
  ];

  useViewBridge(() => ({ category, by, currency, metric, compare, cmpMetric, lens: { target: lens.target, mode: lens.mode, asOf: lens.asOf } }), (s) => { if (s.lens) setFxLens(s.lens); if (s.compare !== undefined) setCompare(s.compare); if (s.cmpMetric) setCmpMetric(s.cmpMetric); if (s.metric) setMetric(s.metric); if (s.category) setCategory(s.category); if (s.by) setBy(s.by); if (s.currency) setCurrency(s.currency); });

  return (
    <Page>
      <Heading title="Prices" sub="What products in each group cost at source: the supplier or manufacturer price before any margin, from real purchases recorded by organisations on Universe. Names are never shown." />
      <ErrorNote message={err} />
      <Card title="Across every product group">
        {mv === null ? <p style={{ margin: 0 }}>Loading…</p> : moves.length === 0 ? <p style={{ margin: 0, fontSize: 14, color: "var(--u-ink-secondary)" }}>No product group has enough like-for-like purchases from at least five organisations in {currency} yet.</p> : (
          <>
            <p style={{ margin: "0 0 10px", fontSize: 13.5, color: "var(--u-ink-secondary)" }}>How each group's like-for-like cost moved in {currency}: the latest month against the one before, the change since the first month shown, and volatility (how much the monthly changes swing). Select a group name to open its prices below.</p>
            <DataTable<Move> rows={moves} rowKey={(m) => m.category} columns={moveCols} caption={`Cost movement by product group, in ${currency}`} exportName={`price-movement-${currency}`} selectedKey={category} />
          </>
        )}
        <div style={{ marginTop: 8 }}><SourceNote keys={["cost"]} /></div>
      </Card>
      {moves.length > 0 && (
        <SectionTrend title="Compare product groups" metrics={cmpMetrics} metric={cmpMetric} onMetric={setCmpMetric} sources={["cost"]} exportName="price-compare-groups"
          filters={<div role="group" aria-label="Product groups to compare (up to five)" style={{ display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 560 }}>{moves.map((m) => <button key={m.category} type="button" className="u-touch" style={pill(picked.includes(m.category))} aria-pressed={picked.includes(m.category)} onClick={() => toggleCompare(m.category)}>{m.category}</button>)}</div>} />
      )}
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <Field label="Product group">
            <select style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)} disabled={!cats}>
              {!cats && <option>Loading…</option>}
              {cats?.map((c) => <option key={c.category} value={c.category}>{c.category}</option>)}
            </select>
          </Field>
          <Field label="Split by">
            <select style={inputStyle} value={by} onChange={(e) => setBy(e.target.value as InsightsPriceDimension)}>{DIMENSIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</select>
          </Field>
          <Field label="Agreed in" hint="Prices are shown in the currency they were agreed in. Use Show costs in, below, to convert.">
            <select style={inputStyle} value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={currencies.length < 2}>
              {(currencies.length ? currencies : [currency]).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        {selected && <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>{selected.sourceCount} organisations have contributed {selected.observations.toLocaleString()} price points to this group. A figure is only shown when at least five different organisations are behind it.</p>}
      </Card>
      <CurrencyBar fx={fx} months={trendRows.map((p) => p.month)} target={lens.target} mode={lens.mode} asOf={lens.asOf} />
      <SectionTrend title={`${category || "Price"} over time`} metrics={trendMetrics} metric={metric} onMetric={setMetric} loading={!trend} sources={["cost", "fx"]} exportName={`prices-${category}`} />
      <Card title={`Price by ${DIMENSIONS.find((d) => d.value === by)?.label.toLowerCase()}`}>
        {!rows ? <p>Loading…</p> : shownRows.length === 0 ? <p style={{ color: "var(--u-ink-secondary)", fontSize: 14 }}>Not enough contributors in any split of this group to show a breakdown.</p> : (
          <DataTable<(typeof shownRows)[number]> rows={shownRows} rowKey={(r) => `${r.label}-${r.currency}`} columns={priceCols} caption={`Average price in ${fx.ccy} for ${category}`} exportName={`prices-${category}-by-${by}`} />
        )}
      </Card>
    <SourceNote keys={["cost", "fx", "regions"]} />
    </Page>
  );
}
