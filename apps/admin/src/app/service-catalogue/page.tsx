"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SERVICE_CATEGORIES, SERVICE_PRICING_BASES, type ServiceCatalogueRow } from "@universe/types";
import { AlertIcon, Button, CheckCircleIcon, LockIcon, Pill, PartnersIcon, SearchInput, Select, StatTile, StatTileGrid } from "@universe/ui";
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
  const [usage, setUsage] = useState<Record<string, { projectLines: number; tenderLines: number; organisations: number }> | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tile, setTile] = useState<"" | "inuse" | "unused" | "off">("");
  const [filter, setFilter] = useState("");
  const [group, setGroup] = useState("");
  const [kind, setKind] = useState("");
  const [basisF, setBasisF] = useState("");
  const load = useCallback(() => { apiClient.serviceCatalogueAll().then(setRows).catch((e) => { setRows([]); setErr(e instanceof Error ? e.message : "Could not load the catalogue."); }); }, []);
  useEffect(() => { if (staff) { load(); apiClient.serviceCatalogueUsage().then(setUsage).catch(() => setUsage({})); } }, [staff, load]);
  const run = async (fn: () => Promise<unknown>, done: string) => { setBusy(true); setErr(null); setOk(null); try { await fn(); setOk(done); setEdit(null); setDraft(null); load(); } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(false); } };
  const used = (code: string) => { const u = usage?.[code]; return u ? u.projectLines + u.tenderLines : 0; };
  const counts = useMemo(() => {
    const all = rows ?? [];
    return { total: all.length, inUse: all.filter((r) => r.active && used(r.code) > 0).length, unused: all.filter((r) => r.active && used(r.code) === 0).length, off: all.filter((r) => !r.active).length };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, usage]);
  const groups = useMemo(() => [...new Set(SERVICE_CATEGORIES.map((c) => c.group))], []);
  const kinds = useMemo(() => SERVICE_CATEGORIES.filter((c) => !group || c.group === group), [group]);
  const shown = useMemo(() => (rows ?? []).filter((r) => {
    const cat = SERVICE_CATEGORIES.find((c) => c.code === r.category);
    if (tile === "inuse" && !(r.active && used(r.code) > 0)) return false;
    if (tile === "unused" && !(r.active && used(r.code) === 0)) return false;
    if (tile === "off" && r.active) return false;
    if (group && cat?.group !== group) return false;
    if (kind && r.category !== kind) return false;
    if (basisF && r.basis !== basisF) return false;
    return !filter.trim() || `${r.name} ${r.code} ${r.description} ${r.unit}`.toLowerCase().includes(filter.trim().toLowerCase());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [rows, filter, tile, group, kind, basisF, usage]);
  const pick = (t: "inuse" | "unused" | "off") => setTile((c) => (c === t ? "" : t));

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
      <StatTileGrid style={{ margin: "20px 0" }}>
        <StatTile label="Services" value={rows ? counts.total : undefined} icon={<PartnersIcon size={18} />} tone="brand" onClick={() => setTile("")} active={tile === ""} />
        <StatTile label="In use" value={rows && usage ? counts.inUse : undefined} icon={<CheckCircleIcon size={18} />} tone="good" onClick={() => pick("inuse")} active={tile === "inuse"} />
        <StatTile label="Not yet used" value={rows && usage ? counts.unused : undefined} icon={<AlertIcon size={18} />} tone="warning" onClick={() => pick("unused")} active={tile === "unused"} />
        <StatTile label="Switched off" value={rows ? counts.off : undefined} icon={<LockIcon size={18} />} tone="neutral" onClick={() => pick("off")} active={tile === "off"} />
      </StatTileGrid>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", margin: "12px 0" }}>
        <div style={{ minWidth: 220, flex: "1 1 220px", maxWidth: 320 }}><SearchInput value={filter} onChange={setFilter} placeholder="Search name, code, description…" /></div>
        <div style={{ minWidth: 200 }}><Select value={group} onChange={(v) => { setGroup(v); setKind(""); }} allLabel="All groups" options={groups.map((g) => ({ value: g, label: g }))} ariaLabel="Filter by group" /></div>
        <div style={{ minWidth: 220 }}><Select value={kind} onChange={setKind} allLabel="All kinds of service" options={kinds.map((c) => ({ value: c.code, label: c.label }))} ariaLabel="Filter by kind of service" /></div>
        <div style={{ minWidth: 180 }}><Select value={basisF} onChange={setBasisF} allLabel="Any pricing basis" options={SERVICE_PRICING_BASES.map((b) => ({ value: b.code, label: b.label }))} ariaLabel="Filter by pricing basis" /></div>
        {!draft && <Button size="sm" variant="primary" onClick={() => { setEdit(null); setDraft({ ...BLANK }); }}>Add a service</Button>}
        <span style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>{rows ? `${shown.length} of ${rows.length}` : ""}</span>
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
        {shown.map((r) => {
          const cat = SERVICE_CATEGORIES.find((c) => c.code === r.category);
          const open = expanded === r.code;
          const u = usage?.[r.code];
          return (
            <div key={r.code} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", fontSize: 13.5, opacity: r.active ? 1 : 0.85, background: "var(--u-surface)" }}>
              <button type="button" aria-expanded={open} aria-controls={`svc-${r.code}`} onClick={() => setExpanded(open ? null : r.code)} style={{ all: "unset", boxSizing: "border-box", width: "100%", cursor: "pointer", padding: "10px 14px", display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center", color: "var(--u-ink)" }}>
                <span><span aria-hidden="true" style={{ display: "inline-block", width: 14 }}>{open ? "▾" : "▸"}</span> <strong>{r.name}</strong> <span style={{ color: "var(--u-ink-secondary)" }}>· {cat?.label}</span></span>
                <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <Pill tone="neutral">{basisLabel(r.basis)} · per {r.unit}</Pill>
                  {usage && <Pill tone={used(r.code) > 0 ? "good" : "neutral"}>{used(r.code) > 0 ? `Used ${used(r.code)}×` : "Not yet used"}</Pill>}
                  {!r.active && <Pill tone="warning">Switched off</Pill>}
                </span>
              </button>
              {open && (
                <div id={`svc-${r.code}`} style={{ padding: "4px 14px 12px", borderTop: "1px solid var(--u-border)" }}>
                  {edit?.code === r.code ? (
                    <>
                      <div style={{ marginTop: 10 }}>{form(edit, (n) => setEdit({ ...r, ...n, active: edit.active }), false)}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <Button size="sm" variant="primary" disabled={busy} onClick={() => run(() => apiClient.updateServiceCatalogueEntry(r.code, { name: edit.name, basis: edit.basis as ServiceCatalogueRow["basis"], unit: edit.unit, description: edit.description }), "Service saved.")}>Save</Button>
                        <Button size="sm" variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: "10px 0 0" }}>{r.description}</p>
                      <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "4px 14px", margin: "10px 0 0" }}>
                        <dt style={{ color: "var(--u-ink-secondary)" }}>Code</dt><dd style={{ margin: 0 }}>{r.code}</dd>
                        <dt style={{ color: "var(--u-ink-secondary)" }}>Group</dt><dd style={{ margin: 0 }}>{cat?.group}</dd>
                        <dt style={{ color: "var(--u-ink-secondary)" }}>Kind of service</dt><dd style={{ margin: 0 }}>{cat?.label}</dd>
                        <dt style={{ color: "var(--u-ink-secondary)" }}>Usually priced</dt><dd style={{ margin: 0 }}>{basisLabel(r.basis)}, per {r.unit}. Other usual bases for this kind: {(cat?.bases ?? []).filter((b) => b !== r.basis).map(basisLabel).join(", ") || "none"}.</dd>
                        <dt style={{ color: "var(--u-ink-secondary)" }}>Where it is used</dt>
                        <dd style={{ margin: 0 }}>{!usage ? "Loading…" : u ? `${u.projectLines} project line${u.projectLines === 1 ? "" : "s"} and ${u.tenderLines} tender item${u.tenderLines === 1 ? "" : "s"}, across ${u.organisations} organisation${u.organisations === 1 ? "" : "s"}` : "Not used on any project line or tender item yet."}</dd>
                      </dl>
                      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                        <Button size="sm" variant="secondary" onClick={() => { setDraft(null); setEdit(r); }}>Edit</Button>
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => apiClient.updateServiceCatalogueEntry(r.code, { active: !r.active }), r.active ? "Service switched off." : "Service switched on.")}>{r.active ? "Switch off" : "Switch on"}</Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {rows && shown.length === 0 && !err && <p style={{ color: "var(--u-ink-secondary)" }}>No services match.</p>}
      </div>
    </div>
  );
}
