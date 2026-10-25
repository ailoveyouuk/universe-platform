"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, Heading, Page, inputStyle } from "../../lib/ui";
import { readParam, useInsightsItems } from "../../lib/views";
import { searchEntries, staticEntries, type SearchEntry } from "../../lib/searchIndex";
import { useCountries } from "../../lib/useCountries";
import { AREAS } from "../../lib/searchIndex";

const ORDER: SearchEntry["type"][] = ["Area", "Saved view", "Product group", "Service", "Region", "Country"];

export default function SearchPage() {
  const [q, setQ] = useState("");
  const countries = useCountries();
  const { items } = useInsightsItems();
  useEffect(() => { setQ(readParam("q")); }, []);
  const all = useMemo<SearchEntry[]>(() => [
    ...staticEntries(),
    ...(items ?? []).filter((i) => i.kind === "VIEW").map((v) => ({ type: "Saved view" as const, title: v.name, detail: `Your saved view of ${AREAS.find((a) => a.href === v.target)?.title ?? "Insights"}.`, href: `${v.target}?view=${v.id}`, keywords: "saved view mine" })),
    ...countries.map((c) => ({ type: "Country" as const, title: c.name, detail: "Where it makes and receives, its partners, distance and efficiency.", href: `/geographies?country=${c.code}`, keywords: c.code.toLowerCase() })),
  ], [items, countries]);
  const results = useMemo(() => searchEntries(all, q), [all, q]);
  const grouped = ORDER.map((t) => ({ t, list: results.filter((r) => r.type === t) })).filter((g) => g.list.length);
  return (
    <Page>
      <Heading title="Search Insights" sub="Find a lens, a product group, a type of service, a region, a country or one of your saved views." />
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 }}>
          What are you looking for?
          <input type="search" aria-label="Search Insights" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="For example: technical assistance, sea freight, Kenya, vaccines" style={{ ...inputStyle, fontSize: 15, padding: "12px 14px" }} />
        </label>
      </form>
      <div aria-live="polite" style={{ fontSize: 12.5, color: "var(--u-ink-secondary)" }}>{q.trim() ? `${results.length} result${results.length === 1 ? "" : "s"}` : "Start typing to search."}</div>
      {q.trim() && results.length === 0 && <Card><p style={{ margin: 0, fontSize: 14 }}>Nothing matches “{q}”. Try a shorter word, or a product group, a service such as “advisory”, or a country name.</p></Card>}
      {grouped.map((g) => (
        <section key={g.t} aria-label={g.t} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 style={{ margin: 0, fontFamily: "var(--u-font-display)", fontSize: 15 }}>{g.t === "Area" ? "Areas of Insights" : g.t === "Country" ? "Countries" : `${g.t}s`}</h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))" }}>
            {g.list.slice(0, g.t === "Country" ? 12 : 30).map((r) => (
              <li key={`${r.type}${r.href}${r.title}`} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "10px 12px", background: "var(--u-surface-raised)" }}>
                <Link href={r.href} style={{ fontWeight: 600 }}>{r.title}</Link>
                <div style={{ fontSize: 12.5, color: "var(--u-ink-secondary)", marginTop: 2 }}>{r.detail}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Page>
  );
}
