"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  ProductCatalogMatch,
  ProductCatalogDetail,
  ProductCatalogAttribute,
  ProductCatalogCompletenessStats,
  ProductCatalogDashboardStats,
  ProductPriceHistoryPoint,
  ProductSourceApprovalSummary,
  ProductSourcingSummary,
  UpdateProductMasterInput,
} from "@universe/types";
import { apiClient } from "../lib/apiClient";
import { useCurrentUser } from "../lib/AuthContext";
import { useCountries } from "../lib/useCountries";
import {
  AlertIcon,
  Button,
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
  const [items, setItems] = useState<ProductCatalogMatch[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sourceStandard, setSourceStandard] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [page, setPage] = useState(0);

  // Data completeness filter — added 2026-10-09, Stage 0 point 3. One of
  // the four tracked fields, or "" for none; wired into listProductCatalog
  // the same way category/sourceStandard already are. Clicking the same
  // completeness tile again clears it (see the tile's onClick below).
  const [missingField, setMissingField] = useState<"" | "gtin" | "hsCode" | "unspscCode" | "standardUnit">("");

  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  // Stage 3c map data — one WorldMap point per (category, country)
  // combination the anonymized endpoint returned. Multiple categories
  // sourced from the same country land on the same lat/long, which would
  // otherwise stack pulses exactly on top of each other — WorldMap has no
  // built-in clustering (it's presentation-only, see its own doc comment),
  // so each category gets a small fixed angular offset around that
  // country's real centroid, arranged like points on a clock face (one of
  // up to 6 positions, matching CATEGORIES' length) purely to keep
  // same-country pulses visually separable. This is a deliberate, cosmetic
  // approximation — it does not change which country a pulse represents,
  // only where around that country's centroid it's drawn.
  const sourcingMapData = useMemo(() => {
    const points: WorldMapPoint[] = [];
    if (!sourcing || sourcing.length === 0) return points;
    const OFFSET_DEGREES = 2.4;
    for (const row of sourcing) {
      if (!row.manufactureCountryCode) continue;
      const c = countries.find((x) => x.code === row.manufactureCountryCode);
      if (!c || c.latitude === null || c.longitude === null) continue;
      const categoryIndex = Math.max(0, CATEGORIES.indexOf(row.category as (typeof CATEGORIES)[number]));
      const angle = (categoryIndex / CATEGORIES.length) * 2 * Math.PI;
      const latitude = c.latitude + OFFSET_DEGREES * Math.sin(angle);
      const longitude = c.longitude + OFFSET_DEGREES * Math.cos(angle);
      points.push({
        id: `${row.category}:${row.manufactureCountryCode}`,
        latitude,
        longitude,
        label: `${row.category} — ${c.name}`,
        color: CATEGORY_COLORS[row.category] ?? "var(--u-ink-secondary)",
        value: row.approvalCount,
      });
    }
    return points;
  }, [sourcing, countries]);

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
            search, and correct entries here; new entries are usually added inline from a project line, Quality approval, or the{" "}
            <Link href="/import" style={{ textDecoration: "none" }}>
              <TextLink as="span">reference-data importer</TextLink>
            </Link>.
          </p>
        </div>
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
      <WorldMap
        points={sourcingMapData}
        legend={sourcingLegend}
        emptyMessage="No anonymised sourcing data meets the minimum cohort size yet."
      />

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
      </div>

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
                <ProductRow
                  key={p.id}
                  product={p}
                  expanded={expandedId === p.id}
                  onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  onSaved={() => { setExpandedId(null); load(); loadStats(); }}
                  onRefresh={() => { load(); loadStats(); }}
                />
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

function ProductRow({
  product,
  expanded,
  onToggle,
  onSaved,
  onRefresh,
}: {
  product: ProductCatalogMatch;
  expanded: boolean;
  onToggle: () => void;
  onSaved: () => void;
  onRefresh: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        style={{ borderBottom: expanded ? "none" : "1px solid var(--u-border)", cursor: "pointer" }}
        className="u-card-hover"
      >
        <td style={{ padding: 8, fontWeight: 600 }}>
          {product.name}
          {product.isArchived && (
            <span style={{ marginLeft: 8 }}>
              <Pill tone="neutral">Archived</Pill>
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
      {expanded && (
        <tr style={{ borderBottom: "1px solid var(--u-border)" }}>
          <td colSpan={6} style={{ padding: "4px 8px 16px" }}>
            <ProductEditPanel productId={product.id} onSaved={onSaved} onRefresh={onRefresh} onCancel={onToggle} />
          </td>
        </tr>
      )}
    </>
  );
}

function ProductEditPanel({
  productId,
  onSaved,
  onRefresh,
  onCancel,
}: {
  productId: string;
  onSaved: () => void;
  onRefresh: () => void;
  onCancel: () => void;
}) {
  const me = useCurrentUser();
  const countries = useCountries();
  const [detail, setDetail] = useState<ProductCatalogDetail | null>(null);
  const [form, setForm] = useState<UpdateProductMasterInput>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);

  const [priceHistory, setPriceHistory] = useState<ProductPriceHistoryPoint[] | null>(null);
  const [priceHistoryError, setPriceHistoryError] = useState<string | null>(null);

  // This organisation's own sourcing decisions for this product — added
  // 2026-10-09, Stage 0 point 2 (country display consistency audit): the
  // roadmap flagged Product Database as showing zero country data anywhere,
  // despite manufacturer/supplier country being available via this org's own
  // ProductSourceApproval records (product_source_approvals is RLS-scoped
  // per-org, so this is never cross-tenant data — see that table's doc
  // comment in row-level-security.sql). listProductSourceApprovals() has no
  // productMasterId filter server-side (it's a small, per-org list), so this
  // filters client-side rather than widening that endpoint's contract for
  // one caller.
  const [sourcing, setSourcing] = useState<ProductSourceApprovalSummary[] | null>(null);

  const isPlatformStaff = (me?.platformStaffRole ?? "NONE") !== "NONE";
  const isOwnOrg = Boolean(me && detail && detail.addedByOrganizationId === me.organizationId);
  const hasAmendPermission = Boolean(
    me && (me.permissions.includes("projects.edit") || me.permissions.includes("products.approve")),
  );
  const canProposeAmendment = isOwnOrg && hasAmendPermission;
  const canEdit = isPlatformStaff || canProposeAmendment;

  useEffect(() => {
    apiClient
      .getProductCatalogEntry(productId)
      .then((d) => {
        setDetail(d);
        setForm({
          name: d.name,
          category: d.category,
          hsCode: d.hsCode ?? "",
          unspscCode: d.unspscCode ?? "",
          gtin: d.gtin ?? "",
          standardUnit: d.standardUnit ?? "",
          canonicalManufacturerPartNumber: d.canonicalManufacturerPartNumber ?? "",
          expectedQualityDocumentation: d.expectedQualityDocumentation ?? "",
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load entry"));
  }, [productId]);

  // Price history — read-only, sourced from ProductPriceHistory rows recorded
  // against this ProductMaster. Fetched alongside the catalogue entry rather
  // than bundled into it, since most products will have zero rows and the
  // list can grow unbounded over the product's lifetime.
  useEffect(() => {
    apiClient
      .getProductPriceHistory(productId)
      .then((rows) => {
        setPriceHistory(rows);
        setPriceHistoryError(null);
      })
      .catch((err) => setPriceHistoryError(err instanceof Error ? err.message : "Failed to load price history"));
  }, [productId]);

  // Your organisation's sourcing — see the `sourcing` state's doc comment
  // above. Silently empty on failure (e.g. no products.view-adjacent
  // permission) rather than surfacing another error banner on this panel.
  useEffect(() => {
    apiClient
      .listProductSourceApprovals()
      .then((rows) => setSourcing(rows.filter((r) => r.productMasterId === productId)))
      .catch(() => setSourcing([]));
  }, [productId]);

  async function save() {
    setSaving(true);
    setError(null);
    setSubmittedNotice(null);
    try {
      const result = await apiClient.updateProductCatalogEntry(productId, form);
      if (result.status === "PENDING_AMENDMENT") {
        setSubmittedNotice(
          "Change submitted for QA/RP ratification — the live catalogue entry is unchanged until it's reviewed.",
        );
        onRefresh();
      } else {
        onSaved();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // Archive/restore — added 2026-10-03. Archiving is a soft delete: the
  // entry stays in the database (ProductMaster.isArchived) and drops out
  // of the catalogue's default browse/search/picker results rather than
  // being destroyed, since other apps' historical records (project lines,
  // product source approvals, etc.) still reference it by id. Added
  // 2026-10-09: same update() gate as every other field now — a same-org
  // non-admin archives via a ratified amendment like any other change,
  // not applied immediately.
  async function setArchived(archived: boolean) {
    setSaving(true);
    setError(null);
    setSubmittedNotice(null);
    try {
      const result = await apiClient.updateProductCatalogEntry(productId, { isArchived: archived });
      if (result.status === "PENDING_AMENDMENT") {
        setSubmittedNotice(
          "Change submitted for QA/RP ratification — the live catalogue entry is unchanged until it's reviewed.",
        );
        onRefresh();
      } else {
        onSaved();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${archived ? "archive" : "restore"} entry`);
    } finally {
      setSaving(false);
    }
  }

  if (!detail) {
    return <p style={{ color: "var(--u-ink-secondary)", fontSize: 13 }}>{error ?? "Loading…"}</p>;
  }

  const fieldStyle: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: "var(--u-radius-md)",
    border: "1px solid var(--u-border)",
    fontSize: 13.5,
    width: "100%",
  };

  const readOnlyFieldStyle: React.CSSProperties = {
    ...fieldStyle,
    backgroundColor: "var(--u-surface-alt)",
    color: "var(--u-ink-secondary)",
    cursor: "not-allowed",
  };

  return (
    <div
      style={{
        border: "1px solid var(--u-border)",
        borderRadius: "var(--u-radius-lg)",
        backgroundColor: "var(--u-surface-raised)",
        padding: 16,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 12,
      }}
    >
      {!canEdit && (
        <p style={{ gridColumn: "1 / -1", margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" }}>
          Read-only — only {detail.addedByOrganizationName ?? "the organisation that added this product"} (or a
          platform admin) can edit this entry.
        </p>
      )}
      {canProposeAmendment && !isPlatformStaff && (
        <p style={{ gridColumn: "1 / -1", margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" }}>
          Changes you make here will be submitted for QA/RP ratification before taking effect on the shared
          catalogue.
        </p>
      )}
      {detail.hasPendingAmendment && (
        <p style={{ gridColumn: "1 / -1", margin: 0, fontSize: 13, color: "var(--u-status-warning)", fontWeight: 600 }}>
          This product has a change awaiting QA/RP ratification. It can still be added to a project line in the
          meantime — the values below are the current, unamended ones.
        </p>
      )}
      {submittedNotice && (
        <p style={{ gridColumn: "1 / -1", margin: 0, fontSize: 13, color: "var(--u-status-good)", fontWeight: 600 }}>
          {submittedNotice}
        </p>
      )}
      <Field label="Name">
        <input
          style={canEdit ? fieldStyle : readOnlyFieldStyle}
          disabled={!canEdit}
          value={form.name ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </Field>
      <Field label="Category">
        <input
          style={canEdit ? fieldStyle : readOnlyFieldStyle}
          disabled={!canEdit}
          value={form.category ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
        />
      </Field>
      <Field label="HS Code">
        <input
          style={canEdit ? fieldStyle : readOnlyFieldStyle}
          disabled={!canEdit}
          value={form.hsCode ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, hsCode: e.target.value }))}
        />
      </Field>
      <Field label="UNSPSC Code">
        <input
          style={canEdit ? fieldStyle : readOnlyFieldStyle}
          disabled={!canEdit}
          value={form.unspscCode ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, unspscCode: e.target.value }))}
        />
      </Field>
      <Field label="GTIN">
        <input
          style={canEdit ? fieldStyle : readOnlyFieldStyle}
          disabled={!canEdit}
          value={form.gtin ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, gtin: e.target.value }))}
        />
      </Field>
      <Field label="Standard Unit">
        <input
          style={canEdit ? fieldStyle : readOnlyFieldStyle}
          disabled={!canEdit}
          value={form.standardUnit ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, standardUnit: e.target.value }))}
        />
      </Field>
      <Field label="Canonical Manufacturer Part Number">
        <input
          style={canEdit ? fieldStyle : readOnlyFieldStyle}
          disabled={!canEdit}
          value={form.canonicalManufacturerPartNumber ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, canonicalManufacturerPartNumber: e.target.value }))}
        />
      </Field>
      <Field label="Expected Quality Documentation" span>
        <textarea
          style={canEdit ? { ...fieldStyle, minHeight: 60 } : { ...readOnlyFieldStyle, minHeight: 60 }}
          disabled={!canEdit}
          value={form.expectedQualityDocumentation ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, expectedQualityDocumentation: e.target.value }))}
        />
      </Field>

      {detail.attributeDefinitions.length > 0 && (
        <div style={{ gridColumn: "1 / -1" }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>Category attributes</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
            {detail.attributeDefinitions.map((attr: ProductCatalogAttribute) => (
              <div
                key={attr.attributeKey}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  fontSize: 13,
                  padding: "4px 0",
                  borderBottom: "1px solid var(--u-border)",
                }}
              >
                <span style={{ color: "var(--u-ink)" }}>
                  {attr.label}{" "}
                  <span style={{ color: "var(--u-ink-secondary)" }}>
                    ({attr.dataType}
                    {attr.enumOptions && attr.enumOptions.length > 0 ? `: ${attr.enumOptions.join(" / ")}` : ""})
                  </span>
                </span>
                {attr.required && <span style={{ fontSize: 11, color: "var(--u-status-critical)" }}>Required</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {priceHistoryError && (
        <p style={{ gridColumn: "1 / -1", color: "var(--u-status-critical)", fontSize: 13, margin: 0 }}>{priceHistoryError}</p>
      )}

      {priceHistory && priceHistory.length > 0 && (
        <div style={{ gridColumn: "1 / -1" }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>Price history</span>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--u-border)" }}>
                <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--u-ink-secondary)" }}>Date</th>
                <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--u-ink-secondary)" }}>Unit Price</th>
                <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--u-ink-secondary)" }}>Currency</th>
                <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--u-ink-secondary)" }}>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {[...priceHistory]
                .reverse()
                .map((p: ProductPriceHistoryPoint) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--u-border)" }}>
                    <td style={{ padding: "6px 8px", fontSize: 13 }}>{new Date(p.effectiveDate).toLocaleDateString()}</td>
                    <td style={{ padding: "6px 8px", fontSize: 13 }}>{p.unitPrice}</td>
                    <td style={{ padding: "6px 8px", fontSize: 13, color: "var(--u-ink-secondary)" }}>{p.currency}</td>
                    <td style={{ padding: "6px 8px", fontSize: 13, color: "var(--u-ink-secondary)" }}>{p.recordedByName ?? "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {sourcing && sourcing.length > 0 && (
        <div style={{ gridColumn: "1 / -1" }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>
            Your organisation's sourcing
          </span>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--u-border)" }}>
                <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--u-ink-secondary)" }}>Manufacturer</th>
                <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--u-ink-secondary)" }}>Supplier</th>
                <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--u-ink-secondary)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sourcing.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--u-border)" }}>
                  <td style={{ padding: "6px 8px", fontSize: 13 }}>
                    {s.manufacturerName}
                    {s.manufacturerCountryCode && (
                      <span style={{ color: "var(--u-ink-secondary)" }}>
                        {" — "}
                        {countries.find((c) => c.code === s.manufacturerCountryCode)?.name ?? s.manufacturerCountryCode}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "6px 8px", fontSize: 13, color: "var(--u-ink-secondary)" }}>
                    {s.supplierName ? (
                      <>
                        {s.supplierName}
                        {s.supplierCountryCode && ` — ${countries.find((c) => c.code === s.supplierCountryCode)?.name ?? s.supplierCountryCode}`}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "6px 8px", fontSize: 13, color: "var(--u-ink-secondary)" }}>{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <p style={{ gridColumn: "1 / -1", color: "var(--u-status-critical)", fontSize: 13, margin: 0 }}>{error}</p>
      )}

      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
        {canEdit &&
          (detail.isArchived ? (
            <Button variant="secondary" size="sm" onClick={() => setArchived(false)} disabled={saving}>
              Restore
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setArchived(true)} disabled={saving}>
              Archive
            </Button>
          ))}
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          {canEdit && (
            <Button variant="primary" size="sm" onClick={save} disabled={saving}>
              {saving ? "Saving…" : isPlatformStaff ? "Save" : "Propose amendment"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, span, children }: { label: string; span?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: span ? "1 / -1" : undefined }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>{label}</span>
      {children}
    </label>
  );
}
