"use client";

import { useCallback, useEffect, useState } from "react";
import { SCOPE_TAXONOMY } from "@universe/types";
import type { OrganizationCertificationSummary, OrganizationScopeSummary, SaveOrganizationCertificationInput } from "@universe/types";
import { Button, Select } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { Field, FormGrid, Notice, Section, inputStyle } from "./form";

const CERT_TYPES: { value: string; label: string }[] = [
  ["ISO_13485", "ISO 13485 (medical devices QMS)"],
  ["ISO_9001", "ISO 9001 (quality management)"],
  ["ISO_14001", "ISO 14001 (environmental)"],
  ["ISO_17025", "ISO 17025 (testing labs)"],
  ["OTHER_ISO", "Other ISO standard"],
  ["FDA_REGISTRATION", "FDA registration"],
  ["GMP", "GMP certificate"],
  ["GDP", "GDP certificate"],
  ["MIA", "Manufacturer's licence (MIA)"],
  ["WDA", "Wholesale dealer's licence (WDA)"],
  ["EUDAMED_REGISTRATION", "EUDAMED registration"],
  ["CE_MDR_CERTIFICATE", "CE / MDR certificate"],
  ["DEVICE_REGISTRATION", "In-country device registration"],
  ["COMPANY_REGISTRATION", "Company registration"],
  ["VAT_CERTIFICATE", "VAT certificate"],
  ["BUSINESS_INSURANCE", "Business insurance"],
  ["IATA_DGR_CERTIFICATION", "IATA DGR certification"],
  ["AEO_ACCREDITATION", "AEO accreditation"],
  ["OTHER", "Other"],
].map(([value, label]) => ({ value, label }));
const TYPE_LABEL = Object.fromEntries(CERT_TYPES.map((t) => [t.value, t.label]));
const SUB_LABEL = Object.fromEntries(SCOPE_TAXONOMY.flatMap((g) => g.subs.map((s) => [s.id, s.label])));

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  VALID: { label: "Valid", color: "var(--u-success, #1f7a4d)" },
  EXPIRING: { label: "Expiring soon", color: "var(--u-status-warning-text)" },
  EXPIRED: { label: "Expired", color: "var(--u-danger, #b3261e)" },
  NO_EXPIRY: { label: "No expiry", color: "var(--u-ink-secondary)" },
};

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

/** Declared scope of supply (from the shared taxonomy) with what the organisation has actually bid on and won, then its certifications with derived expiry status. */
export function ScopeCertificationsSection({ organizationId }: { organizationId: string }) {
  const [scope, setScope] = useState<OrganizationScopeSummary | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [certs, setCerts] = useState<OrganizationCertificationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scopeMsg, setScopeMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<SaveOrganizationCertificationInput>({ type: "ISO_9001" });

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([apiClient.getOrganizationScope(organizationId), apiClient.listOrganizationCertifications(organizationId)]);
      setScope(s);
      setPicked(new Set(s.declared));
      setCerts(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load scope and certifications.");
      setCerts([]);
    }
  }, [organizationId]);
  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: string) => {
    const next = new Set(picked);
    next.has(id) ? next.delete(id) : next.add(id);
    setPicked(next);
    setScopeMsg(null);
  };
  const dirty = scope ? [...picked].sort().join(",") !== [...scope.declared].sort().join(",") : false;

  async function saveScope() {
    setBusy(true);
    setError(null);
    try {
      setScope(await apiClient.setOrganizationScope(organizationId, [...picked]));
      setScopeMsg("Scope saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save the scope.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(c: OrganizationCertificationSummary | null) {
    setEditing(c ? c.id : "new");
    setForm(
      c
        ? { type: c.type, title: c.title ?? "", reference: c.reference ?? "", issuingBody: c.issuingBody ?? "", issuedOn: day(c.issuedOn), expiresOn: day(c.expiresOn), notes: c.notes ?? "" }
        : { type: "ISO_9001", title: "", reference: "", issuingBody: "", issuedOn: "", expiresOn: "", notes: "" },
    );
  }

  async function saveCert() {
    setBusy(true);
    setError(null);
    const body = { ...form, issuedOn: form.issuedOn || null, expiresOn: form.expiresOn || null };
    try {
      if (editing === "new") await apiClient.addOrganizationCertification(organizationId, body);
      else if (editing) await apiClient.updateOrganizationCertification(organizationId, editing, body);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save the certification.");
    } finally {
      setBusy(false);
    }
  }

  async function archiveCert(id: string) {
    setBusy(true);
    setError(null);
    try {
      await apiClient.archiveOrganizationCertification(organizationId, id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove the certification.");
    } finally {
      setBusy(false);
    }
  }

  const demoById = new Map((scope?.demonstrated ?? []).map((d) => [d.scopeSubId, d]));
  const undeclaredDemonstrated = (scope?.demonstrated ?? []).filter((d) => !picked.has(d.scopeSubId));

  return (
    <>
      <Section title="Scope of supply" hint="The categories this organisation says it supplies. Tick what applies; the figures beside a category show what it has actually bid on and been awarded in Universe.">
        {!scope ? (
          <p>Loading…</p>
        ) : (
          <>
            {SCOPE_TAXONOMY.map((g) => (
              <div key={g.group} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{g.group}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: "6px 16px" }}>
                  {g.subs.map((s) => {
                    const d = demoById.get(s.id);
                    return (
                      <label key={s.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13.5, cursor: "pointer" }}>
                        <input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)} style={{ marginTop: 3 }} />
                        <span>
                          {s.label}
                          {d && (
                            <span style={{ display: "block", fontSize: 12, color: "var(--u-ink-secondary)" }}>
                              {d.bids} bid line{d.bids === 1 ? "" : "s"}, {d.awards} awarded
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            {undeclaredDemonstrated.length > 0 && (
              <Notice tone="info">
                Seen in bids or awards but not declared: {undeclaredDemonstrated.map((d) => SUB_LABEL[d.scopeSubId] ?? d.scopeSubId).join(", ")}.
              </Notice>
            )}
            {scopeMsg && <Notice tone="success">{scopeMsg}</Notice>}
            <Button variant="primary" disabled={busy || !dirty} onClick={saveScope}>{busy ? "Saving…" : "Save scope"}</Button>
          </>
        )}
      </Section>

      <Section
        title="Certifications and accreditations"
        hint="Held at organisation level and reusable across every relationship. Attach the certificate itself as a PDF, image or Word file up to 10 MB; only your organisation can open it. Status is worked out from the expiry date; removed items are archived, not deleted."
        actions={editing ? undefined : <Button variant="secondary" onClick={() => startEdit(null)}>Add certification</Button>}
      >
        {error && <Notice tone="error">{error}</Notice>}
        {editing && (
          <div style={{ marginBottom: 16, padding: 14, border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)" }}>
            <FormGrid>
              <Field label="Type">
                <Select value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={CERT_TYPES} ariaLabel="Certification type" />
              </Field>
              <Field label="Title / scope" hint="e.g. the standard edition, or what it covers.">
                <input style={inputStyle} value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <Field label="Certificate or licence number">
                <input style={inputStyle} value={form.reference ?? ""} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </Field>
              <Field label="Issuing body">
                <input style={inputStyle} value={form.issuingBody ?? ""} onChange={(e) => setForm({ ...form, issuingBody: e.target.value })} />
              </Field>
              <Field label="Issued">
                <input type="date" style={inputStyle} value={form.issuedOn ?? ""} onChange={(e) => setForm({ ...form, issuedOn: e.target.value })} />
              </Field>
              <Field label="Expires" hint="Leave blank if it does not expire.">
                <input type="date" style={inputStyle} value={form.expiresOn ?? ""} onChange={(e) => setForm({ ...form, expiresOn: e.target.value })} />
              </Field>
            </FormGrid>
            <div style={{ marginTop: 12 }}>
              <Field label="Notes">
                <textarea rows={2} style={inputStyle} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button variant="primary" disabled={busy} onClick={saveCert}>{busy ? "Saving…" : "Save"}</Button>
              <Button variant="secondary" disabled={busy} onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}
        {!certs ? (
          <p>Loading…</p>
        ) : certs.length === 0 ? (
          <p style={{ color: "var(--u-ink-secondary)", fontSize: 14 }}>No certifications recorded yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {certs.map((c) => {
              const st = STATUS_STYLE[c.status];
              return (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "10px 12px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)" }}>
                  <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{TYPE_LABEL[c.type] ?? c.type}{c.title ? ` — ${c.title}` : ""}</div>
                    <div style={{ fontSize: 12.5, color: "var(--u-ink-secondary)" }}>
                      {[c.reference && `No. ${c.reference}`, c.issuingBody, c.expiresOn && `expires ${day(c.expiresOn)}`].filter(Boolean).join(" · ") || "No details"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: st.color }}>
                      {st.label}{c.daysToExpiry !== null && c.status !== "EXPIRED" ? ` (${c.daysToExpiry}d)` : ""}
                    </span>
                    <CertFile organizationId={organizationId} cert={c} disabled={busy} onChanged={load} onError={setError} />
                    <Button variant="secondary" disabled={busy} onClick={() => startEdit(c)}>Edit</Button>
                    <Button variant="secondary" disabled={busy} onClick={() => archiveCert(c.id)}>Remove</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}

/** The certificate file for one certification: upload or replace (PDF, image or Word, up to 10 MB), open, remove. */
function CertFile({ organizationId, cert, disabled, onChanged, onError }: { organizationId: string; cert: OrganizationCertificationSummary; disabled: boolean; onChanged: () => void; onError: (m: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return onError("That file is over 10 MB. Please use a smaller file.");
    setBusy(true);
    onError(null);
    try {
      await apiClient.uploadOrganizationCertificationDocument(organizationId, cert.id, file);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  async function open() {
    try {
      const r = await apiClient.organizationCertificationDocumentUrl(organizationId, cert.id);
      window.open(r.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not open the file");
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await apiClient.removeOrganizationCertificationDocument(organizationId, cert.id);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not remove the file");
    } finally {
      setBusy(false);
    }
  }
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      {cert.documentFileName && (
        <>
          <button type="button" onClick={open} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", color: "var(--u-link)", fontFamily: "inherit", fontSize: 13 }} title={cert.documentFileName}>View file</button>
          <button type="button" onClick={remove} disabled={busy || disabled} aria-label="Remove file" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", color: "var(--u-ink-secondary)", fontSize: 13 }}>✕</button>
        </>
      )}
      <label style={{ display: "inline-block", position: "relative" }}>
        <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={pick} disabled={busy || disabled} aria-label={`${cert.documentFileName ? "Replace" : "Attach"} certificate file`} style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }} />
        <span style={{ display: "inline-block", padding: "6px 12px", borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-border)", fontSize: 13, fontWeight: 600, cursor: busy || disabled ? "default" : "pointer", opacity: busy || disabled ? 0.6 : 1 }}>
          {busy ? "Working…" : cert.documentFileName ? "Replace file" : "Attach file"}
        </span>
      </label>
    </span>
  );
}
