"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { InsightsActivity, InsightsOverview } from "@universe/types";
import { OverviewGroup, OverviewGroups, OverviewHero, CollapsibleSection, DataHealthNote } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { useCurrentUser } from "../lib/AuthContext";
import { removeInsightsItem, useInsightsItems } from "../lib/views";
import { SourceNote } from "../components/SourceNote";
import { ActivityTile } from "../components/ActivityTile";
import { ErrorNote, Page, fmtDate, pill } from "../lib/ui";

const h2: React.CSSProperties = { margin: 0, fontFamily: "var(--u-font-display)", fontSize: 18 };
const sub: React.CSSProperties = { margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" };

// Each group of areas has its own platform colour (solid, with the on-accent text colour on top).
const AREAS: { title: string; color: string; areas: { href: string; label: string; text: string }[] }[] = [
  { title: "Where goods come from", color: "var(--u-module-product-database)", areas: [
    { href: "/geographies", label: "Geographies", text: "Made, delivered and busiest flows on a map." },
    { href: "/sourcing", label: "Sourcing", text: "Which countries make each product group." },
  ] },
  { title: "How goods move", color: "var(--u-module-crm)", areas: [
    { href: "/modes", label: "Shipping modes", text: "Air, sea and land: volume, time and CO2." },
    { href: "/distances", label: "Distances", text: "How far goods travel and what freight costs." },
    { href: "/logistics", label: "Logistics and CO2", text: "The busiest and cleanest routes." },
  ] },
  { title: "What things cost", color: "var(--u-module-tender-issuance)", areas: [
    { href: "/commodities", label: "Commodities", text: "Like-for-like cost movement by product group." },
    { href: "/services", label: "Services", text: "Consultancy, advisory, technical assistance and more." },
    { href: "/prices", label: "Prices", text: "Cost over time by origin, destination and terms." },
  ] },
];
const TILE_COLORS = ["var(--u-brand-violet)", "var(--u-accent-magenta)", "var(--u-module-tender-issuance)", "var(--u-module-product-database)"];

export default function InsightsHome() {
  const router = useRouter();
  const me = useCurrentUser();
  const { items } = useInsightsItems();
  const [o, setO] = useState<InsightsOverview | null>(null);
  const [act, setAct] = useState<InsightsActivity | null>(null);
  const [actFailed, setActFailed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { apiClient.insightsOverview().then(setO).catch((e) => setErr(e instanceof Error ? e.message : "Could not load Insights.")); }, []);
  useEffect(() => { apiClient.insightsActivity().then(setAct).catch(() => setActFailed(true)); }, []);

  const views = (items ?? []).filter((i) => i.kind === "VIEW");
  const today = new Date().toISOString().slice(0, 10);
  const go = (term: string) => router.push(`/search?q=${encodeURIComponent(term.trim())}`);

  return (
    <Page>
      <ErrorNote message={err} />

      <OverviewHero color="var(--u-brand-violet)" forename={me?.forename} title="What the sector is doing, right now." intro="Costs, sourcing and shipping across every organisation on Universe, always anonymous."
        search={{ label: "Search Insights", placeholder: "Search: technical assistance, sea freight, Kenya, vaccines", quick: ["Sea freight", "Technical assistance", "Vaccines", "Kenya"], onSearch: go }} />
      <DataHealthNote currentApp="insights" load={() => apiClient.dataHealth("insights")} />

      <section aria-labelledby="active" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h2 id="active" style={h2}>Most active across Universe{act?.day ? (act.day === today ? " today" : "") : ""}</h2>
          {act?.day && act.day !== today && <span style={sub}>Latest day with figures: {fmtDate(act.day)}</span>}
        </div>
        {act === null && !actFailed && <p style={sub}>Loading…</p>}
        {actFailed && <p style={sub} role="status">Activity figures are not available just now.</p>}
        {act && act.metrics.length === 0 && <p style={sub}>Activity appears here once at least five organisations have contributed to a figure.</p>}
        {act && act.metrics.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: 14 }}>
            {act.metrics.map((m, i) => <ActivityTile key={m.id} m={m} color={TILE_COLORS[i % TILE_COLORS.length]!} isLatestToday={m.day === today} />)}
          </div>
        )}
        <SourceNote keys={["activity"]} />
      </section>

      <CollapsibleSection title="Explore" level={2} bare>
        <OverviewGroups>
          {AREAS.map((g) => <OverviewGroup key={g.title} title={g.title} color={g.color} links={g.areas} LinkComponent={Link} />)}
        </OverviewGroups>
      </CollapsibleSection>

      <CollapsibleSection title="Your saved views" level={2} bare>
        {items === null ? <p style={sub}>Loading…</p> : views.length === 0 ? <p style={sub}>Nothing saved yet. On any page, set the filters you like and choose Save this view.</p> : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {views.map((v) => (
              <li key={v.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, border: "1px solid var(--u-border)", borderRadius: 999, padding: "2px 4px 2px 14px", backgroundColor: "var(--u-surface-raised)" }}>
                <Link href={`${v.target}?view=${v.id}`} style={{ fontWeight: 600, fontSize: 13.5 }}>{v.name}</Link>
                <button type="button" className="u-touch" style={{ ...pill(false), border: 0, padding: "3px 10px", fontSize: 12 }} aria-label={`Remove saved view ${v.name}`} onClick={() => void removeInsightsItem(v.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <details style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", backgroundColor: "var(--u-surface-raised)", padding: "12px 18px" }}>
        <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 14.5 }}>About Insights</summary>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10, maxWidth: 820, fontSize: 14, lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>Every organisation on Universe buys, ships and manages health supplies and services. Insights pools what they all do, strips out who did it, and shows the pattern: what goods and services really cost, where they are made, how far and how fast they travel, and what that does to the planet.</p>
          <p style={{ margin: 0 }}>A figure only appears when at least five organisations are behind it, and prices are always the cost before any margin. Tables can be searched, sorted and filtered, and every point on a chart can be hovered, tapped or reached with the keyboard. <Link href="/methodology">How we protect privacy</Link></p>
        </div>
      </details>

      {o && <p style={{ margin: 0, fontSize: 12.5, color: "var(--u-ink-secondary)" }}>{o.pricedCategories} product groups with prices · {o.sourcedCategories} with sourcing · {o.logisticsRoutes} routes · at least {o.minimumContributors} organisations behind every figure. Refreshed: prices {fmtDate(o.freshness.prices)}, sourcing {fmtDate(o.freshness.sourcing)}, logistics {fmtDate(o.freshness.logistics)}.</p>}
    </Page>
  );
}
