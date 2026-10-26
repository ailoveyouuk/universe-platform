"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CRM_STATUS_LABELS, CRM_STATUSES, CRM_TIER_LABELS, CRM_TIERS, type CrmFollowUp, type CrmOverview, type CrmPipelineSummary } from "@universe/types";
import { AlertIcon, CheckCircleIcon, ClockIcon, PartnersIcon, Pill, StatTile, StatTileGrid, UserIcon } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { useCurrentUser } from "../lib/AuthContext";
import { ErrorNote, Heading, Page, fmtDate } from "../lib/ui";

/** Overview: where the organisation's relationships stand. Every tile opens the Relationships list already filtered. */
export default function Overview() {
  const me = useCurrentUser();
  const [o, setO] = useState<CrmOverview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { apiClient.crmOverview().then(setO).catch((e) => setErr(e instanceof Error ? e.message : "Could not load the CRM.")); }, []);
  const [fu, setFu] = useState<CrmFollowUp[] | null>(null);
  useEffect(() => { apiClient.crmFollowUps().then(setFu).catch(() => setFu([])); }, []);
  const [pl, setPl] = useState<CrmPipelineSummary | null>(null);
  useEffect(() => { apiClient.crmPipeline().then(setPl).catch(() => setPl(null)); }, []);
  const link = (q: string) => `/relationships?${q}`;
  const tile = (label: string, value: number | undefined, icon: React.ReactNode, tone: "brand" | "good" | "warning" | "neutral" | "critical", q: string) => (
    <Link href={link(q)} style={{ textDecoration: "none", color: "inherit", display: "block" }} aria-label={`${label}: ${value ?? "loading"}. Open the list`}>
      <StatTile label={label} value={value} icon={icon} tone={tone} />
    </Link>
  );
  return (
    <Page>
      <Heading title={me?.forename ? `Welcome back, ${me.forename}.` : "CRM"} sub="Your organisation's relationships with the manufacturers, suppliers, freight forwarders and clients it works with. Each one is built on the stakeholder record in Project Management, so nothing is entered twice." />
      <ErrorNote message={err} />
      <StatTileGrid>
        {tile("Relationships", o?.total, <PartnersIcon size={18} />, "brand", "")}
        {tile("Active", o?.active, <CheckCircleIcon size={18} />, "good", "status=ACTIVE")}
        {tile("Need attention", o?.needsAttention, <AlertIcon size={18} />, "warning", "health=attention")}
        {tile("Reviews due", o?.reviewDue, <ClockIcon size={18} />, "critical", "review=due")}
      </StatTileGrid>
      {o && o.unowned > 0 && (
        <p style={{ margin: 0, fontSize: 13.5 }}><UserIcon size={14} /> <Link href={link("owner=none")}>{o.unowned} relationship{o.unowned === 1 ? " has" : "s have"} no owner yet</Link>. An owner is the person who looks after the relationship.</p>
      )}
      {pl && (
        <p style={{ margin: 0, fontSize: 13.5 }}><Link href="/pipeline">{pl.openCount} open opportunit{pl.openCount === 1 ? "y" : "ies"}</Link>{pl.closingSoon > 0 ? `, ${pl.closingSoon} expected within 30 days` : ""}.</p>
      )}
      {fu && fu.length > 0 && (
        <section aria-labelledby="my-follow-ups" style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", padding: "16px 18px", backgroundColor: "var(--u-surface-raised)" }}>
          <h2 id="my-follow-ups" style={{ margin: "0 0 10px", fontSize: 16, fontFamily: "var(--u-font-display)" }}>Your follow-ups</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
            {fu.slice(0, 8).map((f) => (
              <li key={f.id} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
                <Link href={link(`id=${f.relationshipId}`)}>{f.title}</Link>
                {f.dueDate && <Pill tone={f.overdue ? "critical" : "neutral"}>{f.overdue ? "Overdue, " : "Due "}{fmtDate(f.dueDate)}</Pill>}
                {f.body && <span style={{ color: "var(--u-ink-secondary)" }}>{f.body}</span>}
              </li>
            ))}
          </ul>
          {fu.length > 8 && <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>{fu.length - 8} more in your actions list.</p>}
        </section>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        <section aria-labelledby="by-tier" style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", padding: "16px 18px", backgroundColor: "var(--u-surface-raised)" }}>
          <h2 id="by-tier" style={{ margin: "0 0 10px", fontSize: 16, fontFamily: "var(--u-font-display)" }}>By tier</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            {CRM_TIERS.map((t) => <li key={t}><Link href={link(`tier=${t}`)}>{CRM_TIER_LABELS[t]}</Link> <strong>{o?.byTier[t] ?? "…"}</strong></li>)}
          </ul>
        </section>
        <section aria-labelledby="by-status" style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", padding: "16px 18px", backgroundColor: "var(--u-surface-raised)" }}>
          <h2 id="by-status" style={{ margin: "0 0 10px", fontSize: 16, fontFamily: "var(--u-font-display)" }}>By status</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            {CRM_STATUSES.map((t) => <li key={t}><Link href={link(`status=${t}`)}>{CRM_STATUS_LABELS[t]}</Link> <strong>{o?.byStatus[t] ?? "…"}</strong></li>)}
          </ul>
        </section>
      </div>
    </Page>
  );
}
