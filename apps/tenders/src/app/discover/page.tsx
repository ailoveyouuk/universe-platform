"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { TenderAvailableItem, TenderSavedSearchRecord } from "@universe/types";
import { Button, CountrySelect, Pill, SearchInput, Select } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { useCountries } from "../../lib/useCountries";
import { CHIP_LABEL, CHIP_TONE, Card, ErrorNote, Heading, Page, TYPE_LABEL, daysUntil, fmtDateTime } from "../../lib/ui";

const CHIPS = ["ELIGIBLE", "ALMOST_ELIGIBLE", "NOT_ELIGIBLE", "INVITED", "PARTICIPATING", "SHORTLISTED", "CLOSING_SOON", "CLOSED"];

/** Find tenders (2026-10-19): every published tender is visible, each explained by chips so an organisation sees why it can or cannot bid. */
export default function DiscoverPage() {
  const countries = useCountries();
  const [chip, setChip] = useState(""); const [type, setType] = useState(""); const [country, setCountry] = useState(""); const [keyword, setKeyword] = useState(""); const [sort, setSort] = useState("closing"); const [shortlisted, setShortlisted] = useState(false);
  const [rows, setRows] = useState<TenderAvailableItem[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [forYou, setForYou] = useState<TenderAvailableItem[]>([]);
  const [searches, setSearches] = useState<TenderSavedSearchRecord[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("");

  const load = useCallback(() => {
    apiClient.listAvailableTenders({ chip, type, country, keyword, sort, shortlisted }).then((r) => { setRows(r.tenders); setCounts(r.counts); }).catch((e) => setErr(e instanceof Error ? e.message : "Could not load tenders."));
  }, [chip, type, country, keyword, sort, shortlisted]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { apiClient.tendersForYou().then((r) => setForYou(r.tenders.slice(0, 5))).catch(() => undefined); apiClient.listTenderSavedSearches().then(setSearches).catch(() => undefined); }, []);

  const saveSearch = async () => {
    try {
      await apiClient.saveTenderSearch({ name: name.trim(), keyword: keyword || undefined, countries: country ? [country] : undefined, types: type ? [type] : undefined, onlyEligible: chip === "ELIGIBLE" || undefined, alertsEnabled: true });
      setName(""); setSearches(await apiClient.listTenderSavedSearches());
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not save the search."); }
  };
  const apply = (s: TenderSavedSearchRecord) => { setKeyword(s.criteria.keyword ?? ""); setCountry(s.criteria.countries?.[0] ?? ""); setType(s.criteria.types?.[0] ?? ""); setChip(s.criteria.onlyEligible ? "ELIGIBLE" : ""); };

  return (
    <Page>
      <Heading title="Find tenders" sub="Every open tender is listed. The labels explain whether your organisation can bid and what to fix if not." />
      <ErrorNote message={err} />
      {forYou.length > 0 && !chip && !keyword && !type && !country && (
        <Card title="Tenders for you">
          {forYou.map((t) => <Row key={t.id} t={t} />)}
        </Card>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" onClick={() => setChip("")} style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}><Pill tone={chip === "" ? "brand" : "neutral"}>All {Object.values(counts).length ? counts["ALL"] ?? "" : ""}</Pill></button>
        {CHIPS.map((c) => <button key={c} type="button" onClick={() => setChip(chip === c ? "" : c)} style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}><Pill tone={chip === c ? "brand" : "neutral"}>{CHIP_LABEL[c]} {counts[c] ?? 0}</Pill></button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, alignItems: "end" }}>
        <SearchInput value={keyword} onChange={setKeyword} placeholder="Search title or summary" />
        <Select value={type} onChange={setType} allLabel="Any type" options={Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))} ariaLabel="Tender type" />
        <CountrySelect value={country} onChange={setCountry} options={countries} />
        <Select value={sort} onChange={setSort} options={[{ value: "closing", label: "Closing soonest" }, { value: "published", label: "Newest" }]} ariaLabel="Sort" />
        <label style={{ fontSize: 13.5, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={shortlisted} onChange={(e) => setShortlisted(e.target.checked)} /> Shortlisted only</label>
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {!rows && !err && <div style={{ padding: 20, color: "var(--u-ink-secondary)" }}>Loading…</div>}
        {rows?.length === 0 && <div style={{ padding: 20, color: "var(--u-ink-secondary)" }}>No tenders match.</div>}
        {rows?.map((t) => <Row key={t.id} t={t} bordered />)}
      </Card>
      <Card title="Saved searches">
        {searches.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>{searches.map((s) => (
          <span key={s.id} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <Button variant="secondary" onClick={() => apply(s)}>{s.name}</Button>
            <button type="button" aria-label={`Delete ${s.name}`} onClick={async () => { await apiClient.deleteTenderSavedSearch(s.id); setSearches((x) => x.filter((y) => y.id !== s.id)); }} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--u-ink-secondary)" }}>✕</button>
          </span>))}</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input aria-label="Name this search" placeholder="Name the current filters to save them and get alerts" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, minWidth: 220, padding: "8px 10px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", font: "inherit", fontSize: 13.5 }} />
          <Button variant="primary" disabled={!name.trim()} onClick={saveSearch}>Save search</Button>
        </div>
      </Card>
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
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>{t.chips.map((c) => <Pill key={c} tone={CHIP_TONE[c] ?? "neutral"}>{CHIP_LABEL[c] ?? c}</Pill>)}</div>
    </Link>
  );
}
