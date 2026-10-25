"use client";

import { DataTable, type Col } from "../../components/DataTable";
import { useEffect, useMemo, useState } from "react";
import type { ProductSourcingSummary } from "@universe/types";
import { WorldMap, type WorldMapPoint } from "@universe/ui";
import { readParam, useViewBridge } from "../../lib/views";
import { apiClient } from "../../lib/apiClient";
import { useCountries } from "../../lib/useCountries";
import { Card, ErrorNote, Field, Heading, Page, inputStyle } from "../../lib/ui";

export default function SourcingPage() {
  const [rows, setRows] = useState<ProductSourcingSummary[] | null>(null);
  const [group, setGroup] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const countries = useCountries();

  useEffect(() => { apiClient.insightsSourcing().then(setRows).catch((e) => setErr(e instanceof Error ? e.message : "Could not load sourcing.")); }, []);
  const groups = useMemo(() => [...new Set((rows ?? []).map((r) => r.category))].sort(), [rows]);
  const byCountry = useMemo(() => {
    const m = new Map<string, { code: string; approvals: number; orgs: number; groups: Set<string> }>();
    for (const r of rows ?? []) {
      if (!r.manufactureCountryCode || (group && r.category !== group)) continue;
      const e = m.get(r.manufactureCountryCode) ?? { code: r.manufactureCountryCode, approvals: 0, orgs: 0, groups: new Set<string>() };
      e.approvals += r.approvalCount; e.orgs = Math.max(e.orgs, r.sourceCount); e.groups.add(r.category);
      m.set(r.manufactureCountryCode, e);
    }
    return [...m.values()].sort((a, b) => b.approvals - a.approvals);
  }, [rows, group]);
  const points: WorldMapPoint[] = byCountry.flatMap((e) => {
    const c = countries.find((x) => x.code === e.code);
    if (!c || c.latitude === null || c.longitude === null) return [];
    return [{ id: e.code, latitude: c.latitude, longitude: c.longitude, label: c.name, color: "var(--u-org-accent, var(--u-brand-violet))", value: e.approvals, tooltipLines: [{ text: `${e.approvals.toLocaleString()} approved sourcing relationships` }, { text: `${e.groups.size} product group${e.groups.size === 1 ? "" : "s"}` }] }];
  });
  const total = byCountry.reduce((a, e) => a + e.approvals, 0);

  const countryCols: Col<(typeof byCountry)[number]>[] = [
    { key: "country", header: "Country", value: (e) => countries.find((c) => c.code === e.code)?.name ?? e.code },
    { key: "approvals", header: "Approved sourcing relationships", align: "right", value: (e) => e.approvals, render: (e) => e.approvals.toLocaleString() },
    { key: "groups", header: "Product groups", align: "right", value: (e) => e.groups.size },
  ];

  useViewBridge(() => ({ group }), (s) => { if (s.group !== undefined) setGroup(s.group); });

  return (
    <Page>
      <Heading title="Sourcing" sub="Where products are made, based on the manufacturers organisations have approved for sourcing. No organisation or manufacturer is named." />
      <ErrorNote message={err} />
      <Card>
        <Field label="Product group">
          <select style={{ ...inputStyle, maxWidth: 320 }} value={group} onChange={(e) => setGroup(e.target.value)} disabled={!rows}>
            <option value="">All product groups</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>
        <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>{rows ? `${total.toLocaleString()} approved sourcing relationships across ${byCountry.length} countries of manufacture.` : "Loading…"} A country appears only when at least five different organisations are behind it.</p>
      </Card>
      <Card title="Countries of manufacture">
        <WorldMap points={points} maxHeight={380} emptyMessage="No country has enough contributors to show yet." />
      </Card>
      <Card title="The same data as a table">
        {byCountry.length === 0 ? <p style={{ color: "var(--u-ink-secondary)", fontSize: 14 }}>Nothing to show for this selection.</p> : (
          <DataTable<(typeof byCountry)[number]> rows={byCountry} rowKey={(e) => e.code} columns={countryCols} caption="Approved sourcing relationships by country of manufacture" exportName="sourcing-by-country" />
        )}
      </Card>
    </Page>
  );
}
