"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ProductFamilyListResult } from "@universe/types";
import { Button, Pill, SearchIcon } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { useCurrentUser } from "../../lib/AuthContext";

/** Product families (step 3b, 2026-10-18): the generic product above its pack-size / strength variants. */
export default function FamiliesPage() {
  const me = useCurrentUser();
  const isStaff = (me?.platformStaffRole ?? "NONE") !== "NONE";
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ProductFamilyListResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", brand: "", inn: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setData(null);
    apiClient.listProductFamilies({ search: q, page, pageSize: 25 }).then(setData).catch((e) => setErr(e instanceof Error ? e.message : "Could not load families."));
  }, [q, page]);

  async function create() {
    setSaving(true); setErr(null);
    try {
      const f = await apiClient.createProductFamily({ name: form.name.trim(), category: form.category.trim(), brand: form.brand.trim() || undefined, inn: form.inn.trim() || undefined });
      window.location.href = `/families/detail?id=${f.id}`;
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not create the family."); setSaving(false); }
  }
  const input = { padding: "8px 10px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", font: "inherit", fontSize: 13.5, minWidth: 0 } as const;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 24, margin: 0 }}>Product families</h1>
          <p style={{ fontSize: 13, color: "var(--u-ink-secondary)", margin: "6px 0 0" }}>A family is the generic product; its variants are the strengths and pack sizes. Registrations and documents held by a family apply to every variant.</p>
        </div>
        {isStaff && !creating && <Button variant="primary" size="sm" onClick={() => setCreating(true)}>New family</Button>}
      </div>

      {creating && (
        <div style={{ marginTop: 16, padding: 14, border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))" }}>
          <input style={input} placeholder="Family name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input style={input} placeholder="Category *" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input style={input} placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <input style={input} placeholder="INN (generic name)" value={form.inn} onChange={(e) => setForm({ ...form, inn: e.target.value })} />
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="primary" size="sm" disabled={saving || !form.name.trim() || !form.category.trim()} onClick={create}>Create</Button>
            <Button variant="secondary" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(search); }} style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
        <SearchIcon size={18} />
        <input style={{ ...input, flex: 1, maxWidth: 420 }} placeholder="Search families, brands, INN" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button type="submit" variant="secondary" size="sm">Search</Button>
      </form>
      {err && <p style={{ color: "var(--u-status-critical-text)", fontSize: 13 }}>{err}</p>}

      <div style={{ marginTop: 14, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--u-border)" }}>
              {["Family", "Category", "Brand", "INN", "Variants"].map((h) => <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--u-ink-secondary)" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((f) => (
              <tr key={f.id} style={{ borderBottom: "1px solid var(--u-border)", fontSize: 13.5 }}>
                <td style={{ padding: "8px" }}><Link href={`/families/detail?id=${f.id}`} style={{ fontWeight: 600 }}>{f.name}</Link>{f.isArchived && <> <Pill tone="neutral">Archived</Pill></>}</td>
                <td style={{ padding: "8px" }}>{f.category}</td>
                <td style={{ padding: "8px" }}>{f.brand ?? "—"}</td>
                <td style={{ padding: "8px" }}>{f.inn ?? "—"}</td>
                <td style={{ padding: "8px" }}>{f.variantCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data && !err && <p style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>Loading…</p>}
        {data && data.items.length === 0 && <p style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>No families found.</p>}
      </div>
      {data && data.total > data.pageSize && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, fontSize: 13 }}>
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span>Page {page} of {pages} · {data.total.toLocaleString("en-GB")} families</span>
          <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
