"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { InsightsOverview } from "@universe/types";
import { apiClient } from "../../lib/apiClient";
import { SOURCES } from "../../lib/sources";
import { Card, Heading, Page, fmtDate } from "../../lib/ui";

const p = { margin: "0 0 10px", fontSize: 14, lineHeight: 1.6 } as const;
const ul = { margin: "0 0 4px", paddingLeft: 20, fontSize: 14, lineHeight: 1.65 } as const;
const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 12.5, fontWeight: 600, borderBottom: "1px solid var(--u-border)", verticalAlign: "bottom" };
const td: React.CSSProperties = { padding: "9px 10px", fontSize: 13.5, verticalAlign: "top", lineHeight: 1.5 };

const SECTIONS: { id: string; title: string }[] = [
  { id: "purpose", title: "Purpose" },
  { id: "datasets", title: "Data sets and refresh" },
  { id: "sources", title: "Where each figure comes from" },
  { id: "privacy", title: "Privacy" },
  { id: "reading", title: "Reading the figures" },
  { id: "limits", title: "Limits" },
  { id: "standards", title: "Standards and references" },
  { id: "governance", title: "Your data and questions" },
  { id: "glossary", title: "Glossary" },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <div id={id} style={{ scrollMarginTop: 12 }}><Card title={title}>{children}</Card></div>;
}

export default function MethodologyPage() {
  const [o, setO] = useState<InsightsOverview | null>(null);
  useEffect(() => { apiClient.insightsOverview().then(setO).catch(() => setO(null)); }, []);
  const min = o?.minimumContributors ?? 5;
  const rows: { name: string; shows: string; from: string; by: string; refresh: string }[] = [
    { name: "Product cost prices and movement", shows: "What goods cost at source, and how that cost is moving like for like.", from: "Supplier and manufacturer cost prices on projects of sharing organisations.", by: "Product group, month, region, delivery terms", refresh: o ? `Last refreshed ${fmtDate(o.freshness.prices)}` : "Shown on this page" },
    { name: "Sourcing", shows: "Which countries make each product group.", from: "Manufacturer approvals recorded by sharing organisations.", by: "Product group, country of manufacture", refresh: o ? `Last refreshed ${fmtDate(o.freshness.sourcing)}` : "Shown on this page" },
    { name: "Shipments, time and CO2", shows: "How goods travel, how long it takes and the CO2e it causes.", from: "Shipments on projects of sharing organisations; distance and CO2e calculated by Universe.", by: "Product group, route (country to country), transport mode, delivery terms", refresh: o ? `Last refreshed ${fmtDate(o.freshness.logistics)}` : "Shown on this page" },
    { name: "Freight cost", shows: "What freight costs per tonne and per tonne-kilometre, and how that moves.", from: "Freight cost recorded on projects of sharing organisations.", by: "Region to region lane, transport mode, month", refresh: "With each aggregation run" },
    { name: "Service costs", shows: "What services cost, in each service's own unit.", from: "Service fees recorded on projects of sharing organisations.", by: "Type of service, pricing unit, delivery region, month", refresh: "With each aggregation run" },
    { name: "Exchange rates", shows: "The daily rate between any two currencies, used to convert costs.", from: "European Central Bank daily reference rates, via Frankfurter, stored by Universe.", by: "Currency pair, day", refresh: "Each business day (history is filled in when first needed)" },
    { name: "Daily activity", shows: "The most active things across Universe today.", from: "Counts of actions recorded in Universe's apps.", by: "Kind of action, day", refresh: "Every day, early morning (UTC)" },
  ];
  return (
    <Page>
      <Heading title="Methodology" sub="What Insights is for, where its figures come from, how it protects privacy, and how to read it." />

      <nav aria-label="On this page" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`} className="u-touch" style={{ padding: "5px 12px", border: "1px solid var(--u-border)", borderRadius: 999, fontSize: 13, textDecoration: "none", backgroundColor: "var(--u-surface-raised)" }}>{s.title}</a>)}
      </nav>

      <Section id="purpose" title="Purpose">
        <p style={p}>Insights exists to give everyone working in global health and humanitarian aid a clear, shared view of how the sector&apos;s supply chain is behaving, so that decisions are made on evidence and not on rumour or on a single quote. It turns the day-to-day activity of organisations on Universe into anonymous, sector-level trends.</p>
        <ul style={ul}>
          <li><strong>Procurement teams and agents</strong> can check a quote against the market, see whether a product group or service is getting dearer, and choose between air, sea and land.</li>
          <li><strong>Donors and funders</strong> can see what supplies, services and freight really cost, and where the money goes further.</li>
          <li><strong>Manufacturers, suppliers and forwarders</strong> can see where demand and sourcing are concentrated and how their markets move.</li>
          <li><strong>Programme, logistics and policy teams</strong> can see how far goods travel, how long it takes and the CO2 it costs, and plan with that in mind.</li>
        </ul>
        <p style={{ ...p, marginTop: 10 }}>Insights is for understanding trends. It is not a price list, a quote, a recommendation to buy from anyone, or a ranking of organisations. No figure identifies an organisation, person, supplier or manufacturer.</p>
      </Section>

      <Section id="datasets" title="Data sets and refresh">
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 760 }}>
            <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>The data sets in Insights, what each shows, where it comes from, how it is grouped and how often it is refreshed</caption>
            <thead><tr>{["Data set", "What it shows", "Where it comes from", "Grouped by", "Refreshed"].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r) => <tr key={r.name} style={{ borderBottom: "1px solid var(--u-border)" }}><th scope="row" style={{ ...td, textAlign: "left", fontWeight: 600 }}>{r.name}</th><td style={td}>{r.shows}</td><td style={td}>{r.from}</td><td style={td}>{r.by}</td><td style={td}>{r.refresh}</td></tr>)}</tbody>
          </table>
        </div>
        <p style={{ ...p, marginTop: 12 }}>Records are added to Insights in a de-identified form by an aggregation run and are only ever added, never edited. The daily activity count runs every day. The other data sets are refreshed whenever the aggregation is run, and the dates above show when each last received new records; moving the aggregation onto a nightly schedule is planned. Older records stay in the history, so movement over time can be shown.</p>
      </Section>

      <Section id="sources" title="Where each figure comes from">
        <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {Object.values(SOURCES).map((d) => <div key={d.title}><dt style={{ fontWeight: 700, fontSize: 14 }}>{d.title}</dt><dd style={{ margin: "2px 0 0", fontSize: 14, lineHeight: 1.55 }}>{d.full}</dd></div>)}
        </dl>
      </Section>

      <Section id="privacy" title="Privacy">
        <ul style={ul}>
          <li><strong>Sharing is agreed first.</strong> Only organisations that have agreed to share data with Universe contribute. Real organisations never see simulated data, and simulated data never reaches real accounts.</li>
          <li><strong>Records are de-identified at the source.</strong> A copy of each record goes into a separate Insights database with no organisation, person, supplier or manufacturer names and no free text that could contain them. The Insights application can only read that database.</li>
          <li><strong>Contributors are counted, never named.</strong> Each organisation is represented by a one-way code that cannot be turned back into the organisation, so we can count how many different organisations are behind a figure without knowing who they are.</li>
          <li><strong>Small groups are hidden.</strong> A figure appears only when at least {min} different organisations are behind it. A group, month or split with fewer is left out, which is why you may see &quot;not enough contributors yet&quot;.</li>
          <li><strong>Detail is deliberately coarse.</strong> Prices are grouped by month, not day, and by world region, not country. Sourcing is shown by country of manufacture because that is the question people ask.</li>
          <li><strong>Only cost, never margin.</strong> Prices are what the supplier, manufacturer, forwarder or service provider charged before any margin. Selling prices, margins and anything invoiced to clients are never included, and an automatic test fails the build if they are ever read into Insights.</li>
          <li><strong>Activity is counted, not described.</strong> Daily activity records how many times something happened, never what it contained.</li>
          <li><strong>Your own saved views are yours.</strong> Saved views are kept per person and are not visible to anyone else, including other people in your organisation.</li>
        </ul>
      </Section>

      <Section id="reading" title="Reading the figures">
        <ul style={ul}>
          <li><strong>Cost movement is an index.</strong> It compares the same product, specification and origin month to month and starts at 100. 110 means 10 percent dearer than the start. It is built this way so that buying something different is not mistaken for a price change.</li>
          <li><strong>Averages are weighted.</strong> Where a figure combines several routes or lanes, each is weighted by the number of shipments behind it, not counted equally.</li>
          <li><strong>The number of organisations is shown</strong> so you can judge how much weight a figure can bear. More organisations means a steadier figure.</li>
          <li><strong>Wide ranges are on a log scale.</strong> Air freight costs many times more than sea, so some charts use a logarithmic axis. Each gridline is ten times the one before. Exact values are always in the table beside the chart.</li>
          <li><strong>Costs keep their own currency.</strong> Costs are shown in the currency they were agreed in, with the currency code, and are never added together across currencies. If you choose to see them in another currency, each figure is converted with the ECB daily reference rate (the same rates Project Management locks prices to): either the rate when it was logged, which is the monthly average because Insights keeps months and never exact days, or the rate on a date you choose, today by default. Figures that average across months use the date you choose. The rates used, and a chart of the daily rate, are shown beside the figures, original amounts are kept, and weekends and holidays use the last published rate. Only the roughly thirty currencies the ECB publishes can be converted.</li>
          <li><strong>Estimates are flagged.</strong> Where a weight or distance is estimated rather than recorded, the calculation says so.</li>
          <li><strong>Every point can be read exactly.</strong> Hover, tap or focus a point on any chart for its value, and every chart has the same figures as a table you can search, sort and filter.</li>
        </ul>
      </Section>

      <Section id="limits" title="Limits">
        <ul style={ul}>
          <li><strong>It reflects organisations on Universe that share data,</strong> not the whole sector. As more organisations join, the picture becomes fuller and steadier.</li>
          <li><strong>Figures are as recorded.</strong> They depend on what organisations enter on their projects. Insights does not audit individual records.</li>
          <li><strong>Distance and CO2 are estimates.</strong> Distance is a straight line between country centre points scaled for typical routes, not a real route. Emission factors are representative averages for each mode, not a particular vessel, aircraft or vehicle. They are good for comparing modes and trends, not for formal carbon reporting.</li>
          <li><strong>The efficiency score is Universe&apos;s own measure.</strong> It is useful for comparison within Universe but is not an external standard.</li>
          <li><strong>Prices are not quotes.</strong> They are cost levels and movements across many purchases, and any one purchase will differ with quantity, specification, timing and terms.</li>
          <li><strong>Demonstration data is simulated.</strong> In the Universe Demo account every figure is simulated for demonstration, so it should not be used for real decisions.</li>
        </ul>
      </Section>

      <Section id="standards" title="Standards and references">
        <ul style={ul}>
          <li><strong>GLEC Framework v3.2</strong> (Smart Freight Centre), aligned with <strong>ISO 14083</strong>, for default emission factors and the structure of the CO2e calculation.</li>
          <li><strong>WHO regions</strong> (AFRO, AMRO, EMRO, EURO, SEARO, WPRO) for world regions.</li>
          <li><strong>ISO 3166</strong> country codes and <strong>ISO 4217</strong> currency codes.</li>
          <li><strong>Statistical disclosure control.</strong> The minimum of {min} contributors per figure follows the same principle as small-number suppression used by statistical agencies and health data publishers, to stop a figure being traced back to a few contributors.</li>
          <li><strong>Data protection by design.</strong> Insights is built around data minimisation and purpose limitation, in the spirit of UK GDPR: collect only what the purpose needs, de-identify early, and use it only for sector-level insight.</li>
          <li><strong>Universe&apos;s own categories:</strong> the commodity groups, the types of service and the efficiency score are defined by Universe, informed by the categories used by major procurement and aid organisations.</li>
        </ul>
        <p style={{ ...p, marginTop: 10 }}>Insights complements, rather than replaces, public price references that cover particular programmes or product lists. It adds the cost movement of whole product groups, services and freight, with distance and CO2, from live procurement activity.</p>
      </Section>

      <Section id="governance" title="Your data and questions">
        <ul style={ul}>
          <li><strong>Choosing to share.</strong> Sharing is an organisation-level choice made by its administrators. If an organisation withdraws, its new records stop being added. Records already added are anonymous and cannot be traced back to it, so they stay in the history.</li>
          <li><strong>Who can see Insights.</strong> Access is switched on person by person by each organisation&apos;s administrator.</li>
          <li><strong>Corrections and questions.</strong> If a figure looks wrong, or you want to know more about how it was made, ask your organisation&apos;s administrator or Universe support. Insights is built so that nobody can work out who is behind a figure.</li>
          <li><strong>Changes to the method.</strong> Calculations are versioned (the current logistics method is 2026.10-v1), so records made under an older method stay identifiable and this page is updated when a method changes.</li>
        </ul>
      </Section>

      <Section id="glossary" title="Glossary">
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: "10px 24px" }}>
          {[
            ["Cost price", "What a supplier, manufacturer, forwarder or service provider charged, before any margin."],
            ["Like-for-like index", "A measure that compares the same item month to month, starting at 100."],
            ["Contributor", "One organisation behind a figure, counted by a one-way code, never by name."],
            ["Tonne-kilometre", "Moving one tonne of goods one kilometre. Freight cost and CO2 are compared on this basis."],
            ["CO2e", "Carbon dioxide equivalent: all greenhouse gases expressed as the CO2 that would warm the planet as much."],
            ["Efficiency score", "Universe's own 1 to 10 score, mainly about the CO2 intensity of the transport mode used."],
            ["Lane", "A route from one world region to another, used for freight cost."],
            ["Simulated data", "Made-up data used in the demonstration account. Never shown to real organisations."],
          ].map(([t, d]) => <div key={t}><dt style={{ fontWeight: 700, fontSize: 14 }}>{t}</dt><dd style={{ margin: "2px 0 0", fontSize: 14, lineHeight: 1.55 }}>{d}</dd></div>)}
        </dl>
      </Section>
    </Page>
  );
}
