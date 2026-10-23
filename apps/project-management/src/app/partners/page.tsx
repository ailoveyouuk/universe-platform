"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { PagedResult, PartnerListItem, PartnerOverview } from "@universe/types";
import { apiClient } from "../../lib/apiClient";
import { useCountries } from "../../lib/useCountries";
import { OwnDataExportButton } from "../../components/OwnDataExportButton";
import {
  AddMenu,
  TextLink,
  SearchInput,
  SortableHeader,
  Pagination,
  Select,
  Pill,
  BuildingIcon,
  PartnersIcon,
  CheckCircleIcon,
  StatTile,
  type PageSize,
} from "@universe/ui";

/**
 * "Stakeholders" — renamed from "Partners" 2026-10-01 (Lewis's instruction)
 * to read less like a vague business-relationship label and more like what
 * this actually is: every external organization your own organization
 * deals with on a project (clients, manufacturers, suppliers, freight
 * forwarders, warehousing). Kept at the /partners URL and PartnerSummary
 * type name — those are the data model's own names (Partner/PartnerRole in
 * schema.prisma) and renaming the route or the API contract is a bigger,
 * separate change than a UI label; see architecture-decisions.md if that
 * rename is wanted later.
 *
 * LOGISTICS dropped from every role filter/create option per Lewis's
 * instruction that it's now folded into Freight Forwarder/Warehousing —
 * this is a UI-only change (existing LOGISTICS-tagged partners, if any,
 * aren't migrated here; that would need a DB pass on Lewis's own Query
 * Editor session, not a frontend change).
 */
const ROLE_FILTERS = ["", "CLIENT", "MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "WAREHOUSING"] as const;
const APPROVAL_FILTERS = ["", "PENDING", "APPROVED", "REMOVED"] as const;
const RISK_FILTERS = ["", "HIGH", "MEDIUM", "LOW"] as const;
const RECENT_CATEGORIES = ["CLIENT", "MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "WAREHOUSING"] as const;

type SortKey = "name" | "roles" | "country" | "approval" | "risk" | "created";

export default function PartnersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Server-side paging (2026-10-17, scale work): filters, search, sort and
  // paging all run in the API; only one page of slim rows is ever loaded.
  const [result, setResult] = useState<PagedResult<PartnerListItem> | null>(null);
  const [overview, setOverview] = useState<PartnerOverview | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const countries = useCountries();

  const [search, setSearch] = useState("");
  // Deep-linkable from the dashboard's stat tiles, e.g. /partners?role=CLIENT
  // or /partners?approval=APPROVED.
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]>(
    () => (ROLE_FILTERS as readonly string[]).includes(searchParams.get("role") ?? "") ? ((searchParams.get("role") ?? "") as any) : ""
  );
  const [approvalFilter, setApprovalFilter] = useState<(typeof APPROVAL_FILTERS)[number]>(
    () => (APPROVAL_FILTERS as readonly string[]).includes(searchParams.get("approval") ?? "") ? ((searchParams.get("approval") ?? "") as any) : ""
  );
  const [countryFilter, setCountryFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState<(typeof RISK_FILTERS)[number]>("");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    apiClient.getPartnerOverview().then(setOverview).catch(() => setOverview(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .listPartnersPage({
        page: page + 1,
        pageSize: pageSize === "all" ? 100 : pageSize,
        q: debouncedSearch,
        roleType: roleFilter,
        approval: approvalFilter,
        country: countryFilter,
        risk: riskFilter,
        sort: sortKey,
        dir: sortDir,
      })
      .then((r) => {
        if (!cancelled) {
          setResult(r);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load stakeholders");
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, debouncedSearch, roleFilter, approvalFilter, countryFilter, riskFilter, sortKey, sortDir]);

  function goAdd(role: string) {
    router.push(`/partners/new?role=${role}`);
  }


  function onSort(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key as SortKey);
      setSortDir("asc");
    }
    setPage(0);
  }

  const effectivePageSize = pageSize === "all" ? 100 : pageSize;
  const total = result?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / effectivePageSize));
  const visible = result?.items ?? [];

  const counts = overview?.counts ?? { byRole: {} as Record<string, number>, approved: 0, approvedMfgSup: 0 };

  const recentByCategory: Record<string, PartnerListItem[]> = overview?.recent ?? {};

  return (
    <main style={{ padding: "28px 32px 48px", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 22, color: "var(--u-ink)", margin: 0 }}>Stakeholders</h1>
          <p style={{ color: "var(--u-ink-secondary)", marginTop: 6, fontSize: 14 }}>
            Clients, manufacturers, suppliers, freight forwarders and warehousing your organisation works with.
          </p>
        </div>
        <AddMenu
          label="Add Stakeholder"
          accent="var(--u-org-accent, var(--u-brand-violet))"
          options={[
            { label: "Client", onSelect: () => goAdd("CLIENT") },
            { label: "Manufacturer / Supplier", onSelect: () => goAdd("MANUFACTURER") },
            { label: "Freight Forwarder", onSelect: () => goAdd("FREIGHT_FORWARDER") },
          ]}
        />
      </div>

      {/* Section dashboard — key counts at a glance, each a working filter shortcut. */}
      <div className="u-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 46%), 1fr))", gap: 12, marginTop: 24 }}>
        <StatTile label="Clients" value={counts.byRole.CLIENT ?? 0} icon={<BuildingIcon size={18} />} onClick={() => { setRoleFilter("CLIENT"); setApprovalFilter(""); }} active={roleFilter === "CLIENT"} />
        <StatTile label="Manufacturers" value={counts.byRole.MANUFACTURER ?? 0} icon={<PartnersIcon size={18} />} onClick={() => { setRoleFilter("MANUFACTURER"); setApprovalFilter(""); }} active={roleFilter === "MANUFACTURER"} />
        <StatTile label="Suppliers" value={counts.byRole.SUPPLIER ?? 0} icon={<PartnersIcon size={18} />} onClick={() => { setRoleFilter("SUPPLIER"); setApprovalFilter(""); }} active={roleFilter === "SUPPLIER"} />
        <StatTile label="Freight Forwarders" value={counts.byRole.FREIGHT_FORWARDER ?? 0} icon={<PartnersIcon size={18} />} onClick={() => { setRoleFilter("FREIGHT_FORWARDER"); setApprovalFilter(""); }} active={roleFilter === "FREIGHT_FORWARDER"} />
        <StatTile label="Warehousing" value={counts.byRole.WAREHOUSING ?? 0} icon={<PartnersIcon size={18} />} onClick={() => { setRoleFilter("WAREHOUSING"); setApprovalFilter(""); }} active={roleFilter === "WAREHOUSING"} />
        <StatTile label="QA Approved" value={counts.approvedMfgSup} icon={<CheckCircleIcon size={18} />} tone="good" onClick={() => { setRoleFilter(""); setApprovalFilter("APPROVED"); }} active={approvalFilter === "APPROVED"} />
      </div>

      {/* Recently added — five per category. */}
      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--u-ink)", marginBottom: 10 }}>Recently added</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 100%), 1fr))", gap: 12 }}>
          {RECENT_CATEGORIES.map((cat) => (
            <div
              key={cat}
              style={{
                border: "1px solid var(--u-border)",
                borderRadius: "var(--u-radius-lg)",
                backgroundColor: "var(--u-surface-raised)",
                padding: "12px 14px",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--u-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
                {cat.replace(/_/g, " ")}
              </div>
              {(recentByCategory[cat] ?? []).length === 0 && (
                <div style={{ fontSize: 12.5, color: "var(--u-ink-secondary)" }}>None yet</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(recentByCategory[cat] ?? []).map((p) => (
                  <Link
                    key={p.id}
                    href={`/partners/detail?id=${p.id}`}
                    style={{ textDecoration: "none", fontSize: 13, color: "var(--u-ink)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    <TextLink as="span" weight={500}>{p.name}</TextLink>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Filters + search */}
      <div style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search by name, country, website, role…" />
        <OwnDataExportButton entity="partners" label="Export CSV" />
        <OwnDataExportButton entity="contacts" label="Export contacts" />
        <OwnDataExportButton entity="certifications" label="Export certifications" />
        <Select
          value={roleFilter}
          onChange={(v) => { setRoleFilter(v as any); setPage(0); }}
          options={ROLE_FILTERS.filter(Boolean).map((r) => ({ value: r, label: r.replace(/_/g, " ") }))}
          allLabel="All roles"
          ariaLabel="Filter by role"
        />
        <Select
          value={approvalFilter}
          onChange={(v) => { setApprovalFilter(v as any); setPage(0); }}
          options={APPROVAL_FILTERS.filter(Boolean).map((a) => ({ value: a, label: a }))}
          allLabel="All approval states"
          ariaLabel="Filter by approval state"
        />
        <Select
          value={countryFilter}
          onChange={(v) => { setCountryFilter(v); setPage(0); }}
          options={countries.map((c) => ({ value: c.code, label: c.name }))}
          allLabel="All countries"
          ariaLabel="Filter by country"
        />
        <Select
          value={riskFilter}
          onChange={(v) => { setRiskFilter(v as any); setPage(0); }}
          options={RISK_FILTERS.filter(Boolean).map((r) => ({ value: r, label: r }))}
          allLabel="All risk tiers"
          ariaLabel="Filter by risk tier"
        />
      </div>

      {error && <p style={{ color: "var(--u-status-critical)", marginTop: 16 }}>{error}</p>}
      {!result && !error && <p style={{ color: "var(--u-ink-secondary)", marginTop: 16 }}>Loading…</p>}

      {result && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--u-border)" }}>
                <SortableHeader label="Name" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={onSort} />
                <SortableHeader label="Roles" sortKey="roles" activeKey={sortKey} direction={sortDir} onSort={onSort} />
                <SortableHeader label="Country" sortKey="country" activeKey={sortKey} direction={sortDir} onSort={onSort} />
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--u-ink-secondary)" }}>Website</th>
                <SortableHeader label="Approval" sortKey="approval" activeKey={sortKey} direction={sortDir} onSort={onSort} />
                <SortableHeader label="Risk" sortKey="risk" activeKey={sortKey} direction={sortDir} onSort={onSort} />
                <SortableHeader label="Added" sortKey="created" activeKey={sortKey} direction={sortDir} onSort={onSort} />
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--u-border)" }}>
                  <td style={{ padding: 8, fontWeight: 600 }}>
                    <Link href={`/partners/detail?id=${p.id}`} style={{ textDecoration: "none" }}>
                      <TextLink as="span">{p.name}</TextLink>
                    </Link>
                  </td>
                  <td style={{ padding: 8 }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {p.roles.map((r) => (
                        <Pill key={r.roleType} tone="neutral">
                          {r.roleType.replace(/_/g, " ")}
                        </Pill>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{countries.find((c) => c.code === p.countryCode)?.name ?? p.countryCode ?? "—"}</td>
                  <td style={{ padding: 8 }}>
                    {p.website ? (
                      <TextLink href={p.website} target="_blank" rel="noreferrer">
                        {p.website.replace(/^https?:\/\//, "")}
                      </TextLink>
                    ) : (
                      <span style={{ color: "var(--u-ink-secondary)" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: 8 }}>
                    <Pill tone={p.approvalStatus === "APPROVED" ? "good" : p.approvalStatus === "REMOVED" ? "neutral" : "warning"}>
                      {p.approvalStatus}
                    </Pill>
                  </td>
                  <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{p.riskTier ?? "—"}</td>
                  <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 20, color: "var(--u-ink-secondary)", textAlign: "center" }}>
                    No stakeholders match these filters.
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

