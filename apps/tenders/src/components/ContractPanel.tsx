"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CONTRACT_FILE_KIND_LABELS, CONTRACT_STATUS_LABELS } from "@universe/types";
import type { TenderContractView, TenderContractsForTender } from "@universe/types";
import { Button, Pill, Select } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { VariationsSection } from "./VariationsPanel";
import { EvidenceSection } from "./EvidencePanel";
import { CloseContractForm, PaymentLog, PerformanceCard, QualityLinks } from "./PerformancePanel";
import { Card, ErrorNote, Field, fmtDate, fmtDateTime, inputStyle } from "../lib/ui";

const muted = { color: "var(--u-ink-secondary)" } as const;
const PM_URL = process.env.NEXT_PUBLIC_APP_URL_PROJECT_MANAGEMENT ?? "https://black-island-047de4e0f.5.azurestaticapps.net";
const STATUS_TONE: Record<string, "neutral" | "warning" | "good" | "brand" | "critical"> = { DRAFT: "neutral", AWAITING_SIGNATURE: "warning", ACTIVE: "good", COMPLETED: "brand", TERMINATED: "critical" };
const iso = (d: string) => (d ? new Date(d).toISOString() : undefined);
const dateInput = (v: string | null) => (v ? v.slice(0, 10) : "");

/**
 * The contract for one award, seen by the tender owner (role ISSUER) or the awarded supplier (role SUPPLIER). The server enforces who may do what;
 * this screen only shows the actions each side has. Signing happens outside Universe: the Signature section holds the executed copy.
 */
export function ContractsPanel({ tenderId }: { tenderId: string }) {
  const [data, setData] = useState<TenderContractsForTender | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { apiClient.tenderContracts(tenderId).then(setData).catch((e) => setErr(e instanceof Error ? e.message : "Could not load the contracts.")); }, [tenderId]);
  useEffect(load, [load]);
  const act = async (fn: () => Promise<TenderContractsForTender | unknown>) => {
    setBusy(true); setErr(null);
    try { const r = await fn(); if (r && typeof r === "object" && "contracts" in r) setData(r as TenderContractsForTender); else load(); return true; }
    catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); return false; } finally { setBusy(false); }
  };
  if (!data) return <><ErrorNote message={err} />{!err && <div style={muted}>Loading…</div>}</>;
  const standstill = data.standstillEndsAt && new Date(data.standstillEndsAt).getTime() > Date.now();
  return (
    <>
      <ErrorNote message={err} />
      {data.role === "ISSUER" && data.awardsWithoutContract.length > 0 && (
        <Card title="Awards without a contract">
          {data.awardsWithoutContract.map((a) => (
            <div key={a.awardId} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "6px 0", fontSize: 14 }}>
              <span>{a.supplierName ?? "Supplier"}</span>
              <Button size="sm" disabled={busy} onClick={() => act(() => apiClient.createTenderContract(tenderId, a.awardId))}>Draft contract</Button>
            </div>
          ))}
        </Card>
      )}
      {data.contracts.length === 0 && !(data.role === "ISSUER" && data.awardsWithoutContract.length > 0) && <Card><p style={{ margin: 0, ...muted }}>There is no contract yet.</p></Card>}
      {data.contracts.map((c) => <ContractCard key={c.id} c={c} role={data.role} standstill={!!standstill} openComplaints={data.openComplaints} busy={busy} act={act} setErr={setErr} />)}
    </>
  );
}

function ContractCard({ c, role, standstill, openComplaints, busy, act, setErr }: { c: TenderContractView; role: "ISSUER" | "SUPPLIER"; standstill: boolean; openComplaints: number; busy: boolean; act: (fn: () => Promise<unknown>) => Promise<boolean>; setErr: (m: string | null) => void }) {
  const issuer = role === "ISSUER";
  const draft = c.status === "DRAFT", awaiting = c.status === "AWAITING_SIGNATURE", active = c.status === "ACTIVE", closed = c.status === "COMPLETED" || c.status === "TERMINATED";
  const [f, setF] = useState({ title: c.title, totalValue: c.totalValue != null ? String(c.totalValue) : "", startDate: dateInput(c.startDate), endDate: dateInput(c.endDate), terms: c.terms ?? "" });
  const [ms, setMs] = useState({ title: "", dueDate: "" });
  const [sg, setSg] = useState({ signerName: "", signerRole: "", signedOn: new Date().toISOString().slice(0, 10) });
  const [fileMeta, setFileMeta] = useState({ kind: awaiting || active ? "SIGNED" : "DRAFT", title: "", note: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  // The sensible default file type follows the contract stage: a draft first, then the signed copy.
  useEffect(() => { setFileMeta((m) => ({ ...m, kind: c.status === "DRAFT" ? "DRAFT" : m.kind === "DRAFT" ? "SIGNED" : m.kind })); }, [c.status]);
  const open = async (fid: string) => { try { const r = await apiClient.contractFileUrl(c.id, fid); window.open(r.downloadUrl, "_blank", "noopener"); } catch (e) { setErr(e instanceof Error ? e.message : "Could not open the file."); } };
  const kinds = Object.entries(CONTRACT_FILE_KIND_LABELS).filter(([k]) => (k === "SIGNED" || k === "CERTIFICATE" ? !draft : k === "VARIATION" ? active : true));
  const sigTone = c.signature.status === "EXECUTED" ? "good" : c.signature.status === "NOT_STARTED" ? "neutral" : "warning";

  return (
    <Card title={`${c.reference}: ${issuer ? c.supplierName ?? "Supplier" : c.issuerName ?? "Tender owner"}`} action={<Pill tone={STATUS_TONE[c.status] ?? "neutral"}>{CONTRACT_STATUS_LABELS[c.status] ?? c.status}</Pill>}>
      {/* Terms */}
      {issuer && draft ? (
        <div style={{ display: "grid", gap: 10, maxWidth: 640 }}>
          <Field label="Title"><input style={inputStyle} value={f.title} maxLength={300} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            <Field label={`Total value (${c.currency ?? "currency"})`} hint="Worked out from the winning bid and the award shares."><input type="number" style={inputStyle} value={f.totalValue} onChange={(e) => setF({ ...f, totalValue: e.target.value })} /></Field>
            <Field label="Start date"><input type="date" style={inputStyle} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
            <Field label="End date"><input type="date" style={inputStyle} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></Field>
          </div>
          <Field label="Key terms (summary)" hint="The full agreement is the signed document in the Signature section."><textarea style={{ ...inputStyle, minHeight: 90 }} value={f.terms} onChange={(e) => setF({ ...f, terms: e.target.value })} /></Field>
          <div><Button disabled={busy} variant="secondary" onClick={() => act(() => apiClient.updateTenderContract(c.id, { title: f.title, totalValue: f.totalValue === "" ? undefined : Number(f.totalValue), startDate: iso(f.startDate), endDate: iso(f.endDate), terms: f.terms }))}>Save terms</Button></div>
        </div>
      ) : (
        <div style={{ fontSize: 14, lineHeight: 1.6 }}>
          <div><strong>{c.title}</strong></div>
          <div style={muted}>{c.currency ?? ""} {c.totalValue != null ? c.totalValue.toLocaleString() : "Value not set"} · {c.startDate ? fmtDate(c.startDate) : "No start date"}{c.endDate ? ` to ${fmtDate(c.endDate)}` : ""}</div>
          {c.terms && <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{c.terms}</div>}
        </div>
      )}

      {issuer && draft && (
        <div style={{ marginTop: 12 }}>
          {standstill && <p style={{ margin: "0 0 8px", fontSize: 13, ...muted }}>The standstill period is still running. You can prepare the contract now and send it once the standstill has ended.</p>}
          {openComplaints > 0 && <p style={{ margin: "0 0 8px", fontSize: 13, ...muted }}>There is an unanswered complaint on this tender. Answer it before sending the contract.</p>}
          <Button disabled={busy || standstill || openComplaints > 0} onClick={() => act(() => apiClient.sendTenderContract(c.id))}>Send for signature</Button>
        </div>
      )}
      {!issuer && draft && <p style={{ marginBottom: 0, fontSize: 13, ...muted }}>The tender owner is still preparing this contract. You will be notified when it is ready for signature.</p>}

      {/* Milestones */}
      <h3 style={{ margin: "18px 0 6px", fontSize: 14 }}>Milestones</h3>
      {c.milestones.length === 0 && <div style={{ fontSize: 13.5, ...muted }}>None yet.</div>}
      {c.milestones.map((m) => (
        <div key={m.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "6px 0", borderTop: "1px solid var(--u-border)", fontSize: 14 }}>
          <span>{m.title} <span style={muted}>{m.dueDate ? `due ${fmtDate(m.dueDate)}` : ""}</span></span>
          <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Pill tone={m.status === "DONE" ? "good" : m.status === "MISSED" ? "critical" : "neutral"}>{m.status === "DONE" ? "Done" : m.status === "MISSED" ? "Missed" : "Pending"}</Pill>
            {active && m.status !== "DONE" && <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => apiClient.updateContractMilestone(c.id, m.id, { status: "DONE" }))}>Mark done</Button>}
            {active && issuer && m.status === "PENDING" && <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => apiClient.updateContractMilestone(c.id, m.id, { status: "MISSED" }))}>Mark missed</Button>}
          </span>
        </div>
      ))}
      {issuer && !closed && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 220px" }}><Field label="New milestone"><input style={inputStyle} value={ms.title} maxLength={300} onChange={(e) => setMs({ ...ms, title: e.target.value })} /></Field></div>
          <div><Field label="Due"><input type="date" style={inputStyle} value={ms.dueDate} onChange={(e) => setMs({ ...ms, dueDate: e.target.value })} /></Field></div>
          <Button variant="secondary" disabled={busy || !ms.title.trim()} onClick={async () => { if (await act(() => apiClient.addContractMilestone(c.id, { title: ms.title, dueDate: iso(ms.dueDate) }))) setMs({ title: "", dueDate: "" }); }}>Add</Button>
        </div>
      )}

      {/* Signature section */}
      {!draft && (
        <>
          <h3 style={{ margin: "18px 0 6px", fontSize: 14 }}>Signature <Pill tone={sigTone}>{c.signature.status === "EXECUTED" ? "Executed" : c.signature.status === "PARTLY_SIGNED" ? "Partly complete" : "Awaiting signature"}</Pill></h3>
          <p style={{ margin: "0 0 8px", fontSize: 13, lineHeight: 1.5, ...muted }}>Sign the agreement outside Universe (Adobe Acrobat Sign, DocuSign or equivalent), then upload the signed copy and record who signed for each side. The contract becomes active when a signed copy is on file and both sides have recorded a signatory.{awaiting && c.signature.missing.length > 0 ? ` Still needed: ${c.signature.missing.join("; ")}.` : ""}</p>
          {c.signatories.map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0", fontSize: 14 }}>
              <span>{s.signerName}{s.signerRole ? `, ${s.signerRole}` : ""} <span style={muted}>for {s.party === "ISSUER" ? c.issuerName ?? "the tender owner" : c.supplierName ?? "the supplier"} · signed {fmtDate(s.signedOn)}</span></span>
              {awaiting && s.own && <button type="button" onClick={() => act(() => apiClient.removeContractSignatory(c.id, s.id))} style={{ border: "none", background: "none", cursor: "pointer", textDecoration: "underline", color: "var(--u-brand)", font: "inherit" }}>Remove</button>}
            </div>
          ))}
          {awaiting && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginTop: 6 }}>
              <div style={{ flex: "1 1 160px" }}><Field label={`Signatory for ${issuer ? "your organisation" : "your organisation"}`}><input style={inputStyle} value={sg.signerName} maxLength={200} onChange={(e) => setSg({ ...sg, signerName: e.target.value })} placeholder="Full name" aria-label="Full name" /></Field></div>
              <div style={{ flex: "1 1 140px" }}><Field label="Role"><input style={inputStyle} value={sg.signerRole} maxLength={200} onChange={(e) => setSg({ ...sg, signerRole: e.target.value })} /></Field></div>
              <div><Field label="Signed on"><input type="date" style={inputStyle} value={sg.signedOn} onChange={(e) => setSg({ ...sg, signedOn: e.target.value })} /></Field></div>
              <Button variant="secondary" disabled={busy || !sg.signerName.trim() || !sg.signedOn} onClick={async () => { if (await act(() => apiClient.addContractSignatory(c.id, { signerName: sg.signerName, signerRole: sg.signerRole || undefined, signedOn: iso(sg.signedOn)! }))) setSg({ ...sg, signerName: "", signerRole: "" }); }}>Record signatory</Button>
            </div>
          )}
        </>
      )}

      {(active || c.variations.length > 0) && <VariationsSection c={c} busy={busy} act={act} />}

      <EvidenceSection c={c} busy={busy} act={act} setErr={setErr} />

      {/* Files */}
      <h3 style={{ margin: "18px 0 6px", fontSize: 14 }}>Files</h3>
      {c.files.length === 0 && <div style={{ fontSize: 13.5, ...muted }}>None yet.</div>}
      {c.files.map((x) => (
        <div key={x.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "6px 0", borderTop: "1px solid var(--u-border)", fontSize: 14 }}>
          <span><strong>{x.title}</strong> <Pill tone={x.kind === "SIGNED" ? "good" : "neutral"}>{CONTRACT_FILE_KIND_LABELS[x.kind] ?? x.kind}</Pill> <Pill tone="brand">Version {x.version}</Pill><div style={{ fontSize: 13, ...muted }}>{x.fileName} · {x.uploadedBy ?? ""} · {fmtDateTime(x.uploadedAt, null)}{x.note ? ` · ${x.note}` : ""}</div></span>
          <Button size="sm" variant="secondary" onClick={() => open(x.id)}>Open</Button>
        </div>
      ))}
      {!closed && (
        <div style={{ display: "grid", gap: 8, marginTop: 10, maxWidth: 640 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
            <Field label="Type"><Select ariaLabel="File type" value={fileMeta.kind} onChange={(v) => setFileMeta({ ...fileMeta, kind: v })} options={kinds.map(([value, label]) => ({ value, label }))} /></Field>
            <Field label="Title"><input style={inputStyle} value={fileMeta.title} maxLength={300} onChange={(e) => setFileMeta({ ...fileMeta, title: e.target.value })} /></Field>
          </div>
          <Field label="Note (optional)"><input style={inputStyle} value={fileMeta.note} maxLength={1000} onChange={(e) => setFileMeta({ ...fileMeta, note: e.target.value })} /></Field>
          <Field label="File"><input ref={fileRef} type="file" style={inputStyle} /></Field>
          <div><Button variant="secondary" disabled={busy} onClick={async () => {
            const file = fileRef.current?.files?.[0]; if (!file) { setErr("Choose a file first."); return; }
            if (await act(() => apiClient.uploadContractFile(c.id, file, { kind: fileMeta.kind, title: fileMeta.title.trim() || file.name, note: fileMeta.note.trim() || undefined }))) { setFileMeta({ ...fileMeta, title: "", note: "" }); if (fileRef.current) fileRef.current.value = ""; }
          }}>{busy ? "Working…" : "Upload file"}</Button></div>
        </div>
      )}

      {/* Handover and closure */}
      {active && !issuer && (
        <div style={{ marginTop: 18 }}>
          {c.supplierProjectId
            ? <a href={`${PM_URL}/projects/detail?id=${c.supplierProjectId}`} style={{ fontSize: 14 }}>Open your delivery project in Project Management</a>
            : <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}><Button disabled={busy} onClick={() => act(async () => { const r = await apiClient.createContractProject(c.id); window.open(`${PM_URL}/projects/detail?id=${r.projectId}`, "_blank", "noopener"); return undefined; })}>Create my delivery project</Button><span style={{ flex: "1 1 220px", fontSize: 13, ...muted }}>Creates a Project Management project with a line for each item awarded to you.</span></div>}
        </div>
      )}
      {active && issuer && <QualityLinks c={c} busy={busy} act={act} />}
      {active && issuer && <CloseContractForm c={c} busy={busy} act={act} />}
      {closed && <p style={{ marginBottom: 0, fontSize: 14 }}>Closed {c.closedAt ? fmtDate(c.closedAt) : ""}{c.closeNote ? `: ${c.closeNote}` : ""}</p>}
      {c.performance && <PerformanceCard p={c.performance} issuer={issuer} busy={busy} act={act} />}
      {(active || closed) && <PaymentLog c={c} busy={busy} act={act} />}
    </Card>
  );
}
