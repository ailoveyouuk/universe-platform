"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { TenderAvailableItem, TenderAvailableResult, TenderSavedSearchCriteria, TenderSavedSearchRecord } from "@universe/types";
import { SCOPE_TAXONOMY } from "@universe/types";
import { Button, CheckCircleIcon, ClockIcon, CountrySelect, GlobeIcon, Pill, SearchIcon, SearchInput, Select, StatTile, StatTileGrid } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { useCountries } from "../../lib/useCountries";
import { SavedSearchesPanel } from "../../components/SavedSearchesPanel";
import { CHIP_LABEL, CHIP_TONE, Card, ErrorNote, Heading, Page, TYPE_LABEL, daysUntil, fmtDateTime } from "../../lib/ui";

const CHIPS = ["ELIGIBLE", "ALMOST_ELIGIBLE", "NOT_ELIGIBLE", "INVITED", "PARTICIPATING", "SHORTLISTED", "CLOSING_SOON", "CLOSED"];

const EMPTY = { chip: "", type: "", country: "", keyword: "", sort: "closing", shortlisted: false, status: "", closingWithinDays: "", publishedWithinDays: "", issuer: "", currency: "", category: "", scopeMatch: false };
type Filters = typeof EMPTY;
const CROSS_LINK = { border: "none", background: "none", padding: 0, cursor: "pointer" } as const;

/**
 * Find tenders (2026-10-19): every published tender is visible, each explained by chips so an organisation sees why it can or cannot bid.
 * 2026-10-23: a four-tile dashboard whose tiles filter the list, a breakdown (by issuer, country, category) that drills down, and full-depth filters.
 */
export default function DiscoverPage() {
  const countries = useCountries();
  const [f, setF] = useState<Filters>(EMPTY);
  const set = (patch: Partial<Filters>) => setF((x) => ({ ...x, ...patch }));
  const [res, setRes] = useState<TenderAvailableResult | null>(null);
  const [forYou, setForYou] = useState<TenderAvailableItem[]>([]);
  const [searches, setSearches] = useState<TenderSavedSearchRecord[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [by, setBy] = useState<"" | "issuers" | "countries" | "categories">("");

  const load = useCallback(() => {
    apiClient
      .listAvailableTenders({ ...f, closingWithinDays: Number(f.closingWithinDays) || undefined, publishedWithinDays: Number(f.publishedWithinDays) || undefined })
      .then((r) => { setRes(r); setErr(null); })
      .catch((e) => setErr(e instanceof Error ? e.message : "Could not load tenders."));
  }, [f]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { apiClient.tendersForYou().then((r) => setForYou(r.tenders.slice(0, 5))).catch(() => undefined); apiClient.listTenderSavedSearches().then(setSearches).catch(() => undefined); }, []);

  const rows = res?.tenders ?? null;
  const counts = res?.counts ?? {};
  const countryName = (code: string) => countries.find((c) => c.code === code)?.name ?? code;
  const activeCount = (Object.keys(EMPTY) as (keyof Filters)[]).filter((k) => k !== "sort" && f[k] !== EMPTY[k]).length;

  const toCriteria = (): TenderSavedSearchCriteria => ({
    keyword: f.keyword || undefined, countries: f.country ? [f.country] : undefined, types: f.type ? [f.type] : undefined, categories: f.category ? [f.category] : undefined,
    onlyEligible: f.chip === "ELIGIBLE" || undefined, chip: f.chip || undefined, issuer: f.issuer || undefined, currency: f.currency || undefined, scopeMatch: f.scopeMatch || undefined,
    status: f.status || undefined, closingWithinDays: Number(f.closingWithinDays) || undefined, publishedWithinDays: Number(f.publishedWithinDays) || undefined, shortlisted: f.shortlisted || undefined,
  });
  const apply = (s: TenderSavedSearchRecord) => {
    const c = s.criteria;
    set({
      ...EMPTY, sort: f.sort, keyword: c.keyword ?? "", country: c.countries?.[0] ?? "", type: c.types?.[0] ?? "", category: c.categories?.[0] ?? "",
      chip: c.chip ?? (c.onlyEligible ? "ELIGIBLE" : ""), issuer: c.issuer ?? "", currency: c.currency ?? "", scopeMatch: !!c.scopeMatch, status: c.status ?? "",
      closingWithinDays: c.closingWithinDays ? String(c.closingWithinDays) : "", publishedWithinDays: c.publishedWithinDays ? String(c.publishedWithinDays) : "", shortlisted: !!c.shortlisted,
    });
    setMore(true);
  };
  const describe = (c: TenderSavedSearchCriteria) => [
    c.keyword && `“${c.keyword}”`, c.types?.length && (TYPE_LABEL[c.types[0] as keyof typeof TYPE_LABEL] ?? c.types[0]), c.countries?.length && countryName(c.countries[0]), c.categories?.length && c.categories[0],
    c.issuer && `Issuer: ${c.issuer}`, c.currency, c.scopeMatch && "Matches my scope", (c.chip || c.onlyEligible) && (CHIP_LABEL[(c.chip ?? "ELIGIBLE") as keyof typeof CHIP_LABEL] ?? c.chip),
    c.status && c.status.toLowerCase(), c.closingWithinDays && `Closing in ${c.closingWithinDays} days`, c.publishedWithinDays && `Published in ${c.publishedWithinDays} days`, c.shortlisted && "Shortlisted",
  ].filter(Boolean).join(" · ");
  const facet = by ? res?.facets?.[by] ?? [] : [];
  const pick = (key: string) => (by === "issuers" ? set({ issuer: f.issuer === key ? "" : key }) : by === "countries" ? set({ country: f.country === key ? "" : key }) : set({ category: f.category === key ? "" : key }));
  const picked = by === "issuers" ? f.issuer : by === "countries" ? f.country : f.category;

  return (
    <Page>
      <Heading title="Find tenders" sub="Every open tender is listed. The labels explain whether your organisation can bid and what to fix if not." />
      <ErrorNote message={err} />
      <StatTileGrid>
        <StatTile label="Open for bids" value={res ? counts.open ?? 0 : undefined} icon={<SearchIcon size={18} />} tone="brand" active={f.status === "PUBLISHED"} onClick={() => set({ status: f.status === "PUBLISHED" ? "" : "PUBLISHED" })} />
        <StatTile label="You can bid" value={res ? counts.eligible ?? 0 : undefined} icon={<CheckCircleIcon size={18} />} tone="good" active={f.chip === "ELIGIBLE"} onClick={() => set({ chip: f.chip === "ELIGIBLE" ? "" : "ELIGIBLE" })} />
        <StatTile label="Closing in 7 days" value={res ? counts.closingSoon ?? 0 : undefined} icon={<ClockIcon size={18} />} tone="warning" active={f.closingWithinDays === "7"} onClick={() => set({ closingWithinDays: f.closingWithinDays === "7" ? "" : "7" })} />
        <StatTile label="Match your scope" value={res ? counts.scopeMatch ?? 0 : undefined} icon={<GlobeIcon size={18} />} tone="brand" note={res && !counts.scopeMatch ? "Set your scope in Admin" : undefined} active={f.scopeMatch} onClick={() => set({ scopeMatch: !f.scopeMatch })} />
      </StatTileGrid>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>Break down by</span>
        {(["issuers", "countries", "categories"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setBy(by === k ? "" : k)} style={CROSS_LINK}><Pill tone={by === k ? "brand" : "neutral"}>{k === "issuers" ? "Issuer" : k === "countries" ? "Delivery country" : "Category"}</Pill></button>
        ))}
      </div>
      {by && (
        <Card>
          {facet.length === 0 ? <span style={{ color: "var(--u-ink-secondary)", fontSize: 14 }}>Nothing to break down.</span> : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {facet.slice(0, 40).map((x) => <button key={x.key} type="button" onClick={() => pick(x.key)} style={CROSS_LINK}><Pill tone={picked === x.key ? "brand" : "neutral"}>{by === "countries" ? countryName(x.key) : x.key} · {x.count}</Pill></button>)}
            </div>
          )}
        </Card>
      )}
      {forYou.length > 0 && activeCount === 0 && (
        <Card title="Tenders for you">
          {forYou.map((t) => <Row key={t.id} t={t} />)}
        </Card>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" onClick={() => set({ chip: "" })} style={CROSS_LINK}><Pill tone={f.chip === "" ? "brand" : "neutral"}>All {Object.values(counts).length ? (counts.eligible ?? 0) + (counts.almostEligible ?? 0) + (counts.notEligible ?? 0) : ""}</Pill></button>
        {CHIPS.map((c) => <button key={c} type="button" onClick={() => set({ chip: f.chip === c ? "" : c })} style={CROSS_LINK}><Pill tone={f.chip === c ? "brand" : "neutral"}>{CHIP_LABEL[c] ?? c}</Pill></button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, alignItems: "end" }}>
        <SearchInput value={f.keyword} onChange={(v) => set({ keyword: v })} placeholder="Search title, summary or reference" />
        <Select value={f.type} onChange={(v) => set({ type: v })} allLabel="Any type" options={Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))} ariaLabel="Tender type" />
        <CountrySelect value={f.country} onChange={(v) => set({ country: v })} options={countries} />
        <Select value={f.category} onChange={(v) => set({ category: v })} allLabel="Any category" options={SCOPE_TAXONOMY.map((g) => ({ value: g.group, label: g.group }))} ariaLabel="Product category" />
        <Select value={f.sort} onChange={(v) => set({ sort: v })} options={[{ value: "closing", label: "Closing soonest" }, { value: "published", label: "Newest" }, { value: "eligibility", label: "Most eligible first" }, { value: "issuer", label: "Issuer A to Z" }]} ariaLabel="Sort" />
        <Button variant="secondary" onClick={() => setMore(!more)}>{more ? "Fewer filters" : "More filters"}</Button>
      </div>
      {more && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, alignItems: "end" }}>
          <Select value={f.status} onChange={(v) => set({ status: v })} allLabel="Any status" options={[{ value: "PUBLISHED", label: "Open for bids" }, { value: "CLOSED", label: "Closed" }, { value: "EVALUATING", label: "Being evaluated" }, { value: "AWARDED", label: "Awarded" }]} ariaLabel="Status" />
          <Select value={f.closingWithinDays} onChange={(v) => set({ closingWithinDays: v })} allLabel="Any closing date" options={[{ value: "3", label: "Closing in 3 days" }, { value: "7", label: "Closing in 7 days" }, { value: "14", label: "Closing in 14 days" }, { value: "30", label: "Closing in 30 days" }]} ariaLabel="Closing within" />
          <Select value={f.publishedWithinDays} onChange={(v) => set({ publishedWithinDays: v })} allLabel="Published any time" options={[{ value: "7", label: "Published in last 7 days" }, { value: "30", label: "Published in last 30 days" }, { value: "90", label: "Published in last 90 days" }]} ariaLabel="Published within" />
          <Select value={f.issuer} onChange={(v) => set({ issuer: v })} allLabel="Any issuer" options={(res?.facets?.issuers ?? []).map((x) => ({ value: x.key, label: `${x.key} (${x.count})` }))} ariaLabel="Issuer" />
          <Select value={f.currency} onChange={(v) => set({ currency: v })} allLabel="Any currency" options={(res?.facets?.currencies ?? []).map((x) => ({ value: x.key, label: `${x.key} (${x.count})` }))} ariaLabel="Currency" />
          <label style={{ fontSize: 13.5, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={f.shortlisted} onChange={(e) => set({ shortlisted: e.target.checked })} /> Shortlisted only</label>
          <label style={{ fontSize: 13.5, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={f.scopeMatch} onChange={(e) => set({ scopeMatch: e.target.checked })} /> Matches my scope</label>
        </div>
      )}
      {activeCount > 0 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13.5 }}>
          <span style={{ color: "var(--u-ink-secondary)" }}>{activeCount} filter{activeCount === 1 ? "" : "s"} applied · {rows?.length ?? 0} tender{rows?.length === 1 ? "" : "s"}</span>
          <button type="button" onClick={() => setF({ ...EMPTY, sort: f.sort })} style={{ ...CROSS_LINK, color: "var(--u-link)", fontFamily: "inherit", fontSize: 13.5 }}>Clear all</button>
        </div>
      )}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {!rows && !err && <div style={{ padding: 20, color: "var(--u-ink-secondary)" }}>Loading…</div>}
        {rows?.length === 0 && <div style={{ padding: 20, color: "var(--u-ink-secondary)" }}>No tenders match.</div>}
        {rows?.map((t) => <Row key={t.id} t={t} bordered />)}
      </Card>
      <SavedSearchesPanel
        title="Saved searches" noun="tender" canSave={activeCount > 0}
        rows={searches.map((x) => ({ id: x.id, name: x.name, alertsEnabled: x.alertsEnabled, summary: describe(x.criteria) }))}
        onSave={async (name, alertsEnabled) => {
          try { await apiClient.saveTenderSearch({ ...toCriteria(), name, alertsEnabled }); setSearches(await apiClient.listTenderSavedSearches()); }
          catch (e) { setErr(e instanceof Error ? e.message : "Could not save the search."); }
        }}
        onApply={(id) => { const x = searches.find((y) => y.id === id); if (x) apply(x); }}
        onToggleAlerts={async (id, enabled) => { await apiClient.updateTenderSavedSearch(id, { alertsEnabled: enabled }); setSearches((x) => x.map((y) => (y.id === id ? { ...y, alertsEnabled: enabled } : y))); }}
        onDelete={async (id) => { await apiClient.deleteTenderSavedSearch(id); setSearches((x) => x.filter((y) => y.id !== id)); }}
      />
    </Page>
  );
}

function Row({ t, bordered }: { t: TenderAvailableItem; bordered?: boolean }) {
  const n = daysUntil(t.closingAt);
  return (
    <Link href={`/discover/view?id=${t.id}`} style={{ display: "block", textDecoration: "none", color: "var(--u-ink)", padding: bordered ? "14px 20px" : "10px 0", borderTop: bordered ? "1px solid var(--u-border)" : "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}><strong>{t.referenceNumber}</strong> {t.title}<div style={{ fontSize: 13, color: "var(--u-ink-secondary)", marginTop: 3 }}>{t.issuerName} · {TYPE_LABEL[t.tenderType]}{t.currency ? ` · ${t.currency}` : ""}</div></div>
        <div style={{ fontSize: 13, color: "var(--u-ink-secondary)", textAlign: "right" }}>{t.closingAt ? <>Closes {fmtDateTime(t.closingAt, t.timeZone)}{n !== null && n >= 0 ? ` (${n}d)` : ""}</> : "No closing date"}</div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>{t.scopeMatches && t.scopeMatches.length > 0 && <Pill tone="brand">Matches your scope</Pill>}{t.chips.map((c) => <Pill key={c} tone={CHIP_TONE[c] ?? "neutral"}>{CHIP_LABEL[c] ?? c}</Pill>)}</div>
    </Link>
  );
}
