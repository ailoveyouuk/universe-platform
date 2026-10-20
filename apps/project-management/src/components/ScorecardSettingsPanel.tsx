"use client";

import { useEffect, useState } from "react";
import { SCORECARD_THRESHOLDS } from "@universe/types";
import type { ScorecardSettings } from "@universe/types";
import { Button } from "@universe/ui";
import { apiClient } from "../lib/apiClient";

const inputStyle = { width: 84, padding: "7px 9px", border: "1px solid var(--u-border)", borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "var(--u-surface, #fff)", color: "var(--u-ink)" } as const;
type Keys = "onTimeGood" | "onTimeWarn" | "inFullGood" | "inFullWarn" | "otifGood" | "otifWarn" | "earlyDays" | "lateDays";

/**
 * The delivery-scoring parameters behind every partner scorecard: when a delivery counts as on time, and the levels at which
 * on-time, in-full and OTIF read as good or as needing attention. Defaults follow USAID GHSC-PSM and Global Fund practice;
 * an organisation can set its own (for example to match a funder's contract). Changes are audited with an optional reason.
 */
export function ScorecardSettingsPanel() {
  const [s, setS] = useState<ScorecardSettings | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<Keys, string> | null>(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const adopt = (v: ScorecardSettings) => { setS(v); setDraft(Object.fromEntries((["onTimeGood", "onTimeWarn", "inFullGood", "inFullWarn", "otifGood", "otifWarn", "earlyDays", "lateDays"] as Keys[]).map((k) => [k, String(v[k])])) as Record<Keys, string>); };
  useEffect(() => { apiClient.getScorecardSettings().then(adopt).catch(() => undefined); }, []);
  if (!s || !draft) return null;

  const run = async (fn: () => Promise<ScorecardSettings>) => {
    setBusy(true); setErr(null);
    try { adopt(await fn()); setReason(""); } catch (e) { setErr(e instanceof Error ? e.message.replace(/^API request failed: \d+ [^—]*— /, "") : "Could not save."); } finally { setBusy(false); }
  };
  const save = () => run(() => apiClient.updateScorecardSettings({ ...Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, Number(v)])), reason: reason.trim() || undefined }));
  const num = (k: Keys) => <input type="number" inputMode="numeric" value={draft[k]} disabled={!s.canEdit} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} style={inputStyle} aria-label={k} />;
  const row = (label: string, good: Keys, warn: Keys) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "6px 0" }}>
      <span style={{ width: 130, fontSize: 13.5, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: "var(--u-ink-secondary)" }}>good at</span>{num(good)}<span style={{ fontSize: 12.5 }}>% or more, needs attention below</span>{num(warn)}<span style={{ fontSize: 12.5 }}>%</span>
    </div>
  );

  return (
    <div style={{ margin: "0 0 14px" }}>
      <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>{open ? "Hide scoring settings" : s.isCustom ? "Scoring settings (customised)" : "Scoring settings"}</Button>
      {open && (
        <div style={{ marginTop: 10, padding: 16, border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", backgroundColor: "var(--u-surface-raised)" }}>
          {row("On-time delivery", "onTimeGood", "onTimeWarn")}
          {row("In-full delivery", "inFullGood", "inFullWarn")}
          {row("OTIF", "otifGood", "otifWarn")}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "6px 0" }}>
            <span style={{ width: 130, fontSize: 13.5, fontWeight: 600 }}>On-time window</span>
            <span style={{ fontSize: 12.5 }}>counts as on time from</span>{num("earlyDays")}<span style={{ fontSize: 12.5 }}>working days early to</span>{num("lateDays")}<span style={{ fontSize: 12.5 }}>working days late</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--u-ink-secondary)", margin: "8px 0" }}>Platform defaults: {SCORECARD_THRESHOLDS.basis}. Public holidays are not counted.</p>
          {s.canEdit ? (
            <>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for the change (optional, recorded)" style={{ ...inputStyle, width: "100%", maxWidth: 420, marginBottom: 10, display: "block" }} />
              {err && <div role="alert" style={{ color: "var(--u-status-critical)", fontSize: 13, marginBottom: 8 }}>{err}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <Button size="sm" variant="primary" disabled={busy} onClick={save}>Save</Button>
                <Button size="sm" variant="secondary" disabled={busy || !s.isCustom} onClick={() => run(() => apiClient.resetScorecardSettings())}>Reset to defaults</Button>
              </div>
            </>
          ) : <div style={{ fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Only quality approvers can change these.</div>}
        </div>
      )}
    </div>
  );
}
