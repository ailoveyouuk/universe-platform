"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ProductChangeEntry, ProductFamilyDetail } from "@universe/types";
import { Button, Pill } from "@universe/ui";
import { apiClient } from "../../../lib/apiClient";
import { useCurrentUser } from "../../../lib/AuthContext";
import { Card, DocumentsTab, Facts, RegulatoryTab, SimpleTable, dateOnly, lifecycleMeta } from "../../products/detail/ProductDetailView";

const TABS = ["Variants", "Regulatory", "Documents", "History"] as const;
type Tab = (typeof TABS)[number];

/** Family page (step 3b, 2026-10-18): the generic product, its variants, and the registrations/documents that apply to all of them. */
export function FamilyDetailView() {
  const id = useSearchParams().get("id");
  const me = useCurrentUser();
  const isStaff = (me?.platformStaffRole ?? "NONE") !== "NONE";
  const [f, setF] = useState<ProductFamilyDetail | null>(null);
  const [tab, setTab] = useState<Tab>("Variants");
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", brand: "", inn: "", regulatoryClass: "", intendedUse: "", description: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    apiClient.getProductFamily(id).then(setF).catch((e) => setErr(e instanceof Error ? e.message : "Could not load the family."));
  }, [id]);
  useEffect(load, [load]);

  if (!id) return <main style={{ padding: 32 }}>No family selected.</main>;
  if (!f) return <main style={{ padding: 32, color: "var(--u-ink-secondary)" }}>{err ?? "Loading…"}</main>;

  function startEdit() {
    if (!f) return;
    setForm({ name: f.name, category: f.category, brand: f.brand ?? "", inn: f.inn ?? "", regulatoryClass: f.regulatoryClass ?? "", intendedUse: f.intendedUse ?? "", description: f.description ?? "" });
    setEditing(true);
  }
  async function save(extra?: { isArchived?: boolean }) {
    if (!f) return;
    setSaving(true); setErr(null);
    try {
      await apiClient.updateProductFamily(f.id, extra ?? {
        name: form.name.trim(), category: form.category.trim(), brand: form.brand.trim(), inn: form.inn.trim(),
        regulatoryClass: form.regulatoryClass.trim(), intendedUse: form.intendedUse.trim(), description: form.description.trim(),
      });
      setEditing(false); load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not save."); }
    finally { setSaving(false); }
  }
  const input = { padding: "8px 10px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", font: "inherit", fontSize: 13.5, minWidth: 0, width: "100%" } as const;
  const tone = f.compliance.status === "BLOCKED" ? "critical" : f.compliance.status === "WARNING" ? "warning" : "good";

  return (
    <main style={{ padding: "28px 32px 48px", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 24, margin: 0, overflowWrap: "anywhere" }}>{f.name}</h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            <Pill tone="neutral">{f.category}</Pill>
            <Pill tone="brand">{f.variantCount} variant{f.variantCount === 1 ? "" : "s"}</Pill>
            {f.isArchived && <Pill tone="neutral">Archived</Pill>}
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--u-ink-secondary)" }}>
            Added by {f.addedByOrganizationName ?? "Universe reference data"} · version {f.version} · updated {dateOnly(f.updatedAt)}
          </p>
        </div>
        {isStaff && !editing && (
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="primary" size="sm" onClick={startEdit}>Edit family</Button>
            <Button variant="secondary" size="sm" disabled={saving} onClick={() => save({ isArchived: !f.isArchived })}>{f.isArchived ? "Restore" : "Archive"}</Button>
          </div>
        )}
      </div>
      {err && <p style={{ color: "var(--u-status-critical)", fontSize: 13 }}>{err}</p>}
      {!isStaff && <p style={{ fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Read-only — families are maintained by platform staff.</p>}

      <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: "var(--u-radius-md)", border: `1px solid var(--u-status-${tone})`, fontSize: 13 }}>
        <strong>Family-level check: {f.compliance.status === "OK" ? "no issues recorded" : f.compliance.status === "WARNING" ? "needs attention" : "blocked"}</strong>
        {f.compliance.reasons.length > 0 && <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{f.compliance.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
        <div style={{ fontSize: 12, color: "var(--u-ink-secondary)", marginTop: 4 }}>This reflects recorded registrations only and is not a regulatory clearance.</div>
      </div>

      {editing ? (
        <div style={{ marginTop: 16, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))" }}>
          {(["name", "category", "brand", "inn", "regulatoryClass", "intendedUse", "description"] as const).map((k) => (
            <label key={k} style={{ fontSize: 12.5, display: "grid", gap: 4 }}>
              {({ name: "Name", category: "Category", brand: "Brand", inn: "INN (generic name)", regulatoryClass: "Regulatory class", intendedUse: "Intended use", description: "Description" })[k]}
              <input style={input} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </label>
          ))}
          <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
            <Button variant="primary" size="sm" disabled={saving || !form.name.trim() || !form.category.trim()} onClick={() => save()}>Save</Button>
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          <Card title="Family details">
            <Facts rows={[["Brand", f.brand], ["INN (generic name)", f.inn], ["Regulatory class", f.regulatoryClass], ["Intended use", f.intendedUse], ["Description", f.description]]} />
          </Card>
        </div>
      )}

      <div role="tablist" style={{ display: "flex", gap: 4, flexWrap: "wrap", borderBottom: "1px solid var(--u-border)", marginTop: 22 }}>
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} style={{
            padding: "9px 14px", background: "none", border: "none", font: "inherit", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
            color: tab === t ? "var(--u-brand-violet)" : "var(--u-ink-secondary)",
            borderBottom: tab === t ? "2px solid var(--u-brand-violet)" : "2px solid transparent", marginBottom: -1,
          }}>{t}</button>
        ))}
      </div>
      <div style={{ marginTop: 18 }}>
        {tab === "Variants" && (
          <Card title="Variants" note="Each variant is a strength and pack size with its own barcodes (GTINs). Open one for its full record.">
            <SimpleTable
              loading={false}
              empty="No variants yet."
              head={["Variant", "Strength", "Pack size", "Form", "GTIN", "Status"]}
              rows={f.variants.map((v) => [
                <Link key={v.id} href={`/products/detail?id=${v.id}`}>{v.variantLabel ?? v.name}</Link>,
                v.strength ?? "—", v.packSize ?? "—", v.dosageForm ?? "—", v.gtin ?? "—",
                <Pill key={`${v.id}s`} tone={lifecycleMeta(v.lifecycleStatus).tone}>{lifecycleMeta(v.lifecycleStatus).label}</Pill>,
              ])}
            />
          </Card>
        )}
        {tab === "Regulatory" && <RegulatoryTab familyId={f.id} />}
        {tab === "Documents" && <DocumentsTab familyId={f.id} />}
        {tab === "History" && <FamilyHistory familyId={f.id} />}
      </div>
    </main>
  );
}

function FamilyHistory({ familyId }: { familyId: string }) {
  const [h, setH] = useState<ProductChangeEntry[] | null>(null);
  useEffect(() => { apiClient.getProductFamilyHistory(familyId).then(setH).catch(() => setH([])); }, [familyId]);
  const grouped = useMemo(() => {
    const m = new Map<string, ProductChangeEntry[]>();
    for (const r of h ?? []) { const k = r.changedAt.slice(0, 19); m.set(k, [...(m.get(k) ?? []), r]); }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [h]);
  return (
    <Card title="Change history" note="Every change to this family: who, when, and the old and new values. Entries are never edited or removed.">
      {h === null ? <p style={{ fontSize: 13 }}>Loading…</p> : grouped.length === 0 ? <p style={{ fontSize: 13, margin: 0 }}>No changes recorded yet.</p> : (
        <div style={{ display: "grid", gap: 14 }}>
          {grouped.map(([v, rows]) => (
            <div key={v} style={{ borderLeft: "3px solid var(--u-brand-violet)", paddingLeft: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{new Date(rows[0].changedAt).toLocaleString("en-GB")} <span style={{ fontWeight: 500, color: "var(--u-ink-secondary)" }}>· {rows[0].changedByName ?? "System"}</span></div>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13 }}>
                {rows.map((r) => <li key={r.id}><strong>{r.fieldName}</strong>: <span style={{ color: "var(--u-ink-secondary)" }}>{r.oldValue || "—"}</span> → {r.newValue || "—"}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
