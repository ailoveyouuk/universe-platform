"use client";
import { useCallback, useEffect, useState } from "react";
import type { CrmRelationshipDetail, PartnerScorecard } from "@universe/types";
import { Pill, UNIVERSE_APPS } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { fmtDate, humanise } from "../lib/ui";
import { Places } from "./Places";
import { WorkTab } from "./WorkTab";

export type Tab360 = "overview" | "interactions" | "opportunities" | "people" | "places" | "work" | "hospitality" | "performance" | "compliance";
export const TABS_360: { key: Tab360; label: string }[] = [
  { key: "overview", label: "Overview" }, { key: "interactions", label: "Interactions" }, { key: "opportunities", label: "Opportunities" }, { key: "people", label: "People" }, { key: "places", label: "Places and links" }, { key: "work", label: "Work together" }, { key: "hospitality", label: "Gifts and hospitality" },
  { key: "performance", label: "Performance" }, { key: "compliance", label: "Compliance" },
];

const th: React.CSSProperties = { textAlign: "left", padding: "6px 10px", color: "var(--u-ink-secondary)", fontWeight: 600, fontSize: 12.5, borderBottom: "1px solid var(--u-border)" };
const td: React.CSSProperties = { padding: "6px 10px", borderBottom: "1px solid var(--u-border)", verticalAlign: "top" };
const note: React.CSSProperties = { margin: 0, color: "var(--u-ink-secondary)" };

function Table({ label, head, rows }: { label: string; head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table aria-label={label} style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
        <thead><tr>{head.map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={td}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/** Relationship 360 panels (read-only). Everything here is read from the app that owns it, with a link back to edit it there. */
export function Detail360({ relId, partnerId, tab, card, canManage }: { relId: string; partnerId: string | null; tab: Exclude<Tab360, "overview">; card: PartnerScorecard | null | "none"; canManage: boolean }) {
  const [d, setD] = useState<CrmRelationshipDetail | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { if (!d && !err) apiClient.crmDetail(relId).then(setD).catch(() => setErr(true)); }, [relId, d, err]);
  const reload = useCallback(async () => { try { setD(await apiClient.crmDetail(relId)); } catch { setErr(true); } }, [relId]);
  const pm = UNIVERSE_APPS.find((a) => a.key === "project-management")?.href;
  if (err) return <p style={note}>Could not load this section.</p>;
  if (!d) return <p style={note}>Loading…</p>;

  if (tab === "people") {
    if (d.contacts === null) return <p style={note}>Contacts are held in Project Management; ask your administrator for access to that app to see them here.</p>;
    return d.contacts.length === 0 ? <p style={note}>No contacts recorded yet. Contacts are added on the stakeholder record in Project Management.</p> : (
      <>
        <Table label="Contacts" head={["Name", "Role", "Email", "Phone"]} rows={d.contacts.map((c) => [<strong key="n">{c.name}</strong>, c.title ?? "—", c.email ?? "—", c.phone ?? "—"])} />
        {pm && partnerId && <p style={{ margin: "8px 0 0" }}><a href={`${pm}/partners/detail?id=${partnerId}`}>Edit contacts in Project Management</a></p>}
      </>
    );
  }
  if (tab === "places") return <Places relId={relId} canManage={canManage} locations={d.locations} links={d.links} reload={reload} />;
  if (tab === "work") {
    if (!d.projects) return <p style={note}>Projects are held in Project Management; you need access to that app and permission to view projects to see them here.</p>;
    return <WorkTab relId={relId} />;
  }
  if (tab === "performance") {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <p style={{ margin: 0 }}>{card === null ? "Loading scorecard…" : card === "none" ? "Quality scorecard not available." : card.overallScore === null ? "Quality scorecard: not enough data yet." : <>Quality scorecard: <strong>{Math.round(card.overallScore)}</strong> out of 100, {humanise(card.scoreBand)}. Based on {Math.round(card.coverage)}% of the measures.</>}</p>
        {d.complaints === null ? <p style={note}>Complaints are shown only to people with quality complaint access.</p> : d.complaints.total === 0 ? <p style={note}>No complaints recorded against this stakeholder.</p> : (
          <>
            <p style={{ ...note, margin: 0 }}>{d.complaints.total} complaint{d.complaints.total === 1 ? "" : "s"}{d.complaints.total > d.complaints.items.length ? `, newest ${d.complaints.items.length} shown` : ""}.</p>
            <Table label="Complaints" head={["Reference", "Title", "Status", "Severity", "Received"]} rows={d.complaints.items.map((c) => [c.referenceNumber, c.title, humanise(c.status), c.severity ? humanise(c.severity) : "—", fmtDate(c.receivedAt)])} />
          </>
        )}
      </div>
    );
  }
  const now = Date.now();
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <p style={{ margin: 0 }}>Approval: <strong>{d.approvalStatus ? humanise(d.approvalStatus) : "Not known"}</strong>. Last reviewed {fmtDate(d.lastApprovalReviewDate)}, next review due {fmtDate(d.nextApprovalReviewDue)}.</p>
      <div>
        <h2 style={{ margin: "0 0 6px", fontSize: 13.5 }}>Certificates and licences</h2>
        {d.certificates.length === 0 ? <p style={note}>None recorded.</p> : <Table label="Certificates" head={["Type", "Reference", "Issued by", "Expires", "State"]} rows={d.certificates.map((c) => {
          const exp = c.expiryDate ? new Date(c.expiryDate).getTime() : null;
          const state = c.status !== "CURRENT" ? <Pill key="s" tone="neutral">{humanise(c.status)}</Pill> : exp !== null && exp < now ? <Pill key="s" tone="critical">Expired</Pill> : exp !== null && exp < now + 60 * 86400000 ? <Pill key="s" tone="warning">Expires soon</Pill> : <Pill key="s" tone="good">Current</Pill>;
          return [humanise(c.type), c.referenceNumber ?? "—", c.issuingBody ?? "—", fmtDate(c.expiryDate), state];
        })} />}
      </div>
      <div>
        <h2 style={{ margin: "0 0 6px", fontSize: 13.5 }}>Company checks</h2>
        {d.checks.length === 0 ? <p style={note}>None recorded.</p> : <Table label="Company checks" head={["Check", "Result", "Checked"]} rows={d.checks.map((c) => [c.customLabel ?? humanise(c.checkType), humanise(c.result), fmtDate(c.checkedDate)])} />}
      </div>
      <div>
        <h2 style={{ margin: "0 0 6px", fontSize: 13.5 }}>Approval history</h2>
        {d.approvals.length === 0 ? <p style={note}>No approval decisions recorded.</p> : <Table label="Approval history" head={["Decision", "Date", "Reason"]} rows={d.approvals.map((a) => [humanise(a.action), fmtDate(a.actionDate), a.reason ?? "—"])} />}
      </div>
    </div>
  );
}
