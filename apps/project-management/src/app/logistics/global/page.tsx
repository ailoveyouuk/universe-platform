"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { LogisticsFilters, LogisticsRouteSummary, StakeholderRatingBucket } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";
import { GaugeIcon, StandardsReference, ScoreLegend, CountrySelect } from "@universe/ui";
import { useCountries } from "../../../lib/useCountries";

const TRANSPORT_MODES = ["", "AIR", "SEA", "LAND"] as const;
const INCOTERMS = ["", "EXW", "FCA", "FAS", "FOB", "CPT", "CIP", "CFR", "CIF", "DAP", "DPU", "DDP"] as const;
const COMMODITY_GROUPS = ["", "CONSUMABLES", "DEVICES", "REAGENTS", "EQUIPMENT", "PHARMACEUTICALS", "LABORATORY"] as const;

const ENTITY_LABELS: Record<string, string> = {
  PROJECT: "Projects",
  MANUFACTURER: "Manufacturers",
  SUPPLIER: "Suppliers",
  PROCURING_ORGANIZATION: "Procuring organisations",
};

/**
 * Global, anonymized, cross-tenant "Logistics & CO2" benchmark — added
 * 2026-10-08, per Lewis's request for a view "accessible by all universe
 * users" showing the most-common and most-CO2-efficient manufacture-to-
 * destination routes, plus aggregate stakeholder counts by efficiency
 * rating. Every figure here comes from @universe/insights-db's
 * AggregatedLogisticsMetric / getStakeholderRatingDistribution — never
 * this organization's own tenant data directly. A route/bucket with
 * fewer than MINIMUM_COHORT_SIZE (5) distinct contributing organizations
 * (or entities, for the stakeholder counts) is never returned at all —
 * so on a platform with few consented/contributing organizations, this
 * page may legitimately show little or nothing yet. See
 * supply-chain-co2-efficiency.md for the full writeup of that tradeoff.
 */
export default function GlobalLogisticsPage() {
  const countries = useCountries();
  const [routes, setRoutes] = useState<LogisticsRouteSummary[] | null>(null);
  const [ratings, setRatings] = useState<StakeholderRatingBucket[] | null>(null);
  const [filters, setFilters] = useState<LogisticsFilters>({});
  const [sortBy, setSortBy] = useState<"common" | "efficient">("common");

  useEffect(() => {
    apiClient
      .getGlobalLogisticsRoutes(filters)
      .then(setRoutes)
      .catch(() => setRoutes([]));
  }, [filters]);

  useEffect(() => {
    apiClient
      .getGlobalStakeholderRatings()
      .then(setRatings)
      .catch(() => setRatings([]));
  }, []);

  const sortedRoutes = routes
    ? [...routes].sort((a, b) => (sortBy === "common" ? b.shipmentCount - a.shipmentCount : b.avgEfficiencyScore - a.avgEfficiencyScore))
    : null;

  function update<K extends keyof LogisticsFilters>(key: K, value: LogisticsFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value || undefined }));
  }

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "var(--u-org-accent, var(--u-brand-violet))", marginBottom: 10 }} />
        <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 26, margin: 0, color: "var(--u-ink)", display: "flex", alignItems: "center", gap: 10 }}>
          <GaugeIcon size={24} /> Global Logistics & CO2 Benchmark
        </h1>
        <p style={{ color: "var(--u-ink-secondary)", fontSize: 14, marginTop: 6, maxWidth: 760 }}>
          Anonymized, aggregated across every consented organisation on the platform — no organisation,
          project, or shipment is ever individually identifiable here. See{" "}
          <Link href="/logistics" style={{ textDecoration: "none", color: "var(--u-brand-violet)" }}>
            your own organisation&apos;s private data
          </Link>{" "}
          for line-level detail.
        </p>
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <StandardsReference
            label="GLEC Framework (ISO 14083-aligned)"
            detail="Distance and CO2 figures below use GLEC-Framework-aligned emission factors by transport mode. Distance is a great-circle approximation between country centroids, not an actual shipping route. See supply-chain-co2-efficiency.md for the full methodology."
          />
          <ScoreLegend />
        </div>
      </div>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, margin: "0 0 10px", color: "var(--u-ink)" }}>Stakeholders by efficiency/CO2-impact rating</h2>
        {ratings === null && <p style={{ color: "var(--u-ink-secondary)" }}>Loading…</p>}
        {ratings !== null && ratings.length === 0 && (
          <p style={{ color: "var(--u-ink-secondary)" }}>
            Not enough contributing organisations/entities yet to show this anonymously (a minimum cohort size applies to every bucket).
          </p>
        )}
        {ratings && ratings.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {Object.keys(ENTITY_LABELS).map((entityType) => {
              const buckets = ratings.filter((r) => r.entityType === entityType);
              return (
                <div key={entityType} style={{ border: "1px solid var(--u-border)", borderRadius: 8, padding: 14 }}>
                  <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 13, color: "var(--u-ink)" }}>{ENTITY_LABELS[entityType]}</p>
                  {buckets.length === 0 && <p style={{ margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" }}>—</p>}
                  {buckets.map((b) => (
                    <p key={b.scoreBand} style={{ margin: "4px 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>
                      {b.count} at ~{b.scoreBand === "RED" ? "1-3" : b.scoreBand === "AMBER" ? "4-5" : b.scoreBand === "YELLOW" ? "6-7" : "8-10"}/10
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ fontSize: 18, margin: 0, color: "var(--u-ink)" }}>Routes (manufacture → destination)</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button className={sortBy === "common" ? "u-tab-active" : "u-tab"} onClick={() => setSortBy("common")} style={tabStyle(sortBy === "common")}>
              Most common
            </button>
            <button className={sortBy === "efficient" ? "u-tab-active" : "u-tab"} onClick={() => setSortBy("efficient")} style={tabStyle(sortBy === "efficient")}>
              Most CO2-efficient
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
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
          <CountrySelect
            value={filters.manufactureCountryCode ?? ""}
            onChange={(code) => update("manufactureCountryCode", code)}
            options={countries}
            ariaLabel="Manufacture country"
            placeholder="Manufacture country…"
          />
          <CountrySelect
            value={filters.destinationCountryCode ?? ""}
            onChange={(code) => update("destinationCountryCode", code)}
            options={countries}
            ariaLabel="Destination country"
            placeholder="Destination country…"
          />
        </div>

        {sortedRoutes === null && <p style={{ color: "var(--u-ink-secondary)" }}>Loading…</p>}
        {sortedRoutes !== null && sortedRoutes.length === 0 && (
          <p style={{ color: "var(--u-ink-secondary)" }}>
            No route combination currently has enough contributing organisations to show anonymously.
          </p>
        )}
        {sortedRoutes && sortedRoutes.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sortedRoutes.map((r, i) => (
              <div key={i} style={{ border: "1px solid var(--u-border)", borderRadius: 8, padding: 14, display: "flex", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: "var(--u-ink)" }}>
                    {r.manufactureCountryCode ? countries.find((c) => c.code === r.manufactureCountryCode)?.name ?? r.manufactureCountryCode : "—"}
                    {" → "}
                    {r.destinationCountryCode ? countries.find((c) => c.code === r.destinationCountryCode)?.name ?? r.destinationCountryCode : "—"}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>
                    {r.transportMode ?? "—"} · {r.incoterm ?? "—"} · {r.commodityGroup ?? "—"}
                    {r.avgDurationDays !== null && ` · avg ${Math.round(r.avgDurationDays)}d`}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--u-ink-secondary)" }}>
                    {r.shipmentCount} shipments across {r.sourceCount} organisations
                  </p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: "var(--u-ink)" }}>{Math.round(r.avgDistanceKm).toLocaleString()} km</p>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>~{Math.round(r.avgCo2TotalKg).toLocaleString()} kg CO2e avg</p>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--u-ink-secondary)" }}>Avg score {r.avgEfficiencyScore.toFixed(1)}/10</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const filterInputStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--u-border)",
  fontSize: 13,
};

function tabStyle(active: boolean): CSSProperties {
  return {
    padding: "6px 14px",
    borderRadius: 6,
    border: "1px solid var(--u-border)",
    background: active ? "var(--u-org-accent, var(--u-brand-violet))" : "transparent",
    color: active ? "#fff" : "var(--u-ink)",
    fontSize: 13,
    cursor: "pointer",
  };
}
