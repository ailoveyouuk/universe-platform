"use client";

import { useEffect, useState } from "react";
import type { InsightsOverview } from "@universe/types";
import { apiClient } from "../../lib/apiClient";
import { SOURCES } from "../../lib/sources";
import { Card, Heading, Page, fmtDate } from "../../lib/ui";

export default function MethodologyPage() {
  const [o, setO] = useState<InsightsOverview | null>(null);
  useEffect(() => { apiClient.insightsOverview().then(setO).catch(() => setO(null)); }, []);
  const p = { margin: "0 0 10px", fontSize: 14, lineHeight: 1.55 } as const;
  return (
    <Page>
      <Heading title="Methodology" sub="How Insights keeps everyone's data private while still being useful." />
      <Card title="Where the data comes from">
        <p style={p}>Organisations on Universe record real prices, approved sources and shipments as part of their normal work. When an organisation has agreed to share data with Universe, a de-identified copy of each record is added to a separate Insights database each night. That database has no organisation, person, supplier or manufacturer names, and no free text that could contain them.</p>
      </Card>
      <Card title="Why some figures are hidden">
        <p style={p}>A figure is shown only when at least {o?.minimumContributors ?? 5} different organisations are behind it. A contributor is recognised by a one-way code that cannot be turned back into an organisation, so we can count how many organisations contribute without knowing who they are. If a group, month or split has fewer, it is left out rather than risk someone working out who it is. This is why you may see &quot;not enough contributors yet&quot;.</p>
      </Card>
      <Card title="How precise it is">
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.6 }}>
          <li>Prices are grouped by month, not by day, and by world region, not by country.</li>
          <li>Prices are never converted between currencies. Choose a currency to compare like with like.</li>
          <li>Every price is a cost price: what the supplier or manufacturer charged before any margin was added. Selling prices, margins and anything invoiced to clients are never included. The same holds for freight (what the forwarder charged) and services (what the service supplier charged): cost before any margin. Price movements are shown as like-for-like indexes, never as a single organisation's price.</li>
          <li>Sourcing is shown at country of manufacture level, because that is the question people ask.</li>
        </ul>
      </Card>
      <section id="sources" style={{ scrollMarginTop: 12 }}>
        <Card title="Where each figure comes from">
          <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {Object.values(SOURCES).map((d) => <div key={d.title}><dt style={{ fontWeight: 700, fontSize: 14 }}>{d.title}</dt><dd style={{ margin: "2px 0 0", fontSize: 14, lineHeight: 1.55 }}>{d.full}</dd></div>)}
          </dl>
        </Card>
      </section>
      <Card title="Demonstration data">
        <p style={p}>In the Universe Demo account every figure is simulated. Real organisations never see simulated data, and simulated data never reaches real accounts.</p>
      </Card>
      <Card title="How fresh it is">
        <p style={p}>{o ? `Prices last refreshed ${fmtDate(o.freshness.prices)}, sourcing ${fmtDate(o.freshness.sourcing)}, logistics ${fmtDate(o.freshness.logistics)}.` : "Loading…"}</p>
      </Card>
    </Page>
  );
}
