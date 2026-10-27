"use client";

import { useCallback, useEffect, useState } from "react";
import type { DataExportRequestSummary, ExportCapabilities } from "@universe/types";
import { Button, DownloadIcon, Pill, CollapsibleSection } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { saveExport } from "../../lib/download";

const d = (v: string | null) => (v ? new Date(v).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const tone = (s: string) => (s === "APPROVED" ? "good" : s === "PENDING" ? "warning" : s === "REJECTED" ? "critical" : "neutral");
const scopeLabel = (s: string) => (s === "CATALOGUE" ? "Whole product catalogue" : "All regulatory registrations");

const OWN: { key: string; label: string; help: string; run: () => ReturnType<typeof apiClient.exportCatalogueCsv> }[] = [
  { key: "products", label: "Products we added", help: "Catalogue entries your organisation contributed.", run: () => apiClient.exportCatalogueCsv({ includeArchived: true }) },
  { key: "registrations", label: "Registrations we added", help: "Regulatory registrations your organisation contributed, with your verification.", run: () => apiClient.exportRegistrationsCsv({ includeArchived: true }) },
  { key: "stakeholders", label: "Stakeholders", help: "Suppliers, manufacturers, forwarders, clients and others in your account (no financial details).", run: () => apiClient.exportOrganisationCsv("partners", true) },
  { key: "projects", label: "Projects", help: "Your projects (no cost figures; those stay in the app).", run: () => apiClient.exportOrganisationCsv("projects", true) },
  { key: "contacts", label: "Contacts", help: "Named contacts at your stakeholders.", run: () => apiClient.exportOrganisationCsv("contacts", true) },
  { key: "batches", label: "Batches", help: "Product batches you recorded: manufacturer, dates, storage and qualification.", run: () => apiClient.exportOrganisationCsv("batches", true) },
  { key: "logistics", label: "Logistics and CO2", help: "Distance, CO2e and efficiency score for each of your project lines.", run: () => apiClient.exportOrganisationCsv("logistics", true) },
  { key: "certifications", label: "Certifications", help: "Stakeholder certificates, with issuer, dates and status.", run: () => apiClient.exportOrganisationCsv("certifications", true) },
  { key: "evidence", label: "Quality evidence", help: "Evidence records logged against your quality standards.", run: () => apiClient.exportOrganisationCsv("evidence", true) },
  { key: "risks", label: "Risk register", help: "Risks logged against stakeholders, projects and batches.", run: () => apiClient.exportOrganisationCsv("risks", true) },
  { key: "lines", label: "Project lines", help: "Product lines on your projects with origin, supplier and delivery dates (no prices).", run: () => apiClient.exportOrganisationCsv("project-lines", true) },
];

export default function ExportsPage() {
  const [caps, setCaps] = useState<ExportCapabilities | null>(null);
  const [requests, setRequests] = useState<DataExportRequestSummary[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [scope, setScope] = useState<"CATALOGUE" | "REGISTRATIONS">("CATALOGUE");
  const [reason, setReason] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    apiClient.getExportCapabilities().then(setCaps).catch(() => undefined);
    apiClient.listExportRequests().then(setRequests).catch((e) => setErr(e instanceof Error ? e.message : "Could not load requests."));
  }, []);
  useEffect(load, [load]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setErr(null); setMsg(null);
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(null); }
  };

  const card = { border: "1px solid var(--u-border)", borderRadius: 10, padding: 14, background: "var(--u-surface)" } as const;
  const admin = caps?.wholeCatalogue === true;

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 24, margin: 0 }}>Data exports</h1>
      <p style={{ fontSize: 13, color: "var(--u-ink-secondary)", maxWidth: 760 }}>
        You can always export what your organisation added. The shared Universe catalogue is a platform asset, so a wider export needs a global admin&rsquo;s approval. Every export is recorded in your audit trail.
      </p>
      {err && <p style={{ color: "var(--u-status-critical-text)" }}>{err}</p>}
      {msg && <p style={{ color: "var(--u-status-good-text)", fontWeight: 600, fontSize: 13 }}>{msg}</p>}

      <h2 style={{ fontFamily: "var(--u-font-display)", fontSize: 17, marginTop: 24 }}>{admin ? "Export directly (global admin)" : "Your organisation’s data"}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 12 }}>
        {OWN.map((o) => (
          <div key={o.key} style={card}>
            <strong style={{ fontSize: 14 }}>{admin && (o.key === "products" || o.key === "registrations") ? (o.key === "products" ? "Whole catalogue" : "All registrations") : o.label}</strong>
            <p style={{ fontSize: 12.5, color: "var(--u-ink-secondary)", margin: "6px 0 10px" }}>{admin && o.key === "products" ? "Every catalogue entry (global admin)." : admin && o.key === "registrations" ? "Every shared registration (global admin)." : o.help}</p>
            <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => run(o.key, async () => { const f = await o.run(); saveExport(f); setMsg(`${f.rowCount.toLocaleString("en-GB")} rows exported${f.truncated ? " (stopped at the row limit)" : ""}.`); })}>
              <DownloadIcon size={14} /> {busy === o.key ? "Preparing…" : "Download CSV"}
            </Button>
          </div>
        ))}
      </div>

      {!admin && (
        <>
          <CollapsibleSection title="Request a wider export" level={2} bare>
          <div style={{ ...card, maxWidth: 720 }}>
            <p style={{ fontSize: 12.5, color: "var(--u-ink-secondary)", marginTop: 0 }}>Ask a global admin to release part of the shared catalogue to you. Say what you need and why; if approved you can download it once within seven days.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <select value={scope} onChange={(e) => setScope(e.target.value as "CATALOGUE" | "REGISTRATIONS")} aria-label="What to export" style={{ padding: "6px 8px" }}>
                <option value="CATALOGUE">Product catalogue</option>
                <option value="REGISTRATIONS">Regulatory registrations</option>
              </select>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name contains (optional)" aria-label="Name contains" style={{ padding: "6px 8px" }} />
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category (optional)" aria-label="Category" style={{ padding: "6px 8px" }} />
            </div>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Why do you need this export?" aria-label="Reason" style={{ width: "100%", padding: 8, boxSizing: "border-box" }} />
            <div style={{ marginTop: 10 }}>
              <Button variant="primary" size="sm" disabled={busy !== null || reason.trim().length < 10} onClick={() => run("request", async () => {
                await apiClient.createExportRequest({ scope, reason: reason.trim(), filters: { ...(q ? { q } : {}), ...(category && scope === "CATALOGUE" ? { category } : {}) } });
                setReason(""); setQ(""); setCategory(""); setMsg("Request sent to the global admins."); load();
              })}>Send request</Button>
            </div>
          </div>
        </CollapsibleSection></>
      )}

      <h2 style={{ fontFamily: "var(--u-font-display)", fontSize: 17, marginTop: 28 }}>{admin ? "Requests from organisations" : "Your requests"}</h2>
      {requests.length === 0 ? <p style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>No requests yet.</p> : (
        <div style={{ display: "grid", gap: 10 }}>
          {requests.map((r) => (
            <div key={r.id} style={card}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <strong style={{ fontSize: 14 }}>{scopeLabel(r.scope)}</strong>
                <Pill tone={tone(r.status)}>{r.status.toLowerCase()}</Pill>
                <span style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>{r.organizationName} · {r.requestedByName} · {d(r.createdAt)}</span>
              </div>
              {Object.keys(r.filters).length > 0 && <p style={{ fontSize: 12, margin: "6px 0 0", color: "var(--u-ink-secondary)" }}>Filters: {Object.entries(r.filters).map(([k, v]) => `${k}: ${String(v)}`).join(", ")}</p>}
              <p style={{ fontSize: 13, margin: "6px 0 0" }}>{r.reason}</p>
              {r.decidedAt && <p style={{ fontSize: 12, margin: "6px 0 0", color: "var(--u-ink-secondary)" }}>Decided by {r.decidedByName ?? "a global admin"} on {d(r.decidedAt)}{r.decisionNote ? `: ${r.decisionNote}` : ""}{r.status === "APPROVED" ? ` · download before ${d(r.approvedUntil)}` : ""}{r.downloadedAt ? ` · downloaded ${d(r.downloadedAt)} (${r.rowCount ?? 0} rows)` : ""}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                {r.canDownload && (
                  <Button variant="primary" size="sm" disabled={busy !== null} onClick={() => run(r.id, async () => { const f = await apiClient.downloadExportRequest(r.id); saveExport(f); setMsg(`${f.rowCount.toLocaleString("en-GB")} rows downloaded. This approval is now used.`); load(); })}>
                    <DownloadIcon size={14} /> Download (one time)
                  </Button>
                )}
                {admin && r.status === "PENDING" && (
                  <>
                    <input value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} placeholder="Note (required to reject)" aria-label="Decision note" style={{ padding: "6px 8px", minWidth: 220 }} />
                    <Button variant="primary" size="sm" disabled={busy !== null} onClick={() => run(r.id, async () => { await apiClient.decideExportRequest(r.id, { approve: true, note: notes[r.id] }); load(); })}>Approve</Button>
                    <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => run(r.id, async () => { await apiClient.decideExportRequest(r.id, { approve: false, note: notes[r.id] }); load(); })}>Reject</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
