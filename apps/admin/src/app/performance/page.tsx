"use client";

import { useCallback, useEffect, useState } from "react";
import type { StaffPerformanceRow } from "@universe/types";
import { Button } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { useCurrentUser } from "../../lib/AuthContext";
import { Notice } from "../../components/form";

const BAND: Record<string, string> = { STRONG: "Strong", SATISFACTORY: "Satisfactory", WATCH: "Watch", AT_RISK: "At risk", NOT_ENOUGH_DATA: "Not enough data" };

/**
 * Tender performance records, platform staff only (2026-10-21). A record is shared by the tender owner and the supplier; staff can withdraw
 * one only for evident error or abuse, with a reason that is written to the tender's audit timeline, and can restore it. Withdrawn records
 * drop out of every aggregate immediately.
 */
export default function PerformanceAdminPage() {
  const me = useCurrentUser();
  const staff = !!me && me.platformStaffRole !== "NONE";
  const [rows, setRows] = useState<StaffPerformanceRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const load = useCallback(() => { apiClient.staffPerformanceRecords().then(setRows).catch((e) => { setRows([]); setErr(e instanceof Error ? e.message : "Could not load the records."); }); }, []);
  useEffect(() => { if (staff) load(); }, [staff, load]);
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); setErr(null); try { await fn(); setOpen(null); setReason(""); load(); } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(false); } };

  if (me && !staff) return <main style={{ padding: 32 }}><h1>Performance records</h1><p>This page is for platform staff.</p></main>;
  return (
    <main style={{ padding: 32, maxWidth: 1100 }}>
      <h1>Performance records</h1>
      <p style={{ color: "var(--u-ink-secondary)", fontSize: 13, maxWidth: 720 }}>Records created when tender contracts close. Withdraw one only for evident error or abuse; the reason goes on the tender&apos;s audit timeline and the record stops counting in supplier aggregates until restored.</p>
      {err && <Notice tone="error">{err}</Notice>}
      {rows === null && <p>Loading…</p>}
      {rows && rows.length === 0 && !err && <p style={{ color: "var(--u-ink-secondary)" }}>No performance records yet.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows?.map((r) => (
          <div key={r.id} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "10px 14px", fontSize: 13.5, opacity: r.withdrawn ? 0.7 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <span><strong>{r.contractReference}</strong> · {r.ownerName} → {r.supplierName} · {r.outcome.toLowerCase()} {new Date(r.closedAt).toLocaleDateString("en-GB")}</span>
              <span>{BAND[r.band] ?? r.band}{r.overallScore !== null ? ` · ${r.overallScore}/100` : ""}{r.disputes ? ` · ${r.disputes} dispute${r.disputes === 1 ? "" : "s"}` : ""}{r.withdrawn ? " · WITHDRAWN" : ""}</span>
            </div>
            {r.withdrawn && <div style={{ marginTop: 4, color: "var(--u-ink-secondary)" }}>Reason: {r.withdrawnReason}</div>}
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {r.withdrawn
                ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => apiClient.restorePerformanceRecord(r.id))}>Restore</Button>
                : open === r.id
                  ? <>
                    <input aria-label="Reason for withdrawing" placeholder="Reason (required, goes on the audit timeline)" maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} style={{ flex: "1 1 320px", padding: 8, border: "1px solid var(--u-border)", borderRadius: 6, font: "inherit", background: "var(--u-surface)", color: "var(--u-ink)" }} />
                    <Button size="sm" variant="secondary" disabled={busy || !reason.trim()} onClick={() => run(() => apiClient.withdrawPerformanceRecord(r.id, reason.trim()))}>Withdraw record</Button>
                    <Button size="sm" variant="secondary" onClick={() => { setOpen(null); setReason(""); }}>Cancel</Button>
                  </>
                  : <Button size="sm" variant="secondary" onClick={() => setOpen(r.id)}>Withdraw…</Button>}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
