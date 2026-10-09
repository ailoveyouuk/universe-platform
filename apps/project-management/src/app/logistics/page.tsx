"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { LogisticsFilters, OrgLogisticsLineSummary } from "@universe/types";
import { apiClient } from "../../lib/apiClient";
import { GaugeIcon, TextLink, StandardsReference, StatTile, ScoreLegend, SCORE_BAND_COLORS, ProjectsIcon, TrendingUpIcon, AlertIcon } from "@universe/ui";
import { useCountries } from "../../lib/useCountries";

const TRANSPORT_MODES = ["", "AIR", "SEA", "LAND"] as const;
const INCOTERMS = ["", "EXW", "FCA", "FAS", "FOB", "CPT", "CIP", "CFR", "CIF", "DAP", "DPU", "DDP"] as const;
const COMMODITY_GROUPS = ["", "CONSUMABLES", "DEVICES", "REAGENTS", "EQUIPMENT", "PHARMACEUTICALS", "LABORATORY"] as const;
const SCORE_BANDS = ["", "RED", "AMBER", "YELLOW", "GREEN"] as const;

/**
 * Org-private "Logistics & CO2" view — added 2026-10-08. Every row here is
 * this organization's own ProjectLineLogisticsMetric data (plain tenant-
 * scoped read via /logistics-insights/lines) — see
 * supply-chain-co2-efficiency.md for the full methodology. The anonymized
 * cross-tenant view is the separate /logistics/global page.
 */
export default function LogisticsPage() {
  const countries = useCountries();
  const [rows, setRows] = useState<OrgLogisticsLineSummary[] | null>(null);
  const [filters, setFilters] = useState<LogisticsFilters>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => {
      apiClient
        .getLogisticsLines({ ...filters, search: search || undefined })
        .then(setRows)
        .catch(() => setRows([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [filters, search]);

  const totals = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const totalCo2 = rows.reduce((sum, r) => sum + Number(r.metric.co2TotalKg), 0);
    const totalDistance = rows.reduce((sum, r) => sum + Number(r.metric.distanceKm), 0);
    const avgScore = rows.reduce((sum, r) => sum + r.metric.efficiencyScore, 0) / rows.length;
    return { totalCo2, totalDistance, avgScore, count: rows.length };
  }, [rows]);

  function update<K extends keyof LogisticsFilters>(key: K, value: LogisticsFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value || undefined }));
  }

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "var(--u-org-accent, var(--u-brand-violet))", marginBottom: 10 }} />
          <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 26, margin: 0, color: "var(--u-ink)", display: "flex", alignItems: "center", gap: 10 }}>
            <GaugeIcon size={24} /> Logistics & CO2
          </h1>
          <p style={{ color: "var(--u-ink-secondary)", fontSize: 14, marginTop: 6, maxWidth: 680 }}>
            Manufacture-to-delivery distance, approximate CO2 (GLEC-Framework-aligned), and a 1–10
            efficiency/CO2-impact score per project line — this organisation&apos;s own data only. See{" "}
            <Link href="/logistics/global" style={{ textDecoration: "none" }}>
              <TextLink as="span">the anonymized, cross-platform view</TextLink>
            </Link>{" "}
            for aggregate benchmarking against other organisations.
          </p>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <StandardsReference
              label="GLEC Framework (ISO 14083-aligned)"
              detail="Distance and CO2 figures below use GLEC-Framework-aligned emission factors by transport mode. Distance is a great-circle approximation between country centroids, not an actual shipping route. See supply-chain-co2-efficiency.md for the full methodology."
            />
            <ScoreLegend />
          </div>
        </div>
      </div>

      {totals && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          <StatTile label="Lines" value={totals.count} icon={<ProjectsIcon size={18} />} tone="neutral" />
          <StatTile label="Total distance" value={`${Math.round(totals.totalDistance).toLocaleString()} km`} icon={<TrendingUpIcon size={18} />} tone="neutral" />
          <StatTile label="Total CO2e" value={`${Math.round(totals.totalCo2).toLocaleString()} kg`} icon={<AlertIcon size={18} />} tone="warning" />
          <StatTile label="Avg. efficiency score" value={`${totals.avgScore.toFixed(1)} / 10`} icon={<GaugeIcon size={18} />} tone="brand" />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 18 }}>
        <input
          placeholder="Search project / description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={filterInputStyle}
        />
        <select className="u-native-select" style={filterInputStyle} value={filters.transportMode ?? ""} onChange={(e) => update("transportMode", e.target.value)}>
          {TRANSPORT_MODES.map((m) => (
            <option key={m} value={m}>
              {m || "All modes"}
            </option>
          ))}
        </select>
        <select className="u-native-select" style={filterInputStyle} value={filters.incoterm ?? ""} onChange={(e) => update("incoterm", e.target.value)}>
          {INCOTERMS.map((i) => (
            <option key={i} value={i}>
              {i || "All incoterms"}
            </option>
          ))}
        </select>
        <select className="u-native-select" style={filterInputStyle} value={filters.commodityGroup ?? ""} onChange={(e) => update("commodityGroup", e.target.value)}>
          {COMMODITY_GROUPS.map((c) => (
            <option key={c} value={c}>
              {c || "All commodity groups"}
            </option>
          ))}
        </select>
        <select className="u-native-select" style={filterInputStyle} value={filters.scoreBand ?? ""} onChange={(e) => update("scoreBand", e.target.value)}>
          {SCORE_BANDS.map((b) => (
            <option key={b} value={b}>
              {b || "All score bands"}
            </option>
          ))}
        </select>
        <input
          placeholder="Max duration (days)"
          type="number"
          min={0}
          value={filters.maxDurationDays ?? ""}
          onChange={(e) => update("maxDurationDays", e.target.value ? Number(e.target.value) : undefined)}
          style={filterInputStyle}
        />
      </div>

      {rows === null && <p style={{ color: "var(--u-ink-secondary)" }}>Loading…</p>}
      {rows !== null && rows.length === 0 && <p style={{ color: "var(--u-ink-secondary)" }}>No lines match these filters yet.</p>}

      {rows && rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((row) => {
            const m = row.metric;
            const color = SCORE_BAND_COLORS[m.scoreBand] ?? "#666";
            return (
              <Link key={row.projectLineId} href={`/projects/detail?id=${row.projectId}`} style={{ textDecoration: "none" }}>
                <div style={{ border: "1px solid var(--u-border)", borderRadius: 8, padding: 14, display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: "var(--u-ink)" }}>
                      {row.projectReferenceNumber} — {row.clientProductDescription ?? row.projectTitle}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>
                      {m.manufactureCountryCode ? countries.find((c) => c.code === m.manufactureCountryCode)?.name ?? m.manufactureCountryCode : "—"}
                      {" → "}
                      {m.destinationCountryCode ? countries.find((c) => c.code === m.destinationCountryCode)?.name ?? m.destinationCountryCode : "—"}
                      {" · "}{Math.round(Number(m.distanceKm)).toLocaleString()} km ·{" "}
                      {m.transportMode ?? "—"} · {m.incoterm ?? "—"} · {m.commodityGroup ?? "—"}
                      {m.durationDays !== null && ` · ${m.durationDays}d`}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>
                      Manufacturer: {row.manufacturerName ?? "—"} · Supplier: {row.supplierName ?? "—"}
                      {m.weightEstimated && " · weight estimated"}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: color,
                        color: "#fff",
                        fontWeight: 700,
                      }}
                      title={`Efficiency/CO2 impact score: ${m.efficiencyScore}/10`}
                    >
                      {m.efficiencyScore}
                    </div>
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>
                      ~{Math.round(Number(m.co2TotalKg)).toLocaleString()} kg CO2e
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const filterInputStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--u-border)",
  fontSize: 13,
};

