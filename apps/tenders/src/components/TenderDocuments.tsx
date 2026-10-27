"use client";

import { useRef, useState } from "react";
import { TENDER_DOC_TYPE_LABELS } from "@universe/types";
import type { TenderDocumentRecord } from "@universe/types";
import { Button, Pill, Select } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { Card, ErrorNote, Field, fmtDateTime, inputStyle } from "../lib/ui";

const muted = { color: "var(--u-ink-secondary)" } as const;
const size = (b: number | null) => (b == null ? "" : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Groups versions of the same document: current version first, older ones as history. */
function group(docs: TenderDocumentRecord[]) {
  const map = new Map<string, TenderDocumentRecord[]>();
  for (const d of docs) { const k = d.documentKey ?? d.id; map.set(k, [...(map.get(k) ?? []), d]); }
  return [...map.values()].map((v) => v.sort((a, b) => b.version - a.version));
}

async function open(tenderId: string, docId: string, setErr: (m: string | null) => void) {
  try { const r = await apiClient.tenderDocumentUrl(tenderId, docId); window.open(r.downloadUrl, "_blank", "noopener"); } catch (e) { setErr(e instanceof Error ? e.message : "Could not open the document."); }
}

/** Read-only list for bidders (and the issuer): current versions with their history. */
export function DocumentList({ tenderId, documents, onRemove, onReplace }: { tenderId: string; documents: TenderDocumentRecord[]; onRemove?: (d: TenderDocumentRecord) => void; onReplace?: (d: TenderDocumentRecord) => void }) {
  const [err, setErr] = useState<string | null>(null);
  const groups = group(documents);
  if (groups.length === 0) return <p style={{ margin: 0, ...muted }}>No documents have been attached.</p>;
  return (
    <div>
      <ErrorNote message={err} />
      {groups.map((versions, i) => {
        const cur = versions[0]; const older = versions.slice(1);
        return (
          <div key={cur.documentKey ?? cur.id} style={{ padding: "12px 0", borderTop: i ? "1px solid var(--u-border)" : "none", fontSize: 14, lineHeight: 1.5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <span><strong>{cur.title}</strong> <Pill tone="neutral">{TENDER_DOC_TYPE_LABELS[cur.docType] ?? cur.docType}</Pill> <Pill tone="brand">Version {cur.version}</Pill></span>
              <span style={{ display: "flex", gap: 8 }}>
                <Button size="sm" variant="secondary" onClick={() => open(tenderId, cur.id, setErr)}>Open</Button>
                {onReplace && <Button size="sm" variant="secondary" onClick={() => onReplace(cur)}>Upload new version</Button>}
                {onRemove && <Button size="sm" variant="secondary" onClick={() => onRemove(cur)}>Withdraw</Button>}
              </span>
            </div>
            {cur.description && <div style={muted}>{cur.description}</div>}
            <div style={{ fontSize: 13, ...muted }}>{cur.fileName} {size(cur.fileSizeBytes)} · uploaded {fmtDateTime(cur.uploadedAt, null)}</div>
            {older.length > 0 && (
              <details style={{ marginTop: 6, fontSize: 13 }}>
                <summary style={{ cursor: "pointer", ...muted }}>Earlier versions ({older.length})</summary>
                {older.map((o) => (
                  <div key={o.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0" }}>
                    <span>Version {o.version}: {o.fileName} <span style={muted}>replaced {o.supersededAt ? fmtDateTime(o.supersededAt, null) : ""}</span></span>
                    <button type="button" onClick={() => open(tenderId, o.id, setErr)} style={{ border: "none", background: "none", color: "var(--u-brand)", cursor: "pointer", textDecoration: "underline", font: "inherit" }}>Open</button>
                  </div>
                ))}
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Issuer panel: add documents and upload new versions. */
export function DocumentsPanel({ tenderId, documents, published, onChanged }: { tenderId: string; documents: TenderDocumentRecord[]; published: boolean; onChanged: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ title: "", docType: "SPECIFICATION", description: "" });
  const [replacing, setReplacing] = useState<TenderDocumentRecord | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);

  async function submit() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setErr("Choose a file first."); return; }
    setBusy(true); setErr(null);
    try {
      await apiClient.uploadTenderDocument(tenderId, file, replacing
        ? { title: replacing.title, docType: replacing.docType, description: f.description.trim() || replacing.description || undefined, replacesDocumentId: replacing.id }
        : { title: f.title.trim() || file.name, docType: f.docType, description: f.description.trim() || undefined });
      setF({ title: "", docType: "SPECIFICATION", description: "" }); setReplacing(null); if (fileRef.current) fileRef.current.value = "";
      onChanged();
    } catch (e) { setErr(e instanceof Error ? e.message : "The upload failed."); } finally { setBusy(false); }
  }
  async function withdraw(d: TenderDocumentRecord) {
    if (!window.confirm(`Withdraw "${d.title}"? All its versions are hidden from bidders${published ? ", and participants are told" : ""}.`)) return;
    try { await apiClient.removeTenderDocument(tenderId, d.id); onChanged(); } catch (e) { setErr(e instanceof Error ? e.message : "Could not withdraw the document."); }
  }

  return (
    <>
      <Card title={replacing ? `New version of "${replacing.title}"` : "Add a document"}>
        <ErrorNote message={err} />
        <p style={{ marginTop: 0, fontSize: 13.5, lineHeight: 1.5, ...muted }}>
          {published ? "Changes are recorded on the tender timeline and every participant and invited organisation is notified. " : "Bidders see these once you publish. "}
          Uploading a new version keeps the old one as history so bidders can see what changed. PDF, Office, CSV, text, image, DWG and ZIP files up to 50 MB.
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          {!replacing && <Field label="Title"><input style={inputStyle} value={f.title} maxLength={300} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Technical specification" aria-label="Technical specification" /></Field>}
          {!replacing && <Field label="Type"><Select ariaLabel="Document type" value={f.docType} onChange={(v) => setF({ ...f, docType: v })} options={Object.entries(TENDER_DOC_TYPE_LABELS).map(([value, label]) => ({ value, label }))} /></Field>}
          <Field label={replacing ? "What changed (optional)" : "Description (optional)"}><input style={inputStyle} value={f.description} maxLength={1000} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Field label="File"><input ref={fileRef} type="file" style={inputStyle} /></Field>
          <div style={{ display: "flex", gap: 8 }}>
            <Button disabled={busy} onClick={submit}>{busy ? "Uploading…" : replacing ? "Upload new version" : "Upload document"}</Button>
            {replacing && <Button variant="secondary" disabled={busy} onClick={() => setReplacing(null)}>Cancel</Button>}
          </div>
        </div>
      </Card>
      <Card collapse title={`Documents (${group(documents).length})`}>
        <DocumentList tenderId={tenderId} documents={documents} onReplace={(d) => { setReplacing(d); window.scrollTo({ top: 0, behavior: "smooth" }); }} onRemove={withdraw} />
      </Card>
    </>
  );
}
