"use client";
import { useCallback, useEffect, useState } from "react";
import type { CrmFilterView, CrmSavedFilter } from "@universe/types";
import { Button } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { inputStyle } from "../lib/ui";

/**
 * Saved filters for a list: pick one to apply it, or save what is on screen under a name. Personal by default; managers can share with the organisation.
 * `current` is the filters now applied (empty values are ignored); `onApply` replaces them.
 */
export function SavedFilters({ view, current, onApply, canShare, onError }: { view: CrmFilterView; current: Record<string, string>; onApply: (f: Record<string, string>) => void; canShare: boolean; onError: (m: string | null) => void }) {
  const [items, setItems] = useState<CrmSavedFilter[]>([]);
  const [sel, setSel] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const load = useCallback(() => { apiClient.crmSavedFilters(view).then(setItems).catch(() => setItems([])); }, [view]);
  useEffect(() => { load(); }, [load]);
  const active = Object.fromEntries(Object.entries(current).filter(([, v]) => v));
  const hasFilters = Object.keys(active).length > 0;
  const chosen = items.find((i) => i.id === sel);
  const run = async (fn: () => Promise<unknown>, done: string) => { setBusy(true); onError(null); try { await fn(); setNote(done); load(); } catch (e) { onError(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); } };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <select className="u-native-select" aria-label="Saved filters" style={{ ...inputStyle, width: "auto", minWidth: 190 }} value={sel}
        onChange={(e) => { const id = e.target.value; setSel(id); setNote(null); const f = items.find((i) => i.id === id); if (f) onApply(f.filters); }}>
        <option value="">Saved filters{items.length ? "" : " (none yet)"}</option>
        {items.map((i) => <option key={i.id} value={i.id}>{i.name}{i.shared ? " · shared" : ""}</option>)}
      </select>
      {chosen && (chosen.mine || canShare) && <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(async () => { await apiClient.updateCrmSavedFilter(chosen.id, { archived: true }); setSel(""); }, `Removed "${chosen.name}".`)}>Remove this saved filter</Button>}
      {!saving && <Button size="sm" variant="secondary" disabled={!hasFilters} onClick={() => { setSaving(true); setNote(null); }}>{hasFilters ? "Save these filters" : "Choose filters to save them"}</Button>}
      {saving && (
        <form onSubmit={(e) => { e.preventDefault(); void run(async () => { const f = await apiClient.createCrmSavedFilter({ view, name, filters: active, shared: canShare && shared }); setSel(f.id); setSaving(false); setName(""); setShared(false); }, "Saved."); }}
          style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input aria-label="Name for this saved filter" placeholder="Name this filter" maxLength={80} required autoFocus style={{ ...inputStyle, width: "auto", minWidth: 190 }} value={name} onChange={(e) => setName(e.target.value)} />
          {canShare && <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />Share with the organisation</label>}
          <Button size="sm" variant="primary" type="submit" disabled={busy || !name.trim()}>Save</Button>
          <Button size="sm" variant="secondary" type="button" onClick={() => setSaving(false)}>Cancel</Button>
        </form>
      )}
      {note && <span role="status" style={{ fontSize: 13, color: "var(--u-status-good-text)" }}>{note}</span>}
    </div>
  );
}
