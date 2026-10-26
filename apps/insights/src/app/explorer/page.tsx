"use client";

import { useEffect, useMemo, useState } from "react";
import type { InsightsPriceMovement, InsightsReferenceCountry, LogisticsRouteSummary, ProductSourcingSummary } from "@universe/types";
import { catalogueGroupForCommodity } from "@universe/types";
import { DataTable, type Col } from "../../components/DataTable";
import { SourceNote } from "../../components/SourceNote";
import { apiClient } from "../../lib/apiClient";
import { totalsOf } from "../../lib/geo";
import { readParam, useViewBridge } from "../../lib/views";
import { useCountries } from "../../lib/useCountries";
import { Card, ErrorNote, Heading, Page, pill } from "../../lib/ui";

type Lens = "group" | "country";

interface GroupRow { group: string; change: number | null; costOrgs: number | null; sourceCountries: number | null; approvals: number | null; shipments: number | null; days: number | null; co2: number | null; sea: number | null; air: number | null; land: number | null }
interface CountryRow { code: string; name: string; madeApprovals: number | null; madeGroups: number | null; shipmentsOut: number | null; shipmentsIn: number | null; restrictions: number | null; registrations: number | null; notices: number | null }

const sub: React.CSSProperties = { margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" };
const num = (v: number | null, d = 0) => (v === null ? "—" : v.toLocaleString("en-GB", { maximumFractionDigits: d, minimumFractionDigits: d }));
const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
/** Direction is always written (arrow and sign), never carried by colour. */
const signed = (v: number | null) => (v === null ? "—" : Math.abs(v) < 0.05 ? "▬ No change" : `${v > 0 ? "▲ +" : "▼ −"}${Math.abs(v).toFixed(1)}%`);

export default function ExplorerPage() {
  const countries = useCountries();
  const [mv, setMv] = useState<InsightsPriceMovement[] | null>(null);
  const [src, setSrc] = useState<ProductSourcingSummary[] | null>(null);
  const [routes, setRoutes] = useState<LogisticsRouteSummary[] | null>(null);
  const [ref, setRef] = useState<InsightsReferenceCountry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [lens, setLens] = useState<Lens>((readParam("lens") as Lens) === "country" ? "country" : "group");
  const [currency, setCurrency] = useState("");

  useEffect(() => {
    const fail = (what: string) => (e: unknown) => setErr(e instanceof Error ? e.message : `Could not load ${what}.`);
    apiClient.insightsPriceMovement().then(setMv).catch((e) => { setMv([]); fail("cost movement")(e); });
    apiClient.insightsSourcing().then(setSrc).catch((e) => { setSrc([]); fail("sourcing")(e); });
    apiClient.insightsLogisticsRoutes({}).then(setRoutes).catch((e) => { setRoutes([]); fail("transport")(e); });
    apiClient.insightsReferenceCountries().then(setRef).catch((e) => { setRef([]); fail("regulatory reference")(e); });
  }, []);
  useViewBridge(() => ({ lens, currency }), (s) => { if (s.lens) setLens(s.lens as Lens); if (s.currency) setCurrency(s.currency as string); });

  const currencies = useMemo(() => [...new Set((mv ?? []).map((s) => s.currency))].sort(), [mv]);
  useEffect(() => { if (currencies.length && !currencies.includes(currency)) setCurrency(currencies.includes("USD") ? "USD" : currencies[0]!); }, [currencies, currency]);

  const groupRows = useMemo<GroupRow[]>(() => {
    const names = new Set<string>();
    const cost = new Map<string, { change: number; orgs: number }>();
    for (const s of mv ?? []) {
      if (s.segmentBy !== null || s.currency !== currency || !s.points.length) continue;
      const last = s.points[s.points.length - 1]!; cost.set(s.category, { change: last.index - 100, orgs: last.sourceCount }); names.add(s.category);
    }
    const made = new Map<string, { approvals: number; countries: Set<string> }>();
    for (const r of src ?? []) {
      const e = made.get(r.category) ?? { approvals: 0, countries: new Set<string>() };
      e.approvals += r.approvalCount; if (r.manufactureCountryCode) e.countries.add(r.manufactureCountryCode);
      made.set(r.category, e); names.add(r.category);
    }
    const ship = new Map<string, LogisticsRouteSummary[]>();
    for (const r of routes ?? []) {
      const g = catalogueGroupForCommodity(r.commodityGroup); if (!g) continue;
      ship.set(g, [...(ship.get(g) ?? []), r]); names.add(g);
    }
    return [...names].sort((a, b) => a.localeCompare(b)).map((group) => {
      const c = cost.get(group), m = made.get(group), rows = ship.get(group);
      const t = rows ? totalsOf(rows) : null;
      const share = (mode: string) => (t && t.shipments ? totalsOf(rows!.filter((r) => r.transportMode === mode)).shipments / t.shipments : null);
      return { group, change: c ? c.change : null, costOrgs: c ? c.orgs : null, sourceCountries: m ? m.countries.size : null, approvals: m ? m.approvals : null,
        shipments: t ? t.shipments : null, days: t ? t.avgDays : null, co2: t ? t.avgCo2 : null, sea: share("SEA"), air: share("AIR"), land: share("LAND") };
    });
  }, [mv, src, routes, currency]);

  const countryRows = useMemo<CountryRow[]>(() => {
    const codes = new Set<string>();
    const made = new Map<string, { approvals: number; groups: Set<string> }>();
    for (const r of src ?? []) { if (!r.manufactureCountryCode) continue; const e = made.get(r.manufactureCountryCode) ?? { approvals: 0, groups: new Set<string>() }; e.approvals += r.approvalCount; e.groups.add(r.category); made.set(r.manufactureCountryCode, e); codes.add(r.manufactureCountryCode); }
    const out = new Map<string, number>(), inn = new Map<string, number>();
    for (const r of routes ?? []) {
      if (r.manufactureCountryCode) { out.set(r.manufactureCountryCode, (out.get(r.manufactureCountryCode) ?? 0) + r.shipmentCount); codes.add(r.manufactureCountryCode); }
      if (r.destinationCountryCode) { inn.set(r.destinationCountryCode, (inn.get(r.destinationCountryCode) ?? 0) + r.shipmentCount); codes.add(r.destinationCountryCode); }
    }
    const rf = new Map((ref ?? []).map((r) => [r.countryCode, r]));
    for (const c of rf.keys()) codes.add(c);
    return [...codes].map((code) => {
      const m = made.get(code), r = rf.get(code);
      return { code, name: countries.find((c) => c.code === code)?.name ?? code, madeApprovals: m ? m.approvals : null, madeGroups: m ? m.groups.size : null,
        shipmentsOut: out.get(code) ?? null, shipmentsIn: inn.get(code) ?? null, restrictions: r ? r.exportRestrictions : null, registrations: r ? r.registrations : null, notices: r ? r.safetyNotices : null };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [src, routes, ref, countries]);

  const groupCols: Col<GroupRow>[] = [
    { key: "group", header: "Product group", value: (r) => r.group },
    { key: "change", header: `Cost change (${currency || "…"})`, align: "right", value: (r) => (r.change === null ? null : Number(r.change.toFixed(1))), render: (r) => signed(r.change) },
    { key: "costOrgs", header: "Organisations behind cost", align: "right", value: (r) => r.costOrgs, render: (r) => num(r.costOrgs), hiddenByDefault: true },
    { key: "approvals", header: "Approved sourcing relationships", align: "right", value: (r) => r.approvals, render: (r) => num(r.approvals) },
    { key: "countries", header: "Countries of manufacture", align: "right", value: (r) => r.sourceCountries, render: (r) => num(r.sourceCountries) },
    { key: "shipments", header: "Shipments", align: "right", value: (r) => r.shipments, render: (r) => num(r.shipments) },
    { key: "days", header: "Average days in transit", align: "right", value: (r) => (r.days === null ? null : Number(r.days.toFixed(1))), render: (r) => num(r.days, 1) },
    { key: "co2", header: "Average CO2 per shipment (kg)", align: "right", value: (r) => (r.co2 === null ? null : Math.round(r.co2)), render: (r) => num(r.co2), hiddenByDefault: true },
    { key: "sea", header: "Sea share", align: "right", value: (r) => (r.sea === null ? null : Math.round(r.sea * 100)), render: (r) => pct(r.sea), hiddenByDefault: true },
    { key: "air", header: "Air share", align: "right", value: (r) => (r.air === null ? null : Math.round(r.air * 100)), render: (r) => pct(r.air), hiddenByDefault: true },
    { key: "land", header: "Land share", align: "right", value: (r) => (r.land === null ? null : Math.round(r.land * 100)), render: (r) => pct(r.land), hiddenByDefault: true },
  ];
  const countryCols: Col<CountryRow>[] = [
    { key: "name", header: "Country", value: (r) => r.name },
    { key: "made", header: "Approved sourcing relationships (made here)", align: "right", value: (r) => r.madeApprovals, render: (r) => num(r.madeApprovals) },
    { key: "groups", header: "Product groups made here", align: "right", value: (r) => r.madeGroups, render: (r) => num(r.madeGroups), hiddenByDefault: true },
    { key: "out", header: "Shipments sent", align: "right", value: (r) => r.shipmentsOut, render: (r) => num(r.shipmentsOut) },
    { key: "in", header: "Shipments received", align: "right", value: (r) => r.shipmentsIn, render: (r) => num(r.shipmentsIn) },
    { key: "res", header: "Active export restrictions", align: "right", value: (r) => r.restrictions, render: (r) => num(r.restrictions) },
    { key: "reg", header: "Active registrations", align: "right", value: (r) => r.registrations, render: (r) => num(r.registrations), hiddenByDefault: true },
    { key: "notice", header: "Open safety notices", align: "right", value: (r) => r.notices, render: (r) => num(r.notices), hiddenByDefault: true },
  ];

  const loading = mv === null || src === null || routes === null || ref === null;
  return (
    <Page>
      <Heading title="Data explorer" sub="Figures from every lens side by side in one table: cost movement, sourcing, shipping and regulatory counts. Search, filter, sort and choose columns. Anonymised; a figure is only shown when at least five organisations contribute to it, and a dash means not enough contributors yet." />
      <ErrorNote message={err} />
      <div role="group" aria-label="Rows" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5, fontWeight: 600 }}>
        One row per
        <button type="button" className="u-touch" style={pill(lens === "group")} aria-pressed={lens === "group"} onClick={() => setLens("group")}>Product group</button>
        <button type="button" className="u-touch" style={pill(lens === "country")} aria-pressed={lens === "country"} onClick={() => setLens("country")}>Country</button>
        {lens === "group" && currencies.length > 1 && <>
          <span style={{ marginLeft: 12 }}>Currency (not converted)</span>
          {currencies.map((c) => <button key={c} type="button" className="u-touch" style={pill(currency === c)} aria-pressed={currency === c} onClick={() => setCurrency(c)}>{c}</button>)}
        </>}
      </div>
      <Card>
        {loading ? <p style={{ margin: 0 }}>Loading…</p> : lens === "group" ? (
          <DataTable<GroupRow> rows={groupRows} rowKey={(r) => r.group} columns={groupCols} caption={`Product groups across cost, sourcing and shipping lenses, cost in ${currency}`} exportName="data-explorer-product-groups" empty="No product group has enough contributors yet." />
        ) : (
          <DataTable<CountryRow> rows={countryRows} rowKey={(r) => r.code} columns={countryCols} caption="Countries across sourcing, shipping and regulatory lenses" exportName="data-explorer-countries" empty="No country has enough contributors yet." />
        )}
      </Card>
      <p style={sub}>Cost change is the like-for-like movement since the first month shown. Shipping figures cover the ten product groups whose shipments are tagged with a group. Regulatory counts are shared catalogue reference data.</p>
      <SourceNote keys={["cost", "logistics"]} />
    </Page>
  );
}
