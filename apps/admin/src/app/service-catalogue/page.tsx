"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SERVICE_CATEGORIES, SERVICE_PRICING_BASES, type ServiceCatalogueRow } from "@universe/types";
import { Button } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { useCurrentUser } from "../../lib/AuthContext";
import { Field, FormGrid, Notice, inputStyle } from "../../components/form";

type Draft = { code: string; category: string; name: string; basis: string; unit: string; description: string };
const BLANK: Draft = { code: "", category: SERVICE_CATEGORIES[0]!.code, name: "", basis: SERVICE_CATEGORIES[0]!.bases[0]!, unit: "", description: "" };
const basisLabel = (b: string) => SERVICE_PRICING_BASES.find((x) => x.code === b)?.label ?? b;

/**
 * Standard services catalogue editor, platform staff only (2026-10-26). Add a service, change its name, unit, description or usual pricing basis,
 * or switch it off. A code and its kind of service never change and nothing is deleted: lines that already carry a code keep working, and a
 * switched-off service simply stops being offered in the pickers.
 */
export default function ServiceCatalogueAdminPage() {
  const me = useCurrentUser();
  const staff = !!me && me.platformStaffRole !== "NONE";
  const [rows, setRows] = useState<ServiceCatalogueRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<(Draft & { active: boolean }) | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [filter, setFilter] = useState("");
  const load = useCallback(() => { apiClient.serviceCatalogueAll().then(setRows).catch((e) => { setRows([]); setErr(e instanceof Error ? e.message : "Could not load the catalogue."); }); }, []);
  useEffect(() => { if (staff) load(); }, [staff, load]);
  const run = async (fn: () => Promise<unknown>, done: string) => { setBusy(true); setErr(null); setOk(null); try { await fn(); setOk(done); setEdit(null); setDraft(null); load(); } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(false); } };
  const shown = useMemo(() => (rows ?? []).filter((r) => !filter.trim() || `${r.name} ${r.code} ${r.description}`.toLowerCase().includes(filter.trim().toLowerCase())), [rows, filter]);

  if (me && !staff) return <div style={{ padding: 32 }}><h1>Services catalogue</h1><p>This page is for platform staff.</p></div>;
  const basesFor = (cat: string) => SERVICE_CATEGORIES.find((c) => c.code === cat)?.bases ?? [];

  const form = (v: Draft, set: (n: Draft) => void, isNew: boolean) => (
    <FormGrid>
      <Field label="Code" hint={isNew ? "Like SVC-TA-ADVISER. Never reused." : "Fixed once created."}><input style={inputStyle} value={v.code} disabled={!isNew} maxLength={40} onChange={(e) => set({ ...v, code: e.target.value.toUpperCase() })} /></Field>
      <Field label="Kind of service" hint={isNew ? undefined : "Fixed once created."}>
        <select className="u-native-select" style={inputStyle} value={v.category} disabled={!isNew} onChange={(e) => set({ ...v, category: e.target.value, basis: basesFor(e.target.value)[0] ?? v.basis })}>
          {SERVICE_CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.group}: {c.label}</option>)}
        </select>
      </Field>
      <Field label="Name"><input style={inputStyle} value={v.name} maxLength={200} onChange={(e) => set({ ...v, name: e.target.value })} /></Field>
      <Field label="Usually priced"><select className="u-native-select" style={inputStyle} value={v.basis} onChange={(e) => set({ ...v, basis: e.target.value })}>{basesFor(v.category).map((b) => <option key={b} value={b}>{basisLabel(b)}</option>)}</select></Field>
      <Field label="One unit is" hint="For example: adviser day, month, inspection."><input style={inputStyle} value={v.unit} maxLength={80} onChange={(e) => set({ ...v, unit: e.target.value })} /></Field>
      <Field label="Description"><textarea style={{ ...inputStyle, minHeight: 64 }} value={v.description} maxLength={1000} onChange={(e) => set({ ...v, description: e.target.value })} /></Field>
    </FormGrid>
  );

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <h1>Services catalogue</h1>
      <p style={{ color: "var(--u-ink-secondary)", fontSize: 13, maxWidth: 720 }}>The standard services offered on project lines and tender items. It names the service and how it is usually priced, never a price. Switch a service off to stop offering it; lines that already use it keep working.</p>
      {err && <Notice tone="error">{err}</Notice>}
      {ok && <Notice tone="success">{ok}</Notice>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "12px 0" }}>
        <input aria-label="Find a service" placeholder="Find a service" style={{ ...inputStyle, maxWidth: 320 }} value={filter} onChange={(e) => setFilter(e.target.value)} />
        {!draft && <Button size="sm" variant="primary" onClick={() => { setEdit(null); setDraft({ ...BLANK }); }}>Add a service</Button>}
      </div>
      {draft && (
        <div style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 14, marginBottom: 12 }}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>New service</h2>
          {form(draft, setDraft, true)}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Button size="sm" variant="primary" disabled={busy || !draft.code || !draft.name.trim() || !draft.unit.trim() || !draft.description.trim()} onClick={() => run(() => apiClient.createServiceCatalogueEntry(draft as Omit<ServiceCatalogueRow, "active">), "Service added.")}>Add service</Button>
            <Button size="sm" variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
          </div>
        </div>
      )}
      {rows === null && <p>Loading…</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.map((r) => (
          <div key={r.code} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "10px 14px", fontSize: 13.5, opacity: r.active ? 1 : 0.75 }}>
            {edit?.code === r.code ? (
              <>
                {form(edit, (n) => setEdit({ ...r, ...n, active: edit.active }), false)}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Button size="sm" variant="primary" disabled={busy} onClick={() => run(() => apiClient.updateServiceCatalogueEntry(r.code, { name: edit.name, basis: edit.basis as ServiceCatalogueRow["basis"], unit: edit.unit, description: edit.description }), "Service saved.")}>Save</Button>
                  <Button size="sm" variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <span><strong>{r.name}</strong> <span style={{ color: "var(--u-ink-secondary)" }}>· {r.code} · {SERVICE_CATEGORIES.find((c) => c.code === r.category)?.label}</span></span>
                  <span>{basisLabel(r.basis)} · per {r.unit}{r.active ? "" : " · SWITCHED OFF"}</span>
                </div>
                <div style={{ marginTop: 4, color: "var(--u-ink-secondary)" }}>{r.description}</div>
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <Button size="sm" variant="secondary" onClick={() => { setDraft(null); setEdit(r); }}>Edit</Button>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => apiClient.updateServiceCatalogueEntry(r.code, { active: !r.active }), r.active ? "Service switched off." : "Service switched on.")}>{r.active ? "Switch off" : "Switch on"}</Button>
                </div>
              </>
            )}
          </div>
        ))}
        {rows && shown.length === 0 && !err && <p style={{ color: "var(--u-ink-secondary)" }}>No services match.</p>}
      </div>
    </div>
  );
}
