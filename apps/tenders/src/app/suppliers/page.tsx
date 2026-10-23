"use client";

import { useEffect, useMemo, useState } from "react";
import type { NetworkSearchResult } from "@universe/types";
import { SCOPE_TAXONOMY } from "@universe/types";
import { CountrySelect, Pill, SearchInput, Select } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { useCountries } from "../../lib/useCountries";
import { OrgName } from "../../components/OrgName";
import { Card, ErrorNote, Heading, Page } from "../../lib/ui";

const ORG_TYPES: Record<string, string> = {
  MANUFACTURER: "Manufacturer",
  SUPPLIER: "Supplier / Distributor",
  PROCUREMENT_SERVICE_AGENT: "Procurement Service Agent",
  TENDERING_PURCHASING_BODY: "Tendering & Purchasing Body",
};
const CERTS: Record<string, string> = {
  ISO_13485: "ISO 13485", ISO_9001: "ISO 9001", ISO_14001: "ISO 14001", ISO_17025: "ISO 17025", FDA_REGISTRATION: "FDA registration", GMP: "GMP", GDP: "GDP",
  MIA: "Manufacturer's licence (MIA)", WDA: "Wholesale licence (WDA)", EUDAMED_REGISTRATION: "EUDAMED registration", CE_MDR_CERTIFICATE: "CE / MDR certificate",
  IATA_DGR_CERTIFICATION: "IATA DGR", AEO_ACCREDITATION: "AEO accreditation", BUSINESS_INSURANCE: "Business insurance",
};
const SUB_LABEL: Record<string, string> = Object.fromEntries(SCOPE_TAXONOMY.flatMap((g) => g.subs.map((s) => [s.id, s.label])));
const muted = { color: "var(--u-ink-secondary)", fontSize: 13 } as const;

/**
 * Find suppliers (2026-10-23): the network directory. Organisations that have published their profile in Admin, searchable by scope of supply,
 * country, certification held and type. The other half of "Find tenders": issuers and donors find suppliers here, suppliers see matched tenders there.
 */
export default function FindSuppliersPage() {
  const countries = useCountries();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [group, setGroup] = useState("");
  const [sub, setSub] = useState("");
  const [country, setCountry] = useState("");
  const [cert, setCert] = useState("");
  const [res, setRes] = useState<NetworkSearchResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const subs = useMemo(() => SCOPE_TAXONOMY.find((g) => g.group === group)?.subs ?? [], [group]);
  const scope = sub || subs.map((s) => s.id).join(",");

  useEffect(() => {
    const t = setTimeout(() => {
      apiClient.searchNetwork({ q, type, scope, country, certType: cert }).then((r) => { setRes(r); setErr(null); }).catch((e) => setErr(e instanceof Error ? e.message : "Could not search the directory."));
    }, 250);
    return () => clearTimeout(t);
  }, [q, type, scope, country, cert]);

  const nameOf = (code: string) => countries.find((c) => c.code === code)?.name ?? code;

  return (
    <Page>
      <Heading title="Find suppliers" sub="Organisations that have published their profile. Open a name to see its full profile." />
      <ErrorNote message={err} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, alignItems: "end" }}>
        <SearchInput value={q} onChange={setQ} placeholder="Search name or description" />
        <Select value={type} onChange={setType} allLabel="Any type" options={Object.entries(ORG_TYPES).map(([value, label]) => ({ value, label }))} ariaLabel="Organisation type" />
        <Select value={group} onChange={(v) => { setGroup(v); setSub(""); }} allLabel="Any category" options={SCOPE_TAXONOMY.map((g) => ({ value: g.group, label: g.group }))} ariaLabel="Category" />
        {group && <Select value={sub} onChange={setSub} allLabel={`All ${group}`} options={subs.map((s) => ({ value: s.id, label: s.label }))} ariaLabel="Subcategory" />}
        <CountrySelect value={country} onChange={setCountry} options={countries} />
        <Select value={cert} onChange={setCert} allLabel="Any certification" options={Object.entries(CERTS).map(([value, label]) => ({ value, label }))} ariaLabel="Certification held" />
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {!res && !err && <div style={{ padding: 20, ...muted }}>Loading…</div>}
        {res && res.organizations.length === 0 && <div style={{ padding: 20, ...muted }}>No published organisations match. Organisations appear here once they publish their directory profile in Admin.</div>}
        {res?.organizations.map((o, i) => (
          <div key={o.id} style={{ padding: "14px 20px", borderTop: i ? "1px solid var(--u-border)" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 15 }}><OrgName id={o.id} name={o.name} /></strong>
              <span style={muted}>{ORG_TYPES[o.type] ?? o.type}{o.yearsInOperation ? ` · ${o.yearsInOperation} years` : ""}</span>
            </div>
            {o.description && <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "var(--u-ink-secondary)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{o.description}</p>}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {o.scope.slice(0, 6).map((s) => <Pill key={s} tone="brand">{SUB_LABEL[s] ?? s}</Pill>)}
              {o.scope.length > 6 && <Pill>+{o.scope.length - 6} more</Pill>}
              {o.certificationTypes.map((c) => <Pill key={c} tone="good">{CERTS[c] ?? c.replace(/_/g, " ")}</Pill>)}
              {o.countryCodes.slice(0, 5).map((c) => <Pill key={c}>{nameOf(c)}</Pill>)}
              {o.countryCodes.length > 5 && <Pill>+{o.countryCodes.length - 5} countries</Pill>}
            </div>
          </div>
        ))}
        {res && res.total > res.organizations.length && <div style={{ padding: "12px 20px", borderTop: "1px solid var(--u-border)", ...muted }}>Showing {res.organizations.length} of {res.total}. Narrow the search to see the rest.</div>}
      </Card>
    </Page>
  );
}
