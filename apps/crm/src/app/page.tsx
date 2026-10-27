"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CRM_OPEN_STAGES, CRM_OPPORTUNITY_STAGE_LABELS, CRM_STATUS_LABELS, CRM_STATUSES, CRM_TIER_LABELS, CRM_TIERS, categoryPlural, PARTNER_ROLE_TYPES, type CrmFollowUp, type CrmOverview, type CrmPipelineSummary, type CrmPipelineView, type CrmRelationshipRow, type CrmTag } from "@universe/types";
import { AlertIcon, CheckCircleIcon, ClockIcon, OverviewHero, PartnersIcon, Pill, StatTile, StatTileGrid, UserIcon } from "@universe/ui";
import { useRouter } from "next/navigation";
import { apiClient } from "../lib/apiClient";
import { useCurrentUser } from "../lib/AuthContext";
import { accentVar } from "../lib/category";
import { ErrorNote, Page, fmtDate } from "../lib/ui";

/** Overview: where the organisation's relationships stand. Every tile opens the Relationships list already filtered. */
export default function Overview() {
  const me = useCurrentUser();
  const router = useRouter();
  const [o, setO] = useState<CrmOverview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { apiClient.crmOverview().then(setO).catch((e) => setErr(e instanceof Error ? e.message : "Could not load the CRM.")); }, []);
  const [fu, setFu] = useState<CrmFollowUp[] | null>(null);
  useEffect(() => { apiClient.crmFollowUps().then(setFu).catch(() => setFu([])); }, []);
  const [pl, setPl] = useState<CrmPipelineSummary | null>(null);
  useEffect(() => { apiClient.crmPipeline().then(setPl).catch(() => setPl(null)); }, []);
  const [pv, setPv] = useState<CrmPipelineView | null>(null);
  useEffect(() => { apiClient.crmPipelineView().then(setPv).catch(() => setPv(null)); }, []);
  const [tags, setTags] = useState<CrmTag[]>([]);
  useEffect(() => { apiClient.crmTags().then(setTags).catch(() => setTags([])); }, []);
  const [due, setDue] = useState<CrmRelationshipRow[]>([]);
  useEffect(() => { apiClient.crmRelationships({ review: "due", sort: "review", pageSize: 5 }).then((d) => setDue(d.items)).catch(() => setDue([])); }, []);
  const link = (q: string) => `/relationships?${q}`;
  const tile = (label: string, value: number | undefined, icon: React.ReactNode, tone: "brand" | "good" | "warning" | "neutral" | "critical", q: string) => (
    <Link href={link(q)} style={{ textDecoration: "none", color: "inherit", display: "block" }} aria-label={`${label}: ${value ?? "loading"}. Open the list`}>
      <StatTile label={label} value={value} icon={icon} tone={tone} />
    </Link>
  );
  return (
    <Page>
      <OverviewHero color="var(--u-module-crm)" forename={me?.forename} title="Every relationship, in one place." intro="Your organisation's manufacturers, suppliers, forwarders, clients, funders and buyers, built on the stakeholder records in Project Management so nothing is entered twice."
        search={{ label: "Search the CRM", placeholder: "Search: a name, a contact, a certificate, Kenya, ISO 13485", quick: ["Manufacturer", "ISO 13485", "Site visit", "Kenya"], onSearch: (t) => router.push(`/search?q=${encodeURIComponent(t.trim())}`) }} />
      <ErrorNote message={err} />
      <StatTileGrid>
        {tile("Relationships", o?.total, <PartnersIcon size={18} />, "brand", "")}
        {tile("Active", o?.active, <CheckCircleIcon size={18} />, "good", "status=ACTIVE")}
        {tile("Need attention", o?.needsAttention, <AlertIcon size={18} />, "warning", "health=attention")}
        {tile("Reviews due", o?.reviewDue, <ClockIcon size={18} />, "critical", "review=due")}
      </StatTileGrid>
      <section aria-labelledby="by-kind" style={{ display: "grid", gap: 10 }}>
        <h2 id="by-kind" style={{ margin: 0, fontSize: 18, fontFamily: "var(--u-font-display)" }}>Stakeholders by kind</h2>
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--u-ink-secondary)" }}>Choose a kind to see every stakeholder of that kind on record. A stakeholder with more than one role is counted under each.</p>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: 12 }}>
          {PARTNER_ROLE_TYPES.map((k) => {
            const n = o ? (o.byCategory[k] ?? 0) : undefined;
            return (
              <li key={k}>
                <Link href={link(`role=${k}`)} aria-label={`${categoryPlural(k)}: ${n ?? "loading"}. Open the list`} style={{ display: "block", textDecoration: "none", color: "var(--u-ink)", border: "1px solid var(--u-border)", borderLeft: `4px solid ${accentVar(k)}`, borderRadius: "var(--u-radius-lg)", padding: "12px 14px", backgroundColor: "var(--u-surface-raised)", backgroundImage: `linear-gradient(100deg, color-mix(in srgb, ${accentVar(k)} 11%, transparent) 0%, transparent 70%)` }}>
                  <span style={{ display: "block", fontSize: 28, fontWeight: 700, fontFamily: "var(--u-font-display)", lineHeight: 1.1 }}>{n ?? "…"}</span>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>{categoryPlural(k)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      {o && o.unowned > 0 && (
        <p style={{ margin: 0, fontSize: 13.5 }}><UserIcon size={14} /> <Link href={link("owner=none")}>{o.unowned} relationship{o.unowned === 1 ? " has" : "s have"} no owner yet</Link>. An owner is the person who looks after the relationship.</p>
      )}
      {pl && pl.openCount > 0 && (
        <section aria-labelledby="pipeline-strip" style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", padding: "16px 18px", backgroundColor: "var(--u-surface-raised)" }}>
          <h2 id="pipeline-strip" style={{ margin: "0 0 10px", fontSize: 16, fontFamily: "var(--u-font-display)" }}>Pipeline</h2>
          {pv && (() => {
            const m = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: pv.currency, notation: "compact", maximumFractionDigits: 1 }).format(n);
            const attn = pv.attention.staleCount + pv.attention.overdueCount;
            return (
              <ul style={{ margin: "0 0 10px", padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(170px, 100%), 1fr))", gap: 12 }}>
                {[["Open pipeline", m(pv.openValue), `${pl.openCount} open`], ["Likely to land", m(pv.weightedValue), "weighted by chance of winning"], ["Win rate", pv.winRate === null ? "None closed yet" : `${pv.winRate}%`, "won out of won and lost"], ["Need a look", String(attn), `${pv.attention.staleCount} not moving · ${pv.attention.overdueCount} past date`]].map(([k, big, small]) => (
                  <li key={k}><Link href="/pipeline" aria-label={`${k}: ${big}, ${small}. Open the pipeline`} style={{ display: "block", textDecoration: "none", color: "var(--u-ink)", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "10px 12px" }}><span style={{ display: "block", fontSize: 12.5, color: "var(--u-ink-secondary)" }}>{k}</span><span style={{ display: "block", fontSize: 22, fontWeight: 700, fontFamily: "var(--u-font-display)", lineHeight: 1.2 }}>{big}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--u-ink-secondary)" }}>{small}</span></Link></li>
                ))}
              </ul>
            );
          })()}
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", gap: 18, flexWrap: "wrap" }}>
            {CRM_OPEN_STAGES.map((st) => <li key={st}>{CRM_OPPORTUNITY_STAGE_LABELS[st]} <strong>{pl.byStage[st].count}</strong></li>)}
          </ul>
          <p style={{ margin: "8px 0 0", fontSize: 13.5 }}><Link href="/pipeline">Open the pipeline</Link>{pl.closingSoon > 0 ? `. ${pl.closingSoon} expected within 30 days.` : "."}</p>
        </section>
      )}
      {due.length > 0 && (
        <section aria-labelledby="reviews-due" style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", padding: "16px 18px", backgroundColor: "var(--u-surface-raised)" }}>
          <h2 id="reviews-due" style={{ margin: "0 0 10px", fontSize: 16, fontFamily: "var(--u-font-display)" }}>Reviews overdue</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            {due.map((r) => <li key={r.id} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}><Link href={link(`id=${r.id}`)}>{r.name}</Link><Pill tone="critical">Due {fmtDate(r.nextReviewDue)}</Pill><span style={{ color: "var(--u-ink-secondary)" }}>{r.ownerName ?? "No owner"}</span></li>)}
          </ul>
          {(o?.reviewDue ?? 0) > due.length && <p style={{ margin: "8px 0 0", fontSize: 13.5 }}><Link href={link("review=due")}>See all {o?.reviewDue}</Link></p>}
        </section>
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
        {tags.length > 0 && (
          <section aria-labelledby="by-tag" style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", padding: "16px 18px", backgroundColor: "var(--u-surface-raised)" }}>
            <h2 id="by-tag" style={{ margin: "0 0 10px", fontSize: 16, fontFamily: "var(--u-font-display)" }}>By tag</h2>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
              {[...tags].sort((a, b) => b.count - a.count).slice(0, 8).map((t) => <li key={t.id}><Link href={link(`tag=${t.id}`)}>{t.name}</Link> <strong>{t.count}</strong></li>)}
            </ul>
          </section>
        )}
      </div>
    </Page>
  );
}
