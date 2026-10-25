"use client";

import { useEffect, useMemo, useState } from "react";
import type { InsightsPriceBreakdownRow, InsightsPriceDimension, InsightsPriceTrendPoint, InsightsPricedCategory } from "@universe/types";
import { readParam, useViewBridge } from "../../lib/views";
import { apiClient } from "../../lib/apiClient";
import { SourceNote } from "../../components/SourceNote";
import { Card, ErrorNote, Field, Heading, Page, inputStyle } from "../../lib/ui";
import { fmtMoney, monthLabel, regionLabel } from "../../lib/format";
import { DataTable, type Col } from "../../components/DataTable";
import { TrendChart } from "../../components/TrendChart";

const DIMENSIONS: { value: InsightsPriceDimension; label: string }[] = [
  { value: "destinationRegion", label: "Where it is delivered" },
  { value: "manufactureRegion", label: "Where it is made" },
  { value: "incoterm", label: "Delivery terms (Incoterm)" },
];

export default function PricesPage() {
  const [cats, setCats] = useState<InsightsPricedCategory[] | null>(null);
  const [category, setCategory] = useState("");
  const [by, setBy] = useState<InsightsPriceDimension>("destinationRegion");
  const [trend, setTrend] = useState<InsightsPriceTrendPoint[] | null>(null);
  const [rows, setRows] = useState<InsightsPriceBreakdownRow[] | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [err, setErr] = useState<string | null>(null);

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
  const points = (trend ?? []).filter((p) => p.currency === currency).map((p) => ({ label: monthLabel(p.month), avg: p.avgPrice, min: p.minPrice, max: p.maxPrice, sources: p.sourceCount }));
  const shownRows = (rows ?? []).filter((r) => r.currency === currency);
  const maxAvg = Math.max(1, ...shownRows.map((r) => r.avgPrice));
  const selected = cats?.find((c) => c.category === category);

  const priceCols: Col<(typeof shownRows)[number]>[] = [
    { key: "label", header: DIMENSIONS.find((d) => d.value === by)?.label ?? "Split", value: (r) => (by === "incoterm" ? r.label ?? "Not stated" : regionLabel(r.label)) },
    { key: "avg", header: "Average", value: (r) => r.avgPrice, render: (r) => <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div aria-hidden style={{ height: 8, width: `${Math.max(4, (r.avgPrice / maxAvg) * 100)}%`, maxWidth: 140, background: "var(--u-org-accent, var(--u-brand-violet))", borderRadius: 4 }} /><span>{fmtMoney(r.avgPrice)}</span></div> },
    { key: "min", header: "Lowest", align: "right", value: (r) => r.minPrice, render: (r) => fmtMoney(r.minPrice) },
    { key: "max", header: "Highest", align: "right", value: (r) => r.maxPrice, render: (r) => fmtMoney(r.maxPrice) },
    { key: "orgs", header: "Organisations", align: "right", value: (r) => r.sourceCount },
  ];

  useViewBridge(() => ({ category, by, currency }), (s) => { if (s.category) setCategory(s.category); if (s.by) setBy(s.by); if (s.currency) setCurrency(s.currency); });

  return (
    <Page>
      <Heading title="Prices" sub="What products in each group cost at source: the supplier or manufacturer price before any margin, from real purchases recorded by organisations on Universe. Names are never shown." />
      <ErrorNote message={err} />
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
          <Field label="Currency" hint="Prices are not converted between currencies.">
            <select style={inputStyle} value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={currencies.length < 2}>
              {(currencies.length ? currencies : [currency]).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        {selected && <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>{selected.sourceCount} organisations have contributed {selected.observations.toLocaleString()} price points to this group. A figure is only shown when at least five different organisations are behind it.</p>}
      </Card>
      <Card title="Price over time">
        {!trend ? <p>Loading…</p> : <TrendChart points={points} currency={currency} title={`${category} price over time`} />}
      </Card>
      <Card title={`Price by ${DIMENSIONS.find((d) => d.value === by)?.label.toLowerCase()}`}>
        {!rows ? <p>Loading…</p> : shownRows.length === 0 ? <p style={{ color: "var(--u-ink-secondary)", fontSize: 14 }}>Not enough contributors in any split of this group to show a breakdown.</p> : (
          <DataTable<(typeof shownRows)[number]> rows={shownRows} rowKey={(r) => `${r.label}-${r.currency}`} columns={priceCols} caption={`Average price in ${currency} for ${category}`} exportName={`prices-${category}-by-${by}`} />
        )}
      </Card>
    <SourceNote keys={["cost", "regions"]} />
    </Page>
  );
}
