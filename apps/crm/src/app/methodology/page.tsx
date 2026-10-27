"use client";

import type { ReactNode } from "react";
import { CRM_RECENCY_MONTHS } from "@universe/types";
import { STAGE_PRIOR } from "../../lib/probability-defaults";
import { Heading, Page } from "../../lib/ui";

const card: React.CSSProperties = { border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", padding: "16px 18px", backgroundColor: "var(--u-surface-raised)", display: "grid", gap: 8 };
const p: React.CSSProperties = { margin: 0, fontSize: 14, lineHeight: 1.6 };
const ul: React.CSSProperties = { margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.65 };
const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 12.5, fontWeight: 600, borderBottom: "1px solid var(--u-border)", verticalAlign: "bottom" };
const td: React.CSSProperties = { padding: "9px 10px", fontSize: 13.5, verticalAlign: "top", lineHeight: 1.5, borderBottom: "1px solid var(--u-border)" };

const SECTIONS = [
  { id: "purpose", title: "Purpose" },
  { id: "figures", title: "Where each figure comes from" },
  { id: "health", title: "Relationship health" },
  { id: "pipeline", title: "The pipeline" },
  { id: "probability", title: "Chance of winning" },
  { id: "search", title: "Search and filters" },
  { id: "privacy", title: "Privacy and data protection" },
  { id: "standards", title: "Standards and references" },
  { id: "limits", title: "Limits" },
  { id: "glossary", title: "Glossary" },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-h`} style={{ ...card, scrollMarginTop: 12 }}><h2 id={`${id}-h`} style={{ margin: 0, fontSize: 18, fontFamily: "var(--u-font-display)" }}>{title}</h2>{children}</section>;
}

const FIGURES: { name: string; shows: string; from: string; how: string }[] = [
  { name: "Relationship counts and kinds (Overview, Relationships)", shows: "How many stakeholders you have, by kind, tier, status and owner.", from: "The relationship records in this CRM, on top of the stakeholder records in Project Management.", how: "Counted by the database. A stakeholder with more than one role is counted under each kind." },
  { name: "Health tiles (Healthy, Needs attention, At risk)", shows: "Which relationships need a look.", from: "Approval status, certificates, open quality complaints, review dates and the latest interaction.", how: "Calculated by fixed rules (see Relationship health). A manager's override is shown beside the calculated value, never instead of it." },
  { name: "Reviews due", shows: "Relationships past their review date.", from: "Each relationship's review interval and last review date.", how: "Next review = last review + the interval you set (default 12 months). A daily job reminds the owner from 14 days ahead." },
  { name: "Portfolio (projects, map, places)", shows: "Work done with each stakeholder, and where they operate.", from: "Projects and their stakeholders in Project Management; places and links entered here or held in Project Management.", how: "Projects are counted by outcome: identified, in progress, submitted, awarded, completed, unawarded. Cancelled projects are left out." },
  { name: "Compliance (certificates, evidence)", shows: "Which certificates are current, expiring or expired.", from: "Certificates and evidence recorded on stakeholder records in Project Management.", how: "Expiring means within 60 days. Expired counts only certificates still marked current." },
  { name: "Gifts and hospitality", shows: "Your register of gifts and hospitality given, received or declined.", from: "Entries made by your staff, held against the thresholds and policy your organisation set.", how: "An entry above your threshold, or involving a public official, needs approval. Thresholds are yours; the starting values are suggestions." },
  { name: "Pipeline (stages, months, kinds, stakeholders)", shows: "What could become work, and when.", from: "Opportunities entered here, optionally linked to a tender or a Project Management project.", how: "See The pipeline. All values are cost-side estimates, converted to the currency you choose." },
  { name: "Network (other Universe organisations)", shows: "How many other organisations match, without naming them.", from: "Shared directory profiles of other organisations on Universe.", how: "Identity is shown only for organisations that chose to share it, and counts below five organisations are not shown." },
  { name: "Search", shows: "Anything in your CRM matching your words.", from: "Your relationships, contacts, interactions, opportunities, places, tags and certificates.", how: "See Search and filters." },
];

export default function MethodologyPage() {
  const recency = Object.entries(CRM_RECENCY_MONTHS);
  return (
    <Page>
      <Heading title="Methodology" sub="What the CRM is for, where each figure comes from, how it is calculated, how personal data is protected, and the standards it was built against." />
      <nav aria-label="On this page" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`} className="u-touch" style={{ padding: "5px 12px", border: "1px solid var(--u-border)", borderRadius: 999, fontSize: 13, textDecoration: "none", backgroundColor: "var(--u-surface-raised)", color: "var(--u-ink)" }}>{s.title}</a>)}
      </nav>

      <Section id="purpose" title="Purpose">
        <p style={p}>The CRM is a relationship and accountability record for your organisation&apos;s supply chain. It brings together the manufacturers, suppliers, freight forwarders, clients, funders and tendering bodies you work with, what has been said and agreed with them, and what could become work. It is not a marketing tool: there are no campaigns, bulk email or lead scores.</p>
        <ul style={ul}>
          <li><strong>One source of truth.</strong> Company details, certificates and contacts stay in Project Management. The CRM adds the relationship layer on top and never keeps a second copy of the facts.</li>
          <li><strong>Private to your organisation.</strong> Your notes, interactions and opportunities are never visible to another organisation, and never feed Insights, the shared registry or benchmarks.</li>
          <li><strong>Calculated, not typed.</strong> Health, probability and forecasts are worked out by stated rules from recorded facts, so a person can always see why.</li>
          <li><strong>Nothing is deleted.</strong> Records are archived. The one exception is personal data, which the law can require to be erased: it is then irreversibly anonymised in place and the action is logged.</li>
        </ul>
      </Section>

      <Section id="figures" title="Where each figure comes from">
        <p style={p}>Each tile and chart in the CRM carries a small source note. This table gathers them.</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <caption style={{ textAlign: "left", fontSize: 12.5, color: "var(--u-ink-secondary)", padding: "0 0 6px" }}>Figures in the CRM, their data and how they are worked out</caption>
            <thead><tr><th scope="col" style={th}>Figure</th><th scope="col" style={th}>What it shows</th><th scope="col" style={th}>Data used</th><th scope="col" style={th}>How it is worked out</th></tr></thead>
            <tbody>{FIGURES.map((f) => <tr key={f.name}><th scope="row" style={{ ...td, textAlign: "left", fontWeight: 600 }}>{f.name}</th><td style={td}>{f.shows}</td><td style={td}>{f.from}</td><td style={td}>{f.how}</td></tr>)}</tbody>
          </table>
        </div>
      </Section>

      <Section id="health" title="Relationship health">
        <p style={p}>Health is the worst of the following, and the reasons are listed on the relationship so nobody has to guess.</p>
        <ul style={ul}>
          <li><strong>At risk:</strong> the stakeholder&apos;s approval is rejected or suspended, or a certificate still marked current has expired.</li>
          <li><strong>Needs attention:</strong> approval is pending or its review is overdue; a certificate expires within 60 days; the relationship review is overdue; an open quality complaint exists (shown only to people allowed to see complaint data); or an active relationship has had no recorded interaction within its tier&apos;s window.</li>
          <li><strong>Healthy:</strong> none of the above.</li>
        </ul>
        <p style={p}>Interaction window by tier: {recency.map(([t, m]) => `${t.charAt(0)}${t.slice(1).toLowerCase()} ${m} months`).join(", ")}. No published standard sets such a window, so it is a working rule that your organisation can review.</p>
        <p style={p}>Health describes the organisation you work with. It is never a score about an individual person, and no decision about a person is made automatically.</p>
      </Section>

      <Section id="pipeline" title="The pipeline">
        <ul style={ul}>
          <li><strong>Stages:</strong> Identified, Qualifying, Engaged, Submitted are open. Won, Lost and Withdrawn are closed. Win rate = won ÷ (won + lost) by number; withdrawn is left out because it says nothing about winning.</li>
          <li><strong>Values:</strong> cost-side estimates only, never a price carrying a margin. Each is converted into the currency you choose at the platform&apos;s daily exchange rate (European Central Bank reference rates, stored by Universe, the same rates Project Management and Insights use). The rate date is shown on the chart.</li>
          <li><strong>Months:</strong> open opportunities are placed in the month of their expected date. Past dates and undated opportunities are shown separately.</li>
          <li><strong>Needs attention:</strong> an open opportunity with no change of stage for 60 days or more, or past its expected date. The owner gets a reminder in the bell, once per cycle.</li>
          <li><strong>Owner:</strong> the person named as owner. Where there is none and the opportunity is linked to a project, that project&apos;s lead is used.</li>
          <li><strong>Currency exposure:</strong> open opportunities grouped by the currency they were entered in; shares are taken after conversion.</li>
          <li><strong>How deals move and forecast accuracy:</strong> from the stage history, which records each time an opportunity is created, changes stage, or has its expected value or date revised. It is append-only. Average days in a stage use completed visits only.</li>
          <li><strong>Participants:</strong> the stakeholders that touched an opportunity (tender issuer, bidder, manufacturers, forwarders, suppliers, client) are worked out from the linked tender and project, limited to stakeholders already in your CRM, or added by hand.</li>
        </ul>
      </Section>

      <Section id="probability" title="Chance of winning">
        <p style={p}>Each open opportunity gets an estimated chance of winning. The method is Universe&apos;s own, in the style of ordinary pipeline weighting, and it is not drawn from a published standard.</p>
        <ol style={ul}>
          <li>Start from a usual figure for the stage: {Object.entries(STAGE_PRIOR).map(([s, v]) => `${s.charAt(0)}${s.slice(1).toLowerCase()} ${Math.round(v * 100)}%`).join(", ")}.</li>
          <li>Adjust it using your own closed opportunities: how often work that reached this stage was won; how like-for-like work (same kind, same commodity or service group) has gone; and how this stakeholder has gone.</li>
          <li>Pull every figure towards a wider one when there is little evidence (so three past deals cannot swing a forecast), share the weight between the like-for-like and stakeholder signals so one past deal is not counted twice, and keep the result between 2% and 95%.</li>
        </ol>
        <p style={p}><strong>Likely to land</strong> is the sum of value × chance for open opportunities. Each opportunity shows the evidence behind its figure (&quot;Why n% likely&quot;), and the confidence shown on the Pipeline page is low below 10 closed opportunities, medium below 40 and high above that.</p>
      </Section>

      <Section id="search" title="Search and filters">
        <p style={p}>Search looks across your own relationships, contacts, interactions, opportunities, places, tags and certificates. Every word you type must match somewhere in a record, so adding words narrows the result. Country names are understood as well as codes, and a kind such as &quot;manufacturer&quot; matches stakeholders holding that role. Interactions marked confidential only appear to people allowed to see them. List filters are applied by the database, so the tiles above a list always describe the same set as the list.</p>
      </Section>

      <Section id="privacy" title="Privacy and data protection">
        <ul style={ul}>
          <li><strong>Who is responsible.</strong> Each organisation decides why and how it uses its relationship and contact records, so it is the controller of that data; Universe is the processor operating the system for it. Universe controls only its own account and audit data. This split still needs a data-protection adviser to confirm it before real contacts are loaded.</li>
          <li><strong>Contacts.</strong> Each contact has a recorded lawful basis and reason, a decision role, and a data-protection status. People can be restricted, can object, and can have their data found and anonymised through the Privacy page, with a suppression list kept so they are not recontacted.</li>
          <li><strong>Pooled data.</strong> Another organisation&apos;s information appears only anonymised, unless that organisation chose to share its identity, and only in groups of five or more organisations.</li>
          <li><strong>Exports.</strong> Need manage permission, cover what your organisation entered, follow the filters you applied, and are recorded in the audit log.</li>
          <li><strong>Audit.</strong> Changes and access to relationship and contact records are logged with who, when and what changed.</li>
        </ul>
      </Section>

      <Section id="standards" title="Standards and references">
        <p style={p}>These sources were researched and used as frameworks. The CRM follows their structure and intent; it does not claim certification or full conformity with any of them.</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
            <caption style={{ textAlign: "left", fontSize: 12.5, color: "var(--u-ink-secondary)", padding: "0 0 6px" }}>Standards and references the CRM was benchmarked against</caption>
            <thead><tr><th scope="col" style={th}>Source</th><th scope="col" style={th}>What it shaped in the CRM</th></tr></thead>
            <tbody>
              {[
                ["UK GDPR and Data Protection Act 2018, with ICO guidance", "Lawful basis per contact, legitimate interests assessment, records of processing, subject access, erasure, objection and suppression, retention, privacy by design."],
                ["Data (Use and Access) Act 2025", "Subject access search and time limits, automated decisions, complaints process."],
                ["PECR (electronic marketing)", "Contact record carries subscriber type and a suppression list so marketing can be added safely. Nothing is sent today."],
                ["ISO/IEC 27001:2022 (information security)", "Access by role, audit logging, tenant isolation, secure development habits."],
                ["ISO/IEC 27701:2025 (privacy information management)", "Controller and processor responsibilities, rights handling, privacy by design."],
                ["ISO 9001:2015 clause 8.4 (externally provided processes)", "Evaluating, monitoring and re-evaluating suppliers; keeping records of decisions."],
                ["ISO 10002:2018 (complaints handling)", "Complaints surface in health and the relationship view; data-protection complaints process."],
                ["ISO 37001 (anti-bribery management)", "Gifts and hospitality register, approval above thresholds, public-official rule, due diligence tiers."],
                ["ISO 20400 (sustainable procurement)", "Tier, review and performance feedback loop for supplier relationships."],
                ["SOC 2 (AICPA Trust Services Criteria)", "Security, confidentiality and privacy expectations behind audit logging and access control."],
                ["NIST Privacy Framework", "A way to organise privacy work."],
                ["WHO model quality assurance system for procurement agencies; EU Good Distribution Practice", "Knowing suppliers, assessing them before and during use, keeping evidence, review cadence."],
                ["UK Procurement Act 2023", "Supplier information and exclusion considerations in compliance views."],
                ["Cyber Essentials Plus", "The platform's standing security target (a target, not an assessment of the CRM itself); the CRM uses the same controls as other apps."],
                ["WCAG 2.1 level AA", "Every CRM screen in light and dark themes, checked by lint and a live scan; see the Universe accessibility standard. A person-led screen-reader review is still outstanding."],
                ["Established CRM platforms (Salesforce, Microsoft Dynamics 365, HubSpot)", "A checklist of common capabilities: consent, lawful basis, audit, retention, subject requests, segments, timelines."],
              ].map(([a, b]) => <tr key={a}><th scope="row" style={{ ...td, textAlign: "left", fontWeight: 600 }}>{a}</th><td style={td}>{b}</td></tr>)}
            </tbody>
          </table>
        </div>
        <p style={p}>The pipeline stages, win-probability method and relationship-health rules are Universe&apos;s own working rules, informed by common CRM practice. They are not taken from any of the standards above.</p>
      </Section>

      <Section id="limits" title="Limits">
        <ul style={ul}>
          <li>Estimates are only as good as the records behind them. With few closed opportunities the chance of winning stays close to the usual stage figures, and the page says so.</li>
          <li>Exchange rates are daily reference rates, not the rate you may actually get.</li>
          <li>Links to tenders and projects only name stakeholders already in your CRM; the CRM does not add stakeholders by itself.</li>
          <li>Health depends on the data being kept up to date in Project Management and here.</li>
          <li>Nothing here is legal advice. The data-protection sections need review by an adviser before real people&apos;s details are loaded.</li>
        </ul>
      </Section>

      <Section id="glossary" title="Glossary">
        <ul style={ul}>
          <li><strong>Relationship:</strong> your organisation&apos;s record of a stakeholder: owner, tier, status, review cadence.</li>
          <li><strong>Tier:</strong> Strategic, Key, Standard or Watch; sets how often contact is expected.</li>
          <li><strong>Opportunity:</strong> something that could become work with a stakeholder.</li>
          <li><strong>Likely to land:</strong> open value weighted by the estimated chance of winning.</li>
          <li><strong>Participant:</strong> a stakeholder that touched an opportunity, and in what capacity.</li>
          <li><strong>Controller / processor:</strong> the party that decides why personal data is used / the party that handles it on the controller&apos;s behalf.</li>
        </ul>
      </Section>
    </Page>
  );
}
