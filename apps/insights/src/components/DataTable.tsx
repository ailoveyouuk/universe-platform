"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ALLOW_DOWNLOADS, inputStyle, pill } from "../lib/ui";

/**
 * The one table every Insights lens uses (2026-10-25): search across every column, a drop-down filter on the columns that have a handful of
 * values, sort by any column (click the heading), a column chooser, rows per page, and a CSV download of exactly what is on screen (all rows
 * matching the filters, not just the current page). Its state can be read and set from outside so a view can be saved and restored.
 */
export interface Col<T> {
  key: string;
  header: string;
  /** Plain value used for search, sort, filter and CSV. */
  value: (r: T) => string | number | null;
  /** What is drawn in the cell (defaults to the plain value). */
  render?: (r: T) => ReactNode;
  align?: "right";
  /** Offer a drop-down filter on this column. */
  filter?: boolean;
  /** Not shown until chosen in the column chooser. */
  hiddenByDefault?: boolean;
  /** The first column becomes the row header unless set. */
  rowHeader?: boolean;
}
export interface TableState { q: string; filters: Record<string, string>; sort: { key: string; dir: "asc" | "desc" } | null; hidden: string[]; pageSize: number }
export const emptyTableState = (hidden: string[] = []): TableState => ({ q: "", filters: {}, sort: null, hidden, pageSize: 25 });

const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 12.5, fontWeight: 600, borderBottom: "1px solid var(--u-border)", color: "var(--u-ink)", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "8px 10px", fontSize: 13.5, verticalAlign: "middle" };

const csvCell = (v: string | number | null) => { const s = v === null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export function DataTable<T>({ rows, columns, rowKey, caption, exportName, state, onState, selectedKey, empty, pageSizes = [10, 25, 50, 100] }: {
  rows: T[]; columns: Col<T>[]; rowKey: (r: T) => string; caption: string; exportName: string;
  state?: TableState; onState?: (s: TableState) => void;
  selectedKey?: string; empty?: string; pageSizes?: number[];
}) {
  const id = useId();
  const [own, setOwn] = useState<TableState>(() => emptyTableState(columns.filter((c) => c.hiddenByDefault).map((c) => c.key)));
  const st = state ?? own;
  const set = (patch: Partial<TableState>) => { const next = { ...st, ...patch }; if (onState) onState(next); if (!state) setOwn(next); };
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [st.q, st.filters, st.sort, st.pageSize, rows.length]);

  const visible = columns.filter((c) => !st.hidden.includes(c.key));
  const options = useMemo(() => Object.fromEntries(columns.filter((c) => c.filter).map((c) => [c.key, [...new Set(rows.map((r) => String(c.value(r) ?? "")))].filter(Boolean).sort((a, b) => a.localeCompare(b, "en", { numeric: true }))])), [columns, rows]);

  const shown = useMemo(() => {
    const q = st.q.trim().toLowerCase();
    let out = rows.filter((r) => {
      for (const [k, v] of Object.entries(st.filters)) { if (!v) continue; const c = columns.find((x) => x.key === k); if (c && String(c.value(r) ?? "") !== v) return false; }
      if (q) return columns.some((c) => String(c.value(r) ?? "").toLowerCase().includes(q));
      return true;
    });
    if (st.sort) {
      const c = columns.find((x) => x.key === st.sort!.key);
      if (c) { const d = st.sort.dir === "asc" ? 1 : -1; out = [...out].sort((a, b) => { const x = c.value(a), y = c.value(b); if (x === y) return 0; if (x === null) return 1; if (y === null) return -1; return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "en", { numeric: true })) * d; }); }
    }
    return out;
  }, [rows, columns, st.q, st.filters, st.sort]);

  const pages = Math.max(1, Math.ceil(shown.length / st.pageSize));
  const cur = Math.min(page, pages - 1);
  const slice = shown.slice(cur * st.pageSize, cur * st.pageSize + st.pageSize);
  const active = !!st.q || Object.values(st.filters).some(Boolean);
  const sortBy = (key: string) => set({ sort: st.sort?.key === key ? (st.sort.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" } });
  const download = () => {
    const head = visible.map((c) => csvCell(c.header)).join(",");
    const body = shown.map((r) => visible.map((c) => csvCell(c.value(r))).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`${head}\n${body}\n`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `${exportName}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div role="search" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, fontWeight: 600, flex: "1 1 200px", minWidth: 160 }}>
          Search this table
          <input type="search" value={st.q} onChange={(e) => set({ q: e.target.value })} aria-label="Search this table" placeholder="Type to search every column" style={inputStyle} />
        </label>
        {columns.filter((c) => c.filter).map((c) => (
          <label key={c.key} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, fontWeight: 600 }}>
            {c.header}
            <select className="u-native-select" value={st.filters[c.key] ?? ""} onChange={(e) => set({ filters: { ...st.filters, [c.key]: e.target.value } })} style={{ ...inputStyle, width: "auto", minWidth: 130 }}>
              <option value="">All</option>
              {(options[c.key] ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        ))}
        {active && <button type="button" className="u-touch" style={pill(false)} onClick={() => set({ q: "", filters: {} })}>Clear</button>}
        <details style={{ position: "relative" }}>
          <summary className="u-touch" style={{ ...pill(false), listStyle: "none", display: "inline-block" }}>Columns</summary>
          <div style={{ position: "absolute", right: 0, zIndex: 10, marginTop: 4, padding: 10, minWidth: 190, border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", background: "var(--u-surface-raised)", boxShadow: "0 4px 16px rgba(0,0,0,0.16)" }}>
            {columns.map((c) => (
              <label key={c.key} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, padding: "4px 0" }}>
                <input type="checkbox" checked={!st.hidden.includes(c.key)} disabled={!st.hidden.includes(c.key) && visible.length === 1} onChange={(e) => set({ hidden: e.target.checked ? st.hidden.filter((k) => k !== c.key) : [...st.hidden, c.key] })} />
                {c.header}
              </label>
            ))}
          </div>
        </details>
        {ALLOW_DOWNLOADS && <button type="button" className="u-touch" style={pill(false)} onClick={download} disabled={shown.length === 0}>Download CSV</button>}
      </div>

      <div aria-live="polite" style={{ fontSize: 12.5, color: "var(--u-ink-secondary)" }}>
        {shown.length === rows.length ? `${rows.length.toLocaleString("en-GB")} rows` : `${shown.length.toLocaleString("en-GB")} of ${rows.length.toLocaleString("en-GB")} rows match`}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: Math.min(720, visible.length * 120) }}>
          <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{caption}</caption>
          <thead>
            <tr>{visible.map((c) => {
              const s = st.sort?.key === c.key ? st.sort.dir : null;
              return (
                <th key={`${id}-${c.key}`} scope="col" aria-sort={s === "asc" ? "ascending" : s === "desc" ? "descending" : "none"} style={{ ...th, textAlign: c.align === "right" ? "right" : "left" }}>
                  <button type="button" onClick={() => sortBy(c.key)} style={{ background: "none", border: 0, padding: 0, margin: 0, font: "inherit", fontWeight: 600, color: "inherit", cursor: "pointer", display: "inline-flex", gap: 4, alignItems: "center" }}>
                    {c.header}<span aria-hidden style={{ fontSize: 10, opacity: s ? 1 : 0.4 }}>{s === "asc" ? "▲" : s === "desc" ? "▼" : "↕"}</span>
                  </button>
                </th>
              );
            })}</tr>
          </thead>
          <tbody>
            {slice.length === 0 ? <tr><td colSpan={visible.length} style={{ ...td, color: "var(--u-ink-secondary)" }}>{empty ?? "Nothing matches. Clear the search or filters to see every row."}</td></tr> : slice.map((r) => {
              const k = rowKey(r);
              return (
                <tr key={k} style={{ borderBottom: "1px solid var(--u-border)", background: k === selectedKey ? "var(--u-surface-alt)" : undefined }}>
                  {visible.map((c, i) => {
                    const content = c.render ? c.render(r) : (c.value(r) ?? "–");
                    const rowHead = c.rowHeader ?? i === 0;
                    return rowHead
                      ? <th key={c.key} scope="row" style={{ ...td, textAlign: "left", fontWeight: 600 }}>{content}</th>
                      : <td key={c.key} style={{ ...td, textAlign: c.align === "right" ? "right" : "left" }}>{content}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {shown.length > pageSizes[0]! && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between", fontSize: 12.5 }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>Rows per page
            <select className="u-native-select" value={st.pageSize} onChange={(e) => set({ pageSize: Number(e.target.value) })} style={{ ...inputStyle, width: "auto" }}>{pageSizes.map((n) => <option key={n} value={n}>{n}</option>)}</select>
          </label>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button" className="u-touch" style={pill(false)} disabled={cur === 0} onClick={() => setPage(cur - 1)}>Previous</button>
            <span>Page {cur + 1} of {pages}</span>
            <button type="button" className="u-touch" style={pill(false)} disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next</button>
          </span>
        </div>
      )}
    </div>
  );
}
