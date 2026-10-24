"use client";

import { useEffect, useState } from "react";
import type { SupplierPortalDashboard } from "@universe/types";
import { AlertIcon, CheckCircleIcon, ClockIcon, FileEditIcon, Pill, ShieldIcon, StatTile, StatTileGrid } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { useCurrentUser } from "../lib/AuthContext";
import { tendersUrl } from "../lib/tendersUrl";
import { Card, ErrorNote, Heading, Page, fmtDate } from "../lib/ui";

/**
 * Supplier Portal home (2026-10-22): one list of everything waiting on this organisation as a supplier (invitations, bids in
 * progress, call-offs, quotes, variations, price reviews, evidence, milestones, payments), most urgent first. Each row opens the
 * right screen in the Tenders app, where the action is taken.
 */
export default function SupplierHomePage() {
  const me = useCurrentUser();
  const allowed = (me?.platformStaffRole ?? "NONE") !== "NONE" || !!me?.permissions.includes("tenders.view");
  const [d, setD] = useState<SupplierPortalDashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    apiClient.supplierPortalDashboard().then(setD).catch((e) => setErr(e instanceof Error ? e.message : "Could not load your dashboard."));
  }, [allowed]);

  if (!allowed) {
    return <Page><Heading title="Supplier Portal" /><Card><p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>Your role does not include viewing tenders and contracts. Ask your organisation administrator for access.</p></Card></Page>;
  }
  const shown = d ? d.items.filter((i) => !filter || i.kind === filter) : [];
  const money = (n: number) => n.toLocaleString("en-GB", { maximumFractionDigits: 0 });
  return (
    <Page>
      <Heading title="Supplier Portal" sub="Everything waiting on your organisation, most urgent first." />
      <ErrorNote message={err} />
      {!d && !err && <div style={{ color: "var(--u-ink-secondary)" }}>Loading…</div>}
      {d && (
        <>
          <StatTileGrid>
            <StatTile label="Waiting on you" value={d.totals.waiting} icon={<FileEditIcon size={18} />} tone={d.totals.waiting ? "brand" : "neutral"} />
            <StatTile label="Urgent" value={d.totals.urgent} icon={<ClockIcon size={18} />} tone={d.totals.urgent ? "warning" : "neutral"} note="Overdue or due within 7 days" />
            {d.totals.overdue > 0 && <StatTile label="Overdue" value={d.totals.overdue} icon={<AlertIcon size={18} />} tone="critical" />}
            <StatTile label="Active contracts" value={d.totals.activeContracts} icon={<ShieldIcon size={18} />} tone="good" note={d.totals.activeContractValue ? `Total value ${money(d.totals.activeContractValue)}` : undefined} />
            <StatTile label="Open bids" value={d.totals.openBids} icon={<CheckCircleIcon size={18} />} tone="brand" />
          </StatTileGrid>

          <Card title="Waiting on you">
            {d.byKind.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <button type="button" onClick={() => setFilter(null)} style={chip(filter === null)}>All ({d.totals.waiting})</button>
                {d.byKind.map((k) => <button key={k.kind} type="button" onClick={() => setFilter(filter === k.kind ? null : k.kind)} style={chip(filter === k.kind)}>{k.label} ({k.count})</button>)}
              </div>
            )}
            {shown.length === 0 ? (
              <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>{d.totals.waiting === 0 ? "Nothing is waiting on you. New invitations, call-offs and requests will appear here." : "Nothing in this group."}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {shown.map((i, n) => (
                  <a key={`${i.kind}-${n}`} href={tendersUrl(i.path)} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: n ? "1px solid var(--u-border)" : "none", color: "var(--u-ink)", textDecoration: "none", flexWrap: "wrap" }}>
                    <span style={{ minWidth: 0 }}><strong>{i.title}</strong><br /><span style={{ color: "var(--u-ink-secondary)", fontSize: 13 }}>{i.label}. {i.detail}</span></span>
                    <span style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                      {i.dueAt && <span style={{ color: "var(--u-ink-secondary)", fontSize: 13 }}>{i.overdue ? "Was due" : "Due"} {fmtDate(i.dueAt)}</span>}
                      {i.overdue ? <Pill tone="critical">Overdue</Pill> : i.urgent ? <Pill tone="warning">Soon</Pill> : null}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </Page>
  );
}

function chip(active: boolean): React.CSSProperties {
  return { border: "1px solid var(--u-border)", borderRadius: 999, padding: "4px 12px", fontSize: 13, cursor: "pointer", background: active ? "var(--u-brand-violet)" : "var(--u-surface)", color: active ? "var(--u-brand-violet-on)" : "var(--u-ink)" };
}
