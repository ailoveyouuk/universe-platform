"use client";

import { useEffect, useMemo, useState } from "react";
import type { InsightsPriceMovement, InsightsServicePrice, ServiceCatalogueRow } from "@universe/types";
import { serviceCategoryByCode, servicePricingBasisLabel } from "@universe/types";
import { StatTile, StatTileGrid, GridIcon } from "@universe/ui";
import { DataTable, emptyTableState, type Col, type TableState } from "../../components/DataTable";
import { CurrencyBar } from "../../components/CurrencyBar";
import { SourceNote } from "../../components/SourceNote";
import { apiClient } from "../../lib/apiClient";
import { setFxLens, useFxLens, useFxView } from "../../lib/fx";
import { fmtMoneyIn, regionLabel } from "../../lib/format";
import { useViewBridge } from "../../lib/views";
import { Card, ErrorNote, Heading, Page, pill } from "../../lib/ui";

const sub: React.CSSProperties = { margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" };
const dash = <span style={{ color: "var(--u-ink-secondary)" }}>—</span>;
const key = (c: string, b: string) => `${c}|${b}`;

interface Row { item: ServiceCatalogueRow; group: string; categoryLabel: string; p: InsightsServicePrice | null }

/**
 * Services rate card (2026-10-26): every standard service in the catalogue with the indicative cost range seen for its kind of service and pricing
 * basis. Cost prices only (what suppliers charged before any margin), anonymised, and shown only where at least five organisations contribute. The
 * figures are for the whole kind of service and basis, not for the single named service, and the page says so.
 */
export default function RateCardPage() {
  const [catalogue, setCatalogue] = useState<ServiceCatalogueRow[] | null>(null);
  const [all, setAll] = useState<InsightsServicePrice[] | null>(null);
  const [byRegion, setByRegion] = useState<InsightsServicePrice[] | null>(null);
  const [mv, setMv] = useState<InsightsPriceMovement[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [currency, setCurrency] = useState("");
  const [region, setRegion] = useState("");
  const [tableState, setTableState] = useState<TableState>(() => emptyTableState(["code", "unit"]));

  useEffect(() => {
    const fail = (w: string) => (e: unknown) => setErr(e instanceof Error ? e.message : `Could not load ${w}.`);
    apiClient.serviceCatalogue().then(setCatalogue).catch((e) => { setCatalogue([]); fail("the service list")(e); });
    apiClient.insightsServicePrices(false).then(setAll).catch((e) => { setAll([]); fail("service costs")(e); });
    apiClient.insightsServicePrices(true).then(setByRegion).catch((e) => { setByRegion([]); fail("service costs by region")(e); });
    apiClient.insightsServiceMovement().then(setMv).catch(() => setMv([]));
  }, []);

  const currencies = useMemo(() => [...new Set((all ?? []).map((p) => p.currency))].sort(), [all]);
  useEffect(() => { if (currencies.length && !currencies.includes(currency)) setCurrency(currencies.includes("USD") ? "USD" : currencies[0]!); }, [currencies, currency]);
  const regions = useMemo(() => [...new Set((byRegion ?? []).filter((p) => p.currency === currency).map((p) => p.deliveryRegion).filter((r): r is string => !!r))].sort((a, b) => regionLabel(a).localeCompare(regionLabel(b))), [byRegion, currency]);
  useEffect(() => { if (region && !regions.includes(region)) setRegion(""); }, [regions, region]);

  const months = useMemo(() => [...new Set((mv ?? []).filter((s) => s.currency === currency).flatMap((s) => s.points.map((q) => q.month)))].sort(), [mv, currency]);
  const fx = useFxView(currency, months);
  const lens = useFxLens();

  const priceMap = useMemo(() => {
    const src = region ? (byRegion ?? []).filter((p) => p.deliveryRegion === region) : (all ?? []);
    const m = new Map<string, InsightsServicePrice>();
    for (const p of src) if (p.currency === currency) m.set(key(p.serviceCategory, p.pricingBasis), p);
    return m;
  }, [all, byRegion, currency, region]);

  const rows = useMemo<Row[]>(() => (catalogue ?? []).filter((i) => i.active).map((item) => {
    const cat = serviceCategoryByCode(item.category);
    return { item, group: cat?.group ?? "Other", categoryLabel: cat?.label ?? item.category, p: priceMap.get(key(item.category, item.basis)) ?? null };
  }), [catalogue, priceMap]);

  const money = (v: number, basis: string) => (basis === "PERCENT_OF_GOODS" ? `${v.toFixed(1)}%` : fmtMoneyIn(fx.conv(v), fx.ccy));
  const num = (v: number, basis: string) => (basis === "PERCENT_OF_GOODS" ? v : Math.round(fx.conv(v) * 100) / 100);
  const priced = rows.filter((r) => r.p).length;
  const loading = catalogue === null || all === null;

  const cols: Col<Row>[] = [
    { key: "group", header: "Group", value: (r) => r.group, filter: true },
    { key: "category", header: "Kind of service", value: (r) => r.categoryLabel, filter: true },
    { key: "service", header: "Service", value: (r) => r.item.name, render: (r) => <span style={{ fontWeight: 600 }}>{r.item.name}</span> },
    { key: "code", header: "Code", value: (r) => r.item.code, hiddenByDefault: true },
    { key: "basis", header: "Priced", value: (r) => servicePricingBasisLabel(r.item.basis), filter: true },
    { key: "unit", header: "One unit is", value: (r) => r.item.unit, hiddenByDefault: true },
    { key: "low", header: "Low", align: "right", value: (r) => (r.p ? num(r.p.minPrice, r.item.basis) : null), render: (r) => (r.p ? money(r.p.minPrice, r.item.basis) : dash) },
    { key: "typical", header: "Typical", align: "right", value: (r) => (r.p ? num(r.p.avgPrice, r.item.basis) : null), render: (r) => (r.p ? <strong>{money(r.p.avgPrice, r.item.basis)}</strong> : <span style={{ color: "var(--u-ink-secondary)" }}>Not enough contributors yet</span>) },
    { key: "high", header: "High", align: "right", value: (r) => (r.p ? num(r.p.maxPrice, r.item.basis) : null), render: (r) => (r.p ? money(r.p.maxPrice, r.item.basis) : dash) },
    { key: "orgs", header: "Organisations", align: "right", value: (r) => (r.p ? r.p.sourceCount : null), render: (r) => (r.p ? r.p.sourceCount : dash) },
  ];

  useViewBridge(() => ({ currency, region, table: tableState, lens: { target: lens.target, mode: lens.mode, asOf: lens.asOf } }), (s) => { if (s.lens) setFxLens(s.lens); if (s.currency) setCurrency(s.currency); if (s.region !== undefined) setRegion(s.region); if (s.table) setTableState(s.table); });

  return (
    <Page>
      <Heading title="Services rate card" sub="Indicative cost for each standard service: low, typical and high, in the unit the service is priced in, before any margin. Anonymised; a figure is only shown when at least five organisations contribute, and otherwise the row says so." />
      <ErrorNote message={err} />
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", fontSize: 12.5, fontWeight: 600 }}>
        {currencies.length > 1 && (
          <div role="group" aria-label="Currency" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            Agreed in
            {currencies.map((c) => <button key={c} type="button" className="u-touch" style={pill(currency === c)} aria-pressed={currency === c} onClick={() => setCurrency(c)}>{c}</button>)}
          </div>
        )}
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          Delivered in
          <select value={region} onChange={(e) => setRegion(e.target.value)} style={{ padding: "6px 8px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", font: "inherit", fontSize: 13 }}>
            <option value="">All regions</option>
            {regions.map((r) => <option key={r} value={r}>{regionLabel(r)}</option>)}
          </select>
        </label>
      </div>
      <CurrencyBar fx={fx} months={months} target={lens.target} mode={lens.mode} asOf={lens.asOf} monthly={false} />
      <StatTileGrid>
        <StatTile label="Standard services" value={loading ? "…" : rows.length} icon={<GridIcon size={18} />} />
        <StatTile label="With an indicative cost" value={loading ? "…" : priced} icon={<GridIcon size={18} />} tone="neutral" />
        <StatTile label="Not enough contributors yet" value={loading ? "…" : rows.length - priced} icon={<GridIcon size={18} />} tone="neutral" />
      </StatTileGrid>
      <Card>
        {loading ? <p style={{ margin: 0 }}>Loading…</p> : (
          <DataTable<Row> rows={rows} rowKey={(r) => r.item.code} columns={cols} caption={`Indicative cost of each standard service, in ${fx.ccy}${region ? `, delivered in ${regionLabel(region)}` : ""}`} exportName={`services-rate-card-${currency}`} state={tableState} onState={setTableState} empty="No standard services are listed." />
        )}
      </Card>
      <p style={sub}>The range is what suppliers charged for the whole kind of service on the same pricing basis, so two services of one kind that share a basis show the same figures. It is a guide for budgeting and bid checking, not a price list. Services switched off in the catalogue are not shown.</p>
      <SourceNote keys={["services", "fx"]} />
    </Page>
  );
}
