"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  ProductCatalogMatch,
  ProductCatalogCompletenessStats,
  ProductCatalogDashboardStats,
  ProductSourcingSummary,
} from "@universe/types";
import { apiClient } from "../lib/apiClient";
import { useRouter } from "next/navigation";
import { useCountries } from "../lib/useCountries";
import { saveExport } from "../lib/download";
import {
  AddMenu,
  Button,
  DownloadIcon,
  AlertIcon,
  GridIcon,
  Pagination,
  Pill,
  SearchInput,
  Select,
  StatTile,
  StatTileGrid,
  TextLink,
  TrendingUpIcon,
  WorldMap,
  RankedTile,
  GlobeIcon,
  type RankedRow,
  type PageSize,
  type WorldMapPoint,
  type WorldMapLegendEntry,
} from "@universe/ui";

/**
 * Product Database Management — Catalogue screen. Added 2026-10-03, the
 * first dedicated browse/search/edit screen for the shared ProductMaster
 * catalogue (`@universe/ui`'s ProductPicker only ever shows a 25-row
 * typeahead inline inside other apps' forms — see product-catalog-build.md
 * — nothing until now has let anyone look at the catalogue itself end to
 * end). Deliberately server-paginated via ProductCatalogService.list()
 * rather than the client-side-filter-everything pattern
 * apps/project-management/src/app/partners/page.tsx uses: that pattern
 * fetches every row up front, which is fine for one tenant's own
 * stakeholders but not for a catalogue every organisation on the platform
 * contributes to and that reference-data importers (see /import) can grow
 * into the thousands.
 *
 * Click a row to expand an inline edit panel underneath it (not a
 * separate /products/detail route — the field set is small enough that a
 * full page navigation would be more friction than it's worth for what is
 * mostly quick corrections to an imported or picker-created row).
 */
const CATEGORIES = ["Personal Protective Equipment", "Consumables", "Laboratory", "Medical Devices", "Pharmaceuticals", "Equipment"] as const;

// Stage 3c (product-database-and-map-roadmap.md) — one fixed colour per
// top-level category for the sourcing map below, drawn from existing
// theme-aware tokens (tokens.css) rather than inventing a new palette for
// one screen. Not semantic (unlike the status-* tokens elsewhere) — purely
// a qualitative "which category is this pulse" key.
const CATEGORY_COLORS: Record<string, string> = {
  "Personal Protective Equipment": "var(--u-brand-violet)",
  "Consumables": "var(--u-module-crm)",
  "Laboratory": "var(--u-status-good)",
  "Medical Devices": "var(--u-module-tender-issuance)",
  "Pharmaceuticals": "var(--u-accent-magenta)",
  "Equipment": "var(--u-module-admin)",
};
const SOURCE_STANDARDS = ["INTERNAL", "HS_CODE", "WHO_EML", "UNSPSC", "GS1_GTIN"] as const;

export default function ProductCatalogPage() {
  const router = useRouter();
  const [items, setItems] = useState<ProductCatalogMatch[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  // Opened from global search: /?q=<product name> pre-fills the box.
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q) setSearch(q);
    } catch {
      /* no query */
    }
  }, []);
  const [category, setCategory] = useState("");
  const [sourceStandard, setSourceStandard] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [page, setPage] = useState(0);

  // Data completeness filter — added 2026-10-09, Stage 0 point 3. One of
  // the four tracked fields, or "" for none; wired into listProductCatalog
  // the same way category/sourceStandard already are. Clicking the same
  // completeness tile again clears it (see the tile's onClick below).
  const [missingField, setMissingField] = useState<"" | "gtin" | "hsCode" | "unspscCode" | "standardUnit">("");


  // Section mini-dashboard — added 2026-10-09, Stage 1: the standardised
  // StatTile/StatTileGrid pattern (packages/ui/src/StatTile.tsx, already
  // used on Project Management's home page, Stakeholders, Quality,
  // Logistics & CO2, and Admin's Organisations/Users) applied to the
  // catalogue screen for the first time — see
  // claude/product-database-and-map-roadmap.md Stage 1. Fetched once (not
  // re-fetched on every filter change) since these are catalogue-wide
  // totals, not scoped to the current search/filter; `load()`'s own
  // refresh on save does re-trigger it via onSaved below so a newly added
  // product updates the headline count without a manual page reload.
  const [dashboardStats, setDashboardStats] = useState<ProductCatalogDashboardStats | null>(null);
  // Completeness tiles — Stage 0 point 3. Same "fetch once, refresh on
  // save" reasoning as dashboardStats above.
  const [completeness, setCompleteness] = useState<ProductCatalogCompletenessStats | null>(null);
  // Sourcing-by-country map — Stage 3c. This is the anonymized,
  // cross-tenant view (GET /product-sourcing-insights/global), not
  // derived from this org's own catalogue fetch above — it never changes
  // with search/category/completeness filters, so it's fetched once on
  // mount, not inside loadStats()/load() (which both re-run on org-local
  // filter and save events this data has no relationship to).
  const [sourcing, setSourcing] = useState<ProductSourcingSummary[] | null>(null);
  const countries = useCountries();

  const loadStats = useCallback(() => {
    apiClient.getProductCatalogDashboardStats().then(setDashboardStats).catch(() => setDashboardStats(null));
    apiClient.getProductCatalogCompletenessStats().then(setCompleteness).catch(() => setCompleteness(null));
  }, []);

  // Fetched once, not inside loadStats() — see the sourcing state's own
  // comment above for why this is independent of load()/loadStats()'s
  // refresh triggers.
  useEffect(() => {
    apiClient.getGlobalProductSourcing().then(setSourcing).catch(() => setSourcing(null));
  }, []);

  // Stage 3c map data — ONE bubble per country of manufacture (changed 2026-10-17, Lewis: with many categories the old
  // one-dot-per-category-per-country layout overlapped and became unreadable). The bubble's size is the country's total
  // approved sourcing relationships, its colour is the country's leading category, and hover/tap lists the category
  // split. Nearby countries are then grouped automatically by WorldMap's clustering and zoom.
  const sourcingMapData = useMemo(() => {
    const points: WorldMapPoint[] = [];
    const rows: RankedRow[] = [];
    if (!sourcing || sourcing.length === 0) return { points, rows };
    const byCountry = new Map<string, { code: string; total: number; categories: Map<string, number> }>();
    for (const row of sourcing) {
      if (!row.manufactureCountryCode) continue;
      const entry = byCountry.get(row.manufactureCountryCode) ?? { code: row.manufactureCountryCode, total: 0, categories: new Map() };
      entry.total += row.approvalCount;
      entry.categories.set(row.category, (entry.categories.get(row.category) ?? 0) + row.approvalCount);
      byCountry.set(row.manufactureCountryCode, entry);
    }
    for (const entry of byCountry.values()) {
      const c = countries.find((x) => x.code === entry.code);
      if (!c || c.latitude === null || c.longitude === null) continue;
      const ranked = [...entry.categories.entries()].sort((a, b) => b[1] - a[1]);
      const [leadCategory] = ranked[0];
      rows.push({
        id: entry.code,
        label: c.name,
        value: entry.total,
        color: CATEGORY_COLORS[leadCategory] ?? "var(--u-ink-secondary)",
        segments: ranked.map(([cat, n]) => ({ color: CATEGORY_COLORS[cat] ?? "var(--u-ink-secondary)", value: n, label: `${cat}: ${n.toLocaleString()}` })),
      });
      points.push({
        id: entry.code,
        latitude: c.latitude,
        longitude: c.longitude,
        label: c.name,
        color: CATEGORY_COLORS[leadCategory] ?? "var(--u-ink-secondary)",
        value: entry.total,
        tooltipLines: [
          { text: `${entry.total.toLocaleString()} approved for sourcing` },
          ...ranked.slice(0, 5).map(([cat, n]) => ({ text: `${cat}: ${n.toLocaleString()}`, color: CATEGORY_COLORS[cat] ?? "var(--u-ink-secondary)" })),
          ...(ranked.length > 5 ? [{ text: `+${ranked.length - 5} more categories` }] : []),
        ],
      });
    }
    rows.sort((a, b) => b.value - a.value);
    return { points, rows };
  }, [sourcing, countries]);
  const [mapFocus, setMapFocus] = useState<{ id: string; nonce: number } | null>(null);

  const sourcingLegend: WorldMapLegendEntry[] = CATEGORIES.map((cat) => ({
    color: CATEGORY_COLORS[cat] ?? "var(--u-ink-secondary)",
    label: cat,
  }));

  const load = useCallback(() => {
    setLoading(true);
    apiClient
      .listProductCatalog({
        q: search || undefined,
        category: category || undefined,
        sourceStandard: sourceStandard || undefined,
        includeArchived,
        missingField: missingField || undefined,
        page: page + 1,
        pageSize: pageSize === "all" ? 200 : pageSize,
      })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load the product catalogue"))
      .finally(() => setLoading(false));
  }, [search, category, sourceStandard, includeArchived, missingField, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const pageCount = Math.max(1, Math.ceil(total / (pageSize === "all" ? 200 : pageSize)));

  const toggleMissingField = (field: "gtin" | "hsCode" | "unspscCode" | "standardUnit") => {
    setMissingField((current) => (current === field ? "" : field));
    setPage(0);
  };

  return (
    <main style={{ padding: "28px 32px 48px", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 22, color: "var(--u-ink)", margin: 0 }}>Product Catalogue</h1>
          <p style={{ color: "var(--u-ink-secondary)", marginTop: 6, fontSize: 14 }}>
            The shared ProductMaster catalogue — every product any organisation on Universe has added, picked, or imported. Browse,
            search, and correct entries here; new entries are usually added inline from a project line, Quality approval, the{" "}
            <Link href="/import" style={{ textDecoration: "none" }}>
              <TextLink as="span">reference-data importer</TextLink>
            </Link>, or one at a time via "Add Product" below.
          </p>
        </div>
        {/* Added 2026-10-14 — replicated from Project Management's landing
            page AddMenu (same component, same /products/new destination
            under this app's own route — see that page's own doc comment).
            Lewis flagged this app had no way to add a single product at a
            time, only bulk CSV via /import. */}
        <AddMenu
          label="Add Product"
          options={[
            { label: "Non-Pharmaceutical", onSelect: () => router.push("/products/new?context=NON_PHARMACEUTICAL") },
            { label: "Pharmaceutical", onSelect: () => router.push("/products/new?context=PHARMACEUTICAL") },
          ]}
        />
      </div>

      {/* Section mini-dashboard — Stage 1 (standardised dashboard
          pattern), product-database-and-map-roadmap.md. First use of the
          shared StatTile/StatTileGrid pattern in Product Database. */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--u-ink)", margin: "24px 0 12px" }}>Overview</h2>
      <StatTileGrid>
        <StatTile label="Total products" value={dashboardStats ? dashboardStats.total : undefined} icon={<GridIcon size={18} />} tone="brand" />
        <StatTile
          label="Added in last 30 days"
          value={dashboardStats ? dashboardStats.addedLast30Days : undefined}
          icon={<TrendingUpIcon size={18} />}
          tone="good"
        />
      </StatTileGrid>
      {dashboardStats && dashboardStats.byCategory.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {dashboardStats.byCategory.map((c) => (
            <button
              key={c.category}
              type="button"
              onClick={() => { setCategory((current) => (current === c.category ? "" : c.category)); setPage(0); }}
              style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}
              title={`Filter the catalogue to ${c.category}`}
            >
              <Pill tone={category === c.category ? "brand" : "neutral"}>
                {c.category} · {c.count}
              </Pill>
            </button>
          ))}
        </div>
      )}

      {/* Data completeness — Stage 0 point 3, product-database-and-map-
          roadmap.md. Each tile is also a filter: click "Missing GTIN" and
          the table below narrows to exactly those rows. Not a single "%
          complete" score — see ProductCatalogCompletenessStats's doc
          comment in @universe/types for why. */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--u-ink)", margin: "24px 0 12px" }}>Data completeness</h2>
      <StatTileGrid>
        <StatTile
          label="Missing GTIN"
          value={completeness ? completeness.missingGtin : undefined}
          icon={<AlertIcon size={18} />}
          tone="warning"
          onClick={() => toggleMissingField("gtin")}
          active={missingField === "gtin"}
        />
        <StatTile
          label="Missing HS Code"
          value={completeness ? completeness.missingHsCode : undefined}
          icon={<AlertIcon size={18} />}
          tone="warning"
          onClick={() => toggleMissingField("hsCode")}
          active={missingField === "hsCode"}
        />
        <StatTile
          label="Missing UNSPSC"
          value={completeness ? completeness.missingUnspscCode : undefined}
          icon={<AlertIcon size={18} />}
          tone="warning"
          onClick={() => toggleMissingField("unspscCode")}
          active={missingField === "unspscCode"}
        />
        <StatTile
          label="Missing standard unit"
          value={completeness ? completeness.missingStandardUnit : undefined}
          icon={<AlertIcon size={18} />}
          tone="warning"
          onClick={() => toggleMissingField("standardUnit")}
          active={missingField === "standardUnit"}
        />
      </StatTileGrid>

      {/* Sourcing by country of manufacture — Stage 3c,
          product-database-and-map-roadmap.md. Anonymized, cross-tenant:
          pulses are products-per-category approved for sourcing from that
          country across every consented organisation on the platform, not
          just this one — matches Logistics & CO2's global map (Stage 3a)
          in spirit, reusing the same WorldMap component. Category is
          always the top-level group (e.g. "Pharmaceuticals"), confirmed
          with Lewis alongside the Stage 1 dashboard fix. */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--u-ink)", margin: "24px 0 12px" }}>Sourcing by country of manufacture</h2>
      <p style={{ fontSize: 12.5, color: "var(--u-ink-secondary)", margin: "0 0 12px" }}>
        Anonymized, aggregated across every consented organisation on the platform — no organisation's own sourcing relationships are ever individually identifiable here.
      </p>
      {/* Interactive since 2026-10-09 (map-interactivity round): hovering/
          tapping a pulse shows the country (title) plus category and
          approval count (WorldMap's HTML tooltip overlay — see that
          component's own doc comment for why it's HTML, not SVG text).
          Clicking a pulse filters the catalogue below to that pulse's
          category, reusing the same Select/category state the "All
          categories" dropdown already drives — clicking a pulse for the
          category already selected clears the filter, matching the
          toggle behaviour already used by the completeness tiles above. */}
      <div style={{ marginBottom: 16 }}>
        <RankedTile
          label="Top countries of manufacture"
          icon={<GlobeIcon size={18} />}
          tone="var(--u-module-product-database, var(--u-brand-violet))"
          rows={sourcingMapData.rows}
          activeId={mapFocus?.id ?? null}
          onRowClick={(row) => setMapFocus({ id: row.id, nonce: Date.now() })}
          emptyMessage="No anonymised sourcing data meets the minimum cohort size yet."
        />
      </div>
      <WorldMap
        points={sourcingMapData.points}
        focus={mapFocus}
        highlightId={mapFocus?.id ?? null}
        legend={sourcingLegend}
        emptyMessage="No anonymised sourcing data meets the minimum cohort size yet."
      />
      <p style={{ fontSize: 12, color: "var(--u-ink-secondary)", margin: "8px 0 0" }}>
        One bubble per country: size is the number of approved sources, colour is the country's leading category. Hover or tap for the category split; zoom in to separate close countries.
      </p>

      <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search by product name…" />
        <Select
          value={category}
          onChange={(v) => { setCategory(v); setPage(0); }}
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          allLabel="All categories"
          ariaLabel="Filter by category"
        />
        <Select
          value={sourceStandard}
          onChange={(v) => { setSourceStandard(v); setPage(0); }}
          options={SOURCE_STANDARDS.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
          allLabel="All sources"
          ariaLabel="Filter by source standard"
        />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "var(--u-ink)", padding: "0 4px" }}>
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => { setIncludeArchived(e.target.checked); setPage(0); }}
          />
          Show archived
        </label>
        <Button
          variant="secondary"
          size="sm"
          disabled={exporting}
          onClick={async () => {
            setExporting(true); setExportNote(null);
            try {
              const f = await apiClient.exportCatalogueCsv({ q: search || undefined, category: category || undefined, sourceStandard: sourceStandard || undefined, includeArchived });
              saveExport(f);
              setExportNote(`${f.rowCount.toLocaleString("en-GB")} products exported${f.truncated ? " (stopped at the row limit; narrow the filters for the rest)" : ""}.`);
            } catch (e) { setExportNote(e instanceof Error ? e.message : "Export failed."); }
            finally { setExporting(false); }
          }}
        >
          <DownloadIcon size={14} /> {exporting ? "Preparing…" : "Export CSV"}
        </Button>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--u-ink-secondary)", margin: "8px 0 0" }}>
        {exportNote ? `${exportNote} ` : ""}Export CSV covers the products your organisation added (global admins: the whole catalogue), follows your current filters and is recorded in your audit trail. <Link href="/exports">Need more? Request a wider export.</Link>
      </p>

      {error && <p style={{ color: "var(--u-status-critical)", marginTop: 16 }}>{error}</p>}
      {!items && !error && <p style={{ color: "var(--u-ink-secondary)", marginTop: 16 }}>Loading…</p>}

      {items && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--u-border)" }}>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--u-ink-secondary)" }}>Name</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--u-ink-secondary)" }}>Category</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--u-ink-secondary)" }}>HS Code</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--u-ink-secondary)" }}>UNSPSC</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--u-ink-secondary)" }}>GTIN</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--u-ink-secondary)" }}>Added by</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <ProductRow key={p.id} product={p} />
              ))}
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} style={{ padding: 20, color: "var(--u-ink-secondary)", textAlign: "center" }}>
                    No catalogue entries match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <Pagination
            pageSize={pageSize}
            onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            totalCount={total}
          />
        </>
      )}
    </main>
  );
}

function ProductRow({ product }: { product: ProductCatalogMatch }) {
  const router = useRouter();
  const open = () => router.push(`/products/detail?id=${product.id}`);
  const lifecycleTone = product.lifecycleStatus === "RECALLED" || product.lifecycleStatus === "WITHDRAWN" ? "critical" : product.lifecycleStatus === "RESTRICTED" ? "warning" : "neutral";
  return (
    <tr
      onClick={open}
      onKeyDown={(e) => { if (e.key === "Enter") open(); }}
      tabIndex={0}
      style={{ borderBottom: "1px solid var(--u-border)", cursor: "pointer" }}
      className="u-card-hover"
    >
      <td style={{ padding: 8, fontWeight: 600 }}>
        <Link href={`/products/detail?id=${product.id}`} onClick={(e) => e.stopPropagation()} style={{ color: "inherit", textDecoration: "none" }}>{product.name}</Link>
        {product.isArchived && (
          <span style={{ marginLeft: 8 }}>
            <Pill tone="neutral">Archived</Pill>
          </span>
        )}
        {product.lifecycleStatus !== "ACTIVE" && !product.isArchived && (
          <span style={{ marginLeft: 8 }}>
            <Pill tone={lifecycleTone}>{product.lifecycleStatus.charAt(0) + product.lifecycleStatus.slice(1).toLowerCase()}</Pill>
          </span>
        )}
        {product.hasPendingAmendment && (
          <span style={{ marginLeft: 8 }} title="A proposed change to this product is awaiting QA/RP ratification — it can still be used on a project line.">
            <Pill tone="warning">Pending amendment</Pill>
          </span>
        )}
      </td>
      <td style={{ padding: 8 }}>
        <Pill tone="neutral">{product.category}</Pill>
      </td>
      <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{product.hsCode ?? "—"}</td>
      <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{product.unspscCode ?? "—"}</td>
      <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{product.gtin ?? "—"}</td>
      <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{product.addedByOrganizationName ?? "—"}</td>
    </tr>
  );
}
