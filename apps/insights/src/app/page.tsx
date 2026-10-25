"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { InsightsOverview } from "@universe/types";
import { GaugeIcon, GlobeIcon, InfoIcon, StatTile, StatTileGrid, TrendingUpIcon } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { Card, ErrorNote, Heading, Page, fmtDate } from "../lib/ui";

export default function InsightsHome() {
  const [o, setO] = useState<InsightsOverview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { apiClient.insightsOverview().then(setO).catch((e) => setErr(e instanceof Error ? e.message : "Could not load Insights.")); }, []);
  return (
    <Page>
      <Heading title="Insights" sub="What the market is doing, built from the activity of organisations on Universe. Everything is anonymised: no organisation, person or supplier is ever shown." />
      <ErrorNote message={err} />
      <section aria-labelledby="glance" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 id="glance" style={{ margin: 0, fontFamily: "var(--u-font-display)", fontSize: 16 }}>At a glance</h2>
        <StatTileGrid>
          <Link href="/prices" style={{ textDecoration: "none" }}><StatTile label="Product groups with price data" value={o ? o.pricedCategories : "…"} icon={<TrendingUpIcon size={18} />} tone="brand" /></Link>
          <Link href="/sourcing" style={{ textDecoration: "none" }}><StatTile label="Product groups with sourcing data" value={o ? o.sourcedCategories : "…"} icon={<GlobeIcon size={18} />} tone="brand" /></Link>
          <Link href="/logistics" style={{ textDecoration: "none" }}><StatTile label="Routes with logistics data" value={o ? o.logisticsRoutes : "…"} icon={<GaugeIcon size={18} />} tone="brand" /></Link>
          <Link href="/methodology" style={{ textDecoration: "none" }}><StatTile label="Organisations needed behind any figure" value={o ? o.minimumContributors : "…"} icon={<InfoIcon size={18} />} tone="neutral" /></Link>
        </StatTileGrid>
      </section>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 14 }}>
        <Card title="Prices"><p style={{ margin: "0 0 10px", fontSize: 14 }}>See what each product group costs, how it has moved month by month, and how it differs by where it is made, where it is delivered and the delivery terms.</p><Link href="/prices">Explore prices</Link></Card>
        <Card title="Sourcing"><p style={{ margin: "0 0 10px", fontSize: 14 }}>See which countries manufacture each product group, on a map and as a table.</p><Link href="/sourcing">Explore sourcing</Link></Card>
        <Card title="Logistics and CO2"><p style={{ margin: "0 0 10px", fontSize: 14 }}>See the busiest and the most CO2-efficient routes from where goods are made to where they are delivered, by transport mode.</p><Link href="/logistics">Explore logistics</Link></Card>
        <Card title="How we protect privacy"><p style={{ margin: "0 0 10px", fontSize: 14 }}>Read how the data is anonymised, why some figures are hidden, and how fresh it is.</p><Link href="/methodology">Read the methodology</Link></Card>
      </div>
      {o && <p style={{ margin: 0, fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Data last refreshed: prices {fmtDate(o.freshness.prices)}, sourcing {fmtDate(o.freshness.sourcing)}, logistics {fmtDate(o.freshness.logistics)}.</p>}
    </Page>
  );
}
