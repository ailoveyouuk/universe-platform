"use client";

import { useEffect, useMemo, useState } from "react";
import type { NetworkSavedSearchRecord, NetworkSearchResult } from "@universe/types";
import { SCOPE_TAXONOMY } from "@universe/types";
import { Button, BuildingIcon, CheckCircleIcon, CountryMultiSelect, GlobeIcon, Pill, SearchInput, Select, ShieldIcon, StatTile, StatTileGrid } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { useCountries } from "../../lib/useCountries";
import { OrgName } from "../../components/OrgName";
import { SavedSearchesPanel } from "../../components/SavedSearchesPanel";
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
  DEVICE_REGISTRATION: "Device registration", COMPANY_REGISTRATION: "Company registration", IATA_DGR_CERTIFICATION: "IATA DGR", AEO_ACCREDITATION: "AEO accreditation", BUSINESS_INSURANCE: "Business insurance",
};
const SUB_LABEL: Record<string, string> = Object.fromEntries(SCOPE_TAXONOMY.flatMap((g) => g.subs.map((s) => [s.id, s.label])));
const muted = { color: "var(--u-ink-secondary)", fontSize: 13 } as const;
const bare = { border: "none", background: "none", padding: 0, cursor: "pointer" } as const;
const PAGE = 50;

interface Filters { q: string; type: string; scope: string[]; countries: string[]; certs: string[]; minYears: string; warehousing: string; whoPq: boolean; localMfr: boolean; certified: boolean; sort: string; offset: number }
const EMPTY: Filters = { q: "", type: "", scope: [], countries: [], certs: [], minYears: "", warehousing: "", whoPq: false, localMfr: false, certified: false, sort: "name", offset: 0 };

/**
 * Find suppliers (2026-10-23): the network directory. Organisations that have published their profile in Admin. A four-tile dashboard whose tiles filter or
 * break down the list, and full-depth filters: scope, countries, certifications held, type, experience, warehousing, WHO prequalification and local manufacturing.
 * The other half of "Find tenders": issuers and donors find suppliers here, suppliers see scope-matched tenders there.
 */
export default function FindSuppliersPage() {
  const countries = useCountries();
  const [f, setF] = useState<Filters>(EMPTY);
  const set = (patch: Partial<Filters>) => setF((x) => ({ ...x, offset: 0, ...patch }));
  const [res, setRes] = useState<NetworkSearchResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [by, setBy] = useState<"" | "countries" | "scope" | "certifications" | "types">("");
  const [group, setGroup] = useState("");
  const [saved, setSaved] = useState<NetworkSavedSearchRecord[]>([]);
  useEffect(() => { apiClient.listNetworkSavedSearches().then(setSaved).catch(() => undefined); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      apiClient
        .searchNetwork({ q: f.q, type: f.type, scope: f.scope.join(","), country: f.countries.join(","), certType: f.certs.join(","), minYears: Number(f.minYears) || undefined, warehousing: f.warehousing, whoPq: f.whoPq, localMfr: f.localMfr, certified: f.certified, sort: f.sort, offset: f.offset })
        .then((r) => { setRes(r); setErr(null); })
        .catch((e) => setErr(e instanceof Error ? e.message : "Could not search the directory."));
    }, 250);
    return () => clearTimeout(t);
  }, [f]);

  const subs = useMemo(() => SCOPE_TAXONOMY.find((g) => g.group === group)?.subs ?? [], [group]);
  const nameOf = (code: string) => countries.find((c) => c.code === code)?.name ?? code;
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const activeCount = f.scope.length + f.countries.length + f.certs.length + [f.q, f.type, f.minYears, f.warehousing].filter(Boolean).length + [f.whoPq, f.localMfr, f.certified].filter(Boolean).length;
  const facet = by ? res?.facets[by] ?? [] : [];
  const label = (k: string) => (by === "countries" ? nameOf(k) : by === "scope" ? SUB_LABEL[k] ?? k : by === "certifications" ? CERTS[k] ?? k.replace(/_/g, " ") : ORG_TYPES[k] ?? k);
  const isOn = (k: string) => (by === "countries" ? f.countries.includes(k) : by === "scope" ? f.scope.includes(k) : by === "certifications" ? f.certs.includes(k) : f.type === k);
  const pick = (k: string) => (by === "countries" ? set({ countries: toggle(f.countries, k) }) : by === "scope" ? set({ scope: toggle(f.scope, k) }) : by === "certifications" ? set({ certs: toggle(f.certs, k) }) : set({ type: f.type === k ? "" : k }));
  const st = res?.stats;
  const describe = (c: NetworkSavedSearchRecord["criteria"]) => [
    c.q && `“${c.q}”`, c.type && (ORG_TYPES[c.type] ?? c.type), c.scope?.length && `${c.scope.length} categor${c.scope.length === 1 ? "y" : "ies"}`,
    c.country?.length && c.country.map(nameOf).slice(0, 3).join(", ") + (c.country.length > 3 ? ` +${c.country.length - 3}` : ""),
    c.certType?.length && c.certType.map((t) => CERTS[t] ?? t).join(", "), c.certified && "Certified", c.whoPq && "WHO prequalified", c.localMfr && "Local manufacturer",
    c.minYears && `${c.minYears}+ years`, c.warehousing && `Warehousing: ${c.warehousing.toLowerCase()}`,
  ].filter(Boolean).join(" · ");

  return (
    <Page>
      <Heading title="Find suppliers" sub="Organisations that have published their profile. Open a name to see its full profile." />
      <ErrorNote message={err} />
      <StatTileGrid>
        <StatTile label="Organisations" value={st?.suppliers} icon={<BuildingIcon size={18} />} tone="brand" active={by === "types"} onClick={() => setBy(by === "types" ? "" : "types")} />
        <StatTile label="Countries covered" value={st?.countries} icon={<GlobeIcon size={18} />} tone="brand" active={by === "countries"} onClick={() => setBy(by === "countries" ? "" : "countries")} />
        <StatTile label="Categories covered" value={st?.categories} icon={<ShieldIcon size={18} />} tone="neutral" active={by === "scope"} onClick={() => setBy(by === "scope" ? "" : "scope")} />
        <StatTile label="Hold a certification" value={st?.certified} icon={<CheckCircleIcon size={18} />} tone="good" active={f.certified} onClick={() => set({ certified: !f.certified })} />
      </StatTileGrid>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={muted}>Break down by</span>
        {([["types", "Type"], ["countries", "Country"], ["scope", "Category"], ["certifications", "Certification"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setBy(by === k ? "" : k)} className="u-touch" style={bare}><Pill tone={by === k ? "brand" : "neutral"}>{l}</Pill></button>
        ))}
      </div>
      {by && (
        <Card>
          {facet.length === 0 ? <span style={{ ...muted, fontSize: 14 }}>Nothing to break down.</span> : (
            <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {facet.slice(0, 60).map((x) => <button key={x.key} type="button" onClick={() => pick(x.key)} className="u-touch" style={bare}><Pill tone={isOn(x.key) ? "brand" : "neutral"}>{label(x.key)} · {x.count}</Pill></button>)}
              </div>
              {facet.length > 60 && <div style={{ ...muted, marginTop: 8 }}>Showing the 60 largest of {facet.length}. Use the filters to narrow further.</div>}
            </>
          )}
        </Card>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, alignItems: "end" }}>
        <SearchInput value={f.q} onChange={(v) => set({ q: v })} placeholder="Search name, description or manufacturers" />
        <Select value={f.type} onChange={(v) => set({ type: v })} allLabel="Any type" options={Object.entries(ORG_TYPES).map(([value, label]) => ({ value, label }))} ariaLabel="Organisation type" />
        <Select value={group} onChange={setGroup} allLabel="Pick a category group…" options={SCOPE_TAXONOMY.map((g) => ({ value: g.group, label: g.group }))} ariaLabel="Category group" />
        <CountryMultiSelect value={f.countries} onChange={(v) => set({ countries: v })} options={countries} ariaLabel="Countries of operation" />
        <Select value={f.sort} onChange={(v) => set({ sort: v })} options={[{ value: "name", label: "Name A to Z" }, { value: "years", label: "Most experienced" }, { value: "categories", label: "Most categories" }, { value: "countries", label: "Most countries" }, { value: "certifications", label: "Most certifications" }]} ariaLabel="Sort" />
        <Button variant="secondary" onClick={() => setMore(!more)}>{more ? "Fewer filters" : "More filters"}</Button>
      </div>
      {group && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {subs.map((s) => <button key={s.id} type="button" onClick={() => set({ scope: toggle(f.scope, s.id) })} className="u-touch" style={bare}><Pill tone={f.scope.includes(s.id) ? "brand" : "neutral"}>{s.label}</Pill></button>)}
        </div>
      )}
      {more && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, alignItems: "end" }}>
            <Select value={f.minYears} onChange={(v) => set({ minYears: v })} allLabel="Any experience" options={[{ value: "2", label: "2+ years in operation" }, { value: "5", label: "5+ years" }, { value: "10", label: "10+ years" }, { value: "20", label: "20+ years" }]} ariaLabel="Minimum years in operation" />
            <Select value={f.warehousing} onChange={(v) => set({ warehousing: v })} allLabel="Any warehousing" options={[{ value: "OWN", label: "Own warehousing" }, { value: "THIRD_PARTY", label: "Third-party warehousing" }, { value: "MIXED", label: "Own and third-party" }]} ariaLabel="Warehousing" />
            <label style={{ fontSize: 13.5, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={f.certified} onChange={(e) => set({ certified: e.target.checked })} /> Holds any current certification</label>
            <label style={{ fontSize: 13.5, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={f.whoPq} onChange={(e) => set({ whoPq: e.target.checked })} /> WHO prequalified</label>
            <label style={{ fontSize: 13.5, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={f.localMfr} onChange={(e) => set({ localMfr: e.target.checked })} /> Local manufacturer</label>
          </div>
          <div>
            <div style={{ ...muted, marginBottom: 6 }}>Must hold all of these current certifications</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.entries(CERTS).map(([k, l]) => <button key={k} type="button" onClick={() => set({ certs: toggle(f.certs, k) })} className="u-touch" style={bare}><Pill tone={f.certs.includes(k) ? "brand" : "neutral"}>{l}</Pill></button>)}
            </div>
          </div>
        </>
      )}
      {f.scope.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={muted}>Any of:</span>
          {f.scope.map((id) => <button key={id} type="button" onClick={() => set({ scope: toggle(f.scope, id) })} className="u-touch" style={bare}><Pill tone="brand">{SUB_LABEL[id] ?? id} ✕</Pill></button>)}
        </div>
      )}
      {activeCount > 0 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13.5 }}>
          <span style={muted}>{activeCount} filter{activeCount === 1 ? "" : "s"} applied · {res?.total ?? 0} organisation{res?.total === 1 ? "" : "s"}</span>
          <button type="button" onClick={() => { setF({ ...EMPTY, sort: f.sort }); setGroup(""); }} style={{ ...bare, color: "var(--u-link)", fontFamily: "inherit", fontSize: 13.5 }}>Clear all</button>
        </div>
      )}
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
        {res && res.total > PAGE && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--u-border)", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", ...muted }}>
            <span>Showing {f.offset + 1} to {Math.min(f.offset + PAGE, res.total)} of {res.total}</span>
            <Button variant="secondary" disabled={f.offset === 0} onClick={() => setF({ ...f, offset: Math.max(0, f.offset - PAGE) })}>Previous</Button>
            <Button variant="secondary" disabled={f.offset + PAGE >= res.total} onClick={() => setF({ ...f, offset: f.offset + PAGE })}>Next</Button>
          </div>
        )}
      </Card>
      <SavedSearchesPanel
        title="Saved searches" noun="supplier" canSave={activeCount > 0}
        rows={saved.map((s) => ({ id: s.id, name: s.name, alertsEnabled: s.alertsEnabled, summary: describe(s.criteria) }))}
        onSave={async (name, alertsEnabled) => {
          try {
            await apiClient.saveNetworkSearch({ name, alertsEnabled, q: f.q || undefined, type: f.type || undefined, scope: f.scope, country: f.countries, certType: f.certs, certified: f.certified || undefined, whoPq: f.whoPq || undefined, localMfr: f.localMfr || undefined, minYears: Number(f.minYears) || undefined, warehousing: f.warehousing || undefined });
            setSaved(await apiClient.listNetworkSavedSearches());
          } catch (e) { setErr(e instanceof Error ? e.message : "Could not save the search."); }
        }}
        onApply={(id) => { const c = saved.find((x) => x.id === id)?.criteria; if (c) { setF({ ...EMPTY, sort: f.sort, q: c.q ?? "", type: c.type ?? "", scope: c.scope ?? [], countries: c.country ?? [], certs: c.certType ?? [], certified: !!c.certified, whoPq: !!c.whoPq, localMfr: !!c.localMfr, minYears: c.minYears ? String(c.minYears) : "", warehousing: c.warehousing ?? "" }); setMore(true); } }}
        onToggleAlerts={async (id, enabled) => { await apiClient.updateNetworkSavedSearch(id, { alertsEnabled: enabled }); setSaved((x) => x.map((y) => (y.id === id ? { ...y, alertsEnabled: enabled } : y))); }}
        onDelete={async (id) => { await apiClient.deleteNetworkSavedSearch(id); setSaved((x) => x.filter((y) => y.id !== id)); }}
      />
    </Page>
  );
}
