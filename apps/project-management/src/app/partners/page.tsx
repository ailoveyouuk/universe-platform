"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { PartnerSummary } from "@universe/types";
import { apiClient } from "../../lib/apiClient";
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
const RECENT_CATEGORIES = ["CLIENT", "MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "WAREHOUSING"] as const;

type SortKey = "name" | "roles" | "country" | "approval" | "created";

export default function PartnersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [partners, setPartners] = useState<PartnerSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  // Deep-linkable from the dashboard's stat tiles, e.g. /partners?role=CLIENT
  // or /partners?approval=APPROVED.
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]>(
    () => (ROLE_FILTERS as readonly string[]).includes(searchParams.get("role") ?? "") ? (searchParams.get("role") as any) : ""
  );
  const [approvalFilter, setApprovalFilter] = useState<(typeof APPROVAL_FILTERS)[number]>(
    () => (APPROVAL_FILTERS as readonly string[]).includes(searchParams.get("approval") ?? "") ? (searchParams.get("approval") as any) : ""
  );
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [page, setPage] = useState(0);

  useEffect(() => {
    apiClient
      .listPartners()
      .then(setPartners)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load stakeholders"));
  }, []);

  function goAdd(role: string) {
    router.push(`/partners/new?role=${role}`);
  }

  const filtered = useMemo(() => {
    if (!partners) return [];
    const q = search.trim().toLowerCase();
    return partners.filter((p) => {
      if (roleFilter && !p.roles.some((r) => r.roleType === roleFilter)) return false;
      if (approvalFilter && p.approvalStatus !== approvalFilter) return false;
      if (q) {
        const haystack = `${p.name} ${p.countryCode ?? ""} ${p.website ?? ""} ${p.roles.map((r) => r.roleType).join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [partners, search, roleFilter, approvalFilter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "roles":
          return (a.roles[0]?.roleType ?? "").localeCompare(b.roles[0]?.roleType ?? "") * dir;
        case "country":
          return (a.countryCode ?? "").localeCompare(b.countryCode ?? "") * dir;
        case "approval":
          return a.approvalStatus.localeCompare(b.approvalStatus) * dir;
        case "created":
        default:
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      }
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  function onSort(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key as SortKey);
      setSortDir("asc");
    }
    setPage(0);
  }

  const pageCount = pageSize === "all" ? 1 : Math.max(1, Math.ceil(sorted.length / pageSize));
  const visible = pageSize === "all" ? sorted : sorted.slice(page * pageSize, page * pageSize + pageSize);

  const counts = useMemo(() => {
    const byRole: Record<string, number> = {};
    let approved = 0;
    let approvedMfgSup = 0;
    for (const p of partners ?? []) {
      for (const r of p.roles) byRole[r.roleType] = (byRole[r.roleType] ?? 0) + 1;
      if (p.approvalStatus === "APPROVED") {
        approved += 1;
        if (p.roles.some((r) => r.roleType === "MANUFACTURER" || r.roleType === "SUPPLIER")) approvedMfgSup += 1;
      }
    }
    return { byRole, approved, approvedMfgSup };
  }, [partners]);

  const recentByCategory = useMemo(() => {
    const map: Record<string, PartnerSummary[]> = {};
    for (const cat of RECENT_CATEGORIES) {
      map[cat] = (partners ?? [])
        .filter((p) => p.roles.some((r) => r.roleType === cat))
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
    }
    return map;
  }, [partners]);

  return (
    <main style={{ padding: "28px 32px 48px", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 22, color: "var(--u-ink)", margin: 0 }}>Stakeholders</h1>
          <p style={{ color: "var(--u-ink-secondary)", marginTop: 6, fontSize: 14 }}>
            Clients, manufacturers, suppliers, freight forwarders and warehousing your organization works with.
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 24 }}>
        <SectionStat label="Clients" value={counts.byRole.CLIENT ?? 0} icon={<BuildingIcon size={18} />} onClick={() => { setRoleFilter("CLIENT"); setApprovalFilter(""); }} active={roleFilter === "CLIENT"} />
        <SectionStat label="Manufacturers" value={counts.byRole.MANUFACTURER ?? 0} icon={<PartnersIcon size={18} />} onClick={() => { setRoleFilter("MANUFACTURER"); setApprovalFilter(""); }} active={roleFilter === "MANUFACTURER"} />
        <SectionStat label="Suppliers" value={counts.byRole.SUPPLIER ?? 0} icon={<PartnersIcon size={18} />} onClick={() => { setRoleFilter("SUPPLIER"); setApprovalFilter(""); }} active={roleFilter === "SUPPLIER"} />
        <SectionStat label="Freight Forwarders" value={counts.byRole.FREIGHT_FORWARDER ?? 0} icon={<PartnersIcon size={18} />} onClick={() => { setRoleFilter("FREIGHT_FORWARDER"); setApprovalFilter(""); }} active={roleFilter === "FREIGHT_FORWARDER"} />
        <SectionStat label="Warehousing" value={counts.byRole.WAREHOUSING ?? 0} icon={<PartnersIcon size={18} />} onClick={() => { setRoleFilter("WAREHOUSING"); setApprovalFilter(""); }} active={roleFilter === "WAREHOUSING"} />
        <SectionStat label="QA Approved" value={counts.approvedMfgSup} icon={<CheckCircleIcon size={18} />} tone="good" onClick={() => { setRoleFilter(""); setApprovalFilter("APPROVED"); }} active={approvalFilter === "APPROVED"} />
      </div>

      {/* Recently added — five per category. */}
      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--u-ink)", marginBottom: 10 }}>Recently added</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
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
      </div>

      {error && <p style={{ color: "var(--u-status-critical)", marginTop: 16 }}>{error}</p>}
      {!partners && !error && <p style={{ color: "var(--u-ink-secondary)", marginTop: 16 }}>Loading…</p>}

      {partners && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--u-border)" }}>
                <SortableHeader label="Name" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={onSort} />
                <SortableHeader label="Roles" sortKey="roles" activeKey={sortKey} direction={sortDir} onSort={onSort} />
                <SortableHeader label="Country" sortKey="country" activeKey={sortKey} direction={sortDir} onSort={onSort} />
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--u-ink-secondary)" }}>Website</th>
                <SortableHeader label="Approval" sortKey="approval" activeKey={sortKey} direction={sortDir} onSort={onSort} />
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
                  <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{p.countryCode ?? "—"}</td>
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
                  <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 20, color: "var(--u-ink-secondary)", textAlign: "center" }}>
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
            totalCount={sorted.length}
          />
        </>
      )}
    </main>
  );
}

function SectionStat({
  label,
  value,
  icon,
  onClick,
  active,
  tone = "brand",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  onClick: () => void;
  active: boolean;
  tone?: "brand" | "good";
}) {
  const color = tone === "good" ? "var(--u-status-good)" : "var(--u-org-accent, var(--u-brand-violet))";
  return (
    <button
      onClick={onClick}
      className="u-card-hover"
      style={{
        textAlign: "left",
        padding: "14px 16px",
        borderRadius: "var(--u-radius-lg)",
        border: active ? `1px solid ${color}` : "1px solid var(--u-border)",
        backgroundColor: active ? "var(--u-accent-magenta-tint)" : "var(--u-surface-raised)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>{label}</span>
        <span style={{ color, display: "flex" }}>{icon}</span>
      </div>
      <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--u-font-display)", color: "var(--u-ink)" }}>{value}</span>
    </button>
  );
}

