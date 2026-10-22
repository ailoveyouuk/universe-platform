"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CONTRACT_STATUS_LABELS, type ContractListItem } from "@universe/types";
import { AlertIcon, CalendarIcon, CheckCircleIcon, ClockIcon, FileEditIcon, GridIcon, Pill, SearchInput, StatTile, StatTileGrid } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { Card, ErrorNote, Heading, Page, fmtDate } from "../../lib/ui";

const muted = { color: "var(--u-ink-secondary)" } as const;
const TONE: Record<string, "neutral" | "warning" | "good" | "brand" | "critical"> = { DRAFT: "neutral", AWAITING_SIGNATURE: "warning", ACTIVE: "good", COMPLETED: "brand", TERMINATED: "critical" };
const money = (n: number | null, c: string | null) => (n == null ? "" : `${c ?? ""} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`.trim());

/** Views reached from the tiles here and from the dashboard. Each tile filters this same list (standing UI rule). */
const VIEWS: Record<string, { label: string; test: (c: ContractListItem) => boolean }> = {
  active: { label: "Active", test: (c) => c.status === "ACTIVE" },
  signature: { label: "Awaiting signature", test: (c) => c.awaitingSignature },
  ending: { label: "Ending within 90 days", test: (c) => c.endingSoon || c.expired },
  milestones: { label: "Overdue milestones", test: (c) => c.overdueMilestones > 0 && c.status === "ACTIVE" },
  payments: { label: "Overdue payments", test: (c) => c.overduePayments > 0 },
  variations: { label: "Variations waiting", test: (c) => c.variationsWaiting > 0 },
  attention: { label: "Needs attention", test: (c) => c.status === "ACTIVE" && (c.overdueMilestones > 0 || c.overduePayments > 0 || c.variationsWaitingOnYou > 0 || c.endingSoon || c.expired) },
  closed: { label: "Closed", test: (c) => c.status === "COMPLETED" || c.status === "TERMINATED" },
};

export default function ContractsPage() {
  const [rows, setRows] = useState<ContractListItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState("");
  const [role, setRole] = useState<"" | "OWNER" | "SUPPLIER">("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("view"); if (v && VIEWS[v]) setView(v);
    apiClient.contractList().then(setRows).catch((e) => setErr(e instanceof Error ? e.message : "Could not load contracts."));
  }, []);
  const base = useMemo(() => (rows ?? []).filter((c) => !role || c.role === role), [rows, role]);
  const n = (k: string) => base.filter(VIEWS[k].test).length;
  const shown = useMemo(() => base.filter((c) => (!view || VIEWS[view].test(c)) && (!q || `${c.reference} ${c.title} ${c.tenderReference} ${c.counterparty ?? ""}`.toLowerCase().includes(q.toLowerCase()))), [base, view, q]);
  const pick = (k: string) => setView(view === k ? "" : k);
  const activeValue = base.filter(VIEWS.active.test).reduce((s, c) => s + (c.totalValue ?? 0), 0);
  const cur = base.find((c) => c.currency)?.currency ?? null;
  return (
    <Page>
      <Heading title="Contracts" sub="Every contract your organisation is party to, as tender owner or as supplier." />
      <ErrorNote message={err} />
      <StatTileGrid>
        <StatTile label="Active contracts" value={n("active")} icon={<CheckCircleIcon size={18} />} tone="good" active={view === "active"} onClick={() => pick("active")} note={activeValue ? `${money(activeValue, cur)} in force` : undefined} />
        <StatTile label="Awaiting signature" value={n("signature")} icon={<FileEditIcon size={18} />} tone="warning" active={view === "signature"} onClick={() => pick("signature")} />
        <StatTile label="Ending within 90 days" value={n("ending")} icon={<CalendarIcon size={18} />} tone={n("ending") ? "warning" : "neutral"} active={view === "ending"} onClick={() => pick("ending")} />
        <StatTile label="Overdue milestones" value={n("milestones")} icon={<ClockIcon size={18} />} tone={n("milestones") ? "critical" : "neutral"} active={view === "milestones"} onClick={() => pick("milestones")} />
        <StatTile label="Overdue payments" value={n("payments")} icon={<AlertIcon size={18} />} tone={n("payments") ? "critical" : "neutral"} active={view === "payments"} onClick={() => pick("payments")} />
        <StatTile label="Variations waiting" value={n("variations")} icon={<GridIcon size={18} />} tone={n("variations") ? "warning" : "neutral"} active={view === "variations"} onClick={() => pick("variations")} />
        <StatTile label="Closed" value={n("closed")} icon={<CheckCircleIcon size={18} />} tone="brand" active={view === "closed"} onClick={() => pick("closed")} />
      </StatTileGrid>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {([["", "All"], ["OWNER", "I am the tender owner"], ["SUPPLIER", "I am the supplier"]] as const).map(([v, label]) => (
          <button key={v} type="button" onClick={() => setRole(v)} style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }} aria-pressed={role === v}><Pill tone={role === v ? "brand" : "neutral"}>{label}</Pill></button>))}
        {view && <button type="button" onClick={() => setView("")} style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}><Pill tone="brand">{VIEWS[view].label} ×</Pill></button>}
        <div style={{ marginLeft: "auto", minWidth: 220 }}><SearchInput value={q} onChange={setQ} placeholder="Search contract, tender or organisation" /></div>
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {!rows && !err && <div style={{ padding: 20, ...muted }}>Loading…</div>}
        {rows && shown.length === 0 && <div style={{ padding: 20, ...muted }}>{rows.length === 0 ? "No contracts yet. A contract starts from an awarded tender." : "No contracts match."}</div>}
        {shown.map((c, i) => (
          <Link key={c.id} href={c.role === "OWNER" ? `/tenders/manage?id=${c.tenderId}` : `/bids/status?id=${c.tenderId}`} className="u-card-hover" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, padding: "14px 20px", borderTop: i ? "1px solid var(--u-border)" : "none", textDecoration: "none", color: "var(--u-ink)" }}>
            <div style={{ minWidth: 0 }}>
              <div><strong>{c.reference}</strong> {c.title}</div>
              <div style={{ fontSize: 12.5, marginTop: 3, ...muted }}>
                {c.role === "OWNER" ? "You are the tender owner" : "You are the supplier"} · {c.counterparty ?? "n/a"} · tender {c.tenderReference}{c.isFramework ? " (framework)" : ""}{c.totalValue != null ? ` · ${money(c.totalValue, c.currency)}` : ""}{c.endDate ? ` · ends ${fmtDate(c.endDate)}` : ""}
                {c.milestonesTotal > 0 ? ` · milestones ${c.milestonesDone}/${c.milestonesTotal}` : ""}{c.openCallOffs > 0 ? ` · ${c.openCallOffs} open call-off${c.openCallOffs === 1 ? "" : "s"}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
              {c.overdueMilestones > 0 && <Pill tone="critical">{c.overdueMilestones} milestone{c.overdueMilestones === 1 ? "" : "s"} overdue</Pill>}
              {c.overduePayments > 0 && <Pill tone="critical">{c.overduePayments} payment{c.overduePayments === 1 ? "" : "s"} overdue</Pill>}
              {c.variationsWaitingOnYou > 0 && <Pill tone="warning">Variation awaits you</Pill>}
              {c.variationsWaiting > c.variationsWaitingOnYou && <Pill tone="neutral">Variation sent</Pill>}
              {c.expired ? <Pill tone="critical">Past end date</Pill> : c.endingSoon ? <Pill tone="warning">Ends in {c.daysToEnd}d</Pill> : null}
              <Pill tone={TONE[c.status] ?? "neutral"}>{CONTRACT_STATUS_LABELS[c.status] ?? c.status}</Pill>
            </div>
          </Link>))}
      </Card>
    </Page>
  );
}
