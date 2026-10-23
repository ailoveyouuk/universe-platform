"use client";

import { useState } from "react";
import { Button, Pill } from "@universe/ui";
import { Card, inputStyle } from "../lib/ui";

export interface SavedSearchRow { id: string; name: string; alertsEnabled: boolean; summary: string }

/**
 * Saved searches for Find suppliers and Find tenders (2026-10-23): save the current filters under a name, re-apply them, switch in-app alerts on or off,
 * and delete. A search with alerts on tells the organisation when a new supplier joins the network, or a new tender is published, that matches it.
 */
export function SavedSearchesPanel({ title, noun, rows, canSave, onSave, onApply, onToggleAlerts, onDelete }: {
  title: string; noun: string; rows: SavedSearchRow[]; canSave: boolean;
  onSave: (name: string, alertsEnabled: boolean) => Promise<void>; onApply: (id: string) => void;
  onToggleAlerts: (id: string, enabled: boolean) => Promise<void>; onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [alerts, setAlerts] = useState(true);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  return (
    <Card title={title}>
      {rows.length === 0 && <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "var(--u-ink-secondary)" }}>Nothing saved yet. Set some filters, name them below and choose whether to be alerted when a new {noun} matches.</p>}
      {rows.map((s, i) => (
        <div key={s.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "8px 0", borderTop: i ? "1px solid var(--u-border)" : "none" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <button type="button" onClick={() => onApply(s.id)} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", font: "inherit", fontWeight: 600, color: "var(--u-link)" }}>{s.name}</button>
            <div style={{ fontSize: 12.5, color: "var(--u-ink-secondary)" }}>{s.summary || "No filters"}</div>
          </div>
          <button type="button" disabled={busy} onClick={() => run(() => onToggleAlerts(s.id, !s.alertsEnabled))} aria-pressed={s.alertsEnabled} aria-label={`Alerts for ${s.name}`} style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}>
            <Pill tone={s.alertsEnabled ? "good" : "neutral"}>{s.alertsEnabled ? "Alerts on" : "Alerts off"}</Pill>
          </button>
          <button type="button" disabled={busy} aria-label={`Delete ${s.name}`} onClick={() => run(() => onDelete(s.id))} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--u-ink-secondary)" }}>✕</button>
        </div>
      ))}
      {canSave && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: rows.length ? 12 : 0 }}>
          <input aria-label="Name this search" placeholder="Name the current filters to save them" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 220, width: "auto" }} />
          <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13.5 }}>
            <input type="checkbox" checked={alerts} onChange={(e) => setAlerts(e.target.checked)} /> Alert me
          </label>
          <Button variant="primary" disabled={!name.trim() || busy} onClick={() => run(async () => { await onSave(name.trim(), alerts); setName(""); })}>Save search</Button>
        </div>
      )}
    </Card>
  );
}
