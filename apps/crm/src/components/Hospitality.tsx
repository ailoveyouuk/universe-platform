"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CRM_HOSPITALITY_CATEGORIES, CRM_HOSPITALITY_CATEGORY_LABELS, CRM_HOSPITALITY_DIRECTIONS, CRM_HOSPITALITY_DIRECTION_LABELS, CRM_HOSPITALITY_STATUSES, CRM_HOSPITALITY_STATUS_LABELS, CURRENCY_OPTIONS,
  type CrmGiftPolicy, type CrmHospitalityCategory, type CrmHospitalityDirection, type CrmHospitalityPage, type CrmHospitalityRecord, type CrmHospitalityStatus, type CrmRelationshipDetail,
} from "@universe/types";
import { Button, CurrencySelect, Pill, Select } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { ErrorNote, Field, fmtDate, inputStyle } from "../lib/ui";

const today = () => new Date().toISOString().slice(0, 10);
export const money = (n: number | null, c: string) => (n === null ? "Not converted" : `${n.toLocaleString("en-GB", { maximumFractionDigits: 2 })} ${c}`);
const statusTone = (s: CrmHospitalityStatus) => (s === "APPROVED" ? "good" : s === "PENDING_APPROVAL" ? "warning" : s === "REJECTED" ? "critical" : "neutral") as "good" | "warning" | "critical" | "neutral";

/** Opens a stored policy or evidence file (or the pasted link) in a new tab. */
export function DocButton({ docId, label }: { docId: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const open = async () => {
    setBusy(true); setErr(null);
    try {
      const { downloadUrl } = await apiClient.crmDocumentDownloadUrl(docId);
      const a = document.createElement("a"); a.href = downloadUrl; a.target = "_blank"; a.rel = "noopener noreferrer"; document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not open the file."); } finally { setBusy(false); }
  };
  return <span><Button size="sm" variant="secondary" disabled={busy} onClick={open}>{busy ? "Opening…" : label}</Button>{err && <span role="alert" style={{ marginLeft: 8, color: "var(--u-status-critical-text)", fontSize: 12.5 }}>{err}</span>}</span>;
}

/** Attach a file or paste a link; stores it as a private document and reports its id. */
export function EvidenceField({ label, hint, docId, onChange }: { label: string; hint?: string; docId: string | null; onChange: (id: string | null, name?: string) => void }) {
  const [name, setName] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [stage, setStage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const upload = async (file: File) => {
    setErr(null);
    try {
      setStage("Uploading…");
      const { uploadUrl, blobName } = await apiClient.crmRequestUpload({ fileName: file.name, contentType: file.type || "application/octet-stream" });
      await apiClient.uploadDocumentFile(uploadUrl, file);
      const doc = await apiClient.crmConfirmUpload({ blobName, fileName: file.name, type: "EVIDENCE", title: file.name, fileSizeBytes: file.size, mimeType: file.type || undefined });
      setName(file.name); onChange(doc.id, file.name);
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not upload the file."); } finally { setStage(null); }
  };
  const saveLink = async () => {
    setErr(null);
    try { setStage("Saving link…"); const doc = await apiClient.crmLinkDocument({ url: link.trim(), title: link.trim().slice(0, 200), type: "EVIDENCE" }); setName(link.trim()); setLink(""); onChange(doc.id, link.trim()); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not save the link. Use a full web address starting with https://"); } finally { setStage(null); }
  };
  return (
    <fieldset style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "8px 12px", margin: 0, display: "grid", gap: 8, minWidth: 0 }}>
      <legend style={{ fontSize: 12.5, fontWeight: 600, padding: "0 4px" }}>{label}</legend>
      {hint && <span style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>{hint}</span>}
      <ErrorNote message={err} />
      {docId ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ fontSize: 13 }}>Attached{name ? `: ${name}` : ""}</span><Button size="sm" variant="secondary" onClick={() => { onChange(null); setName(null); }}>Remove</Button></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <Field label="Upload a file"><input type="file" style={inputStyle} disabled={!!stage} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} /></Field>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 0 }}><Field label="Or paste a link"><input type="url" aria-label="Link to the file" style={inputStyle} placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} disabled={!!stage} /></Field></div>
            <Button size="sm" variant="secondary" type="button" disabled={!!stage || !link.trim()} onClick={saveLink}>Use link</Button>
          </div>
        </div>
      )}
      {stage && <span role="status" style={{ fontSize: 12.5 }}>{stage}</span>}
    </fieldset>
  );
}

function PolicyHint({ policy }: { policy: CrmGiftPolicy | null }) {
  if (!policy) return null;
  return (
    <p style={{ margin: 0, fontSize: 12.5, color: "var(--u-ink-secondary)" }}>
      {policy.confirmed ? "Your policy" : "Default thresholds (your organisation has not set its own yet)"}: gifts over {policy.giftThreshold.toLocaleString()} {policy.currency}, hospitality over {policy.hospitalityThreshold.toLocaleString()} {policy.currency}, more than {policy.annualThreshold.toLocaleString()} {policy.currency} a year with one stakeholder, donations, sponsorship{policy.alwaysApprovePublicOfficial ? " and anything involving a public official" : ""} need a second person to approve.
    </p>
  );
}

export function HospitalityForm({ relId, detail, policy, onDone, onCancel }: { relId: string; detail: CrmRelationshipDetail | null; policy: CrmGiftPolicy | null; onDone: (msg: string) => void; onCancel: () => void }) {
  const [f, setF] = useState({ direction: "RECEIVED" as CrmHospitalityDirection, category: "GIFT" as CrmHospitalityCategory, date: today(), description: "", reason: "", amount: "", currency: policy?.currency ?? "GBP", contactId: "", person: "", official: false, project: "", info: "" });
  const [doc, setDoc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (policy) setF((x) => (x.amount === "" ? { ...x, currency: policy.currency } : x)); }, [policy]);
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await apiClient.addCrmHospitality(relId, { direction: f.direction, category: f.category, occurredOn: f.date, description: f.description, businessReason: f.reason, amount: f.amount.trim() === "" ? 0 : Number(f.amount), currency: f.currency,
        contactId: f.contactId || null, personName: f.contactId ? null : f.person || null, publicOfficial: f.official, linkedProjectId: f.project || null, evidenceDocumentId: doc, additionalInfo: f.info || null });
      onDone(r.status === "PENDING_APPROVAL" ? "Saved. It needs approval from another person, who has been asked." : "Saved.");
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(); }} aria-label="Record a gift or hospitality" style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 12, display: "grid", gap: 12 }}>
      <ErrorNote message={err} />
      <PolicyHint policy={policy} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <Field label="What happened"><select className="u-native-select" style={inputStyle} value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value as CrmHospitalityDirection })}>{CRM_HOSPITALITY_DIRECTIONS.map((d) => <option key={d} value={d}>{CRM_HOSPITALITY_DIRECTION_LABELS[d]}</option>)}</select></Field>
        <Field label="Category"><select className="u-native-select" style={inputStyle} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as CrmHospitalityCategory })}>{CRM_HOSPITALITY_CATEGORIES.map((c) => <option key={c} value={c}>{CRM_HOSPITALITY_CATEGORY_LABELS[c]}</option>)}</select></Field>
        <Field label="Date"><input type="date" style={inputStyle} max={today()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required /></Field>
        <Field label="Amount" hint="Estimate the value if you do not know it. Use 0 for something with no value."><input type="number" min="0" step="0.01" inputMode="decimal" style={inputStyle} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required /></Field>
        <Field label="Currency"><CurrencySelect value={f.currency} onChange={(c) => setF({ ...f, currency: c || f.currency })} options={CURRENCY_OPTIONS} ariaLabel="Currency" /></Field>
        <Field label="Person involved" hint="Choose a contact, or type a name below.">
          <select className="u-native-select" style={inputStyle} value={f.contactId} onChange={(e) => setF({ ...f, contactId: e.target.value })}><option value="">Someone else or not listed</option>{detail?.contacts?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </Field>
        {!f.contactId && <Field label="Name of the person"><input style={inputStyle} maxLength={150} value={f.person} onChange={(e) => setF({ ...f, person: e.target.value })} /></Field>}
        <Field label="Linked project (optional)"><select className="u-native-select" style={inputStyle} value={f.project} onChange={(e) => setF({ ...f, project: e.target.value })}><option value="">None</option>{detail?.projects?.items.map((p) => <option key={p.id} value={p.id}>{p.referenceNumber} · {p.title}</option>)}</select></Field>
      </div>
      <Field label="Description"><input style={inputStyle} maxLength={500} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} required aria-label="Description" placeholder="For example: box of branded stationery, lunch after the audit" /></Field>
      <Field label="Business reason" hint="Why this was appropriate in the course of business."><input style={inputStyle} maxLength={500} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} required /></Field>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}><input type="checkbox" checked={f.official} onChange={(e) => setF({ ...f, official: e.target.checked })} /> A public official is involved (for example a government, ministry or regulator employee)</label>
      <Field label="Additional information (optional)"><textarea style={{ ...inputStyle, minHeight: 64 }} maxLength={2000} value={f.info} onChange={(e) => setF({ ...f, info: e.target.value })} /></Field>
      <EvidenceField label="Evidence (optional)" hint="A receipt, invitation, email or approval." docId={doc} onChange={(id) => setDoc(id)} />
      <div style={{ display: "flex", gap: 8 }}><Button size="sm" variant="primary" type="submit" disabled={busy || !f.description.trim() || !f.reason.trim()}>{busy ? "Saving…" : "Save record"}</Button><Button size="sm" variant="secondary" type="button" onClick={onCancel}>Cancel</Button></div>
    </form>
  );
}

export function HospitalityItem({ r, showRel, onChanged, onError }: { r: CrmHospitalityRecord; showRel: boolean; onChanged: (msg?: string) => void; onError: (m: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [deciding, setDeciding] = useState<null | "APPROVED" | "REJECTED">(null);
  const [note, setNote] = useState("");
  const run = async (fn: () => Promise<unknown>, msg?: string) => { setBusy(true); onError(null); try { await fn(); setDeciding(null); setNote(""); onChanged(msg); } catch (e) { onError(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); } };
  return (
    <li id={`rec-${r.id}`} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "10px 12px", display: "grid", gap: 5, fontSize: 13.5 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Pill tone={statusTone(r.status)}>{CRM_HOSPITALITY_STATUS_LABELS[r.status]}</Pill>
        <strong>{CRM_HOSPITALITY_DIRECTION_LABELS[r.direction]}: {CRM_HOSPITALITY_CATEGORY_LABELS[r.category].toLowerCase()}</strong>
        {r.publicOfficial && <Pill tone="warning">Public official</Pill>}
        <span style={{ marginLeft: "auto", color: "var(--u-ink-secondary)" }}>{r.amount.toLocaleString("en-GB", { maximumFractionDigits: 2 })} {r.currency}{r.currency !== r.policyCurrency ? ` (${money(r.valueInPolicyCurrency, r.policyCurrency)})` : ""}</span>
      </div>
      <p style={{ margin: 0 }}>{r.description}</p>
      <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>
        {showRel && <><Link href={`/relationships?id=${r.relationshipId}`}>{r.relationshipName}</Link> · </>}
        {fmtDate(r.occurredOn)}{r.personName ? ` · ${r.personName}` : ""}{r.linkedLabel ? ` · ${r.linkedLabel}` : ""}{r.createdByName ? ` · Recorded by ${r.createdByName}` : ""}
      </p>
      <p style={{ margin: 0 }}><strong>Business reason:</strong> {r.businessReason}</p>
      {r.additionalInfo && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{r.additionalInfo}</p>}
      {r.approvalReasons.length > 0 && <ul style={{ margin: 0, paddingLeft: 18 }}>{r.approvalReasons.map((x) => <li key={x}>{x}</li>)}</ul>}
      {r.decidedAt && <p style={{ margin: 0 }}><strong>{r.status === "APPROVED" ? "Approved" : "Not approved"}</strong> by {r.decidedByName ?? "an approver"} on {fmtDate(r.decidedAt)}{r.decisionNote ? `: ${r.decisionNote}` : ""}</p>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {r.evidenceDocumentId && <DocButton docId={r.evidenceDocumentId} label="Open evidence" />}
        {r.canDecide && !deciding && <><Button size="sm" variant="primary" disabled={busy} onClick={() => setDeciding("APPROVED")}>Approve</Button><Button size="sm" variant="secondary" disabled={busy} onClick={() => setDeciding("REJECTED")}>Do not approve</Button></>}
        {r.canEdit && <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => apiClient.updateCrmHospitality(r.id, { archived: true }), "Archived. It stays in the audit log.")}>Archive</Button>}
      </div>
      {deciding && (
        <form onSubmit={(e) => { e.preventDefault(); void run(() => apiClient.decideCrmHospitality(r.id, { decision: deciding, note: note || null }), deciding === "APPROVED" ? "Approved." : "Recorded as not approved."); }} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 260px" }}><Field label={deciding === "APPROVED" ? "Note (optional)" : "Why is it not approved?"}><input style={inputStyle} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} required={deciding === "REJECTED"} autoFocus /></Field></div>
          <Button size="sm" variant="primary" type="submit" disabled={busy || (deciding === "REJECTED" && !note.trim())}>{deciding === "APPROVED" ? "Confirm approval" : "Confirm"}</Button>
          <Button size="sm" variant="secondary" type="button" onClick={() => setDeciding(null)}>Cancel</Button>
        </form>
      )}
    </li>
  );
}

/** A filtered, paged list of records: on a relationship, or across the organisation. */
export function HospitalityList({ relId, canManage, refreshKey, onChanged, focusId }: { relId?: string; canManage: boolean; refreshKey?: number; onChanged?: () => void; focusId?: string | null }) {
  const [status, setStatus] = useState("");
  const [direction, setDirection] = useState("");
  const [category, setCategory] = useState("");
  const [official, setOfficial] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CrmHospitalityPage | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const load = useCallback(() => {
    apiClient.crmHospitality({ status, direction, category, publicOfficial: official ? "true" : undefined, q, page, pageSize: 10 }, relId).then((d) => { setData(d); setErr(null); }).catch((e) => setErr(e instanceof Error ? e.message : "Could not load the records."));
  }, [status, direction, category, official, q, page, relId]);
  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => { if (focusId) document.getElementById(`rec-${focusId}`)?.scrollIntoView({ block: "center" }); }, [focusId, data]);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <ErrorNote message={err} />
      {ok && <p role="status" style={{ margin: 0, color: "var(--u-status-good-text)" }}>{ok}</p>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ minWidth: 170 }}><Select value={status} onChange={(v) => { setStatus(v); setPage(1); }} allLabel="Any status" options={CRM_HOSPITALITY_STATUSES.map((s) => ({ value: s, label: CRM_HOSPITALITY_STATUS_LABELS[s] }))} ariaLabel="Filter by status" /></div>
        <div style={{ minWidth: 170 }}><Select value={direction} onChange={(v) => { setDirection(v); setPage(1); }} allLabel="Given or received" options={CRM_HOSPITALITY_DIRECTIONS.map((s) => ({ value: s, label: CRM_HOSPITALITY_DIRECTION_LABELS[s] }))} ariaLabel="Filter by direction" /></div>
        <div style={{ minWidth: 170 }}><Select value={category} onChange={(v) => { setCategory(v); setPage(1); }} allLabel="Any category" options={CRM_HOSPITALITY_CATEGORIES.map((s) => ({ value: s, label: CRM_HOSPITALITY_CATEGORY_LABELS[s] }))} ariaLabel="Filter by category" /></div>
        <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={official} onChange={(e) => { setOfficial(e.target.checked); setPage(1); }} /> Public officials only</label>
        {!relId && <input type="search" aria-label="Search records" placeholder="Search description, person or stakeholder" style={{ ...inputStyle, width: 260 }} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />}
        <span style={{ fontSize: 13, color: "var(--u-ink-secondary)" }} aria-live="polite">{data ? `${data.total} record${data.total === 1 ? "" : "s"}` : "Loading…"}</span>
      </div>
      {data && data.items.length === 0 && <p style={{ margin: 0, color: "var(--u-ink-secondary)" }}>{relId ? "Nothing recorded yet. Record any gift, hospitality, event or donation given or received, including offers you declined." : "No records match."}</p>}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
        {data?.items.map((r) => <HospitalityItem key={r.id} r={{ ...r, canEdit: r.canEdit && canManage }} showRel={!relId} onError={setErr} onChanged={(m) => { if (m) setOk(m); load(); onChanged?.(); }} />)}
      </ul>
      {data && pages > 1 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>Page {page} of {pages}</span>
          <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

/** Gifts and hospitality tab on a relationship. */
export function Hospitality({ relId, canManage }: { relId: string; canManage: boolean }) {
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<CrmRelationshipDetail | null>(null);
  const [policy, setPolicy] = useState<CrmGiftPolicy | null>(null);
  const [key, setKey] = useState(0);
  const [ok, setOk] = useState<string | null>(null);
  useEffect(() => { if (adding) { if (!detail) apiClient.crmDetail(relId).then(setDetail).catch(() => undefined); if (!policy) apiClient.crmGiftPolicy().then(setPolicy).catch(() => undefined); } }, [adding, detail, policy, relId]);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: 15 }}>Gifts and hospitality</h2>
      <p style={{ margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" }}>Every gift, meal, event, donation or other benefit given to or received from this stakeholder, including offers you declined. Your organisation&apos;s thresholds decide what needs a second person&apos;s approval. <Link href="/compliance">See the policy and all records</Link>.</p>
      {ok && <p role="status" style={{ margin: 0, color: "var(--u-status-good-text)" }}>{ok}</p>}
      {canManage && !adding && <div><Button size="sm" variant="primary" onClick={() => { setAdding(true); setOk(null); }}>Record a gift or hospitality</Button></div>}
      {adding && <HospitalityForm relId={relId} detail={detail} policy={policy} onCancel={() => setAdding(false)} onDone={(m) => { setAdding(false); setOk(m); setKey((k) => k + 1); }} />}
      <HospitalityList relId={relId} canManage={canManage} refreshKey={key} />
    </div>
  );
}
