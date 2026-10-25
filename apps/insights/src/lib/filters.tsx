"use client";

import { useSyncExternalStore } from "react";
import { commodityGroupLabel } from "@universe/types";
import { inputStyle, pill } from "./ui";

/**
 * The filters every Insights lens shares (2026-10-25): product group and transport mode. Held in a tiny store and remembered for the browser
 * session, so a choice made on one page still applies when you move to another.
 */
export interface InsightsFilters { commodity: string; mode: string }
const KEY = "universe.insights.filters";
let state: InsightsFilters = { commodity: "", mode: "" };
try { const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(KEY) : null; if (raw) state = { ...state, ...JSON.parse(raw) }; } catch { /* storage unavailable: filters last for this page view only */ }
const listeners = new Set<() => void>();

export function setInsightsFilters(next: Partial<InsightsFilters>) {
  state = { ...state, ...next };
  try { window.sessionStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}
export function useInsightsFilters(): InsightsFilters {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => state, () => state);
}

const MODES = [{ key: "", label: "All modes" }, { key: "AIR", label: "Air" }, { key: "SEA", label: "Sea" }, { key: "LAND", label: "Land" }];

/** The shared filter bar. `commodities` is the list of product groups that actually have data. */
export function InsightsFilterBar({ commodities, extra }: { commodities: string[]; extra?: React.ReactNode }) {
  const f = useInsightsFilters();
  const active = f.commodity || f.mode;
  return (
    <div role="group" aria-label="Filters for every chart on this page" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "10px 12px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", backgroundColor: "var(--u-surface-raised)" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600, color: "var(--u-ink)" }}>
        Product group
        <select className="u-native-select" style={{ ...inputStyle, width: "auto", minWidth: 170 }} value={f.commodity} onChange={(e) => setInsightsFilters({ commodity: e.target.value })}>
          <option value="">All product groups</option>
          {commodities.map((c) => <option key={c} value={c}>{commodityGroupLabel(c)}</option>)}
        </select>
      </label>
      <div role="group" aria-label="Transport mode" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {MODES.map((m) => <button key={m.label} type="button" className="u-touch" style={pill(f.mode === m.key)} aria-pressed={f.mode === m.key} onClick={() => setInsightsFilters({ mode: m.key })}>{m.label}</button>)}
      </div>
      {extra}
      {active && <button type="button" className="u-touch" style={pill(false)} onClick={() => setInsightsFilters({ commodity: "", mode: "" })}>Clear filters</button>}
    </div>
  );
}
