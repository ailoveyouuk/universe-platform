"use client";

import { useState } from "react";
import { CRM_EXPORT_ENTITIES, CRM_EXPORT_LABELS, type CrmExportEntity } from "@universe/types";
import { Button, DownloadIcon } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { saveExport } from "../lib/download";
import { SourceNote } from "./SourceNote";

/** Downloads the organisation's own CRM records as CSV for the stakeholders in the list as filtered right now. Managers only (contacts are personal data). */
export function ExportMenu({ filters, onNote, onError }: { filters: Record<string, string | undefined>; onNote: (m: string) => void; onError: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<CrmExportEntity | null>(null);
  const run = async (e: CrmExportEntity) => {
    setBusy(e); onError("");
    try { const f = await apiClient.crmExport(e, filters); saveExport(f); onNote(`${f.rowCount.toLocaleString("en-GB")} row${f.rowCount === 1 ? "" : "s"} downloaded${f.truncated ? " (the file stops at the row limit; narrow the filters to get the rest)" : ""}. The download is recorded in the audit log.`); setOpen(false); }
    catch (err) { onError(err instanceof Error ? err.message : "The export failed."); }
    finally { setBusy(null); }
  };
  return (
    <div style={{ position: "relative" }}>
      <Button variant="secondary" size="sm" icon={<DownloadIcon size={15} />} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true">Export</Button>
      {open && (
        <div role="group" aria-label="Choose what to export" style={{ position: "absolute", right: 0, zIndex: 20, marginTop: 6, width: "min(380px, 90vw)", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", backgroundColor: "var(--u-surface-raised)", boxShadow: "0 8px 24px rgba(0,0,0,.18)", padding: 10, display: "grid", gap: 6 }}>
          <p style={{ margin: "2px 4px 4px", fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Covers the stakeholders in the list as filtered now. Your own organisation's data only.</p>
          <SourceNote keys={["export"]} />
          {CRM_EXPORT_ENTITIES.map((e) => (
            <button key={e} type="button" className="u-touch" disabled={busy !== null} onClick={() => void run(e)} style={{ textAlign: "left", padding: "8px 10px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", background: "var(--u-surface)", color: "var(--u-ink)", font: "inherit", cursor: busy ? "wait" : "pointer" }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{busy === e ? "Preparing… " : ""}{CRM_EXPORT_LABELS[e].label}</span>
              <span style={{ display: "block", fontSize: 12.5, color: "var(--u-ink-secondary)" }}>{CRM_EXPORT_LABELS[e].help}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
