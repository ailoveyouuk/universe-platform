"use client";

import { useState } from "react";
import type { OrganisationExportEntity } from "@universe/types";
import { Button, DownloadIcon } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { saveExport } from "../lib/download";

/** Downloads a CSV of the organisation's own records (2026-10-18). Cost figures and financial details are not in these files. */
export function OwnDataExportButton({ entity, label }: { entity: OrganisationExportEntity; label: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Button variant="secondary" size="sm" disabled={busy} onClick={async () => {
        setBusy(true); setErr(null);
        try { saveExport(await apiClient.exportOrganisationCsv(entity, true)); } catch (e) { setErr(e instanceof Error ? e.message : "Export failed."); } finally { setBusy(false); }
      }}>
        <DownloadIcon size={14} /> {busy ? "Preparing…" : label}
      </Button>
      {err && <span style={{ color: "var(--u-status-critical)", fontSize: 12.5 }}>{err}</span>}
    </span>
  );
}
