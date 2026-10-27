"use client";
import { useState } from "react";
import type { CrmRelationshipRow, CrmTag } from "@universe/types";
import { Button, Pill } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { inputStyle } from "../lib/ui";

/** Tags on one relationship: shown to everyone, changed by CRM managers. A new name can be typed to create the tag and apply it in one go. */
export function Tags({ r, allTags, canManage, onChanged, onError }: { r: CrmRelationshipRow; allTags: CrmTag[]; canManage: boolean; onChanged: (msg: string) => void; onError: (m: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState("");
  const [fresh, setFresh] = useState("");
  const free = allTags.filter((t) => !r.tags.some((x) => x.id === t.id));
  const run = async (fn: () => Promise<unknown>, msg: string) => { setBusy(true); onError(null); try { await fn(); onChanged(msg); setPick(""); setFresh(""); } catch (e) { onError(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); } };
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {r.tags.length === 0 && <span style={{ color: "var(--u-ink-secondary)" }}>No tags yet.</span>}
        {r.tags.map((t) => (
          <span key={t.id} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
            <Pill tone="brand">{t.name}</Pill>
            {canManage && <button type="button" disabled={busy} aria-label={`Remove tag ${t.name}`} onClick={() => run(() => apiClient.removeCrmTag(r.id, t.id), `tag ${t.name} removed.`)} style={{ all: "unset", cursor: "pointer", padding: "0 4px", fontSize: 14, lineHeight: 1, color: "var(--u-ink-secondary)" }}>×</button>}
          </span>
        ))}
      </div>
      {canManage && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          {free.length > 0 && (
            <>
              <select className="u-native-select" aria-label="Add an existing tag" style={{ ...inputStyle, width: "auto", minWidth: 170 }} value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">Add a tag…</option>{free.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <Button size="sm" variant="secondary" disabled={busy || !pick} onClick={() => run(() => apiClient.applyCrmTag(r.id, pick), "tag added.")}>Add</Button>
            </>
          )}
          <input aria-label="Name for a new tag" placeholder="Or create a new tag" maxLength={60} style={{ ...inputStyle, width: "auto", minWidth: 190 }} value={fresh} onChange={(e) => setFresh(e.target.value)} />
          <Button size="sm" variant="secondary" disabled={busy || !fresh.trim()} onClick={() => run(async () => { const t = await apiClient.createCrmTag(fresh); await apiClient.applyCrmTag(r.id, t.id); }, "tag created and added.")}>Create and add</Button>
        </div>
      )}
    </div>
  );
}
