"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  COMPLAINT_CATEGORIES, COMPLAINT_CHANNELS, COMPLAINT_DIRECTIONS, COMPLAINT_SEVERITIES, COMPLAINT_STATUSES,
  type ComplaintDashboard, type ComplaintListItem, type PartnerOption, type ProjectSummary,
} from "@universe/types";
import { AlertIcon, Button, CheckCircleIcon, ChevronLeftIcon, ClockIcon, Pagination, Pill, PlusIcon, Select, ShieldIcon, StatTile, type PageSize } from "@universe/ui";
import { apiClient } from "../../../lib/apiClient";
import { useCurrentUser } from "../../../lib/AuthContext";
import { ComplaintDetailView } from "./ComplaintDetailView";
import { SeverityPill, StatusPill, cardStyle, fmtDate, fmtDateTime, inputStyle, label, muted, toOptions, Field } from "./ui";

const DIRECTION_LABEL: Record<string, string> = { INBOUND_CLIENT: "Client complaint", OUTBOUND_SUPPLY_CHAIN: "Supply-chain complaint" };

export function ComplaintsView() {
  const id = useSearchParams().get("id");
  return id ? <ComplaintDetailView id={id} /> : <ComplaintList />;
}

function ComplaintList() {
  const me = useCurrentUser();
  const isStaff = (me?.platformStaffRole ?? "NONE") !== "NONE";
  const canLog = isStaff || (me?.permissions.includes("quality.complaints.log") ?? false);
  const canView = isStaff || (me?.permissions.includes("quality.complaints.view") ?? false);
  const [dash, setDash] = useState<ComplaintDashboard | null>(null);
  const [rows, setRows] = useState<ComplaintListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [direction, setDirection] = useState("");
  const [severity, setSeverity] = useState("");
  const [category, setCategory] = useState("");
  const [quick, setQuick] = useState<"" | "open" | "overdue" | "serious" | "triage" | "actions">("");
  const [err, setErr] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(() => {
    if (!canView) return;
    apiClient.complaintDashboard().then(setDash).catch(() => setDash(null));
    apiClient
      .complaintsPage({ q: q.trim() || undefined, status: status || undefined, direction: direction || undefined, severity: severity || undefined, category: category || undefined,
        open: quick === "open", overdue: quick === "overdue", serious: quick === "serious", triage: quick === "triage", actions: quick === "actions", page: page + 1, pageSize: pageSize === "all" ? 100 : pageSize })
      .then((r) => { setRows(r.items); setTotal(r.total); setErr(null); })
      .catch(() => { setRows(null); setErr("Couldn't load complaints. This is usually temporary — try again in a moment."); });
  }, [canView, q, status, direction, severity, category, quick, page, pageSize]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  if (me && !canView) return <div style={{ padding: 32 }}>You don't have access to quality complaints. Ask an administrator for the "View quality complaints" permission.</div>;
  const size = pageSize === "all" ? 100 : pageSize;

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1180, margin: "0 auto" }}>
      <Link href="/quality" style={{ ...muted, textDecoration: "none", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}><ChevronLeftIcon size={14} /> Quality</Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, margin: "8px 0 24px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 26, margin: 0, color: "var(--u-ink)", display: "flex", alignItems: "center", gap: 10 }}><ShieldIcon size={24} /> Quality complaints</h1>
          <p style={{ ...muted, fontSize: 14, marginTop: 6 }}>Complaints from clients to your organisation, and complaints you raise about manufacturers, suppliers and freight forwarders — one workflow, fully audited.</p>
        </div>
        {canLog && <Button variant="primary" icon={<PlusIcon size={16} />} accent="var(--u-org-accent, var(--u-brand-violet))" onClick={() => setShowNew((v) => !v)}>Log a complaint</Button>}
      </div>

      <div className="u-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(170px, 46%), 1fr))", gap: 16, marginBottom: 24 }}>
        <StatTile label="Open" value={dash?.open} icon={<ShieldIcon size={20} />} tone="brand" active={quick === "open"} onClick={() => { setQuick(quick === "open" ? "" : "open"); setPage(0); }} />
        <StatTile label="Overdue" value={dash?.overdue} icon={<ClockIcon size={20} />} tone="warning" active={quick === "overdue"} onClick={() => { setQuick(quick === "overdue" ? "" : "overdue"); setPage(0); }} />
        <StatTile label="Serious" value={dash?.serious} icon={<AlertIcon size={20} />} tone="critical" active={quick === "serious"} onClick={() => { setQuick(quick === "serious" ? "" : "serious"); setPage(0); }} />
        <StatTile label="Awaiting triage" value={dash?.awaitingTriage} icon={<ClockIcon size={20} />} tone="neutral" active={quick === "triage"} onClick={() => { setQuick(quick === "triage" ? "" : "triage"); setPage(0); }} />
        <StatTile label="Open actions" value={dash ? `${dash.openActions}${dash.overdueActions ? ` (${dash.overdueActions} late)` : ""}` : undefined} icon={<CheckCircleIcon size={20} />} tone="neutral" active={quick === "actions"} onClick={() => { setQuick(quick === "actions" ? "" : "actions"); setPage(0); }} />
        <StatTile label="Avg days to close (90d)" value={dash?.averageDaysToClose ?? "—"} icon={<CheckCircleIcon size={20} />} tone="good" />
      </div>

      {dash && (dash.byCategory.length > 0 || dash.byPartner.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 16, marginBottom: 24 }}>
          <div style={cardStyle}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>By category</div>
            {dash.byCategory.map((c) => <div key={c.category} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "3px 0" }}><span>{label(c.category)}</span><strong>{c.count}</strong></div>)}
          </div>
          <div style={cardStyle}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Most complained about (upheld)</div>
            {dash.byPartner.map((p) => <div key={p.partnerId} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "3px 0" }}><Link href={`/partners/detail?id=${p.partnerId}`} style={{ color: "inherit" }}>{p.partnerName}</Link><span><strong>{p.count}</strong> <span style={muted}>({p.upheld} upheld)</span></span></div>)}
          </div>
        </div>
      )}

      {showNew && <NewComplaintForm onDone={() => { setShowNew(false); load(); }} onCancel={() => setShowNew(false)} />}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search reference, title, stakeholder, batch…" style={{ ...inputStyle, maxWidth: 320 }} />
        <Select value={status} onChange={(v) => { setStatus(v); setPage(0); }} options={toOptions(COMPLAINT_STATUSES)} allLabel="Any status" ariaLabel="Status" />
        <Select value={direction} onChange={(v) => { setDirection(v); setPage(0); }} options={COMPLAINT_DIRECTIONS.map((d) => ({ value: d, label: DIRECTION_LABEL[d] }))} allLabel="Both directions" ariaLabel="Direction" />
        <Select value={severity} onChange={(v) => { setSeverity(v); setPage(0); }} options={toOptions(COMPLAINT_SEVERITIES)} allLabel="Any severity" ariaLabel="Severity" />
        <Select value={category} onChange={(v) => { setCategory(v); setPage(0); }} options={toOptions(COMPLAINT_CATEGORIES)} allLabel="Any category" ariaLabel="Category" />
      </div>

      {err && <div role="alert" style={{ ...cardStyle, borderColor: "var(--u-status-critical)" }}>{err}</div>}
      {!rows && !err && <div style={muted}>Loading…</div>}
      {rows && rows.length === 0 && <div style={{ ...cardStyle, ...muted }}>No complaints match. {canLog ? "Use “Log a complaint” to record one." : ""}</div>}
      {rows && rows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr style={{ textAlign: "left", ...muted, fontSize: 12.5 }}>
              {["Reference", "Complaint", "Direction", "Stakeholder", "Severity", "Status", "Next deadline", "Owner"].map((h) => <th key={h} style={{ padding: "8px 10px", borderBottom: "1px solid var(--u-border, #e3e3ec)" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--u-border, #eee)" }}>
                  <td style={{ padding: "10px" }}><Link href={`/quality/complaints?id=${r.id}`} style={{ fontWeight: 700 }}>{r.referenceNumber}</Link></td>
                  <td style={{ padding: "10px", maxWidth: 320 }}>{r.isSerious && <Pill tone="critical">Serious</Pill>} {r.title}<div style={{ ...muted, fontSize: 12 }}>Received {fmtDate(r.receivedAt)}{r.openActions ? ` · ${r.openActions} open action${r.openActions > 1 ? "s" : ""}` : ""}</div></td>
                  <td style={{ padding: "10px" }}>{DIRECTION_LABEL[r.direction]}</td>
                  <td style={{ padding: "10px" }}>{r.partnerName ?? "—"}</td>
                  <td style={{ padding: "10px" }}><SeverityPill severity={r.severity} /></td>
                  <td style={{ padding: "10px" }}><StatusPill status={r.status} />{r.outcome && <div style={{ ...muted, fontSize: 12 }}>{label(r.outcome)}</div>}</td>
                  <td style={{ padding: "10px" }}>{r.nextDueAt ? <span style={{ color: r.overdue ? "var(--u-status-critical)" : undefined, fontWeight: r.overdue ? 700 : 400 }}>{r.nextDueLabel}: {fmtDateTime(r.nextDueAt)}{r.overdue ? " — overdue" : ""}</span> : "—"}</td>
                  <td style={{ padding: "10px" }}>{r.ownerName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        <Pagination pageSize={pageSize} onPageSizeChange={(s) => { setPageSize(s); setPage(0); }} page={page} pageCount={Math.max(1, Math.ceil(total / size))} onPageChange={setPage} totalCount={total} />
      </div>
    </div>
  );
}

function NewComplaintForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [direction, setDirection] = useState<string>("INBOUND_CLIENT");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [channel, setChannel] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [batchQ, setBatchQ] = useState("");
  const [batch, setBatch] = useState<{ id: string; batchNumber: string; productMasterId: string | null } | null>(null);
  const [batchHits, setBatchHits] = useState<{ id: string; batchNumber: string; productMasterId: string | null }[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pSafety, setPSafety] = useState(false);
  const [falsified, setFalsified] = useState(false);
  const [temp, setTemp] = useState(false);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiClient.listPartnerOptions().then(setPartners).catch(() => undefined);
    apiClient.listProjectsPage({ page: 1, pageSize: 100 }).then((r) => setProjects(r.items)).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (batchQ.trim().length < 2) { setBatchHits([]); return; }
    const t = setTimeout(() => { apiClient.searchProductBatches({ batchNumber: batchQ.trim() }).then((r) => setBatchHits(r.slice(0, 8))).catch(() => undefined); }, 250);
    return () => clearTimeout(t);
  }, [batchQ]);

  const serious = pSafety || falsified || temp;
  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const c = await apiClient.createComplaint({
        direction, title: title.trim(), description: description.trim(), receivedAt: receivedAt ? new Date(receivedAt).toISOString() : undefined, channel: channel || undefined,
        partnerId: partnerId || undefined, projectId: projectId || undefined, productBatchId: batch?.id, productMasterId: batch?.productMasterId ?? undefined,
        complainantName: name.trim() || undefined, complainantEmail: email.trim() || undefined, complainantPhone: phone.trim() || undefined,
        flagPatientSafety: pSafety, flagSuspectedFalsified: falsified, flagTemperatureExcursion: temp,
      });
      window.location.href = `/quality/complaints?id=${c.id}`;
      onDone();
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not log the complaint."); } finally { setBusy(false); }
  };

  return (
    <div style={cardStyle}>
      <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Log a complaint</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: "0 16px" }}>
        <Field label="Direction">
          <Select value={direction} onChange={setDirection} options={COMPLAINT_DIRECTIONS.map((d) => ({ value: d, label: DIRECTION_LABEL[d] }))} ariaLabel="Direction" />
        </Field>
        <Field label={direction === "INBOUND_CLIENT" ? "Who is complaining (stakeholder)" : "Who is the complaint about (manufacturer, supplier, forwarder)"}>
          <Select value={partnerId} onChange={setPartnerId} options={partners.map((p) => ({ value: p.id, label: p.name }))} allLabel="Not linked" ariaLabel="Stakeholder" />
        </Field>
        <Field label="Project"><Select value={projectId} onChange={setProjectId} options={projects.map((p) => ({ value: p.id, label: `${p.referenceNumber} · ${p.title}` }))} allLabel="Not linked" ariaLabel="Project" /></Field>
        <Field label="Batch" hint={batch ? `Linked to ${batch.batchNumber}` : "Type a batch number to search"}>
          <input value={batchQ} onChange={(e) => setBatchQ(e.target.value)} style={inputStyle} placeholder="Batch number" />
          {batchHits.length > 0 && <div style={{ border: "1px solid var(--u-border, #ddd)", borderRadius: 8, marginTop: 4 }}>{batchHits.map((b) => <div key={b.id} role="button" tabIndex={0} onClick={() => { setBatch(b); setBatchQ(b.batchNumber); setBatchHits([]); }} onKeyDown={(e) => e.key === "Enter" && (setBatch(b), setBatchQ(b.batchNumber), setBatchHits([]))} style={{ padding: "6px 10px", cursor: "pointer" }}>{b.batchNumber}</div>)}</div>}
        </Field>
      </div>
      <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} maxLength={300} /></Field>
      <Field label="What was reported"><textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: 96 }} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: "0 16px" }}>
        <Field label="Received" hint="Leave blank for now"><input type="datetime-local" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} style={inputStyle} /></Field>
        <Field label="Channel"><Select value={channel} onChange={setChannel} options={toOptions(COMPLAINT_CHANNELS)} allLabel="Not recorded" ariaLabel="Channel" /></Field>
        <Field label="Complainant name" hint="Personal data — visible only to people who can view complaints"><input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} /></Field>
        <Field label="Complainant email"><input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} /></Field>
        <Field label="Complainant phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} /></Field>
      </div>
      <fieldset style={{ border: "1px solid var(--u-border, #ddd)", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
        <legend style={{ fontSize: 12.5, fontWeight: 700, padding: "0 6px" }}>Serious indicators</legend>
        {[["Possible harm to a patient", pSafety, setPSafety], ["Suspected falsified or substandard product", falsified, setFalsified], ["Temperature excursion", temp, setTemp]].map(([t, v, set]) => (
          <label key={t as string} style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0", fontSize: 14 }}><input type="checkbox" checked={v as boolean} onChange={(e) => (set as (b: boolean) => void)(e.target.checked)} /> {t as string}</label>
        ))}
        {serious && <div style={{ marginTop: 6, color: "var(--u-status-critical-text)", fontSize: 13 }}>This will be treated as critical: the quality leads are alerted now and triage is due within one working day.</div>}
      </fieldset>
      {err && <div role="alert" style={{ color: "var(--u-status-critical-text)", marginBottom: 8 }}>{err}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <Button variant="primary" onClick={submit} disabled={busy || !title.trim() || !description.trim()}>{busy ? "Logging…" : "Log complaint"}</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
